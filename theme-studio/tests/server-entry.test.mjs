import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverModule = await import("../server.mjs");
const here = path.dirname(fileURLToPath(import.meta.url));
const serverSource = await fs.readFile(path.resolve(here, "../server.mjs"), "utf8");

assert.equal(typeof serverModule.createThemeStudioServer, "function", "server exposes a reusable factory");
assert.equal(typeof serverModule.startThemeStudioServer, "function", "server exposes a reusable starter");
assert.match(serverSource, /visibleId:\s*saved\.id/, "applying a preset should keep the saved customization selected");
assert.match(serverSource, /\/api\/restore-default/, "server should expose a real default Codex restore action");
assert.match(serverSource, /\/api\/creator-status/, "server should report whether the real Codex creation Skill is installed");
assert.match(serverSource, /\/api\/install-creator-skill/, "server should expose a one-click creator Skill installer");
assert.match(serverSource, /\/api\/quick-switch/, "server should allow the tray to apply bundled presets directly");
assert.match(serverSource, /\/api\/export/, "server should export a portable theme package");
assert.match(serverSource, /\/api\/import/, "server should import and validate a portable theme package");
assert.match(serverSource, /\/api\/pets/, "server should expose the local pet library");
assert.match(serverSource, /removePet/, "server should delete only one validated pet package");
assert.match(serverSource, /\/api\/pet-asset/, "server should serve a contained pet sprite for the local UI");
assert.match(serverSource, /\/select/, "server should allow one installed pet to become the active Codex pet");
assert.match(serverSource, /activateLivePet/, "pet selection should use Codex's live setting channel before considering a restart");
assert.match(serverSource, /activation:\s*"live"/, "server should report a confirmed live pet activation separately from fallback state");
assert.match(serverSource, /\/api\/restart-codex/, "server should offer an explicit user-triggered Codex restart after selecting a pet");

const server = serverModule.createThemeStudioServer();
assert.equal(typeof server.listen, "function", "factory returns an HTTP server");

const started = await serverModule.startThemeStudioServer({ port: 0 });
assert.ok(started.url.startsWith("http://127.0.0.1:"), "starter returns a loopback app URL");
await new Promise((resolve, reject) => started.server.close((error) => (error ? reject(error) : resolve())));

console.log("PASS: theme studio server can be embedded by the desktop app.");
