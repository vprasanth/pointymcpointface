# ADR 0013: Support optional space before ++

Date: 2026-02-01
Status: Accepted

## Context
Slack commonly inserts a space after a mention when typing. The `@user++` pattern failed to match when a space appeared between the mention and `++`.

## Decision
Allow optional whitespace between the user mention and the `++` token when parsing awards.

## Consequences
- Users can type `@user ++` or `@user++` interchangeably.
- Parsing is more forgiving without changing award semantics.
