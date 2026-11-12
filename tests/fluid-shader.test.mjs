// FLUID-SHADER (default since 12 Nov): the flag, the flow-phase maths, the piece list + flow files, the packing / ground-level helpers, the fallback to the drawn frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const SH = await import('../src/fluid-shader.js');
const FX = 'img/map-zone1/v5-fx/shader/';
const layout = JSON.parse(readFileSync(file(FX + 'fluids.json'), 'utf8'));
const pngSize = u => { const b = readFileSync(file(u)); assert.equal(b.toString('latin1', 1, 4), 'PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('the shader is the default; ?fluid=frames (or off) gives the drawn frames back', () => {
  assert.equal(SH.fluidShaderRequested(''), true);
  assert.equal(SH.fluidShaderRequested('?mapdpr=1'), true);
  assert.equal(SH.fluidShaderRequested('?fluid=shader'), true);
  assert.equal(SH.fluidShaderRequested('?fluid=frames'), false);
  assert.equal(SH.fluidShaderRequested('?a=1&fluid=off'), false);
});

test('fluid mode: shader by default, frames / none on request, switchable at runtime', () => {
  assert.equal(SH.fluidMode(), 'shader');
  assert.equal(SH.setFluidMode('none'), 'none'); assert.equal(SH.setFluidMode('frames'), 'frames'); assert.equal(SH.setFluidMode('bogus'), 'frames');
  assert.equal(SH.setFluidMode('shader'), 'shader');
  assert.equal(SH.fluidShaderRequested('?fluid=none'), false);
});

test('the two flow phases are half a cycle apart, weights sum to 1 and a phase has no weight when it jumps', () => {
  for (const sec of [0, .13, .5, 1.7, 33.3]) {
    const f = SH.fluidFlowPhases(sec, .6);
    assert.ok(Math.abs(f.w0 + f.w1 - 1) < 1e-12);
    assert.ok(Math.abs(((f.p1 - f.p0) % 1 + 1) % 1 - .5) < 1e-9);
  }
  assert.ok(SH.fluidFlowPhases(.9999, 1).w0 < 1e-3 && SH.fluidFlowPhases(1.0001, 1).w0 < 1e-3);
  assert.ok(SH.fluidFlowPhases(.4999, 1).w1 < 1e-3 && SH.fluidFlowPhases(.5001, 1).w1 < 1e-3);
  assert.equal(SH.fluidFlowPhases(-5, 1).p0, 0);
});

test('fluids.json: world rectangles, flow files with the right size, cores inside their padded rectangles, sane parameters', () => {
  assert.deepEqual(layout.masterSize, [4915, 3277]); assert.deepEqual(layout.worldSize, [3840, 2560]);
  assert.ok(layout.pieces.length >= 18);
  const ids = new Set();
  for (const p of layout.pieces) {
    assert.ok(!ids.has(p.id), 'unique ' + p.id); ids.add(p.id);
    assert.ok(['falls', 'flats', 'clouds'].includes(p.group) && ['lava', 'ice', 'spirit', 'cloud'].includes(p.liquid) && ['fall', 'flat'].includes(p.kind), p.id);
    assert.ok(existsSync(file(FX + p.flow)), p.id + ' flow file');
    const [w, h] = pngSize(FX + p.flow);
    assert.equal(w, Math.round(p.rectPx[2] * p.res), p.id + ' width'); assert.equal(h, Math.round(p.rectPx[3] * p.res), p.id + ' height');
    const r = SH.fluidShaderRect(p.rectPx, layout), c = SH.fluidShaderRect(p.corePx, layout);
    assert.ok(Math.abs(r[2] - p.rectPx[2] * 3840 / 4915) < 1e-9);
    assert.ok(c[0] >= r[0] - 1e-9 && c[1] >= r[1] - 1e-9 && c[0] + c[2] <= r[0] + r[2] + 1e-9 && c[1] + c[3] <= r[1] + r[3] + 1e-9, p.id + ' core inside rect');
    assert.ok(p.speed > 0 && p.speed < 2 && p.cycle > 4 && p.cycle < 40 && p.warp >= 0 && p.warp <= 1 && p.pulse >= 0 && p.pulse <= .5, p.id);
    assert.ok(p.shimmer >= 0 && p.shimmer <= .3, p.id + ' shimmer'); assert.equal(p.spark.length, 3); assert.equal(p.drift.length, 2); assert.equal(p.hot.length, 2); assert.ok(p.hot[0] < p.hot[1]);
    // the padding must cover how far a sample slides (about .68 cycle) so the flow carries on across a cell seam
    assert.ok((p.corePx[0] - p.rectPx[0]) * 3840 / 4915 >= p.cycle * .68 || p.rectPx[0] === 0 || p.kind === 'fall', p.id + ' padding');
  }
});

test('ground texture level only grows with zoom, jobs pack into rows and the ones that do not fit are dropped', () => {
  assert.deepEqual([.3, .64, .7, .71, 1.4, 1.41, 3].map(SH.groundLevelFor), [0, 0, 0, 1, 1, 2, 2]);
  assert.deepEqual(SH.GROUND_LEVELS, [.64, 1.28, 2.56]);
  const k = SH.packJobs([[3000, 100], [2000, 200], [1000, 50]], 4096, 4096);
  assert.deepEqual(k.slots, [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 2000, y: 100 }]); assert.equal(k.w, 3000); assert.equal(k.h, 300);
  const t = SH.packJobs([[100, 3000], [4000, 3000], [5000, 10]], 4096, 4096);
  assert.deepEqual(t.slots, [{ x: 0, y: 0 }, null, null]);   // the 4000 px job wraps to a new row that no longer fits under 4096; a job wider than the canvas never fits
});

test('the shader store owns nothing until it is ready; failure hands everything back to the drawn frames', () => {
  const st = SH.shaderStoreOf('test-dir/');
  assert.equal(SH.fluidShaderActive(st), false); assert.equal(SH.fluidShaderPending(st), true);
  assert.equal(SH.fluidShaderActive(null), false);
  st.status = 'ready'; assert.equal(SH.fluidShaderActive(st), true); assert.equal(SH.fluidShaderPending(st), false);
  st.status = 'failed'; assert.equal(SH.fluidShaderActive(st), false); assert.equal(SH.fluidShaderPending(st), false);   // failed: the frames play again
});

test('without document / WebGL (node, old browsers) loading ends quietly and nothing is owned', () => {
  const st = SH.ensureFluidShader('no-document/');
  assert.equal(SH.fluidShaderActive(st), false);
  assert.ok(['idle', 'loading', 'failed'].includes(st.status));
});

test('town-fluid-fx: the shader is asked by default, the drawn frames it replaces are not fetched, spots and clouds still are', async () => {
  const FXM = await import('../src/town-fluid-fx.js');
  assert.equal(FXM.fluidShaderReplaces({ kind: 'tile', group: 'lava' }), true);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'tile', group: 'ice' }), true);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'tile', group: 'river' }), true);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'rect', group: 'waterfall' }), true);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'rect', group: 'lavafall' }), true);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'tile', group: 'cloud' }), true);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'puff', group: 'cloud' }), true);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'spots', group: 'lava-bubble' }), false);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'spots', group: 'sparkle' }), false);
  assert.equal(FXM.fluidShaderReplaces({ kind: 'tile', group: 'foam' }), false);
  const src = readFileSync(file('src/town-fluid-fx.js'), 'utf8');
  assert.match(src, /st\.shader = fluidMode\(\) === 'shader' \? ensureFluidShader\(cfg\.dir\) : null;/);
  assert.match(src, /if \(shaderOwns && fluidShaderReplaces\(p\)\) continue;/);
  assert.ok(!/cutShaderHoles/.test(src));
  const map = JSON.parse(readFileSync(file('index.html'), 'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.match(map['./src/fluid-shader.js'], /fluid-shader\.js\?v=/);
  assert.equal(map['./src/town-fluid-fx.js'], map['./src/town-fluid-fx.js?v=v5fx']);
});
