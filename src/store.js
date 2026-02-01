const crypto = require('crypto');

const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;
const INSTALLATION_ENCRYPTION_ALG = 'aes-256-gcm';
const INSTALLATION_ENCRYPTION_VERSION = 1;
let cachedEncryptionKey;

function loadEncryptionKey() {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const rawKey = (process.env.INSTALLATION_ENCRYPTION_KEY || '').trim();
  if (!rawKey) {
    throw new Error('INSTALLATION_ENCRYPTION_KEY is required');
  }

  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    cachedEncryptionKey = Buffer.from(rawKey, 'hex');
    return cachedEncryptionKey;
  }

  const base64Key = Buffer.from(rawKey, 'base64');
  if (base64Key.length === 32) {
    cachedEncryptionKey = base64Key;
    return cachedEncryptionKey;
  }

  throw new Error('INSTALLATION_ENCRYPTION_KEY must be 32 bytes (base64) or 64 hex chars');
}

function isEncryptedInstallation(payload) {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      typeof payload.ciphertext === 'string' &&
      typeof payload.iv === 'string' &&
      typeof payload.tag === 'string' &&
      typeof payload.alg === 'string'
  );
}

function encryptInstallation(installation) {
  const key = loadEncryptionKey();
  const iv = crypto.randomBytes(12);
  const plaintext = Buffer.from(JSON.stringify(installation), 'utf8');
  const cipher = crypto.createCipheriv(INSTALLATION_ENCRYPTION_ALG, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: INSTALLATION_ENCRYPTION_VERSION,
    alg: INSTALLATION_ENCRYPTION_ALG,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function decryptInstallation(payload) {
  if (!isEncryptedInstallation(payload)) {
    return payload;
  }

  if (payload.alg !== INSTALLATION_ENCRYPTION_ALG) {
    throw new Error(`Unsupported installation encryption algorithm: ${payload.alg}`);
  }

  const key = loadEncryptionKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv(INSTALLATION_ENCRYPTION_ALG, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

function redactInstallation(installation) {
  if (!installation || typeof installation !== 'object') {
    return { hasInstallation: false };
  }

  const teamId = installation.team && installation.team.id;
  const enterpriseId = installation.enterprise && installation.enterprise.id;
  const bot = installation.bot || {};
  const user = installation.user || {};

  return {
    hasInstallation: true,
    teamId: teamId || '',
    enterpriseId: enterpriseId || '',
    isEnterpriseInstall: Boolean(installation.isEnterpriseInstall),
    appId: installation.appId || installation.app_id || null,
    botId: bot.id || null,
    botUserId: bot.userId || bot.user_id || null,
    userId: user.id || null,
    hasBotToken: Boolean(bot.token),
    hasUserToken: Boolean(user.token)
  };
}

function normalizeId(value) {
  return value || '';
}

async function safeEmit(lifecycle, eventName, payload) {
  if (!lifecycle || typeof lifecycle.emit !== 'function') {
    return;
  }

  try {
    await lifecycle.emit(eventName, payload);
  } catch (error) {
    console.error(`Lifecycle listener failed for ${eventName}`, error);
  }
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS slack_installations (
      team_id TEXT NOT NULL DEFAULT '',
      enterprise_id TEXT NOT NULL DEFAULT '',
      is_enterprise_install BOOLEAN NOT NULL DEFAULT FALSE,
      install_data JSONB NOT NULL,
      installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (team_id, enterprise_id, is_enterprise_install)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS slack_oauth_states (
      state TEXT PRIMARY KEY,
      install_options JSONB NOT NULL DEFAULT '{}'::jsonb,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS point_events (
      id BIGSERIAL PRIMARY KEY,
      team_id TEXT NOT NULL,
      giver_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS points (
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (team_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_awards (
      id BIGSERIAL PRIMARY KEY,
      team_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_ts TEXT NOT NULL,
      giver_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (team_id, channel_id, message_ts, giver_id, receiver_id)
    );
  `);
}

function createInstallationStore(pool, lifecycle) {
  return {
    async storeInstallation(installation) {
      const teamId = normalizeId(installation.team && installation.team.id);
      const enterpriseId = normalizeId(installation.enterprise && installation.enterprise.id);
      const isEnterpriseInstall = Boolean(installation.isEnterpriseInstall);
      const encryptedInstallation = encryptInstallation(installation);

      await pool.query(
        `
        INSERT INTO slack_installations (team_id, enterprise_id, is_enterprise_install, install_data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (team_id, enterprise_id, is_enterprise_install)
        DO UPDATE SET install_data = EXCLUDED.install_data, installed_at = NOW()
        `,
        [teamId, enterpriseId, isEnterpriseInstall, encryptedInstallation]
      );

      await safeEmit(lifecycle, 'oauth.installation.stored', {
        teamId,
        enterpriseId,
        isEnterpriseInstall,
        installation: redactInstallation(installation)
      });
    },

    async fetchInstallation(query) {
      const teamId = normalizeId(query.teamId);
      const enterpriseId = normalizeId(query.enterpriseId);
      const isEnterpriseInstall = Boolean(query.isEnterpriseInstall);

      const result = await pool.query(
        `
        SELECT install_data
        FROM slack_installations
        WHERE team_id = $1
          AND enterprise_id = $2
          AND is_enterprise_install = $3
        LIMIT 1
        `,
        [teamId, enterpriseId, isEnterpriseInstall]
      );

      if (!result.rows.length) {
        throw new Error('Installation data not found');
      }

      const storedInstallation = result.rows[0].install_data;
      if (!isEncryptedInstallation(storedInstallation)) {
        const encrypted = encryptInstallation(storedInstallation);
        await pool.query(
          `
          UPDATE slack_installations
          SET install_data = $4, installed_at = NOW()
          WHERE team_id = $1
            AND enterprise_id = $2
            AND is_enterprise_install = $3
          `,
          [teamId, enterpriseId, isEnterpriseInstall, encrypted]
        );
        return storedInstallation;
      }

      return decryptInstallation(storedInstallation);
    },

    async deleteInstallation(query) {
      const teamId = normalizeId(query.teamId);
      const enterpriseId = normalizeId(query.enterpriseId);
      const isEnterpriseInstall = Boolean(query.isEnterpriseInstall);

      await pool.query(
        `
        DELETE FROM slack_installations
        WHERE team_id = $1
          AND enterprise_id = $2
          AND is_enterprise_install = $3
        `,
        [teamId, enterpriseId, isEnterpriseInstall]
      );

      await safeEmit(lifecycle, 'oauth.installation.deleted', {
        teamId,
        enterpriseId,
        isEnterpriseInstall
      });
    }
  };
}

function createStateStore(pool, lifecycle) {
  return {
    async storeState(state, installUrlOptions) {
      const ttlMs = Number.parseInt(process.env.OAUTH_STATE_TTL_MS || '', 10) || DEFAULT_STATE_TTL_MS;
      const expiresAt = new Date(Date.now() + ttlMs);
      const options = installUrlOptions || {};

      await pool.query(
        `
        INSERT INTO slack_oauth_states (state, install_options, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (state)
        DO UPDATE SET install_options = EXCLUDED.install_options, expires_at = EXCLUDED.expires_at
        `,
        [state, options, expiresAt]
      );

      await safeEmit(lifecycle, 'oauth.state.stored', {
        state,
        expiresAt,
        installOptions: options
      });

      return state;
    },

    async verifyState(state) {
      const result = await pool.query(
        `
        SELECT install_options, expires_at
        FROM slack_oauth_states
        WHERE state = $1
        `,
        [state]
      );

      if (!result.rows.length) {
        throw new Error('Invalid OAuth state');
      }

      const { install_options: installOptions, expires_at: expiresAt } = result.rows[0];
      if (expiresAt && new Date(expiresAt) < new Date()) {
        await pool.query('DELETE FROM slack_oauth_states WHERE state = $1', [state]);
        throw new Error('Expired OAuth state');
      }

      await pool.query('DELETE FROM slack_oauth_states WHERE state = $1', [state]);

      await safeEmit(lifecycle, 'oauth.state.verified', {
        state,
        expiresAt,
        installOptions
      });

      return installOptions || {};
    }
  };
}

async function incrementPoints(pool, { teamId, channelId, messageTs, giverId, receiverId, reason }) {
  if (!teamId) {
    throw new Error('Missing team id');
  }

  if (!channelId || !messageTs) {
    throw new Error('Missing message identifiers');
  }

  const dedupeResult = await pool.query(
    `
    INSERT INTO processed_awards (team_id, channel_id, message_ts, giver_id, receiver_id)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
    RETURNING id
    `,
    [teamId, channelId, messageTs, giverId, receiverId]
  );

  if (!dedupeResult.rows.length) {
    const current = await pool.query(
      `
      SELECT points
      FROM points
      WHERE team_id = $1 AND user_id = $2
      LIMIT 1
      `,
      [teamId, receiverId]
    );
    return {
      points: current.rows.length ? current.rows[0].points : 0,
      eventId: null,
      eventCreatedAt: null,
      deduped: true
    };
  }

  const eventResult = await pool.query(
    `
    INSERT INTO point_events (team_id, giver_id, receiver_id, reason)
    VALUES ($1, $2, $3, $4)
    RETURNING id, created_at
    `,
    [teamId, giverId, receiverId, reason]
  );

  const result = await pool.query(
    `
    INSERT INTO points (team_id, user_id, points)
    VALUES ($1, $2, 1)
    ON CONFLICT (team_id, user_id)
    DO UPDATE SET points = points.points + 1, updated_at = NOW()
    RETURNING points
    `,
    [teamId, receiverId]
  );

  return {
    points: result.rows[0].points,
    eventId: eventResult.rows[0].id,
    eventCreatedAt: eventResult.rows[0].created_at,
    deduped: false
  };
}

async function getPoints(pool, { teamId, userId }) {
  const result = await pool.query(
    `
    SELECT points
    FROM points
    WHERE team_id = $1 AND user_id = $2
    LIMIT 1
    `,
    [teamId, userId]
  );

  if (!result.rows.length) {
    return 0;
  }

  return result.rows[0].points;
}

async function getLeaderboard(pool, { teamId, limit }) {
  const safeLimit = Number.isInteger(limit) ? limit : 10;
  const result = await pool.query(
    `
    SELECT user_id, points
    FROM points
    WHERE team_id = $1
    ORDER BY points DESC, updated_at DESC
    LIMIT $2
    `,
    [teamId, safeLimit]
  );

  return result.rows;
}

module.exports = {
  ensureSchema,
  createInstallationStore,
  createStateStore,
  incrementPoints,
  getPoints,
  getLeaderboard
};
