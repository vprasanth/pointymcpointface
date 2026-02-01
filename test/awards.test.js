const test = require('node:test');
const assert = require('node:assert/strict');

const { parseMentions, createRateLimiter } = require('../src/awards');
const { formatReasonForDisplay } = require('../src/handlers/award');

test('parseMentions returns null when no awards present', () => {
  const result = parseMentions('hello world');
  assert.equal(result, null);
});

test('parseMentions extracts unique recipients and reason', () => {
  const result = parseMentions('<@U123>++ <@U456>++ <@U123>++ thanks!');
  assert.ok(result);
  assert.deepEqual(result.recipients, ['U123', 'U456']);
  assert.equal(result.reason, 'thanks!');
});

test('parseMentions supports space between mention and pluses', () => {
  const result = parseMentions('<@U123> ++ for jumping in');
  assert.ok(result);
  assert.deepEqual(result.recipients, ['U123']);
  assert.equal(result.reason, 'for jumping in');
});

test('parseMentions handles reason-only whitespace', () => {
  const result = parseMentions('<@U999>++   ');
  assert.ok(result);
  assert.deepEqual(result.recipients, ['U999']);
  assert.equal(result.reason, null);
});

test('rate limiter enforces max per window', () => {
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    const check = createRateLimiter({ rateLimitMax: 2, rateLimitWindowMs: 1000 });
    assert.equal(check('T1', 'U1', 1).allowed, true);
    assert.equal(check('T1', 'U1', 1).allowed, true);
    assert.equal(check('T1', 'U1', 1).allowed, false);

    now += 1000;
    assert.equal(check('T1', 'U1', 1).allowed, true);
  } finally {
    Date.now = originalNow;
  }
});

test('rate limiter is disabled when max is zero', () => {
  const check = createRateLimiter({ rateLimitMax: 0, rateLimitWindowMs: 1000 });
  assert.equal(check('T1', 'U1', 100).allowed, true);
});

test('formatReasonForDisplay trims leading for', () => {
  assert.equal(formatReasonForDisplay('for helping'), 'helping');
  assert.equal(formatReasonForDisplay('For   staying late'), 'staying late');
  assert.equal(formatReasonForDisplay('  for   review'), 'review');
});

test('formatReasonForDisplay returns null when empty after trim', () => {
  assert.equal(formatReasonForDisplay('for'), null);
  assert.equal(formatReasonForDisplay('for   '), null);
});
