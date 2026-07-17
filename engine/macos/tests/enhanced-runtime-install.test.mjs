import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const installer = await fs.readFile(
  path.resolve(here, "../../../scripts/install-enhanced-runtime.sh"),
  "utf8",
);

assert.match(
  installer,
  /for file in injector\.mjs stage-theme\.mjs/,
  "hot runtime installation must update both payload validation and theme staging",
);

console.log("PASS: enhanced runtime hot install covers every schema-v2 switch component.");
