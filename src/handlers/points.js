const { getPoints, getLeaderboard } = require('../store');
const logger = require('../logger');

function registerPointsHandler(app, { pool, emitLifecycle }) {
  if (!app) {
    return;
  }

  app.command('/points', async ({ command, ack, respond }) => {
    await ack();

    const text = (command.text || '').trim();
    const mentionMatch = /<@([A-Z0-9]+)>/.exec(text);

    if (mentionMatch) {
      const targetId = mentionMatch[1];
      const points = await getPoints(pool, { teamId: command.team_id, userId: targetId });
      await respond({ text: `<@${targetId}> has ${points} points.` });
      logger.info({
        teamId: command.team_id,
        channelId: command.channel_id,
        requesterId: command.user_id,
        targetUserId: targetId
      }, 'Points queried for user');
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
