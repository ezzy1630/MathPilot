#!/usr/bin/env bash
# Build (or reuse) a Tauri CLI that embeds create-dmg 1.2.3 hdiutil retry logic.
# Upstream @tauri-apps/cli 2.11.2 still ships the old detach helper that exits
# immediately on hdiutil code 2 (Resource busy) after Finder layout on macOS 26+.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PATCH="$ROOT/apps/desktop/src-tauri/bundler/dmg/bundle_dmg"
TAG="tauri-cli-v2.11.2"
SRC="$ROOT/.tools/tauri-src-${TAG}"
INSTALL="$ROOT/.tools/tauri-cli"
STAMP="$INSTALL/.bundle_dmg.sha256"
CLI="$INSTALL/bin/cargo-tauri"

patch_hash() {
  shasum -a 256 "$PATCH" | awk '{print $1}'
}

need_build=0
if [[ ! -x "$CLI" ]]; then
  need_build=1
elif [[ ! -f "$STAMP" ]] || [[ "$(cat "$STAMP")" != "$(patch_hash)" ]]; then
  need_build=1
fi

if [[ "$need_build" == 1 ]]; then
  echo "ensure-patched-tauri-cli: installing Tauri CLI ${TAG} with DMG detach retry fix..."
  if [[ ! -d "$SRC/.git" ]]; then
    git clone --depth 1 --branch "$TAG" https://github.com/tauri-apps/tauri.git "$SRC"
  fi
  cp "$PATCH" "$SRC/crates/tauri-bundler/src/bundle/macos/dmg/bundle_dmg"
  cargo install tauri-cli --path "$SRC/crates/tauri-cli" --root "$INSTALL" --force
  patch_hash > "$STAMP"
  echo "ensure-patched-tauri-cli: ready at $CLI"
fi

cd "$ROOT/apps/desktop"
exec "$CLI" "$@"
