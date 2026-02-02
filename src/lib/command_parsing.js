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

function parseUserTarget(text, { allowSelf = false } = {}) {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return null;
  }

  const mention = extractFirstMention(trimmed);
  if (mention) {
    return {
      userId: mention.userId,
      raw: mention.raw,
      remainder: trimmed.replace(mention.raw, '').trim()
    };
  }

  if (allowSelf) {
    const lower = trimmed.toLowerCase();
    if (lower === 'me' || lower === 'mine') {
      return { self: true };
    }
  }

  return null;
}

function stripLeadingFor(text) {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const withoutFor = trimmed.replace(/^\s*for\b\s*/i, '').trim();
  return withoutFor.length ? withoutFor : null;
}

module.exports = {
  extractFirstMention,
  parseUserTarget,
  stripLeadingFor
};
