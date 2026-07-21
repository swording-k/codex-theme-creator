import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const packageJson = JSON.parse(await fs.readFile(path.join(appRoot, "package.json"), "utf8"));
const main = await fs.readFile(path.join(appRoot, "main.mjs"), "utf8");
const repoRoot = path.resolve(appRoot, "..");

assert.equal(packageJson.name, "codex-theme-creator-app");
assert.equal(packageJson.main, "main.mjs");
assert.ok(packageJson.scripts.start.includes("electron"), "desktop app can be launched with npm start");
assert.ok(packageJson.scripts.dist, "desktop app declares a distributable build command");
assert.ok(packageJson.devDependencies.electron, "desktop app declares Electron");
assert.ok(packageJson.devDependencies["electron-builder"], "desktop app declares a real desktop packager");
assert.equal(packageJson.build.productName, "Codex Theme Creator", "packaged app has a product identity instead of generic Electron");
assert.equal(packageJson.build.appId, "com.swordingk.codexthemecreator", "packaged app has a stable app identifier");
assert.ok(packageJson.build.extraResources.length >= 4, "packaged app bundles its studio, engine, presets, and creator Skill");
assert.match(main, /startThemeStudioServer/, "desktop shell starts the embedded Theme Studio server");
assert.match(main, /process\.resourcesPath/, "packaged app resolves bundled resources instead of the development checkout");
assert.match(main, /BrowserWindow/, "desktop shell creates a native window");
assert.match(main, /Tray/, "desktop shell creates a macOS menu bar / Windows tray icon");
assert.match(main, /Menu\.buildFromTemplate/, "tray icon has a native context menu");
assert.match(main, /setContextMenu/, "tray menu is attached to the tray icon");
assert.doesNotMatch(main, /nativeImage\.createEmpty\(\)/, "macOS tray must use a visible icon, not an empty placeholder");
assert.match(main, /setTemplateImage\(true\)/, "macOS tray icon should render as a native menu bar template image");
assert.match(main, /tray\.setTitle\("CTC"\)/, "macOS tray should pair the icon with a readable short title");
assert.match(main, /requestSingleInstanceLock/, "desktop app should avoid multiple stale controllers");
assert.match(main, /second-instance/, "launching again should focus the existing controller");
assert.match(main, /\/api\/themes/, "tray menu can read the local theme library");
assert.match(main, /\/api\/switch/, "tray menu can switch saved local themes");
assert.match(main, /event\.preventDefault\(\)/, "closing the window hides it to the tray instead of quitting");
await fs.access(path.join(repoRoot, "scripts", "start-theme-app.sh"));
await fs.access(path.join(repoRoot, "scripts", "start-theme-app.ps1"));

console.log("PASS: desktop app entry is packaged and starts Theme Studio.");
