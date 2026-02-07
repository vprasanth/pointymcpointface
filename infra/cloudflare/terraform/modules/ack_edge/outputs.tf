output "web_hostname" {
  value = var.web_hostname
}

output "api_hostname" {
  value = var.api_hostname
}

output "worker_route_patterns" {
  value = [
    for path in var.worker_slack_routes : "${var.api_hostname}${path}"
  ]
}
