#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
SOURCE="$ROOT/engine/macos"
INSTALL_ROOT="$HOME/.codex/codex-dream-skin-studio"
HOT="false"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --hot) HOT="true"; shift ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; exit 1 ;;
  esac
done

[ -f "$SOURCE/assets/dream-skin.css" ] || {
  printf 'Enhanced runtime source is missing: %s\n' "$SOURCE" >&2
  exit 1
}

if [ "$HOT" = "true" ]; then
  [ -d "$INSTALL_ROOT/assets" ] || {
    printf 'Dream Skin is not installed. Close Codex and run this script without --hot first.\n' >&2
    exit 1
  }
  for file in dream-skin.css renderer-inject.js; do
    if [ ! -f "$INSTALL_ROOT/assets/$file.apex-original" ]; then
      cp "$INSTALL_ROOT/assets/$file" "$INSTALL_ROOT/assets/$file.apex-original"
    fi
    cp "$SOURCE/assets/$file" "$INSTALL_ROOT/assets/$file"
    chmod 600 "$INSTALL_ROOT/assets/$file"
  done
  printf 'Apex Motion runtime hot-installed at %s\n' "$INSTALL_ROOT"
  exit 0
fi

exec "$SOURCE/scripts/install-dream-skin-macos.sh" --no-launch
