# ADR 0004: Use Postgres for persistence

Date: 2026-02-01
Status: Accepted

## Context
The app needs durable storage for OAuth installs, point totals, and award history.

## Decision
Use Postgres as the primary database.

## Consequences
- Supports JSONB storage for installation and state data.
- Works locally via Docker Compose and in production.
- Requires a connection string and optional SSL configuration.
