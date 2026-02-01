# ADR 0017: Add /points stats command

Date: 2026-02-01
Status: Accepted

## Context
Teams want to recognize not just recipients but also the most active givers.

## Decision
Add `/points stats` to show top givers and top receivers using `point_events` aggregates.

## Consequences
- Provides quick insight into participation without exporting data.
- Additional aggregate queries on the event log.
