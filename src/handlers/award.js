const { incrementPoints } = require('../store');
const { parseMentions, createRateLimiter } = require('../awards');

function registerAwardHandler(app, { pool, emitLifecycle, config, logger = console }) {
  if (!app) {
    return;
  }

  const { awards } = config;
  const checkRateLimit = createRateLimiter({
    rateLimitMax: awards.rateLimitMax,
    rateLimitWindowMs: awards.rateLimitWindowMs
  });

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
    const recipients = awards.allowSelfAward
      ? originalRecipients
      : originalRecipients.filter((recipient) => recipient !== giverId);

    if (!recipients.length) {
      if (!awards.allowSelfAward && originalRecipients.includes(giverId)) {
        await say({ text: 'Self-awards are not allowed.' });
        logger.info({ teamId, channelId, giverId, messageTs }, 'Self-award blocked');
      }
      return;
    }

    if (awards.maxRecipientsPerMessage > 0 && recipients.length > awards.maxRecipientsPerMessage) {
      await say({ text: `Too many recipients. Max per message is ${awards.maxRecipientsPerMessage}.` });
      logger.info({
        teamId,
        channelId,
        giverId,
        recipientsCount: recipients.length,
        maxRecipients: awards.maxRecipientsPerMessage,
        messageTs
      }, 'Award blocked by recipient cap');
      return;
    }

    const rateCheck = checkRateLimit(teamId, giverId, recipients.length);
    if (!rateCheck.allowed) {
      const retryInSeconds = Math.max(1, Math.ceil((rateCheck.resetAt - Date.now()) / 1000));
      await say({ text: `Rate limit exceeded. Try again in ${retryInSeconds} seconds.` });
      logger.info({
        teamId,
        channelId,
        giverId,
        recipientsCount: recipients.length,
        retryInSeconds,
        messageTs
      }, 'Award blocked by rate limit');
      return;
    }

    logger.info({
      teamId,
      channelId,
      giverId,
      recipientsCount: recipients.length,
      messageTs
    }, 'Award received');

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

        if (deduped) {
          logger.info({
            teamId,
            channelId,
            giverId,
            receiverId,
            messageTs
          }, 'Award deduped');
        } else {
          logger.info({
            teamId,
            channelId,
            giverId,
            receiverId,
            points,
            messageTs
          }, 'Award applied');
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

      let displayReason = reason ? formatReasonForDisplay(reason) : reason;
      if (displayReason) {
        response += ` Most recently for: ${displayReason}`;
      }

      const payload = { text: response };
      if (message.thread_ts) {
        payload.thread_ts = message.thread_ts;
      }

      await say(payload);
      logger.info({
        teamId,
        channelId,
        giverId,
        recipients: results.map((entry) => entry.receiverId),
        messageTs
      }, 'Award response sent');
    } catch (error) {
      logger.error({ err: error, teamId, channelId, giverId, messageTs }, 'Failed to record points');
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
}

function formatReasonForDisplay(reason) {
  if (!reason) {
    return null;
  }

  const trimmed = reason.replace(/^\s*for\b\s*/i, '').trim();
  return trimmed.length ? trimmed : null;
}

module.exports = { registerAwardHandler, formatReasonForDisplay };
