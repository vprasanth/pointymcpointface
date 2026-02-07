# Ack API Worker Secrets Checklist

Use this checklist when setting up `api.ack.bleeping.dev` on Cloudflare Workers.

## 1. Required Worker secrets

Set these with Wrangler secret storage:

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`
- `SLACK_STATE_SECRET`
- `INSTALLATION_ENCRYPTION_KEY`
- `DATABASE_URL` (or database URL used by Hyperdrive target)

Do not put these values in `wrangler.toml`.

## 2. Required non-secret vars

Set in `wrangler.toml` `[vars]` (or equivalent dashboard settings):

- `APP_ENV`
- `ACK_PUBLIC_BASE_URL`
- `SLACK_BASE_PATH`

## 3. Secret setup commands

Run from the Worker project directory (where `wrangler.toml` exists):

```bash
npx wrangler secret put SLACK_CLIENT_ID
npx wrangler secret put SLACK_CLIENT_SECRET
npx wrangler secret put SLACK_SIGNING_SECRET
npx wrangler secret put SLACK_STATE_SECRET
npx wrangler secret put INSTALLATION_ENCRYPTION_KEY
npx wrangler secret put DATABASE_URL
```

## 4. Local development handling

- Use `.dev.vars` for local-only values.
- `.dev.vars` and `.wrangler/` must stay uncommitted.
- Never copy production secrets into committed files.

## 5. Verification checklist

1. `npx wrangler deploy` succeeds.
2. `GET /slack/install` returns expected response.
3. OAuth callback to `/slack/oauth_redirect` works in test workspace.
4. Slack signature verification passes for `/slack/events`.
5. Retry delivery from Slack does not create duplicate point events.

## 6. Rotation policy

- Rotate `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, and database credentials on a regular schedule.
- After rotation, re-run end-to-end Slack flow tests in a test workspace before production rollout.
