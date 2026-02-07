# ADR 0018: Use Cloudflare single-domain routing for Ack

Date: 2026-02-07
Status: Superseded by ADR 0019

## Context
Ack needs a stable public endpoint for Slack OAuth, Events API, slash commands, and public pages. A cross-domain setup was considered, but it adds redirect rules and operational complexity.

## Decision
Use `ack.bleeping.dev` as the single public host for all routes:
- `/`
- `/privacy`
- `/support`
- `/slack/install`
- `/slack/oauth_redirect`
- `/slack/events`

Cloudflare fronts the service with:
- Proxied DNS record for `ack.bleeping.dev` to the app origin.
- SSL/TLS mode set to Full (strict) with a valid origin certificate for `ack.bleeping.dev`.
- No cross-domain redirect rules for Ack traffic.

Slack app configuration uses `https://ack.bleeping.dev` URLs for OAuth redirect and request endpoints.

## Consequences
- Simpler DNS and routing with one canonical host.
- Lower risk of Slack callback mismatch caused by host redirects.
- Marketing, support, and legal pages share the same host as Slack endpoints.
- This decision was replaced before rollout by ADR 0019 to improve operational separation between web pages and Slack-facing endpoints.
