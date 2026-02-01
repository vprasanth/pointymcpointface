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
    logger.info('[lattice-mock] would send praise payload', payload);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      logger.warn('[lattice-mock] webhook responded with non-200', {
        status: response.status,
        statusText: response.statusText
      });
    }
  } catch (error) {
    logger.error('[lattice-mock] webhook request failed', error);
  }
}

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
  const logger = options.logger || console;

  lifecycle.on('points.awarded', async (event) => {
    const payload = buildMockPayload(event);
    await maybeSendWebhook(webhookUrl, payload, logger);
  });
}

module.exports = { registerLatticeMock };
