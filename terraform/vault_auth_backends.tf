# -----------------------------------------------------------------------------------
# Backend Role for the DR Operation Token
# -----------------------------------------------------------------------------------

resource "vault_token_auth_backend_role" "dr_operation_token" {
  role_name  = local.dr_operation_token_role_name
  orphan     = true
  renewable  = false
  token_type = "batch"
  allowed_policies = [
    vault_policy.dr_operation_token.name
  ]
}

# -----------------------------------------------------------------------------------
# Backend Role for the AWS Auth Method
# -----------------------------------------------------------------------------------

resource "vault_aws_auth_backend_role" "lambdas" {
  backend                  = "aws"
  role                     = local.dr_operation_token_role_name
  auth_type                = "iam"
  token_ttl                = 300
  token_max_ttl            = 600
  token_policies           = [vault_policy.aws_auth_method_policy.name]
  bound_iam_principal_arns = [module.lambda_aws_auth.lambda_role_arn]
}