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

# optional: auto-fix permissions with sudo when allowed
if [[ "${ALLOW_SUDO:-}" == "1" ]] && command -v sudo >/dev/null 2>&1; then
	echo "[INFO] Fixing permissions for WASM out dir (sudo -n): $OUT_DIR"
	if sudo -n chown -R "$(id -un)":"$(id -gn)" "$OUT_DIR" 2>/dev/null; then
		sudo -n chflags -R nouchg "$OUT_DIR" 2>/dev/null || true
		sudo -n chmod -R u+rwX "$OUT_DIR" 2>/dev/null || true
	else
		echo "[WARN] sudo non-interactive not permitted; skipping permission fix for $OUT_DIR" >&2
		echo "       Run 'sudo chown -R $(id -un):$(id -gn) $OUT_DIR' manually if needed, or unset ALLOW_SUDO." >&2
	fi
fi

echo "[INFO] Building WASM via wasm-pack"
pushd "$WASM_CRATE_DIR" >/dev/null
# stale/permission-troubled artifacts can block wasm-pack write
rm -rf "$OUT_DIR/pkg" || true
mkdir -p "$OUT_DIR/pkg"
wasm-pack build --release --target web --out-dir "$OUT_DIR/pkg"
popd >/dev/null

echo "[OK] WASM built at $OUT_DIR/pkg"

