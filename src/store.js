const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;

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
}

function createInstallationStore(pool, lifecycle) {
  return {
    async storeInstallation(installation) {
      const teamId = normalizeId(installation.team && installation.team.id);
      const enterpriseId = normalizeId(installation.enterprise && installation.enterprise.id);
      const isEnterpriseInstall = Boolean(installation.isEnterpriseInstall);

      await pool.query(
        `
        INSERT INTO slack_installations (team_id, enterprise_id, is_enterprise_install, install_data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (team_id, enterprise_id, is_enterprise_install)
        DO UPDATE SET install_data = EXCLUDED.install_data, installed_at = NOW()
        `,
        [teamId, enterpriseId, isEnterpriseInstall, installation]
      );

      await safeEmit(lifecycle, 'oauth.installation.stored', {
        teamId,
        enterpriseId,
        isEnterpriseInstall,
        installation
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

      return result.rows[0].install_data;
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

async function incrementPoints(pool, { teamId, giverId, receiverId, reason }) {
  if (!teamId) {
    throw new Error('Missing team id');
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
    eventCreatedAt: eventResult.rows[0].created_at
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
