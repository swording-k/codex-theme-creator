import fs from "node:fs/promises";
import path from "node:path";

const PET_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

function assertPetId(id) {
  if (typeof id !== "string" || !PET_ID_RE.test(id)) throw new Error("Invalid pet id");
  return id;
}

function desktopSectionRange(text) {
  const section = /^\[desktop\]\s*$/m.exec(text);
  if (!section) return null;
  const start = section.index + section[0].length;
  const nextSection = /^\[[^\]]+\]\s*$/gm;
  nextSection.lastIndex = start;
  const next = nextSection.exec(text);
  return { start, end: next ? next.index : text.length };
}

export async function readSelectedAvatarId({ configPath }) {
  const text = await fs.readFile(configPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const range = desktopSectionRange(text);
  if (!range) return null;
  const entry = /^selected-avatar-id\s*=\s*"([^"]*)"\s*$/m.exec(text.slice(range.start, range.end));
  return entry?.[1] || null;
}

export async function selectPet({ configPath, id }) {
  const selectedAvatarId = `custom:${assertPetId(id)}`;
  const original = await fs.readFile(configPath, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const range = desktopSectionRange(original);
  let updated;
  if (!range) {
    const suffix = original && !original.endsWith("\n") ? "\n" : "";
    updated = `${original}${suffix}${original ? "\n" : ""}[desktop]\nselected-avatar-id = "${selectedAvatarId}"\n`;
  } else {
    const before = original.slice(0, range.start);
    const section = original.slice(range.start, range.end);
    const after = original.slice(range.end);
    const line = `selected-avatar-id = "${selectedAvatarId}"`;
    const nextSection = /^selected-avatar-id\s*=\s*"[^"]*"\s*$/m.test(section)
      ? section.replace(/^selected-avatar-id\s*=\s*"[^"]*"\s*$/m, line)
      : `${section.endsWith("\n") || !section ? section : `${section}\n`}${line}\n`;
    updated = `${before}${nextSection}${after}`;
  }
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, updated, "utf8");
  return { selectedAvatarId };
}
