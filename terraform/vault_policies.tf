# -----------------------------------------------------------------------------------
# Token Policy for the DR Operation Token
# -----------------------------------------------------------------------------------

data "vault_policy_document" "dr_operation_token" {
  rule {
    path         = "sys/replication/dr/*"
    capabilities = ["update", "list", "read", "delete", "sudo"]
  }
}

resource "vault_policy" "dr_operation_token" {
  name   = local.dr_operation_token_name
  policy = data.vault_policy_document.dr_operation_token.hcl
}

# -----------------------------------------------------------------------------------
# Policy for the Token dropped by the AWS Auth Method
# -----------------------------------------------------------------------------------

data "vault_policy_document" "aws_auth_method" {
  rule {
    path         = "auth/token/create/${local.dr_operation_token_name}"
    capabilities = ["create", "update"]
  }
}

resource "vault_policy" "aws_auth_method_policy" {
  name   = local.dr_operation_token_name
  policy = data.vault_policy_document.dr_operation_token.hcl
}