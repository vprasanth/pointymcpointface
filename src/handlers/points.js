const { incrementPoints, getPoints, getLeaderboard, getLeaderboardForPeriod } = require('../store');
const { createRateLimiter, formatReasonForDisplay } = require('../awards');
const { parseGiveCommand, parseLeaderboardCommand, parseSimpleLookup } = require('../commands/points');
const logger = require('../logger');

function registerPointsHandler(app, { pool, emitLifecycle, config }) {
  if (!app) {
    return;
  }

  const checkRateLimit = createRateLimiter({
    rateLimitMax: config.awards.rateLimitMax,
    rateLimitWindowMs: config.awards.rateLimitWindowMs
  });

  app.command('/points', async ({ command, ack, respond }) => {
    await ack();

    const text = (command.text || '').trim();

    const give = parseGiveCommand(text);
    if (give) {
      if (give.error) {
        await respond({ text: 'Usage: /points give @user [reason]' });
        logger.info({
          teamId: command.team_id,
          channelId: command.channel_id,
          requesterId: command.user_id
        }, 'Give command missing user');
        return;
      }

      const giverId = command.user_id;
      const receiverId = give.userId;
      const teamId = command.team_id;
      const channelId = command.channel_id;
      const messageTs = command.trigger_id || `${Date.now()}`;

      if (!config.awards.allowSelfAward && receiverId === giverId) {
        await respond({ text: 'Self-awards are not allowed.' });
        logger.info({ teamId, channelId, giverId }, 'Give command blocked (self-award)');
        return;
      }

      const rateCheck = checkRateLimit(teamId, giverId, 1);
      if (!rateCheck.allowed) {
        const retryInSeconds = Math.max(1, Math.ceil((rateCheck.resetAt - Date.now()) / 1000));
        await respond({ text: `Rate limit exceeded. Try again in ${retryInSeconds} seconds.` });
        logger.info({ teamId, channelId, giverId, retryInSeconds }, 'Give command rate-limited');
        return;
      }

      void emitLifecycle('points.award.received', {
        teamId,
        channelId,
        messageTs,
        threadTs: null,
        giverId,
        recipients: [receiverId],
        reason: give.reason
      });

      try {
        const { points, eventId, eventCreatedAt, deduped } = await incrementPoints(pool, {
          teamId,
          channelId,
          messageTs,
          giverId,
          receiverId,
          reason: give.reason
        });

        if (deduped) {
          logger.info({ teamId, channelId, giverId, receiverId }, 'Give command deduped');
        } else {
          logger.info({
            teamId,
            channelId,
            giverId,
            receiverId,
            points
          }, 'Give command applied');
          void emitLifecycle('points.awarded', {
            teamId,
            channelId,
            messageTs,
            threadTs: null,
            giverId,
            receiverId,
            points,
            reason: give.reason,
            eventId,
            eventCreatedAt
          });
        }

        let response = `<@${receiverId}> has ${points} points.`;
        const displayReason = formatReasonForDisplay(give.reason);
        if (displayReason) {
          response += ` Most recently for: ${displayReason}`;
        }

        await respond({ text: response });
        logger.info({
          teamId,
          channelId,
          giverId,
          receiverId
        }, 'Give command response sent');
      } catch (error) {
        logger.error({ err: error, teamId, channelId, giverId }, 'Give command failed');
        void emitLifecycle('points.award.failed', {
          teamId,
          channelId,
          messageTs,
          threadTs: null,
          giverId,
          recipients: [receiverId],
          reason: give.reason,
          errorMessage: error.message
        });
        await respond({ text: 'Unable to award points right now.' });
      }
      return;
    }

    const leaderboardCmd = parseLeaderboardCommand(text);
    if (leaderboardCmd) {
      let leaderboard = [];
      let label = 'Leaderboard';
      if (leaderboardCmd.period) {
        const now = Date.now();
        const windowMs = leaderboardCmd.period === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000;
        const since = new Date(now - windowMs);
        leaderboard = await getLeaderboardForPeriod(pool, {
          teamId: command.team_id,
          limit: 10,
          since
        });
        label = leaderboardCmd.period === 'week' ? 'Leaderboard (last 7 days)' : 'Leaderboard (last 30 days)';
      } else {
        leaderboard = await getLeaderboard(pool, { teamId: command.team_id, limit: 10 });
      }

      if (!leaderboard.length) {
        await respond({ text: 'No points yet.' });
        logger.info({
          teamId: command.team_id,
          channelId: command.channel_id,
          requesterId: command.user_id,
          period: leaderboardCmd.period || 'all'
        }, 'Leaderboard queried (empty)');
        void emitLifecycle('points.query', {
          queryType: 'leaderboard',
          teamId: command.team_id,
          channelId: command.channel_id,
          requesterId: command.user_id,
          period: leaderboardCmd.period || null,
          leaderboard: []
        });
        return;
      }

      const lines = leaderboard.map(
        (entry, index) => `${index + 1}. <@${entry.user_id}> — ${entry.points}`
      );

      await respond({ text: `${label}:\n${lines.join('\n')}` });
      logger.info({
        teamId: command.team_id,
        channelId: command.channel_id,
        requesterId: command.user_id,
        results: leaderboard.length,
        period: leaderboardCmd.period || 'all'
      }, 'Leaderboard queried');
      void emitLifecycle('points.query', {
        queryType: 'leaderboard',
        teamId: command.team_id,
        channelId: command.channel_id,
        requesterId: command.user_id,
        period: leaderboardCmd.period || null,
        leaderboard
      });
      return;
    }

    const lookup = parseSimpleLookup(text);
    if (lookup && lookup.userId) {
      const points = await getPoints(pool, { teamId: command.team_id, userId: lookup.userId });
      await respond({ text: `<@${lookup.userId}> has ${points} points.` });
      logger.info({
        teamId: command.team_id,
        channelId: command.channel_id,
        requesterId: command.user_id,
        targetUserId: lookup.userId
      }, 'Points queried for user');
      void emitLifecycle('points.query', {
        queryType: 'user',
        teamId: command.team_id,
        channelId: command.channel_id,
        requesterId: command.user_id,
        targetUserId: lookup.userId,
        points
      });
      return;
    }

    if (lookup && lookup.self) {
      const points = await getPoints(pool, { teamId: command.team_id, userId: command.user_id });
      await respond({ text: `<@${command.user_id}> has ${points} points.` });
      logger.info({
        teamId: command.team_id,
        channelId: command.channel_id,
        requesterId: command.user_id
      }, 'Points queried for self');
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
      logger.info({
        teamId: command.team_id,
        channelId: command.channel_id,
        requesterId: command.user_id
      }, 'Leaderboard queried (empty)');
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

    await respond({ text: `Leaderboard:\n${lines.join('\n')}` });
    logger.info({
      teamId: command.team_id,
      channelId: command.channel_id,
      requesterId: command.user_id,
      results: leaderboard.length
    }, 'Leaderboard queried');
    void emitLifecycle('points.query', {
      queryType: 'leaderboard',
      teamId: command.team_id,
      channelId: command.channel_id,
      requesterId: command.user_id,
      leaderboard
    });
  });
}

module.exports = { registerPointsHandler };
