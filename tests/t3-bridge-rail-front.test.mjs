// T3/5: the near rail of each of the 13 bridges is drawn again (clipped graded ground, no new art) at the depth of the bridge's near edge
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BRIDGE_RAILS } from '../src/town-bridge-rails.js';
import { railBandSlices, deckY, addBridgeRailFrontLayers, RAIL_BAND, RAIL_FRONT, setBridgeRailFront } from '../src/town-bridge-rail-front.js';

test('T3/5: 13 bridges (th 1, asia 5, west 2, cyberhell 5), each cut into slices that cover the whole span just below the deck centre line', () => {
  const all = Object.entries(BRIDGE_RAILS).flatMap(([z, l]) => l.map(b => [z, b]));
  assert.equal(all.length, 13);
  for (const [z, b] of all) {
    const slices = railBandSlices(b);
    assert.equal(slices.length, RAIL_BAND.slices);
    assert.ok(Math.abs(slices[0].rect[0] - b.rect[0]) < 1e-6 && Math.abs(slices.at(-1).rect[0] + slices.at(-1).rect[2] - b.rect[2]) < 1e-6, `${z}: covers the span`);
    for (const s of slices) {
      const xs = s.poly.map(p => p[0]), lo = Math.min(...xs), hi = Math.max(...xs);
      for (const x of [lo, (lo + hi) / 2, hi]) {
        const ys = s.poly.filter(p => Math.abs(p[0] - x) < 1e-6).map(p => p[1]);
        assert.ok(Math.min(...ys) > deckY(b, x), `${z}: the band starts below the deck centre line (the posts)`);
        assert.ok(Math.max(...ys) >= deckY(b, x) + b.hw, `${z}: and reaches the near edge of the walkable strip`);
      }
      // anyone standing on the deck strip (feet y <= centre + hw) is drawn BEFORE the band (depth is past the near edge of every point of the slice)
      for (let x = lo; x <= hi; x += 3) assert.ok(s.depth > deckY(b, x) + b.hw, `${z}: depth ${s.depth} is in front of the strip at x=${x}`);
    }
  }
});

test('T3/5: the layers are queued per slice only for bridges in view, only in the zone they belong to, and switch off in one place', () => {
  const calls = [];
  const ctx = { canvas: { width: 4000, height: 2600 }, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) };
  const at = (y, fn) => calls.push([y, fn]);
  assert.equal(addBridgeRailFrontLayers(at, ctx, 'asia', 0), 5 * RAIL_BAND.slices);
  assert.equal(addBridgeRailFrontLayers(at, ctx, 'th', 0), RAIL_BAND.slices);
  assert.equal(addBridgeRailFrontLayers(at, ctx, 'nowhere', 0), 0);
  const small = { canvas: { width: 300, height: 300 }, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) };
  assert.equal(addBridgeRailFrontLayers(at, small, 'asia', 0), 0, 'nothing queued when no bridge is in view');
  setBridgeRailFront(false);
  assert.equal(RAIL_FRONT.on, false);
  assert.equal(addBridgeRailFrontLayers(at, ctx, 'asia', 0), 0);
  setBridgeRailFront(true);
  const scene = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
  assert.match(scene, /if\(town\)addBridgeRailFrontLayers\(at,ctx,g\.zone,t\)/);
});
