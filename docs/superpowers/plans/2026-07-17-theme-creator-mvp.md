# Codex Theme Creator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a macOS-first vertical slice where a structured GT theme changes the complete Codex interface, installs through the existing runtime, and is creatable through an installable Codex Skill.

**Architecture:** Add a schema-v2 compiler that converts bounded source profiles into the existing runtime payload. Extend the renderer with semantic UI and decoration attributes, render those capabilities through runtime-owned CSS and non-interactive nodes, then package the deterministic workflow as a Codex Skill. Verify the result in both unit tests and the real Codex app.

**Tech Stack:** Node.js ESM, shell scripts, CSS, Chrome DevTools Protocol, Codex Skill Markdown, Node built-in test/assert APIs.

---

## File Map

- `engine/macos/scripts/compile-theme.mjs`: validate schema-v2 source files and emit one runtime `theme.json`.
- `engine/macos/tests/theme-compiler.test.mjs`: compiler acceptance and rejection tests.
- `engine/macos/assets/renderer-inject.js`: map compiled UI/decorations to stable root state and runtime-owned nodes.
- `engine/macos/tests/ui-theme.test.mjs`: renderer contract, cleanup, and interaction-safety tests.
- `engine/macos/assets/dream-skin.css`: semantic native-control recipes and the GT control-room profile.
- `engine/macos/scripts/compatibility-probe.mjs`: query the live renderer and report required capability coverage.
- `engine/macos/tests/compatibility-probe.test.mjs`: normalize and grade probe results.
- `private-themes/porsche-gt3rs/source-theme.json`: local flagship source profile used for real-device verification.
- `skills/codex-theme-creator/SKILL.md`: prompt-or-reference theme creation workflow.
- `skills/codex-theme-creator/scripts/prepare-theme.mjs`: create a deterministic source-theme skeleton from concise design inputs.
- `skills/codex-theme-creator/tests/prepare-theme.test.mjs`: generated skeleton contract tests.
- `scripts/install-theme-creator.sh`: install the Skill and enhanced runtime without silently closing Codex.
- `README.md`: Chinese-first product and installation instructions.

### Task 1: Schema-V2 Theme Compiler

**Files:**
- Create: `engine/macos/tests/theme-compiler.test.mjs`
- Create: `engine/macos/scripts/compile-theme.mjs`
- Modify: `engine/macos/tests/run-tests.sh`

- [ ] **Step 1: Write the failing compiler tests**

Test a valid source with `ui.profile = "gt-control"`, route surfaces, one status-strip decoration, and no arbitrary CSS/JS. Test rejection of an unknown UI profile, a decoration with `interactive: true`, and an asset path escaping the theme directory.

```js
assert.equal(compiled.schemaVersion, 2);
assert.equal(compiled.ui.profile, "gt-control");
assert.equal(compiled.ui.routes.task.surface, "glass-readable");
assert.equal(compiled.decorations[0].interactive, false);
await assert.rejects(() => compileTheme(unsafeSource, dir), /interactive decorations are forbidden/);
```

- [ ] **Step 2: Run the compiler test and verify RED**

Run: `node engine/macos/tests/theme-compiler.test.mjs`

Expected: failure because `compile-theme.mjs` does not exist.

- [ ] **Step 3: Implement the bounded compiler**

Export `compileTheme(source, themeDir)` and support only these first-release values:

```js
const UI_PROFILES = new Set(["native", "gt-control"]);
const SURFACES = new Set(["transparent", "smoked", "glass-readable", "solid-readable"]);
const DECORATION_TYPES = new Set(["masthead", "status-strip", "corner-frame"]);
```

Validate six-digit colors, opacity values from `0` to `1`, contained asset filenames, non-interactive decorations, and local-only assets. The CLI accepts `--source`, `--theme-dir`, and `--output`.

- [ ] **Step 4: Run the compiler test and full suite**

Run: `node engine/macos/tests/theme-compiler.test.mjs && engine/macos/tests/run-tests.sh`

Expected: all tests pass.

- [ ] **Step 5: Commit compiler work**

```bash
git add engine/macos/scripts/compile-theme.mjs engine/macos/tests/theme-compiler.test.mjs engine/macos/tests/run-tests.sh
git commit -m "Add bounded theme profile compiler"
```

### Task 2: Renderer UI Contract

**Files:**
- Create: `engine/macos/tests/ui-theme.test.mjs`
- Modify: `engine/macos/assets/renderer-inject.js`
- Modify: `engine/macos/tests/run-tests.sh`

- [ ] **Step 1: Write failing renderer contract tests**

Require schema-v2 payloads to map to root state and to clean stale state on theme changes:

```js
assert.match(source, /data-dream-ui-profile/);
assert.match(source, /data-dream-home-surface/);
assert.match(source, /data-dream-task-surface/);
assert.match(source, /data-dream-decoration-profile/);
assert.match(source, /removeAttribute/);
```

- [ ] **Step 2: Run the renderer contract test and verify RED**

Run: `node engine/macos/tests/ui-theme.test.mjs`

Expected: failure for missing `data-dream-ui-profile`.

- [ ] **Step 3: Implement UI state mapping**

Map validated payload fields to:

```text
data-dream-ui-profile
data-dream-home-surface
data-dream-task-surface
data-dream-decoration-profile
--ds-ui-density
--ds-ui-radius
--ds-home-opacity
--ds-task-opacity
```

Unknown or absent values resolve to `native`, readable route defaults, and no decoration profile. Add every attribute and property to existing cleanup lists.

- [ ] **Step 4: Run targeted and full tests**

Run: `node engine/macos/tests/ui-theme.test.mjs && engine/macos/tests/run-tests.sh`

Expected: all tests pass.

- [ ] **Step 5: Commit renderer contract work**

```bash
git add engine/macos/assets/renderer-inject.js engine/macos/tests/ui-theme.test.mjs engine/macos/tests/run-tests.sh
git commit -m "Map complete UI profiles into the renderer"
```

### Task 3: GT Native-Control Skin

**Files:**
- Modify: `engine/macos/tests/ui-theme.test.mjs`
- Modify: `engine/macos/assets/dream-skin.css`

- [ ] **Step 1: Add failing CSS capability assertions**

Assert that `gt-control` has explicit rules for the sidebar, selected and hover rows, suggestion cards, project selector, composer, task transcript, dialogs, nested foreground inheritance, focus-visible state, responsive bounds, and task-route surface.

```js
for (const capability of [
  "aside.app-shell-left-panel",
  "bg-token-list-hover-background",
  "data-dream-shell=\"home\"",
  "data-dream-shell=\"task\"",
  ":focus-visible",
]) assert.match(css, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node engine/macos/tests/ui-theme.test.mjs`

Expected: failure for missing GT profile selectors.

- [ ] **Step 3: Implement the GT profile CSS**

Use a charcoal smoked-glass sidebar, orange active indicator, restrained white typography, 6px card radius, explicit nested foreground colors, compact telemetry details, and separate home/task opacity. Keep native content and layout intact. Avoid continuous motion in this task.

- [ ] **Step 4: Run targeted and full tests**

Run: `node engine/macos/tests/ui-theme.test.mjs && engine/macos/tests/run-tests.sh`

Expected: all tests pass.

- [ ] **Step 5: Commit the GT UI profile**

```bash
git add engine/macos/assets/dream-skin.css engine/macos/tests/ui-theme.test.mjs
git commit -m "Add complete GT control room skin"
```

### Task 4: Safe Decoration Layer

**Files:**
- Modify: `engine/macos/tests/ui-theme.test.mjs`
- Modify: `engine/macos/assets/renderer-inject.js`
- Modify: `engine/macos/assets/dream-skin.css`

- [ ] **Step 1: Add failing decoration-safety tests**

Require one runtime-owned container, cleanup on profile removal, `aria-hidden="true"`, and `pointer-events: none` on the container and descendants.

```js
assert.match(renderer, /dream-skin-decorations/);
assert.match(renderer, /aria-hidden/);
assert.match(css, /\.dream-skin-decorations[\s\S]*pointer-events:\s*none/);
assert.match(css, /\.dream-skin-decorations \*[\s\S]*pointer-events:\s*none/);
```

- [ ] **Step 2: Run the UI test and verify RED**

Run: `node engine/macos/tests/ui-theme.test.mjs`

Expected: failure for missing decoration container.

- [ ] **Step 3: Implement bounded GT decorations**

Render only compiler-approved `masthead`, `status-strip`, and `corner-frame` elements. Use theme-owned text from the payload, text length limits, `textContent`, `aria-hidden`, no event listeners, no links, and no raw HTML. Hide decorations on compact viewports when their declared slot is unavailable.

- [ ] **Step 4: Run targeted and full tests**

Run: `node engine/macos/tests/ui-theme.test.mjs && engine/macos/tests/run-tests.sh`

Expected: all tests pass.

- [ ] **Step 5: Commit decoration work**

```bash
git add engine/macos/assets/renderer-inject.js engine/macos/assets/dream-skin.css engine/macos/tests/ui-theme.test.mjs
git commit -m "Add safe theme decoration slots"
```

### Task 5: Runtime Compatibility Probe

**Files:**
- Create: `engine/macos/tests/compatibility-probe.test.mjs`
- Create: `engine/macos/scripts/compatibility-probe.mjs`
- Modify: `engine/macos/tests/run-tests.sh`

- [ ] **Step 1: Write failing probe grading tests**

```js
assert.equal(gradeProbe({ sidebar: 1, composer: 1, shell: 1 }).status, "compatible");
assert.equal(gradeProbe({ sidebar: 0, composer: 1, shell: 1 }).status, "incompatible");
assert.equal(gradeProbe({ sidebar: 1, composer: 1, shell: 1, cards: 0 }).status, "degraded");
```

- [ ] **Step 2: Run the probe test and verify RED**

Run: `node engine/macos/tests/compatibility-probe.test.mjs`

Expected: failure because the probe module does not exist.

- [ ] **Step 3: Implement probe grading and CDP CLI**

Treat `shell`, `sidebar`, and `composer` as critical. Treat home cards, project selector, transcript, and dialogs as optional. Print JSON containing counts, `compatible|degraded|incompatible`, Codex target URL, active theme ID, and runtime version.

- [ ] **Step 4: Run targeted and full tests**

Run: `node engine/macos/tests/compatibility-probe.test.mjs && engine/macos/tests/run-tests.sh`

Expected: all tests pass without requiring a running Codex instance for unit tests.

- [ ] **Step 5: Commit probe work**

```bash
git add engine/macos/scripts/compatibility-probe.mjs engine/macos/tests/compatibility-probe.test.mjs engine/macos/tests/run-tests.sh
git commit -m "Add Codex runtime compatibility probe"
```

### Task 6: Theme Creator Skill

**Files:**
- Create: `skills/codex-theme-creator/tests/prepare-theme.test.mjs`
- Create: `skills/codex-theme-creator/scripts/prepare-theme.mjs`
- Create: `skills/codex-theme-creator/SKILL.md`
- Create: `scripts/install-theme-creator.sh`

- [ ] **Step 1: Write the failing preparation test**

Test that concise design input creates `source-theme.json`, `provenance.json`, and prompt files with a contained background filename, schema version 2, inferred theme slug, and no remote assets.

- [ ] **Step 2: Run the preparation test and verify RED**

Run: `node skills/codex-theme-creator/tests/prepare-theme.test.mjs`

Expected: failure because `prepare-theme.mjs` does not exist.

- [ ] **Step 3: Implement deterministic preparation and Skill workflow**

The Skill documents four visible states: preparing, designing, applying, and verifying. It accepts optional references, uses the installed image generation skill for normal visual generation, calls compiler and payload validation scripts, requests permission before any Codex restart, limits automatic visual repair to two passes, and reports created/installed/active/verified separately.

- [ ] **Step 4: Test the Skill scripts and installer syntax**

Run: `node skills/codex-theme-creator/tests/prepare-theme.test.mjs && bash -n scripts/install-theme-creator.sh`

Expected: tests pass and shell syntax is valid.

- [ ] **Step 5: Commit the Skill**

```bash
git add skills/codex-theme-creator scripts/install-theme-creator.sh
git commit -m "Add Codex theme creator skill"
```

### Task 7: Flagship GT Package And Real Verification

**Files:**
- Create: `private-themes/porsche-gt3rs/source-theme.json`
- Modify: `private-themes/porsche-gt3rs/theme.json`
- Modify: `README.md`

- [ ] **Step 1: Compile and validate the private flagship package**

Run:

```bash
node engine/macos/scripts/compile-theme.mjs \
  --source private-themes/porsche-gt3rs/source-theme.json \
  --theme-dir private-themes/porsche-gt3rs \
  --output private-themes/porsche-gt3rs/theme.json
node engine/macos/scripts/injector.mjs --check-payload \
  --theme-dir private-themes/porsche-gt3rs
```

Expected: both commands succeed and the payload reports schema version 2 with `ui.profile = gt-control`.

- [ ] **Step 2: Run the complete automated suite**

Run: `engine/macos/tests/run-tests.sh`

Expected: every compiler, renderer, shell, payload, and compatibility unit test passes.

- [ ] **Step 3: Hot-install the runtime and activate the theme**

Run:

```bash
./scripts/install-enhanced-runtime.sh --hot
DEST="$HOME/Library/Application Support/CodexDreamSkinStudio/themes/private-porsche-gt3rs"
mkdir -p "$DEST"
cp private-themes/porsche-gt3rs/theme.json \
  private-themes/porsche-gt3rs/background.jpg "$DEST/"
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh --id private-porsche-gt3rs
```

Expected: installed theme files match the package and the switch command reports the expected ID. Do not restart or close Codex without explicit user permission.

- [ ] **Step 4: Probe and capture real Codex routes**

Run the compatibility probe against local CDP, capture a new-chat screenshot and an existing-task screenshot, and save them as `preview-home.png` and `preview-task.png`. Verify active ID, critical capability coverage, readable cards, readable sidebar rows, visible background, visible task text, and unobstructed composer controls.

- [ ] **Step 5: Update Chinese-first README and commit public code**

Document repository purpose, one-command installation, the prompt-based creation flow, package format, evidence states, restoration, and current macOS limitation. Keep ignored branded assets out of git.

```bash
git add README.md
git commit -m "Document prompt driven Codex theme creation"
```
