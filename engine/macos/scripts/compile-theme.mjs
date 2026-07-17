import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const UI_PROFILES = new Set(["native", "gt-control"]);
const SURFACES = new Set(["transparent", "smoked", "glass-readable", "solid-readable"]);
const DECORATION_TYPES = new Set(["masthead", "status-strip", "corner-frame"]);
const DECORATION_SLOTS = new Set(["home-top", "home-bottom", "shell-corners"]);
const DENSITIES = new Set(["comfortable", "compact"]);

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
}

function text(value, label, maxLength) {
  if (typeof value !== "string" || /\p{Cc}|\u2028|\u2029/u.test(value)) {
    throw new Error(`${label} must be single-line text`);
  }
  const normalized = value.trim();
  if (!normalized || Array.from(normalized).length > maxLength) {
    throw new Error(`${label} must contain 1 to ${maxLength} characters`);
  }
  return normalized;
}

function choice(value, label, choices) {
  if (!choices.has(value)) throw new Error(`unsupported ${label}: ${value}`);
  return value;
}

function opacity(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be a number from 0 to 1`);
  }
  return value;
}

function assetFilename(value) {
  if (
    typeof value !== "string"
    || value !== path.basename(value)
    || !/\.(?:png|jpe?g|webp)$/i.test(value)
  ) {
    throw new Error("asset must be a filename inside the theme directory");
  }
  return value;
}

function colors(value = {}) {
  const source = plainObject(value, "colors");
  const result = {};
  for (const [key, color] of Object.entries(source)) {
    if (!/^(?:#[0-9a-f]{6}|rgba?\([\d\s.,%]+\))$/i.test(color)) {
      throw new Error(`colors.${key} must be a six-digit hex or rgba color`);
    }
    result[key] = color;
  }
  return result;
}

function route(value, label, fallbackSurface, fallbackOpacity) {
  const source = plainObject(value ?? {}, label);
  return {
    surface: choice(source.surface ?? fallbackSurface, `${label} surface`, SURFACES),
    opacity: opacity(source.opacity ?? fallbackOpacity, `${label} opacity`),
  };
}

function ui(value = {}) {
  const source = plainObject(value, "ui");
  const routes = plainObject(source.routes ?? {}, "ui.routes");
  const radius = source.radius ?? 6;
  if (!Number.isInteger(radius) || radius < 0 || radius > 12) {
    throw new Error("ui.radius must be an integer from 0 to 12");
  }
  return {
    profile: choice(source.profile ?? "native", "ui profile", UI_PROFILES),
    density: choice(source.density ?? "comfortable", "ui density", DENSITIES),
    radius,
    routes: {
      home: route(routes.home, "ui.routes.home", "smoked", 0.58),
      task: route(routes.task, "ui.routes.task", "glass-readable", 0.88),
    },
  };
}

function decorations(value = []) {
  if (!Array.isArray(value) || value.length > 3) {
    throw new Error("decorations must contain at most three entries");
  }
  return value.map((entry, index) => {
    const source = plainObject(entry, `decorations[${index}]`);
    if (source.interactive !== false) throw new Error("interactive decorations are forbidden");
    return {
      type: choice(source.type, "decoration type", DECORATION_TYPES),
      slot: choice(source.slot, "decoration slot", DECORATION_SLOTS),
      text: text(source.text, `decorations[${index}].text`, 80),
      interactive: false,
    };
  });
}

export async function compileTheme(sourceValue, themeDirectory) {
  const source = plainObject(sourceValue, "theme source");
  if (source.schemaVersion !== 2) throw new Error("theme source schemaVersion must be 2");
  const image = assetFilename(source.image);
  const themeDir = path.resolve(themeDirectory);
  const imagePath = path.resolve(themeDir, image);
  if (path.dirname(imagePath) !== themeDir) {
    throw new Error("asset must be a filename inside the theme directory");
  }
  const stat = await fs.stat(imagePath).catch(() => null);
  if (!stat?.isFile() || stat.size < 1 || stat.size > 16 * 1024 * 1024) {
    throw new Error("theme image must be a non-empty local file no larger than 16 MB");
  }

  return {
    schemaVersion: 2,
    id: text(source.id, "id", 80),
    name: text(source.name, "name", 80),
    brandSubtitle: text(source.brandSubtitle ?? "CODEX THEME CREATOR", "brandSubtitle", 80),
    tagline: text(source.tagline ?? "A complete Codex interface theme.", "tagline", 160),
    projectPrefix: text(source.projectPrefix ?? "Project · ", "projectPrefix", 40),
    projectLabel: text(source.projectLabel ?? "Select project", "projectLabel", 40),
    statusText: text(source.statusText ?? "THEME ONLINE", "statusText", 80),
    quote: text(source.quote ?? "MAKE SOMETHING WONDERFUL", "quote", 80),
    image,
    appearance: choice(source.appearance ?? "auto", "appearance", new Set(["auto", "light", "dark"])),
    colors: colors(source.colors),
    art: plainObject(source.art ?? {}, "art"),
    ui: ui(source.ui),
    decorations: decorations(source.decorations),
    ...(source.motion ? { motion: plainObject(source.motion, "motion") } : {}),
  };
}

function argument(args, name) {
  const index = args.indexOf(`--${name}`);
  if (index < 0 || !args[index + 1]) throw new Error(`Missing --${name}`);
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const sourcePath = path.resolve(argument(args, "source"));
  const themeDir = path.resolve(argument(args, "theme-dir"));
  const outputPath = path.resolve(argument(args, "output"));
  const compiled = await compileTheme(JSON.parse(await fs.readFile(sourcePath, "utf8")), themeDir);
  await fs.writeFile(outputPath, `${JSON.stringify(compiled, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ pass: true, themeId: compiled.id, output: outputPath }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
