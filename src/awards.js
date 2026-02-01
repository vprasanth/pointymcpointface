const mentionRegex = /<@([A-Z0-9]+)(?:\|[^>]+)?>\s*\+\+/g;

function parseMentions(text) {
  mentionRegex.lastIndex = 0;
  const matches = [];
  let match = mentionRegex.exec(text);

  while (match) {
    matches.push({ userId: match[1] });
    match = mentionRegex.exec(text);
  }

  if (!matches.length) {
    return null;
  }

  const seen = new Set();
  const recipients = [];
  for (const entry of matches) {
    if (!seen.has(entry.userId)) {
      seen.add(entry.userId);
      recipients.push(entry.userId);
    }
  }

  const reasonText = text.replace(/<@([A-Z0-9]+)(?:\|[^>]+)?>\s*\+\+/g, '').trim();
  const reason = reasonText.length ? reasonText : null;

  return { recipients, reason };
}

function formatReasonForDisplay(reason) {
  if (!reason) {
    return null;
  }

  const trimmed = reason.replace(/^\s*for\b\s*/i, '').trim();
  return trimmed.length ? trimmed : null;
}

function createRateLimiter({ rateLimitMax, rateLimitWindowMs }) {
  const rateLimitCache = new Map();

  return function checkRateLimit(teamId, giverId, count) {
    if (rateLimitMax <= 0 || rateLimitWindowMs <= 0) {
      return { allowed: true };
    }

    const key = `${teamId}:${giverId}`;
    const now = Date.now();
    let entry = rateLimitCache.get(key);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + rateLimitWindowMs };
    }

    if (entry.count + count > rateLimitMax) {
      rateLimitCache.set(key, entry);
      return {
        allowed: false,
        resetAt: entry.resetAt,
        remaining: Math.max(0, rateLimitMax - entry.count)
      };
    }

    entry.count += count;
    rateLimitCache.set(key, entry);
    return { allowed: true, resetAt: entry.resetAt, remaining: rateLimitMax - entry.count };
  };
}

module.exports = {
  parseMentions,
  createRateLimiter,
  formatReasonForDisplay
};
