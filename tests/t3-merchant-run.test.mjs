// T3/3: the merchant's arrival run (side-quests.js merchantRun) starts at the zone's border gate and every step of it is walkable on the REAL walk grid of the zone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { harbourTravel } from './helpers/travel.mjs';
import { createGame } from '../src/game.js';
import { MERCHANT, ZONE_ENTRY } from '../src/data.js';
import { resetWalk, canWalk, nearestWalk, findPath } from '../src/walk.js?v=k1d';
import { merchantRun } from '../src/side-quests.js';
globalThis.Image = class {};
for (const zone of ['th', 'asia', 'west', 'cyberhell'])
  test(`T3/3 ${zone}: the merchant walks from the gate to his stall on real paths (no straight line over water)`, () => {
    resetWalk(); const g = createGame();
    if (zone !== 'th') assert.equal(harbourTravel(g, zone), true);
    g.merchantJourney = { ...(g.merchantJourney || {}), [zone]: { running: true, runMs: 0, arrived: false } };
    const gate = nearestWalk(...ZONE_ENTRY.gate), stall = nearestWalk(MERCHANT.x, MERCHANT.y);
    const route = findPath(...gate, ...stall);
    assert.ok(route?.length && Math.hypot(route.at(-1)[0] - stall[0], route.at(-1)[1] - stall[1]) < 18, 'a route exists');
    for (let ms = 0; ms <= 6000; ms += 50) {
      g.merchantJourney[zone].runMs = ms;
      const p = merchantRun(g);
      assert.ok(canWalk(p.x, p.y), `${zone} ${ms} ms: ${JSON.stringify(p)}`);
    }
    const first = merchantRun(Object.assign(g, {}));   // runMs 6000 = arrived at the stall
    assert.ok(Math.hypot(first.x - stall[0], first.y - stall[1]) < 18);
  });
