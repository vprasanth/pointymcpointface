# Cloudflare Deployment Plan: Pages + Workers + Neon

Date: 2026-02-07
Status: Draft implementation guide

This document describes how to run Ack with:
- Static pages on Cloudflare (`ack.bleeping.dev`)
- Slack handlers on Cloudflare Workers (`api.ack.bleeping.dev`)
- Postgres on Neon (optionally through Cloudflare Hyperdrive)

This aligns with:
- `adr/0019-cloudflare-split-web-and-slack-hosts.md`
- `adr/0020-manage-cloudflare-iac-in-public-repo-with-strict-controls.md`

## 1. Target architecture

- `ack.bleeping.dev`
  - `/` home page
  - `/privacy`
  - `/support`
  - Hosted by Cloudflare Pages (static assets only)
- `api.ack.bleeping.dev`
  - `/slack/install`
  - `/slack/oauth_redirect`
  - `/slack/events`
  - Hosted by Cloudflare Worker
- Database
  - Neon Postgres (production)
  - Worker connects directly or via Hyperdrive

## 2. Prerequisites

- Cloudflare account with DNS for `bleeping.dev`
- Slack app credentials:
  - `SLACK_CLIENT_ID`
  - `SLACK_CLIENT_SECRET`
  - `SLACK_SIGNING_SECRET`
- Secure app secrets:
  - `SLACK_STATE_SECRET`
  - `INSTALLATION_ENCRYPTION_KEY`
- Neon project and database created
- Node.js 20+ for local tooling
- Wrangler CLI (`npm i -D wrangler`)

## 3. Step-by-step setup

### Step 1: Provision Postgres on Neon

1. Create a Neon project and production database.
2. Create a least-privilege app role for Ack.
3. Apply schema/migrations used by this app.
4. Save the connection string in secure secret storage (not in git).
5. Optional: create a Hyperdrive config in Cloudflare and use that binding from the Worker.

Notes:
- Keep TLS enabled.
- If using connection pooling, use Neon pooled connection endpoints for Worker traffic.

### Step 2: Deploy Slack API Worker

1. Create a Worker project for API endpoints (example name: `ack-api`).
2. Add routes:
   - `api.ack.bleeping.dev/slack/install`
   - `api.ack.bleeping.dev/slack/oauth_redirect`
   - `api.ack.bleeping.dev/slack/events`
3. Configure secrets in Worker settings:
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `SLACK_SIGNING_SECRET`
   - `SLACK_STATE_SECRET`
   - `INSTALLATION_ENCRYPTION_KEY`
   - `DATABASE_URL` (or Hyperdrive binding config)
4. Implement request verification for Slack signatures before processing events.
5. Add OAuth install + callback handlers:
   - `GET /slack/install`
   - `GET /slack/oauth_redirect`
6. Add event/command ingress handler:
   - `POST /slack/events`
7. Store installation data and point events in Neon.
8. Deploy Worker and verify endpoints return expected responses.

### Step 3: Deploy static site on Cloudflare Pages

1. Create a Pages project for static content from `public/`.
2. Build command:
   - none (static only), or your selected static build if you add one later.
3. Output directory:
   - `public`
4. Attach custom domain:
   - `ack.bleeping.dev`
5. Confirm route behavior:
   - `/`
   - `/privacy`
   - `/support`

## 4. DNS and edge configuration

Use proxied DNS records in Cloudflare:
- `ack` -> Pages project custom domain target
- `api.ack` -> Worker route/hostname

TLS:
- SSL mode: `Full (strict)`
- Ensure valid origin certificates where applicable

Caching:
- Aggressive caching only for static assets on `ack.bleeping.dev`
- No caching for Slack POST endpoints on `api.ack.bleeping.dev`

## 5. Slack app configuration values

Set these in Slack app settings:

- OAuth Redirect URL:
  - `https://api.ack.bleeping.dev/slack/oauth_redirect`
- Event Subscriptions Request URL:
  - `https://api.ack.bleeping.dev/slack/events`
- Slash command request URL (if used):
  - `https://api.ack.bleeping.dev/slack/events`
- Install link shared with users:
  - `https://api.ack.bleeping.dev/slack/install`

## 6. Rollout checklist

1. Deploy Worker in non-production mode and test with a Slack test workspace.
2. Confirm signature verification passes and retries are idempotent.
3. Deploy Pages site and verify all public pages.
4. Update Slack app URLs to `api.ack.bleeping.dev`.
5. Reinstall app in test workspace and validate end-to-end flows.
6. Roll to production workspace(s).
7. Monitor Worker errors and Neon connection metrics for 24-48 hours.

## 7. Cost and reliability guardrails

- Use free/static hosting for pages; keep pages static.
- Keep Worker logic minimal and fast to control CPU usage.
- Use Neon autoscaling/pooling to avoid paying for idle capacity.
- Add basic alerting for:
  - Worker error rate
  - Worker latency
  - Database connection saturation

## 8. Repo and IaC guardrails

- Keep Cloudflare IaC under `infra/cloudflare/`.
- Do not commit:
  - state files
  - `.tfvars`
  - plan files
  - credentials
- Use import-first Terraform workflow for existing Cloudflare resources.
- Keep account-wide infra outside this repo if it is not Ack-specific.

## 9. Implementation order in this repository

1. Add Worker app code path (new service or migration of Slack handlers).
2. Add local dev support for Worker + Neon (or local Postgres fallback).
3. Add Cloudflare Terraform for DNS/routes/bindings after manual validation.
4. Update `README.md` production URLs once Worker endpoints are live.
