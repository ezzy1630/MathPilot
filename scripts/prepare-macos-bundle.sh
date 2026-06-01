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

if [[ "$(uname -s)" == "Darwin" ]]; then
  # Leftover interstitial DMG mounts from failed bundle_dmg runs block hdiutil.
  while IFS= read -r mount; do
    [[ -z "$mount" ]] && continue
    hdiutil detach "$mount" -force >/dev/null 2>&1 || true
  done < <(hdiutil info 2>/dev/null | awk '/\/Volumes\/dmg\./ {print $NF}' || true)
  find "$ROOT/apps/desktop/src-tauri/target/release/bundle" -name 'rw.*.dmg' -delete 2>/dev/null || true
fi

echo "prepare-macos-bundle: OK"
