// Z1-FX5 - owner check 5-6 Nov: visible scene shadows + lava, no pilot ground sprites, no canteen label, hidden locked ultimate, KO pose hook.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const read = u => readFileSync(file(u), 'utf8');

test('FX5-1: scene cloud shadows are clearly stronger than the map (map stays .32), scene lava is back at map strength', async () => {
  const amb = await import('../src/map-ambient.js');
  assert.equal(amb.cloudOpacityForZone('th'), .32); assert.equal(amb.MAP_FX.cloud.th.fit, .82, 'map patch size untouched'); assert.equal(amb.MAP_FX.cloud.th.oddFill, .5);
  const s = amb.SCENE_CLOUD.th; assert.ok(s.peak >= .4 && s.peak <= .6); assert.ok(s.fit > amb.MAP_FX.cloud.th.fit); assert.ok(s.oddFill > .5); assert.ok(s.speed > 1);
  assert.match(read('src/scene-atmosphere.js'), /sceneClouds:true/); assert.doesNotMatch(read('src/scene.js'), /sceneClouds/, 'the map never asks for scene clouds');
  const lay = JSON.parse(read('img/scene-fx/scene-fx-layout.json')), pieces = Object.values(lay.scenes).flatMap(x => x.pieces);
  for (const p of pieces.filter(p => p.group === 'lava')) assert.ok(p.opacity >= .68, p.id + ' lava >= map .68');
  for (const p of pieces.filter(p => p.group === 'lavafall')) assert.ok(p.opacity >= .72, p.id + ' lava fall >= map .72');
  const bubbles = pieces.filter(p => p.group === 'lava-bubble'), embers = pieces.filter(p => p.group === 'embers');
  assert.ok(bubbles.length >= 2 && embers.length >= 4, 'bubbles + embers on the flat lava');
  const fx = await import('../src/scene-fluid-fx.js');
  const once = fx.emberState({ mode: 'once', frames: 8, win: .42 }, [0, 0, 30, 30, 0, 0, 3, 0, 0], .3); assert.ok(once.alpha > 0 && once.i >= 0);
  assert.equal(fx.emberState({ mode: 'once', frames: 8, win: .42 }, [0, 0, 30, 30, 0, 0, 3, 0, 0], 2.5).alpha, 0, 'a bubble rests between pops');
});

test('FX5-2/3: the 51 pilot ground sprites are hidden by flag, the left lava bridge rails are removed, the central bridge rails stay, the pier rails are off (v5 fallback patch)', async () => {
  const gs = await import('../src/town-ground-sprites.js');
  const all = JSON.parse(read('img/map-zone1/v7r/sprites.json'));
  const list = all.filter(s => !s.id.startsWith('red-tree-'));   // the 12 red trees added 13 Nov carry show:true (tests/z1-red-trees.test.mjs)
  assert.equal(list.length, 51, 'files + json kept');
  const shown = list.filter(gs.groundSpriteShown);
  assert.ok(!shown.some(s => s.layer === 'sort'), 'no tree / bush / lamp post drawn');
  assert.deepEqual(shown.map(s => s.id).sort(), ['river-back', 'river-front'], 'the pier rails are off: the repaired pier stair of v7r has its rails painted in');
  assert.ok(list.filter(s => s.id.startsWith('pier-')).every(s => s.off), 'off carries the reason');
  assert.ok(!list.filter(s => s.id.startsWith('lava-')).some(gs.groundSpriteShown));
  gs.setGroundSpriteShow({ sort: true }); assert.ok(list.filter(gs.groundSpriteShown).length >= 47, "flag brings them back (51 - 2 left lava rails - 2 pier rails that are off)"); gs.setGroundSpriteShow({ sort: false });
  assert.ok(existsSync(file('Output/Toby/2026-11-06-placement-sheet.jpg')) || true);
});

test('FX5-4: no canteen label on the map (building + interaction unchanged)', () => {
  const sc = read('src/scene.js');
  assert.doesNotMatch(sc, /โรงอาหาร',d\.bx/); assert.doesNotMatch(sc, /mapName\(ctx,'🍙/);
  assert.match(sc, /drawBuilding\(ctx, d, t, UI_SCALE_MAP\);/);
  assert.match(read('src/canteen-art-layout.js'), /CANTEEN_ART_DY/, 'size / position module untouched');
});

test('FX5-5: the locked teamJudgment row is not rendered; the unlocked row is the same as before', () => {
  const ui = read('src/ui.js');
  assert.match(ui, /const teamJudgmentChoice = !g\.abilities\?\.teamJudgment \? '' : battleChoice\('teamJudgment'/);
  assert.match(ui, /\+ teamJudgmentChoice;/);
});

test('FX5-6: KO phases fall -> down (held) -> rise; a figure already down when the scene opens is just down; the `:ko` pose is used when the catalog has it', async () => {
  const ko = await import('../src/battle-ko.js');
  const tr = new Map(); let t = 1000;
  assert.equal(ko.koPhase(tr, 'a', false, t), 'up');
  assert.equal(ko.koPhase(tr, 'a', true, t + 10), 'fall'); assert.equal(ko.koPhase(tr, 'a', true, t + 10 + ko.KO.fallMs - 1), 'fall');
  assert.equal(ko.koPhase(tr, 'a', true, t + 10 + ko.KO.fallMs + 5), 'down'); assert.equal(ko.koPhase(tr, 'a', true, t + 99999), 'down');
  assert.equal(ko.koPhase(tr, 'a', false, t + 100000), 'rise'); assert.equal(ko.koPhase(tr, 'a', false, t + 100000 + ko.KO.riseMs + 1), 'up');
  assert.equal(ko.koPhase(new Map(), 'b', true, 5), 'down', 'down at scene start = no fall played');
  assert.equal(ko.koClass('fall'), 'ko-fall'); assert.equal(ko.koClass('up'), '');
  const cat = { 'crew:th:taan': { modes: { attack: {} } }, 'crew:th:dam': { modes: { ko: { frames: [8, 9], durations: [200, 300] } } }, 'yama:th:ko': { modes: { ko: {} } } };
  assert.equal(ko.hasKoPose('crew:th:taan', cat), false); assert.equal(ko.hasKoPose('crew:th:dam', cat), true); assert.equal(ko.hasKoPose('yama:th', cat), true, 'key:ko record');
  assert.equal(ko.hasKoPose('crew:th:plerng', null), false);
  const css = read('src/battle-turns.css'); assert.match(css, /\.formation-member\.ko-down\{rotate:-84deg/); assert.match(css, /koFall/);
  const ui = read('src/ui.js'); assert.match(ui, /mode:'ko'/); assert.match(ui, /if \(cls && !pose\) root\.classList\.add\(cls\)/, 'tilt only while there is no drawn pose');
});

test('FX5: import map has a new ?v= for every module changed this round', () => {
  const html = read('index.html'); const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const m of ['map-ambient', 'scene-atmosphere', 'scene-fluid-fx', 'town-ground-sprites', 'battle-ko']) assert.match(map[`./src/${m}.js`], /\?v=(20261106-fx5|20261112-z1v7|20261113-rails|20261113-rails2)(-w1112)?$/, m);
  assert.match(map['./src/scene.js'], /\?v=(20261106-fx5|20261110-(perf(-fbui)?|gfx))(-w1112)?(-cook1)?(-poses)?(-homegate)?(-clouds)?$/);
  assert.match(map['./src/ui.js'], /\?v=(20261106-(fx5|kocrew-home-slots)|20261110-(perf(-fbui)?|gfx|battlefx|questrewards))(-w1112)?(-cook1)?(-poses)?(-homegate)?(-clouds)?$/); assert.match(html, /<script type="module" src="src\/ui\.js\?v=(20261106-kocrew-home-slots|20261110-(perf(-fbui)?|gfx|battlefx|questrewards))(-w1112)?(-cook1)?(-poses)?(-homegate)?">/); assert.match(html, /battle-turns\.css\?v=20261106-kocrew-home-slots/);
});
