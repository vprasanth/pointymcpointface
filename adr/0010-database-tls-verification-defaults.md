# ADR 0010: Database TLS verification defaults

Date: 2026-02-01
Status: Accepted

## Context
Some managed Postgres instances require TLS. Disabling certificate verification exposes connections to man-in-the-middle risk and can hide misconfiguration.

## Decision
- When `DATABASE_SSL=true`, default to certificate verification.
- Allow supplying a CA certificate via `DATABASE_SSL_CA`.
- Allow opting out of verification only with `DATABASE_SSL_REJECT_UNAUTHORIZED=false`.

## Consequences
- TLS misconfigurations surface immediately instead of silently succeeding.
- Operators can still use self-signed certs when explicitly configured.
