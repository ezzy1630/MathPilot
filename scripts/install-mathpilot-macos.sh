#!/usr/bin/env bash
# Install MathPilot.app to /Applications (macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_SRC="$ROOT/apps/desktop/src-tauri/target/release/bundle/macos/MathPilot.app"
APP_DEST="/Applications/MathPilot.app"

cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer is for macOS only." >&2
  exit 1
fi

if [[ ! -d "$APP_SRC" ]]; then
  echo "Release bundle not found — building MathPilot (this may take several minutes)…"
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "pnpm is required. Install Node 22+ and pnpm, then re-run." >&2
    exit 1
  fi
  pnpm install
  pnpm --filter @mathpilot/desktop desktop:build
fi

if [[ ! -d "$APP_SRC" ]]; then
  echo "Error: expected bundle at $APP_SRC" >&2
  exit 1
fi

echo "Installing MathPilot to $APP_DEST"
echo "You may be prompted for your password (sudo) to replace an existing app."

if [[ -d "$APP_DEST" ]]; then
  sudo rm -rf "$APP_DEST"
fi
sudo cp -R "$APP_SRC" "$APP_DEST"

echo "Done. Launch with: open -a MathPilot"
