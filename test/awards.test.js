const test = require('node:test');
const assert = require('node:assert/strict');

const { parseMentions, createRateLimiter } = require('../src/awards');

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
