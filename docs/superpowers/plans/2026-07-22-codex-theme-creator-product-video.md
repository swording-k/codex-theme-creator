# Codex Theme Creator Product Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render and visually verify a 36.2-second 1920×1080 Codex Theme Creator product video built from real local product imagery and the Ink Press motion template.

**Architecture:** Keep the video isolated under `video/codex-theme-creator-promo/`. Capture the real local Theme Studio and reuse repository-owned theme artwork as deterministic raster assets, then adapt the template composition into focused scene components driven by one timeline. Render stills throughout, render the full MP4, extract a contact sheet, and run an independent visual review before final delivery.

**Tech Stack:** Remotion 4, React 19, TypeScript, Playwright/Chromium capture, ffmpeg/ffprobe, Node.js.

---

### Task 1: Scaffold the isolated Remotion project

**Files:**
- Create: `video/codex-theme-creator-promo/package.json`
- Create: `video/codex-theme-creator-promo/package-lock.json`
- Create: `video/codex-theme-creator-promo/remotion.config.ts`
- Create: `video/codex-theme-creator-promo/tsconfig.json`
- Create: `video/codex-theme-creator-promo/src/index.ts`
- Create: `video/codex-theme-creator-promo/src/Root.tsx`
- Create: `video/codex-theme-creator-promo/public/audio/*`

- [ ] **Step 1: Copy the accepted template into the isolated directory**

Copy the template source, licensed audio, configuration, lockfile, and package manifest without its internal research-tool textures or rendered reference movie.

- [ ] **Step 2: Rename the composition and package**

Use composition id `CodexThemeCreatorPromo`, 1085 frames, 30fps, 1920×1080. Set scripts to:

```json
{
  "dev": "remotion studio src/index.ts",
  "render": "remotion render src/index.ts CodexThemeCreatorPromo out/codex-theme-creator-promo.mp4",
  "still": "remotion still src/index.ts CodexThemeCreatorPromo"
}
```

- [ ] **Step 3: Install locked dependencies**

Run: `npm ci`

Expected: exit code 0 and a local `node_modules/` directory.

- [ ] **Step 4: Verify the composition is discoverable**

Run: `npx remotion compositions src/index.ts`

Expected: one `CodexThemeCreatorPromo` composition at 1920×1080, 30fps, 1085 frames.

### Task 2: Capture real product assets

**Files:**
- Create: `video/codex-theme-creator-promo/scripts/capture.mjs`
- Create: `video/codex-theme-creator-promo/public/textures/studio-full.png`
- Create: `video/codex-theme-creator-promo/public/textures/studio-create.png`
- Create: `video/codex-theme-creator-promo/public/textures/studio-library.png`
- Create: `video/codex-theme-creator-promo/public/textures/site-full.png`
- Create: `video/codex-theme-creator-promo/public/textures/themes/*.png`
- Create: `video/codex-theme-creator-promo/src/video/layout.json`

- [ ] **Step 1: Start the real Theme Studio and static website locally**

Run the existing launch path and confirm both endpoints return HTTP 200. Do not alter product state or use private user-created themes.

- [ ] **Step 2: Write deterministic capture configuration**

The capture script must set viewport 1440×900, device scale factor 2, wait for fonts/images, disable CSS animation, and save bounding boxes for the sidebar, library, preview, controls, create panel, and restore action.

- [ ] **Step 3: Capture product pages and repository-owned themes**

Use only built-in demo data and the repository assets under `media/promo/`. Copy Porsche GT3 RS, Alpine Lake Desk, and Rainforest Focus images into the video project.

- [ ] **Step 4: Validate raster dimensions**

Run `sips -g pixelWidth -g pixelHeight` on all captures.

Expected: full-page captures are at least 2880×1800 and theme artwork is at least 1920×1080.

### Task 3: Build the product-native visual system and scenes

**Files:**
- Create: `video/codex-theme-creator-promo/src/video/tokens.ts`
- Create: `video/codex-theme-creator-promo/src/video/Main.tsx`
- Create: `video/codex-theme-creator-promo/src/video/PageCam.tsx`
- Create: `video/codex-theme-creator-promo/src/video/TitleCard.tsx`
- Create: `video/codex-theme-creator-promo/src/video/Caption.tsx`
- Create: `video/codex-theme-creator-promo/src/video/FlashCut.tsx`
- Create: `video/codex-theme-creator-promo/src/video/scenes/OpenScene.tsx`
- Create: `video/codex-theme-creator-promo/src/video/scenes/LibraryScene.tsx`
- Create: `video/codex-theme-creator-promo/src/video/scenes/ControlsScene.tsx`
- Create: `video/codex-theme-creator-promo/src/video/scenes/CreateScene.tsx`
- Create: `video/codex-theme-creator-promo/src/video/scenes/ShareScene.tsx`
- Create: `video/codex-theme-creator-promo/src/video/scenes/OutroScene.tsx`

- [ ] **Step 1: Encode product tokens**

Define `#0b0d10` background, `#151a20`/`#202832` surfaces, `#f3f6f8` text, `#9ba7b2` muted text, `#e05a2a` primary accent, and `#55b6ff` secondary accent. Use the product system sans-serif stack.

- [ ] **Step 2: Adapt the template camera and common components**

Preserve accepted interpolation curves, hold durations, flash timing, and layout-level zoom behavior. Replace the paper/serif skin with dark glass and low-gloss metal.

- [ ] **Step 3: Implement the six functional scenes**

Use the approved timeline: brand/open, library, controls, create, share/restore, and group-photo outro. Each scene must have exactly one dominant motion idea and must use real captured textures.

- [ ] **Step 4: Wire the single-source timeline**

Declare all scene ranges, captions, flash cuts, and SFX frame pins in `Main.tsx`. Do not call `Date.now()` or `Math.random()`.

- [ ] **Step 5: Type-check and list compositions**

Run: `npx tsc --noEmit && npx remotion compositions src/index.ts`

Expected: both commands exit 0 and the composition metadata matches Task 1.

### Task 4: Render and refine representative stills

**Files:**
- Create: `video/codex-theme-creator-promo/out/qa/f*.png`

- [ ] **Step 1: Render three stills per functional scene**

Render entry, action peak, and settled frames for frames 60/150/205, 300/380/450, 485/525/555, 640/680/715, 795/835/875, and 965/1015/1065.

- [ ] **Step 2: Inspect all stills visually**

Check product legibility, texture sharpness, title safe area, contrast, real-slot alignment, and breathing holds. Record any defects by frame number.

- [ ] **Step 3: Correct defects and rerender affected stills**

Expected: no clipped text, unreadable controls, accidental blank frames, or unmasked research-template assets remain.

### Task 5: Render the full video and verify the file

**Files:**
- Create: `video/codex-theme-creator-promo/out/codex-theme-creator-promo.mp4`
- Create: `video/codex-theme-creator-promo/out/codex-theme-creator-promo-muted.mp4`
- Create: `video/codex-theme-creator-promo/out/qa/contact-sheet.png`

- [ ] **Step 1: Render the full composition**

Run: `npm run render`

Expected: exit code 0 and a playable H.264 MP4.

- [ ] **Step 2: Probe duration and streams**

Run: `ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height,r_frame_rate -of json out/codex-theme-creator-promo.mp4`

Expected: duration approximately 36.17 seconds, H.264 video at 1920×1080/30fps, and an audio stream.

- [ ] **Step 3: Produce website assets**

Create a muted copy for autoplay and an evenly sampled contact sheet using ffmpeg. Preserve the mastered main video unchanged.

### Task 6: Independent visual review and final correction

**Files:**
- Create: `video/codex-theme-creator-promo/out/qa/review.md`

- [ ] **Step 1: Dispatch a clean-context reviewer**

Give the reviewer only the rendered video, contact sheet, approved design, and aesthetic rules. Require findings with exact frame numbers and severity.

- [ ] **Step 2: Fix all blocking and high-severity findings**

Rerender affected stills and the full composition, then repeat ffprobe checks.

- [ ] **Step 3: Run repository and video checks**

Run:

```bash
node theme-studio/tests/platform.test.mjs
node theme-studio/tests/ui-contract.test.mjs
node engine/windows/tests/runtime-contract.test.mjs
node skills/codex-theme-creator/tests/skill-contract.test.mjs
node desktop-app/tests/desktop-entry.test.mjs
node site/site-contract.test.mjs
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 4: Deliver exact proof states**

Report the absolute MP4 path, duration, dimensions, audio presence, contact sheet, and review report. State that the video is rendered and verified locally but not published to GitHub or Douyin.
