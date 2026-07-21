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
  themeAssetPath,
  updateStudioTheme,
} from "./lib/theme-library.mjs";
import { getPlatformConfig } from "./lib/platform.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const publicRoot = path.join(here, "public");
const platformConfig = getPlatformConfig({ repoRoot });
const codexHome = process.env.CODEX_HOME || path.join(process.env.HOME || "", ".codex");
const creatorSkillPath = path.join(codexHome, "skills", "codex-theme-creator", "SKILL.md");
const creatorEnginePath = path.join(codexHome, "codex-theme-creator", "engine", "macos", "scripts", "injector.mjs");

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
  const supported = process.platform === "darwin";
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
      : "Windows 端创作包格式已预留；Codex 注入与一键切换运行时仍在建设中。",
  };
}

function installCreatorSkill() {
  if (process.platform !== "darwin") {
    throw new Error("当前仅支持在 macOS 安装创作助手。");
  }
  const installer = path.join(repoRoot, "scripts", "install-theme-creator.sh");
  return new Promise((resolve, reject) => {
    const child = spawn("/bin/bash", [installer], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Creator Skill installation failed with code ${code}`));
    });
  });
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

function switchTheme(id) {
  if (!platformConfig.canSwitch || !platformConfig.switchScript) {
    throw new Error(platformConfig.switchUnavailableReason);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(platformConfig.switchScript, ["--id", id], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Switch failed with code ${code}`));
    });
  });
}

function restoreDefaultTheme() {
  if (!platformConfig.canRestoreDefault || !platformConfig.restoreScript) {
    throw new Error(platformConfig.switchUnavailableReason);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(platformConfig.restoreScript, [], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || stdout || `Restore failed with code ${code}`));
    });
  });
}

function injectThemeDir(themeDir, timeoutMs = 8000) {
  if (!platformConfig.canSwitch) {
    throw new Error(platformConfig.switchUnavailableReason);
  }
  const injector = path.join(repoRoot, "engine", "macos", "scripts", "injector.mjs");
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
    ], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
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
