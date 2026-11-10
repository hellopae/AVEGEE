// GFX-1110: the Graphics setting (High Resolution / Performance).  Pure logic is tested by importing the module with a fake storage / location;
// the wiring that lives in browser-only code (settings dialog, frame loop, fluid layer) is checked on the source.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

async function fresh({ saved, search = '' } = {}) {
  const mem = new Map(saved ? [['avegee.graphics', saved]] : []);
  globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  globalThis.location = { search };
  const mod = await import('../src/graphics-setting.js?' + Math.random());
  return { mod, mem };
}
test.afterEach(() => { delete globalThis.localStorage; delete globalThis.location; });

test('default is High Resolution = exactly the old behaviour (DPR 2, no fluid decimation, no frame cap)', async () => {
  const { mod } = await fresh();
  assert.equal(mod.getGraphicsMode(), 'high');
  assert.deepEqual({ ...mod.graphicsProfile() }, { mapDprCap: 2, fluidIntervalMs: 0, frameIntervalMs: 0 });
  assert.equal(mod.mapDprCap(), 2);
  for (const t of [0, 3, 8.3, 16.7, 1e6]) assert.equal(mod.frameDue(t), true);
});

test('Performance: DPR cap 1.5, fluid layers every 33 ms, 60 fps frame cap', async () => {
  const { mod } = await fresh();
  assert.equal(mod.setGraphicsMode('performance'), true);
  assert.deepEqual({ ...mod.graphicsProfile() }, { mapDprCap: 1.5, fluidIntervalMs: 33, frameIntervalMs: 1000 / 60 });
  assert.equal(mod.mapDprCap(), 1.5);
});

test('choice is remembered, applied at once (listeners), junk is refused and ignored on load', async () => {
  const { mod, mem } = await fresh();
  const seen = []; mod.onGraphicsChange(m => seen.push(m));
  assert.equal(mod.setGraphicsMode('ultra'), false);
  mod.setGraphicsMode('performance'); mod.setGraphicsMode('performance'); mod.setGraphicsMode('high');
  assert.deepEqual(seen, ['performance', 'high']);
  assert.equal(mem.get('avegee.graphics'), 'high');
  assert.equal((await fresh({ saved: 'performance' })).mod.getGraphicsMode(), 'performance');
  assert.equal((await fresh({ saved: 'ultra' })).mod.getGraphicsMode(), 'high');
});

test('?mapdpr= wins over the setting, in both modes; out-of-range is ignored', async () => {
  const a = (await fresh({ search: '?mapdpr=1.25' })).mod;
  assert.equal(a.mapDprCap(), 1.25); a.setGraphicsMode('performance'); assert.equal(a.mapDprCap(), 1.25);
  const b = (await fresh({ search: '?mapdpr=3' })).mod;
  assert.equal(b.mapDprCap(), 2);
});

test('frame cap: 120 Hz -> 60 draws a second, 60 Hz (jittery) -> every frame, 144 Hz never above ~60, a stall does not burst', async () => {
  const { mod } = await fresh(); mod.setGraphicsMode('performance');
  const run = (hz, secs, jitter = 0) => { let n = 0; for (let k = 0, t = 1000; t < 1000 + secs * 1000; k++, t = 1000 + k * 1000 / hz + (k % 2 ? jitter : -jitter)) if (mod.frameDue(t)) n++; return n / secs; };
  assert.ok(Math.abs(run(120, 4) - 60) <= 1, '120 Hz');
  mod.setGraphicsMode('high'); mod.setGraphicsMode('performance');
  assert.ok(run(60, 4, 0.8) >= 59, '60 Hz with timestamp jitter');
  mod.setGraphicsMode('high'); mod.setGraphicsMode('performance');
  assert.ok(run(144, 4) <= 62, '144 Hz');
  mod.setGraphicsMode('high'); mod.setGraphicsMode('performance');
  assert.equal(mod.frameDue(5000), true); assert.equal(mod.frameDue(5001), false);
});

test('fluid layers: Performance re-blits the last composition at the new camera position, High never does', async () => {
  globalThis.localStorage = { getItem: () => null, setItem() {} };
  const gs = await import('../src/graphics-setting.js');
  const src = read('src/town-fluid-fx.js');
  assert.match(src, /graphicsProfile\(\)\.fluidIntervalMs/);
  assert.match(src, /if \(!intervalMs\) return null;/, 'interval 0 (High) never reuses');
  assert.match(src, /dx0: prev\.geo\.dx0 \+ \(m\.e - prev\.e\)/);
  assert.match(src, /Math\.abs\(m\.a - prev\.a\) > 1e-6/, 'a zoom change forces a fresh composition');
  assert.equal(gs.GRAPHICS_PROFILES.high.fluidIntervalMs, 0);
});

test('settings dialog + frame loop wiring, i18n in Thai and English', () => {
  const ui = read('src/ui.js'), i18n = read('src/i18n.js'), html = read('index.html');
  assert.match(ui, /if \(!frameDue\(now\)\) \{ requestAnimationFrame\(frame\); return; \}/);
  assert.match(ui, /role="radiogroup"/);
  assert.match(ui, /setGraphicsMode\(b\.dataset\.gfx\)/);
  for (const k of ['settings.graphics', 'settings.graphics.high', 'settings.graphics.highHint', 'settings.graphics.performance', 'settings.graphics.performanceHint'])
    assert.equal(i18n.split(`'${k}':`).length - 1, 2, `${k} in TH and EN`);
  assert.match(i18n, /'settings\.graphics\.high': 'ความละเอียดสูง'/);
  assert.match(i18n, /'settings\.graphics\.performance': 'เน้นประสิทธิภาพ'/);
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.match(map['./src/graphics-setting.js'], /graphics-setting\.js\?v=20261110-gfx$/);
});
