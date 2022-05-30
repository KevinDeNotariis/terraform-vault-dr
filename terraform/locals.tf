locals {
  unique_id = format("%s-%s", var.environment, var.identifier)

  hosted_zone_name         = "hashiconf.demo"
  vault_endpoint           = "vault.hashiconf.demo"
  vault_endpoint_primary   = "vault-primary.hashiconf.demo"
  vault_endpoint_secondary = "vault-dr.hashiconf.demo"

  dr_operation_token_name      = "vault-dr-operation-token-${local.unique_id}"
  dr_operation_token_role_name = "vault-dr-operation-token-gen-lambda-${local.unique_id}"
}