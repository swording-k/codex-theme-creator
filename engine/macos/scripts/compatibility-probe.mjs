import { pathToFileURL } from "node:url";

const CRITICAL = ["shell", "sidebar", "composer"];
const OPTIONAL = ["cards", "projectSelector", "transcript", "dialogs"];

export function gradeProbe(counts, { expectedOptional = null } = {}) {
  const source = counts && typeof counts === "object" ? counts : {};
  const missingCritical = CRITICAL.filter((name) => !Number.isFinite(source[name]) || source[name] < 1);
  const optional = Array.isArray(expectedOptional) ? expectedOptional : OPTIONAL;
  const missingOptional = optional.filter((name) => Object.hasOwn(source, name) && source[name] < 1);
  return {
    status: missingCritical.length ? "incompatible" : missingOptional.length ? "degraded" : "compatible",
    missingCritical,
    missingOptional,
  };
}

export function selectCodexTarget(targets) {
  const pages = Array.isArray(targets) ? targets.filter((candidate) => candidate.type === "page") : [];
  return pages.find((candidate) => candidate.url === "app://-/index.html")
    ?? pages.find((candidate) => /^app:\/\/-?\/index\.html(?:$|\?)/.test(candidate.url)
      && !/avatar-overlay/i.test(candidate.url))
    ?? pages.find((candidate) => /^app:\/\//.test(candidate.url) && !/avatar-overlay/i.test(candidate.url))
    ?? null;
}

export function routeIsSettled(live) {
  if (live?.route === "home") return Number(live.counts?.projectSelector) > 0;
  if (live?.route === "task") return Number(live.counts?.transcript) > 0;
  return false;
}

function argument(args, name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function cdpEvaluate(webSocketUrl, expression) {
  const socket = new WebSocket(webSocketUrl);
  let nextId = 1;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out connecting to Codex CDP")), 5000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Could not connect to Codex CDP")); }, { once: true });
  });
  const id = nextId++;
  const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  socket.send(JSON.stringify({
    id,
    method: "Runtime.evaluate",
    params: { expression, returnByValue: true, awaitPromise: true },
  }));
  const timer = setTimeout(() => pending.get(id)?.reject(new Error("Timed out evaluating Codex compatibility")), 5000);
  try {
    const result = await response;
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Codex evaluation failed");
    return result.result?.value;
  } finally {
    clearTimeout(timer);
    socket.close();
  }
}

export async function probeCodex(endpoint = "http://127.0.0.1:9341") {
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/json/list`);
  if (!response.ok) throw new Error(`Codex CDP returned HTTP ${response.status}`);
  const targets = await response.json();
  const target = selectCodexTarget(targets);
  if (!target?.webSocketDebuggerUrl) throw new Error("No Codex page target was found");
  const expression = `(() => {
    const count = (selector) => document.querySelectorAll(selector).length;
    const state = window.__CODEX_DREAM_SKIN_STATE__ || {};
    return {
      counts: {
        shell: count('main.main-surface, main'),
        sidebar: count('aside.app-shell-left-panel'),
        composer: count('.composer-surface-chrome, .ProseMirror'),
        cards: count('.group\\\\/home-suggestions button'),
        projectSelector: count('.dream-skin-home-shell .composer-surface-chrome, .group\\\\/project-selector'),
        transcript: count('main.main-surface article, [data-message-author-role], [data-virtualized-turn-content], main.main-surface:not(.dream-skin-home-shell) .prose'),
        dialogs: count('[role="dialog"], [role="menu"]')
      },
      route: document.querySelector('main.main-surface.dream-skin-home-shell') ? 'home' : 'task',
      activeThemeId: state.themeId || null,
      runtimeVersion: state.version || null,
      uiProfile: document.documentElement.getAttribute('data-dream-ui-profile'),
      url: location.href
    };
  })()`;
  let live;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    live = await cdpEvaluate(target.webSocketDebuggerUrl, expression);
    if (routeIsSettled(live)) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  const expectedOptional = live.route === "home" ? ["projectSelector"] : ["transcript"];
  return { ...live, ...gradeProbe(live.counts, { expectedOptional }), targetUrl: target.url };
}

async function main() {
  const endpoint = argument(process.argv.slice(2), "endpoint", "http://127.0.0.1:9341");
  console.log(JSON.stringify(await probeCodex(endpoint), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
