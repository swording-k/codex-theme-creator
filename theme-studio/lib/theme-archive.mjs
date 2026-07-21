import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assertThemeId, readTheme, resolveThemeDirectory } from "./theme-library.mjs";

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

function assertFlatFile(name, label) {
  if (typeof name !== "string" || !name || path.basename(name) !== name || name === "." || name === "..") {
    throw new Error(`Invalid ${label}`);
  }
  return name;
}

function run(command, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(stdout));
      else reject(new Error(Buffer.concat(stderr).toString("utf8") || `Theme package command failed: ${command}`));
    });
  });
}

function portableFilename(name) {
  const slug = String(name || "codex-theme").toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "codex-theme"}.ctheme`;
}

export async function exportThemeArchive({ themeDir }) {
  const theme = await readTheme(themeDir);
  const image = assertFlatFile(theme.image, "theme image");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-export-"));
  const archivePath = path.join(tempRoot, portableFilename(theme.name));
  try {
    await run("/usr/bin/zip", ["-q", "-j", archivePath, "theme.json", image], { cwd: themeDir });
    const data = await fs.readFile(archivePath);
    if (!data.length || data.length > MAX_ARCHIVE_BYTES) throw new Error("Theme package is too large");
    return { filename: path.basename(archivePath), data };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

export async function importThemeArchive({ archive, themesRoot }) {
  if (!Buffer.isBuffer(archive) || !archive.length || archive.length > MAX_ARCHIVE_BYTES) {
    throw new Error("Invalid theme package size");
  }
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-import-"));
  const archivePath = path.join(tempRoot, "incoming.ctheme");
  try {
    await fs.writeFile(archivePath, archive, { mode: 0o600 });
    const entries = (await run("/usr/bin/unzip", ["-Z1", archivePath])).toString("utf8")
      .split(/\r?\n/).filter(Boolean);
    if (!entries.includes("theme.json") || entries.some((entry) => path.basename(entry) !== entry)) {
      throw new Error("Invalid theme package structure");
    }
    const rawTheme = await run("/usr/bin/unzip", ["-p", archivePath, "theme.json"]);
    const parsed = JSON.parse(rawTheme.toString("utf8"));
    assertThemeId(parsed.id);
    const image = assertFlatFile(parsed.image, "theme image");
    if (entries.length !== 2 || !entries.includes(image)) throw new Error("Theme package must contain exactly theme.json and its background image");
    const imageData = await run("/usr/bin/unzip", ["-p", archivePath, image]);
    if (!imageData.length || imageData.length > MAX_IMAGE_BYTES) throw new Error("Invalid theme background image");

    let id = parsed.id;
    if (await fs.stat(resolveThemeDirectory(themesRoot, id)).catch(() => null)) {
      id = `shared-${Date.now().toString(36)}`;
    }
    const destination = resolveThemeDirectory(themesRoot, id);
    await fs.mkdir(destination, { recursive: true, mode: 0o700 });
    parsed.id = id;
    await fs.writeFile(path.join(destination, "theme.json"), `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
    await fs.writeFile(path.join(destination, image), imageData, { mode: 0o600 });
    const theme = await readTheme(destination);
    return { id, themeDir: destination, theme };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Invalid theme package JSON");
    throw error;
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}
