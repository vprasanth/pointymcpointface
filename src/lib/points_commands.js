const { parseUserTarget, stripLeadingFor } = require('./command_parsing');

function parseGiveCommand(text) {
  const trimmed = (text || '').trim();
  if (!trimmed.toLowerCase().startsWith('give')) {
    return null;
  }

  const remainder = trimmed.slice(4).trim();
  const target = parseUserTarget(remainder);
  if (!target || !target.userId) {
    return { error: 'missing_user' };
  }

  return { userId: target.userId, reason: stripLeadingFor(target.remainder) };
}

function parseHistoryCommand(text) {
  const trimmed = (text || '').trim();
  if (!trimmed.toLowerCase().startsWith('history')) {
    return null;
  }

  const remainder = trimmed.slice(7).trim();
  if (!remainder) {
    return { self: true };
  }

  const target = parseUserTarget(remainder, { allowSelf: true });
  if (!target) {
    return { error: 'missing_user' };
  }

  if (target.self) {
    return { self: true };
  }

  return { userId: target.userId };
}

function parseLeaderboardCommand(text) {
  const trimmed = (text || '').trim();
  if (!trimmed.toLowerCase().startsWith('leaderboard')) {
    return null;
  }

  const remainder = trimmed.slice(11).trim().toLowerCase();
  if (remainder === 'week' || remainder === 'month') {
    return { period: remainder };
  }

  return { period: null };
}

function parseStatsCommand(text) {
  const trimmed = (text || '').trim().toLowerCase();
  if (trimmed !== 'stats') {
    return null;
  }

  return {};
}

function parseSimpleLookup(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return null;
  }

  const target = parseUserTarget(trimmed, { allowSelf: true });
  if (!target) {
    return null;
  }

  if (target.userId) {
    return { userId: target.userId };
  }

  if (target.self) {
    return { self: true };
  }

  return null;
}

module.exports = {
  parseGiveCommand,
  parseHistoryCommand,
  parseLeaderboardCommand,
  parseStatsCommand,
  parseSimpleLookup
};
