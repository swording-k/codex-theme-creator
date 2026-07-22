# Codex Theme Creator Agent Guide

Read this file before changing product claims, installers, or release links.

## Product Source Of Truth

Codex Theme Creator is a local Electron theme manager for Codex Desktop. A theme is a validated local package containing `theme.json` and local visual assets. The bundled `codex-theme-creator` Skill teaches Codex how to create, validate, install, and verify those packages.

The product has three separate layers:

1. `theme-studio/`: local management UI and API;
2. `skills/codex-theme-creator/`: AI-assisted creation workflow;
3. `engine/`: platform runtime that applies a selected theme to Codex Desktop.

Do not describe a generated image as a complete theme. Do not describe a built installer as verified until it has been installed and exercised on the target OS.

## Public Product State

- Public website: `https://swording-k.github.io/codex-theme-creator/`
- Public macOS release target: `v0.1.2-beta.1`, Apple silicon only.
- macOS release is Developer ID signed but not yet Apple-notarized. Gatekeeper can require System Settings → Privacy & Security → Open Anyway.
- Windows `v0.1.2-beta.1` is a test build. It may be linked as a clearly labelled test download, but must not be described as verified or stable until a real Windows VM pass is recorded.
- macOS remains the only public stable Beta download. Do not elevate Windows test builds to a public stable release before verification.

## User Flow

1. Install and open the desktop App.
2. The App provisions the bundled Skill and engine into `~/.codex/`.
3. The user selects a built-in theme or asks Codex to create one.
4. Complete themes appear in the local library.
5. The App previews, edits, applies, exports, imports, or restores themes.

Creation, installation, activation, and real-interface verification are different proof states. Report them separately.

## Important Paths

- Desktop shell: `desktop-app/main.mjs`
- Desktop packaging: `desktop-app/package.json`
- Studio server: `theme-studio/server.mjs`
- Studio UI: `theme-studio/public/`
- Platform adapter: `theme-studio/lib/platform.mjs`
- macOS runtime: `engine/macos/`
- Windows runtime: `engine/windows/`
- Creator Skill: `skills/codex-theme-creator/SKILL.md`
- Product website: `site/`
- macOS publishing helper: `scripts/publish-macos-beta.sh`

## Required Checks

Run these before publishing repository changes:

```bash
node theme-studio/tests/platform.test.mjs
node theme-studio/tests/ui-contract.test.mjs
node engine/windows/tests/runtime-contract.test.mjs
node skills/codex-theme-creator/tests/skill-contract.test.mjs
node desktop-app/tests/desktop-entry.test.mjs
node site/site-contract.test.mjs
git diff --check
```

For a public macOS artifact, also require successful Developer ID verification, Apple notarization, stapling, and Gatekeeper acceptance. For Windows, require an install/switch/edit/export/import/restore run on Windows before exposing a download button.

## Release Guardrails

- Keep all user-created themes local unless the user explicitly exports one.
- Never modify Codex `app.asar` or its application signature.
- Preserve a visible `Restore Codex default` action.
- Preserve native Codex interaction and readability before decorative effects.
- Do not publish private theme assets or brand-sensitive images without permission.
- Do not add analytics that identifies users. GitHub release download counts are acceptable aggregate data.
