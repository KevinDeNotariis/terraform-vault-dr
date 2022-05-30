# -----------------------------------------------------------------------------------
# IAM
# -----------------------------------------------------------------------------------
data "aws_iam_policy_document" "lambda_dr_operations" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.dr_operation_token.arn]
  }
}

# -----------------------------------------------------------------------------------
# Lambda making DR Operations against the Vault cluster(s)
# -----------------------------------------------------------------------------------
module "lambda_dr_operations" {
  source                            = "terraform-aws-modules/lambda/aws"
  version                           = "3.1.1"
  function_name                     = "vault-dr-operations-${local.unique_id}"
  description                       = "Implements different DR Operations against the Vault Cluster"
  runtime                           = "nodejs14.x"
  handler                           = "index.handler"
  timeout                           = 60
  source_path                       = "${path.module}/src/vault-dr-operations"
  cloudwatch_logs_retention_in_days = 14
  hash_extra                        = local.unique_id
  publish                           = true

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.lambda_dr_operations.json

  environment_variables = {
    SECRET_NAME        = local.dr_operation_token_name
    ENDPOINT_CLUSTER_1 = var.vault_endpoint_primary
    ENDPOINT_CLUSTER_2 = var.vault_endpoint_secondary
  }
}