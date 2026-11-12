// PART-A (10 พ.ย. 2569): a quest exists only when its character is hired in the zone it points at.
// Tests that set g.zone directly (no harbour travel) use these to hire the quest's character the way the game does (coin-neutral).
import assert from 'node:assert/strict';
import { CREW, GUARD } from '../../src/data.js';
import { rosterId, actorFromLegacy, syncRoster } from '../../src/roster.js';
import { questTarget } from '../../src/side-quests.js';
export const QUEST_NPCS = ['taan', 'plerng', 'kan', 'boon', 'dam', 'guard'];
/** hire the character the quest points at right now, in the current zone (Nira / merchant need no hire) */
export function hireFor(g, q) {
  const p = questTarget(g, q);
  if (['nira', 'merchant'].includes(p.npc)) return;
  if (p.npc === 'guard') { if (!g.guard) { g.coin += GUARD.hire; assert.ok(g.hireGuard()); } }
  else if (!g.crew.some(c => c.k === p.npc)) { g.coin += CREW.find(c => c.k === p.npc).hire; assert.ok(g.hire(p.npc)); }
  syncRoster(g);   // the game re-binds crew ids on zone travel; tests that jump g.zone need the same binding
}
/** every quest character owned in every zone (for tests that script all 16 quests at once) */
export function hireAll(g) {
  for (const k of QUEST_NPCS) {
    if (k === 'guard') { if (!g.guard) { g.coin += GUARD.hire; assert.ok(g.hireGuard()); } }
    else if (!g.crew.some(c => c.k === k)) { g.coin += CREW.find(c => c.k === k).hire; assert.ok(g.hire(k)); }
    for (const z of ['th', 'asia', 'west', 'cyberhell']) g.roster[rosterId(z, k)] ||= actorFromLegacy({ k }, z, k);
  }
}
