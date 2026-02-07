variable "zone_id" {
  type = string
}

variable "zone_name" {
  type = string
}

variable "web_hostname" {
  type = string
}

variable "api_hostname" {
  type = string
}

variable "pages_project_name" {
  type = string
}

variable "worker_name" {
  type = string
}

variable "worker_slack_routes" {
  type = list(string)
}
