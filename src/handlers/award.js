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
      }
      return;
    }

    if (awards.maxRecipientsPerMessage > 0 && recipients.length > awards.maxRecipientsPerMessage) {
      await say({ text: `Too many recipients. Max per message is ${awards.maxRecipientsPerMessage}.` });
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
      logger.error('Failed to record points', error);
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

module.exports = { registerAwardHandler };
