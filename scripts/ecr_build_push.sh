#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
source "$SCRIPT_DIR/common.sh"

check_deps
require_cmd git

# If a Lima instance is specified, auto-wire DOCKER_HOST to its docker.sock
if [[ -n "${LIMA_INSTANCE:-}" ]]; then
  LIMA_SOCK="$HOME/.lima/$LIMA_INSTANCE/sock/docker.sock"
  if [[ -S "$LIMA_SOCK" && -z "${DOCKER_HOST:-}" ]]; then
    export DOCKER_HOST="unix://$LIMA_SOCK"
    echo "[INFO] Using DOCKER_HOST=$DOCKER_HOST (from LIMA_INSTANCE=$LIMA_INSTANCE)"
  fi
fi

# Auto-detect container CLI
DOCKER_CLI_RAW="${DOCKER_CLI:-}"
if [[ -n "$DOCKER_CLI_RAW" ]]; then
  read -r -a DOCKER_CLI_ARR <<< "$DOCKER_CLI_RAW"
else
  if command -v lima >/dev/null 2>&1 && [[ -n "${LIMA_INSTANCE:-}" ]]; then
    if lima -i "$LIMA_INSTANCE" docker version >/dev/null 2>&1; then
      DOCKER_CLI_ARR=(lima -i "$LIMA_INSTANCE" docker)
    elif lima -i "$LIMA_INSTANCE" nerdctl version >/dev/null 2>&1; then
      DOCKER_CLI_ARR=(lima -i "$LIMA_INSTANCE" nerdctl)
    fi
  fi
  if [[ -z "${DOCKER_CLI_ARR+x}" ]]; then
    if command -v nerdctl >/dev/null 2>&1; then
      DOCKER_CLI_ARR=(nerdctl)
    elif command -v docker >/dev/null 2>&1; then
      DOCKER_CLI_ARR=(docker)
    elif command -v lima >/dev/null 2>&1; then
      DOCKER_CLI_ARR=(lima nerdctl)
    else
      echo "[ERR] Neither nerdctl, docker, nor lima found. Please install one." >&2
      exit 1
    fi
  fi
fi

CLI_NAME="${DOCKER_CLI_ARR[0]}"
echo "[INFO] Using container CLI: ${DOCKER_CLI_ARR[*]}"
if [[ -n "${DOCKER_HOST:-}" ]]; then
  echo "[INFO] DOCKER_HOST=$DOCKER_HOST"
fi

run_cli() {
  "${DOCKER_CLI_ARR[@]}" "$@"
}

PROJECT_NAME="encrypted-automerge"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
REPO_NAME="$PROJECT_NAME-server"
# デフォルトはコミットSHA。gitが無ければUNIX時刻
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
# 互換: 旧変数 TARGET_PLATFORM（単一）も受け付けつつ、デフォルトはマルチアーキ
TARGET_PLATFORMS_DEFAULT="linux/amd64,linux/arm64"
TARGET_PLATFORMS_RAW="${TARGET_PLATFORMS:-}"
TARGET_PLATFORM_LEGACY="${TARGET_PLATFORM:-}"
if [[ -n "$TARGET_PLATFORMS_RAW" ]]; then
  TARGET_PLATFORMS="$TARGET_PLATFORMS_RAW"
elif [[ -n "$TARGET_PLATFORM_LEGACY" ]]; then
  TARGET_PLATFORMS="$TARGET_PLATFORM_LEGACY"
else
  TARGET_PLATFORMS="$TARGET_PLATFORMS_DEFAULT"
fi
NO_CACHE_FLAG=""
if [[ "${NO_CACHE:-0}" == "1" ]]; then
  NO_CACHE_FLAG="--no-cache"
fi
PUSH_LATEST="${PUSH_LATEST:-0}"

echo "[INFO] Resolving ECR registry endpoint via AWS API"
PROXY_ENDPOINT=$(aws --region "$AWS_REGION" ecr get-authorization-token | jq -r '.authorizationData[0].proxyEndpoint')
if [[ -z "$PROXY_ENDPOINT" || "$PROXY_ENDPOINT" == "null" ]]; then
  echo "[ERR] Could not obtain ECR proxy endpoint. Check AWS credentials/profile and region (AWS_REGION)." >&2
  exit 1
fi
REGISTRY_HOST=${PROXY_ENDPOINT#https://}
ECR_URI="$REGISTRY_HOST/$REPO_NAME"

echo "[INFO] Ensuring ECR repository: $REPO_NAME (region=$AWS_REGION)"
aws --region "$AWS_REGION" ecr describe-repositories --repository-names "$REPO_NAME" >/dev/null 2>&1 || aws --region "$AWS_REGION" ecr create-repository --repository-name "$REPO_NAME" >/dev/null

echo "[INFO] Logging into ECR: $REGISTRY_HOST"
aws ecr get-login-password --region "$AWS_REGION" | run_cli login --username AWS --password-stdin "$REGISTRY_HOST"

echo "[INFO] Building container image for platform(s)=$TARGET_PLATFORMS with ${DOCKER_CLI_ARR[*]} (tag=$IMAGE_TAG)"
USED_BUILDX=0
if [[ "$CLI_NAME" == "docker" ]]; then
  # Prefer buildx for cross-arch builds and direct push
  if docker buildx version >/dev/null 2>&1; then
    echo "[INFO] Using docker buildx"
    docker buildx create --use >/dev/null 2>&1 || true
    USED_BUILDX=1
    EXTRA_TAG_FLAGS=""
    if [[ "$PUSH_LATEST" == "1" ]]; then
      EXTRA_TAG_FLAGS="-t $ECR_URI:latest"
    fi
    docker buildx build $NO_CACHE_FLAG --platform "$TARGET_PLATFORMS" \
      -f "$REPO_ROOT/server/Dockerfile" \
      -t "$ECR_URI:$IMAGE_TAG" $EXTRA_TAG_FLAGS \
      --push "$REPO_ROOT"
  else
    echo "[WARN] docker buildx not available, using regular docker build (may ignore platform)"
    run_cli build $NO_CACHE_FLAG --platform="${TARGET_PLATFORMS%%,*}" \
      -f "$REPO_ROOT/server/Dockerfile" \
      -t "$ECR_URI:$IMAGE_TAG" "$REPO_ROOT"
    echo "[INFO] Pushing to ECR: $ECR_URI:$IMAGE_TAG"
    run_cli push "$ECR_URI:$IMAGE_TAG"
  fi
else
  # nerdctl supports --platform; build with repo root as context
  run_cli build $NO_CACHE_FLAG --platform="${TARGET_PLATFORMS%%,*}" \
    -f "$REPO_ROOT/server/Dockerfile" \
    -t "$ECR_URI:$IMAGE_TAG" "$REPO_ROOT"
  echo "[INFO] Pushing to ECR: $ECR_URI:$IMAGE_TAG"
  run_cli push "$ECR_URI:$IMAGE_TAG"
fi

# Tag/push :latest if requested and not already done by buildx
if [[ "$PUSH_LATEST" == "1" && "$USED_BUILDX" == "0" ]]; then
  echo "[INFO] Tagging also as latest and pushing"
  run_cli tag "$ECR_URI:$IMAGE_TAG" "$ECR_URI:latest"
  run_cli push "$ECR_URI:latest"
fi

echo "[OK] Image pushed: $ECR_URI:$IMAGE_TAG"
echo "ECR_URI=$ECR_URI"
echo "IMAGE_TAG=$IMAGE_TAG"
