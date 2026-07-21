const SESSION_KEY = "codex-theme-creator/studio-session-v1";
const DEFAULT_THEME = {
  id: "codex-default",
  name: "Codex 默认外观",
  source: "native",
  profile: "原生界面",
  accent: "#64748b",
  settings: {},
};

function readSavedSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    return {
      selectedId: typeof saved.selectedId === "string" ? saved.selectedId : null,
      drafts: saved.drafts && typeof saved.drafts === "object" ? saved.drafts : {},
    };
  } catch {
    return { selectedId: null, drafts: {} };
  }
}

const savedSession = readSavedSession();
const state = {
  themes: [],
  selectedId: savedSession.selectedId,
  drafts: savedSession.drafts,
  platform: null,
  creator: null,
};

const grid = document.querySelector("#themeGrid");
const statusEl = document.querySelector("#status");
const platformStatusEl = document.querySelector("#platformStatus");
const controls = document.querySelector("#controls");
const themeLibraryPathEl = document.querySelector("#themeLibraryPath");
const themePreview = document.querySelector("#themePreview");
const previewArt = document.querySelector("#previewArt");
const previewTitle = document.querySelector("#previewTitle");
const creatorStatusEl = document.querySelector("#creatorStatus");
const createWithCodexButton = document.querySelector("#createWithCodex");
const installCreatorButton = document.querySelector("#installCreator");

function isDefaultTheme(theme = selectedTheme()) {
  return theme?.id === DEFAULT_THEME.id;
}

function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      selectedId: state.selectedId,
      drafts: state.drafts,
    }));
  } catch {
    // The studio stays usable when local storage is unavailable.
  }
}

function currentFormValues() {
  return Object.fromEntries(new FormData(controls).entries());
}

function rememberCurrentDraft() {
  const theme = selectedTheme();
  if (!theme || isDefaultTheme(theme)) return;
  state.drafts[theme.id] = currentFormValues();
  saveSession();
}

function settingsFromForm() {
  const data = new FormData(controls);
  return {
    accent: data.get("accent"),
    backgroundBlur: Number(data.get("backgroundBlur")),
    backgroundDim: Number(data.get("backgroundDim")) / 100,
    homeOpacity: Number(data.get("homeOpacity")) / 100,
    taskOpacity: Number(data.get("taskOpacity")) / 100,
    motionEffect: "none",
    motionIntensity: 0,
    rain: false,
    telemetry: false,
    signalLights: false,
  };
}

function setStatus(message) {
  statusEl.textContent = message;
}

function controlsDisabled() {
  return !state.platform?.canSwitch;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function chooseVisibleTheme(preferredIds = []) {
  const candidates = [
    ...preferredIds,
    state.selectedId,
    state.themes[0]?.id,
  ].filter(Boolean);
  const visible = candidates.find((id) => state.themes.some((theme) => theme.id === id));
  state.selectedId = visible || null;
  saveSession();
  return selectedTheme();
}

function selectedTheme() {
  return state.themes.find((theme) => theme.id === state.selectedId) || null;
}

function percent(value, fallback) {
  const number = Number(value);
  return Math.round(Number.isFinite(number) ? number * 100 : fallback);
}

function defaultFormValues(theme) {
  const settings = theme.settings || {};
  return {
    themeName: theme.source === "preset" ? `${theme.name} 我的调校` : theme.name,
    accent: settings.accent || theme.accent || "#e05a2a",
    backgroundBlur: String(Math.round(Number(settings.backgroundBlur ?? 0))),
    backgroundDim: String(percent(settings.backgroundDim, 18)),
    homeOpacity: String(percent(settings.homeOpacity, 54)),
    taskOpacity: String(percent(settings.taskOpacity, 86)),
  };
}

function setControlsEnabled(enabled) {
  for (const input of controls.elements) input.disabled = !enabled;
  const theme = selectedTheme();
  const saveButton = document.querySelector("#saveTheme");
  const exportButton = document.querySelector("#exportTheme");
  const applyButton = document.querySelector("#applyTheme");
  const switchButton = document.querySelector("#switchTheme");
  const native = isDefaultTheme(theme);
  saveButton.disabled = !enabled || native;
  exportButton.disabled = !enabled || native;
  applyButton.disabled = !state.platform?.canSwitch;
  applyButton.textContent = native ? "恢复 Codex 默认" : "保存并启用";
  switchButton.disabled = !state.platform?.canSwitch || native;
  switchButton.hidden = native;
}

function syncControls(theme) {
  if (!theme) return;
  if (isDefaultTheme(theme)) {
    controls.reset();
    setControlsEnabled(false);
    previewArt.style.backgroundImage = "none";
    previewTitle.textContent = theme.name;
    return;
  }
  const values = state.drafts[theme.id] || defaultFormValues(theme);
  for (const [name, value] of Object.entries(values)) {
    if (controls.elements[name]) controls.elements[name].value = value;
  }
  setControlsEnabled(true);
  applyLocalPreview(theme);
}

function applyLocalPreview(theme = selectedTheme()) {
  if (!theme) return;
  if (isDefaultTheme(theme)) return;
  const settings = settingsFromForm();
  const backgroundUrl = `/api/asset?id=${encodeURIComponent(theme.id)}&kind=background`;
  previewArt.style.backgroundImage = `url("${backgroundUrl}")`;
  previewTitle.textContent = theme.name;
  themePreview.style.setProperty("--preview-accent", settings.accent || theme.accent || "#e05a2a");
  themePreview.style.setProperty("--preview-bg-blur", `${settings.backgroundBlur}px`);
  themePreview.style.setProperty("--preview-bg-brightness", String(Math.max(0.45, 1 - settings.backgroundDim * 0.55)));
  themePreview.style.setProperty("--preview-bg-scale", String(settings.backgroundBlur > 0 ? 1.015 + settings.backgroundBlur / 360 : 1));
  themePreview.style.setProperty("--preview-dim", String(settings.backgroundDim));
  themePreview.style.setProperty("--preview-home-opacity", String(settings.homeOpacity));
  themePreview.style.setProperty("--preview-task-opacity", String(settings.taskOpacity));
}

function renderThemes() {
  grid.innerHTML = "";
  for (const theme of state.themes) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card";
    card.setAttribute("aria-selected", theme.id === state.selectedId ? "true" : "false");
    const thumbnail = isDefaultTheme(theme)
      ? `<div class="native-theme-thumbnail"><span>Codex</span><small>原生</small></div>`
      : `<img alt="" src="/api/asset?id=${encodeURIComponent(theme.id)}&kind=background">`;
    card.innerHTML = `
      ${thumbnail}
      <div>
        <h3>${escapeHtml(theme.name)}</h3>
        <p>${theme.source === "native" ? "随时恢复" : theme.source === "preset" ? "公开预设" : "我的主题"} · ${escapeHtml(theme.profile)}</p>
      </div>
    `;
    card.addEventListener("click", () => {
      state.selectedId = theme.id;
      saveSession();
      syncControls(theme);
      renderThemes();
      setStatus(isDefaultTheme(theme)
        ? "已选择 Codex 默认外观。点击“恢复 Codex 默认”即可移除当前主题。"
        : `已选择 ${theme.name}。调整后点击“保存并启用”才会作用到 Codex。`);
    });
    grid.appendChild(card);
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

async function loadThemes({ preferredIds = [] } = {}) {
  setStatus("正在读取本机主题库...");
  const [platformBody, body] = await Promise.all([
    requestJson("/api/platform"),
    requestJson("/api/themes"),
  ]);
  state.platform = platformBody.platform;
  state.themes = [DEFAULT_THEME, ...body.themes];
  chooseVisibleTheme(preferredIds);
  platformStatusEl.textContent = state.platform.canSwitch
    ? `${state.platform.label}：支持保存和一键切换`
    : `${state.platform.label}：支持保存主题，暂不支持一键切换`;
  themeLibraryPathEl.textContent = state.platform.themesRoot;
  renderThemes();
  syncControls(selectedTheme());
  setStatus(`已读取 ${state.themes.length} 套主题。`);
}

function renderCreatorStatus() {
  const creator = state.creator;
  if (!creator) return;
  creatorStatusEl.textContent = creator.message;
  createWithCodexButton.disabled = !creator.ready;
  installCreatorButton.hidden = creator.ready || !creator.supported;
  installCreatorButton.disabled = !creator.supported;
}

async function loadCreatorStatus() {
  const body = await requestJson("/api/creator-status");
  state.creator = body.creator;
  renderCreatorStatus();
}

async function installCreator() {
  setStatus("正在安装 Codex Theme Creator 创作助手...");
  installCreatorButton.disabled = true;
  try {
    const body = await requestJson("/api/install-creator-skill", {
      method: "POST",
      body: JSON.stringify({}),
    });
    state.creator = body.creator;
    renderCreatorStatus();
    setStatus("创作助手已安装。现在回到 Codex，描述你的主题想法或附一张参考图。");
  } finally {
    if (!state.creator?.ready) installCreatorButton.disabled = false;
  }
}

async function saveTheme() {
  const base = selectedTheme();
  if (!base || isDefaultTheme(base)) return;
  setStatus("正在保存为我的主题...");
  const body = await requestJson("/api/studio-themes", {
    method: "POST",
    body: JSON.stringify({
      baseId: base.id,
      name: controls.themeName.value,
      settings: settingsFromForm(),
    }),
  });
  await loadThemes({ preferredIds: [body.theme.id, base.id] });
  setStatus("已保存到本机主题列表。");
}

async function applyTheme() {
  const base = selectedTheme();
  if (!base) return;
  if (!state.platform?.canSwitch) {
    setStatus(state.platform?.switchUnavailableReason || "当前平台暂不支持一键切换。");
    return;
  }
  if (isDefaultTheme(base)) {
    await restoreDefaultTheme();
    return;
  }
  setStatus("正在保存设置并切换 Codex 主题...");
  const body = await requestJson("/api/apply", {
    method: "POST",
    body: JSON.stringify({
      baseId: base.id,
      name: controls.themeName.value,
      settings: settingsFromForm(),
    }),
  });
  await loadThemes({ preferredIds: [body.visibleId, body.id, base.id] });
  setStatus(`已保存并切换到 ${body.theme.name}。`);
}

async function restoreDefaultTheme() {
  if (!state.platform?.canRestoreDefault) {
    setStatus(state.platform?.switchUnavailableReason || "当前平台暂不支持恢复 Codex 默认外观。");
    return;
  }
  setStatus("正在移除主题并恢复 Codex 默认外观...");
  await requestJson("/api/restore-default", { method: "POST", body: JSON.stringify({}) });
  state.selectedId = DEFAULT_THEME.id;
  saveSession();
  syncControls(DEFAULT_THEME);
  renderThemes();
  setStatus("已恢复 Codex 默认外观。");
}

function scheduleLivePreview() {
  rememberCurrentDraft();
  applyLocalPreview();
  setStatus("已更新 App 内预览。点击“保存并启用”后会写入 Codex。");
}

function createPromptText() {
  const themesRoot = state.creator?.themesRoot || "本机 Codex Theme Creator 主题库";
  return `请使用已经安装的 Codex Theme Creator Skill，为我创作一套完整 Codex Desktop 主题。

要求：
1. 不要只换背景图，要统一侧栏、选中态、New Chat 卡片、输入框、按钮、任务页和预览面板外壳。
2. 先生成或整理背景图，再根据背景明暗选择文字颜色、面板透明度、遮罩和强调色。
3. 保证新聊天和已有任务里的文字都清楚可读。
4. 必须用 Skill 的校验流程完成主题包，并把最终包写入 ${themesRoot}；不要只给我一张图片或一段 CSS。
5. 完成后切换到 Codex，并报告 created、installed、active、verified 四项结果。任何一项没有完成，请明确说明。

我的主题想法：`;
}

async function copyCreatePrompt() {
  if (!state.creator?.ready) {
    setStatus("请先安装创作助手。只有已安装的 Skill 才会把完成的主题校验后写入主题库。");
    return;
  }
  const prompt = createPromptText();
  try {
    await navigator.clipboard.writeText(prompt);
    setStatus("已复制创作提示词。回到 Codex，把你的主题想法接在最后一句后面。");
  } catch {
    window.prompt("复制这段提示词给 Codex：", prompt);
    setStatus("请复制弹窗里的提示词给 Codex。");
  }
}

function filenameFromDisposition(header) {
  const match = /filename="?([^";]+)"?/i.exec(header || "");
  return match?.[1] || "codex-theme.ctheme";
}

async function exportThemePackage() {
  const theme = selectedTheme();
  if (!theme || isDefaultTheme(theme)) return;
  setStatus("正在导出主题包...");
  const response = await fetch(`/api/export?id=${encodeURIComponent(theme.id)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "导出主题失败");
  }
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filenameFromDisposition(response.headers.get("content-disposition"));
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus(`已导出 ${theme.name}。把 .ctheme 文件发给朋友即可。`);
}

async function importThemePackage(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) throw new Error("主题包不能超过 20 MB");
  setStatus("正在校验并导入主题包...");
  const response = await fetch("/api/import", {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: await file.arrayBuffer(),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "导入主题失败");
  await loadThemes({ preferredIds: [body.theme.id] });
  setStatus(`已导入 ${body.theme.name}，现在可以预览、微调或启用。`);
}

async function switchTheme() {
  const theme = selectedTheme();
  if (!theme) return;
  if (isDefaultTheme(theme)) {
    await restoreDefaultTheme();
    return;
  }
  if (theme.source === "preset") {
    setStatus("公开预设需要先保存成我的主题，再启用。");
    return;
  }
  setStatus("正在切换 Codex 主题...");
  await requestJson("/api/switch", {
    method: "POST",
    body: JSON.stringify({ id: theme.id }),
  });
  setStatus(`已切换到 ${theme.name}。`);
}

document.querySelector("#refresh").addEventListener("click", loadThemes);
document.querySelector("#createWithCodex").addEventListener("click", copyCreatePrompt);
document.querySelector("#installCreator").addEventListener("click", installCreator);
document.querySelector("#copyPrompt").addEventListener("click", copyCreatePrompt);
document.querySelector("#saveTheme").addEventListener("click", saveTheme);
document.querySelector("#exportTheme").addEventListener("click", () => exportThemePackage().catch((error) => setStatus(error.message)));
document.querySelector("#importTheme").addEventListener("click", () => document.querySelector("#importFile").click());
document.querySelector("#importFile").addEventListener("change", (event) => {
  importThemePackage(event.target.files?.[0]).catch((error) => setStatus(error.message));
  event.target.value = "";
});
document.querySelector("#applyTheme").addEventListener("click", applyTheme);
document.querySelector("#switchTheme").addEventListener("click", switchTheme);
controls.addEventListener("input", scheduleLivePreview);
controls.addEventListener("change", scheduleLivePreview);

Promise.all([loadThemes(), loadCreatorStatus()]).catch((error) => setStatus(error.message));
