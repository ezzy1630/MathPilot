#!/usr/bin/env bash
# Compile macOS Vision OCR helper for MathPilot desktop (release/dev).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/scripts/ocr_vision.swift"
OUT_DIR="$ROOT/apps/desktop/src-tauri/resources/bin"
OUT="$OUT_DIR/mathpilot-ocr"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "build-macos-ocr.sh: skipping (not macOS)" >&2
  exit 0
fi

if ! command -v swiftc >/dev/null 2>&1; then
  echo "build-macos-ocr.sh: swiftc not found" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
swiftc -O -o "$OUT" "$SRC" -framework Vision -framework Foundation
chmod +x "$OUT"
echo "Built $OUT"
