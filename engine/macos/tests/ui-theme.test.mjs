import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const renderer = await fs.readFile(path.join(root, "assets", "renderer-inject.js"), "utf8");
const css = await fs.readFile(path.join(root, "assets", "dream-skin.css"), "utf8");
const injector = await fs.readFile(path.join(root, "scripts", "injector.mjs"), "utf8");

for (const attribute of [
  "data-dream-ui-profile",
  "data-dream-home-surface",
  "data-dream-task-surface",
  "data-dream-decoration-profile",
]) {
  assert.match(renderer, new RegExp(attribute), `renderer should map ${attribute}`);
}

for (const property of [
  "--ds-ui-density",
  "--ds-ui-radius",
  "--ds-home-opacity",
  "--ds-task-opacity",
  "--dream-studio-bg-blur",
  "--dream-studio-bg-brightness",
  "--dream-studio-bg-dim",
]) {
  assert.match(renderer, new RegExp(property), `renderer should map ${property}`);
}

assert.match(
  renderer,
  /ART_ATTRS[\s\S]*data-dream-ui-profile/,
  "UI attributes should be part of root cleanup state.",
);
assert.match(
  renderer,
  /THEME_VARIABLES[\s\S]*--ds-ui-density/,
  "UI properties should be part of root cleanup state.",
);

assert.match(css, /data-dream-ui-profile="gt-control"/, "GT profile CSS should exist.");
assert.match(css, /data-dream-ui-profile="glass-studio"/, "Glass Studio profile CSS should exist.");
assert.match(css, /data-dream-ui-profile="editorial"/, "Editorial profile CSS should exist.");
assert.match(css, /--dream-studio-bg-blur/, "studio background blur should be a runtime CSS variable.");
assert.match(injector, /const studio\s*=[\s\S]*backgroundBlur/, "injector should validate safe studio effect settings.");
assert.match(injector, /theme\.studio\s*=/, "injector should preserve safe studio effect settings.");
assert.match(css, /filter:\s*blur\(var\(--dream-studio-bg-blur\)\) brightness\(var\(--dream-studio-bg-brightness\)\)/, "studio background effects should apply to art layers.");
assert.match(css, /body::before[\s\S]*--dream-studio-bg-blur/, "wide window backgrounds should also receive studio blur.");
assert.match(css, /--dream-studio-bg-dim/, "studio background dim should be a visible runtime CSS variable.");
assert.match(css, /body::after[\s\S]*--dream-studio-bg-dim/, "wide window backgrounds should receive a dim overlay, not brightness only.");
assert.match(
  css,
  /data-dream-motion-profile="gt-broadcast"[\s\S]{0,260}main\.main-surface:not\(\.dream-skin-home-shell\) article[\s\S]{0,220}background:\s*rgb\(var\(--ds-panel-rgb\) \/ var\(--ds-task-opacity/,
  "GT task message styling should honor the task opacity slider.",
);
assert.match(
  css,
  /data-feature="game-source"[\s\S]*word-break:\s*keep-all !important/,
  "home title should not split Chinese words into ugly single-character final lines.",
);
assert.match(
  css,
  /data-feature="game-source"\] button[\s\S]*white-space:\s*nowrap !important/,
  "project pill should stay intact inside the home title.",
);
for (const capability of [
  "aside.app-shell-left-panel",
  "bg-token-list-hover-background",
  "group\\/home-suggestions button",
  "composer-surface-chrome",
  "main.main-surface:not(.dream-skin-home-shell) article",
  ":focus-visible",
]) {
  assert.ok(
    css.includes(capability),
    `GT profile should style ${capability}`,
  );
}
assert.match(
  css,
  /data-dream-ui-profile="gt-control"[\s\S]*group\\\/home-suggestions button \*[\s\S]*color:\s*currentColor !important/,
  "GT suggestion card descendants should inherit a readable foreground.",
);
assert.doesNotMatch(
  css,
  /aside\[class\*="ml-auto"\]\[class\*="h-full"\]/,
  "theme CSS must not override Codex's right preview, document, or webview pane.",
);
assert.doesNotMatch(
  css,
  /main\.main-surface\s*\{[\s\S]{0,220}overflow:\s*hidden !important/,
  "theme CSS must not clip native dialogs or new feature overlays in the main workspace.",
);
assert.doesNotMatch(
  css,
  /main\.main-surface:not\(\.dream-skin-home-shell\) > \*\s*\{[\s\S]{0,100}z-index:\s*1/,
  "theme CSS must not force a stacking order on every native main-workspace child.",
);
assert.doesNotMatch(
  css,
  /body > \*\s*\{[\s\S]{0,100}z-index:\s*1/,
  "theme CSS must not force native body portals behind its decorative layer.",
);
assert.match(
  css,
  /data-dream-ui-profile="gt-control"\]\[data-dream-shell="dark"\][\s\S]*--ds-gt-sidebar:/,
  "GT profile should define an explicit dark sidebar material.",
);
assert.match(renderer, /dream-skin-decorations/, "renderer should own one decoration container.");
assert.match(renderer, /setAttribute\("aria-hidden", "true"\)/, "decorations should be hidden from accessibility APIs.");
assert.match(
  renderer,
  /DECORATIONS[\s\S]*textContent/,
  "theme decoration text should be assigned as text, never interpreted as markup.",
);
assert.match(
  css,
  /\.dream-skin-decorations\s*\{[\s\S]*?pointer-events:\s*none/,
  "decoration container must not intercept clicks.",
);
assert.match(
  css,
  /\.dream-skin-decorations \*\s*\{[\s\S]*?pointer-events:\s*none/,
  "decoration descendants must not intercept clicks.",
);

console.log("PASS: renderer maps and cleans complete UI profile state.");
