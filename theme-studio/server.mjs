import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  LIVE_PREVIEW_THEME_ID,
  createLivePreviewTheme,
  createStudioTheme,
  discoverThemes,
  ensureQuickTheme,
  themeAssetPath,
  updateStudioTheme,
} from "./lib/theme-library.mjs";
import { getPlatformConfig } from "./lib/platform.mjs";
import { exportThemeArchive, importThemeArchive } from "./lib/theme-archive.mjs";
import { discoverPets, findPet, removePet } from "./lib/pet-library.mjs";
import { readSelectedAvatarId, selectPet } from "./lib/pet-selection.mjs";
import { activateLivePet } from "./lib/live-pet-selection.mjs";
import { creatorInstallPaths, provisionCreatorSkill } from "./lib/creator-provisioning.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const publicRoot = path.join(here, "public");
const platformConfig = getPlatformConfig({ repoRoot });
const creatorPaths = creatorInstallPaths();
const creatorSkillPath = path.join(creatorPaths.skillRoot, "SKILL.md");
const creatorEnginePath = process.platform === "win32"
  ? path.join(creatorPaths.platformEngineRoot, "scripts", "common-windows.ps1")
  : path.join(creatorPaths.platformEngineRoot, "scripts", "injector.mjs");

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function creatorStatus() {
  const [skillInstalled, engineInstalled] = await Promise.all([
    pathExists(creatorSkillPath),
    pathExists(creatorEnginePath),
  ]);
  const supported = process.platform === "darwin" || process.platform === "win32";
  return {
    supported,
    skillInstalled,
    engineInstalled,
    ready: supported && skillInstalled && engineInstalled,
    skillPath: creatorSkillPath,
    themesRoot: platformConfig.themesRoot,
    message: supported
      ? (skillInstalled && engineInstalled
        ? "创作助手已安装。把想法或参考图发给 Codex，完成的主题会自动写入本机主题库。"
        : "先安装创作助手。安装后，Codex 才知道如何生成、校验并把主题写入主题库。")
      : "当前系统暂不支持自动安装和切换 Codex 主题。",
  };
}

function installCreatorSkill() {
  if (!["darwin", "win32"].includes(process.platform)) {
    throw new Error("当前系统不支持安装创作助手。");
  }
  return provisionCreatorSkill({ sourceRoot: repoRoot });
}

function parsePort(argv) {
  const index = argv.indexOf("--port");
  const port = index >= 0 ? Number(argv[index + 1]) : 56938;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`Invalid port: ${port}`);
  return port;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (Buffer.concat(chunks).length > 256 * 1024) throw new Error("Request body is too large");
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function readBinaryBody(req, maxBytes = 20 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("Theme package is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.resolve(publicRoot, `.${pathname}`);
  if (!target.startsWith(publicRoot)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  const ext = path.extname(target);
  const type = ext === ".css" ? "text/css; charset=utf-8"
    : ext === ".js" ? "text/javascript; charset=utf-8"
      : "text/html; charset=utf-8";
  try {
    const data = await fs.readFile(target);
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

async function findThemeById(id) {
  const themes = await discoverThemes({ repoRoot, themesRoot: platformConfig.themesRoot });
  const theme = themes.find((candidate) => candidate.id === id);
  if (!theme) throw new Error(`Theme not found: ${id}`);
  return theme;
}

function runPlatformScript(script, args = []) {
  const executable = process.platform === "win32" ? "powershell.exe" : script;
  const commandArgs = process.platform === "win32"
    ? ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, ...args]
    : args;
  return new Promise((resolve, reject) => {
    const child = spawn(executable, commandArgs, { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Platform runtime failed with code ${code}`));
    });
  });
}

function switchTheme(id) {
  if (!platformConfig.canSwitch || !platformConfig.switchScript) {
    throw new Error(platformConfig.switchUnavailableReason);
  }
  return runPlatformScript(platformConfig.switchScript, [platformConfig.switchIdArgument || "--id", id]);
}

function restoreDefaultTheme() {
  if (!platformConfig.canRestoreDefault || !platformConfig.restoreScript) {
    throw new Error(platformConfig.switchUnavailableReason);
  }
  return runPlatformScript(platformConfig.restoreScript);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${command} failed with code ${code}`));
    });
  });
}

async function restartCodex() {
  if (!platformConfig.canRestartCodex || process.platform !== "darwin") {
    throw new Error("当前平台暂不支持由 App 自动重启 Codex。请手动重启后查看宠物。");
  }
  await runCommand("osascript", ["-e", 'tell application "ChatGPT" to quit']);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const launcher = spawn("open", ["-a", "ChatGPT"], { detached: true, stdio: "ignore" });
  launcher.unref();
}

function injectThemeDir(themeDir, timeoutMs = 8000) {
  if (!platformConfig.canSwitch) {
    throw new Error(platformConfig.switchUnavailableReason);
  }
  const injector = platformConfig.injectorPath;
  const childEnv = process.platform === "win32"
    ? { ...process.env, ELECTRON_RUN_AS_NODE: "1" }
    : process.env;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      injector,
      "--once",
      "--port",
      "9341",
      "--theme-dir",
      themeDir,
      "--timeout-ms",
      String(timeoutMs),
    ], { cwd: repoRoot, env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("实时预览超时，请确认 Codex 已打开并且主题运行时已安装。"));
    }, timeoutMs + 1200);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Preview inject failed with code ${code}`));
    });
  });
}

async function handleApi(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/api/platform") {
    sendJson(res, 200, { platform: platformConfig });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/creator-status") {
    sendJson(res, 200, { creator: await creatorStatus() });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/install-creator-skill") {
    await installCreatorSkill();
    const creator = await creatorStatus();
    if (!creator.ready) throw new Error("创作助手安装没有完成，请查看本机 Codex 目录权限。");
    sendJson(res, 200, { ok: true, creator });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/themes") {
    sendJson(res, 200, { themes: await discoverThemes({ repoRoot, themesRoot: platformConfig.themesRoot }) });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/pets") {
    const selectedAvatarId = await readSelectedAvatarId({ configPath: platformConfig.codexConfigPath });
    const pets = await discoverPets({ petsRoot: platformConfig.petsRoot });
    sendJson(res, 200, { pets: pets.map((pet) => ({
      ...pet,
      isSelected: selectedAvatarId === `custom:${pet.id}`,
    })) });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/pet-asset") {
    const pet = await findPet({ petsRoot: platformConfig.petsRoot, id: url.searchParams.get("id") });
    const file = path.join(pet.petDir, pet.spritesheetPath);
    const data = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "content-type": ext === ".webp" ? "image/webp" : "image/png",
      "cache-control": "no-store",
    });
    res.end(data);
    return;
  }
  if (req.method === "POST" && /^\/api\/pets\/[^/]+\/select$/.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.slice("/api/pets/".length, -"/select".length));
    await findPet({ petsRoot: platformConfig.petsRoot, id });
    try {
      const live = await activateLivePet({ id });
      sendJson(res, 200, { ok: true, activation: "live", ...live });
    } catch (liveError) {
      const fallback = await selectPet({ configPath: platformConfig.codexConfigPath, id });
      sendJson(res, 200, {
        ok: true,
        activation: "restart-required",
        ...fallback,
        message: "Codex 当前没有可用的实时连接，已保存选择；仅这次需要重启后显示。",
        liveError: liveError.message,
      });
    }
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/restart-codex") {
    await restartCodex();
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "DELETE" && /^\/api\/pets\/[^/]+$/.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.slice("/api/pets/".length));
    await removePet({ petsRoot: platformConfig.petsRoot, id });
    sendJson(res, 200, { ok: true, id });
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/asset") {
    const theme = await findThemeById(url.searchParams.get("id"));
    const file = themeAssetPath(theme, url.searchParams.get("kind") || "background");
    const data = await fs.readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "content-type": ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png",
      "cache-control": "no-store",
    });
    res.end(data);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/export") {
    const theme = await findThemeById(url.searchParams.get("id"));
    const archive = await exportThemeArchive({ themeDir: theme.themeDir });
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${archive.filename}"`,
      "cache-control": "no-store",
    });
    res.end(archive.data);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/import") {
    const imported = await importThemeArchive({
      archive: await readBinaryBody(req),
      themesRoot: platformConfig.themesRoot,
    });
    sendJson(res, 201, { theme: { ...imported.theme, themeDir: imported.themeDir } });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/studio-themes") {
    const body = await readBody(req);
    const base = await findThemeById(body.baseId);
    const created = await createStudioTheme({
      baseThemeDir: base.themeDir,
      themesRoot: platformConfig.themesRoot,
      name: body.name,
      settings: body.settings,
    });
    sendJson(res, 201, { theme: { ...created.theme, themeDir: created.themeDir } });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/apply") {
    const body = await readBody(req);
    const base = await findThemeById(body.baseId);
    const saved = base.source === "preset"
      ? await createStudioTheme({
        baseThemeDir: base.themeDir,
        themesRoot: platformConfig.themesRoot,
        name: body.name,
        settings: body.settings,
      })
      : await updateStudioTheme({
        themeDir: base.themeDir,
        name: body.name || base.name,
        settings: body.settings,
      });
    await switchTheme(saved.id);
    sendJson(res, 200, {
      ok: true,
      id: saved.id,
      visibleId: saved.id,
      theme: { ...saved.theme, themeDir: saved.themeDir },
    });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/restore-default") {
    await restoreDefaultTheme();
    sendJson(res, 200, { ok: true, id: "codex-default" });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/preview") {
    const body = await readBody(req);
    const base = await findThemeById(body.baseId);
    const preview = await createLivePreviewTheme({
      baseThemeDir: base.themeDir,
      themesRoot: platformConfig.themesRoot,
      name: `实时预览：${body.name || base.name}`,
      settings: body.settings,
    });
    await injectThemeDir(preview.themeDir);
    sendJson(res, 200, { ok: true, id: preview.id, theme: { ...preview.theme, themeDir: preview.themeDir } });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/switch") {
    const body = await readBody(req);
    const theme = await findThemeById(body.id);
    if (theme.source === "preset") {
      throw new Error("公开预设请先保存为我的主题，再启用。");
    }
    await switchTheme(theme.id);
    sendJson(res, 200, { ok: true, id: theme.id });
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/quick-switch") {
    const body = await readBody(req);
    const theme = await findThemeById(body.id);
    const target = theme.source === "preset"
      ? await ensureQuickTheme({ baseThemeDir: theme.themeDir, themesRoot: platformConfig.themesRoot })
      : theme;
    await switchTheme(target.id);
    sendJson(res, 200, { ok: true, id: target.id, name: theme.name });
    return;
  }
  sendJson(res, 404, { error: "Not found" });
}

export function createThemeStudioServer() {
  return createServer(async (req, res) => {
    try {
      if (req.url.startsWith("/api/")) await handleApi(req, res);
      else await serveStatic(req, res);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });
}

export function startThemeStudioServer({ port = 56938, host = "127.0.0.1" } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535 || (port > 0 && port < 1024)) {
    throw new Error(`Invalid port: ${port}`);
  }
  const server = createThemeStudioServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve({
        server,
        port: server.address().port,
        host,
        url: `http://${host}:${server.address().port}/`,
      });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = parsePort(process.argv.slice(2));
  startThemeStudioServer({ port }).then(({ url }) => {
    console.log(`Codex Theme Studio running at ${url}`);
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
