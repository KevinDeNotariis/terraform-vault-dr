variable "environment" {
  description = "The environment to deploy to"
  type = string
}

variable "identifier" {
  description = "Unique identifier for the deploy"
  type = string
}

variable "vault_address" {
  description = "The Address of the vault cluster (with the protocol)"
  type        = string
}