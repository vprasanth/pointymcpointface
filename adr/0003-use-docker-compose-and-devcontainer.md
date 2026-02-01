# ADR 0003: Use Docker Compose and Devcontainer

Date: 2026-02-01
Status: Accepted

## Context
We want a consistent local dev environment that runs the app and its database with minimal setup.

## Decision
Use Docker Compose for local services and a VS Code devcontainer that attaches to the same Compose stack.

## Consequences
- One command brings up app and database.
- Devcontainer shares the same services and environment.
- Requires Docker on developer machines.
