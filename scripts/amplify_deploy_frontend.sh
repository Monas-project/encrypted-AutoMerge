#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
source "$SCRIPT_DIR/common.sh"

# Strategy: build Next.js to static `out/` and upload to Amplify via S3+job API
# Required envs: AMPLIFY_APP_ID, AMPLIFY_BRANCH_NAME, AMPLIFY_JOB_ID(optional)

check_deps
require_cmd npm

"$SCRIPT_DIR/build_wasm.sh"

pushd "$REPO_ROOT/frontend" >/dev/null
echo "[INFO] Building Next.js static export"
npm ci --no-audit --no-fund
npm run build
popd >/dev/null

DIST_DIR="$REPO_ROOT/frontend/out"
ZIP_PATH="$REPO_ROOT/frontend/out.zip"
rm -f "$ZIP_PATH"
pushd "$REPO_ROOT/frontend/out" >/dev/null
zip -qr "$ZIP_PATH" .
popd >/dev/null

APP_ID="${AMPLIFY_APP_ID:-}"
BRANCH="${AMPLIFY_BRANCH_NAME:-main}"
if [[ -z "$APP_ID" ]]; then
	echo "[ERR] AMPLIFY_APP_ID is required" >&2
	exit 1
fi

echo "[INFO] Creating Amplify deployment for app=$APP_ID branch=$BRANCH"
CREATE_JSON=$(aws amplify create-deployment --app-id "$APP_ID" --branch-name "$BRANCH")
UPLOAD_URL=$(echo "$CREATE_JSON" | jq -r '.job.summary.artifacts[].uploadUrl // .job.artifacts[].uploadUrl // .zipUploadUrl')
JOB_ID=$(echo "$CREATE_JSON" | jq -r '.job.summary.jobId // .job.jobId // .jobId')

if [[ -z "$UPLOAD_URL" || -z "$JOB_ID" || "$UPLOAD_URL" == "null" ]]; then
	echo "[ERR] Failed to get upload URL from create-deployment output" >&2
	echo "$CREATE_JSON" >&2
	exit 1
fi

echo "[INFO] Uploading artifact to Amplify"
curl -f -X PUT -T "$ZIP_PATH" "$UPLOAD_URL" -H 'Content-Type: application/zip'

echo "[INFO] Starting deployment job: $JOB_ID"
aws amplify start-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null

echo "[OK] Amplify deployment started. Job ID: $JOB_ID"

