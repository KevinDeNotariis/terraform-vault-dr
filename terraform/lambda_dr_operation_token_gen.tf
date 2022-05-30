# -----------------------------------------------------------------------------------
# IAM
# -----------------------------------------------------------------------------------
data "aws_iam_policy_document" "lambda_dr_operation_token_gen" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = ["${module.lambda_aws_auth.lambda_function_arn}"]
  }

  statement {
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
      "secretsmanager:DescribeSecret",
      "secretsmanager:CreateSecret"
    ]
    resources = [aws_secretsmanager_secret.dr_operation_token.arn]
  }
}

# -----------------------------------------------------------------------------------
# Secrets Manager
# -----------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "dr_operation_token" {
  name = local.dr_operation_token_name
}

# -----------------------------------------------------------------------------------
# Cloudwatch Trigger
# -----------------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "every_8_hours" {
  name                = "every-8-hours-${local.unique_id}"
  description         = "Fires every 8 hours"
  schedule_expression = "rate(8 hours)"
}

resource "aws_cloudwatch_event_target" "every_8_hours" {
  rule      = aws_cloudwatch_event_rule.every_8_hours.name
  target_id = "lambda"
  arn       = module.lambda_dr_operation_token_gen.lambda_function_arn
}

# -----------------------------------------------------------------------------------
# Lambda Generating the DR Operation Token
# -----------------------------------------------------------------------------------
module "lambda_dr_operation_token_gen" {
  source                            = "terraform-aws-modules/lambda/aws"
  version                           = "3.1.1"
  function_name                     = "vault-dr-operation-token-gen-${local.unique_id}"
  description                       = "Generating DR Operations Token on a scheduled basis"
  runtime                           = "nodejs14.x"
  handler                           = "index.handler"
  timeout                           = 30
  source_path                       = "${path.module}/src/vault-dr-operation-token-gen"
  cloudwatch_logs_retention_in_days = 14
  hash_extra                        = local.unique_id
  publish                           = true

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.lambda_dr_operation_token_gen.json

  allowed_triggers = {
    every8Hours = {
      principal  = "events.amazonaws.com"
      source_arn = aws_cloudwatch_event_rule.every_8_hours.arn
    }
  }

  environment_variables = {
    DR_OPERATION_TOKEN_SECRET_NAME     = local.dr_operation_token_name
    DR_OPERATION_TOKEN_VAULT_ROLE_NAME = local.dr_operation_token_role_name
    AWS_AUTH_ROLE                      = local.dr_operation_token_role_name
    AWS_AUTH_LAMBDA_NAME               = module.lambda_aws_auth.lambda_function_name
    VAULT_ENDPOINT                     = local.vault_endpoint
  }
}