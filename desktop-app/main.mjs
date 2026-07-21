import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from "electron";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = app.isPackaged ? process.resourcesPath : path.resolve(here, "..");
const { startThemeStudioServer } = await import(
  pathToFileURL(path.join(appRoot, "theme-studio", "server.mjs")).href,
);
let serverHandle = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

const macTrayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
  <path d="m6.4 4.1-3.1 4.9 3.1 4.9M11.6 4.1l3.1 4.9-3.1 4.9" fill="none" stroke="#000" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 6.35v5.3M6.35 9h5.3" fill="none" stroke="#000" stroke-width="1.45" stroke-linecap="round"/>
</svg>`;

const trayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="9" fill="#0b1421"/>
  <path d="m11.7 7.3-5 8.7 5 8.7M20.3 7.3l5 8.7-5 8.7" fill="none" stroke="#eaf4ff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 11.3v9.4M11.3 16h9.4" fill="none" stroke="#58b8ff" stroke-width="2.35" stroke-linecap="round"/>
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

function trayImage() {
  const svg = process.platform === "darwin" ? macTrayIconSvg : trayIconSvg;
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
  if (process.platform === "darwin") image.setTemplateImage(true);
  return image;
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
  tray.on("click", () => void createWindow());
  await refreshTrayMenu();
}

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    void createWindow();
  });

  app.whenReady().then(async () => {
    serverHandle = await startThemeStudioServer({ port: 0 });
    await createTray();
    await createWindow();
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
