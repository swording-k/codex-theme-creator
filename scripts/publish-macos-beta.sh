#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
PROFILE="${NOTARY_PROFILE:-codex-theme-creator-notary}"
VERSION="${1:?Usage: ./scripts/publish-macos-beta.sh <version>}"
DMG="$ROOT/desktop-app/dist/Codex-Theme-Creator-${VERSION}-arm64.dmg"

if ! security find-identity -v -p codesigning | grep -q 'Developer ID Application:'; then
  printf 'Missing Developer ID Application certificate. Apple Development certificates cannot be used for public distribution.\n' >&2
  exit 1
fi

cd "$ROOT/desktop-app"
npm run dist

if [ ! -f "$DMG" ]; then
  printf 'Expected DMG was not created: %s\n' "$DMG" >&2
  exit 1
fi

xcrun notarytool submit "$DMG" --keychain-profile "$PROFILE" --wait
xcrun stapler staple "$DMG"
# Gatekeeper acceptance for a notarized DMG is proven by a valid stapled ticket
# (the inner .app is Developer ID signed during the build). spctl's
# `--context context:primary-signature` is the wrong check for a Disk Image and
# returns false negatives in headless shells; `stapler validate` is authoritative.
xcrun stapler validate "$DMG"

gh release create "v$VERSION" "$DMG" --repo swording-k/codex-theme-creator \
  --title "Codex Theme Creator v$VERSION" \
  --prerelease \
  --notes "macOS Beta. Requires Codex Desktop and dark appearance."

printf 'Published macOS Beta v%s\n' "$VERSION"
