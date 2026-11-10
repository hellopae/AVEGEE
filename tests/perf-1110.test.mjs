// PERF-1110: AVEGEE stutter at DPR 2 (1792x958 window): tile-cache thrash, map redrawn behind the battle box, bicubic shadow blits, vignette shader,
// main-thread createImageBitmap.  Behaviour tests where the code is pure, wiring tests where it lives inside the browser-only frame loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('battle box over the map: opaque boxes covering >= 85% stop the full-rate map redraw (0.90 cover at 1792x958 used to count as visible)', () => {
  const ui = read('src/ui.js');
  assert.match(ui, /OCCLUDE_MIN_COVER = 0\.85/);
  assert.match(ui, /w \* h < c\.width \* c\.height \* OCCLUDE_MIN_COVER\) return false/);
  assert.match(ui, /Number\(parts\[3\]\) >= 1/, 'translucent boxes still keep the map moving');
});

test('vignette: off-screen rect paints nothing; on-screen rect is one stretched blit of the baked gradient (no per-frame gradient shader)', async () => {
  const oldDoc = globalThis.document, made = [], calls = [];
  globalThis.document = { createElement: () => { const c = { width: 0, height: 0, getContext: () => ({ createRadialGradient: () => ({ addColorStop() {} }), fillRect() {} }) }; made.push(c); return c; } };
  try {
    const { drawVignette } = await import('../src/art.js');
    const ctxAt = (e, f) => ({ canvas: { width: 3584, height: 1916 }, getTransform: () => ({ a: 3.74, d: 3.74, b: 0, c: 0, e, f }),
      drawImage: (...a) => calls.push(['img', ...a]), createRadialGradient: () => { calls.push(['grad']); return { addColorStop() {} }; }, fillRect: () => calls.push(['fill']) });
    drawVignette(ctxAt(-9000, -9000), 1678, 937);                  // camera far to the right / below: rect is off screen
    assert.deepEqual(calls, []);
    drawVignette(ctxAt(-5400, -3076), 1678, 937);                  // the real idle view: the rect's corner is visible
    drawVignette(ctxAt(-5400, -3076), 1678, 937);
    assert.equal(calls.filter(c => c[0] === 'img').length, 2);
    assert.equal(calls.filter(c => c[0] === 'grad' || c[0] === 'fill').length, 0, 'no gradient shader on the main canvas');
    assert.equal(made.length, 1, 'baked once');
    assert.deepEqual(calls[0].slice(2), [0, 0, 1678, 937]);
  } finally { if (oldDoc === undefined) delete globalThis.document; else globalThis.document = oldDoc; }
});

test('ground shadows are drawn with bilinear smoothing, restored afterwards', () => {
  const src = read('src/town-shade.js');
  assert.match(src, /ctx\.save\(\); ctx\.imageSmoothingQuality = 'low';\s*for \(const level of \['soft', 'tight'\]\)/);
  assert.match(src, /\} else paintCaster\(ctx, c, level, GROUND\[level\]\);\s*\}\s*\}\s*ctx\.restore\(\);\s*\}/);
  assert.match(src, /function scheduleContourWarm/, 'contour bakes are done before the first visible frame');
});

test('ground bake: the tile URL goes to the worker (fetch + decode off the main thread); the bitmap path stays as fallback', () => {
  const light = read('src/town-lighting.js'), worker = read('src/terrain-bake-worker.js');
  assert.match(light, /bakeJob\(w,\{url,W:image\.naturalWidth,H:image\.naturalHeight\},rect\)/);
  assert.match(light, /createImageBitmap\(image\)/, 'bitmap fallback kept');
  assert.match(light, /terrain-bake-worker\.js\?v=20261110-perf/);
  assert.match(worker, /await fetch\(url\)/);
  assert.match(worker, /tile size mismatch/);
});

test('index.html: the changed modules carry the PERF-1110 cache-bust id', () => {
  const html = read('index.html'), map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const k of ['terrain-detail', 'art', 'town-shade', 'town-lighting', 'ui', 'scene']) assert.match(map[`./src/${k}.js`], /\?v=20261110-(perf(-fbui)?|gfx|battlefx)$/, k);
  assert.match(html, /<script type="module" src="src\/ui\.js\?v=20261110-(perf(-fbui)?|gfx|battlefx)">/);
});

test('map canvas density: scene.js asks graphics-setting for the cap (High = 2 by default, ?mapdpr=1..2 still wins)', () => {
  const sc = read('src/scene.js'), gs = read('src/graphics-setting.js');
  assert.match(sc, /Math\.min\(mapDprCap\(\), globalThis\.devicePixelRatio \|\| 1\)/);
  assert.match(sc, /import \{ mapDprCap \} from '\.\/graphics-setting\.js'/);
  assert.match(gs, /q >= 1 && q <= 2/);
  assert.match(gs, /high: +Object\.freeze\(\{ mapDprCap: 2,/);
});
