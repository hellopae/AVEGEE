// FLUID-SHADER pilot (?fluid=shader): the opt-in flag, the flow-phase maths, the pilot assets, the fallback to the drawn frames and the default staying unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const SH = await import('../src/fluid-shader.js');
const FX = 'img/map-zone1/v5-fx/shader/';
const pilot = JSON.parse(readFileSync(file(FX + 'pilot.json'), 'utf8'));

test('only ?fluid=shader turns it on; the default is the drawn frames', () => {
  assert.equal(SH.fluidShaderRequested(''), false);
  assert.equal(SH.fluidShaderRequested('?fluid=frames'), false);
  assert.equal(SH.fluidShaderRequested('?fluid='), false);
  assert.equal(SH.fluidShaderRequested('?mapdpr=1'), false);
  assert.equal(SH.fluidShaderRequested('?fluid=shader'), true);
  assert.equal(SH.fluidShaderRequested('?a=1&fluid=shader'), true);
});

test('the two flow phases are half a cycle apart, weights sum to 1 and a phase has no weight when it jumps', () => {
  for (const sec of [0, .13, .5, 1.7, 33.3]) {
    const f = SH.fluidFlowPhases(sec, .6);
    assert.ok(Math.abs(f.w0 + f.w1 - 1) < 1e-12);
    assert.ok(Math.abs(((f.p1 - f.p0) % 1 + 1) % 1 - .5) < 1e-9);
  }
  // phase 0 wraps at t = 1 (speed 1): weight 0 just before and just after; phase 1 wraps half a cycle later
  assert.ok(SH.fluidFlowPhases(.9999, 1).w0 < 1e-3 && SH.fluidFlowPhases(1.0001, 1).w0 < 1e-3);
  assert.ok(SH.fluidFlowPhases(.4999, 1).w1 < 1e-3 && SH.fluidFlowPhases(.5001, 1).w1 < 1e-3);
  assert.equal(SH.fluidFlowPhases(-5, 1).p0, 0);   // a negative clock never runs backwards
});

test('pilot pieces: world rectangles come from the master rectangles, files exist, parameters are sane', () => {
  assert.deepEqual(pilot.masterSize, [4915, 3277]); assert.deepEqual(pilot.worldSize, [3840, 2560]);
  assert.deepEqual(pilot.pieces.map(p => p.id), ['lavafall-bridge', 'lava-flat-middle']);
  for (const p of pilot.pieces) {
    assert.ok(existsSync(file(FX + p.flow)) && existsSync(file(FX + p.mask)), p.id);
    const r = SH.fluidShaderRect(p, pilot);
    assert.ok(Math.abs(r[2] - p.maskRectPx[2] * 3840 / 4915) < 1e-9);
    assert.ok(r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 3840 && r[1] + r[3] <= 2560);
    assert.ok(p.speed > 0 && p.speed < 2 && p.cycle > 4 && p.cycle < 40 && p.warp >= 0 && p.warp <= 1 && p.pulse >= 0 && p.pulse <= .5);
    assert.equal(p.spark.length, 3); assert.equal(p.drift.length, 2);
  }
});

test('the shader store never owns the pieces until it is ready, and failure hands everything back to the drawn frames', () => {
  const st = SH.shaderStoreOf('test-dir/');
  assert.equal(SH.fluidShaderActive(st), false);
  assert.equal(SH.fluidShaderActive(null), false);
  // a layer is only cut when active
  const ops = []; const g = { drawImage: (...a) => ops.push(a), set globalCompositeOperation(v) { ops.push(v); } };
  SH.cutShaderHoles(g, st, [0, 0, 100, 100]); assert.equal(ops.length, 0);
  st.status = 'ready'; st.pieces = [{ rect: [10, 10, 20, 20], mask: 'M1', ground: {} }, { rect: [500, 500, 20, 20], mask: 'M2', ground: {} }, { rect: [30, 30, 20, 20], mask: 'M3', ground: null }];
  SH.cutShaderHoles(g, st, [0, 0, 100, 100]);
  assert.deepEqual(ops, ['destination-out', ['M1', 10, 10, 20, 20], 'source-over']);   // only a mask that touches the layer AND whose ground is cut is used (M2 is far away, M3 has no ground yet: its drawn frame keeps playing)
  st.status = 'failed'; ops.length = 0; SH.cutShaderHoles(g, st, [0, 0, 100, 100]); assert.equal(ops.length, 0);
});

test('without document / WebGL (node, old browsers) loading ends quietly and nothing is owned', () => {
  const st = SH.ensureFluidShader('no-document/');
  assert.equal(SH.fluidShaderActive(st), false);
  assert.ok(['idle', 'loading', 'failed'].includes(st.status));
});

test('the game default is unchanged: town-fluid-fx only asks the shader module when the flag is on', () => {
  const src = readFileSync(file('src/town-fluid-fx.js'), 'utf8');
  assert.match(src, /st\.shader = shaderWanted\(\) \? ensureFluidShader\(cfg\.dir\) : null;/);
  assert.match(src, /fluidShaderRequested\(\)/);
  const map = JSON.parse(readFileSync(file('index.html'), 'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.match(map['./src/fluid-shader.js'], /fluid-shader\.js\?v=/);
  assert.equal(map['./src/town-fluid-fx.js'], map['./src/town-fluid-fx.js?v=v5fx']);
});
