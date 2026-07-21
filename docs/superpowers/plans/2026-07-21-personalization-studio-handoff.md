# Codex Personalization Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Codex Theme Creator into a trustworthy local personalization manager for Codex themes first, then pets, with verifiable creation, portable sharing, and a manually tested macOS beta.

**Architecture:** Keep the Electron shell deliberately thin. `theme-studio/` owns the local HTTP API, package validation, theme library, and UI. Add a parallel `pets/` adapter rather than mixing pet files into the theme schema; both modules share the app shell, tray, package import/export patterns, health reporting, and release process.

**Tech Stack:** Electron 31, Node.js ESM, native macOS `zip`/`unzip`, Codex CDP runtime, static Node assertion tests, GitHub Releases and Pages.

---

## Product Contract

### What a theme is

A theme is a local package. The installed source of truth is:

```text
~/Library/Application Support/CodexDreamSkinStudio/themes/<theme-id>/
  theme.json
  background.jpg|png|webp
```

The portable form is a `.ctheme` ZIP archive. It must not contain chats, code, absolute paths, executable files, remote URLs, or arbitrary JavaScript.

### What the App does

The App is not an image model. It:

1. Installs and health-checks `Codex Theme Creator Skill`.
2. Gives Codex a constrained task that requires the Skill to create and validate a package.
3. Watches the local theme library for completed packages.
4. Lets the user preview, tune, enable, export, import, and share packages.

The user still sends the creative request in Codex. There is no official external API for a companion app to submit a Codex message on the user's behalf.

### What a pet is

A pet remains a separate installed package:

```text
~/.codex/pets/<pet-id>/
  pet.json
  spritesheet.webp
```

The manager may list, validate, install, remove, import, and export pets. It must not silently overwrite existing pets or modify Codex itself.

### Non-negotiable release rules

- Do not claim Windows one-click application until a Windows runtime passes real Codex verification.
- Do not publish a test DMG or replace a public Release until the user manually approves the exact tested build.
- Do not use the official ChatGPT/OpenAI logo as this App's product mark. Use a distinct AI-conversation + theme motif and label the App as unofficial.
- Do not use branded or copyrighted user-generated artwork as a bundled public preset without rights confirmation.

## Current State at Handoff

Implemented and tested on `main` through commit `e5bb5ca` plus uncommitted icon work:

- Electron macOS shell, app icon, tray, local theme library, default reset, preset quick switch.
- `Codex Theme Creator Skill` installer and App health status endpoint.
- Creator prompt explicitly calls the installed Skill and names the local theme library.
- `.ctheme` export/import API with ZIP shape, flat-file, ID, image name, and size checks.
- Local static tests: `theme-library`, `theme-archive`, `server-entry`, `ui-contract`, `desktop-entry`.
- GitHub Pages product site is deployed, but the release is deliberately a draft until manual QA approval.

Known gaps:

- No real end-to-end proof in the packaged App that a Codex-created package appeared in the library.
- Current sliders need a strict audit; only retain controls with verified Codex impact.
- Tray icon/menu requires visual QA from a packaged `.app`, not the Electron dev host.
- Import/export has no metadata manifest, preview image, content hash, or author/license disclosure.
- Pet management is not yet part of this repository or UI.
- Windows has no Codex application runtime.

## File Map

| Area | Existing files | Ownership |
| --- | --- | --- |
| Electron wrapper and tray | `desktop-app/main.mjs`, `desktop-app/build/` | native shell, tray, app identity |
| Theme UI | `theme-studio/public/index.html`, `app.js`, `styles.css` | library UX and user actions |
| Theme HTTP API | `theme-studio/server.mjs` | local-only API and file operations |
| Theme model | `theme-studio/lib/theme-library.mjs` | installed package data and settings |
| Theme sharing | `theme-studio/lib/theme-archive.mjs` | `.ctheme` validation/import/export |
| Theme creation workflow | `skills/codex-theme-creator/`, `scripts/install-theme-creator.sh` | Codex Skill and install contract |
| macOS runtime | `engine/macos/` | injection, compatibility probe, restore |
| Pet source contract | `/Users/baojian/Desktop/codex-pet/pets/` | existing pet collection; do not modify from this repo without an explicit cross-repo task |
| Product site | `site/`, `.github/workflows/deploy-site.yml` | marketing/site deployment |

---

### Task 1: Freeze and verify the theme package contract

**Files:**
- Modify: `theme-studio/lib/theme-archive.mjs`
- Modify: `theme-studio/tests/theme-archive.test.mjs`
- Create: `docs/THEME_PACKAGE_FORMAT.md`

- [ ] **Step 1: Write failing tests for a manifest-bearing package and backward compatibility**

```js
assert.equal(manifest.format, "codex-theme");
assert.equal(manifest.version, 1);
assert.equal(manifest.theme.id, imported.theme.id);
assert.equal(await importThemeArchive({ archive: legacyArchive, themesRoot }), legacyTheme.id);
await assert.rejects(() => importThemeArchive({ archive: archiveWithExtraFile, themesRoot }), /unexpected file/i);
```

- [ ] **Step 2: Run the test before implementation**

Run: `node theme-studio/tests/theme-archive.test.mjs`

Expected: FAIL because `manifest.json` is absent and legacy handling is not implemented.

- [ ] **Step 3: Add a flat, versioned manifest**

Write `manifest.json` during export with exactly:

```json
{
  "format": "codex-theme",
  "version": 1,
  "theme": { "id": "...", "name": "...", "image": "background.jpg" },
  "author": null,
  "license": null,
  "createdAt": "ISO-8601"
}
```

Accept legacy two-file archives only when they have exactly `theme.json` and its declared image. Accept v1 archives only when their manifest, `theme.json`, and declared image agree. Reject extra files, folders, symlinks, duplicate entries, remote URLs, files over the existing size limit, and mismatched IDs.

- [ ] **Step 4: Document the public contract**

In `docs/THEME_PACKAGE_FORMAT.md`, document the installed folder, `.ctheme` ZIP entries, supported image formats, package-size limit, manifest fields, privacy rule, versioning rule, and no-executable-content rule.

- [ ] **Step 5: Run tests**

Run: `node theme-studio/tests/theme-archive.test.mjs`

Expected: `PASS: portable theme archives export and import safely.`

- [ ] **Step 6: Commit**

```bash
git add theme-studio/lib/theme-archive.mjs theme-studio/tests/theme-archive.test.mjs docs/THEME_PACKAGE_FORMAT.md
git commit -m "Define versioned theme package format"
```

### Task 2: Make the Creator Skill loop observable and testable

**Files:**
- Modify: `theme-studio/server.mjs`
- Modify: `theme-studio/public/app.js`
- Modify: `theme-studio/public/index.html`
- Create: `theme-studio/lib/creator-health.mjs`
- Create: `theme-studio/tests/creator-health.test.mjs`
- Modify: `theme-studio/tests/server-entry.test.mjs`
- Modify: `theme-studio/tests/ui-contract.test.mjs`

- [ ] **Step 1: Write a creator health unit test**

```js
const health = await getCreatorHealth({ codexHome, themesRoot, now });
assert.equal(health.ready, true);
assert.equal(health.skillInstalled, true);
assert.equal(health.engineInstalled, true);
assert.equal(health.lastCreatedThemeId, "theme-rainy-forest");
assert.equal(health.lastCreatedAt, "2026-07-21T00:00:00.000Z");
```

- [ ] **Step 2: Run the test before implementation**

Run: `node theme-studio/tests/creator-health.test.mjs`

Expected: FAIL because `getCreatorHealth` does not exist.

- [ ] **Step 3: Implement a read-only health model**

`getCreatorHealth()` must check the exact Skill file, the creator engine, the macOS runtime availability, and scan only completed theme folders for the newest valid `theme.json`. It must return one of `not-installed`, `ready`, `created-not-active`, or `verified` based on real local evidence, never a guessed success state.

- [ ] **Step 4: Add a visible creation state, not feature marketing copy**

The sidebar should show one compact status row, such as `创作助手已就绪` or `等待 Codex 写入主题包`. The create button copies a prompt that includes the current local library path and explicitly says `use the installed Codex Theme Creator Skill`. Poll `/api/creator-status` every 10 seconds only while the window is visible; retain the selected card on refresh.

- [ ] **Step 5: Add an integration fixture**

Create a valid temporary theme folder in the test root, call the API status endpoint, then assert `lastCreatedThemeId`. Do not invoke Codex or the injector in this test.

- [ ] **Step 6: Run tests and commit**

```bash
node theme-studio/tests/creator-health.test.mjs
node theme-studio/tests/server-entry.test.mjs
node theme-studio/tests/ui-contract.test.mjs
git add theme-studio
git commit -m "Show verified creator workflow state"
```

### Task 3: Audit every adjustment and remove no-op controls

**Files:**
- Modify: `theme-studio/public/index.html`
- Modify: `theme-studio/public/app.js`
- Modify: `theme-studio/public/styles.css`
- Modify: `theme-studio/lib/theme-library.mjs`
- Modify: `theme-studio/tests/ui-contract.test.mjs`
- Modify: `engine/macos/tests/ui-theme.test.mjs`

- [ ] **Step 1: Build a control-to-CSS mapping table in a test**

```js
const controls = {
  accent: ["--dream-accent"],
  backgroundBlur: ["--dream-background-blur"],
  backgroundDim: ["--dream-background-dim"],
};
for (const [control, cssVariables] of Object.entries(controls)) {
  assert.ok(cssVariables.every((variable) => css.includes(variable)), `${control} reaches injected CSS`);
}
```

- [ ] **Step 2: Run the test before implementation**

Run: `node engine/macos/tests/ui-theme.test.mjs`

Expected: FAIL for any setting that exists in the App but cannot reach injected CSS.

- [ ] **Step 3: Retain only controls with a verified end-to-end effect**

Keep `accent`, `background blur`, and `background dim` only if each changes a narrow, stable CSS custom property in `dream-skin.css`. Remove recommendation-card opacity and task-panel opacity if those selectors are version-sensitive or have no visible effect. Do not replace removed controls with decorative effects.

- [ ] **Step 4: Add a reset action**

Add `恢复此主题原始调校` for the selected theme. It clears only that theme's App draft from `localStorage`; it does not delete the installed package.

- [ ] **Step 5: Real manual QA**

For Porsche, Rainforest, and Alpine themes: save each setting, switch to Codex, inspect New Chat and an existing task, then reopen the App and assert selection plus setting values persist.

- [ ] **Step 6: Run tests and commit**

```bash
node theme-studio/tests/theme-library.test.mjs
node theme-studio/tests/ui-contract.test.mjs
node engine/macos/tests/ui-theme.test.mjs
git add theme-studio engine/macos
git commit -m "Keep only verified theme adjustments"
```

### Task 4: Finish the menu bar controller and product icon QA

**Files:**
- Modify: `desktop-app/main.mjs`
- Modify: `desktop-app/build/icon.svg`
- Regenerate: `desktop-app/build/icon.icns`
- Modify: `desktop-app/tests/desktop-entry.test.mjs`

- [ ] **Step 1: Add a menu-model unit test**

Extract `buildTrayTemplate({ themes, activeThemeId })` from `main.mjs` and test:

```js
assert.equal(template[1].label, "恢复 Codex 默认外观");
assert.equal(quickSwitch.submenu.length, 5);
assert.ok(quickSwitch.submenu.some((item) => item.label === "Porsche GT3 RS"));
assert.ok(quickSwitch.submenu.some((item) => item.label === "星穹观测站"));
```

- [ ] **Step 2: Run the test before implementation**

Run: `npm test --prefix desktop-app`

Expected: FAIL because the menu builder is not exported or does not list every available theme.

- [ ] **Step 3: Implement menu behavior**

List every visible bundled and local theme, not only local entries. A preset click must use `/api/quick-switch`; a saved package click must use the same endpoint. Include `恢复 Codex 默认外观`, `打开主题管理器`, and `退出`.

- [ ] **Step 4: Product mark rule**

Use a distinct mark built from an AI conversation motif plus a four-color theme badge. Do not copy the official ChatGPT/OpenAI mark. Generate one macOS template mark from the same geometry and do not set a text title such as `CTC`.

- [ ] **Step 5: Packaged visual QA**

Run `npm run dist`, open `dist/mac-arm64/Codex Theme Creator.app`, and capture a real screenshot of the menu bar. Verify the icon appears without text, opens the app on click, and lists all available themes.

- [ ] **Step 6: Commit**

```bash
git add desktop-app
git commit -m "Finish menu bar theme controller"
```

### Task 5: Add the Pets module without coupling it to themes

**Files:**
- Create: `theme-studio/lib/pet-library.mjs`
- Create: `theme-studio/lib/pet-archive.mjs`
- Create: `theme-studio/tests/pet-library.test.mjs`
- Create: `theme-studio/tests/pet-archive.test.mjs`
- Modify: `theme-studio/server.mjs`
- Modify: `theme-studio/public/index.html`
- Modify: `theme-studio/public/app.js`
- Modify: `theme-studio/public/styles.css`
- Modify: `desktop-app/main.mjs`

- [ ] **Step 1: Write pet library tests against fixture directories**

```js
const pets = await discoverPets({ petsRoot });
assert.deepEqual(pets.map((pet) => pet.id), ["codex-buddy", "luffy"]);
assert.equal(pets[0].atlasVersion, 2);
await assert.rejects(() => readPet(invalidPetDir), /spriteVersionNumber/i);
```

- [ ] **Step 2: Run before implementation**

Run: `node theme-studio/tests/pet-library.test.mjs`

Expected: FAIL because the pet library module does not exist.

- [ ] **Step 3: Implement only the local package adapter**

Use `~/.codex/pets` as the macOS source of truth. Require `pet.json` and `spritesheet.webp`; accept only V2 atlases (`spriteVersionNumber: 2`). Reuse the documented `codex-pet` package contract but do not import that repository's copyrighted preset assets into this public repository.

- [ ] **Step 4: Add Pet import/export**

Define `.cpet` as a ZIP of `pet.json` and `spritesheet.webp`. Reject traversal, unexpected files, invalid IDs, non-V2 metadata, and files over a defined limit. Never overwrite a pet: on ID collision import as `shared-<timestamp>`.

- [ ] **Step 5: Add a second App tab, not a nested card**

Use top-level segmented navigation: `主题` and `桌宠`. The Pets view shows cards with contact sheet or spritesheet preview, name, installed state, import/export, and a `需要重启 Codex` notice after any change. Do not claim live pet switching if Codex only reads pets on startup.

- [ ] **Step 6: Add tray support**

Add `桌宠` submenu listing installed pets and an `打开桌宠管理` item. The menu action opens the App to the Pets tab; it must not pretend to activate a pet live.

- [ ] **Step 7: Run tests and commit**

```bash
node theme-studio/tests/pet-library.test.mjs
node theme-studio/tests/pet-archive.test.mjs
npm test --prefix desktop-app
git add theme-studio desktop-app
git commit -m "Add local Codex pet manager"
```

### Task 6: Create one real user acceptance path

**Files:**
- Create: `docs/MANUAL_BETA_QA.zh-CN.md`
- Modify: `README.md`
- Modify: `docs/MACOS_RELEASE.md`

- [ ] **Step 1: Write the exact 12-step QA script**

The script must cover: install DMG; menu-bar icon visible; open App; verify creator status; copy prompt; complete one original non-branded theme through Codex; return to App and observe auto-discovery; apply it; inspect New Chat plus existing task; export `.ctheme`; import it after removing the local copy; restore native Codex; confirm no chat composer or document panel disappears.

- [ ] **Step 2: Add proof slots**

Every step has `expected result`, `actual result`, `screenshot path`, and `pass/fail`. The tester must use real Codex screenshots, not generated mockups.

- [ ] **Step 3: Build the test DMG only after all automated tests pass**

```bash
node theme-studio/tests/theme-library.test.mjs
node theme-studio/tests/theme-archive.test.mjs
node theme-studio/tests/pet-library.test.mjs
node theme-studio/tests/pet-archive.test.mjs
node engine/macos/tests/ui-theme.test.mjs
npm test --prefix desktop-app
npm run dist --prefix desktop-app
```

- [ ] **Step 4: Copy the exact tested file to the user's Desktop**

```bash
cp "desktop-app/dist/Codex-Theme-Creator-<version>-arm64.dmg" \
  "/Users/baojian/Desktop/Codex Theme Creator Beta <version>.dmg"
```

- [ ] **Step 5: Commit**

```bash
git add docs README.md
git commit -m "Add manual beta acceptance checklist"
```

### Task 7: Do not implement Windows before a real runtime spike

**Files:**
- Create: `docs/WINDOWS_RUNTIME_SPIKE.md`
- Create: `theme-studio/tests/platform-contract.test.mjs`
- Modify later only after proof: `theme-studio/lib/platform.mjs`, `desktop-app/package.json`

- [ ] **Step 1: Write a platform-contract test**

```js
const windows = getPlatformConfig({ platform: "win32", home: "C:\\Users\\Demo", env: {} });
assert.equal(windows.canEditThemes, true);
assert.equal(windows.canSwitch, false);
assert.match(windows.switchUnavailableReason, /运行时/);
```

- [ ] **Step 2: Document the spike acceptance test**

`WINDOWS_RUNTIME_SPIKE.md` must require a real Windows Codex instance, an approved startup/debug mechanism, a theme apply/restore proof, New Chat plus existing task screenshots, no process patching, and a rollback. If any criterion fails, Windows stays editor/import/export-only.

- [ ] **Step 3: Do not add a Windows download button**

Only after the spike passes may an agent add `electron-builder --win nsis`, code signing, and a Windows release asset.

### Task 8: Public release only after user acceptance

**Files:**
- Modify: `scripts/publish-macos-beta.sh`
- Modify: `docs/MACOS_RELEASE.md`
- Modify: `site/index.html`

- [ ] **Step 1: Gate release publication on QA evidence**

The release script should refuse a public release when `docs/beta-evidence/<version>.json` is absent or `approved` is not `true`.

```json
{
  "version": "0.2.0-beta.1",
  "approved": true,
  "testedAt": "ISO-8601",
  "tester": "user",
  "evidence": ["absolute screenshot paths or release-safe copies"]
}
```

- [ ] **Step 2: Keep the GitHub Release as a draft until approved**

Upload the DMG only to a draft Release. Publish it and enable the website's download CTA only after the user has confirmed the Desktop QA path.

- [ ] **Step 3: Commit**

```bash
git add scripts/publish-macos-beta.sh docs/MACOS_RELEASE.md site/index.html
git commit -m "Gate public release on beta approval"
```

## Handoff Order

1. Task 1 and Task 2 together: package contract and observable creator loop.
2. Task 3 and Task 4 together: App trust and usability.
3. Task 5: pets integration, in a separate worktree because it is a new subsystem.
4. Task 6: user acceptance build.
5. Task 7 can be researched in parallel but cannot change the release scope.
6. Task 8 only after the user approves the tested DMG.

## Final Verification Command Set

```bash
node theme-studio/tests/theme-library.test.mjs
node theme-studio/tests/theme-archive.test.mjs
node theme-studio/tests/creator-health.test.mjs
node theme-studio/tests/pet-library.test.mjs
node theme-studio/tests/pet-archive.test.mjs
node theme-studio/tests/server-entry.test.mjs
node theme-studio/tests/ui-contract.test.mjs
node engine/macos/tests/ui-theme.test.mjs
npm test --prefix desktop-app
```

No agent may call the product ready until these tests, the manual QA checklist, and the user's direct DMG test have all passed.
