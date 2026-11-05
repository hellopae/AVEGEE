// Z1-V5-FX3 — canteen mirrored + lowered, foam audit, ground loader that frees far tiles, animated construction sheets with the still picture as fallback.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const flush = async () => { for (let i = 0; i < 14; i++) await Promise.resolve(); };

test('canteen: mirrored like the old one and drawn lower (visual only), station / label / worker spot unchanged', async () => {
  const l = await import('../src/canteen-art-layout.js');
  assert.equal(l.CANTEEN_ART_FLIP.th, true);
  assert.ok(l.CANTEEN_ART_DY.th >= 16 && l.CANTEEN_ART_DY.th <= 40, 'a small step down onto the plaza');
  assert.equal(l.CANTEEN_ART_SCALE_BY_ZONE.th, 1.4, 'size stays (owner: size is fine)');
  const art = readFileSync(file('src/art.js'), 'utf8');
  assert.match(art, /y:def\.by-h\*\(CANTEEN_ART_FOOT_Y\[zone\]\?\?1\)\+\(physical\?0:CANTEEN_ART_DY\[zone\]\?\?0\)/);
  for (const fn of ['footOf', 'bodyBoxOf', 'blockRectsOf']) assert.match(art.slice(art.indexOf('export function ' + fn + '(def)')), /const box = stationBox\(def, true\);/, fn + ' (walk blocking) ignores the visual offset');
  const data = readFileSync(file('src/data.js'), 'utf8');
  assert.match(data, /bx:foodSite\.x,by:foodSite\.y,bw:foodSite\.w,x:foodSite\.x,y:foodSite\.y\+38/, 'the station def (position, worker spot) is not moved');
});

test('foam: 30 hand-checked crests (36 after FX3, 6 more cut in Claudy review), each cut / snap documented, anchors on the shore band', () => {
  const layout = JSON.parse(readFileSync(file('img/map-zone1/v5-fx/fx-layout.json'), 'utf8'));
  const crest = layout.pieces.find(p => p.id === 'river-foam--shore');
  assert.equal(crest.spots.length, 30);
  const src = readFileSync(file('scripts/build-v5-fx2-assets.py'), 'utf8');
  assert.match(src, /HAND_CUT = \[/); assert.match(src, /HAND_CUT_FINAL = \[/); assert.match(src, /def curate_crests/);
  for (const s of crest.spots) assert.ok(s[0] > 0 && s[0] < 3840 && s[1] > 0 && s[1] < 2560);
  assert.ok(!crest.spots.some(s => s[0] < 60 || s[0] > 3780), 'none in the map-edge mist');
  assert.ok(existsSync(file('docs/art-reviews/2026-11-05-z1-v5-fx3/foam-contact-sheet-36-final.jpg')));
});

test('construction sheets: stage selection and the cross-fades never jump', async () => {
  const c = await import('../src/construction-sheets.js');
  assert.deepEqual(c.constructionStage(0), { a: 0, b: 0, mix: 0 }); assert.deepEqual(c.constructionStage(.2), { a: 0, b: 0, mix: 0 });
  assert.deepEqual(c.constructionStage(.5), { a: 1, b: 1, mix: 0 }); assert.deepEqual(c.constructionStage(.9), { a: 2, b: 2, mix: 0 }); assert.deepEqual(c.constructionStage(1.4), { a: 2, b: 2, mix: 0 });
  assert.deepEqual(c.constructionStage(-1), { a: 0, b: 0, mix: 0 }); assert.deepEqual(c.constructionStage(NaN), { a: 0, b: 0, mix: 0 });
  const mid = c.constructionStage(1 / 3); assert.equal(mid.a, 0); assert.equal(mid.b, 1); assert.ok(Math.abs(mid.mix - .5) < 1e-9);
  const hi = c.constructionStage(2 / 3); assert.equal(hi.a, 1); assert.equal(hi.b, 2);
  // the picture (blend of two stages) moves smoothly with progress: weight of stage 2 climbs 0 -> 1 across the first mark, never steps
  let prev = 0, worst = 0;
  for (let p = .2; p <= .5; p += .0005) { const s = c.constructionStage(p), w = s.a === 0 ? s.mix : 1; worst = Math.max(worst, Math.abs(w - prev) * (p > .2 ? 1 : 0)); prev = w; }
  assert.ok(worst < .02, 'biggest weight step ' + worst);
  // frames loop without a step
  const f = c.constructionFrame(8, 6, 0); assert.deepEqual(f, { i: 0, j: 1, mix: 0 });
  const w = c.constructionFrame(8, 6, 8 / 6 * 1000 - 1); assert.equal(w.i, 7); assert.equal(w.j, 0); assert.ok(w.mix > .99);
  assert.deepEqual(c.constructionFrame(1, 6, 5000), { i: 0, j: 0, mix: 0 });
});

test('construction sheets: no files / bad json / a sheet that fails = not drawn, so the still img/st-building.png stays (and the page never breaks)', async () => {
  const c = await import('../src/construction-sheets.js');
  const calls = []; const ctx = { globalAlpha: 1, drawImage: (...a) => calls.push(a) };
  const def = { k: 'sala', bx: 500, by: 800, bw: 200 };
  const oldFetch = globalThis.fetch, oldImage = globalThis.Image;
  try {
    c.resetConstructionForTest();
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    assert.equal(c.drawConstruction(ctx, def, .5, 0, 'th'), false); await flush();
    assert.equal(c.constructionState('th'), 'failed'); assert.equal(c.drawConstruction(ctx, def, .5, 0, 'th'), false);
    c.resetConstructionForTest(); globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(c.drawConstruction(ctx, def, .5, 0, 'th'), false); await flush(); assert.equal(c.constructionState('th'), 'failed');
    c.resetConstructionForTest(); globalThis.fetch = async () => ({ ok: true, json: async () => ({ frameW: 512, frameH: 512, stages: [] }) });
    assert.equal(c.drawConstruction(ctx, def, .5, 0, 'th'), false); await flush(); assert.equal(c.constructionState('th'), 'failed', 'a manifest without 3 stages is refused');
    assert.equal(c.validConstructionManifest({ frameW: 512, frameH: 512, foot: [256, 500], stages: [{ sheet: '../x.webp', frames: 4 }, { sheet: 'b.webp', frames: 4 }, { sheet: 'c.webp', frames: 4 }] }), false, 'no path tricks in a sheet name');
    // valid json but a sheet fails to load -> still not drawn
    c.resetConstructionForTest();
    const m = { frameW: 100, frameH: 200, foot: [50, 190], stages: [1, 2, 3].map(n => ({ sheet: `stage-${n}.webp`, frames: 4, fps: 6 })) };
    globalThis.fetch = async () => ({ ok: true, json: async () => m });
    globalThis.Image = class { set src(v) { this._s = v; queueMicrotask(() => this.onerror?.()); } };
    c.drawConstruction(ctx, def, .5, 0, 'th'); await flush(); c.drawConstruction(ctx, def, .5, 0, 'th'); await flush();
    assert.equal(c.drawConstruction(ctx, def, .5, 0, 'th'), false); assert.equal(calls.length, 0, 'nothing drawn on failure');
  } finally { globalThis.fetch = oldFetch; if (oldImage) globalThis.Image = oldImage; else delete globalThis.Image; c.resetConstructionForTest(); }
  const scene = readFileSync(file('src/scene.js'), 'utf8');
  assert.match(scene, /if \(drawConstruction\(ctx, d, p, t, g\.zone\)\)/); assert.match(scene, /else if \(im\) \{\s*const bh = bw \* im\.naturalHeight/, 'the old still picture is the fallback');
  assert.ok(existsSync(file('img/st-building.png')), 'the fallback picture exists');
});

test('construction sheets: ready sheets are drawn foot-on-foot, the frame mix and the stage cross-fade add up to full strength', async () => {
  const c = await import('../src/construction-sheets.js');
  const m = { frameW: 100, frameH: 200, foot: [50, 190], widthK: 1, stages: [1, 2, 3].map(n => ({ sheet: `stage-${n}.webp`, frames: 4, fps: 6 })), byStation: { ngiw: { foot: [50, 180], widthK: 1.5 } } };
  c.setConstructionForTest('th', m, [{ id: 's1' }, { id: 's2' }, { id: 's3' }]);
  const calls = []; const ctx = { globalAlpha: .8, drawImage: (...a) => calls.push(a) };
  const def = { k: 'sala', bx: 500, by: 800, bw: 200 };
  assert.equal(c.drawConstruction(ctx, def, .1, 0, 'th'), true);
  assert.equal(calls.length, 1); const [el, sx, sy, sw, sh, dx, dy, dw, dh] = calls[0];
  assert.equal(el.id, 's1'); assert.equal(sx, 0); assert.equal(sw, 100); assert.equal(sh, 200);
  assert.equal(dw, 200); assert.equal(dh, 400); assert.equal(dx, 500 - 50 * 2); assert.equal(dy, 800 - 190 * 2, 'frame foot lands on (bx, by)');
  assert.equal(ctx.globalAlpha, .8, 'alpha restored');
  calls.length = 0; ctx.globalAlpha = 1; c.drawConstruction(ctx, def, .5, 1000 / 6 * 1.5, 'th');
  assert.equal(calls.length, 2, 'two frames of the same stage blend at a frame change'); assert.equal(calls[0][0].id, 's2');
  assert.equal(calls[0][1], 100); assert.equal(calls[1][1], 200);
  calls.length = 0; let sum = 0; const seen = new Set();
  const ctx2 = { globalAlpha: 1, drawImage(...a) { calls.push([a[0].id, a[1], this.globalAlpha]); } };
  c.drawConstruction(ctx2, def, 1 / 3, 0, 'th');
  assert.deepEqual([...new Set(calls.map(x => x[0]))].sort(), ['s1', 's2'], 'around the 33 % mark stage 1 and 2 cross-fade'); for (const x of calls) sum += x[2];
  assert.ok(Math.abs(sum - 1) < 1e-9, 'weights add up to 1: ' + sum);
  calls.length = 0; ctx.globalAlpha = 1; c.drawConstruction(ctx, { k: 'ngiw', bx: 300, by: 700, bw: 100 }, .9, 0, 'th');
  const [, , , , , nx, ny, nw] = calls[0]; assert.equal(nw, 150, 'per-station override of width'); assert.equal(nx, 300 - 50 * 1.5); assert.equal(ny, 700 - 180 * 1.5, 'foot override');
  c.resetConstructionForTest();
});

// ---------------------------------------------------------------- ground loader: LRU + memory cap + the glow layer
async function terrainFixture() {
  const original = { Image: globalThis.Image, HTMLImageElement: globalThis.HTMLImageElement, document: globalThis.document, fetch: globalThis.fetch };
  const images = [];
  class FakeImage { naturalWidth = 1024; naturalHeight = 1024; constructor() { images.push(this); } set src(v) { this._src = v; } get src() { return this._src; } decode() { return Promise.resolve(); } }
  globalThis.Image = FakeImage; delete globalThis.HTMLImageElement;
  const gradient = () => ({ addColorStop() {} });
  const cc = { drawImage() {}, putImageData() {}, fillRect() {}, createLinearGradient: gradient, getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), clearRect() {} };
  globalThis.document = { createElement: () => ({ width: 4, height: 4, getContext: () => cc, toDataURL: () => 'data:image/png;base64,AA==' }) };
  const zone = await import('../src/zone-skin.js');
  const module = await import('../src/town-terrain.js?fx3-loader=' + Math.random());
  const ctxFor = (x, y, w = 700, h = 500) => ({ canvas: { width: w, height: h }, save() {}, restore() {}, drawImage() {}, getTransform: () => ({ a: 1, d: 1, b: 0, c: 0, e: -x, f: -y }) });
  return { module, images, zone, ctxFor, restore() { for (const [k, v] of Object.entries(original)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } } };
}
test('ground loader: far tiles are released (LRU, memory cap), visible ones never, and the cap follows the tile size', async () => {
  const f = await terrainFixture();
  try {
    const { module: t, images } = f;
    const g = f.zone.ZONE1_GROUND['v7-partial'];
    assert.equal(t.townTerrainCap({ chunk: g.chunk }), 28, '1024 px tiles: 120 MB / 4.2 MB');
    assert.ok(t.townTerrainCap({ chunk: 1024 }) > 20 && t.townTerrainCap({ chunk: 2048 }) === 7);
    const finish = async () => { for (let pass = 0; pass < 4; pass++) { for (const im of images.filter(i => i.onload && !i.done)) { im.done = true; await im.onload(); } await flush(); } };
    let maxReady = 0, seenVisible = true;
    // walk the whole map in 300 unit steps, drawing a frame and letting every requested tile load
    for (let y = 0; y <= 2200; y += 300) for (let x = 0; x <= 3300; x += 300) {
      const ctx = f.ctxFor(x, y); for (let k = 0; k < 10; k++) { t.drawTownTerrain(ctx, null, 0, true); await finish(); if (t.townTerrainViewStats().mode === 'detail') break; }   // 3 loading lanes: a few rounds until the view is sharp
      for (let k = 0; k < 32; k++) t.drawTownTerrain(ctx, null, 0, true);   // ~0.5 s of frames at 60 fps
      const s = t.townTerrainStats(); maxReady = Math.max(maxReady, s.ready);
      if (t.townTerrainViewStats().mode !== 'detail') seenVisible = false;
    }
    const s = t.townTerrainStats();
    assert.ok(s.evicted > 0, 'tiles were released while walking: ' + JSON.stringify(s));
    assert.ok(maxReady <= s.cap + 10, `memory stays near the cap while moving (tiles the camera just left wait 30 frames): max ready ${maxReady}, cap ${s.cap}`);
    { const ctx = f.ctxFor(3000, 2100); for (let k = 0; k < 70; k++) t.drawTownTerrain(ctx, null, 0, true); await finish(); for (let k = 0; k < 70; k++) t.drawTownTerrain(ctx, null, 0, true); assert.ok(t.townTerrainStats().ready <= s.cap, 'settled: at or under the cap, ' + t.townTerrainStats().ready); }
    assert.ok(maxReady < 70, 'never all 70 tiles at once');
    assert.equal(seenVisible, true, 'every frame ended on the sharp view (no tile of the camera was ever dropped)');
    // a released tile comes back when the camera returns to it
    const before = images.length; t.drawTownTerrain(f.ctxFor(0, 0), null, 0, true); await finish(); assert.ok(images.length > before, 'released tiles are requested again');
  } finally { f.restore(); }
});
test('ground loader: wiring - grading runs in a worker with a main-thread fallback, glow layer is optional and 1/4 size, tile set is 1024 px', () => {
  const light = readFileSync(file('src/town-lighting.js'), 'utf8'), terrain = readFileSync(file('src/town-terrain.js'), 'utf8'), worker = readFileSync(file('src/terrain-bake-worker.js'), 'utf8');
  assert.match(light, /new Worker\(new URL\('\.\/terrain-bake-worker\.js\?v=fx3'/); assert.match(light, /workerFailed=true/); assert.match(light, /if\(!art\.fire\)return;/);
  assert.match(light, /GLOW_DIV=4/); assert.match(worker, /gradeStrip/); assert.match(readFileSync(file('src/town-grade.js'), 'utf8'), /export function gradeStrip/);
  assert.match(terrain, /function evictFar/); assert.match(terrain, /TERRAIN_MEMORY_BUDGET = 120e6/); assert.match(terrain, /prepareTownLighting\(ready,\[r\.x,r\.y,r\.w,r\.h\],bakeBudget\)/);
  assert.match(readFileSync(file('src/zone-skin.js'), 'utf8'), /chunk:1024, repairs:false, sprites:V7P_DIR/);
});
test('ground grade: the shared strip grader equals the old per-pixel formulas (hellColor / fireStrength unchanged)', async () => {
  const g = await import('../src/town-grade.js'), l = await import('../src/town-lighting.js');
  assert.equal(l.fireStrength, g.fireStrength); assert.equal(l.hellColor, g.hellColor);
  const W = 8, H = 4, px = new Uint8ClampedArray(W * H * 4), ref = new Uint8ClampedArray(px.length), gl = new Uint8ClampedArray(px.length);
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < px.length; i += 4) { px[i] = rnd() * 255; px[i + 1] = rnd() * 255; px[i + 2] = rnd() * 255; px[i + 3] = 255; ref[i] = px[i]; ref[i + 1] = px[i + 1]; ref[i + 2] = px[i + 2]; ref[i + 3] = 255; }
  const field = new Float32Array(16).map((_, i) => i / 16), geo = { ox: 0, oy: 0, ww: 128, wh: 64, CELL: 32, COLS: 4, ROWS: 4, field, col: g.lightColumns(W, 0, 128, 32, 4) };
  const any = g.gradeStrip(px, gl, W, H, 0, H, geo, [{ type: 'fire' }], true);
  const rgb = [0, 0, 0]; let expectAny = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, light = field[Math.min(3, Math.floor(y / H * 64 / 32)) * 4 + geo.col[x]], r = ref[i], gg = ref[i + 1], b = ref[i + 2], s = g.fireStrength(r, gg, b);
    g.hellColor(r, gg, b, rgb, light, r <= 160 ? 0 : null);
    assert.deepEqual([px[i], px[i + 1], px[i + 2]], rgb.map(v => v), `pixel ${x},${y}`);
    assert.equal(gl[i + 3], r <= 160 ? 0 : Math.round(255 * s)); if (gl[i + 3]) expectAny = true;
  }
  assert.equal(any, expectAny);
});
