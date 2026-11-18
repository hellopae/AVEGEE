// T3/12 (F1): hand-over -> receive -> eat for every reaper and the Guard of every zone (placeholder look; the poses are specified for Codex in the report)
import test from 'node:test';
import assert from 'node:assert/strict';
import { harbourTravel } from './helpers/travel.mjs';
import { createGame } from '../src/game.js';
import { STATIONS, GUARD_POST } from '../src/data.js';
import { resetWalk } from '../src/walk.js?v=k1d';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { deliverMeal, beginMeal, advanceMeal, serveMeal, needsMeal, MEAL_SEQ, canteenState } from '../src/canteen.js';
import { foremanPhase } from '../src/foreman.js';
globalThis.Image = class {};
const station = k => ({ def: STATIONS.find(s => s.k === k), slots: [], crewK: null, build: 0, repair: 0, fire: 0 });
function setup(zone = 'th') {
  resetWalk(); const g = createGame(); g.save = () => true; g.onChange = () => {};
  if (zone !== 'th') assert.equal(harbourTravel(g, zone), true);
  g.coin = 9999; g.food = 50; g.queue = [];
  for (const k of ['plerng', 'kan', 'boon', 'dam']) g.hire(k);
  g.guard = actorFromLegacy({ x: GUARD_POST[0], y: GUARD_POST[1] }, zone, 'guard'); syncRoster(g);
  for (const c of [...g.crew, g.guard]) { if (c.x == null) { c.x = c.hx ?? GUARD_POST[0]; c.y = c.hy ?? GUARD_POST[1]; } }
  return g;
}
const step = (g, ms, n = 120) => { for (let t = 0; t < ms; t += n) { g.stepWorld(n); g.advanceAfterlife(n); } };

for (const zone of ['th', 'asia', 'west', 'cyberhell'])
  test(`T3/12 ${zone}: every reaper and the Guard stands still, receives, eats; the meal counts only when he has eaten; the rice leaves the stock at the hand-over`, () => {
    const g = setup(zone);
    for (const who of ['plerng', 'kan', 'boon', 'taan', 'dam', 'guard']) {
      const a = who === 'guard' ? g.guard : g.crewOf(who);
      if (!a) continue;   // zone 4 starts without Taan
      a.hunger = 10; a.morale = 40; a.x = a.x ?? 500; a.y = a.y ?? 500;
      const food0 = g.food, hunger0 = a.hunger;
      assert.ok(needsMeal(a), who + ' is hungry');
      assert.equal(deliverMeal(g, a, [a.x + 40, a.y]), true, who);
      assert.equal(g.food, food0 - 1, who + ': the ball leaves the stock at the hand-over');
      assert.equal(a.mealSeq.phase, 'receive');
      assert.equal(a.hunger, hunger0, who + ': not fed yet');
      assert.equal(deliverMeal(g, a, [0, 0]), false, who + ': cannot be handed a second one while eating');
      const at = [a.x, a.y];
      step(g, MEAL_SEQ.receiveMs - 240);
      assert.equal(a.mealSeq.phase, 'receive'); assert.deepEqual([a.x, a.y], at, who + ' stands still while receiving');
      step(g, 480);
      assert.equal(a.mealSeq.phase, 'eat'); assert.equal(a.hunger, hunger0); assert.deepEqual([a.x, a.y], at, who + ' stands still while eating');
      step(g, MEAL_SEQ.eatMs + 240);
      assert.equal(a.mealSeq ?? null, null, who + ': done');
      assert.ok(a.hunger > hunger0 && a.morale > 40, who + ': fed after eating');
    }
  });

test('T3/12: Dam (foreman) walks the rice to a hungry reaper, who then stops and eats; a server worker serving a reaper starts the same sequence', () => {
  const g = setup('th');
  g.zoneEvents.th ||= {}; g.zoneEvents.th.frontierBreach = 'cleared';
  const dam = g.crewOf('dam'), p = g.crewOf('plerng');
  assert.equal(foremanPhase(g), 'field');
  p.hunger = 5; p.morale = 30;
  let seen = false, guardLoops = 0;
  while (!seen && guardLoops++ < 2000) { step(g, 120, 120); if (p.mealSeq) seen = true; }
  assert.ok(seen, 'Dam delivered the ball and Plerng entered the receive phase');
  assert.equal(p.mealSeq.phase, 'receive'); assert.ok(p.mealSeq.from, 'he turns to the giver');
  // server path
  const g2 = setup('th'); const k = g2.crewOf('kan'); k.hunger = 10;
  const w = { x: k.x - 20, y: k.y, meal: true, job: { recipient: k.id } };
  assert.equal(serveMeal(g2, w), true); assert.equal(w.meal, false); assert.equal(k.mealSeq.phase, 'receive'); assert.equal(k.hunger, 10);
  for (let i = 0; i < 8; i++) advanceMeal(g2, k, 120); assert.equal(k.mealSeq.phase, 'eat');
  for (let i = 0; i < 30; i++) advanceMeal(g2, k, 120);
  assert.equal(k.mealSeq ?? null, null); assert.ok(k.hunger > 10);
});
