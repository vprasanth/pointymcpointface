function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function buildMockPayload(event) {
  return {
    teamId: event.teamId,
    channelId: event.channelId,
    messageTs: event.messageTs,
    giverId: event.giverId,
    receiverId: event.receiverId,
    points: event.points,
    reason: event.reason,
    eventId: event.eventId,
    eventCreatedAt: event.eventCreatedAt
  };
}

async function maybeSendWebhook(webhookUrl, payload, logger) {
  if (!webhookUrl) {
    logger.info({ payload }, '[lattice-mock] would send praise payload');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      logger.warn({
        status: response.status,
        statusText: response.statusText
      }, '[lattice-mock] webhook responded with non-200');
    }
  } catch (error) {
    logger.error({ err: error }, '[lattice-mock] webhook request failed');
  }
}

const defaultLogger = require('../logger');

function registerLatticeMock(lifecycle, options = {}) {
  if (!lifecycle || typeof lifecycle.on !== 'function') {
    return;
  }

  const enabled = typeof options.enabled === 'boolean'
    ? options.enabled
    : parseBoolean(process.env.LATTICE_MOCK_ENABLED);

  if (!enabled) {
    return;
  }

  const webhookUrl = options.webhookUrl || process.env.LATTICE_MOCK_WEBHOOK_URL || '';
  const logger = options.logger || defaultLogger;

  lifecycle.on('points.awarded', async (event) => {
    const payload = buildMockPayload(event);
    await maybeSendWebhook(webhookUrl, payload, logger);
  });
}

module.exports = { registerLatticeMock };
