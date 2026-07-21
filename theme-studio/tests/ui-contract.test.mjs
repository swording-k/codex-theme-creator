import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.resolve(here, "..", "public");
const html = await fs.readFile(path.join(publicRoot, "index.html"), "utf8");
const app = await fs.readFile(path.join(publicRoot, "app.js"), "utf8");
const css = await fs.readFile(path.join(publicRoot, "styles.css"), "utf8");

for (const removedControl of ["motionEffect", "motionIntensity", "signalLights", "telemetry", "rain"]) {
  assert.equal(html.includes(`name="${removedControl}"`), false, `${removedControl} should not be exposed in the MVP UI`);
}

for (const requiredControl of ["backgroundBlur", "backgroundDim", "homeOpacity", "taskOpacity", "accent"]) {
  assert.ok(html.includes(`name="${requiredControl}"`), `${requiredControl} remains available`);
}

assert.match(html, /让 Codex 创作新主题/, "app has a clear Codex creation entry");
assert.match(html, /id="exportTheme"/, "app can export a selected theme as a portable package");
assert.match(html, /id="importTheme"/, "app can import a portable theme package");
assert.match(html, /安装创作助手/, "app can install the real Codex creation Skill instead of implying a copied prompt is enough");
assert.match(html, /id="themePreview"/, "app has an in-app theme preview");
assert.match(html, /用户主题放哪里/, "app explains where user-created themes live");
assert.match(html, /请先在 Codex 设置中使用深色外观/, "app makes the dark-mode compatibility requirement explicit");
assert.match(app, /copyCreatePrompt/, "creation entry copies the Codex prompt");
assert.match(app, /loadCreatorStatus/, "app checks the creation Skill before offering the Codex prompt");
assert.match(app, /exportThemePackage/, "app downloads a portable theme package");
assert.match(app, /importThemePackage/, "app imports a user-selected theme package");
assert.match(app, /applyLocalPreview/, "sliders update the in-app preview immediately");
assert.doesNotMatch(app, /\/api\/preview/, "sliders should not trigger the unstable Codex live-preview endpoint on every drag");
assert.match(html, /点击“保存并启用”后才会写入 Codex/, "UI should explain when slider settings reach Codex");
assert.match(app, /--preview-bg-blur/, "preview uses the same blur setting as the theme package");
assert.match(app, /--preview-home-opacity/, "preview uses the home opacity slider");
assert.match(app, /chooseVisibleTheme/, "theme selection should stay on a visible card after saving or applying");
assert.match(app, /preferredIds/, "theme reload should prefer the user's current selection before falling back");
assert.match(app, /localStorage/, "theme selection and unfinished slider settings should survive an app refresh");
assert.match(app, /restoreDefaultTheme/, "the default Codex appearance should be a real restore action");
assert.match(app, /Codex 默认外观/, "the theme library should expose a return-to-default choice");
assert.match(html, /首页推荐卡片透明度/, "home opacity should describe the surface it really changes");
assert.match(html, /任务面板透明度/, "task opacity should describe the surface it really changes");
assert.doesNotMatch(html, /class="nav-list"/, "inactive navigation should not expose dead controls");
assert.doesNotMatch(html, /创作入口|自动切换/, "unfinished product areas should not look clickable");
assert.match(html, /preview-topbar/, "preview should render a complete Codex-like frame instead of a cropped center");
assert.match(css, /\.shell\s*\{[\s\S]*height:\s*100vh[\s\S]*overflow:\s*hidden/, "app shell should fit in one viewport");
assert.match(css, /\.workspace\s*\{[\s\S]*height:\s*100vh[\s\S]*overflow:\s*hidden/, "workspace should not grow with background previews");
assert.match(css, /\.theme-grid\s*\{[\s\S]*overflow:\s*auto/, "only the theme grid should scroll when the list is long");
assert.match(css, /\.preview-panel\s*\{[\s\S]*aspect-ratio:\s*16\s*\/\s*9/, "preview should preserve a full-window screenshot ratio");

console.log("PASS: theme studio UI exposes only working MVP controls.");
