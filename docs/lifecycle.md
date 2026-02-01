# Lifecycle events

This app exposes a small pub/sub system so you can hook into key workflow events.

## Where to register listeners
Add your listeners in `src/listeners.js` using the provided `registerListeners` function.

```js
function registerListeners(lifecycle) {
  lifecycle.on('points.awarded', async (event) => {
    console.log('Points awarded', event);
  });
}
```

## API
- `lifecycle.on(eventName, handler)` → returns an unsubscribe function
- `lifecycle.once(eventName, handler)`
- `lifecycle.off(eventName, handler)`
- `lifecycle.emit(eventName, payload)`

## Delivery model
Lifecycle events are written to a Postgres outbox and delivered asynchronously by a worker. Delivery is at-least-once, so handlers should be idempotent.

Control the worker with:
- `OUTBOX_WORKER_ENABLED` (default true)
- `OUTBOX_POLL_INTERVAL_MS` (default 1000)
- `OUTBOX_BATCH_SIZE` (default 20)
- `OUTBOX_MAX_ATTEMPTS` (default 10)
- `OUTBOX_BACKOFF_MS` (default 30000)

## Event catalog
### `app.started`
Emitted after the app server starts.

Payload:
- `port`

### `oauth.installation.stored`
Emitted after a successful OAuth installation is stored.

Payload:
- `teamId`
- `enterpriseId`
- `isEnterpriseInstall`
- `installation` (redacted summary, no tokens)
  - `teamId`
  - `enterpriseId`
  - `isEnterpriseInstall`
  - `appId`
  - `botId`
  - `botUserId`
  - `userId`
  - `hasBotToken`
  - `hasUserToken`

### `oauth.installation.deleted`
Emitted after an installation is deleted.

Payload:
- `teamId`
- `enterpriseId`
- `isEnterpriseInstall`

### `oauth.state.stored`
Emitted after an OAuth state value is stored.

Payload:
- `state`
- `expiresAt`
- `installOptions`

### `oauth.state.verified`
Emitted after an OAuth state value is verified and removed.

Payload:
- `state`
- `expiresAt`
- `installOptions`

### `points.award.received`
Emitted when a message containing `@user++` is parsed.

Payload:
- `teamId`
- `channelId`
- `messageTs`
- `threadTs`
- `giverId`
- `recipients`
- `reason`

### `points.awarded`
Emitted after a recipient's points are incremented.

Payload:
- `teamId`
- `channelId`
- `messageTs`
- `threadTs`
- `giverId`
- `receiverId`
- `points`
- `reason`
- `eventId`
- `eventCreatedAt`

### `points.award.failed`
Emitted if the award flow fails.

Payload:
- `teamId`
- `channelId`
- `messageTs`
- `threadTs`
- `giverId`
- `recipients`
- `reason`
- `errorMessage`

### `points.query`
Emitted after a `/points` query completes.

Payload:
- `queryType` (`user`, `self`, or `leaderboard`)
- `teamId`
- `channelId`
- `requesterId`
- `targetUserId` (only for `user`/`self` queries)
- `points` (only for `user`/`self` queries)
- `leaderboard` (only for leaderboard queries)

## Mock integration example (Lattice praise)
To demonstrate how lifecycle hooks can power integrations, a mock Lattice plugin is included in `src/plugins/latticeMock.js`.

Enable it by setting:
- `LATTICE_MOCK_ENABLED=true`
- `LATTICE_MOCK_WEBHOOK_URL=` (optional)

When enabled, the plugin listens to `points.awarded` and either logs the payload or posts it to the webhook URL.
