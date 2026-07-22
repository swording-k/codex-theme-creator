import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { exportThemeArchive, importThemeArchive } from "../lib/theme-archive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const archiveImplementation = await fs.readFile(path.join(here, "..", "lib", "theme-archive.mjs"), "utf8");
assert.match(archiveImplementation, /Compress-Archive/, "Windows export uses a native archive command instead of macOS-only zip");
assert.match(archiveImplementation, /Expand-Archive/, "Windows import uses a native archive command instead of macOS-only unzip");
const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-archive-"));
const themesRoot = path.join(root, "themes");
const source = path.join(repoRoot, "dream-skin", "preset-porsche-gt3rs");

try {
  const archive = await exportThemeArchive({ themeDir: source });
  assert.ok(archive.filename.endsWith(".ctheme"), "export uses the portable ctheme extension");
  assert.ok(archive.data.length > 1024, "export contains the theme configuration and artwork");

  const imported = await importThemeArchive({ archive: archive.data, themesRoot });
  assert.equal(imported.theme.name, "Porsche GT3 RS");
  await fs.access(path.join(imported.themeDir, "theme.json"));
  await fs.access(path.join(imported.themeDir, imported.theme.image));

  await assert.rejects(
    () => importThemeArchive({ archive: Buffer.from("not a zip"), themesRoot }),
    /theme package|zip|archive/i,
    "rejects malformed theme archives",
  );

  console.log("PASS: portable theme archives export and import safely.");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
