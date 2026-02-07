module "ack_edge" {
  source = "./modules/ack_edge"

  zone_id            = var.zone_id
  zone_name          = var.zone_name
  web_hostname       = local.web_host
  api_hostname       = local.api_host
  pages_project_name = var.pages_project_name
  worker_name        = var.worker_name
  worker_slack_routes = var.worker_slack_routes
}
