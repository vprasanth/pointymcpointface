# Usage

## Setup
1. Copy `.env.example` to `.env` and fill in:
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `SLACK_SIGNING_SECRET`
   - `SLACK_STATE_SECRET`
   - `INSTALLATION_ENCRYPTION_KEY` (32-byte base64 or 64-char hex)
   - Generate with `openssl rand -base64 32` or `openssl rand -hex 32`
2. Start services:
   ```bash
   docker compose up --build
   ```
3. Expose your local server with a tunnel if running locally.

## Slack app configuration
### OAuth & Permissions
- Redirect URL: `https://YOUR_DOMAIN/slack/oauth_redirect`
- Bot scopes (default):
  - `chat:write`
  - `channels:history`
  - `groups:history`
  - `commands`
- Optional history scopes (only if you enable those surfaces):
  - `im:history`
  - `mpim:history`

### Event Subscriptions
- Request URL: `https://YOUR_DOMAIN/slack/events`
- Subscribe to bot events (default):
  - `message.channels`
  - `message.groups`
- Optional events (only if you enable those surfaces):
  - `message.im`
  - `message.mpim`

### Slash Commands
- Create `/points`
- Request URL: `https://YOUR_DOMAIN/slack/events`

### Install
- Visit `https://YOUR_DOMAIN/slack/install` and install the app.
- Invite the bot to channels you want it to monitor.

## Awarding points
- Single user:
  - `@alex++`
  - `@alex++ great job`
- Multiple users:
  - `@alex++ @sam++ thanks for jumping in`
- Self-awards are rejected unless `ALLOW_SELF_AWARD=true`.

## Querying points
- Leaderboard (top 10): `/points`
- Leaderboard this week: `/points leaderboard week`
- Leaderboard this month: `/points leaderboard month`
- Specific user: `/points @alex`
- Yourself: `/points me`
- Recent awards: `/points history @alex`
- Stats: `/points stats`
- Give points: `/points give @alex for jumping in`

## Example responses
### Leaderboard
```
Leaderboard:
1. @alex — 12
2. @sam — 9
3. @ravi — 7
```

### Weekly leaderboard
```
Leaderboard (last 7 days):
1. @alex — 3
2. @sam — 2
```

### History
```
Recent awards for @alex:
1. @sam — helping onboard (2026-02-01)
2. @ravi (2026-01-29)
```

### Stats
```
Top givers:
1. @sam — 8
2. @ravi — 6

Top receivers:
1. @alex — 10
2. @himashi99 — 7
```

### Give command
```
@alex has 13 points. Most recently for: helping onboard
```

## Lifecycle hooks
Add listeners in `src/listeners.js`. See `docs/lifecycle.md` for the event catalog and payloads.
