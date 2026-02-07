# Cloudflare Terraform Scaffold

This directory is a scaffold only. It defines file/module structure and variable contracts for Ack infrastructure.

No Cloudflare resources are implemented yet.

## Layout

```text
infra/cloudflare/terraform/
  versions.tf
  providers.tf
  variables.tf
  locals.tf
  main.tf
  outputs.tf
  terraform.tfvars.example
  modules/
    ack_edge/
      variables.tf
      main.tf
      outputs.tf
      README.md
```

## Intended scope

- DNS and routing for:
  - `ack.bleeping.dev` (Pages/static)
  - `api.ack.bleeping.dev` (Worker/Slack endpoints)
- TLS/routing rules directly related to Ack
- Worker route attachments and related edge config

## Workflow

1. Export a least-privilege Cloudflare token:
   - `export TF_VAR_cloudflare_api_token=...`
2. Copy and edit example values:
   - `cp terraform.tfvars.example terraform.tfvars`
3. Initialize:
   - `terraform init`
4. Validate:
   - `terraform validate`
5. Import-first adoption for existing resources before any apply.
6. Use `terraform plan` to confirm expected changes.

## Guardrails

- Do not commit `terraform.tfvars`, state files, plan files, or credentials.
- Keep this workspace focused on Ack-only resources.
- Prefer importing existing resources before creating new ones.
