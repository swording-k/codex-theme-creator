import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { compileTheme } from "../scripts/compile-theme.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const macosRoot = path.resolve(here, "..");
const root = await fs.mkdtemp(path.join(os.tmpdir(), "dream-theme-compiler-"));

try {
  await fs.copyFile(
    path.join(macosRoot, "presets", "preset-midnight-aurora", "background.jpg"),
    path.join(root, "background.jpg"),
  );

  const source = {
    schemaVersion: 2,
    id: "private-porsche-gt3rs",
    name: "Porsche GT3 RS",
    image: "background.jpg",
    appearance: "dark",
    colors: {
      background: "#080b0e",
      panel: "#15191e",
      text: "#f4f6f8",
      muted: "#a8afb8",
      accent: "#f15a24",
    },
    ui: {
      profile: "gt-control",
      density: "compact",
      radius: 6,
      routes: {
        home: { surface: "smoked", opacity: 0.54 },
        task: { surface: "glass-readable", opacity: 0.86 },
      },
    },
    decorations: [
      {
        type: "status-strip",
        slot: "home-bottom",
        text: "TRACK STATUS / READY",
        interactive: false,
      },
    ],
  };

  const compiled = await compileTheme(source, root);
  assert.equal(compiled.schemaVersion, 2);
  assert.equal(compiled.ui.profile, "gt-control");
  assert.equal(compiled.ui.routes.task.surface, "glass-readable");
  assert.equal(compiled.decorations[0].interactive, false);
  await fs.writeFile(path.join(root, "theme.json"), `${JSON.stringify(compiled, null, 2)}\n`);
  const payload = JSON.parse(execFileSync(process.execPath, [
    path.join(macosRoot, "scripts", "injector.mjs"),
    "--check-payload",
    "--theme-dir",
    root,
  ], { encoding: "utf8" }));
  assert.equal(payload.schemaVersion, 2);
  assert.equal(payload.ui.profile, "gt-control");
  assert.equal(payload.decorations[0].type, "status-strip");
  assert.equal(
    (await compileTheme({ ...source, ui: { ...source.ui, profile: "glass-studio" } }, root)).ui.profile,
    "glass-studio",
  );
  assert.equal(
    (await compileTheme({ ...source, ui: { ...source.ui, profile: "editorial" } }, root)).ui.profile,
    "editorial",
  );

  await assert.rejects(
    () => compileTheme({ ...source, ui: { ...source.ui, profile: "raw-css" } }, root),
    /unsupported ui profile/,
  );

  await assert.rejects(
    () => compileTheme({
      ...source,
      decorations: [{ ...source.decorations[0], interactive: true }],
    }, root),
    /interactive decorations are forbidden/,
  );

  await assert.rejects(
    () => compileTheme({ ...source, image: "../outside.jpg" }, root),
    /asset must be a filename inside the theme directory/,
  );

  console.log("theme compiler tests passed");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
