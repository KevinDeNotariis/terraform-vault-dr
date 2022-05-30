locals {
  unique_id = format("%s-%s", var.environment, var.identifier)

  dr_operation_token_name      = "vault-dr-operation-token-${local.unique_id}"
  dr_operation_token_role_name = "vault-dr-operation-token-gen-lambda-${local.unique_id}"
}