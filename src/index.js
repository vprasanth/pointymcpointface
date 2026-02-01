require('dotenv').config();

const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');
const { Pool } = require('pg');
const { ensureSchema, createInstallationStore, createStateStore } = require('./store');
const { createLifecycle } = require('./lifecycle');
const { enqueueLifecycleEvent, startOutboxWorker } = require('./outbox');
const { registerListeners } = require('./listeners');
const { registerAwardHandler } = require('./handlers/award');
const { registerPointsHandler } = require('./handlers/points');
const config = require('./config');

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.sslEnabled
    ? {
        rejectUnauthorized: config.database.sslRejectUnauthorized,
        ca: config.database.sslCa ? [config.database.sslCa] : undefined
      }
    : undefined
});

const lifecycle = createLifecycle({ logger: console });
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

const app = new App({
  receiver,
  logLevel: LogLevel.INFO
});

async function emitLifecycle(eventName, payload) {
  try {
    await enqueueLifecycleEvent(pool, eventName, payload);
  } catch (error) {
    console.error(`Failed to enqueue lifecycle event ${eventName}`, error);
  }
}

registerAwardHandler(app, { pool, emitLifecycle, config, logger: console });
registerPointsHandler(app, { pool, emitLifecycle });

(async () => {
  await ensureSchema(pool);
  startOutboxWorker({
    pool,
    lifecycle,
    logger: console,
    ...config.outbox
  });
  const port = config.port;
  await app.start(port);
  console.log(`Slack app is running on port ${port}`);
  await emitLifecycle('app.started', { port });
})();
