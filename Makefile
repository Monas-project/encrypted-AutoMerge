SHELL := /bin/bash

.DEFAULT_GOAL := help

DOCKER_CLI ?= nerdctl
TARGET_PLATFORM ?= linux/amd64

.PHONY: help wasm frontend-deploy ecr-push ecr-push-amd64 ecr-push-multi infra-apply deploy-all

help:
	@echo "Targets:"
	@echo "  wasm             Build Rust->WASM to frontend/public"
	@echo "  frontend-deploy  Build & deploy frontend to Amplify"
	@echo "  ecr-push         Build server image and push to ECR"
	@echo "  ecr-push-amd64   Force build&push for linux/amd64"
	@echo "  ecr-push-multi   Multi-arch push (linux/amd64,linux/arm64)"
	@echo "  infra-apply      Apply Terraform (requires IMAGE_REPO_URL and TF_KEY_NAME)"
	@echo "  deploy-all       ecr-push -> infra-apply -> frontend-deploy"
	@echo ""
	@echo "Env vars: DOCKER_CLI ($(DOCKER_CLI)), TARGET_PLATFORM ($(TARGET_PLATFORM))"
	@echo "          AWS_REGION ($${AWS_REGION:-ap-northeast-1}), IMAGE_REPO_URL, IMAGE_TAG ($${IMAGE_TAG:-latest})"
	@echo "          TF_KEY_NAME (EC2 key pair), TF_ARCH ($${TF_ARCH:-x86_64}), TF_INSTANCE_TYPE ($${TF_INSTANCE_TYPE:-t3.micro})"

wasm:
	@bash scripts/build_wasm.sh

frontend-deploy: wasm
	@bash scripts/amplify_deploy_frontend.sh

ecr-push:
	TARGET_PLATFORM=$(TARGET_PLATFORM) bash scripts/ecr_build_push.sh

ecr-push-amd64:
	TARGET_PLATFORM=linux/amd64 bash scripts/ecr_build_push.sh

ecr-push-multi:
	TARGET_PLATFORM=linux/amd64,linux/arm64 bash scripts/ecr_build_push.sh

infra-apply:
	@ARCH=$${TF_ARCH:-x86_64}; \
	ITYPE=$${TF_INSTANCE_TYPE:-t3.micro}; \
	cd infra/terraform && terraform init && terraform apply -auto-approve \
		-var="aws_region=$${AWS_REGION:-ap-northeast-1}" \
		-var="key_name=$${TF_KEY_NAME:?set TF_KEY_NAME (EC2 key pair name)}" \
		-var="image_repo_url=$${IMAGE_REPO_URL:?set IMAGE_REPO_URL (from ecr-push output)}" \
		-var="image_tag=$${IMAGE_TAG:-latest}" \
		-var="arch=$$ARCH" \
		-var="instance_type=$$ITYPE"

deploy-all: ecr-push infra-apply frontend-deploy

