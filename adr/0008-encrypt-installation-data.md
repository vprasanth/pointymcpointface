# ADR 0008: Encrypt installation data

Date: 2026-02-01
Status: Accepted

## Context
Slack OAuth installation data includes access tokens and metadata. Storing it in plaintext increases the impact of a database compromise and risks accidental leakage through logs or lifecycle events.

## Decision
- Encrypt installation data at rest using AES-256-GCM.
- Require `INSTALLATION_ENCRYPTION_KEY` (32-byte base64 or 64-char hex).
- Redact lifecycle payloads for `oauth.installation.stored` to avoid emitting tokens.

## Consequences
- Operators must supply and protect `INSTALLATION_ENCRYPTION_KEY`.
- Legacy installations are transparently re-encrypted on fetch.
- Lifecycle consumers no longer receive raw installation data.
