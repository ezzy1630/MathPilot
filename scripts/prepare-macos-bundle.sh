#!/usr/bin/env bash
# Prepare bundled Python+SymPy and native OCR helper before `tauri build` (macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "prepare-macos-bundle: skipping (not macOS)"
  exit 0
fi

"$ROOT/scripts/build-macos-python-runtime.sh"
"$ROOT/scripts/build-macos-ocr.sh"

echo "prepare-macos-bundle: OK"
