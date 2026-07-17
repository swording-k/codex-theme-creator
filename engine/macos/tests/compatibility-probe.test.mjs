import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { gradeProbe, routeIsSettled, selectCodexTarget } from "../scripts/compatibility-probe.mjs";

const probeSource = await fs.readFile(fileURLToPath(new URL("../scripts/compatibility-probe.mjs", import.meta.url)), "utf8");
assert.match(
  probeSource,
  /\[data-virtualized-turn-content\]/,
  "task route probing should recognize the current Codex virtualized transcript container",
);

assert.deepEqual(
  gradeProbe({ shell: 1, sidebar: 1, composer: 1, cards: 1 }),
  { status: "compatible", missingCritical: [], missingOptional: [] },
);
assert.equal(
  gradeProbe({ shell: 1, sidebar: 0, composer: 1, cards: 1 }).status,
  "incompatible",
);
assert.deepEqual(
  gradeProbe({ shell: 1, sidebar: 1, composer: 1, cards: 0 }),
  { status: "degraded", missingCritical: [], missingOptional: ["cards"] },
);
assert.deepEqual(
  gradeProbe(
    { shell: 1, sidebar: 1, composer: 1, cards: 0, projectSelector: 1 },
    { expectedOptional: ["projectSelector"] },
  ),
  { status: "compatible", missingCritical: [], missingOptional: [] },
);
assert.equal(
  selectCodexTarget([
    { type: "page", url: "app://-/index.html?initialRoute=%2Favatar-overlay", id: "overlay" },
    { type: "page", url: "app://-/avatar-overlay-composition-surface.html", id: "pet" },
    { type: "page", url: "app://-/index.html", id: "main" },
  ]).id,
  "main",
);
assert.equal(routeIsSettled({ route: "task", counts: { transcript: 0 } }), false);
assert.equal(routeIsSettled({ route: "task", counts: { transcript: 2 } }), true);
assert.equal(routeIsSettled({ route: "home", counts: { projectSelector: 0 } }), false);
assert.equal(routeIsSettled({ route: "home", counts: { projectSelector: 1 } }), true);

console.log("PASS: compatibility probe grades critical and optional capabilities.");
