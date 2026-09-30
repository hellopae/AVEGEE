import test from 'node:test';
import assert from 'node:assert/strict';
import { ZONE_MAP, zoneMapRoute } from '../src/zone-map.js';

test('แผนที่มีทางเดินเชื่อมทุกคู่โซนและกลับทางเดิมได้', () => {
  const zones = Object.keys(ZONE_MAP);
  for (const from of zones) for (const to of zones) {
    if (from === to) continue;
    const route = zoneMapRoute(from, to);
    assert.deepEqual(route[0], ZONE_MAP[from].gate);
    assert.deepEqual(route.at(-1), ZONE_MAP[to].gate);
    assert.deepEqual(route, zoneMapRoute(to, from).toReversed());
    assert.ok(route.every(([x, y]) => x >= 0 && x <= 100 && y >= 0 && y <= 100));
  }
});
