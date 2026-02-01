# ADR 0014: Add /points give command

Date: 2026-02-01
Status: Accepted

## Context
Some users prefer explicit commands over message parsing for awarding points, especially in noisy channels or when `++` is ambiguous.

## Decision
Add a `/points give @user [reason]` subcommand that awards a point to a single user, reusing the same award safeguards (rate limiting, self-award blocking, idempotency).

## Consequences
- Users have a clear, explicit way to award points.
- Award flows remain consistent with message-based awards.
