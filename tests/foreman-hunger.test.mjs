// QUEST-DAM-B (owner 15 Nov): Dam gets hungry like a worker.
//   before the canteen the player gives the rice ball by hand (team page); after it a server brings it by queue, hungriest first
//   at hunger 0 he stops the foreman's work and waits (never dies or leaves); Nira covers the souls meanwhile
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, BAL } from '../src/data.js';
import { resetWalk } from '../src/walk.js?v=k1d';
import { foremanPhase, foremanStarving, foremanPresent, FOREMAN } from '../src/foreman.js';
import { zoneWorkers } from '../src/workers.js';
import { canteenState } from '../src/canteen.js';

globalThis.Image = class {};

const station = k => ({ def:STATIONS.find(s => s.k === k), slots:[], crewK:null, intensity:3, build:0, buildWait:false, repair:0, repairWait:false, arrivalElapsed:0, fire:0, speedLv:0, capLv:0, fuelLv:0, mgCd:0 });
function game() {
  resetWalk();
  const g = createGame();
  g.coin = 9999; g.food = 30;
  g.hire('dam'); const d = g.crewOf('dam'); d.x = d.hx; d.y = d.hy;
  return g;
}
const frames = (g, n, ms = 100) => { for (let i = 0; i < n; i++) { g.stepWorld(ms); g.advanceAfterlife(ms); } };
const beats = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
// the real game: a world frame every 100 ms, one beat (step) every 10 frames
const play = (g, n) => { for (let i = 0; i < n; i++) { g.stepWorld(100); g.advanceAfterlife(100); if (i % 10 === 9) g.step(); } };

test('Dam starts full, drains one beat per tick only while he works, and idle costs nothing', () => {
  const g = game(); const d = g.crewOf('dam');
  assert.equal(d.hunger, 100);
  frames(g, 20);
  const idle = d.hunger; beats(g, 40);
  assert.equal(d.hunger, idle, 'standing idle on the plaza: no drain (a worker without a job eats nothing either)');
  g.stations.push(station('ngiw')); g.syncBlocks?.(true);
  frames(g, 10);
  assert.equal(d.fm?.kind, 'gather', 'now he has a job');
  const before = d.hunger; beats(g, 40);
  assert.ok(Math.abs((before - d.hunger) - 40 * BAL.hungerDrain) < 1e-9, `drained ${before - d.hunger} over 40 beats`);
});

test('with workers: Dam at the kitchen post drains too', () => {
  const g = game(); const d = g.crewOf('dam');
  g.zoneEvents.th ||= {}; g.zoneEvents.th.frontierBreach = 'cleared';
  assert.ok(g.hireWorker('serve'));
  g.stations.push(station('canteen')); g.syncBlocks?.(true);
  assert.equal(foremanPhase(g), 'canteen');
  const before = d.hunger; beats(g, 20);
  assert.ok(Math.abs((before - d.hunger) - 20 * BAL.hungerDrain) < 1e-9);
});

test('hunger 0: he stops (no field job, not a builder, Nira takes the souls), stands on the plaza, and is never lost', () => {
  const g = game(); const d = g.crewOf('dam');
  g.stations.push(station('ngiw')); g.syncBlocks?.(true);
  frames(g, 10); assert.equal(d.fm?.kind, 'gather');
  d.hunger = 0;
  assert.equal(foremanStarving(g), true);
  assert.equal(foremanPresent(g), false);
  assert.equal(foremanPhase(g), 'none');
  assert.equal(g.courtCourier()?.k, 'nira', 'the foreman duty stops: Nira meets the souls again');
  assert.equal(g.builders().some(c => c.k === 'dam'), false, 'he does not build either while starving');
  frames(g, 80);
  assert.equal(d.fm ?? null, null, 'job dropped');
  assert.ok(g.crew.includes(d) && d.hunger === 0, 'still there, still hired, not removed');
  assert.ok(!d.recoverUntil, 'he did not fall over - hunger never kills');
  const coin = g.coin; frames(g, 400);
  assert.equal(g.coin, coin, 'no more thorn sales while he is hungry');
});

test('before the canteen: the player feeds him by hand (team page button) and he goes back to work', () => {
  const g = game(); const d = g.crewOf('dam');
  g.stations.push(station('ngiw')); g.syncBlocks?.(true);
  d.hunger = 0; frames(g, 20);
  assert.equal(d.fm ?? null, null);
  const food = g.food;
  assert.equal(g.feedCrew('dam'), true, 'the same button the other reapers have');
  assert.equal(d.hunger, BAL.feedHunger);
  assert.equal(g.food, food - BAL.feedFoodCost, 'the rice ball comes out of the stock');
  assert.equal(foremanStarving(g), false);
  assert.equal(foremanPhase(g), 'field');
  frames(g, 10);
  assert.equal(d.fm?.kind, 'gather', 'back to work');
  assert.equal(g.courtCourier()?.k, 'dam');
});

test('after the canteen: a server brings Dam his rice ball in queue order - the hungriest first', () => {
  const g = game(); const d = g.crewOf('dam'), taan = g.crewOf('taan');
  g.zoneEvents.th ||= {}; g.zoneEvents.th.frontierBreach = 'cleared';
  const server = g.hireWorker('serve');
  assert.ok(server);
  g.stations.push(station('canteen')); g.syncBlocks?.(true);
  taan.x = taan.x ?? taan.hx; taan.y = taan.y ?? taan.hy;
  canteenState(g).meals = 4;
  d.hunger = 30; taan.hunger = 60;                           // Dam is hungrier than Taan
  play(g, 30);
  assert.equal(server.job?.kind, 'food');
  assert.equal(server.job.recipient, d.id, 'Dam is first in the queue because he is the hungriest');
  const stock = canteenState(g).meals;
  let steps = 0; while (d.hunger <= 30 && steps++ < 300) { play(g, 10); }
  assert.ok(d.hunger > 30, `a server reached him (${steps} s)`);
  assert.ok(canteenState(g).meals < stock, 'the ball came out of the kitchen');
  assert.equal(zoneWorkers(g)[0].job?.recipient === d.id, false, 'and the job is over');
  // the next one in the queue is Taan (60 < 80)
  taan.hunger = 20; d.hunger = 90; canteenState(g).meals = 3;
  play(g, 30);
  assert.equal(server.job?.recipient, taan.id, 'the queue moves on to the next hungriest');
});

test('after the canteen: starving Dam leaves his desk for the plaza, the kitchen window takes the orders itself, and a served meal puts him back', () => {
  const g = game(); const d = g.crewOf('dam');
  g.zoneEvents.th ||= {}; g.zoneEvents.th.frontierBreach = 'cleared';
  assert.ok(g.hireWorker('serve'));
  g.stations.push(station('canteen')); g.syncBlocks?.(true);
  play(g, 100); assert.equal(foremanPhase(g), 'canteen');
  d.hunger = 0;
  assert.equal(foremanPhase(g), 'none');
  assert.equal(foremanStarving(g), true);
  canteenState(g).meals = 3;
  let steps = 0; while (foremanStarving(g) && steps++ < 400) play(g, 10);
  assert.equal(foremanStarving(g), false, `a server fed him (${steps} s)`);
  assert.equal(foremanPhase(g), 'canteen', 'back at the kitchen desk');
});

test('old saves: no new field is stored (hunger is the same c.hunger every reaper already saves)', () => {
  const g = game(); const d = g.crewOf('dam');
  d.hunger = 37;
  const save = JSON.stringify(g.snapshot());
  assert.ok(!/fmStarv|foremanHunger/.test(save));
  assert.equal(FOREMAN.k, 'dam');
});
