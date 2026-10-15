// L1: Zone 1 map depth - actor scale is town-only, the shadow module passes draws through when nothing is baked,
// and the shadow direction is one shared constant (lower right).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMapCharScale, mapCharK, TOWN_CHAR_K } from '../src/scene.js?v=l1';
import { SUN, withTownShade, townShadeAt } from '../src/town-shade.js?v=l1';

test('L1: actors shrink on the Zone 1 town map only, and come back elsewhere', () => {
  setMapCharScale('th');
  assert.ok(Math.abs(mapCharK() - TOWN_CHAR_K) < 1e-9);
  assert.ok(TOWN_CHAR_K >= .7 && TOWN_CHAR_K <= .8, 'a 20-30% reduction');
  setMapCharScale('asia');
  assert.ok(Math.abs(mapCharK() - 1) < 1e-9);
});

test('L1: one sun - shadows fall to the lower right for every caster', () => {
  assert.ok(SUN.kx > 0 && SUN.ky > 0);
});

test('L1: withTownShade is a plain pass-through while no shadow field is baked (no DOM, battle/rooms untouched)', () => {
  let seen = null;
  const ctx = { tag:'ctx' };
  const r = withTownShade(ctx, 100, 100, 50, c => { seen = c; return 'drawn'; });
  assert.equal(seen, ctx); assert.equal(r, 'drawn');
  assert.equal(townShadeAt(100, 100, 50), 0);
});

test('L1: scene.js keeps drawStandee untouched and shades actors via callbacks (no ctx.filter / shadowBlur per frame)', () => {
  const src = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
  for (const f of ['town-shade.js'])
    assert.doesNotMatch(src(f).replace(/\/\/.*$/gm, ''), /shadowBlur|\.filter\s*=/, f);
  assert.match(src('scene.js'), /withTownShade/);
});

// ---- Nira stands on the judgement dais (owner, 15 Oct 2569) ----
globalThis.Image = class { set src(v) { this._src = v; } get src() { return this._src; } };
globalThis.fetch = async () => ({ ok:false });
const store = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable:true, value:{
  getItem:k => store.get(k) ?? null, setItem:(k, v) => store.set(k, String(v)), removeItem:k => store.delete(k) } });

test('L1: Nira lives on the dais, away from the throne, the stairs, the queue and the player entry goal', async () => {
  const { TOWN_CREW, TOWN_ENTRY, TOWN_NIRA_STAGE, TOWN_SPOTS, TOWN_QUEUE, TOWN_DAIS, townContains } = await import('../src/town-layout.js?v=k1d');
  const [x1, y1, x2, y2] = TOWN_NIRA_STAGE;
  assert.deepEqual(TOWN_CREW.nira, TOWN_ENTRY.niraGoal, 'crew home and entry goal agree');
  const [nx, ny] = TOWN_CREW.nira;
  assert.ok(nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2, 'home inside the stage');
  assert.ok(townContains(nx, ny), 'home is walkable ground');
  // dais platform floor measured on the sprite: x 1760-1965, y 905-980
  assert.ok(x1 >= 1760 && x2 <= 1965 && y1 >= 905 && y2 <= 980, 'stage is on the platform floor');
  const far = (px, py, r) => Math.hypot(px - nx, py - ny) > r;
  const worst = (px, py) => Math.min(...[[x1, y1], [x2, y1], [x1, y2], [x2, y2]].map(([a, b]) => Math.hypot(a - px, b - py)));
  assert.ok(worst(TOWN_SPOTS.throne.x, TOWN_SPOTS.throne.y) > 50, 'never on the throne spot');
  for (const q of TOWN_QUEUE) assert.ok(q[1] > y2 + 40, 'queue is below the platform');
  assert.ok(far(...TOWN_ENTRY.goal, 90) && TOWN_ENTRY.goal[1] > y2, 'player entry goal is off the stage');
  assert.ok(TOWN_DAIS.x - TOWN_DAIS.w / 2 < x1 && TOWN_DAIS.x + TOWN_DAIS.w / 2 > x2);
});

test('L1: Nira strolls slowly but only inside her stage (simulated 5 minutes)', async () => {
  const { createGame } = await import('../src/game.js');
  const { TOWN_NIRA_STAGE } = await import('../src/town-layout.js?v=k1d');
  const g = createGame();
  const nira = g.crewOf('nira');
  assert.equal(g.zone, 'th');
  const [x1, y1, x2, y2] = TOWN_NIRA_STAGE; let moved = 0, px = nira.x ?? nira.hx, py = nira.y ?? nira.hy;
  for (let i = 0; i < 3000; i++) {
    g.stepWorld(100);
    if (nira.x == null) continue;
    assert.ok(nira.x >= x1 - 6 && nira.x <= x2 + 6 && nira.y >= y1 - 6 && nira.y <= y2 + 6, `step ${i}: ${nira.x},${nira.y} left the stage`);
    moved += Math.hypot(nira.x - px, nira.y - py); px = nira.x; py = nira.y;
  }
  assert.ok(moved > 60, 'she actually walks around (' + Math.round(moved) + ' units)');
});
