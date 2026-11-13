import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { codexCloudWeight, codexCloudDrift, codexCloudChunkRect, codexCloudsRequested, drawCodexClouds } from '../src/town-clouds-codex.js';

test('CLOUDS-COMPARE: off by default (no ?clouds=codex) and draws nothing then', () => {
  assert.equal(codexCloudsRequested(), false);
  let called = false; drawCodexClouds({ getTransform() { called = true; return {}; } }, 0);
  assert.equal(called, false, 'returns before touching the canvas');
});
test('A/B weight follows the Codex recipe (0 at 0 s, 1 at 12 s, 0 at 24 s) and the drift is a 48 s sine of amplitude [1.5, 0.3]', () => {
  assert.ok(Math.abs(codexCloudWeight(0)) < 1e-9); assert.ok(Math.abs(codexCloudWeight(12000) - 1) < 1e-9); assert.ok(Math.abs(codexCloudWeight(24000)) < 1e-9);
  const [dx, dy] = codexCloudDrift(12000); assert.ok(Math.abs(dx - 1.5) < 1e-9 && Math.abs(dy - .3) < 1e-9);
});
test('the 20 chunks tile the 3840 x 2560 world exactly and every file of both variants ships', () => {
  let area = 0; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const [, , w, h] = codexCloudChunkRect(r, c); area += w * h; for (const v of 'AB') assert.ok(existsSync(new URL(`../img/map-zone1/v7r-clouds/layer-${v}/r${r + 1}-c${c + 1}.webp`, import.meta.url)), `${v} r${r + 1}-c${c + 1}`); }
  assert.ok(Math.abs(area - 3840 * 2560) < 1, 'area ' + area);
  const last = codexCloudChunkRect(3, 4); assert.ok(Math.abs(last[0] + last[2] - 3840) < 1e-6 && Math.abs(last[1] + last[3] - 2560) < 1e-6);
});
test('the default game does not load the Codex layers (module is only called in scene.js behind the flag check inside it)', () => {
  const src = readFileSync(new URL('../src/town-clouds-codex.js', import.meta.url), 'utf8');
  assert.match(src, /if \(!codexCloudsRequested\(\)/);
});
