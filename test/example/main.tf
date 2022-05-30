module "lambdas" {
  source = "../../lambdas"

  environment = var.environment
  identifier  = var.identifier
}