import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const OPTIONAL_FILES = [
  "source-theme.json",
  "provenance.json",
  "preview-home.png",
  "preview-task.png",
  "README.md",
];

function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

async function copyContained(sourceRoot, name, destination) {
  const requested = path.join(sourceRoot, name);
  const canonical = await fs.realpath(requested);
  if (!contained(sourceRoot, canonical)) throw new Error(`${name} must stay inside the theme directory`);
  const stat = await fs.stat(canonical);
  if (!stat.isFile()) throw new Error(`${name} must be a regular file`);
  await fs.copyFile(canonical, destination);
}

function sanitizePrivatePaths(value) {
  if (Array.isArray(value)) return value.map(sanitizePrivatePaths);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizePrivatePaths(child)]));
  }
  if (typeof value === "string" && path.isAbsolute(value)) return path.basename(value);
  return value;
}

function generatedReadme(theme) {
  return `# ${theme.name || theme.id}\n\nA complete macOS Codex Desktop theme created with Codex Theme Creator.\n\n> Unofficial project. This theme is not produced or endorsed by OpenAI.\n\n## Install\n\n\`\`\`bash\nDEST="$HOME/Library/Application Support/CodexDreamSkinStudio/themes/${theme.id}"\nmkdir -p "$DEST"\ncp theme.json ${theme.image} "$DEST/"\n~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh --id ${theme.id}\n\`\`\`\n\nReview preview screenshots before publishing because they may contain local project names.\n`;
}

export async function exportTheme(themeDirectory, outputDirectory) {
  const sourceRoot = await fs.realpath(path.resolve(themeDirectory));
  const theme = JSON.parse(await fs.readFile(path.join(sourceRoot, "theme.json"), "utf8"));
  if (![1, 2].includes(theme.schemaVersion) || typeof theme.image !== "string") {
    throw new Error("theme.json has an unsupported schema or image field");
  }
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(theme.id || "")) throw new Error("theme id is not portable");
  if (path.basename(theme.image) !== theme.image || !/\.(?:png|jpe?g|webp)$/i.test(theme.image)) {
    throw new Error("theme image must be a contained PNG, JPEG, or WebP filename");
  }

  const outputRoot = path.resolve(outputDirectory);
  await fs.mkdir(outputRoot, { recursive: true });
  const archive = path.join(outputRoot, `${theme.id}.zip`);
  if (await fs.stat(archive).catch(() => null)) throw new Error(`archive already exists: ${archive}`);

  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-package-"));
  const packageRoot = path.join(temporary, theme.id);
  await fs.mkdir(packageRoot);
  try {
    await copyContained(sourceRoot, "theme.json", path.join(packageRoot, "theme.json"));
    await copyContained(sourceRoot, theme.image, path.join(packageRoot, theme.image));
    for (const name of OPTIONAL_FILES) {
      const source = path.join(sourceRoot, name);
      if (!(await fs.stat(source).catch(() => null))) continue;
      if (name === "provenance.json") {
        const raw = JSON.parse(await fs.readFile(source, "utf8"));
        await fs.writeFile(
          path.join(packageRoot, name),
          `${JSON.stringify(sanitizePrivatePaths(raw), null, 2)}\n`,
          { mode: 0o600 },
        );
      } else {
        await copyContained(sourceRoot, name, path.join(packageRoot, name));
      }
    }
    if (!(await fs.stat(path.join(packageRoot, "README.md")).catch(() => null))) {
      await fs.writeFile(path.join(packageRoot, "README.md"), generatedReadme(theme), { mode: 0o600 });
    }
    execFileSync("/usr/bin/ditto", [
      "-c", "-k", "--keepParent",
      "--norsrc", "--noextattr", "--noqtn", "--noacl",
      packageRoot, archive,
    ]);
    return { archive, themeId: theme.id };
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

function valueFor(args, name) {
  const index = args.indexOf(`--${name}`);
  if (index < 0 || !args[index + 1]) throw new Error(`Missing --${name}`);
  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  console.log(JSON.stringify(await exportTheme(
    valueFor(args, "theme-dir"),
    valueFor(args, "output-dir"),
  ), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
