const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseGiveCommand,
  parseHistoryCommand,
  parseLeaderboardCommand,
  parseStatsCommand,
  parseSimpleLookup
} = require('../src/commands/points');

test('parseGiveCommand returns null when not a give command', () => {
  assert.equal(parseGiveCommand('leaderboard'), null);
});

test('parseGiveCommand extracts user and reason', () => {
  const result = parseGiveCommand('give <@U123|alex> for helping');
  assert.ok(result);
  assert.equal(result.userId, 'U123');
  assert.equal(result.reason, 'for helping');
});

test('parseGiveCommand reports missing user', () => {
  const result = parseGiveCommand('give');
  assert.ok(result);
  assert.equal(result.error, 'missing_user');
});

test('parseSimpleLookup handles mention or self', () => {
  const mention = parseSimpleLookup('<@U999|sam>');
  assert.deepEqual(mention, { userId: 'U999' });

  const self = parseSimpleLookup('me');
  assert.deepEqual(self, { self: true });
});

test('parseLeaderboardCommand accepts optional period', () => {
  assert.deepEqual(parseLeaderboardCommand('leaderboard'), { period: null });
  assert.deepEqual(parseLeaderboardCommand('leaderboard week'), { period: 'week' });
  assert.deepEqual(parseLeaderboardCommand('leaderboard month'), { period: 'month' });
  assert.equal(parseLeaderboardCommand('stats'), null);
});

test('parseHistoryCommand supports self or mention', () => {
  assert.deepEqual(parseHistoryCommand('history'), { self: true });
  assert.deepEqual(parseHistoryCommand('history me'), { self: true });
  assert.deepEqual(parseHistoryCommand('history <@U123|alex>'), { userId: 'U123' });
  assert.equal(parseHistoryCommand('leaderboard'), null);
});

test('parseStatsCommand matches stats', () => {
  assert.deepEqual(parseStatsCommand('stats'), {});
  assert.equal(parseStatsCommand('stat'), null);
});
