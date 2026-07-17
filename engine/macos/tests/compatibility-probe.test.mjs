import assert from "node:assert/strict";

import { gradeProbe } from "../scripts/compatibility-probe.mjs";

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

console.log("PASS: compatibility probe grades critical and optional capabilities.");
