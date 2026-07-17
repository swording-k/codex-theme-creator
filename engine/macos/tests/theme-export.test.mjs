import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { exportTheme } from "../../../scripts/export-theme.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const macosRoot = path.resolve(here, "..");
const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-export-"));
const themeDir = path.join(root, "theme-export-fixture");
const outputDir = path.join(root, "release");

try {
  await fs.mkdir(themeDir);
  await fs.copyFile(
    path.join(macosRoot, "assets", "portal-hero.png"),
    path.join(themeDir, "background.png"),
  );
  await fs.writeFile(path.join(themeDir, "theme.json"), JSON.stringify({
    schemaVersion: 2,
    id: "theme-export-fixture",
    name: "Export Fixture",
    image: "background.png",
    ui: { profile: "gt-control" },
  }));
  await fs.writeFile(path.join(themeDir, "source-theme.json"), "{}\n");
  await fs.writeFile(path.join(themeDir, "provenance.json"), JSON.stringify({
    schemaVersion: 1,
    references: ["/Users/example/private/reference.png"],
    assets: { "background.png": { source: "generated" } },
  }));
  await fs.copyFile(path.join(macosRoot, "assets", "portal-hero.png"), path.join(themeDir, "preview-home.png"));
  await fs.copyFile(path.join(macosRoot, "assets", "portal-hero.png"), path.join(themeDir, "preview-task.png"));
  await fs.writeFile(path.join(themeDir, "secret.txt"), "must not ship");

  const result = await exportTheme(themeDir, outputDir);
  const entries = execFileSync("/usr/bin/unzip", ["-Z1", result.archive], { encoding: "utf8" });
  assert.match(entries, /theme-export-fixture\/theme\.json/);
  assert.match(entries, /theme-export-fixture\/background\.png/);
  assert.match(entries, /theme-export-fixture\/preview-home\.png/);
  assert.match(entries, /theme-export-fixture\/preview-task\.png/);
  assert.match(entries, /theme-export-fixture\/README\.md/);
  assert.doesNotMatch(entries, /secret\.txt/);
  assert.doesNotMatch(entries, /__MACOSX|\/\._/, "release ZIP should not contain macOS metadata");

  const unpacked = path.join(root, "unpacked");
  await fs.mkdir(unpacked);
  execFileSync("/usr/bin/unzip", ["-q", result.archive, "-d", unpacked]);
  const provenance = await fs.readFile(
    path.join(unpacked, "theme-export-fixture", "provenance.json"),
    "utf8",
  );
  assert.doesNotMatch(provenance, /\/Users\/example\/private/);
  assert.match(provenance, /reference\.png/);

  console.log("PASS: theme export includes the portable allowlist and removes private paths.");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
