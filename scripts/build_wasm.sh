#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
source "$SCRIPT_DIR/common.sh"

if ! command -v wasm-pack >/dev/null 2>&1; then
	if command -v cargo >/dev/null 2>&1; then
		echo "[INFO] Installing wasm-pack via cargo"
		cargo install wasm-pack
	else
		echo "[ERR] wasm-pack is not installed and cargo not found. Please install Rust/cargo first." >&2
		exit 1
	fi
fi

WASM_CRATE_DIR="$REPO_ROOT/wasm/test_wasm"
OUT_DIR="$REPO_ROOT/frontend/public/wasm/test_wasm"
mkdir -p "$OUT_DIR"

echo "[INFO] Building WASM via wasm-pack"
pushd "$WASM_CRATE_DIR" >/dev/null
wasm-pack build --release --target web --out-dir "$OUT_DIR/pkg"
popd >/dev/null

echo "[OK] WASM built at $OUT_DIR/pkg"

