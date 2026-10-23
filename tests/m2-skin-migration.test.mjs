// M2 T3: a zone whose painted-town skin is switched on after a save was made gets its positions moved ONCE; progress is untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, migrateTownSkinZone } from '../src/game.js';
import { enableTownSkin, disableTownSkin, isTownZone } from '../src/zone-skin.js';
import { syncSceneZone, SPOTS } from '../src/data.js';
import { TOWN_SPOTS, TOWN_GUARD_POST } from '../src/town-layout.js?v=k1d';
import { harbourTravel } from './helpers/travel.mjs';

globalThis.Image = class {};
const BENCH = [TOWN_SPOTS.bench.x + 60, TOWN_SPOTS.bench.y];
const off = () => { for (const z of ['asia','west','cyberhell']) if (isTownZone(z)) disableTownSkin(z); syncSceneZone('th'); };

// a save made while Zone 2 still uses the old 1678x937 map, player standing in Zone 2
function oldSave() {
  const g = createGame();
  assert.equal(harbourTravel(g, 'asia'), true);
  g.coin = 777;
  g.player.x = 1200; g.player.y = 600; g.items = [{ k:'rice', x:1100, y:500 }]; g.guard = { x:1000, y:700, k:'guard' };
  g.mobs = [{ id:9, x:900, y:650, hp:5, kind:6 }];
  const saved = JSON.parse(JSON.stringify(g.snapshot()));
  delete saved.townSkinMigrated;                      // a save written before M2
  return { g, saved };
}

test('skin off: restoring an old save changes nothing and sets no marker for zones 2-4', () => {
  off();
  const { g, saved } = oldSave();
  const r = createGame(); assert.equal(r.restore(saved), true);
  assert.equal(r.zone, 'asia'); assert.equal(r.coin, 777);
  assert.equal(r.player.x, 1200); assert.equal(r.player.y, 600);
  assert.equal(r.townSkinMigrated.asia, undefined);
  assert.equal(r.snapshot().townSkinMigrated.asia, undefined);
});

test('skin on: positions move to the town spawn once; coins kept; second restore does not move again', () => {
  off();
  const { saved } = oldSave();
  enableTownSkin('asia', {}, { fake:true });
  try {
    const r = createGame(); assert.equal(r.restore(saved), true);
    assert.equal(r.coin, 777);
    assert.deepEqual([r.player.x, r.player.y], BENCH);
    assert.deepEqual([r.guard.x, r.guard.y], TOWN_GUARD_POST);
    assert.equal(r.townSkinMigrated.asia, true);
    // walk somewhere, save, load again: marker stops a second move
    r.player.x = 2000; r.player.y = 1300;
    const again = createGame(); assert.equal(again.restore(JSON.parse(JSON.stringify(r.snapshot()))), true);
    assert.equal(again.player.x, 2000); assert.equal(again.player.y, 1300);
  } finally { off(); }
});

test('skin on: a zone left behind in zoneSave and the zone-entry snapshot are moved too, other zones are not', () => {
  off();
  const g = createGame(); assert.equal(harbourTravel(g, 'asia'), true);
  g.zoneSave.th = g.zoneSave.th || {}; g.zoneSave.asia = { items:[{ k:'rice', x:300, y:300 }], guard:{ x:400, y:400 }, mobs:[{ x:1, y:2 }], crew:[] };
  g.zoneSave.west = { items:[{ k:'rice', x:300, y:300 }], guard:{ x:400, y:400 }, mobs:[], crew:[] };
  const saved = JSON.parse(JSON.stringify(g.snapshot())); delete saved.townSkinMigrated;
  enableTownSkin('west', {}, { fake:true });
  try {
    const r = createGame(); r.restore(saved);
    assert.deepEqual([r.zoneSave.west.items[0].x, r.zoneSave.west.items[0].y], BENCH);
    assert.deepEqual([r.zoneSave.west.guard.x, r.zoneSave.west.guard.y], TOWN_GUARD_POST);
    assert.deepEqual([r.zoneSave.asia.items[0].x, r.zoneSave.asia.items[0].y], [300, 300], 'zone 2 skin is off: untouched');
    assert.equal(r.townSkinMigrated.west, true); assert.equal(r.townSkinMigrated.asia, undefined);
  } finally { off(); }
});

test('migrateTownSkinZone only touches positions', () => {
  const g = { zone:'asia', player:{ x:5, y:6, hp:9 }, items:[{ x:1, y:1, k:'a' }], guard:{ x:3, y:3, hp:4 }, mobs:[{ x:1, y:1, kind:2 }], crew:[], zoneSave:{}, roster:{} };
  migrateTownSkinZone(g, 'asia');
  assert.equal(g.player.hp, 9); assert.equal(g.guard.hp, 4); assert.equal(g.items[0].k, 'a'); assert.equal(g.mobs[0].kind, 2);
  assert.deepEqual([g.player.x, g.player.y], BENCH);
});
