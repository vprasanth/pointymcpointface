require('dotenv').config();

const { App, ExpressReceiver, LogLevel } = require('@slack/bolt');
const { Pool } = require('pg');
const {
  ensureSchema,
  createInstallationStore,
  createStateStore,
  incrementPoints,
  getPoints,
  getLeaderboard
} = require('./store');
const { createLifecycle } = require('./lifecycle');
const { enqueueLifecycleEvent, startOutboxWorker } = require('./outbox');
const { registerListeners } = require('./listeners');

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
  SLACK_SCOPES,
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

const sslEnabled = String(DATABASE_SSL).toLowerCase() === 'true';
const sslRejectUnauthorized =
  String(DATABASE_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';
const sslCa = DATABASE_SSL_CA ? DATABASE_SSL_CA.replace(/\\n/g, '\n') : undefined;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: sslEnabled
    ? {
        rejectUnauthorized: sslRejectUnauthorized,
        ca: sslCa ? [sslCa] : undefined
      }
    : undefined
});

const lifecycle = createLifecycle({ logger: console });
registerListeners(lifecycle);

const scopes = (SLACK_SCOPES || 'chat:write,channels:history,groups:history,im:history,mpim:history,commands')
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean);

const receiver = new ExpressReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
  clientId: SLACK_CLIENT_ID,
  clientSecret: SLACK_CLIENT_SECRET,
  stateSecret: SLACK_STATE_SECRET,
  scopes,
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

const mentionRegex = /<@([A-Z0-9]+)>\+\+/g;
const allowSelfAward = String(ALLOW_SELF_AWARD).toLowerCase() === 'true';

function parseIntEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntOptional(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const maxRecipientsPerMessage = parseIntEnv(AWARD_MAX_RECIPIENTS, 5);
const rateLimitMax = parseIntEnv(AWARD_RATE_LIMIT_MAX, 5);
const rateLimitWindowMs = parseIntEnv(AWARD_RATE_LIMIT_WINDOW_MS, 60000);
const rateLimitCache = new Map();

function checkRateLimit(teamId, giverId, count) {
  if (rateLimitMax <= 0 || rateLimitWindowMs <= 0) {
    return { allowed: true };
  }

  const key = `${teamId}:${giverId}`;
  const now = Date.now();
  let entry = rateLimitCache.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + rateLimitWindowMs };
  }

  if (entry.count + count > rateLimitMax) {
    rateLimitCache.set(key, entry);
    return { allowed: false, resetAt: entry.resetAt, remaining: Math.max(0, rateLimitMax - entry.count) };
  }

  entry.count += count;
  rateLimitCache.set(key, entry);
  return { allowed: true, resetAt: entry.resetAt, remaining: rateLimitMax - entry.count };
}

function parseMentions(text) {
  mentionRegex.lastIndex = 0;
  const matches = [];
  let match = mentionRegex.exec(text);

  while (match) {
    matches.push({ userId: match[1] });
    match = mentionRegex.exec(text);
  }

  if (!matches.length) {
    return null;
  }

  const seen = new Set();
  const recipients = [];
  for (const entry of matches) {
    if (!seen.has(entry.userId)) {
      seen.add(entry.userId);
      recipients.push(entry.userId);
    }
  }

  const reasonText = text.replace(/<@([A-Z0-9]+)>\+\+/g, '').trim();
  const reason = reasonText.length ? reasonText : null;

  return { recipients, reason };
}

async function emitLifecycle(eventName, payload) {
  try {
    await enqueueLifecycleEvent(pool, eventName, payload);
  } catch (error) {
    console.error(`Failed to enqueue lifecycle event ${eventName}`, error);
  }
}

app.message(async ({ message, say, context }) => {
  if (!message || !message.text) {
    return;
  }

  if (message.subtype || message.bot_id) {
    return;
  }

  const parsed = parseMentions(message.text);
  if (!parsed) {
    return;
  }

  const { reason } = parsed;
  const giverId = message.user;
  const teamId = context.teamId || message.team;
  const channelId = message.channel;
  const messageTs = message.ts;
  const threadTs = message.thread_ts || null;
  const originalRecipients = parsed.recipients;
  const recipients = allowSelfAward
    ? originalRecipients
    : originalRecipients.filter((recipient) => recipient !== giverId);

  if (!recipients.length) {
    if (!allowSelfAward && originalRecipients.includes(giverId)) {
      await say({ text: 'Self-awards are not allowed.' });
    }
    return;
  }

  if (maxRecipientsPerMessage > 0 && recipients.length > maxRecipientsPerMessage) {
    await say({ text: `Too many recipients. Max per message is ${maxRecipientsPerMessage}.` });
    return;
  }

  const rateCheck = checkRateLimit(teamId, giverId, recipients.length);
  if (!rateCheck.allowed) {
    const retryInSeconds = Math.max(1, Math.ceil((rateCheck.resetAt - Date.now()) / 1000));
    await say({ text: `Rate limit exceeded. Try again in ${retryInSeconds} seconds.` });
    return;
  }

  void emitLifecycle('points.award.received', {
    teamId,
    channelId,
    messageTs,
    threadTs,
    giverId,
    recipients,
    reason
  });

  try {
    const results = [];
    for (const receiverId of recipients) {
      const { points, eventId, eventCreatedAt, deduped } = await incrementPoints(pool, {
        teamId,
        channelId,
        messageTs,
        giverId,
        receiverId,
        reason
      });
      results.push({ receiverId, points });

      if (!deduped) {
        void emitLifecycle('points.awarded', {
          teamId,
          channelId,
          messageTs,
          threadTs,
          giverId,
          receiverId,
          points,
          reason,
          eventId,
          eventCreatedAt
        });
      }
    }

    let response;
    if (results.length === 1) {
      response = `<@${results[0].receiverId}> has ${results[0].points} points.`;
    } else {
      const summary = results
        .map((entry) => `<@${entry.receiverId}> (${entry.points})`)
        .join(', ');
      response = `Points awarded: ${summary}.`;
    }

    if (reason) {
      response += ` Most recently for: ${reason}`;
    }

    const payload = { text: response };
    if (message.thread_ts) {
      payload.thread_ts = message.thread_ts;
    }

    await say(payload);
  } catch (error) {
    console.error('Failed to record points', error);
    void emitLifecycle('points.award.failed', {
      teamId,
      channelId,
      messageTs,
      threadTs,
      giverId,
      recipients,
      reason,
      errorMessage: error.message
    });
  }
});

app.command('/points', async ({ command, ack, respond }) => {
  await ack();

  const text = (command.text || '').trim();
  const mentionMatch = /<@([A-Z0-9]+)>/.exec(text);

  if (mentionMatch) {
    const targetId = mentionMatch[1];
    const points = await getPoints(pool, { teamId: command.team_id, userId: targetId });
    await respond({ text: `<@${targetId}> has ${points} points.` });
    void emitLifecycle('points.query', {
      queryType: 'user',
      teamId: command.team_id,
      channelId: command.channel_id,
      requesterId: command.user_id,
      targetUserId: targetId,
      points
    });
    return;
  }

  if (text.toLowerCase() === 'me' || text.toLowerCase() === 'mine') {
    const points = await getPoints(pool, { teamId: command.team_id, userId: command.user_id });
    await respond({ text: `<@${command.user_id}> has ${points} points.` });
    void emitLifecycle('points.query', {
      queryType: 'self',
      teamId: command.team_id,
      channelId: command.channel_id,
      requesterId: command.user_id,
      targetUserId: command.user_id,
      points
    });
    return;
  }

  const leaderboard = await getLeaderboard(pool, { teamId: command.team_id, limit: 10 });
  if (!leaderboard.length) {
    await respond({ text: 'No points yet.' });
    void emitLifecycle('points.query', {
      queryType: 'leaderboard',
      teamId: command.team_id,
      channelId: command.channel_id,
      requesterId: command.user_id,
      leaderboard: []
    });
    return;
  }

  const lines = leaderboard.map(
    (entry, index) => `${index + 1}. <@${entry.user_id}> — ${entry.points}`
  );

  await respond({ text: `Leaderboard:\\n${lines.join('\\n')}` });
  void emitLifecycle('points.query', {
    queryType: 'leaderboard',
    teamId: command.team_id,
    channelId: command.channel_id,
    requesterId: command.user_id,
    leaderboard
  });
});

(async () => {
  await ensureSchema(pool);
  startOutboxWorker({
    pool,
    lifecycle,
    logger: console,
    enabled: String(OUTBOX_WORKER_ENABLED ?? 'true').toLowerCase() === 'true',
    pollIntervalMs: parseIntOptional(OUTBOX_POLL_INTERVAL_MS),
    batchSize: parseIntOptional(OUTBOX_BATCH_SIZE),
    maxAttempts: parseIntOptional(OUTBOX_MAX_ATTEMPTS),
    backoffMs: parseIntOptional(OUTBOX_BACKOFF_MS)
  });
  const port = Number.parseInt(PORT || '', 10) || 3000;
  await app.start(port);
  console.log(`Slack app is running on port ${port}`);
  await emitLifecycle('app.started', { port });
})();
