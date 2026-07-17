# Apex Motion Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use test-driven development and execute each task in order.

**Goal:** Build and locally install a reusable motion-enabled Codex Dream Skin runtime with a GT broadcast flagship theme.

**Architecture:** Vendor the upstream macOS runtime, extend its theme-to-root mapping with a small motion contract, and implement profile visuals in CSS. Keep decorative effects isolated from native Codex controls and preserve upstream installation and switching behavior.

**Tech Stack:** Node.js, CSS, shell scripts, Codex Dream Skin CDP injection.

---

### Task 1: Vendor And Baseline The Runtime

**Files:**
- Create: `engine/macos/`

- [ ] Copy the upstream macOS runtime with license and tests.
- [ ] Run `engine/macos/tests/run-tests.sh` and record the clean baseline.

### Task 2: Add The Motion Contract

**Files:**
- Modify: `engine/macos/tests/renderer-inject.test.mjs`
- Modify: `engine/macos/assets/renderer-inject.js`

- [ ] Add failing tests for `data-dream-motion-profile`, intensity, feature flags, and cleanup.
- [ ] Run the renderer test and verify the new assertions fail for missing attributes.
- [ ] Implement validated motion mapping and expose CSS variables.
- [ ] Run the renderer test and verify it passes.

### Task 3: Implement GT Broadcast Visuals

**Files:**
- Modify: `engine/macos/tests/renderer-inject.test.mjs`
- Modify: `engine/macos/assets/dream-skin.css`

- [ ] Add failing CSS contract tests for rain, lights, telemetry, reduced motion, readable nested card text, and task-route surfaces.
- [ ] Run the renderer test and verify the assertions fail.
- [ ] Add the GT profile styles and route-specific readability rules.
- [ ] Run the renderer test and complete test suite.

### Task 4: Package And Install

**Files:**
- Create: `scripts/install-enhanced-runtime.sh`
- Modify: `private-themes/porsche-gt3rs/theme.json` (ignored local test asset)
- Modify: `README.md`

- [ ] Add an idempotent installer that uses the enhanced upstream installer.
- [ ] Add `motion.profile = gt-broadcast` to the private Porsche theme.
- [ ] Install the runtime, seed the private theme, validate it, and hot-switch.
- [ ] Verify installed asset checksums and the active theme ID.
