# ADR 0007: Add lifecycle event hooks

Date: 2026-02-01
Status: Accepted

## Context
We need a way to attach custom behavior (analytics, notifications, auditing) when key workflow events occur without tightly coupling that logic to core handlers.

## Decision
Provide an in-process pub/sub lifecycle bus with named events and documented payloads. Listeners are registered in `src/listeners.js`.

## Consequences
- Extensibility without modifying core logic for each integration.
- Listener failures are isolated and do not break core flows.
- Event contracts must be maintained for compatibility.
