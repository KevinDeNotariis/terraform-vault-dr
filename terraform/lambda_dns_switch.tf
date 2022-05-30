# -----------------------------------------------------------------------------------
# IAM
# -----------------------------------------------------------------------------------
data "aws_iam_policy_document" "lambda_dns_switch" {
  statement {
    actions = [
      "route53:ListHostedZones",
      "route53:ListResourceRecordSets",
      "route53:ChangeResourceRecordSets"
    ]
    #checkov:skip=CKV_AWS_111: For demo purpose we use * here
    resources = ["*"]
  }
}

# -----------------------------------------------------------------------------------
# Lambda Switching weights for Vault Primary/Secondary endpoints
# -----------------------------------------------------------------------------------
module "lambda_dns_switch" {
  source                            = "terraform-aws-modules/lambda/aws"
  version                           = "3.1.1"
  function_name                     = "vault-dns-switch-${local.unique_id}"
  description                       = "Switch DNS weights for the Primary and Secondary cluster"
  runtime                           = "python3.8"
  handler                           = "main.handler"
  timeout                           = 60
  source_path                       = "${path.module}/src/vault-dns-switch"
  cloudwatch_logs_retention_in_days = 14
  hash_extra                        = local.unique_id
  publish                           = true

  attach_policy_json = true
  policy_json        = data.aws_iam_policy_document.lambda_dns_switch.json

  environment_variables = {
    VAULT_ENDPOINT     = local.vault_endpoint
    ENDPOINT_CLUSTER_1 = local.vault_endpoint_primary
    ENDPOINT_CLUSTER_2 = local.vault_endpoint_secondary
    HOSTED_ZONE_NAME   = local.hosted_zone_name
  }
}