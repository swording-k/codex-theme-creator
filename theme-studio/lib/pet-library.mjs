import fs from "node:fs/promises";
import path from "node:path";

const PET_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

function assertPetId(id) {
  if (typeof id !== "string" || !PET_ID_RE.test(id)) {
    throw new Error("Invalid pet id");
  }
  return id;
}

function resolvePetDirectory(petsRoot, id) {
  const root = path.resolve(petsRoot);
  const directory = path.resolve(root, assertPetId(id));
  if (directory !== path.join(root, id)) throw new Error("Invalid pet id");
  return directory;
}

async function readPet(directory, expectedId) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, "pet.json"), "utf8"));
  if (manifest?.id !== expectedId || typeof manifest.displayName !== "string" || !manifest.displayName.trim()) {
    throw new Error("Invalid pet manifest");
  }
  const spritesheetPath = manifest.spritesheetPath;
  if (typeof spritesheetPath !== "string" || !spritesheetPath || path.basename(spritesheetPath) !== spritesheetPath) {
    throw new Error("Invalid pet spritesheet path");
  }
  const sprite = path.resolve(directory, spritesheetPath);
  if (path.dirname(sprite) !== directory) throw new Error("Invalid pet spritesheet path");
  await fs.access(sprite);
  return {
    id: expectedId,
    displayName: manifest.displayName.trim().slice(0, 80),
    description: typeof manifest.description === "string" ? manifest.description.trim().slice(0, 240) : "",
    spriteVersionNumber: Number.isInteger(manifest.spriteVersionNumber) ? manifest.spriteVersionNumber : null,
    spritesheetPath,
    petDir: directory,
  };
}

export async function findPet({ petsRoot, id }) {
  const root = path.resolve(petsRoot);
  return readPet(resolvePetDirectory(root, id), id);
}

export async function discoverPets({ petsRoot }) {
  const root = path.resolve(petsRoot);
  const entries = await fs.readdir(root, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const pets = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !PET_ID_RE.test(entry.name)) continue;
    try {
      pets.push(await readPet(resolvePetDirectory(root, entry.name), entry.name));
    } catch {
      // Incomplete packages are ignored; the Studio must remain usable.
    }
  }
  return pets.sort((left, right) => left.displayName.localeCompare(right.displayName, "zh-Hans-CN"));
}

export async function removePet({ petsRoot, id }) {
  const pet = await findPet({ petsRoot, id });
  await fs.rm(pet.petDir, { recursive: true, force: false });
}
