# ADR 0009: Award idempotency and abuse controls

Date: 2026-02-01
Status: Accepted

## Context
Slack retries events, which can lead to double-counted awards. The award flow is also susceptible to abuse via self-awards or high-volume grants in a short period.

## Decision
- Add a `processed_awards` table keyed on message identifiers to enforce idempotency.
- Block self-awards by default (`ALLOW_SELF_AWARD` to opt in).
- Cap recipients per message (`AWARD_MAX_RECIPIENTS`).
- Rate-limit awards per giver (`AWARD_RATE_LIMIT_MAX` per `AWARD_RATE_LIMIT_WINDOW_MS`).

## Rationale for defaults
The defaults are intentionally conservative to reduce spam risk without blocking normal usage:
- `AWARD_MAX_RECIPIENTS=5` covers common multi-recipient praise while avoiding large fan-out bursts.
- `AWARD_RATE_LIMIT_MAX=5` per `AWARD_RATE_LIMIT_WINDOW_MS=60000` allows a short burst (e.g., a quick round of kudos) but prevents sustained flooding.

## Consequences
- Award retries do not double-count points.
- Some workflows require explicit opt-in via environment variables.
- Award volume is bounded to mitigate spam and accidental bursts.
