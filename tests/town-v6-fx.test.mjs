// Z1-LAYOUT-B2: HD-2D atmosphere data + clock + cloud / shadow motion for Zone 1 (src/town-v6-fx.js, town-v6-fx-data.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync, readdirSync} from 'node:fs';
import {FX_Z1 as F} from '../src/town-v6-fx-data.js';
import {TOWN_V6 as D} from '../src/town-v6-data.js';
import {TOWN_V6_WALK_RUNS} from '../src/town-owner-walkmask-th6.js';
import {tickTownV6Fx, townV6FxClock, townV6FxFrozen, resetTownV6FxClock, cloudX, cloudShadowRects, pointInRegion, fxRegion, frontBlurAmount, fxLevelBudget, FX_LEVELS, fxSheetUrls, fxBootUrls, parallaxOffset} from '../src/town-v6-fx.js';
globalThis.Image ??= class {};
const ROOT = new URL('..', import.meta.url).pathname;
const CELL = D.cell, COLS = D.world.w / CELL, ROWS = D.world.h / CELL;
const floor = (() => { const g = new Uint8Array(COLS * ROWS); let i = 0, on = 0; for (const n of TOWN_V6_WALK_RUNS) { if (on) g.fill(1, i, i + n); i += n; on ^= 1; } return g; })();
const walkable = (x, y) => floor[Math.floor(y / CELL) * COLS + Math.floor(x / CELL)] === 1;
const polyBox = polys => { let b = [1e9, 1e9, -1e9, -1e9]; for (const p of polys) for (let i = 0; i < p.length; i += 2) { b = [Math.min(b[0], p[i]), Math.min(b[1], p[i + 1]), Math.max(b[2], p[i]), Math.max(b[3], p[i + 1])]; } return b; };
/** every walk-floor sample (8 unit grid) that lies inside a region */
function overlapWithFloor(name) { const [x0, y0, x1, y1] = polyBox(fxRegion(name)); let n = 0, total = 0; for (let y = y0; y < y1; y += CELL) for (let x = x0; x < x1; x += CELL) if (pointInRegion(name, x, y)) { total++; if (walkable(x, y)) n++; } return { n, total }; }

test('liquid regions: lava is the left stream + the arch, water is the river, ice is the east stream', () => {
  for (const k of ['lava', 'water', 'ice', 'mistWater', 'mistLava', 'mistIce', 'ground']) assert.ok(F.regions[k].length > 0, k);
  const lb = polyBox(fxRegion('lava')), ib = polyBox(fxRegion('ice')), wb = polyBox(fxRegion('water'));
  assert.ok(lb[2] < 1200 && lb[0] < 150, 'lava stays on the left side: ' + lb);
  assert.ok(ib[0] > 2800, 'ice stream is east: ' + ib);
  assert.ok(wb[1] > 1250, 'river is the lower band: ' + wb);
  assert.ok(pointInRegion('lava', 900, 1560), 'under the big left arch it is LAVA (owner feedback), not purple water');
  assert.ok(!pointInRegion('water', 900, 1560), 'no water inside the lava arch');
  assert.ok(pointInRegion('water', 2400, 1900) && !pointInRegion('lava', 2400, 1900), 'river is water only');
  assert.ok(!pointInRegion('lava', 2400, 1000) && !pointInRegion('water', 2075, 1281), 'plaza is not liquid');
});
test('lava, water and every mist zone never overlap the walk floor (plaza, stairs, bridges)', () => {
  for (const k of ['lava', 'water', 'ice', 'mistWater', 'mistLava', 'mistIce']) { const r = overlapWithFloor(k); assert.ok(r.total > 20, k + ' has area'); assert.ok(r.n <= r.total * .005, `${k}: ${r.n}/${r.total} floor cells inside`); }
});
test('mist zones keep clear of the plaza, the buildings and the trees (object boxes)', () => {
  const heavy = D.objects.filter(o => ['building', 'station', 'gate'].includes(o.cat));
  for (const k of ['mistWater', 'mistLava', 'mistIce']) for (const o of heavy) {
    const [x, y, w, h] = o.box; let inside = 0, tot = 0;
    for (let yy = y + h * .35; yy < y + h; yy += 12) for (let xx = x + w * .15; xx < x + w * .85; xx += 12) { tot++; if (pointInRegion(k, xx, yy)) inside++; }   // the lower body of the building
    assert.ok(inside / tot < .12, `${k} over ${o.id} ${o.label}: ${inside}/${tot}`);
  }
});
test('emitter points sit inside the region they belong to', () => {
  for (const [pt, region] of [['lavaBubble', 'lava'], ['lavaSteam', 'mistLava'], ['sparkle', 'water'], ['waterMist', 'mistWater'], ['iceMist', 'mistIce'], ['embers', 'lava']])
    for (const [x, y] of F.points[pt]) assert.ok(pointInRegion(region, x, y), `${pt} ${x},${y} not in ${region}`);
  assert.equal(F.points.lavaFall.length, 1);
  assert.ok(pointInRegion('lava', ...F.points.lavaFall[0].map((v, i) => i ? v - 6 : v)), 'the lava fall lands in the arch lava');
  for (const [x, y] of F.points.foam) assert.ok(y > 1400 && y < 1800 && pointInRegion('water', x, y + 10), 'foam sits on the river bank');
});
test('torches: three street lamps + the copper cauldron, not placed from suggestedPlacement blindly', () => {
  assert.equal(F.torches.length, 4);
  const lamps = D.objects.filter(o => o.cat === 'lamp');
  for (const [x, y] of F.torches.slice(0, 3)) assert.ok(lamps.some(o => x > o.box[0] - 8 && x < o.box[0] + o.box[2] + 8 && Math.abs(y - o.box[1]) < 70), `flame ${x},${y} on a lamp`);
});
test('ground mask (cloud shadows): not the sky, yes the plaza / mountains / river', () => {
  assert.ok(!pointInRegion('ground', 1900, 60) && !pointInRegion('ground', 600, 20), 'sky is outside the shadow mask');
  for (const [x, y] of [[2075, 1281], [900, 1560], [2400, 1900], [1000, 600]]) assert.ok(pointInRegion('ground', x, y), `${x},${y}`);
});
test('fx sheets: every sheet exists, is a single row of frames, the frame order is valid, total size is small', () => {
  let total = 0;
  for (const [id, s] of Object.entries(F.sheets)) {
    const f = ROOT + s.src; assert.ok(existsSync(f), id); total += statSync(f).size;
    assert.ok(s.order.every(i => i >= 0 && i < s.n), id + ' order'); assert.equal(s.src, `img/map-zone1/v6/fx/${id}.webp`);
    const b = readFileSync(f), w = 1 + b[24] + (b[25] << 8) + (b[26] << 16);        // VP8L / VP8X canvas width (lossless sheets)
    if (b.toString('latin1', 12, 16) === 'VP8X') assert.equal(w, s.fw * s.n, id + ' width = frameW x frames');
  }
  assert.ok(total < 6 * 1024 * 1024, 'fx sheets ' + total);
  assert.deepEqual(readdirSync(ROOT + 'img/map-zone1/v6/fx').sort(), Object.keys(F.sheets).map(i => i + '.webp').sort(), 'no stray / missing sheet');
  assert.equal(fxSheetUrls().length, Object.keys(F.sheets).length); assert.equal(fxBootUrls().length, 2);
  for (const k of ['spirit-river', 'lava-surface']) assert.equal(F.sheets[k].tile, 'x', k + ' is the drawn x-tileable tile');
});
test('fx clock: runs only while the game runs (pause, reduced motion, hidden tab freeze it; long gaps never jump it)', () => {
  resetTownV6FxClock(0);
  tickTownV6Fx(1000, false, false); tickTownV6Fx(1016, false, false); tickTownV6Fx(1032, false, false);
  assert.equal(townV6FxClock(), 32);
  tickTownV6Fx(1048, true, false); tickTownV6Fx(5000, true, false); assert.equal(townV6FxClock(), 32, 'paused'); assert.ok(townV6FxFrozen());
  tickTownV6Fx(5016, false, false); assert.equal(townV6FxClock(), 48, 'first frame after pause: one frame, not the whole pause');
  tickTownV6Fx(9000, false, false); assert.equal(townV6FxClock(), 148, 'long gap (tab switch) clamps to 100 ms');
  const c = townV6FxClock(); tickTownV6Fx(9016, false, true); tickTownV6Fx(9500, false, true); assert.equal(townV6FxClock(), c, 'reduced motion = still'); resetTownV6FxClock(0);
});
test('sky clouds drift at constant speed (sub-pixel smooth), the farther one slower; shadows move with them', () => {
  const v = [15, 9, 12];
  for (const i of [0, 1, 2]) {
    let prev = cloudX(i, 0), maxStep = 0, minStep = 1e9;
    for (let t = 16; t <= 20000; t += 16) { const x = cloudX(i, t), d = x - prev; if (d > 0) { maxStep = Math.max(maxStep, d); minStep = Math.min(minStep, d); } prev = x; }
    assert.ok(Math.abs(maxStep - v[i] * .016) < 1e-6 && Math.abs(minStep - v[i] * .016) < 1e-6, `cloud ${i} step per 16 ms = ${v[i] * .016}`);
    assert.ok(Math.abs(cloudX(i, 1000) - cloudX(i, 0) - v[i]) < 1e-6 || cloudX(i, 1000) < cloudX(i, 0), 'moves right at v');
  }
  assert.ok(cloudX(1, 5000) - cloudX(1, 0) < cloudX(0, 5000) - cloudX(0, 0), 'the smaller, farther cloud is slower');
  // wraps: after a long time it is still inside [-w - pad, W + pad] and comes back from the left
  for (const i of [0, 1, 2]) { const w = D.clouds[i].box[2]; for (const t of [0, 1e5, 3e5, 7e5, 1.2e6]) { const x = cloudX(i, t); assert.ok(x >= -w - 760 - 1 && x <= D.world.w + 760 + 1, `cloud ${i} t=${t} x=${x}`); } }
  const r0 = cloudShadowRects(0), r1 = cloudShadowRects(10000);
  r0.forEach((r, i) => assert.ok(Math.abs((r1[i].x - r.x) - 10 * [15, 9, 12][[0, 1, 2, 0, 2][i]]) < 1e-6 || r1[i].x < r.x, 'shadow ' + i + ' moves with its cloud'));
});
test('parallax: sky < clouds < mountains < ground (offset share), centred camera = no shift', () => {
  const v = { x0: 0, x1: 700 }; const c = { x0: (D.world.w - 700) / 2, x1: (D.world.w - 700) / 2 + 700 };
  assert.equal(parallaxOffset(c, .5), 0);
  const o = p => Math.abs(parallaxOffset(v, p));
  assert.ok(o(.9) > o(.97) && o(.78) > o(.9) && o(1) === 0, 'slower layers shift more against the camera');
});
test('front blur: objects well below the character are out of focus, near ones sharp; quality tiers only add', () => {
  assert.equal(frontBlurAmount(1300, 1300), 0); assert.equal(frontBlurAmount(1500, 1300), 0); assert.ok(frontBlurAmount(1900, 1300) > .3 && frontBlurAmount(2300, 1300) === 1);
  assert.ok(frontBlurAmount(1000, 1300) === 0, 'objects behind the character are not front-blurred (the screen tilt-shift softens the far top)');
  const [lo, me, hi] = FX_LEVELS.map(fxLevelBudget);
  for (const k of ['leaves', 'flakes', 'sparkle', 'foam', 'mist', 'shadows', 'clouds']) assert.ok(lo[k] <= me[k] && me[k] <= hi[k], k);
  assert.equal(lo.dof, 0, 'low = no tilt-shift'); assert.ok(hi.bloom && !me.bloom);
});
