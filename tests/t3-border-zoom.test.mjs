// T3/2 (owner 18 Nov, G2): the border routes (1-2, 2-3, 3-4) have two camera distances - medium and near - and no whole-map button.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { frontierCameraTarget } from '../src/frontier-view-metrics.js';
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
test('T3/2: two zoom levels, medium (default, = the old 1x) and near, and the whole-map button is gone', () => {
  const dv = src('src/dungeon-view.js');
  assert.match(dv, /BORDER_ZOOM=Object\.freeze\(\[1,1\.5\]\)/);
  assert.doesNotMatch(dv, /data-zoom="overview"/, 'no whole-map button on the border routes');
  assert.match(dv, /levels:BORDER_ZOOM,level:0/);
  const medium = frontierCameraTarget(390, 844, [.5, .5], false, 1), near = frontierCameraTarget(390, 844, [.5, .5], false, 1.5);
  assert.ok(near.scale > medium.scale, 'near is closer than medium');
});

test('T3/2 (G3): the hell merchant has a spot on the floor in front of the cave of every border route, and the route view has his talk button', async () => {
  globalThis.Image = class {}; globalThis.window = { matchMedia: () => ({ matches: true }), devicePixelRatio: 1, addEventListener() {} };
  globalThis.document = { documentElement: {}, createElement() { return { getContext() { return {}; } }; } };
  const { routeMerchant } = await import('../src/route-merchant.js');
  const { dungeonWalkable } = await import('../src/dungeon-view.js');
  for (const id of ['th:asia', 'asia:west', 'west:cyberhell']) {
    const spot = routeMerchant(id);
    assert.ok(spot, id + ' has a merchant spot');
    assert.equal(dungeonWalkable(spot, id, 1), true, id + ': he stands on the painted floor');
  }
  const dv = src('src/dungeon-view.js');
  assert.match(dv, /class="dungeon-merchant"/);
  assert.match(dv, /merchantShown=\(\)=>!!merchantSpot&&!!g\.zoneCaptivesFree\?\.\(\)&&!!g\.merchantAvailable\?\.\(\)/, 'same availability rule as the town merchant');
  assert.match(src('src/ui.js'), /onMerchant:\(\)=>\{destroy\?\.\(\);destroy=null;openMerchant\(\)/);
});
