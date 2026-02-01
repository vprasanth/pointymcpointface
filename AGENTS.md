# AGENTS

This repository supports agentic coding tools. Follow these rules when working here.

## Scope
- Default to small, reviewable changes.
- Prefer incremental edits over large rewrites.
- Avoid destructive commands (no `git reset --hard`, no mass deletes) unless explicitly requested.

## Workflow
- Read before you change: scan relevant files and existing docs.
- Keep edits consistent with existing conventions (Node.js, Slack Bolt, Postgres).
- Update docs when behavior or configuration changes.

## Files and structure
- App entry: `src/index.js`
- Storage: `src/store.js`
- Lifecycle hooks: `src/lifecycle.js`, `src/listeners.js`
- Docs: `docs/`
- ADRs: `adr/`

## Testing and verification
- If you can run locally, use `docker compose up --build` to validate.
- Call out any steps you could not run.

## Style
- Use ASCII for new files and comments.
- Keep comments short and purposeful.
