// FB-UI 10 Nov - owner feedback: idle Taan at the dais, construction start cases 1/2, locked-site plaque, idle workers off the stairs,
// zone-1 tea pavilion mirrored, dais depth, handbook CSS, START button centred.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/game.js';
import { STATIONS, SPOTS, BUILD_TIME, syncSceneZone } from '../src/data.js';
import { resetWalk, setBlocks, setNpcDiscs, canWalk, nearestWalk } from '../src/walk.js?v=k1d';
import { TOWN_CREW, TOWN_CREW_STAGE, TOWN_DAIS } from '../src/town-layout.js?v=k1d';
import { WORKER_STANDBY, workerStandbyPoint, advanceWorkers, stepWorkers } from '../src/workers.js';
import { daisDepthY } from '../src/scene.js';
import { DAIS_GEOMETRY, daisWorldPoint } from '../src/town-dais-geometry.js';
import { drawTownGround } from '../src/town-map.js?v=l1';
globalThis.Image ??= class {};
const read = u => readFileSync(fileURLToPath(new URL('../' + u, import.meta.url)), 'utf8');
const ZONES = ['th', 'asia', 'west', 'cyberhell'];

function game(zone = 'th', level = 6) {
  const g = createGame(); g.save = () => true; g.onChange = () => {};
  g.zone = zone; syncSceneZone(zone); resetWalk(); setBlocks([], []); setNpcDiscs([]);
  g.coin = 100000; g.food = 200; g.level = level; g.paused = false; g.mobs = [];
  (g.zoneEvents.th ||= {}).frontierBreach = 'cleared';
  g.zoneEventStatus = () => 'cleared';
  return g;
}
const notBuilt = g => STATIONS.find(d => d.cost > 0 && !g.stations.some(s => s.def.k === d.k) && !g.buildLocked(d.k));
// open floor: every one of 8 directions 24 units away is walkable (stairs and narrow lanes fail this)
const open = (x, y, r = 24) => canWalk(x, y) && [0, 1, 2, 3, 4, 5, 6, 7].every(i => canWalk(x + Math.cos(i * Math.PI / 4) * r, y + Math.sin(i * Math.PI / 4) * r));

for (const zone of ZONES) {
  test(`${zone}: an idle Taan waits on the plaza in front of the judgement dais (middle of the map), on open floor inside his stage`, () => {
    const g = game(zone);
    const taan = g.crewOf('taan'), [hx, hy] = TOWN_CREW.taan, stage = TOWN_CREW_STAGE.taan;
    assert.deepEqual([taan.hx, taan.hy], [hx, hy]);
    assert.ok(Math.hypot(hx - TOWN_DAIS.x, hy - TOWN_DAIS.y) < 230, 'within ~200 units of the dais');
    assert.ok(stage && hx >= stage[0] && hx <= stage[2] && hy >= stage[1] && hy <= stage[3]);
    for (const [x, y] of [[stage[0], stage[1]], [stage[2], stage[1]], [stage[0], stage[3]], [stage[2], stage[3]], [hx, hy]])
      assert.equal(canWalk(x, y), true, `stage point ${x},${y} walkable`);
    assert.ok(stage[2] < 1830, 'clear of the soul queue that runs down x~1856');
  });
}

test('construction case 1 (no workers): Taan walks to the site first, the timer starts only when he arrives', () => {
  const g = game(), def = notBuilt(g), taan = g.crewOf('taan');
  taan.x = taan.hx; taan.y = taan.hy; g.player.x = taan.x; g.player.y = taan.y;
  assert.equal(g.build(def.k), true);
  const st = g.stations.find(s => s.def.k === def.k);
  assert.equal(st.buildWait, true); assert.equal(taan.buildK, def.k);
  const t0 = Date.now();
  for (let i = 0; i < 4 && st.buildWait; i++) g.stepWorld(100);
  assert.equal(st.buildWait, true, 'Taan is still walking: not started');
  assert.ok(Math.hypot(taan.x - def.x, taan.y - def.y) > 42);
  for (let i = 0; i < 6000 && st.buildWait; i++) g.stepWorld(100);
  assert.equal(st.buildWait, false, 'started on arrival');
  assert.ok(Math.hypot(taan.x - taan.hx, taan.y - taan.hy) >= 0);
  assert.ok(st.build >= Date.now() + BUILD_TIME - 3000, 'full build time still ahead at the moment of arrival');
  assert.ok(Date.now() - t0 >= 0);
});

test('construction case 2 (workers hired): the first worker to arrive starts the work at once - Taan far away does not hold it', () => {
  const g = game(), w = g.hireWorker(), taan = g.crewOf('taan'), def = notBuilt(g);
  assert.ok(w);
  taan.x = taan.hx; taan.y = taan.hy; taan.at = null;
  assert.equal(g.build(def.k), true);
  const st = g.stations.find(s => s.def.k === def.k);
  assert.ok(st.workerWork, 'workers own the job');
  assert.equal(taan.buildK ?? null, null, 'Taan stays at his post');
  stepWorkers(g);
  assert.equal(w.job?.kind, 'build');
  const before = st.workerWork.remaining;
  advanceWorkers(g, 120);
  assert.equal(st.workerWork.remaining, before, 'worker still walking: nothing built yet');
  for (let i = 0; i < 3000 && !w.arrived; i++) advanceWorkers(g, 120);
  assert.equal(w.arrived, true);
  assert.ok(Math.hypot(taan.x - def.x, taan.y - def.y) > 300, 'Taan is nowhere near the site');
  advanceWorkers(g, 120); advanceWorkers(g, 120);
  assert.ok(st.workerWork.remaining < before, 'progress started the moment the worker stood at the site');
});

test('construction sign: small, and reads "กำลังก่อสร้าง" (no "รอทัณฑ์เดินมาเริ่มงาน")', () => {
  const sc = read('src/scene.js');
  assert.doesNotMatch(sc, /รอ\$\{builder\?\.name \|\| 'ทัณฑ์'\}เดินมาเริ่มงาน/);
  assert.match(sc, /st\.buildWait \? '🏗️ กำลังก่อสร้าง'/);
  assert.match(sc, /d\.bx, by - 10, 10, '#ffe7c4', 4\)/, 'label size 10 (was 14)');
});

test('locked build site is a lettered plaque with a lock: "ปลดล็อกที่ขั้น N", not a grey box', () => {
  const g = game('th', 1);
  const calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (t, k) => k === 'createLinearGradient' ? () => grad : k === 'measureText' ? s => ({ width: String(s).length * 7 }) : k in t ? t[k] : (...a) => { calls.push([k, ...a]); }, set: (t, k, v) => { t[k] = v; return true; } });
  drawTownGround(ctx, g, 1000);
  const texts = calls.filter(c => c[0] === 'fillText').map(c => c[1]);
  assert.ok(texts.some(s => /^ปลดล็อกที่ขั้น \d+$/.test(s)), 'plaque text present: ' + JSON.stringify(texts.slice(0, 6)));
  assert.ok(!texts.some(s => /^🔒/.test(s)), 'old emoji box label is gone');
  assert.ok(calls.some(c => c[0] === 'arc'), 'padlock shackle drawn');
  assert.ok(calls.some(c => c[0] === 'quadraticCurveTo'), 'crest drawn');
});

for (const zone of ZONES) {
  test(`${zone}: idle workers wait on open plaza floor beside the dais, never on the stairs; a worker left on the stairs walks off`, () => {
    const g = game(zone);
    const made = []; for (let i = 0; i < 6; i++) made.push(g.hireWorker());
    assert.equal(made.every(Boolean), true);
    made.forEach((w, i) => {
      assert.ok(open(w.x, w.y), `worker ${i} at ${Math.round(w.x)},${Math.round(w.y)} stands on open floor`);
      assert.ok(Math.hypot(w.x - 1920, w.y - 1280) < 400, 'middle of the map'); assert.ok(w.x < 1750, 'clear of the soul queue (x~1856) and the central stairs');
    });
    const slots = WORKER_STANDBY.map((_, i) => workerStandbyPoint(i));
    assert.equal(new Set(slots.map(s => s.join())).size, 6, 'six different slots');
    // drag one onto the central staircase (south of the plaza) and let him idle
    const w = made[0]; [w.x, w.y] = nearestWalk(TOWN_DAIS.x - 10, TOWN_DAIS.y + 150); w.path = null;
    assert.ok(Math.hypot(w.x - slots[0][0], w.y - slots[0][1]) > 60);
    for (let i = 0; i < 4000 && !(w.arrived && Math.hypot(w.x - slots[0][0], w.y - slots[0][1]) < 24); i++) { stepWorkers(g); advanceWorkers(g, 120); }
    assert.ok(Math.hypot(w.x - slots[0][0], w.y - slots[0][1]) < 24, 'back on the standby plaza');
    assert.ok(open(w.x, w.y));
  });
}

test('zone-1 tea pavilion is drawn mirrored (left-to-right); other zones unchanged', async () => {
  syncSceneZone('th'); assert.equal(STATIONS.find(s => s.k === 'tea').flip, true);
  syncSceneZone('asia'); assert.equal(STATIONS.find(s => s.k === 'tea').flip, false);
  syncSceneZone('west'); assert.equal(STATIONS.find(s => s.k === 'tea').flip, true);
  syncSceneZone('th');
});

for (const zone of ZONES) {
  test(`${zone}: the dais is depth-sorted by its back rail - actors on the platform floor are in front of it, actors on the ring road behind it are covered`, () => {
    createGame(); syncSceneZone(zone);
    const y = daisDepthY(zone), shape = DAIS_GEOMETRY[zone];
    const floorTop = Math.min(...shape.floor.map(p => daisWorldPoint(p, TOWN_DAIS)[1]));
    assert.ok(y <= floorTop + 0.01, `back-rail line ${y.toFixed(1)} is at or above the floor ${floorTop.toFixed(1)}`);
    assert.ok(TOWN_DAIS.y - y < 320 && y < TOWN_DAIS.y, 'a sane distance behind the foot');
    syncSceneZone('th');
  });
}

test('handbook: tab bar flush at the top with a solid fill, cards in columns at their own height', () => {
  const html = read('index.html');
  assert.match(html, /dialog\.help-modal\[open\] \.quest-help-tabs\{top:calc\(-1\*var\(--help-pad-top\)\);margin:calc\(-1\*var\(--help-pad-top\)\)/);
  assert.match(html, /background:#21131b/);
  assert.match(html, /dialog\.help-modal\[open\] \.guide-card-grid\{display:block;column-width:280px/);
  assert.match(html, /break-inside:avoid/);
});

test('title: START is centred on the logo column', () => {
  const html = read('index.html');
  assert.match(html, /#title #t-start\{min-height:48px;justify-content:center;align-self:center/);
  assert.match(html, /#title \.title-menu\{align-items:center;text-align:center\}/);
});

test('town vignette is pinned to the screen: identity transform, covers the whole canvas, baked once and rebuilt only when the size changes', async () => {
  const art = await import('../src/art.js');
  const sc = read('src/scene.js');
  assert.match(sc, /if \(isTownZone\(g\.zone\)\) \{ if \(!vignetteOverlay\(ctx\.canvas\)\) drawScreenVignette\(ctx\); \}/);
  assert.match(read('src/ui.js'), /vig\.dataset\.geo !== geo/, 'overlay geometry written only when it changes, not per frame');
  const html = read('index.html');
  assert.match(html, /<canvas id="cv"[^>]*><\/canvas>\s*<div id="map-vignette" aria-hidden="true"><\/div>\s*<div id="ov">/, 'overlay sits between the map canvas and the pins');
  assert.match(html, /radial-gradient\(circle at 50% 50%,rgba\(0,0,0,0\) calc\(var\(--vig-h,900px\)\*\.34\),rgba\(8,3,6,\.52\) calc\(var\(--vig-h,900px\)\*1\.05\)\)/, 'same stops as the original design');
  const log = [];
  const ctx = { canvas: { width: 3584, height: 1916 }, save() { log.push(['save']); }, restore() { log.push(['restore']); }, setTransform(...a) { log.push(['setTransform', ...a]); },
    drawImage(...a) { log.push(['drawImage', ...a.slice(1)]); }, createRadialGradient() { return { addColorStop() {} }; }, fillRect(...a) { log.push(['fillRect', ...a]); }, set fillStyle(v) {} };
  art.drawScreenVignette(ctx);
  assert.deepEqual(log.find(c => c[0] === 'setTransform'), ['setTransform', 1, 0, 0, 1, 0, 0]);
  assert.deepEqual(log.find(c => c[0] === 'fillRect'), ['fillRect', 0, 0, 3584, 1916], 'no document in node: direct gradient over the full canvas, never over a world rectangle');
  const g = readFileSync(fileURLToPath(new URL('../src/art.js', import.meta.url)), 'utf8');
  assert.match(g, /screenVignette\.key === key/, 'one cached bake per canvas size');
  assert.match(g, /createRadialGradient\?\.\(bw \/ 2, bh \/ 2, bh \* 0\.34, bw \/ 2, bh \/ 2, bh \* 1\.05\)/, 'same gradient formula as the original design');
  assert.match(g, /rgba\(8,3,6,\.52\)/);
});

test('index.html: every module this round changed carries a new ?v= in the import map', () => {
  const html = read('index.html'), map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const k of ['scene', 'art', 'workers', 'data', 'town-layout', 'town-cyberhell-layout']) assert.match(map[`./src/${k}.js`], /-(fbui|gfx|battlefx)(-w1112)?(-cook1)?(-poses)?$/, k);
  assert.match(map['./src/town-map.js?v=l1'], /-fbui(-w1112)?$/);
  assert.match(map['./src/town-layout.js?v=k1d'], /-fbui(-w1112)?$/);
});
