import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { codexCloudWeight, codexCloudDrift, codexCloudChunkRect, codexCloudsRequested, cloudsMode, setCloudsModeForTest, drawCodexClouds, drawCodexPuffs,
  codexPuffPos, CODEX_PUFFS, PUFF_PERIOD, PUFF_OPACITY, paintCodexClouds, codexCloudsState, codexCloudBoxRect } from '../src/town-clouds-codex.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('CLOUDS-MIX: the mix is the default; ?clouds=shader / ?clouds=codex are the two ways back; nothing is drawn in shader mode', () => {
  assert.equal(cloudsMode(), 'mix');
  assert.equal(codexCloudsRequested(), false);
  setCloudsModeForTest('shader');
  try {
    let called = false;
    drawCodexClouds({ getTransform() { called = true; return {}; } }, 0); drawCodexPuffs({ getTransform() { called = true; return {}; } }, 0);
    assert.equal(called, false, 'shader mode returns before touching the canvas');
  } finally { setCloudsModeForTest('mix'); }
  setCloudsModeForTest('overlay'); assert.equal(codexCloudsRequested(), true); setCloudsModeForTest('mix');
  const src = read('src/town-clouds-codex.js');
  assert.match(src, /v === 'shader' \? 'shader' : v === 'codex' \? 'overlay' : 'mix'/);
});
test('A/B weight follows the Codex recipe (0 at 0 s, 1 at 12 s, 0 at 24 s) and the drift is a 48 s sine of amplitude [1.5, 0.3]', () => {
  assert.ok(Math.abs(codexCloudWeight(0)) < 1e-9); assert.ok(Math.abs(codexCloudWeight(12000) - 1) < 1e-9); assert.ok(Math.abs(codexCloudWeight(24000)) < 1e-9);
  const [dx, dy] = codexCloudDrift(12000); assert.ok(Math.abs(dx - 1.5) < 1e-9 && Math.abs(dy - .3) < 1e-9);
});
test('the 20 chunks tile the 3840 x 2560 world exactly and every file of both variants ships', () => {
  let area = 0; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const [, , w, h] = codexCloudChunkRect(r, c); area += w * h; for (const v of 'AB') assert.ok(existsSync(new URL(`../img/map-zone1/v7r-clouds/layer-${v}/r${r + 1}-c${c + 1}.webp`, import.meta.url)), `${v} r${r + 1}-c${c + 1}`); }
  assert.ok(Math.abs(area - 3840 * 2560) < 1, 'area ' + area);
  const last = codexCloudChunkRect(3, 4); assert.ok(Math.abs(last[0] + last[2] - 3840) < 1e-6 && Math.abs(last[1] + last[3] - 2560) < 1e-6);
});
test('the 8 puffs: files ship, and the numbers match clouds.json (size, origin, drift, opacity)', () => {
  const cj = JSON.parse(read('img/map-zone1/v7r-clouds/clouds.json'));
  assert.equal(CODEX_PUFFS.length, 8); assert.equal(cj.puffs.length, 8);
  for (const [i, p] of CODEX_PUFFS.entries()) {
    const j = cj.puffs[i];
    assert.equal(p.id, j.id); assert.deepEqual([...p.size], j.spriteWorld); assert.deepEqual([...p.origin], j.originWorld); assert.deepEqual([...p.drift], j.driftWorldPerSecond);
    assert.equal(PUFF_OPACITY, j.opacity);
    assert.ok(existsSync(new URL(`../img/map-zone1/v7r-clouds/puffs/${p.id}.png`, import.meta.url)), p.id);
  }
});
test('a puff drifts slowly there and back: starts at its origin, never faster than Codex\'s speed, never farther than ~25 units away', () => {
  for (const p of CODEX_PUFFS) {
    const [x0, y0] = codexPuffPos(p, 0); assert.ok(Math.abs(x0 - p.origin[0]) < 1e-9 && Math.abs(y0 - p.origin[1]) < 1e-9);
    let maxStep = 0, maxDist = 0, prev = [x0, y0];
    for (let ms = 100; ms <= PUFF_PERIOD * 2000; ms += 100) {
      const q = codexPuffPos(p, ms); maxStep = Math.max(maxStep, Math.hypot(q[0] - prev[0], q[1] - prev[1]) / .1); maxDist = Math.max(maxDist, Math.hypot(q[0] - p.origin[0], q[1] - p.origin[1])); prev = q;
    }
    assert.ok(maxStep <= Math.hypot(...p.drift) * 1.001, `${p.id} speed ${maxStep}`); assert.ok(maxDist < 35, `${p.id} dist ${maxDist}`);
    const back = codexPuffPos(p, PUFF_PERIOD * 1000); assert.ok(Math.abs(back[0] - p.origin[0]) < 1e-6, 'comes back after one period');
  }
});
test('the puff clip: mask-q.png + mask-q.json ship and cover the world strip that holds Codex\'s clouds', () => {
  const mj = JSON.parse(read('img/map-zone1/v7r-clouds/mask-q.json'));
  assert.ok(existsSync(new URL('../img/map-zone1/v7r-clouds/' + mj.file, import.meta.url)));
  const [x, y, w, h] = mj.worldRect; assert.ok(x <= 0 && x + w >= 3140 && y <= 140 && y + h >= 800, JSON.stringify(mj.worldRect));
  for (const p of CODEX_PUFFS) assert.ok(p.origin[1] >= y && p.origin[1] + p.size[1] <= y + h && p.origin[0] + p.size[0] <= x + w + 1, p.id + ' starts inside the mask rect');
});
test('paintCodexClouds / codexCloudsState: wait for chunks that are not decoded, paint nothing then, ask for BOTH variants (no Image in node = never "ready")', () => {
  const prev = globalThis.Image;
  const made = []; globalThis.Image = class { constructor() { made.push(this); } };
  try {
    const rect = [1800, 100, 400, 300];
    assert.equal(codexCloudsState(rect), 'wait');
    const painted = []; const g = { save() {}, restore() {}, drawImage(...a) { painted.push(a); } };
    assert.equal(paintCodexClouds(g, 'A', rect), 'wait'); assert.equal(painted.length, 0);
    assert.ok(made.length >= 2 && made.every(el => /v7r-clouds\/layer-[AB]\/r\d-c\d\.webp$/.test(el.src)), 'requested ' + made.map(e => e.src).join());
    made[0].onerror(); assert.equal(codexCloudsState(rect), 'failed');
    for (const el of made) el.onerror();
    assert.equal(paintCodexClouds(g, 'A', rect), 'failed');
  } finally { globalThis.Image = prev; }
});
test('wiring: scene.js draws the direct layer BEFORE the fluid layer in mix mode and the puffs AFTER; the shader pieces of the cloud group take the A/B paint', () => {
  const sc = read('src/scene.js');
  const iBase = sc.indexOf("cloudsMode()==='mix')drawCodexClouds"), iFluid = sc.indexOf('drawTownFluidFx(ctx,t,'), iOver = sc.indexOf("cloudsMode()==='overlay')drawCodexClouds"), iPuff = sc.indexOf('drawCodexPuffs(ctx,cloudMs');
  assert.ok(iBase > 0 && iBase < iFluid && iFluid < iOver && iOver < iPuff, [iBase, iFluid, iOver, iPuff].join());
  const sh = read('src/fluid-shader.js');
  assert.match(sh, /sp\.p\.group === 'clouds' && cloudsMode\(\) === 'mix' && codexCloudsApply\(\)/);
  assert.match(sh, /uniform sampler2D uGroundB;/); assert.match(sh, /if \(uMixB > \.002\)/);
  assert.match(sh, /paintCodexClouds\(g, 'A', rect\); paintCodexClouds\(g2, 'B', rect\);/);
  assert.match(sh, /gl\.uniform1f\(L\.uMixB, gr\.texB \? mixB : 0\)/);
  assert.match(sh, /codexCloudWeight\(sec \* 1000\)/);
  const map = JSON.parse(read('index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.match(map['./src/town-clouds-codex.js'], /town-clouds-codex\.js\?v=/);
  const v = s => s.match(/\?v=(.+)$/)[1];
  assert.equal(v(map['./src/fluid-shader.js']), v(map['./src/town-clouds-codex.js']), 'a changed module gets a new cache id');
});
test('the default game never recolours the layers: no filter / tint / colour operation in the module', () => {
  const src = read('src/town-clouds-codex.js').replace(/\/\/.*$/gm, '');
  assert.ok(!/\.filter\s*=|fillStyle|'multiply'|'screen'|'color'|'hue'|getImageData/.test(src));
});
test('clouds-bounds.json: only the boxes that hold cloud are drawn (5 of 20 chunks), every box lies inside its chunk and inside the cloud-mask strip', () => {
  const bj = JSON.parse(read('img/map-zone1/v7r-clouds/clouds-bounds.json')).chunks, mj = JSON.parse(read('img/map-zone1/v7r-clouds/mask-q.json'));
  assert.equal(Object.keys(bj).length, 20);
  const used = Object.entries(bj).filter(([, b]) => b); assert.equal(used.length, 5, used.map(([k]) => k).join());
  for (const [k, b] of used) {
    const [r, c] = k.match(/r(\d)-c(\d)/).slice(1).map(n => n - 1), cr = codexCloudChunkRect(r, c), br = codexCloudBoxRect(r, c, b);
    assert.ok(br[0] >= cr[0] - 1e-6 && br[1] >= cr[1] - 1e-6 && br[0] + br[2] <= cr[0] + cr[2] + 1e-6 && br[1] + br[3] <= cr[1] + cr[3] + 1e-6, k + ' inside its chunk');
    assert.ok(br[1] + br[3] <= mj.worldRect[1] + mj.worldRect[3] + 4 && br[0] + br[2] <= mj.worldRect[0] + mj.worldRect[2] + 4, k + ' inside the mask strip');
  }
  assert.equal(codexCloudBoxRect(0, 0, null), null);
});
