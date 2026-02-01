# ADR 0005: Record point events and aggregates

Date: 2026-02-01
Status: Accepted

## Context
We need to track current point totals and who awarded them, with an audit trail for later analysis.

## Decision
Store each award in `point_events` (giver, receiver, reason, timestamp) and maintain aggregated totals in `points` (per team/user).

## Consequences
- Auditable history of awards and who gave them.
- Fast reads for totals and leaderboards.
- Slightly more write work per award.
