.PHONY: all

GO_DIR := /usr/local
GO_VERSION=1.17
TF_VERSION=1.2.1
NODE_VERSION=14.x

all: install-dependencies test/all

install-dependencies: install/terraform install/go install/nodejs

# -----------------------------------------------------------------------------------
# Dependencies install targets
# -----------------------------------------------------------------------------------
install/terraform:
	@echo "INSTALLING TERRAFORM version ${TF_VERSION}..."
	@curl https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip --output /opt/terraform.zip
	@unzip -o /opt/terraform.zip -d /usr/local/bin/
	@rm -f /opt/terraform.zip
	@terraform -version
	@echo ""

install/go:
	@echo "INSTALLING GO version ${GO_VERSION}..."
	@rm -rf ${GO_DIR}/go
	@curl https://dl.google.com/go/go${GO_VERSION}.linux-amd64.tar.gz --output ${GO_DIR}/go${GO_VERSION}.linux-amd64.tar.gz
	@cd ${GO_DIR} && tar -C ${GO_DIR} -xzf ${GO_DIR}/go${GO_VERSION}.linux-amd64.tar.gz
	@rm -f ${GO_DIR}/go${GO_VERSION}.linux-amd64.tar.gz
	@go version
	@echo ""

install/nodejs:
	@echo "INSTALLING NODE.js version ${NODE_VERSION}..."
	@curl -sL https://rpm.nodesource.com/setup_${NODE_VERSION} | bash -
	@yum install -y nodejs
	@node -v
	@npm -v
	@echo ""

# -----------------------------------------------------------------------------------
# Test Targets
# -----------------------------------------------------------------------------------
test/all:
	cd terraform/test/ && go mod tidy -compat=1.17 && go test -count 1 -v -timeout 60m
