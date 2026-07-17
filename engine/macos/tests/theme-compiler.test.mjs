import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { compileTheme } from "../scripts/compile-theme.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "dream-theme-compiler-"));

try {
  await fs.writeFile(path.join(root, "background.jpg"), "image");

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
