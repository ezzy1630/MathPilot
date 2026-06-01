#!/usr/bin/env bash
# Bundle a portable macOS arm64 Python (python-build-standalone) with SymPy for MathPilot desktop.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/apps/desktop/src-tauri/resources/python"
REQ="$ROOT/scripts/requirements.txt"
CACHE_DIR="${TMPDIR:-/tmp}/mathpilot-pbs-cache"

# Pinned python-build-standalone release (aarch64-apple-darwin, install_only).
PBS_TAG="20251202"
PYTHON_VERSION="3.12.12"
ARCHIVE="cpython-${PYTHON_VERSION}+${PBS_TAG}-aarch64-apple-darwin-install_only.tar.gz"
DOWNLOAD_URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}/${ARCHIVE//+/%2B}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "build-macos-python-runtime.sh: skipping (not macOS)" >&2
  exit 0
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "build-macos-python-runtime.sh: requires Apple Silicon (aarch64); got $(uname -m)" >&2
  exit 1
fi

if [[ ! -f "$REQ" ]]; then
  echo "build-macos-python-runtime.sh: missing $REQ" >&2
  exit 1
fi

if [[ -x "$OUT_DIR/bin/python3" ]] && "$OUT_DIR/bin/python3" -c "import sympy" 2>/dev/null; then
  echo "OK: bundled Python runtime already present at $OUT_DIR"
  exit 0
fi

mkdir -p "$CACHE_DIR"
ARCHIVE_PATH="$CACHE_DIR/$ARCHIVE"

if [[ ! -f "$ARCHIVE_PATH" ]]; then
  echo "Downloading $DOWNLOAD_URL"
  curl -fL --retry 3 --retry-delay 2 -o "$ARCHIVE_PATH" "$DOWNLOAD_URL"
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

tar -xzf "$ARCHIVE_PATH" -C "$WORK"
SRC="$WORK/python"
if [[ ! -x "$SRC/bin/python3" ]]; then
  echo "build-macos-python-runtime.sh: expected python/bin/python3 in archive" >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$(dirname "$OUT_DIR")"
mv "$SRC" "$OUT_DIR"

echo "Installing Python deps from $REQ"
export PYTHONDONTWRITEBYTECODE=1
"$OUT_DIR/bin/python3" -m pip install --upgrade pip
"$OUT_DIR/bin/python3" -m pip install -r "$REQ"
find "$OUT_DIR" -type d -name __pycache__ -prune -exec rm -rf {} +

if ! "$OUT_DIR/bin/python3" -c "import sympy"; then
  echo "build-macos-python-runtime.sh: sympy import failed after install" >&2
  exit 1
fi

echo "OK: bundled Python runtime at $OUT_DIR"
