# -----------------------------------------------------------------------------------
# Lambda authenticating to Vault via AWS auth method
# -----------------------------------------------------------------------------------
module "lambda_aws_auth" {
  source                            = "terraform-aws-modules/lambda/aws"
  version                           = "3.1.1"
  function_name                     = "vault-aws-auth-${local.unique_id}"
  description                       = "Authenticating To Vault via AWS Auth method"
  runtime                           = "nodejs14.x"
  handler                           = "index.handler"
  timeout                           = 30
  source_path                       = "${path.module}/src/vault-aws-auth"
  cloudwatch_logs_retention_in_days = 14
  hash_extra                        = local.unique_id
  publish                           = true

  environment_variables = {
    VAULT_ENDPOINT = local.vault_endpoint
  }
}