const { buildSlackScopesConfig } = require('./slack_scopes');

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }
  const normalized = String(value).toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return fallback;
}

function parseIntEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const {
  DATABASE_URL,
  DATABASE_SSL,
  DATABASE_SSL_CA,
  DATABASE_SSL_REJECT_UNAUTHORIZED,
  PORT,
  INSTALLATION_ENCRYPTION_KEY,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SLACK_SIGNING_SECRET,
  SLACK_STATE_SECRET,
  SLACK_HISTORY_SURFACES,
  ALLOW_SELF_AWARD,
  AWARD_MAX_RECIPIENTS,
  AWARD_RATE_LIMIT_MAX,
  AWARD_RATE_LIMIT_WINDOW_MS,
  OUTBOX_WORKER_ENABLED,
  OUTBOX_POLL_INTERVAL_MS,
  OUTBOX_BATCH_SIZE,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_BACKOFF_MS
} = process.env;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

if (!SLACK_CLIENT_ID || !SLACK_CLIENT_SECRET || !SLACK_SIGNING_SECRET || !SLACK_STATE_SECRET) {
  throw new Error('Slack OAuth env vars are required');
}

if (!INSTALLATION_ENCRYPTION_KEY) {
  throw new Error('INSTALLATION_ENCRYPTION_KEY is required');
}

const { scopes, historySurfaces } = buildSlackScopesConfig({
  historySurfacesEnv: SLACK_HISTORY_SURFACES
});

const sslEnabled = parseBoolean(DATABASE_SSL, false);
const sslRejectUnauthorized = parseBoolean(DATABASE_SSL_REJECT_UNAUTHORIZED, true);
const sslCa = DATABASE_SSL_CA ? DATABASE_SSL_CA.replace(/\\n/g, '\n') : undefined;

const config = {
  port: parseIntEnv(PORT, 3000),
  database: {
    url: DATABASE_URL,
    sslEnabled,
    sslRejectUnauthorized,
    sslCa
  },
  slack: {
    clientId: SLACK_CLIENT_ID,
    clientSecret: SLACK_CLIENT_SECRET,
    signingSecret: SLACK_SIGNING_SECRET,
    stateSecret: SLACK_STATE_SECRET,
    scopes,
    historySurfaces
  },
  awards: {
    allowSelfAward: parseBoolean(ALLOW_SELF_AWARD, false),
    maxRecipientsPerMessage: parseIntEnv(AWARD_MAX_RECIPIENTS, 5),
    rateLimitMax: parseIntEnv(AWARD_RATE_LIMIT_MAX, 5),
    rateLimitWindowMs: parseIntEnv(AWARD_RATE_LIMIT_WINDOW_MS, 60000)
  },
  outbox: {
    enabled: parseBoolean(OUTBOX_WORKER_ENABLED, true),
    pollIntervalMs: parseIntEnv(OUTBOX_POLL_INTERVAL_MS, 1000),
    batchSize: parseIntEnv(OUTBOX_BATCH_SIZE, 20),
    maxAttempts: parseIntEnv(OUTBOX_MAX_ATTEMPTS, 10),
    backoffMs: parseIntEnv(OUTBOX_BACKOFF_MS, 30000)
  }
};

module.exports = config;
