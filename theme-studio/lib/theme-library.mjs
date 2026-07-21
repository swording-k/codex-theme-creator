import fs from "node:fs/promises";
import path from "node:path";

import { getPlatformConfig } from "./platform.mjs";

const THEME_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const VALID_EFFECTS = new Set(["none", "gt", "rain", "alpine"]);
export const LIVE_PREVIEW_THEME_ID = "studio-live-preview";

export const DEFAULT_THEMES_ROOT = getPlatformConfig().themesRoot;

export function assertThemeId(id) {
  if (typeof id !== "string" || !THEME_ID_RE.test(id)) {
    throw new Error(`Invalid theme id: ${id}`);
  }
  return id;
}

export function resolveThemeDirectory(root, id) {
  assertThemeId(id);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, id);
  if (resolved !== path.join(resolvedRoot, id)) {
    throw new Error(`Invalid theme id: ${id}`);
  }
  return resolved;
}

export function slugifyThemeName(name) {
  const ascii = String(name || "my-theme")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || `theme-${Date.now().toString(36)}`;
}

export function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Number(number.toFixed(3))));
}

export function normalizeStudioSettings(settings = {}) {
  const effect = VALID_EFFECTS.has(settings.motionEffect) ? settings.motionEffect : "none";
  return {
    accent: HEX_RE.test(String(settings.accent || "")) ? String(settings.accent).toLowerCase() : null,
    backgroundBlur: clampNumber(settings.backgroundBlur, 0, 24, 0),
    backgroundDim: clampNumber(settings.backgroundDim, 0, 0.75, 0.18),
    homeOpacity: clampNumber(settings.homeOpacity, 0, 1, 0.5),
    taskOpacity: clampNumber(settings.taskOpacity, 0, 1, 0.84),
    motionEffect: effect,
    motionIntensity: clampNumber(settings.motionIntensity, 0, 1, 0.5),
    rain: Boolean(settings.rain),
    telemetry: Boolean(settings.telemetry),
    signalLights: Boolean(settings.signalLights),
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readTheme(themeDir) {
  const theme = await readJson(path.join(themeDir, "theme.json"));
  assertThemeId(theme.id);
  return theme;
}

function summarizeTheme(theme, themeDir, source) {
  const home = theme.ui?.routes?.home || {};
  const task = theme.ui?.routes?.task || {};
  const settings = {
    accent: theme.colors?.accent || "#6aa7ff",
    backgroundBlur: theme.studio?.effects?.backgroundBlur ?? 0,
    backgroundDim: theme.studio?.effects?.backgroundDim ?? 0.18,
    homeOpacity: typeof home.opacity === "number" ? home.opacity : 0.5,
    taskOpacity: typeof task.opacity === "number" ? task.opacity : 0.84,
    motionEffect: theme.motion?.profile === "gt-broadcast" ? "gt"
      : theme.motion?.profile === "rainforest" ? "rain"
        : theme.motion?.profile === "alpine" ? "alpine" : "none",
    motionIntensity: typeof theme.motion?.intensity === "number" ? theme.motion.intensity : 0.5,
    rain: Boolean(theme.motion?.rain),
    telemetry: Boolean(theme.motion?.telemetry),
    signalLights: Boolean(theme.motion?.signalLights),
  };
  return {
    id: theme.id,
    name: theme.name || theme.id,
    source,
    appearance: theme.appearance || "auto",
    profile: theme.ui?.profile || "basic",
    tagline: theme.tagline || "",
    accent: theme.colors?.accent || "#6aa7ff",
    image: theme.image || null,
    themeDir,
    studio: Boolean(theme.studio),
    effects: theme.studio?.effects || null,
    settings,
  };
}

function canonicalThemeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\bremix\b/g, "")
    .replace(/\bmacbook\b/g, "")
    .replace(/\bmy\s+(?:custom|tuned|tuning)\b/g, "")
    .replace(/我的调校|我的定制|自定义调校/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "")
    .trim();
}

function isLocalPresetDuplicate(theme, presetKeys) {
  if (theme.source !== "local") return false;
  if (!/^(private|studio|quick)-/.test(theme.id)) return false;
  return presetKeys.has(canonicalThemeName(theme.name));
}

async function readThemeSummaries(root, source) {
  if (!(await pathExists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const summaries = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === LIVE_PREVIEW_THEME_ID) continue;
    if (source === "preset" && !entry.name.startsWith("preset-")) continue;
    if (source === "local" && entry.name.startsWith("preset-")) continue;
    if (!THEME_ID_RE.test(entry.name)) continue;
    const themeDir = path.join(root, entry.name);
    try {
      const theme = await readTheme(themeDir);
      summaries.push(summarizeTheme(theme, themeDir, source));
    } catch {
      // Ignore incomplete theme folders so the studio stays usable.
    }
  }
  return summaries;
}

export async function discoverThemes({ repoRoot, themesRoot = DEFAULT_THEMES_ROOT }) {
  const presets = await readThemeSummaries(path.join(repoRoot, "dream-skin"), "preset");
  const installed = await readThemeSummaries(themesRoot, "local");
  const presetKeys = new Set(presets.map((theme) => canonicalThemeName(theme.name)).filter(Boolean));
  const byId = new Map();
  for (const theme of [...presets, ...installed]) {
    if (isLocalPresetDuplicate(theme, presetKeys)) continue;
    byId.set(theme.id, theme);
  }
  return [...byId.values()].sort((a, b) => {
    const sourceWeight = { local: 0, preset: 1 };
    return (sourceWeight[a.source] ?? 5) - (sourceWeight[b.source] ?? 5) ||
      a.name.localeCompare(b.name, "zh-Hans-CN");
  });
}

function buildMotion(settings) {
  if (settings.motionEffect === "gt") {
    return {
      profile: "gt-broadcast",
      intensity: settings.motionIntensity,
      rain: settings.rain,
      telemetry: settings.telemetry,
      signalLights: settings.signalLights,
    };
  }
  if (settings.motionEffect === "rain") {
    return {
      profile: "rainforest",
      intensity: settings.motionIntensity,
      rain: true,
      telemetry: false,
      signalLights: false,
    };
  }
  if (settings.motionEffect === "alpine") {
    return {
      profile: "alpine",
      intensity: settings.motionIntensity,
      rain: false,
      telemetry: false,
      signalLights: false,
    };
  }
  return undefined;
}

export function buildCustomizedTheme(baseTheme, { id, name, settings }) {
  const normalized = normalizeStudioSettings(settings);
  const theme = structuredClone(baseTheme);
  theme.id = assertThemeId(id);
  theme.name = String(name || "My Codex Theme").slice(0, 80);
  theme.colors = { ...(theme.colors || {}) };
  if (normalized.accent) {
    theme.colors.accent = normalized.accent;
    theme.colors.accentAlt = normalized.accent;
  }
  theme.ui = { ...(theme.ui || {}) };
  theme.ui.routes = { ...(theme.ui.routes || {}) };
  theme.ui.routes.home = { ...(theme.ui.routes.home || {}), opacity: normalized.homeOpacity };
  theme.ui.routes.task = { ...(theme.ui.routes.task || {}), opacity: normalized.taskOpacity };
  const motion = buildMotion(normalized);
  if (motion) theme.motion = motion;
  else delete theme.motion;
  theme.studio = {
    version: 1,
    baseThemeId: baseTheme.id,
    effects: {
      backgroundBlur: normalized.backgroundBlur,
      backgroundDim: normalized.backgroundDim,
    },
    settings: normalized,
  };
  return theme;
}

export async function createStudioTheme({ baseThemeDir, themesRoot = DEFAULT_THEMES_ROOT, name, settings }) {
  const baseTheme = await readTheme(baseThemeDir);
  const id = `studio-${slugifyThemeName(name)}-${Date.now().toString(36)}`;
  const themeDir = resolveThemeDirectory(themesRoot, id);
  await fs.mkdir(themeDir, { recursive: true });
  const theme = buildCustomizedTheme(baseTheme, { id, name, settings });
  if (!theme.image) throw new Error("Base theme does not declare an image");
  const sourceImage = path.join(baseThemeDir, theme.image);
  await fs.copyFile(sourceImage, path.join(themeDir, theme.image));
  await fs.writeFile(path.join(themeDir, "theme.json"), `${JSON.stringify(theme, null, 2)}\n`);
  return { id, themeDir, theme };
}

export async function ensureQuickTheme({ baseThemeDir, themesRoot = DEFAULT_THEMES_ROOT }) {
  const baseTheme = await readTheme(baseThemeDir);
  const id = `quick-${baseTheme.id}`;
  const themeDir = resolveThemeDirectory(themesRoot, id);
  await fs.mkdir(themeDir, { recursive: true });
  const theme = structuredClone(baseTheme);
  theme.id = id;
  theme.studio = { ...(theme.studio || {}), version: 1, quickPreset: true, baseThemeId: baseTheme.id };
  if (!theme.image) throw new Error("Base theme does not declare an image");
  await fs.copyFile(path.join(baseThemeDir, theme.image), path.join(themeDir, theme.image));
  await fs.writeFile(path.join(themeDir, "theme.json"), `${JSON.stringify(theme, null, 2)}\n`);
  return { id, themeDir, theme };
}

async function writeThemeFromBase({ baseThemeDir, themesRoot, id, name, settings, temporary = false }) {
  const baseTheme = await readTheme(baseThemeDir);
  const themeDir = resolveThemeDirectory(themesRoot, id);
  await fs.mkdir(themeDir, { recursive: true });
  const theme = buildCustomizedTheme(baseTheme, { id, name, settings });
  if (!theme.image) throw new Error("Base theme does not declare an image");
  if (temporary) theme.studio.temporary = true;
  const sourceImage = path.join(baseThemeDir, theme.image);
  await fs.copyFile(sourceImage, path.join(themeDir, theme.image));
  await fs.writeFile(path.join(themeDir, "theme.json"), `${JSON.stringify(theme, null, 2)}\n`);
  return { id, themeDir, theme };
}

export async function createLivePreviewTheme({
  baseThemeDir,
  themesRoot = DEFAULT_THEMES_ROOT,
  name = "Theme Studio Live Preview",
  settings,
}) {
  return writeThemeFromBase({
    baseThemeDir,
    themesRoot,
    id: LIVE_PREVIEW_THEME_ID,
    name,
    settings,
    temporary: true,
  });
}

export async function updateStudioTheme({ themeDir, name, settings }) {
  const current = await readTheme(themeDir);
  const theme = buildCustomizedTheme(current, { id: current.id, name: name || current.name, settings });
  theme.image = current.image;
  await fs.writeFile(path.join(themeDir, "theme.json"), `${JSON.stringify(theme, null, 2)}\n`);
  return { id: current.id, themeDir, theme };
}

export function themeAssetPath(theme, kind = "background") {
  const file = kind === "background" ? theme.image : "preview.png";
  if (!file || path.basename(file) !== file) throw new Error("Invalid theme asset");
  return path.join(theme.themeDir, file);
}
