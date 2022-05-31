module "lambdas" {
  source = "../../terraform"

  environment = var.environment
  identifier  = var.identifier


  vault_endpoint           = "vault-dev.hashiconf.demo"
  hosted_zone_name         = "hashiconf.demo"
  vault_endpoint_primary   = "vault-dev-primary.hashiconf.demo"
  vault_endpoint_secondary = "vault-dev-dr.hashiconf.demo"
}