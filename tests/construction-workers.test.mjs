import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, BUILD_TIME } from '../src/data.js';

globalThis.Image = class {};
const setup = () => {
  const g = createGame();
  g.coin = 10000;
  assert.equal(g.hire('dam'), true);
  return g;
};
const unbuilt = g => STATIONS.filter(s => s.cost > 0 && !g.stations.some(st => st.def.k === s.k));

test('dam builds while taan is on duty, escorting, or building; busy crew cannot take another job', () => {
  for (const busy of [{ at:'krata' }, { escort:123 }, { buildK:'krata' }]) {
    const g = setup();
    Object.assign(g.crewOf('taan'), busy);
    const [a,b] = unbuilt(g);
    assert.equal(g.availableBuilder().k, 'dam');
    assert.equal(g.build(a.k), true);
    assert.equal(g.crewOf('dam').buildK, a.k);
    const coin = g.coin;
    assert.equal(g.build(b.k), false);
    assert.equal(g.coin, coin);
  }
});

test('two simultaneous builds preserve their owners on reload and release each worker independently', () => {
  const g = setup();
  const [a,b] = unbuilt(g);
  assert.equal(g.build(a.k), true);
  assert.equal(g.build(b.k), true);
  assert.equal(g.crewOf('taan').buildK, a.k);
  assert.equal(g.crewOf('dam').buildK, b.k);
  // Walking must remain pending even if the original estimated finish time passes.
  g.stations.filter(st => st.build).forEach(st => { st.build = Date.now() - 1; });
  const loaded = createGame();
  assert.equal(loaded.restore(g.snapshot()), true);
  for (const k of ['taan','dam']) {
    const c = loaded.crewOf(k);
    const st = loaded.stations.find(st => st.def.k === c.buildK);
    assert.equal(st.buildWait, true);
    assert.ok(st.build > Date.now());
    c.x = st.def.x; c.y = st.def.y;
  }
  loaded.stepWorld(16);
  for (const st of loaded.stations.filter(st => st.build)) {
    assert.equal(st.buildWait, false);
    assert.ok(st.build > Date.now() + BUILD_TIME - 1000);
  }
  loaded.stations.find(st => st.def.k === b.k).build = Date.now() - 1;
  loaded.stepWorld(16);
  assert.equal(loaded.crewOf('dam').buildK, null);
  assert.equal(loaded.crewOf('taan').buildK, a.k);
});

test('dam repairs independently while taan builds, keeping ownership through walking, reload and completion', () => {
  const g = setup();
  const [a] = unbuilt(g);
  assert.equal(g.build(a.k), true);
  const damaged = g.stations.find(st => !st.build);
  damaged.fire = 100;
  const coin = g.coin;
  assert.equal(g.repairStation(damaged.def.k), true);
  assert.equal(g.coin, coin);
  assert.equal(g.crewOf('dam').buildK, damaged.def.k);
  const loaded = createGame();
  assert.equal(loaded.restore(g.snapshot()), true);
  const worker = loaded.crewOf('dam');
  const st = loaded.stations.find(st => st.def.k === damaged.def.k);
  worker.x = st.def.x; worker.y = st.def.y;
  loaded.stepWorld(16);
  assert.equal(st.repairWait, false);
  assert.ok(st.repair > Date.now());
  st.repair = Date.now() - 1;
  loaded.stepWorld(16);
  assert.equal(st.fire, 0);
  assert.equal(worker.buildK, null);
  assert.equal(loaded.crewOf('taan').buildK, a.k);
});

test('repair never interrupts an escort and still requires enemies to be cleared', () => {
  const g = setup();
  g.stations[0].fire = 100;
  g.crewOf('taan').escort = 1;
  g.crewOf('dam').escort = 2;
  assert.equal(g.canRepair(g.stations[0].def.k), false);
  g.crewOf('dam').escort = null;
  g.mobs.push({ id:1 });
  assert.equal(g.canRepair(g.stations[0].def.k), false);
  g.mobs = [];
  assert.equal(g.canRepair(g.stations[0].def.k), true);
});

test('loading a dam-owned repair does not assign taan to the same site', () => {
  const g = setup();
  g.crewOf('taan').at = 'krata';
  g.stations[0].fire = 100;
  assert.equal(g.repairStation(g.stations[0].def.k), true);
  g.crewOf('taan').at = null;
  const loaded = createGame();
  assert.equal(loaded.restore(g.snapshot()), true);
  assert.equal(loaded.crewOf('taan').buildK ?? null, null);
  assert.equal(loaded.crewOf('dam').buildK, g.stations[0].def.k);
});

test('two repair jobs keep separate owners when leaving and returning to a branch', () => {
  const g = setup();
  const sites = g.stations.slice(0,2);
  for (const st of sites) {
    st.fire = 100;
    assert.equal(g.repairStation(st.def.k), true);
  }
  const owners = g.builders().map(c => [c.k,c.buildK]);
  g.bossCleared.th = true;
  assert.equal(g.moveZone('asia'), true);
  assert.equal(g.moveZone('th'), true);
  for (const [k,site] of owners) assert.equal(g.crewOf(k).buildK, site);
  assert.equal(g.stations.filter(st => st.repairWait).length, 2);
});

// Regression: the old roaming radius (73.6) exceeded the arrival radius (42).
test('a builder stopped 45 units from lan approaches instead of roaming forever, with a mob present', () => {
  const g = setup();
  assert.equal(g.build('lan'), true);
  const c = g.crewOf('taan'), st = g.stations.find(st => st.def.k === 'lan');
  c.x = st.def.x + 45; c.y = st.def.y; c.path = null; c.wait = 0;
  g.mobs = [{ id:1900, x:710, y:674, hp:100, kind:0 }];
  const random = Math.random;
  Math.random = () => 0.999;
  try {
    for (let i = 0; i < 1876 && st.buildWait; i++) g.stepWorld(16);
    assert.equal(st.buildWait, false);
    assert.equal(c.buildK, 'lan');
  } finally { Math.random = random; }
});
