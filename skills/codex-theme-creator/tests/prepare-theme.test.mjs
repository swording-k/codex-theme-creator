import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { prepareTheme } from "../scripts/prepare-theme.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-theme-creator-"));
const reference = path.join(root, "reference.png");
const output = path.join(root, "midnight-circuit");

try {
  await fs.writeFile(reference, "reference");
  const result = await prepareTheme({
    name: "Midnight Circuit",
    idea: "A premium dark GT racing control room with orange timing accents.",
    outputDir: output,
    references: [reference],
  });

  assert.equal(result.themeId, "theme-midnight-circuit");
  const source = JSON.parse(await fs.readFile(path.join(output, "source-theme.json"), "utf8"));
  const provenance = JSON.parse(await fs.readFile(path.join(output, "provenance.json"), "utf8"));
  const prompt = await fs.readFile(path.join(output, "prompts", "background.md"), "utf8");

  assert.equal(source.schemaVersion, 2);
  assert.equal(source.image, "background.png");
  assert.equal(source.ui.profile, "gt-control");
  assert.deepEqual(provenance.references, [path.resolve(reference)]);
  assert.match(prompt, /premium dark GT racing control room/i);
  assert.doesNotMatch(JSON.stringify(source), /https?:\/\//i);

  const editorialOutput = path.join(root, "rose-editorial");
  await prepareTheme({
    name: "Rose Editorial",
    idea: "A romantic pink editorial theme with elegant portrait photography.",
    outputDir: editorialOutput,
  });
  assert.equal(
    JSON.parse(await fs.readFile(path.join(editorialOutput, "source-theme.json"), "utf8")).ui.profile,
    "editorial",
  );

  const glassOutput = path.join(root, "forest-glass");
  await prepareTheme({
    name: "Forest Glass",
    idea: "A calm rainy forest coding atmosphere with transparent glass surfaces.",
    outputDir: glassOutput,
  });
  assert.equal(
    JSON.parse(await fs.readFile(path.join(glassOutput, "source-theme.json"), "utf8")).ui.profile,
    "glass-studio",
  );

  console.log("PASS: theme creator prepares a contained schema-v2 workspace.");
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
