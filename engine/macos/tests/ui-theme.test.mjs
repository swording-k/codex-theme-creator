import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const renderer = await fs.readFile(path.join(root, "assets", "renderer-inject.js"), "utf8");
const css = await fs.readFile(path.join(root, "assets", "dream-skin.css"), "utf8");

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
