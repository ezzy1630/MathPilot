#!/usr/bin/env bash
# Ad-hoc sign the generated local MathPilot.app bundle.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/MathPilot.app"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "sign-macos-app: skipping (not macOS)"
  exit 0
fi

if [[ ! -d "$APP" ]]; then
  echo "sign-macos-app: bundle not found at $APP" >&2
  exit 1
fi

find "$APP/Contents/Resources/python" \( -name '__pycache__' -type d -o -name '*.pyc' -type f \) -print0 2>/dev/null |
  xargs -0 rm -rf

codesign --force --deep --sign - "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

echo "sign-macos-app: OK"
