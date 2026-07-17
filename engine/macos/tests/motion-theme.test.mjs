import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "dream-motion-theme-"));

try {
  await fs.copyFile(
    path.join(root, "presets", "preset-midnight-aurora", "background.jpg"),
    path.join(temporary, "background.jpg"),
  );
  await fs.writeFile(path.join(temporary, "theme.json"), `${JSON.stringify({
    schemaVersion: 1,
    id: "motion-contract",
    name: "Motion Contract",
    image: "background.jpg",
    motion: {
      profile: "gt-broadcast",
      intensity: 0.65,
      rain: true,
      signalLights: true,
      telemetry: true,
    },
  }, null, 2)}\n`);

  const output = execFileSync(process.execPath, [
    path.join(root, "scripts", "injector.mjs"),
    "--check-payload",
    "--theme-dir",
    temporary,
  ], { encoding: "utf8" });
  const result = JSON.parse(output);
  assert.deepEqual(result.motion, {
    profile: "gt-broadcast",
    intensity: 0.65,
    rain: true,
    signalLights: true,
    telemetry: true,
  });
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}

console.log("PASS: injector validates and preserves motion theme configuration.");
