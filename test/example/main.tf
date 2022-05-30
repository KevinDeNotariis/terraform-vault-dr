module "lambdas" {
  source = "../../terraform"

  environment = var.environment
  identifier  = var.identifier
}