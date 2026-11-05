// Z1-V5-FX — painted fluid / cloud frames on the v5 ground, real-cloud shadows, new canteen, ground swap to v7.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const FX = 'img/map-zone1/v5-fx/';
const layout = JSON.parse(readFileSync(file(FX + 'fx-layout.json'), 'utf8'));
const py = (code, ...args) => JSON.parse(execFileSync('python3', ['-c', code, ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }));

// Node has no canvas: the modules only touch `document` lazily, so give them a recording stub where a test needs one.
function recorder(extra = {}) {
  const calls = [], state = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ canvas: { width: 390, height: 844 }, ...extra }, {
    get: (o, k) => k in o ? o[k] : k in state ? state[k] : (...a) => { calls.push([k, ...a]); return k === 'createPattern' ? { setTransform() {} } : /^create(Radial|Linear)Gradient$/.test(k) ? gradient : undefined; },
    set: (o, k, v) => { if (k in state || k === 'imageSmoothingQuality') { calls.push(['set', k, v]); state[k] = v; } else o[k] = v; return true; },
  });
  return { ctx, calls, state };
}
const stubDom = () => {
  const made = [];
  globalThis.document = { hidden: false, createElement: () => { const r = recorder(); const cv = { width: 300, height: 150, getContext: () => r.ctx, rec: r }; r.ctx.canvas = cv; made.push(cv); return cv; } };
  globalThis.Image = class { set src(v) { this._src = v; this.naturalWidth = this.width = 627; this.naturalHeight = this.height = 627; queueMicrotask(() => this.onload?.()); } get src() { return this._src; } decode() { return Promise.resolve(); } };
  globalThis.fetch = async () => ({ ok: true, json: async () => layout });
  return made;
};
const unstubDom = () => { delete globalThis.document; delete globalThis.Image; delete globalThis.fetch; };
const tick = () => new Promise(r => setTimeout(r, 0));

const fx = await import('../src/town-fluid-fx.js?v=v5fx');
const skin = await import('../src/zone-skin.js');

test('layout: 44 pieces, painted sheets and alpha masks exist, sizes agree with the layout, fog-bank is not shipped', () => {
  const by = {}; for (const p of layout.pieces) by[p.group] = (by[p.group] || 0) + 1;
  assert.deepEqual(by, { river: 2, lava: 6, ice: 5, waterfall: 11, lavafall: 8, foam: 7, cloud: 5 });
  assert.equal(layout.pieces.length, 44);
  assert.deepEqual(layout.worldSize, [3840, 2560]); assert.deepEqual(layout.masterSize, [4915, 3277]);
  assert.ok(!layout.pieces.some(p => /fog/.test(p.id) || /fog/.test(p.sheet)), 'white fog lumps (owner 5 Nov) are not in the layout');
  assert.ok(!existsSync(file(FX + 'sheets/fog-bank-valleys.webp')));
  const sheets = [...new Set(layout.pieces.map(p => p.sheet))], masks = [...new Set(layout.pieces.flatMap(p => [p.mask, p.clipMask].filter(Boolean)))];
  for (const s of sheets) assert.ok(existsSync(file(FX + 'sheets/' + s)), s);
  for (const m of masks) assert.ok(existsSync(file(FX + 'masks/' + m + '.webp')), m);
  const sheetSize = py('import sys,json\nfrom PIL import Image\nprint(json.dumps({s:Image.open(sys.argv[1]+"sheets/"+s).size for s in sys.argv[2:]}))', file(FX), ...sheets);
  const maskInfo = py('import sys,json\nimport numpy as np\nfrom PIL import Image\nr={}\nfor m in sys.argv[2:]:\n im=Image.open(sys.argv[1]+"masks/"+m+".webp");a=np.asarray(im.convert("RGBA"))[...,3];r[m]=[im.size[0],im.size[1],float(a.mean())/255,int(a.max()),int(a.min())]\nprint(json.dumps(r))', file(FX), ...masks);
  for (const p of layout.pieces) {
    assert.deepEqual(sheetSize[p.sheet], [p.frameW * p.frames, p.frameH], p.id + ' sheet = frames x frame size');
    assert.deepEqual(maskInfo[p.mask].slice(0, 2), p.maskRectPx.slice(2), p.id + ' mask is the piece rectangle');
    if (p.clipMask) assert.deepEqual(maskInfo[p.clipMask].slice(0, 2), p.maskRectPx.slice(2));
    assert.ok(['overlay', 'normal'].includes(p.blend) && p.opacity > 0 && p.opacity <= 1, p.id);
    const [x, y, w, h] = p.maskRectPx; assert.ok(x >= 0 && y >= 0 && x + w <= 4915 && y + h <= 3277, p.id + ' inside the master');
  }
  for (const m of masks) { const [, , mean, max] = maskInfo[m]; assert.ok(max === 255 && mean > 0, m + ' carries coverage in alpha'); }
  assert.ok(masks.filter(m => !/^waterfall|^lavafall/.test(m)).every(m => maskInfo[m][2] < .995), 'region masks are shapes, not full rectangles (nothing is drawn outside the groove)');
});

test('frames: a linear cross-fade of two DRAWN frames, seamless over the batch seams (4->5) and the loop (8->1)', () => {
  assert.deepEqual(fx.fluidFrame(1, 1, 5000), { i: 0, j: 0, mix: 0 });
  // image(t) = (1-mix) F[i] + mix F[j]; the picture may never jump between two nearby instants, including across a frame change and the wrap.
  const F = Array.from({ length: 8 }, (_, k) => [Math.sin(k * 12.9898) * 100, Math.cos(k * 78.233) * 100, (k % 3) * 50]);
  const at = (ms, fps) => { const { i, j, mix } = fx.fluidFrame(8, fps, ms); assert.equal(j, (i + 1) % 8); assert.ok(mix >= 0 && mix < 1); return F[i].map((v, c) => v * (1 - mix) + F[j][c] * mix); };
  for (const fps of [3, 7, 8]) {
    const step = 1;                                    // 1 ms
    const per = 1000 / fps, span = Math.max(...F.map((f, k) => Math.max(...f.map((v, c) => Math.abs(F[(k + 1) % 8][c] - v)))));
    const maxStep = span * step / per;                 // the mix moves by step/per per ms, so the picture moves by at most span x that
    let worst = 0;
    for (let t = 0; t < 3 * 8 * per; t += step) { const a = at(t, fps), b = at(t + step, fps); worst = Math.max(worst, ...a.map((v, c) => Math.abs(v - b[c]))); }
    assert.ok(worst <= maxStep * 1.01, `fps ${fps}: biggest 1 ms change ${worst.toFixed(3)} <= ${maxStep.toFixed(3)}`);
  }
  const seam = fx.fluidFrame(8, 8, (4 - 0.001) * 125), seam2 = fx.fluidFrame(8, 8, 4 * 125);   // frame 3 -> 4 is where drawn batch A meets batch B
  assert.equal(seam.i, 3); assert.equal(seam.j, 4); assert.ok(seam.mix > .99); assert.equal(seam2.i, 4); assert.equal(seam2.mix, 0);
  const wrap = fx.fluidFrame(8, 8, 8 * 125 - 1); assert.equal(wrap.i, 7); assert.equal(wrap.j, 0);
  assert.equal(fx.fluidFrame(8, 8, -50).i, 0, 'no negative time');
});

test('geometry helpers: piece rectangles in world units, drifting puffs wrap inside their region, detail levels', () => {
  const r = fx.fluidPieceRect({ maskRectPx: [4915 / 2, 3277 / 4, 4915 / 10, 3277 / 8] }, layout);
  assert.deepEqual(r.map(Math.round), [1920, 640, 384, 320]);
  const puff = layout.pieces.find(p => p.kind === 'puff');
  const [rx, ry, rw, rh] = puff.rectWorld;
  let prev = fx.fluidPuffCenter(puff, 0);
  for (let s = 0; s <= 400; s += 1) {
    const [x, y] = fx.fluidPuffCenter(puff, s);
    assert.ok(x >= rx && x < rx + rw && y >= ry && y < ry + rh, 'centre stays in the region rectangle');
    const dx = Math.abs(x - prev[0]), dy = Math.abs(y - prev[1]);
    assert.ok(dx < 6 || Math.abs(dx - rw) < 6, 'moves a few units per second, or wraps by exactly one period'); assert.ok(dy < 6 || Math.abs(dy - rh) < 6);
    prev = [x, y];
  }
  assert.equal(fx.fluidTileLevel(3), 0); assert.equal(fx.fluidTileLevel(1.2), 1); assert.equal(fx.fluidTileLevel(.3), 2);
  assert.equal(fx.fluidMipFor(627, 600), 0); assert.ok(fx.fluidMipFor(627, 80) >= 2); assert.ok(fx.fluidMipFor(627, 1) <= 3);
  const plan = fx.fluidDrawPlan(layout);
  assert.equal(plan.filter(p => p.puffs).length, 1, 'the four drifting clouds are composed together in one layer');
  assert.equal(plan.find(p => p.puffs).puffs.length, 4);
  assert.equal(plan.length, layout.pieces.length - 3);
});

test('wiring: zone 1 owns the layer, the old flow and old cloud banks step aside, the old water/lava layer is not used on top of it', () => {
  assert.deepEqual({ ...skin.ZONE_SKIN.th.fluidFx }, { dir: 'img/map-zone1/v5-fx/' });
  for (const z of ['asia', 'west', 'cyberhell']) assert.equal(skin.ZONE_SKIN[z].fluidFx, undefined, z + ' keeps its own weather');
  const scene = readFileSync(file('src/scene.js'), 'utf8');
  assert.match(scene, /drawTownFluidFx\(ctx,t,\{reduced,paused:!!g\.paused\}\)/);
  assert.ok(scene.indexOf('drawTownFluidFx(ctx') > scene.indexOf('drawTownTerrain(ctx') && scene.indexOf('drawTownFluidFx(ctx') < scene.indexOf('drawTownGround(ctx, g, t)'), 'after the ground, before props and actors');
  assert.match(readFileSync(file('src/town-flow.js'), 'utf8'), /if \(townFluidOwnsFlow\(\)\) return;/);
  assert.match(readFileSync(file('src/town-night-effects.js'), 'utf8'), /if\(townFluidOwnsClouds\(reduced\)\)return;/);
  // owner: no depth of field, parallax, bloom, whole-screen haze or colour grading in this module; torches and falling leaves are untouched
  const src = readFileSync(file('src/town-fluid-fx.js'), 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /\.filter\s*=|ctx\.filter|shadowBlur|GaussianBlur|parallax|bloom|getImageData|putImageData|\bgrade\b/i);
  const night = readFileSync(file('src/town-night-effects.js'), 'utf8');
  assert.match(night, /ctx\.fillStyle=p\.biome==='lava'\?'#ff8550'/, 'falling leaves unchanged');
});

test('draw: only visible pieces, clipped by their alpha mask, blended with the layout blend/opacity, frozen while paused, silent when off', async () => {
  const made = stubDom();
  try {
    const { weatherEnabled, setWeatherEnabled } = await import('../src/map-ambient.js?v=mapfx-k1d');
    assert.ok(weatherEnabled());
    // camera over the lava (world x 0..780, y 0..1690 at 0.5 px per unit)
    const main = recorder({ getTransform: () => ({ a: .5, b: 0, c: 0, d: .5, e: -50, f: -20 }) });
    fx.drawTownFluidFx(main.ctx, 0, {});
    await tick(); await tick();
    for (let k = 1; k <= 40; k++) { fx.drawTownFluidFx(main.ctx, k * 30, {}); await tick(); }   // let sheets / masks load, then draw
    const st = fx.townFluidFxStats();
    assert.equal(st.status, 'ready'); assert.ok(st.drawn > 0 && st.composites > 0, JSON.stringify(st));
    // the main canvas only ever receives whole composed layers: save, setTransform(identity), alpha, blend, drawImage, restore
    main.calls.length = 0; fx.drawTownFluidFx(main.ctx, 2000, {});
    const names = main.calls.map(c => c[0]);
    assert.ok(names.includes('drawImage'));
    assert.ok(!names.some(n => ['fillRect', 'fill', 'stroke', 'arc', 'putImageData', 'createPattern'].includes(n)), 'nothing is painted straight onto the ground');
    const blends = main.calls.filter(c => c[0] === 'set' && c[1] === 'globalCompositeOperation').map(c => c[2]);
    assert.ok(blends.every(b => ['overlay', 'source-over'].includes(b)));
    assert.ok(blends.includes('overlay'));
    const alphas = main.calls.filter(c => c[0] === 'set' && c[1] === 'globalAlpha').map(c => c[2]);
    assert.ok(alphas.every(a => a > 0 && a <= .72), 'layout opacities only (max .72, lava fall)');
    // inside the scratch layer: every composed layer is cut by a destination-in draw of the piece mask
    const scratch = made.find(c => c.rec.calls.some(x => x[0] === 'set' && x[2] === 'destination-in'));
    assert.ok(scratch, 'a composing layer clipped by a mask exists');
    const ops = scratch.rec.calls.filter(c => c[0] === 'set' && c[1] === 'globalCompositeOperation').map(c => c[2]);
    assert.ok(ops.includes('lighter') && ops.includes('destination-in'), 'frames are mixed with premultiplied adds then clipped by the mask');
    assert.ok(ops.lastIndexOf('destination-in') > ops.indexOf('lighter'));
    // paused or reduced: the clock holds (paused) / nothing is drawn (reduced); weather off draws nothing
    const c0 = fx.townFluidFxClock(); fx.drawTownFluidFx(main.ctx, 5000, { paused: true }); fx.drawTownFluidFx(main.ctx, 9000, { paused: true });
    assert.equal(fx.townFluidFxClock(), c0, 'paused: the animation clock holds');
    main.calls.length = 0; fx.drawTownFluidFx(main.ctx, 9100, { reduced: true }); assert.equal(main.calls.length, 0, 'reduced motion: the painted ground stays still');
    fx.drawTownFluidFx(main.ctx, 9200, {}); const resumed = fx.townFluidFxClock(); assert.ok(resumed - c0 <= 100, 'a long pause never makes the animation jump');
    setWeatherEnabled(false); main.calls.length = 0; fx.drawTownFluidFx(main.ctx, 9300, {}); assert.equal(main.calls.length, 0, 'weather setting off: nothing drawn'); setWeatherEnabled(true);
    document.hidden = true; const c1 = fx.townFluidFxClock(); fx.drawTownFluidFx(main.ctx, 12000, {}); assert.equal(fx.townFluidFxClock(), c1, 'hidden tab: the clock stops'); document.hidden = false;
    // a camera far from every piece loads and draws nothing
    const far = recorder({ canvas: { width: 390, height: 844 }, getTransform: () => ({ a: .5, b: 0, c: 0, d: .5, e: -3000, f: -1900 }) });
    far.calls.length = 0; fx.drawTownFluidFx(far.ctx, 13000, {}); assert.ok(!far.calls.some(c => c[0] === 'drawImage'));
    assert.equal(fx.townFluidOwnsFlow(), true); assert.equal(fx.townFluidOwnsClouds(false), true); assert.equal(fx.townFluidOwnsClouds(true), false);
  } finally { unstubDom(); }
});

test('only pieces near the camera are fetched', async () => {
  const made = stubDom(); void made;
  const fetched = [];
  const Base = globalThis.Image; globalThis.Image = class extends Base { set src(v) { fetched.push(v); super.src = v; } get src() { return super.src; } };
  try {
    const dir = 'img/map-zone1/v5-fx-test/';
    const st = fx.setFluidLayoutForTest(dir, layout);
    assert.equal(st.status, 'ready');
    const skinMod = await import('../src/zone-skin.js'); const old = skinMod.ZONE_SKIN.th.fluidFx; skinMod.ZONE_SKIN.th.fluidFx = { dir };
    const main = recorder({ getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: -100, f: -100 }) });   // top-left lava corner, 390x844 px
    for (let k = 0; k < 12; k++) { fx.drawTownFluidFx(main.ctx, k * 40, {}); await tick(); }
    skinMod.ZONE_SKIN.th.fluidFx = old;
    assert.ok(fetched.some(u => /lava-surface/.test(u)) && fetched.some(u => /lavafall/.test(u)));
    assert.ok(!fetched.some(u => /ice-stream|waterfall-ice|cloud-sea|spirit-river/.test(u)), 'sheets of regions far from the camera stay on the server: ' + fetched.join(' '));
  } finally { unstubDom(); }
});

test('cloud shadows: strength stays .32, shape comes from real clouds, coverage is higher, other zones keep their values', async () => {
  const m = await import('../src/map-ambient.js');
  const C = m.MAP_FX.cloud;
  assert.equal(C.peakByZone.th, .32); assert.equal(m.cloudOpacityForZone('th'), .32); assert.equal(C.peak, .32);
  for (const z of ['asia', 'west', 'cyberhell']) assert.equal(m.cloudOpacityForZone(z), .2, z + ' untouched');
  assert.deepEqual([C.cell, C.size, C.spread, C.oddFill, C.jitter], [[.72, .62], [.56, .40], [.85, 1.15], .15, .2], 'values used by the other zones are unchanged');
  assert.ok(C.th.cell[0] < C.cell[0] && C.th.cell[1] < C.cell[1] && C.th.oddFill > C.oddFill, 'denser lattice');
  assert.equal(C.th.art.files.length, 5);
  const info = py('import sys,json\nimport numpy as np\nfrom PIL import Image\nr=[]\nfor f in sys.argv[2:]:\n im=Image.open(sys.argv[1]+f).convert("RGBA");a=np.asarray(im);r.append([im.size[0],im.size[1],int(a[...,:3].max()),int(a[...,3].max()),float(a[...,3].mean())/255,int((a[...,3]>0).sum()),int(((a[...,3]>0)&(a[...,3]<255)).sum())])\nprint(json.dumps(r))', file(C.th.art.dir), ...C.th.art.files);
  for (const [w, h, rgbMax, aMax, aMean, nz, soft] of info) {
    assert.equal(w, 512); assert.ok(h < w); assert.equal(rgbMax, 0, 'a shadow is black'); assert.equal(aMax, 255); assert.ok(aMean > .1 && aMean < .6, 'a cloud-sized silhouette, not a rectangle');
    assert.ok(soft / nz > .25, 'soft edge (blurred silhouette): ' + (soft / nz).toFixed(2));
  }
  // patch size follows sqrt(visible area) and the cloud's own proportions -> phone and desktop show about the same share of ground
  const phone = { w: 390 / .5, h: 844 / .5 }, desk = { w: 1280 / .5, h: 800 / .5 };
  const [pw1, ph1] = m.cloudPatchSize(C.th, phone, 2, 1, 1), [pw2, ph2] = m.cloudPatchSize(C.th, desk, 2, 1, 1);
  const share = (pw, ph, v) => pw * ph / (v.w * v.h);
  assert.ok(Math.abs(share(pw1, ph1, phone) - share(pw2, ph2, desk)) < 1e-9);
  assert.ok(Math.abs(pw1 / ph1 - 2) < 1e-9, 'aspect of the texture');
});

test('cloud shadows draw through real textures once loaded, never above the .32 peak, and fall back to the old blobs when they cannot load', async () => {
  const old = { document: globalThis.document, Image: globalThis.Image };
  let imgs = [];
  const made = [];
  globalThis.document = { createElement: () => { const r = recorder(); const cv = { width: 300, height: 150, getContext: () => r.ctx }; r.ctx.canvas = cv; made.push(cv); return cv; } };
  globalThis.Image = class { constructor() { imgs.push(this); } set src(v) { this._src = v; this.naturalWidth = 512; this.naturalHeight = 230; queueMicrotask(() => this.onload?.()); } get src() { return this._src; } };
  try {
    // a fresh module instance so the loader state starts idle
    const m = await import('../src/map-ambient.js?v=z1fx-shadow-' + Date.now());
    const view = { width: 390, height: 844, dpr: 1 };
    const cv = () => { const r = recorder({ getTransform: () => ({ a: .5, b: 0, c: 0, d: .5, e: -700, f: -100 }) }); return r; };
    let r = cv();
    m.drawMapWeather(r.ctx, { zone: 'th', W: 3840, H: 2560, time: 5000, viewport: view });
    assert.equal(m.townCloudShadowState(), 'loading');
    assert.ok(!r.calls.some(c => c[0] === 'drawImage'), 'no gradient blob flashes while the real textures load');
    await tick(); await tick();
    assert.equal(m.townCloudShadowState(), 'ready');
    r = cv(); m.drawMapWeather(r.ctx, { zone: 'th', W: 3840, H: 2560, time: 5000, viewport: view });
    const draws = r.calls.filter(c => c[0] === 'drawImage'); assert.ok(draws.length >= 1);
    let alpha = 1; for (const c of r.calls) { if (c[0] === 'set' && c[1] === 'globalAlpha') alpha = c[2]; if (c[0] === 'drawImage') assert.ok(alpha <= .32 + 1e-9, 'peak .32'); }
    // zone 2 never uses the real-cloud set
    r = cv(); m.drawMapWeather(r.ctx, { zone: 'asia', W: 3840, H: 2560, time: 5000, viewport: view });
    assert.ok(r.calls.some(c => c[0] === 'drawImage'));
    // failure path: images that cannot load
    globalThis.Image = class { set src(v) { queueMicrotask(() => this.onerror?.()); } };
    const f = await import('../src/map-ambient.js?v=z1fx-shadow-fail-' + Date.now());
    r = cv(); f.drawMapWeather(r.ctx, { zone: 'th', W: 3840, H: 2560, time: 5000, viewport: view }); await tick(); await tick();
    assert.equal(f.townCloudShadowState(), 'failed');
    r = cv(); f.drawMapWeather(r.ctx, { zone: 'th', W: 3840, H: 2560, time: 5000, viewport: view });
    assert.ok(r.calls.some(c => c[0] === 'drawImage'), 'old blobs still draw');
  } finally { globalThis.document = old.document; globalThis.Image = old.Image; if (!old.document) delete globalThis.document; if (!old.Image) delete globalThis.Image; }
});

test('canteen: the new picture is cleaned, cropped, and the foundation is the bottom edge', async () => {
  const info = py('import sys,json\nimport numpy as np\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGBA");a=np.asarray(im)\nrows=np.where((a[...,3]>=250).any(axis=1))[0]\nprint(json.dumps([im.size[0],im.size[1],int(rows.max()),int(((a[...,3]>0)&(a[...,3]<250)).sum()),int((a[...,3]>=250).sum())]))', file('img/food-art/canteen-th.webp'));
  const [w, h, lastSolid, soft, solid] = info;
  assert.equal(w, 768); assert.ok(h > 600 && h < 760 && w / h > 1.05);
  assert.ok(h - 1 - lastSolid <= 4, 'the foundation stone is the bottom edge: last solid row ' + lastSolid + ' of ' + h);
  assert.ok(soft < solid * .1, 'only the normal anti-aliased rim is soft (under 10% of the body): ' + (soft / solid).toFixed(3));
  const layoutMod = await import('../src/canteen-art-layout.js');
  assert.ok(Math.abs(layoutMod.CANTEEN_ART_FOOT_Y.th - (lastSolid + 1) / h) < .006, 'owner foot = the lowest solid row of the foundation');
  assert.deepEqual({ ...layoutMod.CANTEEN_ART_FOOT_Y, th: 0 }, { th: 0, asia: .9625, west: .959375, cyberhell: .9875 }, 'other zones unchanged');
  const art = await import('../src/art.js').catch(() => null);
  if (art?.artUrl) assert.equal(art.artUrl('st-canteen'), 'img/food-art/canteen-th.webp');
});

test('ground swap: v7 (2x redraw of v5) is one switch in zone-skin.js and the loader copes with 2048 px chunks', async () => {
  assert.equal(skin.ZONE1_GROUND_SET, 'v5', 'v5 stays the real ground in this round');
  assert.strictEqual(skin.ZONE_SKIN.th.terrain, skin.ZONE1_GROUND.v5);
  assert.deepEqual({ ...skin.ZONE1_GROUND.v7, fullPx: { ...skin.ZONE1_GROUND.v7.fullPx } },
    { dir: 'img/map-zone1/v7/', preview: 'img/map-zone1/v7/zone1-terrain-v7-preview.webp', fullPx: { w: 9830, h: 6554 }, chunk: 2048, repairs: false });
  const t = await import('../src/town-terrain.js?v=k1d');
  const { TOWN_SIZE } = await import('../src/town-layout.js?v=k1d');
  const real = skin.ZONE_SKIN.th.terrain;
  try {
    skin.ZONE_SKIN.th.terrain = skin.ZONE1_GROUND.v7;
    const G = t.townTerrainGrid('th');
    assert.deepEqual([G.chunk, G.cols, G.rows], [2048, 5, 4]);
    assert.ok(Math.abs(G.unitX - 3840 / 9830) < 1e-12 && Math.abs(G.unitY - 2560 / 6554) < 1e-12);
    let area = 0;
    for (let r = 1; r <= G.rows; r++) for (let c = 1; c <= G.cols; c++) {
      const a = t.townChunkRect(r, c); area += a.w * a.h;
      if (c < G.cols) assert.ok(Math.abs(t.townChunkRect(r, c + 1).x - (a.x + a.w)) < 1e-6);
      if (r < G.rows) assert.ok(Math.abs(t.townChunkRect(r + 1, c).y - (a.y + a.h)) < 1e-6);
    }
    assert.ok(Math.abs(area - TOWN_SIZE.w * TOWN_SIZE.h) < 1, 'v7 chunks tile the world exactly');
    const last = t.townChunkRect(4, 5); assert.ok(Math.abs(last.w - (9830 - 8192) * 3840 / 9830) < 1e-9 && Math.abs(last.h - (6554 - 6144) * 2560 / 6554) < 1e-9);
    assert.equal(t.townChunkUrl(3, 4), 'img/map-zone1/v7/r3-c4.webp');
    // the fluid layer lives in world units: the same pieces land on the same ground under either set
    const rect = fx.fluidPieceRect(layout.pieces[2], layout);
    skin.ZONE_SKIN.th.terrain = skin.ZONE1_GROUND.v5; assert.deepEqual(fx.fluidPieceRect(layout.pieces[2], layout), rect);
  } finally { skin.ZONE_SKIN.th.terrain = real; }
  // the chunk streaming constants follow the active set, and the preload tiers know the later preview names
  const preload = readFileSync(file('src/asset-preload.js'), 'utf8');
  assert.match(preload, /zone1-terrain-v\[2-9\]-preview/);
  assert.match(readFileSync(file('src/town-terrain.js'), 'utf8'), /TOWN_TERRAIN_CHUNK_PX = ZONE_SKIN\.th\.terrain\.chunk/);
});
