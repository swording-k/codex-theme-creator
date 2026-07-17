#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
SKILL_DEST="$CODEX_HOME/skills/codex-theme-creator"
CREATOR_DEST="$CODEX_HOME/codex-theme-creator"
RUNTIME_DEST="$CODEX_HOME/codex-dream-skin-studio"

/bin/mkdir -p "$SKILL_DEST" "$CREATOR_DEST/engine/macos"
/usr/bin/ditto "$ROOT/skills/codex-theme-creator" "$SKILL_DEST"
/usr/bin/ditto "$ROOT/engine/macos" "$CREATOR_DEST/engine/macos"
/bin/mkdir -p "$CREATOR_DEST/skill"
/usr/bin/ditto "$ROOT/skills/codex-theme-creator" "$CREATOR_DEST/skill"

if [ -d "$RUNTIME_DEST" ]; then
  "$ROOT/scripts/install-enhanced-runtime.sh" --hot
  printf 'Installed: Codex Theme Creator skill and enhanced runtime.\n'
else
  printf 'Installed: Codex Theme Creator skill and creator engine.\n'
  printf 'Runtime pending: close Codex when convenient, then run ./scripts/install-enhanced-runtime.sh\n'
fi
