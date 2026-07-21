import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LIVE_PREVIEW_THEME_ID,
  createStudioTheme,
  createLivePreviewTheme,
  discoverThemes,
  normalizeStudioSettings,
  resolveThemeDirectory,
  updateStudioTheme,
} from "../lib/theme-library.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-studio-"));
const themesRoot = path.join(tmpRoot, "themes");
await fs.mkdir(themesRoot, { recursive: true });
const legacyPresetDir = path.join(themesRoot, "preset-old-local-background");
await fs.mkdir(legacyPresetDir, { recursive: true });
await fs.copyFile(
  path.join(repoRoot, "dream-skin", "preset-porsche-gt3rs", "background.jpg"),
  path.join(legacyPresetDir, "background.jpg"),
);
await fs.writeFile(path.join(legacyPresetDir, "theme.json"), `${JSON.stringify({
  id: "preset-old-local-background",
  name: "Old local preset",
  image: "background.jpg",
}, null, 2)}\n`);
const duplicateStudioDir = path.join(themesRoot, "studio-porsche-gt3-rs-remix");
await fs.mkdir(duplicateStudioDir, { recursive: true });
await fs.copyFile(
  path.join(repoRoot, "dream-skin", "preset-porsche-gt3rs", "background.jpg"),
  path.join(duplicateStudioDir, "background.jpg"),
);
await fs.writeFile(path.join(duplicateStudioDir, "theme.json"), `${JSON.stringify({
  id: "studio-porsche-gt3-rs-remix",
  name: "Porsche GT3 RS Remix",
  image: "background.jpg",
  studio: { version: 1, settings: { backgroundBlur: 8 } },
}, null, 2)}\n`);
const savedCustomizationDir = path.join(themesRoot, "studio-porsche-gt3-rs-custom");
await fs.mkdir(savedCustomizationDir, { recursive: true });
await fs.copyFile(
  path.join(repoRoot, "dream-skin", "preset-porsche-gt3rs", "background.jpg"),
  path.join(savedCustomizationDir, "background.jpg"),
);
await fs.writeFile(path.join(savedCustomizationDir, "theme.json"), `${JSON.stringify({
  id: "studio-porsche-gt3-rs-custom",
  name: "Porsche GT3 RS Custom",
  image: "background.jpg",
  studio: { version: 1, settings: { backgroundBlur: 8 } },
}, null, 2)}\n`);
const duplicateChineseCustomizationDir = path.join(themesRoot, "studio-alpine-lake-tuned");
await fs.mkdir(duplicateChineseCustomizationDir, { recursive: true });
await fs.copyFile(
  path.join(repoRoot, "dream-skin", "preset-alpine-lake-desk", "background.jpg"),
  path.join(duplicateChineseCustomizationDir, "background.jpg"),
);
await fs.writeFile(path.join(duplicateChineseCustomizationDir, "theme.json"), `${JSON.stringify({
  id: "studio-alpine-lake-tuned",
  name: "雪湖工作台 我的调校",
  image: "background.jpg",
  studio: { version: 1, baseThemeId: "preset-alpine-lake-desk", settings: { backgroundBlur: 8 } },
}, null, 2)}\n`);

const themes = await discoverThemes({ repoRoot, themesRoot });
assert.ok(
  themes.some((theme) => theme.id === "preset-porsche-gt3rs" && theme.source === "preset"),
  "discovers bundled Porsche GT3 RS preset",
);
assert.ok(
  themes.some((theme) => theme.id === "preset-rainforest-focus" && theme.profile === "glass-studio"),
  "keeps preset UI profile in theme summary",
);
assert.equal(
  themes.find((theme) => theme.id === "preset-rainforest-focus")?.appearance,
  "dark",
  "rainforest preset uses a dark readable shell instead of a white wash over the artwork",
);
assert.equal(
  themes.find((theme) => theme.id === "preset-alpine-lake-desk")?.appearance,
  "dark",
  "alpine preset uses the same readable shell policy",
);
assert.equal(
  themes.some((theme) => theme.id === "preset-old-local-background"),
  false,
  "hides legacy installed preset backgrounds from the personal library",
);
assert.equal(
  themes.some((theme) => theme.id === "studio-porsche-gt3-rs-remix"),
  false,
  "hides local remix duplicates when a curated preset already represents the same theme",
);
assert.equal(
  themes.some((theme) => theme.id === "studio-alpine-lake-tuned"),
  false,
  "hides historical Chinese named tuning copies when the curated preset already represents the same theme",
);
assert.ok(
  themes.some((theme) => theme.id === "studio-porsche-gt3-rs-custom"),
  "keeps a saved Studio customization visible when it has its own name",
);

assert.throws(
  () => resolveThemeDirectory(themesRoot, "../escape"),
  /Invalid theme id/,
  "rejects traversal-like theme ids",
);

const normalized = normalizeStudioSettings({
  accent: "#12abef",
  backgroundBlur: 99,
  backgroundDim: -1,
  homeOpacity: 3,
  taskOpacity: -4,
  motionEffect: "gt",
  motionIntensity: 8,
  rain: true,
  telemetry: true,
  signalLights: true,
});
assert.equal(normalized.backgroundBlur, 24, "clamps blur");
assert.equal(normalized.backgroundDim, 0, "clamps dim");
assert.equal(normalized.homeOpacity, 1, "clamps home opacity");
assert.equal(normalized.taskOpacity, 0, "clamps task opacity");
assert.equal(normalized.motionIntensity, 1, "clamps motion intensity");
assert.equal(normalized.accent, "#12abef", "accepts valid accent color");

const created = await createStudioTheme({
  baseThemeDir: path.join(repoRoot, "dream-skin", "preset-porsche-gt3rs"),
  themesRoot,
  name: "My GT Night",
  settings: {
    accent: "#2ad4ff",
    backgroundBlur: 9,
    backgroundDim: 0.36,
    homeOpacity: 0.46,
    taskOpacity: 0.91,
    motionEffect: "gt",
    motionIntensity: 0.72,
    rain: true,
    telemetry: true,
    signalLights: true,
  },
});
const written = JSON.parse(await fs.readFile(path.join(created.themeDir, "theme.json"), "utf8"));
assert.equal(written.name, "My GT Night");
assert.equal(written.ui.routes.home.opacity, 0.46);
assert.equal(written.ui.routes.task.opacity, 0.91);
assert.equal(written.colors.accent, "#2ad4ff");
assert.equal(written.motion.profile, "gt-broadcast");
assert.equal(written.motion.rain, true);
assert.equal(written.motion.telemetry, true);
assert.equal(written.studio.effects.backgroundBlur, 9);
assert.equal(written.studio.effects.backgroundDim, 0.36);
await fs.access(path.join(created.themeDir, written.image));

const preview = await createLivePreviewTheme({
  baseThemeDir: path.join(repoRoot, "dream-skin", "preset-rainforest-focus"),
  themesRoot,
  name: "Live slider preview",
  settings: {
    accent: "#44aa66",
    backgroundBlur: 12,
    backgroundDim: 0.42,
    homeOpacity: 0.35,
    taskOpacity: 0.74,
    motionEffect: "rain",
    motionIntensity: 0.8,
  },
});
assert.equal(preview.id, LIVE_PREVIEW_THEME_ID, "live preview uses one stable temporary id");
assert.equal(preview.theme.studio.temporary, true, "live preview is marked temporary");
assert.equal(preview.theme.studio.effects.backgroundBlur, 12);
await fs.access(path.join(preview.themeDir, preview.theme.image));
const visibleAfterPreview = await discoverThemes({ repoRoot, themesRoot });
assert.equal(
  visibleAfterPreview.some((theme) => theme.id === LIVE_PREVIEW_THEME_ID),
  false,
  "live preview should not clutter the visible theme list",
);

const updated = await updateStudioTheme({
  themeDir: created.themeDir,
  name: "My GT Night Tuned",
  settings: {
    accent: "#ffcc00",
    backgroundBlur: 2,
    backgroundDim: 0.1,
    homeOpacity: 0.62,
    taskOpacity: 0.78,
    motionEffect: "rain",
    motionIntensity: 0.33,
  },
});
assert.equal(updated.theme.id, created.id, "updates keep the existing local theme id");
assert.equal(updated.theme.name, "My GT Night Tuned");
assert.equal(updated.theme.colors.accent, "#ffcc00");
assert.equal(updated.theme.motion.profile, "rainforest");
assert.equal(updated.theme.motion.intensity, 0.33);
const rewritten = JSON.parse(await fs.readFile(path.join(created.themeDir, "theme.json"), "utf8"));
assert.equal(rewritten.ui.routes.home.opacity, 0.62);
assert.equal(rewritten.studio.effects.backgroundBlur, 2);

console.log("PASS: theme studio library creates safe customized local themes.");
