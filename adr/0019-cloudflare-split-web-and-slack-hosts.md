# ADR 0019: Split public web and Slack endpoints across subdomains

Date: 2026-02-07
Status: Accepted

## Context
Ack needs stable Slack callback URLs while still allowing independent iteration on public pages. A single-host setup is simple, but it couples marketing/legal page changes with Slack event and OAuth traffic.

## Decision
Use separate subdomains for different responsibilities:
- `ack.bleeping.dev` for human-facing pages:
  - `/`
  - `/privacy`
  - `/support`
- `api.ack.bleeping.dev` for Slack-facing endpoints:
  - `/slack/install`
  - `/slack/oauth_redirect`
  - `/slack/events`

Cloudflare fronts both hosts with:
- Proxied DNS records for `ack` and `api.ack`.
- SSL/TLS mode set to Full (strict) with valid origin certificates for both hosts.
- Route-level controls tuned by function (web caching/headers vs strict API protections).

Slack app configuration uses `https://api.ack.bleeping.dev` for OAuth redirect and request URLs.

## Consequences
- Slack integrations are more isolated from public-page changes and outages.
- Security and traffic controls can be tighter on the API host without affecting the website.
- Deployments can be tuned independently for web and Slack paths.
- DNS, certificates, and Cloudflare configuration are slightly more complex than a single-host design.
