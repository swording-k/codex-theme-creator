import { app, BrowserWindow, Menu, Tray, dialog, nativeImage, shell } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = app.isPackaged ? process.resourcesPath : path.resolve(here, "..");
const { startThemeStudioServer } = await import(
  pathToFileURL(path.join(appRoot, "theme-studio", "server.mjs")).href,
);
const { provisionCreatorSkill } = await import(
  pathToFileURL(path.join(appRoot, "theme-studio", "lib", "creator-provisioning.mjs")).href,
);
const updaterModule = await import("electron-updater");
const autoUpdater = updaterModule.autoUpdater ?? updaterModule.default?.autoUpdater;
let serverHandle = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
let updateCheckInFlight = false;
let interactiveUpdateCheck = false;
const pendingThemeFiles = [];
const MAX_THEME_ARCHIVE_BYTES = 20 * 1024 * 1024;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

const macTrayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <path d="M3 3.5h9.2a2 2 0 0 1 2 2v5.1a2 2 0 0 1-2 2H8l-2.6 2 .4-2H3a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" fill="none" stroke="#000" stroke-width="1.45" stroke-linejoin="round"/>
  <path d="M12.3 12.1h3.2v3.2h-3.2zM8.3 4.8c1.7.5 2 2.7.3 3.6M6.2 10.2c-1.6-.6-1.8-2.8-.1-3.6" fill="none" stroke="#000" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const trayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="9" fill="#101418"/>
  <path d="M5 6h15a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-7l-4 4 .7-4H5a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" fill="none" stroke="#f4f7f8" stroke-width="2.15" stroke-linejoin="round"/>
  <path d="M20 20h8v8h-8z" fill="#62c5a8" stroke="#f4f7f8" stroke-width="1.5"/>
</svg>`;

async function createWindow() {
  if (!serverHandle) serverHandle = await startThemeStudioServer({ port: 0 });
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: "Codex Theme Creator",
    backgroundColor: "#0b0d10",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  await mainWindow.loadURL(serverHandle.url);
}

function isThemeArchivePath(filePath) {
  return typeof filePath === "string" && path.extname(filePath).toLowerCase() === ".ctheme";
}

async function importThemeFile(filePath) {
  if (!isThemeArchivePath(filePath)) return;
  try {
    if (!serverHandle) serverHandle = await startThemeStudioServer({ port: 0 });
    const archivePath = path.resolve(filePath);
    const stats = await fs.stat(archivePath);
    if (!stats.isFile() || stats.size < 1 || stats.size > MAX_THEME_ARCHIVE_BYTES) {
      throw new Error("主题包必须是小于 20 MB 的 .ctheme 文件。");
    }
    const response = await fetch(new URL("/api/import", serverHandle.url), {
      method: "POST",
      headers: { "content-type": "application/octet-stream" },
      body: await fs.readFile(archivePath),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "主题包导入失败。");
    await createWindow();
    mainWindow.webContents.reload();
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "主题已导入",
      message: `“${body.theme.name}”已加入本机主题库。`,
      detail: "现在可以在主题库中预览、微调或启用。",
    });
  } catch (error) {
    await dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "无法导入主题",
      message: "这个 .ctheme 文件没有通过主题包校验。",
      detail: error.message,
    });
  }
}

function openThemeFile(filePath) {
  if (!isThemeArchivePath(filePath)) return;
  if (!app.isReady()) {
    pendingThemeFiles.push(filePath);
    return;
  }
  void importThemeFile(filePath);
}

async function ensureBundledCreatorSkill() {
  const marker = path.join(app.getPath("userData"), "creator-skill-version.txt");
  const version = app.getVersion();
  const installedVersion = await fs.readFile(marker, "utf8").catch(() => "");
  if (installedVersion.trim() === version) return;
  await provisionCreatorSkill({ sourceRoot: appRoot, home: app.getPath("home") });
  await fs.writeFile(marker, `${version}\n`, "utf8");
}

function trayImage() {
  if (process.platform === "darwin") {
    const templatePath = app.isPackaged
      ? path.join(process.resourcesPath, "tray-template.png")
      : path.join(here, "build", "tray-template.png");
    const template = nativeImage.createFromPath(templatePath);
    if (!template.isEmpty()) {
      template.setTemplateImage(true);
      return template;
    }
  }
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(trayIconSvg).toString("base64")}`);
}

async function availableThemes() {
  if (!serverHandle?.url) return [];
  try {
    const response = await fetch(new URL("/api/themes", serverHandle.url));
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body.themes) ? body.themes : [];
  } catch {
    return [];
  }
}

async function switchTheme(id) {
  if (!serverHandle?.url) return;
  await fetch(new URL("/api/quick-switch", serverHandle.url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

async function checkForUpdates({ interactive = false } = {}) {
  if (!app.isPackaged || !autoUpdater || updateCheckInFlight) return;
  updateCheckInFlight = true;
  interactiveUpdateCheck = interactive;
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    updateCheckInFlight = false;
    if (interactive) {
      await dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "检查更新失败",
        message: "暂时无法连接更新服务。",
        detail: error.message,
      });
    }
  }
}

function configureAutoUpdates() {
  if (!app.isPackaged || !autoUpdater) return;
  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = true;
  autoUpdater.on("update-available", async (info) => {
    updateCheckInFlight = false;
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "发现新版本",
      message: `Codex Theme Creator ${info.version} 已发布。`,
      detail: "下载完成后可以一键重启更新。",
      buttons: ["下载更新", "稍后"],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) await autoUpdater.downloadUpdate();
  });
  autoUpdater.on("update-not-available", async () => {
    updateCheckInFlight = false;
    if (!interactiveUpdateCheck) return;
    interactiveUpdateCheck = false;
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "已经是最新版",
      message: `当前版本 ${app.getVersion()} 已是最新版。`,
    });
  });
  autoUpdater.on("update-downloaded", async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "更新已准备好",
      message: `版本 ${info.version} 已下载完成。`,
      buttons: ["立即重启更新", "稍后"],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });
  autoUpdater.on("error", (error) => {
    updateCheckInFlight = false;
    console.error(`Update check failed: ${error.message}`);
  });
  setTimeout(() => void checkForUpdates(), 5000);
  const timer = setInterval(() => void checkForUpdates(), 6 * 60 * 60 * 1000);
  timer.unref?.();
}

async function refreshTrayMenu() {
  if (!tray) return;
  const themes = await availableThemes();
  const themeItems = themes.slice(0, 8).map((theme) => ({
    label: theme.name || theme.id,
    click: async () => {
      await switchTheme(theme.id);
      await refreshTrayMenu();
    },
  }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "打开主题管理器", click: () => void createWindow() },
    { label: "恢复 Codex 默认外观", click: async () => {
      await fetch(new URL("/api/restore-default", serverHandle.url), { method: "POST" });
      await refreshTrayMenu();
    } },
    { label: "刷新主题列表", click: () => void refreshTrayMenu() },
    { label: "检查更新", click: () => void checkForUpdates({ interactive: true }) },
    { type: "separator" },
    themeItems.length
      ? { label: "快速切换主题", submenu: themeItems }
      : { label: "还没有可用主题", enabled: false },
    { type: "separator" },
    {
      label: "退出 Codex Theme Creator",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
}

async function createTray() {
  if (tray) return;
  tray = new Tray(trayImage());
  tray.setToolTip("Codex Theme Creator");
  // The menu bar is primarily for switching themes without opening the studio.
  tray.on("click", () => tray.popUpContextMenu());
  await refreshTrayMenu();
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    openThemeFile(filePath);
  });

  app.on("second-instance", (_event, commandLine) => {
    const archive = commandLine.find(isThemeArchivePath);
    if (archive) openThemeFile(archive);
    else void createWindow();
  });

  app.whenReady().then(async () => {
    process.env.CODEX_THEME_NODE = process.execPath;
    try {
      await ensureBundledCreatorSkill();
    } catch (error) {
      console.error(`Creator Skill setup failed: ${error.message}`);
    }
    serverHandle = await startThemeStudioServer({ port: 0 });
    await createTray();
    await createWindow();
    for (const archive of pendingThemeFiles.splice(0)) await importThemeFile(archive);
    const launchedArchive = process.argv.find(isThemeArchivePath);
    if (launchedArchive) await importThemeFile(launchedArchive);
    configureAutoUpdates();
  });

  app.on("activate", () => {
    void createWindow();
  });

  app.on("window-all-closed", () => {
    // Keep the menu bar / system tray controller alive until the user quits from its menu.
  });

  app.on("before-quit", () => {
    isQuitting = true;
    if (serverHandle?.server?.listening) {
      serverHandle.server.close();
    }
  });
}

export { appRoot };
