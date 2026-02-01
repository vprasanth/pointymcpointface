# ADR 0002: Support multi-workspace OAuth

Date: 2026-02-01
Status: Accepted

## Context
The app must be deployable and support installs across multiple Slack workspaces.

## Decision
Implement Slack OAuth with an installation store and state store backed by Postgres.

## Consequences
- Requires OAuth configuration (client ID, secret, redirect URL).
- Installation and state data must be persisted.
- Enables multiple workspaces without hard-coded tokens.
