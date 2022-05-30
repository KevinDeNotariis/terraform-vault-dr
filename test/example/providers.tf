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

provider "aws" {
  region = "us-east-1"
}

provider "vault" {
  address = "https://${var.vault_endpoint}"
}