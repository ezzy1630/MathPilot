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

DMG_SRC="$ROOT/apps/desktop/src-tauri/target/release/bundle/dmg/MathPilot_"*".dmg"
if compgen -G "$DMG_SRC" >/dev/null; then
  echo "Release DMG: $(ls -1 $DMG_SRC 2>/dev/null | tail -1)"
fi

if [[ ! -d "$APP_SRC" ]]; then
  echo "Error: expected bundle at $APP_SRC" >&2
  exit 1
fi

echo "Installing MathPilot to $APP_DEST"

install_app() {
  if [[ -d "$APP_DEST" ]]; then
    rm -rf "$APP_DEST"
  fi
  cp -R "$APP_SRC" "$APP_DEST"
}

if install_app 2>/dev/null; then
  :
else
  echo "Need administrator rights to replace $APP_DEST — you may be prompted for your password."
  sudo rm -rf "$APP_DEST"
  sudo cp -R "$APP_SRC" "$APP_DEST"
fi

echo "Done. Launch with: open -a MathPilot"
