module "lambdas" {
  source = "../../terraform"

  environment    = var.environment
  identifier     = var.identifier
  vault_endpoint = var.vault_endpoint

  hosted_zone_name         = "hashiconf.demo"
  vault_endpoint_primary   = "vault-dev-primary.hashiconf.demo"
  vault_endpoint_secondary = "vault-dev-dr.hashiconf.demo"
}