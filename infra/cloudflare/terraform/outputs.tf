output "web_hostname" {
  description = "Configured public web hostname."
  value       = module.ack_edge.web_hostname
}

output "api_hostname" {
  description = "Configured Slack API hostname."
  value       = module.ack_edge.api_hostname
}

output "worker_route_patterns" {
  description = "Expected Worker route patterns for Slack endpoints."
  value       = module.ack_edge.worker_route_patterns
}
