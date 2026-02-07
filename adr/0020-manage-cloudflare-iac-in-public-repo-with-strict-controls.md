# ADR 0020: Manage Cloudflare IaC in a public repo with strict controls

Date: 2026-02-07
Status: Accepted

## Context
The team wants to manage Cloudflare infrastructure programmatically while keeping this repository public. Terraform code can be safely public, but Terraform state and credentials must remain private.

## Decision
Keep Cloudflare Terraform code in this repository under `infra/cloudflare/`, with explicit controls:
- Do not commit Terraform state, local runtime artifacts, plan files, or tfvars files.
- Use a private remote state backend.
- Keep Cloudflare API tokens in environment variables or CI secret storage.
- Use least-privilege Cloudflare API tokens scoped to required zone operations.
- Adopt existing Cloudflare resources using an import-first workflow before normal applies.

## Consequences
- Infrastructure code remains reviewable alongside app code.
- Secrets and state are isolated from the public repository.
- Setup and CI require secret management and remote state configuration.
- Team members must follow import-first and drift-check workflows to avoid accidental changes.
