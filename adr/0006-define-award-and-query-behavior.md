# ADR 0006: Define award and query behavior

Date: 2026-02-01
Status: Accepted

## Context
We need a clear syntax for awarding points and a simple way to query totals.

## Decision
- Award points via mentions followed immediately by "++" (e.g., `@alex++`).
- Support multiple mentions in a single message; trailing text becomes the reason for all awards.
- Reply in-thread if the original message is in a thread; otherwise reply in-channel.
- Provide a `/points` slash command to show a top-10 leaderboard or a specific user total.

## Consequences
- Predictable parsing with no-space syntax.
- Consistent reason handling for multi-award messages.
- `/points` requires the `commands` scope and Slack slash command setup.
