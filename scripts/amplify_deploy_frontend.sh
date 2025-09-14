#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
source "$SCRIPT_DIR/common.sh"

# Strategy: build Next.js to static `out/` and upload to Amplify via S3+job API
# Required envs: AMPLIFY_APP_ID, AMPLIFY_BRANCH_NAME, AMPLIFY_JOB_ID(optional)

check_deps
require_cmd npm

bash "$SCRIPT_DIR/build_wasm.sh"

if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
    echo "[ERR] NEXT_PUBLIC_API_URL is required for build (e.g., https://api.example.com)" >&2
    echo "      Set it like: NEXT_PUBLIC_API_URL=... make frontend-deploy" >&2
    exit 1
fi

if [[ "${ALLOW_SUDO:-}" == "1" ]] && command -v sudo >/dev/null 2>&1; then
	echo "[INFO] Fixing permissions for frontend (sudo -n)"
	if sudo -n chown -R "$(id -un)":"$(id -gn)" "$REPO_ROOT/frontend" 2>/dev/null; then
		sudo -n chflags -R nouchg "$REPO_ROOT/frontend" 2>/dev/null || true
		sudo -n chmod -R u+rwX "$REPO_ROOT/frontend" 2>/dev/null || true
	else
		echo "[WARN] sudo non-interactive not permitted; skipping permission fix for frontend" >&2
		echo "       Run 'sudo chown -R $(id -un):$(id -gn) $REPO_ROOT/frontend' manually if needed, or unset ALLOW_SUDO." >&2
	fi
fi

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
# Robustly extract upload URL and job id across response shapes
UPLOAD_URL=$(echo "$CREATE_JSON" | jq -r '[
  .zipUploadUrl,
  .job.zipUploadUrl,
  (.job.summary.artifacts[]? | .uploadUrl),
  (.job.artifacts[]? | .uploadUrl)
] | map(select(. != null and . != "")) | .[0] // empty')
JOB_ID=$(echo "$CREATE_JSON" | jq -r '[
  .jobId,
  .job.jobId,
  .job.summary.jobId
] | map(select(. != null and . != "")) | .[0] // empty')

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

echo "[INFO] Waiting for Amplify job to complete... (up to 15m)"
DEADLINE=$((SECONDS+900))
while true; do
    JOB_JSON=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" || true)
    STATUS=$(echo "$JOB_JSON" | jq -r '.job.summary.status // .job.status // empty')
    REASON=$(echo "$JOB_JSON" | jq -r '.job.summary.statusReason // .job.statusReason // ""')
    case "$STATUS" in
        SUCCEED)
            echo "[OK] Amplify job succeeded: $JOB_ID"
            break
            ;;
        FAILED|CANCELLED|TIMED_OUT)
            echo "[ERR] Amplify job $STATUS: $JOB_ID"
            if [[ -n "$REASON" && "$REASON" != "null" ]]; then
                echo "[ERR] Reason: $REASON" >&2
            fi
            exit 1
            ;;
        PENDING|RUNNING|QUEUED|PROVISIONING|VERIFYING|DEPLOYING|RELEASING|ARCHIVING|SUBMITTING)
            ;;
        *)
            echo "[WARN] Unknown status: '$STATUS' for job $JOB_ID" >&2
            ;;
    esac
    if (( SECONDS > DEADLINE )); then
        echo "[ERR] Timeout waiting for Amplify job to finish. Current status: ${STATUS:-unknown}" >&2
        if [[ -n "$REASON" && "$REASON" != "null" ]]; then
            echo "[ERR] Last reason: $REASON" >&2
        fi
        exit 1
    fi
    sleep 5
done

