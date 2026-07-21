import os from "node:os";
import path from "node:path";

function appDataRoot({ platform, env, home }) {
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "CodexDreamSkinStudio");
  }
  if (platform === "win32") {
    return path.win32.join(env.APPDATA || path.win32.join(home, "AppData", "Roaming"), "CodexDreamSkinStudio");
  }
  return path.join(env.XDG_DATA_HOME || path.join(home, ".local", "share"), "CodexDreamSkinStudio");
}

export function getPlatformConfig({
  platform = process.platform,
  env = process.env,
  home = os.homedir(),
  repoRoot = process.cwd(),
} = {}) {
  const dataRoot = appDataRoot({ platform, env, home });
  const pathImpl = platform === "win32" ? path.win32 : path;
  const base = {
    platform,
    dataRoot,
    themesRoot: pathImpl.join(dataRoot, "themes"),
    canEditThemes: true,
    canSwitch: false,
    switchScript: null,
    canRestoreDefault: false,
    restoreScript: null,
    switchUnavailableReason: "当前平台还没有可用的 Codex 主题切换运行时。",
  };
  if (platform === "darwin") {
    return {
      ...base,
      label: "macOS",
      canSwitch: true,
      switchScript: path.join(repoRoot, "engine", "macos", "scripts", "switch-theme-macos.sh"),
      canRestoreDefault: true,
      restoreScript: path.join(repoRoot, "engine", "macos", "scripts", "restore-dream-skin-macos.sh"),
      switchUnavailableReason: null,
    };
  }
  if (platform === "win32") {
    return {
      ...base,
      label: "Windows",
      switchUnavailableReason: "Windows 端主题编辑和保存已预留，Codex 注入与一键切换运行时还在建设中。",
    };
  }
  return {
    ...base,
    label: platform,
    switchUnavailableReason: `${platform} 端主题编辑和保存已预留，一键切换运行时还在建设中。`,
  };
}
