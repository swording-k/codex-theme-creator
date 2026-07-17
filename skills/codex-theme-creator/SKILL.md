---
name: codex-theme-creator
description: Create, repair, install, verify, and package complete macOS Codex Desktop themes from a text idea, one or more reference images, or both. Use when a user asks to design a Codex skin, make the whole Codex interface match a visual style, turn an image into a theme, improve theme readability, install or switch a generated theme, or export a shareable theme package.
---

# Codex Theme Creator

Create a complete interface theme, not only a wallpaper. Preserve native Codex content and interaction while styling supported surfaces and adding bounded non-interactive decorations.

## Runtime

Use these installed paths:

```bash
CREATOR_ROOT="${CODEX_HOME:-$HOME/.codex}/codex-theme-creator"
ENGINE_ROOT="$CREATOR_ROOT/engine/macos"
```

If either path is missing, stop and direct the user to run the repository installer. Never close or restart Codex without explicit permission.

## Visible Progress

Track these four states and mark them only with real evidence:

1. Preparing the theme.
2. Designing the complete interface.
3. Applying the theme.
4. Verifying the real Codex interface.

Report these proof boundaries separately:

- `created`: compiled package exists and validates;
- `installed`: package exists in the local Dream Skin theme library;
- `active`: live runtime reports the expected theme ID;
- `verified`: real new-chat and existing-task captures pass review.

## Workflow

### 1. Prepare

Infer a short name when the user omits one. Preserve every attached local image as a reference. Create a new run directory with:

```bash
node "$CREATOR_ROOT/skill/scripts/prepare-theme.mjs" \
  --name "<theme name>" \
  --idea "<single-line visual direction>" \
  --output-dir "<absolute output directory>" \
  --reference "<optional absolute image path>"
```

Inspect supplied references before designing. Do not treat a screenshot containing Codex UI as the injectable background; use it only as visual direction.

### 2. Design

Write a concise visual plan covering palette, native-control material, focal placement, home/task differences, decoration slots, motion, and readability. Use the installed image generation skill for normal background creation. Ground generation in every reference that defines the desired scene or identity.

Copy the selected generated output to `<run>/background.png`. Keep the left 52 percent low-detail, put the main visual on the right, and keep the lower center quiet. Edit `source-theme.json` only through supported schema-v2 fields. Do not add raw CSS, JavaScript, remote assets, or interactive decorations.

Compile and validate:

```bash
node "$ENGINE_ROOT/scripts/compile-theme.mjs" \
  --source "<run>/source-theme.json" \
  --theme-dir "<run>" \
  --output "<run>/theme.json"
node "$ENGINE_ROOT/scripts/injector.mjs" --check-payload --theme-dir "<run>"
```

### 3. Apply

Install the package under `~/Library/Application Support/CodexDreamSkinStudio/themes/<theme-id>/`, preserving only contained theme assets. Switch with the installed Dream Skin script. A switch command proves `active` only when it succeeds and the live probe reports the same theme ID.

### 4. Verify

Run:

```bash
node "$ENGINE_ROOT/scripts/compatibility-probe.mjs"
```

Capture a real new-chat route and a real existing-task route. Check sidebar text and states, suggestion cards, project selector, composer, task text, visible background, decoration occlusion, and click safety. Use generated images only for theme assets, never as fake verification screenshots.

Repair contrast, masking, focal placement, or profile tokens and repeat compilation and verification. Limit automatic visual repair to two passes. If checks still fail, report `verified: false` with the failed checks and captures.

## Package

Keep `theme.json`, `source-theme.json`, the local background, `provenance.json`, real route previews, and a short user README. Public packages must contain only redistributable assets and must identify this project as unofficial.

Always preserve reduced-motion behavior and the runtime restore path.
