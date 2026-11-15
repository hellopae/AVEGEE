import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// F7 (owner 15 Nov, a1): no speech box under the enemies.  It was cut on 14 Nov (e4); the template must never bring a .battle-scene-talk element back.
test('F7: the battle window renders no enemy speech box (B.talk stays internal text)', () => {
  const ui = read('src/ui.js');
  assert.ok(!/class="battle-scene-talk/.test(ui) && !/battle-scene-talk['"`]\s*>/.test(ui), 'no element with class battle-scene-talk is built');
  assert.match(ui, /no speech box under the enemies - demons, werewolves/);
});
// F9 (owner 15 Nov, a2): the enemy name plate never draws a box.
test('F9: enemy plates are boxless in every state (stylesheet pinned, cache id bumped)', () => {
  const css = read('src/command-wheel.css'), html = read('index.html');
  assert.match(css, /\.arena\.combat-arena \.foe-group \.fig\.foe \.plate,[^{]*\{background:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important/);
  assert.match(html, /src\/command-wheel\.css\?v=20261029-c1-v2-q3-t1bugs"/);
});
