# Ack API Worker Setup

This folder contains setup templates for the Slack-facing Worker on `api.ack.bleeping.dev`.

## Files

- `wrangler.toml.example`: non-secret Worker config template
- `SECRETS_CHECKLIST.md`: required secret/env setup and verification steps

## Quick start

1. Create the Worker project directory with your Worker code.
2. Copy the config template:
   - `cp wrangler.toml.example wrangler.toml`
3. Update `main` path in `wrangler.toml` to match your Worker entry file.
4. Add secrets using Wrangler (`npx wrangler secret put ...`).
5. Deploy:
   - `npx wrangler deploy`
6. Verify:
   - `GET /slack/install`
   - `GET /slack/oauth_redirect`
   - `POST /slack/events`

If Terraform manages routes, remove `routes` from `wrangler.toml` and keep route ownership in Terraform only.
