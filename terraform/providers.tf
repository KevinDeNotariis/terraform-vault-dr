terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3"
    }
  }
  required_version = "~> 1"
}