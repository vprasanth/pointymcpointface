const test = require('node:test');
const assert = require('node:assert/strict');

const { buildSlackScopesConfig, mapMessageChannelTypeToSurface } = require('../src/slack_scopes');

test('defaults to public and private channels history scopes', () => {
  const result = buildSlackScopesConfig({});
  assert.deepEqual(result.scopes, ['chat:write', 'channels:history', 'groups:history', 'commands']);
  assert.deepEqual(result.historySurfaces, ['channels', 'groups']);
});

test('builds scopes from explicit history surfaces', () => {
  const result = buildSlackScopesConfig({ historySurfacesEnv: 'channels,im' });
  assert.deepEqual(result.scopes, ['chat:write', 'channels:history', 'im:history', 'commands']);
  assert.deepEqual(result.historySurfaces, ['channels', 'im']);
});

test('supports disabling message history scopes', () => {
  const result = buildSlackScopesConfig({ historySurfacesEnv: 'none' });
  assert.deepEqual(result.scopes, ['chat:write', 'commands']);
  assert.deepEqual(result.historySurfaces, []);
});

test('treats empty explicit history surfaces as unset and falls back to defaults', () => {
  const result = buildSlackScopesConfig({ historySurfacesEnv: '' });
  assert.deepEqual(result.scopes, ['chat:write', 'channels:history', 'groups:history', 'commands']);
  assert.deepEqual(result.historySurfaces, ['channels', 'groups']);
});

test('throws on unknown history surfaces', () => {
  assert.throws(
    () => buildSlackScopesConfig({ historySurfacesEnv: 'channels,canvas' }),
    /Invalid SLACK_HISTORY_SURFACES/
  );
});

test('throws when none is combined with other history surfaces', () => {
  assert.throws(
    () => buildSlackScopesConfig({ historySurfacesEnv: 'none,channels' }),
    /none must be used alone/
  );
});

test('maps Slack channel_type to history surface names', () => {
  assert.equal(mapMessageChannelTypeToSurface('channel'), 'channels');
  assert.equal(mapMessageChannelTypeToSurface('group'), 'groups');
  assert.equal(mapMessageChannelTypeToSurface('im'), 'im');
  assert.equal(mapMessageChannelTypeToSurface('mpim'), 'mpim');
  assert.equal(mapMessageChannelTypeToSurface('app_home'), null);
});
