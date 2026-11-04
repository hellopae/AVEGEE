// Z1-LAYOUT-B1: Zone 1 on the owner's layered map (img/map-zone1/v6). Walk floor, anchors, data integrity, zones 2-4 untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, statSync, readdirSync} from 'node:fs';
import {TOWN_V6 as D} from '../src/town-v6-data.js';
import {TOWN_V6_WALK_RUNS} from '../src/town-owner-walkmask-th6.js';
import {TOWN_SIZE,TOWN_STATION_SITES,TOWN_SPOTS,TOWN_SHORE_SPANS,TOWN_WALK_MASK,TOWN_HOUSE_SITES,TOWN_PROP_SITES,applyTownZoneLayout,townContains,townLayoutIsV6} from '../src/town-layout.js?v=k1d';
import {STATIONS,FRONTIER,SPOTS,syncSceneZone,ZONE_ENTRY,QUEUE_LINE,GUARD_POST,MERCHANT,CREW} from '../src/data.js';
import {createGame} from '../src/game.js';
globalThis.Image ??= class {};

const ROOT = new URL('..', import.meta.url).pathname;
const layout = JSON.parse(readFileSync(ROOT + 'docs/art-reviews/2026-11-05-zone1-layout/layout.json', 'utf8'));
const CELL = D.cell, COLS = TOWN_SIZE.w / CELL, ROWS = TOWN_SIZE.h / CELL;

function floorGrid() {
  const g = new Uint8Array(COLS * ROWS); let i = 0, on = 0;
  for (const n of TOWN_V6_WALK_RUNS) { if (on) g.fill(1, i, i + n); i += n; on ^= 1; }
  assert.equal(i, COLS * ROWS, 'runs cover the whole grid');
  return g;
}
const cellOf = (x, y) => [Math.floor(x / CELL), Math.floor(y / CELL)];
function flood(g, [sx, sy]) {
  const seen = new Uint8Array(g.length), q = [sy * COLS + sx]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % COLS, y = (c / COLS) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const n = ny * COLS + nx; if (!g[n] || seen[n]) continue;
      if (dx && dy && !(g[y * COLS + nx] && g[ny * COLS + x])) continue;      // no squeezing through a diagonal pinch
      seen[n] = 1; q.push(n);
    }
  }
  return seen;
}
const reached = (seen, [x, y]) => { const [cx, cy] = cellOf(x, y); return !!seen[cy * COLS + cx]; };

test('zone 1 applies the layered map layout; zones 2-4 keep the legacy zone 1 numbers', () => {
  syncSceneZone('th');
  assert.equal(townLayoutIsV6(), true);
  assert.equal(TOWN_STATION_SITES.krata.v6.id, 'z1-051');
  assert.equal(TOWN_HOUSE_SITES.length, 0, 'the old painted houses are not part of the new map');
  assert.equal(TOWN_PROP_SITES.length, 0, 'the old props are not part of the new map');
  const v6 = {krata: TOWN_STATION_SITES.krata.bx, plaza: [TOWN_SPOTS.plaza.x, TOWN_SPOTS.plaza.y]};
  try { for (const z of ['asia', 'west', 'cyberhell']) {
    syncSceneZone(z);
    assert.equal(townLayoutIsV6(), false, z);
    if (z !== 'cyberhell') assert.equal(TOWN_STATION_SITES.krata.bx, 470, `${z}: legacy krata site`);   // cyberhell shifts its own sites
    assert.equal(TOWN_STATION_SITES.krata.v6, undefined, `${z}: no v6 data leaks`);
    if (z !== 'cyberhell') assert.ok(TOWN_HOUSE_SITES.length > 5, `${z}: legacy houses`);
    assert.deepEqual(TOWN_SHORE_SPANS[0], [520, 720]);
    assert.equal(STATIONS.find(s => s.k === 'krata').v6, undefined);
    assert.equal(FRONTIER.v6, undefined);
  } } finally { syncSceneZone('th'); }
  assert.equal(TOWN_STATION_SITES.krata.bx, v6.krata);
  assert.deepEqual([TOWN_SPOTS.plaza.x, TOWN_SPOTS.plaza.y], v6.plaza);
  assert.ok(STATIONS.find(s => s.k === 'krata').v6);
});

test('walk floor is one connected area holding every spot, crew home, station door, queue point and the pier', () => {
  const g = floorGrid(), seen = flood(g, cellOf(...D.spots.plaza));
  const anchors = {
    ...Object.fromEntries(Object.entries(D.spots).map(([k, v]) => ['spot ' + k, v])),
    ...Object.fromEntries(Object.entries(D.crew).map(([k, v]) => ['crew ' + k, v])),
    ...Object.fromEntries(Object.entries(D.stations).filter(([, v]) => v.x != null).map(([k, v]) => ['station ' + k, [v.x, v.y]])),
    ...Object.fromEntries(D.queue.map((v, i) => ['queue ' + i, v])),
    frontier: [D.frontier.x, D.frontier.y],
  };
  for (const [name, p] of Object.entries(anchors)) {
    assert.equal(townContains(p[0], p[1]), true, `${name} ${p} is walkable`);
    assert.equal(reached(seen, p), true, `${name} ${p} reachable from the plaza`);
  }
  let floor = 0, kept = 0; for (let i = 0; i < g.length; i++) { floor += g[i]; kept += seen[i]; }
  assert.equal(kept, floor, `every floor cell belongs to the single area (${kept}/${floor})`);
});

test('every station door and anchor has standing room around it (workers escort and queue souls there)', () => {
  const anchors = {
    ...Object.fromEntries(Object.entries(D.stations).filter(([, v]) => v.x != null).map(([k, v]) => ['station ' + k, [v.x, v.y]])),
    ...Object.fromEntries(['plaza', 'bench', 'throne', 'bossPier', 'merchant', 'guard', 'challenge', 'gateDoor'].map(k => ['spot ' + k, D.spots[k]])),
    ...Object.fromEntries(Object.entries(D.crew).map(([k, v]) => ['crew ' + k, v])),
  };
  for (const [name, [x, y]] of Object.entries(anchors)) {
    let open = 0; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; if (townContains(x + Math.cos(a) * 40, y + Math.sin(a) * 40)) open++; }
    assert.ok(open >= 4, `${name} ${x},${y} has ${open}/16 open points on a 40 unit ring`);
  }
});

test('legs the owner named stay connected: gate -> plaza -> dais -> upper platform -> lava side -> ice side -> pier', () => {
  const g = floorGrid(), seen = flood(g, cellOf(...D.spots.gateDoor));
  for (const [name, p] of [['plaza', D.spots.plaza], ['dais throne', D.spots.throne], ['dais nira', D.crew.nira], ['upper platform (tarang door)', [D.stations.tarang.x, D.stations.tarang.y]],
    ['heaven gate', [D.stations.sawan.x, D.stations.sawan.y]], ['lava side (krata)', [D.stations.krata.x, D.stations.krata.y]],
    ['ice side (lokan)', [D.stations.lokan.x, D.stations.lokan.y]], ['mirror shrine', [D.stations.krajok.x, D.stations.krajok.y]], ['pier', D.spots.bossPier]])
    assert.equal(reached(seen, p), true, name);
});

test('cliffs, lava, water and object feet are not floor', () => {
  const ok = (x, y) => [x * D.world.scale, y * D.world.scale + D.world.offsetY];
  const blocked = {
    'east cliff face beside the plaza': ok(1700, 750), 'lava under the left bridge': ok(480, 1090), 'soul river west of the pier': ok(700, 1300),
    'soul river under the right bridge': ok(1800, 1100), 'cliff under the lava terraces': ok(120, 700), 'void left of the upper platform': ok(520, 480),
    'ice cliff face (west of the ice terrace)': ok(1960, 820), 'sky': ok(1200, 300),
  };
  for (const [name, p] of Object.entries(blocked)) assert.equal(townContains(p[0], p[1]), false, name);
  // the foot of a pine and of a bush standing on the plaza: z1-032 (pine) and z1-034 (bush)
  for (const id of ['z1-032', 'z1-034', 'z1-028']) {
    const o = D.objects.find(o => o.id === id); const [x, y, w, h] = o.box;
    assert.equal(townContains(x + w / 2, y + h - 3), false, `${id} foot is solid`);
  }
  // the lower gate: the arch is open, the wall feet are solid
  const gate = D.frontier.v6;
  assert.equal(townContains(D.frontier.x, D.frontier.y), true, 'frontier trigger stands in the arch');
  assert.equal(townContains(gate.x + gate.w * .08, gate.y + gate.h - 6), false, 'gate wall foot is solid');
  assert.equal(townContains(gate.x + gate.w * .92, gate.y + gate.h - 6), false, 'gate wall foot is solid (right)');
});

test('stairs and bridges are floor', () => {
  const ok = (x, y) => [x * D.world.scale, y * D.world.scale + D.world.offsetY];
  const open = {'upper platform stairs': ok(960, 720), 'left bridge deck': ok(470, 980), 'right bridge deck': ok(1850, 1000), 'S bridge deck': ok(1220, 1300), 'ice stairs 1': ok(2330, 725), 'lava stairs 3': ok(350, 910), 'lava stairs 4': ok(290, 1060), 'dais stairs': ok(1236, 990), 'pier deck': ok(1031, 1226)};
  for (const [name, p] of Object.entries(open)) assert.equal(townContains(p[0], p[1]), true, name);
});

test('the spawn and the soul queue follow the road from the dais to the bridge', () => {
  syncSceneZone('th');
  assert.deepEqual(ZONE_ENTRY.gate, D.spots.gateDoor);
  assert.equal(QUEUE_LINE.length, 7);
  for (let i = 1; i < QUEUE_LINE.length; i++) assert.ok(QUEUE_LINE[i][1] >= QUEUE_LINE[i - 1][1] - 1, 'queue goes down the road');
  assert.ok(Math.hypot(QUEUE_LINE[0][0] - SPOTS.plaza.x, QUEUE_LINE[0][1] - SPOTS.plaza.y) < 40, 'first soul stands at the dais front');
  assert.ok(TOWN_SHORE_SPANS.length >= 1 && TOWN_SHORE_SPANS.every(([a, b]) => b - a >= 100));
  assert.ok(Math.abs(GUARD_POST[0] - D.spots.guard[0]) < 1 && Math.abs(MERCHANT.x - D.spots.merchant[0]) < 1);
  for (const c of CREW) if (D.crew[c.k]) assert.deepEqual([c.hx, c.hy], D.crew[c.k], `crew ${c.k} home`);
});

test('every mapped station sits on its own sprite and is drawn at its foot depth', () => {
  syncSceneZone('th');
  for (const [k, v] of Object.entries(D.stations)) {
    if (!v.v6) continue;
    const def = STATIONS.find(s => s.k === k);
    assert.equal(def.v6.id, v.v6.id, k);
    const obj = D.objects.find(o => o.id === v.v6.id);
    assert.ok(obj, `${k} -> ${v.v6.id} exists in the layout`);
    assert.equal(obj.depth, v.v6.depth);
    assert.ok(Math.abs(v.v6.x + v.v6.w / 2 - v.bx) < .1 && Math.abs(v.v6.y + v.v6.h - v.by) < .1);
  }
  assert.deepEqual([...D.missingStations].sort(), ['canteen', 'dab', 'ngiw']);
  for (const k of D.missingStations) assert.equal(STATIONS.find(s => s.k === k).v6absent, true, `${k} flagged as not on the map`);
});

test('layout data: 93 objects, the two stale copies stay out, files exist, size budget', () => {
  assert.equal(D.objects.length, 93);
  assert.equal(layout.objects.length, 93);
  assert.equal(new Set(D.objects.map(o => o.id)).size, 93);
  const excluded = JSON.parse(readFileSync(ROOT + 'docs/art-reviews/2026-11-05-zone1-layout/exclusions.json', 'utf8'));
  assert.ok(JSON.stringify(excluded).includes('Im20') && JSON.stringify(excluded).includes('Im21'));
  assert.equal(layout.objects.some(o => o.source.file === 'New Map Zone1-4.ai' && ['Im20', 'Im21'].includes(o.source.image)), false);
  const files = new Set([D.preview, ...D.layers.map(l => l.src), ...D.tiles.map(t => t.src), ...D.clouds.map(c => c.src), ...D.objects.map(o => o.src)]);
  for (const f of files) assert.ok(existsSync(ROOT + f), f);
  const walk = d => readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : [statSync(d + '/' + e.name).size]);
  const total = walk(ROOT + 'img/map-zone1/v6').reduce((a, b) => a + b, 0);
  assert.ok(total <= 40 * 1024 * 1024, `v6 assets ${(total / 1048576).toFixed(1)} MB <= 40 MB`);
  assert.deepEqual(JSON.parse(readFileSync(ROOT + 'img/map-zone1/v6/manifest.json', 'utf8')), JSON.parse(JSON.stringify(D)), 'manifest.json equals town-v6-data.js');
  assert.equal(TOWN_WALK_MASK.cols * TOWN_WALK_MASK.rows, COLS * ROWS);
});

test('the world transform keeps the picture inside the 3840x2560 world', () => {
  const {scale, offsetY} = D.world;
  assert.equal(scale, 1.536);
  assert.ok(Math.abs(2500 * scale - TOWN_SIZE.w) < 1, 'width fits exactly');
  assert.ok(Math.abs(1758 * scale + offsetY - TOWN_SIZE.h) < 1, 'bottom edge sits on the world bottom');
  for (const o of D.objects) assert.ok(o.box[0] > -6 && o.box[0] + o.box[2] < TOWN_SIZE.w + 6, `${o.id} inside the world horizontally`);
});

test('a save made on the old painting moves Yama, crew homes and the guard to the layered map once; a new save is left alone', () => {
  syncSceneZone('th');
  const g = createGame(); g.coin = 777; g.player.x = 3000; g.player.y = 300; g.guard = {x: 1000, y: 700, k: 'guard'};
  const fresh = JSON.parse(JSON.stringify(g.snapshot())); assert.equal(fresh.z1MapVersion, 6, 'new saves carry the map version');
  const old = JSON.parse(JSON.stringify(fresh)); delete old.z1MapVersion;
  const r = createGame(); assert.equal(r.restore(old), true);
  assert.deepEqual([r.player.x, r.player.y], D.spots.plaza, 'Yama is moved to the plaza');
  assert.equal(townContains(r.player.x, r.player.y), true);
  assert.equal(r.coin, 777, 'progress is untouched');
  for (const c of r.crew) if (D.crew[c.k]) assert.deepEqual([c.hx, c.hy], D.crew[c.k], `crew ${c.k}`);
  assert.deepEqual([r.guard.x, r.guard.y], D.spots.guard);
  const keep = createGame(); assert.equal(keep.restore(JSON.parse(JSON.stringify(fresh))), true);
  assert.deepEqual([keep.player.x, keep.player.y], [3000, 300], 'a save that already knows the layered map keeps its position');
});

// leave the shared layout where other test files expect it
test('restore', () => { applyTownZoneLayout('th'); assert.equal(townLayoutIsV6(), true); });
