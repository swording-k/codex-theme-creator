import assert from "node:assert/strict";
import path from "node:path";

import { getPlatformConfig } from "../lib/platform.mjs";

const mac = getPlatformConfig({
  platform: "darwin",
  home: "/Users/alice",
  repoRoot: "/repo",
  env: {},
});
assert.equal(
  mac.themesRoot,
  path.join("/Users/alice", "Library", "Application Support", "CodexDreamSkinStudio", "themes"),
);
assert.equal(mac.canSwitch, true);
assert.equal(mac.petsRoot, path.join("/Users/alice", ".codex", "pets"));
assert.equal(mac.canRestartCodex, true);
assert.equal(mac.switchScript, path.join("/repo", "engine", "macos", "scripts", "switch-theme-macos.sh"));

const win = getPlatformConfig({
  platform: "win32",
  home: "C:\\Users\\Alice",
  repoRoot: "C:\\repo",
  env: { APPDATA: "C:\\Users\\Alice\\AppData\\Roaming" },
});
assert.equal(
  win.themesRoot,
  path.win32.join("C:\\Users\\Alice\\AppData\\Roaming", "CodexDreamSkinStudio", "themes"),
);
assert.equal(win.canSwitch, true);
assert.equal(win.petsRoot, path.win32.join("C:\\Users\\Alice", ".codex", "pets"));
assert.equal(win.canRestoreDefault, true);
assert.equal(
  win.switchScript,
  path.win32.join("C:\\repo", "engine", "windows", "scripts", "switch-theme-windows.ps1"),
);
assert.equal(
  win.restoreScript,
  path.win32.join("C:\\repo", "engine", "windows", "scripts", "restore-theme-windows.ps1"),
);
assert.equal(win.switchIdArgument, "-ThemeId");
assert.equal(win.canRestartCodex, false, "Windows restart stays unavailable until a real VM flow proves it");
assert.equal(win.switchUnavailableReason, null);

const linux = getPlatformConfig({
  platform: "linux",
  home: "/home/alice",
  repoRoot: "/repo",
  env: { XDG_DATA_HOME: "/home/alice/.local/share" },
});
assert.equal(linux.themesRoot, path.join("/home/alice/.local/share", "CodexDreamSkinStudio", "themes"));
assert.equal(linux.canSwitch, false);

console.log("PASS: theme studio platform adapter separates editable library from runtime switching.");
