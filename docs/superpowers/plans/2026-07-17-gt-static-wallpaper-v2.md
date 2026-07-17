# GT Static Wallpaper V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the image generation workflow, then verify the result in the real Codex application.

**Goal:** Generate, install, and validate a static GT wallpaper that follows the Dream Skin authoring contract.

**Architecture:** Generate one project-bound pure background asset, inspect it before replacing the private theme, remove the experimental motion config, and use the existing injector and switcher unchanged.

**Tech Stack:** Built-in image generation, ImageMagick or `sips`, Dream Skin injector, macOS shell.

---

### Task 1: Generate And Inspect The Wallpaper

**Files:**
- Create: `private-themes/porsche-gt3rs/background-static-v2.png`

- [ ] Generate the approved pure-background composition with no UI or readable text.
- [ ] Inspect the full-resolution output for Porsche rear geometry, supporting-car identity, left safe area, and composer-zone clutter.
- [ ] Reject the asset if any acceptance requirement is visibly broken.

### Task 2: Prepare The Static Theme

**Files:**
- Modify: `private-themes/porsche-gt3rs/theme.json`
- Modify: `private-themes/porsche-gt3rs/background.jpg`

- [ ] Remove the `motion` object from the private theme.
- [ ] Export the approved background as a `2560 x 1440` JPEG.
- [ ] Validate the complete theme with `engine/macos/scripts/injector.mjs --check-payload`.

### Task 3: Install And Verify

**Files:**
- Install to: `~/Library/Application Support/CodexDreamSkinStudio/themes/private-porsche-gt3rs/`

- [ ] Copy the static theme into the local theme library.
- [ ] Hot-switch with `switch-theme-macos.sh --id private-porsche-gt3rs`.
- [ ] Verify the active renderer reports motion profile `none`.
- [ ] Capture and inspect a real Codex screenshot for background visibility and text contrast.
