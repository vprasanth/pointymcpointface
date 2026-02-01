# PointyMcPointface

Award points by typing `@user++` (no space) and an optional reason. The app increments that user's points, records who gave them, and replies with the updated total.

## Features
- `@user++` or `@user++ reason` parsing (no space)
- Multiple `@user++` in a single message (same reason applies)
- `/points` slash command for leaderboard, single user, or giving points
- Records giver, receiver, reason, timestamp
- OAuth install for multi-workspace apps
- Postgres-backed storage
- Docker Compose + Devcontainer setup

## Quick Start (Docker Compose)
1. Copy `.env.example` to `.env` and fill in Slack credentials.
2. Start services:
   ```bash
   docker compose up --build
   ```
3. The app runs on `http://localhost:3000`.

Note: For Slack to reach your app during local dev, expose it with a tunnel (ngrok, Cloudflare Tunnel, etc.).

## Slack App Setup
Create a Slack app and configure:

1. **OAuth & Permissions**
   - Redirect URL: `https://YOUR_DOMAIN/slack/oauth_redirect`
  - Bot scopes (default):
    - `chat:write`
    - `channels:history`
    - `groups:history`
    - `im:history`
    - `mpim:history`
    - `commands`

2. **Event Subscriptions**
   - Request URL: `https://YOUR_DOMAIN/slack/events`
   - Subscribe to bot events:
    - `message.channels`
    - `message.groups`
    - `message.im`
      - `message.mpim`

   **Slash Commands**
   - Create `/points`
   - Request URL: `https://YOUR_DOMAIN/slack/events`

3. **Install**
   - Visit `https://YOUR_DOMAIN/slack/install` to install the app.
   - Invite the bot to channels you want it to monitor.

## Environment Variables
Required:
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `SLACK_STATE_SECRET`
- `INSTALLATION_ENCRYPTION_KEY` (32-byte base64 or 64-char hex)
- `DATABASE_URL`

Generate an encryption key with `openssl rand -base64 32` or `openssl rand -hex 32`.

Optional:
- `SLACK_SCOPES` (comma-separated)
- `OAUTH_STATE_TTL_MS` (default 600000)
- `DATABASE_SSL` (`true` to enable SSL)
- `DATABASE_SSL_CA` (PEM-encoded CA certificate)
- `DATABASE_SSL_REJECT_UNAUTHORIZED` (`false` only for local/self-signed testing)
- `ALLOW_SELF_AWARD` (`true` to allow giving points to yourself)
- `AWARD_MAX_RECIPIENTS` (default 5)
- `AWARD_RATE_LIMIT_MAX` (default 5)
- `AWARD_RATE_LIMIT_WINDOW_MS` (default 60000)
- `LOG_LEVEL` (default info)
- `OUTBOX_WORKER_ENABLED` (default true)
- `OUTBOX_POLL_INTERVAL_MS` (default 1000)
- `OUTBOX_BATCH_SIZE` (default 20)
- `OUTBOX_MAX_ATTEMPTS` (default 10)
- `OUTBOX_BACKOFF_MS` (default 30000)
- `PORT` (default 3000)

## Behavior
- The app looks for a mention followed by `++` (example: `@alex++ great job` or `@alex ++ great job`).
- You can award multiple users at once, e.g. `@alex++ @sam++ for jumping in` (reason applies to all).
- Self-awards are rejected unless `ALLOW_SELF_AWARD=true`.
- Awards are rate-limited per giver (`AWARD_RATE_LIMIT_MAX` per `AWARD_RATE_LIMIT_WINDOW_MS`).
- Replies in-thread when the message is in a thread; otherwise replies in-channel.
- Records giver and receiver in `point_events` and maintains totals in `points`.
- `/points` shows a top-10 leaderboard, `/points @user` shows a single user's total, and `/points give @user reason` awards points.

## Useful npm scripts
- `npm run dev` - start the app in watch mode
- `npm run test` - run unit tests
- `npm run test:watch` - run tests in watch mode
- `npm run docker:up` - build and start Docker Compose
- `npm run docker:down` - stop Docker Compose
- `npm run docker:logs` - tail app logs
- `npm run db:psql` - open a Postgres shell

## Lifecycle hooks
Add listeners in `src/listeners.js`. Events are delivered asynchronously from the outbox (at-least-once). See `docs/lifecycle.md` for the event catalog and payloads.

## Devcontainer
Open this repo in VS Code and choose “Reopen in Container”. It uses the same `docker-compose.yml` and runs `npm install` automatically.
