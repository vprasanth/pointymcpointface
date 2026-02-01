# ADR 0015: Add leaderboard timeframes

Date: 2026-02-01
Status: Accepted

## Context
Teams often want to celebrate recent activity in addition to all-time totals.

## Decision
Support `/points leaderboard week|month` by aggregating `point_events` over the last 7 or 30 days.

## Consequences
- Leaderboards can be scoped to recent periods without changing existing totals.
- Queries rely on `point_events` and are more expensive than the cached totals table.
