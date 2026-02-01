const DEFAULT_OUTBOX_POLL_INTERVAL_MS = 1000;
const DEFAULT_OUTBOX_BATCH_SIZE = 20;
const DEFAULT_OUTBOX_MAX_ATTEMPTS = 10;
const DEFAULT_OUTBOX_BACKOFF_MS = 30000;

function parseIntEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function formatError(error) {
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  return String(error);
}

async function enqueueLifecycleEvent(pool, eventName, payload) {
  if (!eventName) {
    return;
  }

  await pool.query(
    `
    INSERT INTO lifecycle_outbox (event_name, payload)
    VALUES ($1, $2)
    `,
    [eventName, payload || {}]
  );
}

async function claimOutboxBatch(pool, limit) {
  const result = await pool.query(
    `
    WITH claim AS (
      SELECT id
      FROM lifecycle_outbox
      WHERE status IN ('pending', 'failed')
        AND next_attempt_at <= NOW()
      ORDER BY id
      FOR UPDATE SKIP LOCKED
      LIMIT $1
    )
    UPDATE lifecycle_outbox
    SET status = 'processing', updated_at = NOW()
    WHERE id IN (SELECT id FROM claim)
    RETURNING id, event_name, payload, attempts
    `,
    [limit]
  );

  return result.rows;
}

async function markOutboxSuccess(pool, id) {
  await pool.query(
    `
    UPDATE lifecycle_outbox
    SET status = 'delivered', updated_at = NOW()
    WHERE id = $1
    `,
    [id]
  );
}

async function markOutboxFailure(pool, id, attempts, errorMessage, nextAttemptAt, isDead) {
  await pool.query(
    `
    UPDATE lifecycle_outbox
    SET status = $2,
        attempts = $3,
        last_error = $4,
        next_attempt_at = $5,
        updated_at = NOW()
    WHERE id = $1
    `,
    [id, isDead ? 'dead' : 'failed', attempts, errorMessage, nextAttemptAt]
  );
}

function computeBackoffMs(baseBackoffMs, attempts) {
  const cappedAttempts = Math.min(attempts, 5);
  return baseBackoffMs * Math.max(1, cappedAttempts);
}

async function processOutboxOnce({
  pool,
  lifecycle,
  logger,
  batchSize = DEFAULT_OUTBOX_BATCH_SIZE,
  maxAttempts = DEFAULT_OUTBOX_MAX_ATTEMPTS,
  backoffMs = DEFAULT_OUTBOX_BACKOFF_MS
}) {
  if (!lifecycle || typeof lifecycle.emit !== 'function') {
    return;
  }

  const safeBatchSize = batchSize > 0 ? batchSize : DEFAULT_OUTBOX_BATCH_SIZE;
  const rows = await claimOutboxBatch(pool, safeBatchSize);
  if (!rows.length) {
    return;
  }

  for (const row of rows) {
    let failures = [];
    try {
      const results = await lifecycle.emit(row.event_name, row.payload);
      failures = (results || []).filter((result) => result.status === 'rejected');
    } catch (error) {
      failures = [{ reason: error }];
    }

    if (failures.length) {
      const attempts = row.attempts + 1;
      const isDead = attempts >= maxAttempts;
      const nextAttemptAt = new Date(Date.now() + computeBackoffMs(backoffMs, attempts));
      const errorMessage = formatError(failures[0].reason || failures[0]);

      await markOutboxFailure(pool, row.id, attempts, errorMessage, nextAttemptAt, isDead);

      if (logger && logger.warn) {
        logger.warn('[outbox] delivery failed', {
          id: row.id,
          eventName: row.event_name,
          attempts,
          isDead
        });
      }
      continue;
    }

    await markOutboxSuccess(pool, row.id);
  }
}

function startOutboxWorker({
  pool,
  lifecycle,
  logger = console,
  enabled = parseBoolean(process.env.OUTBOX_WORKER_ENABLED ?? 'true'),
  pollIntervalMs = parseIntEnv(process.env.OUTBOX_POLL_INTERVAL_MS, DEFAULT_OUTBOX_POLL_INTERVAL_MS),
  batchSize = parseIntEnv(process.env.OUTBOX_BATCH_SIZE, DEFAULT_OUTBOX_BATCH_SIZE),
  maxAttempts = parseIntEnv(process.env.OUTBOX_MAX_ATTEMPTS, DEFAULT_OUTBOX_MAX_ATTEMPTS),
  backoffMs = parseIntEnv(process.env.OUTBOX_BACKOFF_MS, DEFAULT_OUTBOX_BACKOFF_MS)
} = {}) {
  if (!enabled) {
    if (logger && logger.info) {
      logger.info('[outbox] worker disabled');
    }
    return { stop: () => {} };
  }

  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      await processOutboxOnce({
        pool,
        lifecycle,
        logger,
        batchSize,
        maxAttempts,
        backoffMs
      });
    } catch (error) {
      if (logger && logger.error) {
        logger.error('[outbox] worker error', error);
      }
    } finally {
      running = false;
    }
  };

  const interval = pollIntervalMs > 0 ? pollIntervalMs : DEFAULT_OUTBOX_POLL_INTERVAL_MS;
  const timer = setInterval(() => {
    void tick();
  }, interval);

  void tick();
  if (logger && logger.info) {
    logger.info({
      pollIntervalMs: interval,
      batchSize,
      maxAttempts,
      backoffMs
    }, '[outbox] worker started');
  }

  return {
    stop: () => clearInterval(timer)
  };
}

module.exports = {
  enqueueLifecycleEvent,
  startOutboxWorker
};
