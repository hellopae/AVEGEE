// FB2-A (owner 13 Nov 2569, round 2) - city map feedback, items 1 3 4 6 7 (2 and 5 have their own notes in Output/Toby)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/game.js';
import { STATIONS, BAL, syncSceneZone } from '../src/data.js';
import { resetWalk, setBlocks, setNpcDiscs, canWalk, nearestWalk, isNarrowSpot, corridorWidth, NARROW_WIDTH } from '../src/walk.js?v=k1d';
import { WORKER_STANDBY, WORKER_RULES, workerStandbyPoint, advanceWorkers, stepWorkers, workerDiscs } from '../src/workers.js';
import { teamHudHtml } from '../src/team-hud.js';
import { TH_ATMOS_LAMPS } from '../src/scene-atmosphere.js';
import { TOWN_PROP_SITES } from '../src/town-layout.js?v=k1d';
import { groundSpriteDrawRect, GROUND_SPRITE_X_FIX } from '../src/town-ground-sprites.js';
globalThis.Image ??= class {};
const read = u => readFileSync(fileURLToPath(new URL('../' + u, import.meta.url)), 'utf8');
const ZONES = ['th', 'asia', 'west', 'cyberhell'];
function game(zone = 'th') {
  const g = createGame(); g.save = () => true; g.onChange = () => {};
  g.zone = zone; syncSceneZone(zone); resetWalk(); setBlocks([], []); setNpcDiscs([]);
  g.coin = 100000; g.food = 500; g.level = 6; g.paused = false; g.mobs = [];
  (g.zoneEvents.th ||= {}).frontierBreach = 'cleared'; g.zoneEventStatus = () => 'cleared';
  return g;
}

// ---- item 6: rice rate -------------------------------------------------------------------------------------------------------------
test('FB2-6: rice eaten per minute is about a third of before (0.5 -> 0.17 per working reaper per tick, 700 ms tick)', () => {
  const ticksPerMin = 60000 / BAL.tickMs;
  const before = 0.5 * ticksPerMin, after = BAL.foodEatRate * ticksPerMin;
  assert.ok(before > 42 && before < 44, 'old rate was ~43 per reaper per minute: ' + before);
  assert.ok(after <= before / 2.9 && after >= before / 3.2, `new rate ${after.toFixed(1)}/min per reaper is ~1/3 of ${before.toFixed(1)}`);
  assert.ok(WORKER_RULES.food <= .01, 'assistants eat a third too');
});
test('FB2-6: three reapers working for one minute eat ~44 rice (was ~129); the stock is measured through the real tick', () => {
  const g = game();
  for (const k of ['dam', 'plerng', 'kan']) g.hire(k);
  const slots = () => [{ progress: 0, need: 1e9, elapsedMs: 0, durationMs: 1e12, soul: { id: 1 } }];
  ['taan', 'dam', 'plerng'].forEach((k, i) => { const d = STATIONS.find(s => s.k === ['lokan', 'ngiw', 'dab'][i]); g.stations.push({ def: d, crewK: k, build: 0, fire: 0, slots: slots() }); g.crewOf(k).at = d.k; });
  g.finish = () => {};
  const f0 = g.food, N = Math.round(60000 / BAL.tickMs);
  const keep = Math.random; Math.random = () => .999;   // no random event takes stock during the minute
  try { for (let i = 0; i < N; i++) g.step(); } finally { Math.random = keep; }
  assert.equal(g.workingCrew.size, 3);
  const used = f0 - g.food;
  assert.ok(used > 40 && used < 50, 'used ' + used.toFixed(1) + ' (old ~129)');
});
test('FB2-6: no red "supplies out" banner in the team HUD (out of food = they simply stop); a starved member shows only the small icon in the map', () => {
  const g = game(); g.food = 0;
  const html = teamHudHtml(g, () => 'x.webp');
  assert.ok(!/เสบียงหมด|team-alert/.test(html), 'banner gone');
  const sc = read('src/scene.js');
  assert.match(sc, /FB2-6: small hunger icon over the head/);
  assert.match(sc, /worker\.supplyRest\|\|\(worker\.hunger\?\?100\)<=0/);
  assert.ok(!/team-alert/.test(read('src/team-hud.js')));
});

// ---- item 3: workers never wait on a bridge / stair -------------------------------------------------------------------------------------
for (const zone of ZONES) {
  test(`FB2-3 ${zone}: all six standby spots are on open ground (corridor >= ${NARROW_WIDTH}) and distinct`, () => {
    game(zone);
    const pts = WORKER_STANDBY.map((_, i) => workerStandbyPoint(i));
    assert.equal(new Set(pts.map(p => p.join())).size, 6);
    for (const p of pts) assert.ok(corridorWidth(...p) >= NARROW_WIDTH, `${zone} ${p} width ${corridorWidth(...p)}`);
  });
}
test('FB2-3: bridges / stairs are narrow, the plaza is not (the measure is meaningful)', () => {
  game('th');
  const bridge = nearestWalk(1280, 600), plaza = nearestWalk(1690, 1330);
  assert.ok(isNarrowSpot(...bridge), 'upper bridge stair is narrow: ' + corridorWidth(...bridge));
  assert.ok(!isNarrowSpot(...plaza), 'plaza is open: ' + corridorWidth(...plaza));
});
test('FB2-3: a stalled assistant on a bridge is not an obstacle for Yama and walks off to the standby plaza', () => {
  const g = game('th');
  const w = g.hireWorker(); assert.ok(w);
  [w.x, w.y] = nearestWalk(1280, 600); w.path = null; w.moving = false;
  assert.ok(isNarrowSpot(w.x, w.y));
  assert.equal(workerDiscs(g).length, 0, 'a worker standing on a narrow spot is no stand-still disc');
  w.job = { kind: 'gather', material: 'ngiwWood', phase: 'collect', worked: 0 };
  g.coin = 0; w.workTicks = WORKER_RULES.wageEvery;   // "waiting for wage": the job stalls and he used to freeze right here
  g.stations.push({ def: STATIONS.find(s => s.k === 'ngiw'), build: 0, fire: 0, slots: [] });
  stepWorkers(g); advanceWorkers(g, 120);
  assert.equal(w.funded, false, 'job is stalled');
  for (let i = 0; i < 6000 && isNarrowSpot(w.x, w.y); i++) { stepWorkers(g); advanceWorkers(g, 120); }
  assert.ok(!isNarrowSpot(w.x, w.y), 'left the narrow spot: ' + [w.x, w.y].map(Math.round));
  const slot = [0, 1, 2, 3, 4, 5].map(i => workerStandbyPoint(i));
  for (let i = 0; i < 6000 && !slot.some(p => Math.hypot(w.x - p[0], w.y - p[1]) < 24); i++) { stepWorkers(g); advanceWorkers(g, 120); }
  assert.ok(slot.some(p => Math.hypot(w.x - p[0], w.y - p[1]) < 24), 'ended on a standby spot');
  for (let i = 0; i < 400 && w.moving; i++) { stepWorkers(g); advanceWorkers(g, 120); }
  assert.equal(workerDiscs(g).length, 1, 'on the open plaza he is a stand-still disc again');
});

// ---- item 1: props -----------------------------------------------------------------------------------------------------------------
test('FB2-1: the two civic-stair lamps moved to the foot of the stair; the west palm is the same banyan sprite as the other trees', () => {
  assert.deepEqual(TH_ATMOS_LAMPS.map(l => [l.x, l.y]), [[1764, 1247], [1937, 1240]]);
  assert.ok(!TOWN_PROP_SITES.some(p => p.kind === 'palm'), 'no palm prop in the zone-1 city');
  const west = TOWN_PROP_SITES.find(p => p.id === 'banyan-west'), east = TOWN_PROP_SITES.find(p => p.id === 'banyan');
  assert.ok(west && east && west.kind === 'tree' && west.biome === east.biome && west.w === east.w && west.y === east.y);
});
test('FB2-1: trade button sits closer to the merchant (54 instead of 72 above his feet in the city)', async () => {
  const { mapInteractions } = await import('../src/proximity.js');
  const g = game('th'); const m = { x: 700, y: 1000, name: 'x' };
  const t = mapInteractions(g, m).find(x => x.kind === 'merchant');
  if (t) assert.equal(m.y - t.by, 54);
  else assert.match(read('src/proximity.js'), /isTownZone\(g\.zone\)\?54:92/);
});

// ---- item 7: one lock text ----------------------------------------------------------------------------------------------------------------
test('FB2-7: a locked site shows one text (the ground plaque, smaller); the box with the name above it is gone and cannot be clicked', async () => {
  const sc = read('src/scene.js');
  assert.match(sc, /a locked site shows ONE text/);
  assert.match(sc, /if \(g\?\.buildLocked\?\.\(def\.k\)\) return false;/);
  const tm = read('src/town-map.js');
  assert.match(tm, /PLAQUE_S=\.68/);
  assert.ok(!/ctx\.drawImage\(cached\.cv,x-cached\.w\/2,bottom-h,cached\.w,h\)/.test(tm), 'the plaque is no longer stamped at full size');
});

// ---- item 4: bubbles -----------------------------------------------------------------------------------------------------------------------
test('FB2-4: every ambient crew line uses one bubble size (.74, Nira\'s size), centred over the head, kept on the stage and lifted when two overlap', async () => {
  const src = read('src/scene.js');
  assert.match(src, /const BUBBLE_SCALE = \.74;/);
  assert.ok(!/c\.k === 'nira' \? \.74 : 1/.test(src), 'no per-character size any more');
  assert.match(src, /bubble\(ctx, `\$\{c\.name\}: \$\{c\.say\}`, c\.x, c\.y - CREW_H \* characterScale\(c\.k\) - 18, BUBBLE_SCALE, placedBubbles\)/);
  // run the function: two bubbles at the same head, one at the far left edge
  const helpers = src.slice(src.indexOf('function bubble('), src.indexOf('function mapName('));
  const { runInNewContext } = await import('node:vm');
  const rects = [];
  const ctx = { save() {}, restore() {}, translate(x, y) { this.t = [x, y]; }, scale(s) { this.s = s; }, measureText: t => ({ width: String(t).length * 6 }), beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, stroke() {}, fillText(t, x, y) { rects.push({ t, at: this.t, s: this.s }); }, rr() {} };
  const placed = [];
  runInNewContext(`const MAP_NAME_SIZE=8, UI_SCALE_MAP=1.2, SCENE={w:1678}; ${helpers};
    bubble(ctx,'ทัณฑ์: สวัสดี',400,300,.74,placed); bubble(ctx,'นิรา: ดีจ้ะ',400,300,.74,placed); bubble(ctx,'ใกล้ขอบซ้าย',2,300,.74,placed); bubble(ctx,'ขอบขวา',1676,300,.74,placed);`, { ctx, placed, rr() {} });
  assert.equal(placed.length, 4);
  for (const r of placed) { assert.ok(r.x >= 6 - 1e-9 && r.x + r.w <= 1678 - 6 + 1e-9, 'inside the stage ' + JSON.stringify(r)); }
  const [a, b] = placed; assert.ok(b.y + b.h < a.y || b.y > a.y + a.h, 'the second bubble does not sit on the first');
  assert.ok(Math.abs((a.x + a.w / 2) - 400) < 1, 'centred on the head');
  assert.ok(rects.every(r => r.s === .74));
});

// ---- item 5: bridge rails ---------------------------------------------------------------------------------------------------------------------
test('FB2-5: the two bridge-rail sprites are drawn x3.5 wider about the centre of their opaque part; any other sprite is untouched', () => {
  const back = { id: 'river-back', rectWorld: [1844.55, 1479.97, 50.4, 513.55] };
  const r = groundSpriteDrawRect(back), fix = GROUND_SPRITE_X_FIX['river-back'];
  assert.ok(Math.abs(r[2] - 50.4 * 3.5) < 1e-9 && r[1] === back.rectWorld[1] && r[3] === back.rectWorld[3], 'only X changes');
  assert.ok(Math.abs((r[0] + fix.pivot * r[2]) - (back.rectWorld[0] + fix.pivot * 50.4)) < 1e-9, 'the pivot stays where it was');
  const other = { id: 'city-tree-08', rectWorld: [2376.14, 775.21, 103.2, 69.25] };
  assert.deepEqual(groundSpriteDrawRect(other), other.rectWorld);
  assert.deepEqual(Object.keys(GROUND_SPRITE_X_FIX).sort(), ['river-back', 'river-front']);
});
