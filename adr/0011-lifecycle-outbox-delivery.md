# ADR 0011: Lifecycle outbox delivery

Date: 2026-02-01
Status: Accepted

## Context
Lifecycle hooks are intended to power integrations. In-process delivery risks losing events on crashes and can introduce latency or retries without persistence.

## Decision
- Persist lifecycle events to a `lifecycle_outbox` table.
- Deliver events asynchronously via an outbox worker that polls and dispatches to listeners.
- Use at-least-once delivery with retries and backoff; mark entries as dead after max attempts.

## Consequences
- Integrations must be idempotent to tolerate re-delivery.
- Event delivery is eventually consistent with core workflows.
- Operators can tune or disable the worker via environment variables.
