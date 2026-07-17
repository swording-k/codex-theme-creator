import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const expected = new Map([
  ["preset-apex-pit", "gt-control"],
  ["preset-iron-discipline", "gt-control"],
  ["preset-rainforest-focus", "glass-studio"],
  ["preset-alpine-lake-desk", "glass-studio"],
]);

for (const [id, profile] of expected) {
  const themePath = path.join(repo, "dream-skin", id, "theme.json");
  const theme = JSON.parse(await fs.readFile(themePath, "utf8"));
  assert.equal(theme.schemaVersion, 2, `${id} should use schema v2`);
  assert.equal(theme.ui?.profile, profile, `${id} should use ${profile}`);
  assert.ok(theme.ui?.routes?.home, `${id} should define the New Chat surface`);
  assert.ok(theme.ui?.routes?.task, `${id} should define the task surface`);
  assert.ok(Array.isArray(theme.decorations), `${id} should declare safe decorations`);
}

console.log("PASS: public presets demonstrate complete schema-v2 UI profiles.");
