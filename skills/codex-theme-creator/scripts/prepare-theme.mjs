import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function cleanText(value, label, maxLength) {
  if (typeof value !== "string" || /\p{Cc}|\u2028|\u2029/u.test(value)) {
    throw new Error(`${label} must be single-line text`);
  }
  const result = value.trim();
  if (!result || Array.from(result).length > maxLength) {
    throw new Error(`${label} must contain 1 to ${maxLength} characters`);
  }
  return result;
}

function slugify(value) {
  const slug = value.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `custom-${Date.now()}`;
}

async function validateReferences(values) {
  const references = [];
  for (const value of values ?? []) {
    if (typeof value !== "string" || /^https?:\/\//i.test(value)) {
      throw new Error("references must be local image paths");
    }
    const file = path.resolve(value);
    if (!/\.(?:png|jpe?g|webp)$/i.test(file)) throw new Error(`unsupported reference image: ${file}`);
    const stat = await fs.stat(file).catch(() => null);
    if (!stat?.isFile()) throw new Error(`reference image not found: ${file}`);
    references.push(file);
  }
  return references;
}

export async function prepareTheme({ name, idea, outputDir, references = [] }) {
  const themeName = cleanText(name, "name", 80);
  const themeIdea = cleanText(idea, "idea", 500);
  const destination = path.resolve(outputDir);
  const existing = await fs.stat(destination).catch(() => null);
  if (existing) throw new Error(`output directory already exists: ${destination}`);
  const localReferences = await validateReferences(references);
  const slug = slugify(themeName);
  const themeId = `theme-${slug}`;

  await fs.mkdir(path.join(destination, "prompts"), { recursive: true, mode: 0o700 });
  const source = {
    schemaVersion: 2,
    id: themeId,
    name: themeName,
    brandSubtitle: "CODEX THEME CREATOR",
    tagline: themeIdea,
    projectPrefix: "PROJECT · ",
    projectLabel: "SELECT PROJECT",
    statusText: "SYSTEM / READY",
    quote: "FOCUS. BUILD. SHIP.",
    image: "background.png",
    appearance: "dark",
    colors: {
      background: "#080b0e",
      panel: "#15191e",
      panelAlt: "#20262d",
      accent: "#f15a24",
      accentAlt: "#ff8753",
      secondary: "#60b7c8",
      highlight: "#f6c85f",
      text: "#f4f6f8",
      muted: "#a8afb8",
      line: "rgba(241, 90, 36, .30)"
    },
    art: { safeArea: "left", taskMode: "ambient", focusX: 0.76, focusY: 0.5 },
    ui: {
      profile: "gt-control",
      density: "compact",
      radius: 6,
      routes: {
        home: { surface: "smoked", opacity: 0.54 },
        task: { surface: "glass-readable", opacity: 0.86 }
      }
    },
    decorations: [
      { type: "masthead", slot: "home-top", text: themeName, interactive: false },
      { type: "status-strip", slot: "home-bottom", text: "SYSTEM STATUS / READY", interactive: false }
    ]
  };
  const provenance = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    idea: themeIdea,
    references: localReferences,
    assets: { "background.png": { source: "pending-generation" } }
  };
  const prompt = `Create one standalone 2560x1440 Codex Desktop background.\n\nTheme idea: ${themeIdea}\n\nKeep the left 52 percent calm and low contrast for readable native UI. Place the primary subject between 62 and 88 percent of the width. The lower center must remain quiet behind the composer. Generate only an opaque edge-to-edge scene: no application UI, panels, buttons, readable text, watermarks, or screenshots.\n`;

  await Promise.all([
    fs.writeFile(path.join(destination, "source-theme.json"), `${JSON.stringify(source, null, 2)}\n`, { mode: 0o600, flag: "wx" }),
    fs.writeFile(path.join(destination, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`, { mode: 0o600, flag: "wx" }),
    fs.writeFile(path.join(destination, "prompts", "background.md"), prompt, { mode: 0o600, flag: "wx" })
  ]);
  return { themeId, outputDir: destination };
}

function valuesFor(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === `--${name}` && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

function valueFor(args, name) {
  const value = valuesFor(args, name)[0];
  if (!value) throw new Error(`Missing --${name}`);
  return value;
}

async function main() {
  const args = process.argv.slice(2);
  const result = await prepareTheme({
    name: valueFor(args, "name"),
    idea: valueFor(args, "idea"),
    outputDir: valueFor(args, "output-dir"),
    references: valuesFor(args, "reference")
  });
  console.log(JSON.stringify(result));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
