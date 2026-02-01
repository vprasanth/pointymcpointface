# ADR 0001: Use Node.js with Slack Bolt

Date: 2026-02-01
Status: Accepted

## Context
We need a Slack app that handles OAuth installs, event subscriptions, and message parsing with minimal boilerplate and reliable defaults.

## Decision
Use Node.js with the official Slack Bolt framework.

## Consequences
- Faster development using Slack's supported framework.
- Built-in OAuth and events handling via `ExpressReceiver`.
- Requires a Node.js 20+ runtime.
