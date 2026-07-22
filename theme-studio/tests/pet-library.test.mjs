import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { discoverPets, removePet } from "../lib/pet-library.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-pet-library-"));
const petsRoot = path.join(root, "pets");
await fs.mkdir(petsRoot, { recursive: true });

async function writePet(id, manifest) {
  const dir = path.join(petsRoot, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "pet.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(dir, "spritesheet.webp"), "sprite");
  return dir;
}

await writePet("codex-buddy", {
  id: "codex-buddy",
  displayName: "Codex Buddy",
  description: "A local coding companion.",
  spriteVersionNumber: 2,
  spritesheetPath: "spritesheet.webp",
});
await writePet("broken", {
  id: "broken",
  displayName: "Broken",
  spritesheetPath: "../outside.webp",
});
await writePet("mismatch", {
  id: "not-the-folder",
  displayName: "Mismatch",
  spritesheetPath: "spritesheet.webp",
});

const pets = await discoverPets({ petsRoot });
assert.deepEqual(pets.map((pet) => pet.id), ["codex-buddy"], "discovers only contained, valid pet packages");
assert.equal(pets[0].displayName, "Codex Buddy");
assert.equal(pets[0].spriteVersionNumber, 2);

await removePet({ petsRoot, id: "codex-buddy" });
await assert.rejects(fs.access(path.join(petsRoot, "codex-buddy")), /ENOENT/, "removes only the requested pet package");
await fs.access(path.join(petsRoot, "broken", "pet.json"));
await assert.rejects(removePet({ petsRoot, id: "../pets" }), /Invalid pet id/, "rejects traversal-like pet ids");

console.log("PASS: pet library discovers valid packages and deletes only a contained pet.");
