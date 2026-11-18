import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/town-layout.js?v=k1d';
import { G1_HOUSES, G1_STATION_K, G1_TREES, G1_TREE_MOVES, G1_TREE_REMOVED, G1_ROCKS } from '../src/town-zone1-g1.js';

// G1 (owner 18-19 Nov, drawings 1-8): building sizes / facing, trees and rocks of Zone 1 only.
const OLD = (() => {   // the base layout zones 2-4 inherit (th:{} = no Zone 1 patch)
  L.applyTownZoneLayout('th', { th:{} }, true);
  const o = structuredClone({ houses:L.TOWN_HOUSE_SITES, stations:L.TOWN_STATION_SITES, props:L.TOWN_PROP_SITES });
  L.applyTownZoneLayout('th', L.TOWN_ZONE_LAYOUT, true);
  return o;
})();
const marks = () => [
  ...Object.entries(L.TOWN_STATION_SITES).map(([k, s]) => ['door ' + k, s.x, s.y]),
  ...Object.entries(L.TOWN_SPOTS).filter(([, s]) => typeof s.x === 'number').map(([k, s]) => ['spot ' + k, s.x, s.y]),
  ...Object.entries(L.TOWN_CREW).map(([k, s]) => ['crew ' + k, s[0], s[1]]),
  ...L.TOWN_QUEUE.map((q, i) => ['queue' + i, q[0], q[1]]),
  ['merchant', L.TOWN_MERCHANT.x, L.TOWN_MERCHANT.y], ['guard', ...L.TOWN_GUARD_POST], ['challenge', ...L.TOWN_CHALLENGE], ['frontier', L.TOWN_FRONTIER.x, L.TOWN_FRONTIER.y],
];

test('G1: houses take the owner factors and the two arrows, feet stay where they were', () => {
  assert.equal(L.TOWN_HOUSE_SITES.length, OLD.houses.length);
  L.TOWN_HOUSE_SITES.forEach((h, i) => {
    const o = OLD.houses[i], g = G1_HOUSES[i];
    assert.deepEqual([h.x, h.y, h.key], [o.x, o.y, o.key], 'foot never moves ' + i);
    assert.ok(Math.abs(h.w - o.w * (g?.k ?? 1)) < .06, 'width ' + i);
    assert.equal(h.flip, g?.flip === undefined ? o.flip : g.flip, 'facing ' + i);
  });
  assert.equal(L.TOWN_HOUSE_SITES[6].flip, false);   // drawing 1 lower-left house
  assert.equal(L.TOWN_HOUSE_SITES[9].flip, true);    // drawing 4 top house
  assert.equal(L.TOWN_HOUSE_SITES[3].w, OLD.houses[3].w, 'the canteen slot (index 3) is not touched');
});

test('G1: Tea and Sala are smaller by the drawn factor, doors and feet unchanged', () => {
  for (const k of ['tea', 'sala']) {
    const n = L.TOWN_STATION_SITES[k], o = OLD.stations[k];
    assert.deepEqual([n.x, n.y, n.bx, n.by], [o.x, o.y, o.bx, o.by], k);
    assert.ok(Math.abs(n.mapScale / o.mapScale - G1_STATION_K[k]) < 1e-9 && Math.abs(n.bw / o.bw - G1_STATION_K[k]) < 1e-9, k);
  }
  for (const k of Object.keys(OLD.stations).filter(k => !['tea', 'sala'].includes(k)))
    assert.deepEqual(L.TOWN_STATION_SITES[k], OLD.stations[k], k + ' untouched');
});

test('G1: trees / rocks - crossed out gone, moved ones moved, new ones present with unique ids', () => {
  const ids = new Set(L.TOWN_PROP_SITES.map(p => p.id));
  assert.equal(ids.size, L.TOWN_PROP_SITES.length);
  for (const id of G1_TREE_REMOVED) assert.equal(ids.has(id), false, id);
  for (const [id, [x, y, w]] of Object.entries(G1_TREE_MOVES)) assert.deepEqual(L.TOWN_PROP_SITES.find(p => p.id === id) && [L.TOWN_PROP_SITES.find(p => p.id === id).x, L.TOWN_PROP_SITES.find(p => p.id === id).y, L.TOWN_PROP_SITES.find(p => p.id === id).w], [x, y, w], id);
  assert.equal(L.TOWN_PROP_SITES.filter(p => p.id.startsWith('g1-o')).length, G1_TREES.length);
  assert.equal(L.TOWN_PROP_SITES.filter(p => p.id.startsWith('g1-rock-')).length, G1_ROCKS.length);
  assert.equal(L.TOWN_PROP_SITES.length, OLD.props.length - G1_TREE_REMOVED.length + G1_TREES.length + G1_ROCKS.length);
  for (const p of L.TOWN_PROP_SITES.filter(p => p.id.startsWith('g1-'))) {
    assert.ok(p.w >= 20 && p.w <= 200, p.id + ' size');
    assert.equal(L.townPropBlocks(p.x, p.y), true, p.id + ' has a root');
  }
});

test('G1: zones 2-4 get none of it (their layout is still the base)', () => {
  for (const zone of ['asia', 'west', 'cyberhell']) {
    L.applyTownZoneLayout(zone, L.TOWN_ZONE_LAYOUT, true);
    try {
      assert.equal(L.TOWN_PROP_SITES.some(p => p.id.startsWith('g1-')), false, zone + ' props');
      if (zone !== 'cyberhell') {
        assert.deepEqual(L.TOWN_HOUSE_SITES.map(h => [h.x, h.y, h.w, h.flip]), OLD.houses.map(h => [h.x, h.y, h.w, h.flip]), zone + ' houses');
        assert.equal(L.TOWN_STATION_SITES.tea.bw, OLD.stations.tea.bw, zone + ' tea');
        assert.equal(L.TOWN_STATION_SITES.sala.mapScale, OLD.stations.sala.mapScale, zone + ' sala');
      }
    } finally { L.applyTownZoneLayout('th', L.TOWN_ZONE_LAYOUT, true); }
  }
});

test('G1: nothing new stands on a door, queue or crew post; no crown hides one', () => {
  const m = marks();
  for (const p of L.TOWN_PROP_SITES.filter(p => p.id.startsWith('g1-'))) {
    for (const [name, x, y] of m) {
      if (name.startsWith('queue') && Math.hypot(p.x - x, p.y - y) < 40) assert.fail(p.id + ' on ' + name);
      assert.ok(Math.hypot(p.x - x, p.y - y) >= 50, `${p.id} (${p.x},${p.y}) too close to ${name} (${x},${y})`);
    }
  }
  // a crown (width w, ~1.09 w tall) drawn over a post whose feet are behind the tree's foot would hide the person; Taan's strip is the one known touch (see report)
  for (const p of L.TOWN_PROP_SITES.filter(p => p.id.startsWith('g1-o'))) {
    for (const [name, x, y] of m) {
      if (name === 'crew taan') continue;
      const dx = Math.abs(x - p.x), up = p.y - y;
      assert.ok(!(dx < p.w * .42 && up > -2 && up < p.w * 1.09 * .9), `${p.id} crown covers ${name}`);
    }
  }
});

test('G1: every landmark still reachable from the plaza on the walk mask', () => {
  const C = 8, W = Math.ceil(L.TOWN_SIZE.w / C), H = Math.ceil(L.TOWN_SIZE.h / C), seen = new Uint8Array(W * H), st = [[(1862 / C) | 0, (1090 / C) | 0]];
  const ok = (x, y) => L.townContains(x * C + C / 2, y * C + C / 2);
  seen[st[0][1] * W + st[0][0]] = 1;
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !ok(nx, ny)) continue; seen[ny * W + nx] = 1; st.push([nx, ny]); } }
  const near = (x, y) => { for (let r = 0; r <= 3; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) { const cx = ((x / C) | 0) + dx, cy = ((y / C) | 0) + dy; if (cx >= 0 && cy >= 0 && cx < W && cy < H && seen[cy * W + cx]) return true; } return false; };
  for (const [name, x, y] of [...marks(), ...L.TOWN_STAIRS.map(s => ['stair ' + s.key, ...s.point])]) assert.ok(near(x, y), name + ' unreachable');
});
