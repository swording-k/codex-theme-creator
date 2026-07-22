import assert from "node:assert/strict";

import { buildLivePetSwitchExpression } from "../lib/live-pet-selection.mjs";

const expression = buildLivePetSwitchExpression("mr-krabs");
assert.match(expression, /window\.electronBridge/, "uses Codex's own renderer bridge rather than editing the app");
assert.match(expression, /vscode:\/\/codex\/set-setting/, "uses Codex's live setting endpoint");
assert.match(expression, /selected-avatar-id/, "updates only the native selected pet setting");
assert.match(expression, /custom:mr-krabs/, "uses the validated custom pet id");
assert.throws(() => buildLivePetSwitchExpression("../outside"), /Invalid pet id/);

console.log("PASS: live pet switching uses the native Codex setting request.");
