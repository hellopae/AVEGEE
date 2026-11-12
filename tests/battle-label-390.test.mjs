// BATTLE-LABEL-390 (12 Nov 2569): foe plates with 1 / 2 / 3 enemies on a 390 px phone.  Browser check: docs/art-reviews/2026-11-12-battle-label (screenshots) — this guards the rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css = readFileSync(new URL('../src/battle-turns.css', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const tail = css.slice(css.indexOf('BATTLE-LABEL-390'));
test('portrait foe group is wide enough for three plates; names clamp to 2 lines, the HP line never wraps', () => {
  assert.ok(tail.length > 200);
  assert.match(tail, /@media screen and \(max-width:700px\)/);   // not the bare `@media(max-width:700px)` form: clean-404.test reads the LAST of those
  const width = +tail.match(/\.foe-group\{width:(\d+)%/)[1];
  assert.ok(width >= 70 && width <= 90, 'three plates need >= 70 % of a 390 px screen (was 48 %)');
  assert.match(tail, /\.plate b\{[^}]*-webkit-line-clamp:2[^}]*text-overflow:ellipsis/);
  assert.match(tail, /\.plate \.hpn\{[^}]*white-space:nowrap/);
  const names = +tail.match(/\.plate b\{[^}]*font-size:([\d.]+)px/)[1], hp = +tail.match(/\.hpn\{[^}]*font-size:([\d.]+)px/)[1];
  assert.ok(names >= 10 && hp >= 9, 'no 9 px names');
});
test('single-foe HUD name stays on one line (ellipsis, never cut in the middle of the name) and the foe talk box sits under the command rows', () => {
  assert.match(tail, /battle-boss-status b\{[^}]*white-space:nowrap[^}]*text-overflow:ellipsis/);
  assert.match(tail, /\.battle-scene-talk\{top:77%;bottom:auto/);
});
test('the command column stops above the squad cards instead of hanging over them', () => {
  assert.match(ui, /battle-team-hud'\),hudTop=/);
  assert.match(ui, /bounds=\{l:6,t:6,r:area\.width-6,b:Math\.max\(area\.height\*\.5,Math\.min\(area\.height-12,hudTop\)\)\}/);
});
