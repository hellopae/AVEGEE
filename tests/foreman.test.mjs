// FOREMAN (owner 14 Nov): Dam leads the workers.
//   before workers exist: he picks souls up instead of Nira, builds, sells thorns / shards, walks rice to hungry crew
//   once workers exist:   the workers take those jobs, Dam stands at the canteen and the kitchen orders are given to him
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { QUEUE_LINE, STATIONS, MERCHANT } from '../src/data.js';
import { resetWalk } from '../src/walk.js?v=k1d';
import { mapInteractions } from '../src/proximity.js';
import { workerStandbyPoint } from '../src/workers.js';
import { foremanPhase, foremanCourier, foremanDesk, foremanPresent, deskPoint, foremanSay, FOREMAN } from '../src/foreman.js';
import { TH_DICT, EN_DICT } from './helpers/i18n-dicts.mjs';

globalThis.Image = class {};

const station = k => ({ def:STATIONS.find(s => s.k === k), slots:[], crewK:null, intensity:3, build:0, buildWait:false, repair:0, repairWait:false, arrivalElapsed:0, fire:0, speedLv:0, capLv:0, fuelLv:0, mgCd:0 });
function game({ dam = true } = {}) {
  resetWalk();
  const g = createGame();
  g.coin = 9999;
  if (dam) { g.hire('dam'); const d = g.crewOf('dam'); d.x = d.hx; d.y = d.hy; }
  return g;
}
const run = (g, steps, ms = 100) => { for (let i = 0; i < steps; i++) { g.stepWorld(ms); g.advanceAfterlife(ms); } };   // the UI frame runs both
const withWorkers = g => {
  g.zoneEvents.th ||= {}; g.zoneEvents.th.frontierBreach = 'cleared';
  assert.ok(g.hireWorker('cook'), 'a worker can be hired');
};
const arrival = g => { const dock = g.harbourPoint(); return g.startAfterlifeWalk(g.queue[0], [dock.x, dock.y], QUEUE_LINE[0], 'arrival'); };

test('who picks the soul up: Nira until Dam is hired, then Dam; Nira again when he is down, busy or keeping a post', () => {
  const g = game({ dam:false });
  assert.equal(foremanPhase(g), 'none');
  assert.equal(g.courtCourier()?.k, 'nira', 'no Dam yet: the old rule');
  g.hire('dam'); const d = g.crewOf('dam');
  assert.equal(foremanPhase(g), 'field');
  assert.equal(g.courtCourier().k, 'dam');
  d.recoverUntil = Date.now() + 60000;                       // he is down
  assert.equal(foremanPhase(g), 'none');
  assert.equal(g.courtCourier()?.k, 'nira', 'Dam down: Nira covers');
  d.recoverUntil = 0; d.buildK = 'sala';
  assert.equal(g.courtCourier()?.k, 'nira', 'Dam is building: Nira covers');
  d.buildK = null; d.at = 'krata';
  assert.equal(foremanPresent(g), false, 'a station post the player gave him ends the foreman job');
  assert.equal(g.courtCourier()?.k, 'nira');
  d.at = null; d.escort = 'someone';
  assert.equal(g.courtCourier()?.k, 'nira', 'Dam is already walking a soul');
});

test('a docked soul is walked to the queue by Dam, and he is free to work again afterwards', () => {
  const g = game();
  assert.equal(arrival(g), true);
  const walk = g.afterlifeWalks.find(w => w.destination === 'arrival');
  assert.equal(walk.escort.k, 'dam');
  assert.equal(walk.escort.courtCourier, true);
  const d = g.crewOf('dam');
  assert.equal(d.escort, walk.soul.id);
  run(g, 400);                                                // long enough for any route in the zone
  assert.equal(d.escort ?? null, null, 'released at the end of the walk');
  assert.equal(g.afterlifeWalks.some(w => w.destination === 'arrival'), false);
  assert.equal(g.courtArrivals.some(a => a.soulId === walk.soul.id), false);
});

test('Nira keeps her own arrival job when Dam is not hired (nothing changed for old games)', () => {
  const g = game({ dam:false });
  assert.equal(arrival(g), true);
  assert.equal(g.afterlifeWalks.find(w => w.destination === 'arrival').escort.k, 'nira');
});

test('before workers: Dam cuts thorns, walks them to the merchant and is paid the same as a worker trip', () => {
  const g = game();
  g.stations.push(station('ngiw')); g.syncBlocks?.(true);
  const before = g.coin, d = g.crewOf('dam');
  let steps = 0; while (g.coin === before && steps++ < 1500) g.stepWorld(100);
  assert.equal(g.coin - before, FOREMAN.sale.ngiwWood, 'one trip of thorns sold');
  assert.ok(steps > 80, `he really walked there and back, it took ${steps / 10} s (one man is slow)`);
  assert.ok(steps < 1500);
  assert.equal(d.fmCarry ?? null, null, 'the load is gone after the sale');
});

test('before workers: Dam alternates between thorns and shards when both stations stand, and does nothing without them', () => {
  const idle = game();
  run(idle, 600);
  assert.equal(idle.crewOf('dam').fm ?? null, null, 'no station to gather from: no job');
  const spot = workerStandbyPoint(0), d0 = idle.crewOf('dam');
  assert.ok(Math.hypot(d0.x - spot[0], d0.y - spot[1]) < FOREMAN.arrive + 2, 'idle: he waits on the plaza in the middle of the map (the next soul is fetched sooner than from his far post)');
  const g = game();
  g.stations.push(station('ngiw'), station('dab')); g.syncBlocks?.(true);
  const seen = new Set();
  for (let i = 0; i < 4000 && seen.size < 2; i++) { g.stepWorld(100); const j = g.crewOf('dam').fm; if (j?.kind === 'gather') seen.add(j.material); }
  assert.deepEqual([...seen].sort(), ['dabShards', 'ngiwWood']);
});

test('before workers: Dam carries a rice ball to the hungriest crew member; the stock drops only at the hand-over', () => {
  const g = game();
  const taan = g.crewOf('taan'); taan.x = taan.x ?? taan.hx; taan.y = taan.y ?? taan.hy; taan.hunger = 10;
  g.food = 10;
  run(g, 3);
  const d = g.crewOf('dam');
  assert.equal(d.fm?.kind, 'feed', 'he sets out');
  assert.equal(g.food, 10, 'nothing taken from the stock yet (a reload now loses nothing)');
  const before = taan.hunger;
  let steps = 0; while (taan.hunger <= before && steps++ < 1500) g.stepWorld(100);
  assert.ok(taan.hunger > before, 'the rice reached him');
  assert.equal(g.food, 9, 'exactly one ball left the stock');
  assert.equal(d.fm ?? null, null);
});

test('before workers: no food in the stock = no feeding trip', () => {
  const g = game();
  const taan = g.crewOf('taan'); taan.x = taan.x ?? taan.hx; taan.y = taan.y ?? taan.hy; taan.hunger = 10;
  g.food = 0;
  run(g, 50);
  assert.notEqual(g.crewOf('dam').fm?.kind, 'feed');
});

test('an order to build takes Dam off any field job (nothing lost, nothing stuck)', () => {
  const g = game();
  g.stations.push(station('ngiw'));
  run(g, 5);
  const d = g.crewOf('dam');
  assert.equal(d.fm?.kind, 'gather');
  g.crewOf('taan').buildK = 'sala';                          // Taan is busy, so the next builder is Dam
  assert.equal(g.availableBuilder()?.k, 'dam');
  d.buildK = 'krata';
  run(g, 2);
  assert.equal(d.fm ?? null, null, 'job dropped while he builds');
  assert.equal(d.fmWork ?? false, false);
});

test('with workers: Dam stands at the canteen, the workers build, and the kitchen desk appears', () => {
  const g = game();
  withWorkers(g);
  assert.equal(foremanPhase(g), 'canteen');
  assert.equal(foremanCourier(g), null, 'workers collect the souls now (the old rule of game.js)');
  assert.equal(foremanDesk(g), null, 'no kitchen yet: no desk');
  g.stations.push(station('canteen')); g.syncBlocks?.(true);
  run(g, 500);
  const d = g.crewOf('dam'), spot = deskPoint(g);
  assert.ok(Math.hypot(d.x - spot[0], d.y - spot[1]) < FOREMAN.arrive + 2, 'Dam is at the desk beside the kitchen');
  assert.ok(foremanDesk(g));
  const target = mapInteractions(g, MERCHANT).find(t => t.kind === 'foreman');
  assert.ok(target, 'a button to talk to him');
  assert.equal(target.id, 'foreman');
  assert.match(target.label, /ดำ/);
  assert.equal(g.builders().some(c => c.k === 'dam'), false, 'workers build and repair now; Dam stays with the kitchen');
  assert.equal(d.fm ?? null, null, 'he does no field job any more');
});

test('with workers: Dam down = no desk, the canteen window keeps its own controls', () => {
  const g = game();
  withWorkers(g);
  g.stations.push(station('canteen')); g.syncBlocks?.(true);
  run(g, 400);
  assert.ok(foremanDesk(g));
  g.crewOf('dam').recoverUntil = Date.now() + 60000;
  assert.equal(foremanDesk(g), null);
  assert.equal(mapInteractions(g, MERCHANT).some(t => t.kind === 'foreman'), false);
});

test('old saves: a save with Dam, workers and a canteen lands in the canteen state; without Dam nothing is added', () => {
  const g = game();
  withWorkers(g);
  g.stations.push(station('canteen')); g.syncBlocks?.(true);
  const saved = JSON.parse(JSON.stringify(g.snapshot()));
  const loaded = createGame();
  assert.equal(loaded.restore(saved), true);
  assert.equal(foremanPhase(loaded), 'canteen');
  assert.equal(loaded.workers().length, 1, 'the worker survived the round trip');
  assert.doesNotMatch(JSON.stringify(saved), /"fm(Work|Carry|Goal|Target|Retry|Fail|Cool|Trips|SayAt|SayKey)?":/, 'job state is never saved');
  const bare = game({ dam:false });
  const bareSaved = JSON.parse(JSON.stringify(bare.snapshot()));
  const reloaded = createGame(); assert.equal(reloaded.restore(bareSaved), true);
  assert.equal(foremanPhase(reloaded), 'none');
});

test('a worker fired again puts Dam back on field duty', () => {
  const g = game();
  withWorkers(g);
  assert.equal(foremanPhase(g), 'canteen');
  g.dismissWorker(g.workers()[0].id);
  assert.equal(foremanPhase(g), 'field');
  assert.equal(g.courtCourier().k, 'dam');
});

test('speech: the same line is not repeated at once, but a new job gets its own line immediately', () => {
  const g = game(), d = g.crewOf('dam');
  foremanSay(d, 'foreman.say.gather', 1000);
  const first = d.say;
  d.say = 'x'; foremanSay(d, 'foreman.say.gather', 2000);
  assert.equal(d.say, 'x', 'same line inside the gap: untouched');
  foremanSay(d, 'foreman.say.feed', 2100);
  assert.notEqual(d.say, 'x', 'a different job: new line');
  foremanSay(d, 'foreman.say.gather', 2000 + FOREMAN.sayGapMs + 200);
  assert.equal(d.say, first, 'after the gap the first line may come again');
});

test('wiring: the talk window, canteen hand-over, help book and both languages are in place', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /function openForeman/);
  assert.match(ui, /now\.kind === 'foreman'/);
  assert.match(ui, /data-open-foreman/, 'the canteen window sends the player to the same single window');
  assert.match(ui, /ดำ \(หัวหน้าคนงาน\)/, 'the how-to-play book describes the new rules');
  assert.doesNotMatch(ui, /ดำและเพลิงไม่ปรุงอาหารแล้ว/, 'the old sentence that put Dam back to his old job is gone');
  for (const k of ['foreman.title', 'foreman.line', 'foreman.talk', 'foreman.done', 'foreman.canteen.hint', 'foreman.canteen.go',
    'foreman.say.feed', 'foreman.say.gather', 'foreman.say.pickup', 'foreman.say.desk', 'foreman.log.fed']) {
    assert.ok(TH_DICT[k], `TH ${k}`); assert.ok(EN_DICT[k], `EN ${k}`);
  }
});
