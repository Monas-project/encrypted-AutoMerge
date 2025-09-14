#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE="${AWS_PROFILE:-default}"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"

function require_cmd() {
	local cmd="$1"
	if ! command -v "$cmd" >/dev/null 2>&1; then
		echo "[ERR] command not found: $cmd" >&2
		exit 1
	fi
}

function check_deps() {
	require_cmd aws
	require_cmd jq
	require_cmd ssh
	require_cmd scp
	require_cmd zip
	require_cmd curl
}

function aws_cli() {
	AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" aws "$@"
}

export AWS_PROFILE AWS_REGION

