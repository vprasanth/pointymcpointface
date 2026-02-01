# ADR 0012: Standardize logging with Pino

Date: 2026-02-01
Status: Accepted

## Context
Logging was inconsistent (`console` usage) and did not reliably redact sensitive fields. We need structured logs with a consistent format and built-in redaction.

## Decision
- Adopt Pino as the standard logger.
- Use structured logs with contextual fields for key actions (awards, queries, OAuth installs, outbox worker).
- Configure redaction for secrets, tokens, installation payloads, and sensitive headers.

## Consequences
- Log output format changes to structured JSON.
- Operators can tune verbosity via `LOG_LEVEL`.
- Additional dependency on `pino`.
