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
- Bot scopes:
  - `chat:write`
  - `channels:history`
  - `groups:history`
  - `im:history`
  - `mpim:history`
  - `commands`

### Event Subscriptions
- Request URL: `https://YOUR_DOMAIN/slack/events`
- Subscribe to bot events:
  - `message.channels`
  - `message.groups`
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
- Specific user: `/points @alex`
- Yourself: `/points me`
- Give points: `/points give @alex for jumping in`

## Lifecycle hooks
Add listeners in `src/listeners.js`. See `docs/lifecycle.md` for the event catalog and payloads.
