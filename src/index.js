require('dotenv').config();

const path = require('path');
const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');
const { Pool } = require('pg');
const { ensureSchema, createInstallationStore, createStateStore } = require('./store');
const { createLifecycle } = require('./lifecycle');
const { enqueueLifecycleEvent, startOutboxWorker } = require('./outbox');
const { registerListeners } = require('./listeners');
const { registerAwardHandler } = require('./handlers/award');
const { registerPointsHandler } = require('./handlers/points');
const config = require('./config');
const logger = require('./logger');
const publicDir = path.join(__dirname, '..', 'public');

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.sslEnabled
    ? {
        rejectUnauthorized: config.database.sslRejectUnauthorized,
        ca: config.database.sslCa ? [config.database.sslCa] : undefined
      }
    : undefined
});

const lifecycle = createLifecycle({ logger });
registerListeners(lifecycle);

const receiver = new ExpressReceiver({
  signingSecret: config.slack.signingSecret,
  clientId: config.slack.clientId,
  clientSecret: config.slack.clientSecret,
  stateSecret: config.slack.stateSecret,
  scopes: config.slack.scopes,
  installationStore: createInstallationStore(pool, lifecycle),
  stateStore: createStateStore(pool, lifecycle)
});

receiver.router.get('/health', (req, res) => {
  res.status(200).send('ok');
});

receiver.router.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

receiver.router.get('/privacy', (req, res) => {
  res.sendFile(path.join(publicDir, 'privacy.html'));
});

receiver.router.get('/support', (req, res) => {
  res.sendFile(path.join(publicDir, 'support.html'));
});

const app = new App({
  receiver,
  logLevel: LogLevel.INFO
});

async function emitLifecycle(eventName, payload) {
  try {
    await enqueueLifecycleEvent(pool, eventName, payload);
  } catch (error) {
    logger.error({ err: error, eventName }, 'Failed to enqueue lifecycle event');
  }
}

registerAwardHandler(app, { pool, emitLifecycle, config, logger });
registerPointsHandler(app, { pool, emitLifecycle, config });

(async () => {
  await ensureSchema(pool);
  startOutboxWorker({
    pool,
    lifecycle,
    logger,
    ...config.outbox
  });
  const port = config.port;
  await app.start(port);
  logger.info({ port }, 'Slack app is running');
  await emitLifecycle('app.started', { port });
})();
