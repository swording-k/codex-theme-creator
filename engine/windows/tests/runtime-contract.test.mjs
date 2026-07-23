import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const windowsRoot = path.resolve(here, "..");

const common = await fs.readFile(path.join(windowsRoot, "scripts", "common-windows.ps1"), "utf8");
const start = await fs.readFile(path.join(windowsRoot, "scripts", "start-theme-windows.ps1"), "utf8");
const switcher = await fs.readFile(path.join(windowsRoot, "scripts", "switch-theme-windows.ps1"), "utf8");
const restore = await fs.readFile(path.join(windowsRoot, "scripts", "restore-theme-windows.ps1"), "utf8");

assert.match(common, /Get-AppxPackage/, "runtime discovers the Microsoft Store ChatGPT package");
assert.match(common, /Test-StorePackagedCodex/, "runtime identifies Store-packaged Codex before reporting a launch failure");
assert.match(common, /Microsoft Store Codex cannot accept the local runtime launch arguments/, "Store installations receive a clear compatibility explanation without PowerShell encoding hazards");
assert.doesNotMatch(common, /[^\x00-\x7F]/, "Windows PowerShell runtime scripts remain ASCII-only for Windows PowerShell 5.1 compatibility");
const storeCheck = common.indexOf("Test-StorePackagedCodex -ExecutablePath $executable");
const storeFailure = common.indexOf("if ($isStorePackaged)", storeCheck);
const stopCall = common.indexOf("Stop-ChatGPTProcesses", storeCheck);
assert.ok(storeCheck >= 0 && storeFailure > storeCheck && stopCall > storeFailure, "Store compatibility must be checked before any Codex process is closed");
assert.match(common, /ChatGPT\.exe|Codex\.exe/, "runtime supports current and legacy executable names");
assert.match(common, /127\.0\.0\.1/, "runtime binds CDP to loopback only");
assert.match(common, /remote-debugging-address=127\.0\.0\.1/, "ChatGPT is launched with a loopback-only debugger");
assert.match(common, /ELECTRON_RUN_AS_NODE/, "the packaged Electron runtime launches the shared Node injector");
assert.match(common, /Quote-ProcessArgument/, "detached injector arguments remain intact when install paths contain spaces");
assert.match(common, /stage-theme\.mjs/, "theme switching uses the shared stable package staging implementation");
assert.match(switcher, /StageThemePath/, "theme switching validates and stages a stable package snapshot");
assert.match(switcher, /--check-payload/, "theme switching validates the exact staged payload before publishing");
assert.match(restore, /--remove/, "restore removes injected DOM and CSS through the shared injector");
assert.doesNotMatch(restore, /Remove-Item.+themes/i, "restore never deletes the user's theme library");

console.log("PASS: Windows runtime contract covers discovery, injection, switching, and restore.");
