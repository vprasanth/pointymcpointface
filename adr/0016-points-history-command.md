# ADR 0016: Add /points history command

Date: 2026-02-01
Status: Accepted

## Context
Users want to see recent awards and who gave them without exporting data.

## Decision
Add `/points history @user` (defaulting to self when omitted) to show the most recent awards from `point_events`.

## Consequences
- Enables lightweight auditing in Slack.
- Reads from the event log rather than the aggregated totals table.
