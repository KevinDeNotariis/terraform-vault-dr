variable "environment" {
  description = "Environment to deploy to"
  type        = string

  validation {
    condition     = var.environment == "dev" || var.environment == "stage" || var.environment == "prod" || var.environment == "test"
    error_message = "The environment variable must be one of: test, dev, stage, prod."
  }
}

variable "identifier" {
  description = "Unique identifier for the resources"
  type        = string
  default     = "stable"
}

variable "vault_endpoint_primary" {
  description = "Endpoint for the 'Primary' Vault Cluster"
  type        = string
}

variable "vault_endpoint_secondary" {
  description = "Endpoint for the 'Secondary' Vault Cluster"
  type        = string
}

variable "vault_endpoint" {
  description = "Vaukt Endpoint pointing to the Primary cluster"
  type        = string
}

variable "hosted_zone_name" {
  description = "Hosted Zone where the CNAMES/ALIASES for the Vault endpoints resides"
  type        = string
}