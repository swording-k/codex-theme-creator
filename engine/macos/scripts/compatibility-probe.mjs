import { pathToFileURL } from "node:url";

const CRITICAL = ["shell", "sidebar", "composer"];
const OPTIONAL = ["cards", "projectSelector", "transcript", "dialogs"];

export function gradeProbe(counts) {
  const source = counts && typeof counts === "object" ? counts : {};
  const missingCritical = CRITICAL.filter((name) => !Number.isFinite(source[name]) || source[name] < 1);
  const missingOptional = OPTIONAL.filter((name) => Object.hasOwn(source, name) && source[name] < 1);
  return {
    status: missingCritical.length ? "incompatible" : missingOptional.length ? "degraded" : "compatible",
    missingCritical,
    missingOptional,
  };
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
  const target = targets.find((candidate) => candidate.type === "page" && /^app:\/\//.test(candidate.url))
    ?? targets.find((candidate) => candidate.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("No Codex page target was found");
  const live = await cdpEvaluate(target.webSocketDebuggerUrl, `(() => {
    const count = (selector) => document.querySelectorAll(selector).length;
    const state = window.__CODEX_DREAM_SKIN_STATE__ || {};
    return {
      counts: {
        shell: count('main.main-surface, main'),
        sidebar: count('aside.app-shell-left-panel'),
        composer: count('.composer-surface-chrome, .ProseMirror'),
        cards: count('.group\\\\/home-suggestions button'),
        projectSelector: count('.group\\\\/project-selector'),
        transcript: count('main.main-surface article, [data-message-author-role]'),
        dialogs: count('[role="dialog"], [role="menu"]')
      },
      activeThemeId: state.themeId || null,
      runtimeVersion: state.version || null,
      uiProfile: document.documentElement.getAttribute('data-dream-ui-profile'),
      url: location.href
    };
  })()`);
  return { ...live, ...gradeProbe(live.counts), targetUrl: target.url };
}

async function main() {
  const endpoint = argument(process.argv.slice(2), "endpoint", "http://127.0.0.1:9341");
  console.log(JSON.stringify(await probeCodex(endpoint), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
