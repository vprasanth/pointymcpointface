variable "cloudflare_api_token" {
  description = "Cloudflare API token with least-privilege scope for Ack resources."
  type        = string
  sensitive   = true
}

variable "zone_name" {
  description = "Zone name for Ack hostnames."
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for the target zone."
  type        = string
}

variable "web_hostname" {
  description = "Hostname for the public Pages site."
  type        = string
}

variable "api_hostname" {
  description = "Hostname for Slack-facing Worker endpoints."
  type        = string
}

variable "pages_project_name" {
  description = "Cloudflare Pages project name for the static site."
  type        = string
}

variable "worker_name" {
  description = "Worker name for Slack endpoints."
  type        = string
}

variable "worker_slack_routes" {
  description = "Slack endpoint route paths for Worker route wiring."
  type        = list(string)
  default = [
    "/slack/install",
    "/slack/oauth_redirect",
    "/slack/events"
  ]
}
