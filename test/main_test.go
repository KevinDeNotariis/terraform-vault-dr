package test

import (
	"os"
	"testing"

	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

func TestDeploy(t* testing.T) {
	identifier := getUniqueId(t, "UNIQUE_ID")

	workingDir := "./example"

	os.Setenv("AWS_REGION", "us-east-1")

	defer test_structure.RunTestStage(t, "destroy", func() {
		t.Run("Destroying Infrastructure", func(t *testing.T) {
			terraformOptions := test_structure.LoadTerraformOptions(t, workingDir)
			terraform.Destroy(t, terraformOptions)
		})
	})

	test_structure.RunTestStage(t, "init_apply", func() {
		t.Run("Validation Terraform Resources Deployment", func(t *testing.T) {
			initialDeploy(t, workingDir, identifier)
		})
	})
}

func initialDeploy(t *testing.T, workingDir string, identifier string) {
	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: workingDir,
		Vars: map[string]interface{}{
			"environment": "test",
			"identifier": identifier,
			"vault_address": os.Getenv("VAULT_ADDRESS"),
		},
	})

	test_structure.SaveTerraformOptions(t, workingDir, terraformOptions)
	terraform.InitAndApply(t, terraformOptions)
}

func getUniqueId(t *testing.T, prefix string) string {
	uniqueId := ""
	if os.Getenv(prefix) != "" {
		uniqueId = os.Getenv(prefix)
		t.Logf("A unique ID has been found (%s), expecting to use an existing cluster...", uniqueId)
	} else {
		uniqueId = random.UniqueId()
		t.Logf("A unique ID has not been specified, expecting to create a new cluster with \"%s\" namespace ID...", uniqueId)
	}
	return uniqueId
}