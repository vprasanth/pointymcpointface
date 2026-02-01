const mentionRegex = /<@([A-Z0-9]+)(?:\|[^>]+)?>/;

function extractFirstMention(text) {
  if (!text) {
    return null;
  }

  const match = mentionRegex.exec(text);
  if (!match) {
    return null;
  }

  return { userId: match[1], raw: match[0] };
}

function parseGiveCommand(text) {
  const trimmed = (text || '').trim();
  if (!trimmed.toLowerCase().startsWith('give')) {
    return null;
  }

  const remainder = trimmed.slice(4).trim();
  const mention = extractFirstMention(remainder);
  if (!mention) {
    return { error: 'missing_user' };
  }

  const reasonText = remainder.replace(mention.raw, '').trim();
  return {
    userId: mention.userId,
    reason: reasonText.length ? reasonText : null
  };
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

  const lower = remainder.toLowerCase();
  if (lower === 'me' || lower === 'mine') {
    return { self: true };
  }

  const mention = extractFirstMention(remainder);
  if (!mention) {
    return { error: 'missing_user' };
  }

  return { userId: mention.userId };
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

  const mention = extractFirstMention(trimmed);
  if (mention) {
    return { userId: mention.userId };
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'me' || lower === 'mine') {
    return { self: true };
  }

  return null;
}

module.exports = {
  extractFirstMention,
  parseGiveCommand,
  parseHistoryCommand,
  parseLeaderboardCommand,
  parseStatsCommand,
  parseSimpleLookup
};
