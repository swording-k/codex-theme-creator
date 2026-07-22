import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { readSelectedAvatarId, selectPet } from "../lib/pet-selection.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-pet-selection-"));
const configPath = path.join(root, "config.toml");
await fs.writeFile(configPath, [
  'model = "gpt"',
  "",
  "[desktop]",
  'selected-avatar-id = "custom:old-pet"',
  "avatar-overlay-mascot-width-px = 129",
  "",
  "[other]",
  'value = "unchanged"',
  "",
].join("\n"));

assert.equal(await readSelectedAvatarId({ configPath }), "custom:old-pet");
const result = await selectPet({ configPath, id: "mr-krabs" });
assert.equal(result.selectedAvatarId, "custom:mr-krabs");
assert.equal(await readSelectedAvatarId({ configPath }), "custom:mr-krabs");
const updated = await fs.readFile(configPath, "utf8");
assert.match(updated, /avatar-overlay-mascot-width-px = 129/, "other desktop settings are preserved");
assert.match(updated, /\[other\]\nvalue = "unchanged"/, "other config sections are preserved");

const blankConfigPath = path.join(root, "blank.toml");
await fs.writeFile(blankConfigPath, "[other]\nvalue = 1\n");
await selectPet({ configPath: blankConfigPath, id: "ace" });
assert.match(await fs.readFile(blankConfigPath, "utf8"), /\[desktop\]\nselected-avatar-id = "custom:ace"/, "creates the desktop selection when it is missing");
await assert.rejects(selectPet({ configPath, id: "../outside" }), /Invalid pet id/);

console.log("PASS: pet selection changes only the Codex desktop avatar setting.");
