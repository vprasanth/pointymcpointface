# Cloudflare Terraform Controls

This folder is reserved for Cloudflare Terraform code.

## Security controls
- Keep Terraform state out of git. Use a private remote backend.
- Do not commit `.tfvars`, plan files, or local Terraform runtime files.
- Store Cloudflare credentials outside the repo (for example `CLOUDFLARE_API_TOKEN` in local env or CI secrets).
- Use least-privilege API tokens scoped only to required zone permissions.

## Workflow controls
- Follow import-first adoption for existing Cloudflare resources.
- Run `terraform plan` and confirm no unintended drift before applying.
- Treat this repository as public and avoid embedding private origin details directly in committed files.

## Scope
- Manage only Ack-related DNS/rules/certificate settings here.
- Keep broader account-level resources in a separate, restricted infra workspace.

## Current scaffold
- Worker template and secrets checklist:
  - `infra/cloudflare/workers/ack-api/wrangler.toml.example`
  - `infra/cloudflare/workers/ack-api/SECRETS_CHECKLIST.md`
- Terraform structure (no resources yet):
  - `infra/cloudflare/terraform/`
