variable "environment" {
  description = "The environment to deploy to"
  type        = string
}

variable "identifier" {
  description = "Unique identifier for the deploy"
  type        = string
}

variable "vault_endpoint" {
  description = "The endpoint of the vault cluster (without the protocol)"
  type        = string
}