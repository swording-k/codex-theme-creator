const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const CDP_ID_PATTERN = /^[A-Za-z0-9._-]{1,200}$/;
const PET_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

function assertPetId(id) {
  if (typeof id !== "string" || !PET_ID_PATTERN.test(id)) throw new Error("Invalid pet id");
  return id;
}

function validatedDebuggerUrl(target, port) {
  const url = new URL(target.webSocketDebuggerUrl);
  const validPath = /^\/devtools\/page\/[A-Za-z0-9._-]{1,200}$/.test(url.pathname);
  if (
    url.protocol !== "ws:" || !LOOPBACK_HOSTS.has(url.hostname) || Number(url.port) !== port
    || url.username || url.password || url.search || url.hash || !validPath
    || url.pathname !== `/devtools/page/${target.id}`
  ) throw new Error("Rejected an unsafe Codex CDP endpoint");
  return url.href;
}

function isCodexTarget(target, port) {
  if (
    target?.type !== "page" || !target.url?.startsWith("app://")
    || typeof target.id !== "string" || !CDP_ID_PATTERN.test(target.id)
    || !target.webSocketDebuggerUrl
  ) return false;
  try {
    validatedDebuggerUrl(target, port);
    return true;
  } catch {
    return false;
  }
}

class CdpSession {
  constructor(target, { port, WebSocketImpl = WebSocket }) {
    this.socket = new WebSocketImpl(validatedDebuggerUrl(target, port));
    this.pending = new Map();
    this.nextId = 1;
    this.closed = false;
  }

  async open() {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Codex live connection timed out")), 3500);
      this.socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      this.socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Could not open Codex live connection")); }, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.#onMessage(event));
    this.socket.addEventListener("close", () => this.close());
    await this.send("Runtime.enable");
    return this;
  }

  #onMessage(event) {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { this.close(); return; }
    const pending = message?.id ? this.pending.get(message.id) : null;
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message || "Codex live request failed"));
    else pending.resolve(message.result);
  }

  send(method, params = {}, timeoutMs = 6000) {
    if (this.closed) return Promise.reject(new Error("Codex live connection closed"));
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Codex live request timed out: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { this.socket.send(JSON.stringify({ id, method, params })); } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: false,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Codex renderer rejected the request");
    }
    return result.result?.value;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Codex live connection closed"));
    }
    this.pending.clear();
    try { this.socket.close(); } catch {}
  }
}

export function buildLivePetSwitchExpression(id) {
  const selectedAvatarId = `custom:${assertPetId(id)}`;
  return `(() => new Promise((resolve, reject) => {
    const bridge = window.electronBridge;
    if (!bridge || typeof bridge.sendMessageFromView !== "function") {
      reject(new Error("Codex runtime bridge is unavailable"));
      return;
    }
    const requestId = "ctc-pet-" + crypto.randomUUID();
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
    const onMessage = (event) => {
      const message = event.data;
      if (!message || message.type !== "fetch-response" || message.requestId !== requestId) return;
      cleanup();
      if (message.responseType === "success" && message.status >= 200 && message.status < 300) {
        resolve({ ok: true, selectedAvatarId: ${JSON.stringify(selectedAvatarId)} });
      } else {
        reject(new Error(message.error || message.bodyJsonString || "Codex rejected the pet change"));
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Codex did not confirm the pet change"));
    }, 5000);
    window.addEventListener("message", onMessage);
    Promise.resolve(bridge.sendMessageFromView({
      type: "fetch",
      requestId,
      method: "POST",
      url: "vscode://codex/set-setting",
      body: JSON.stringify({ params: { key: "selected-avatar-id", value: ${JSON.stringify(selectedAvatarId)} } }),
    })).catch((error) => {
      cleanup();
      reject(error);
    });
  }))()`;
}

const codexShellProbe = `Boolean(document.querySelector("main.main-surface") && document.querySelector("aside.app-shell-left-panel"))`;

export async function activateLivePet({ id, port = 9341, fetchImpl = fetch, WebSocketImpl = WebSocket }) {
  assertPetId(id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  let targets;
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/json/list`, { redirect: "error", signal: controller.signal });
    if (!response.ok) throw new Error(`Codex live endpoint returned HTTP ${response.status}`);
    targets = await response.json();
  } catch (error) {
    throw new Error(`Codex is not available for live switching: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!Array.isArray(targets)) throw new Error("Codex live endpoint returned invalid data");
  let lastError = new Error("No active Codex window accepted the pet change");
  for (const target of targets.filter((candidate) => isCodexTarget(candidate, port))) {
    const session = new CdpSession(target, { port, WebSocketImpl });
    try {
      await session.open();
      if (!await session.evaluate(codexShellProbe)) continue;
      const result = await session.evaluate(buildLivePetSwitchExpression(id));
      if (result?.ok) return { live: true, selectedAvatarId: result.selectedAvatarId };
    } catch (error) {
      lastError = error;
    } finally {
      session.close();
    }
  }
  throw new Error(`Codex did not accept live pet switching: ${lastError.message}`);
}
