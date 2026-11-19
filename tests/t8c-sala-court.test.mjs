// T8c/1 (owner 19 Nov, after T8b): the record hall of Zone 4 (case 10, N10-1) must come up AFTER the field court of Trojan-9 is over - it used to come up while the court was open and its button did nothing (startZoneEvent refuses during a court).
// No dice: every foe is set to 1 hp with 0 attack. The court is the real one (the won Trojan-9 fight queues it; releaseBoss ends it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { bossJusticeActive, bossJusticeCase, releaseBoss } from '../src/boss-justice.js';
import { zone4 } from './helpers/zone4.mjs';
const fightAll = (g, b) => { b.youHp = 99999; for (let i = 0; i < 80 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); if (!b.over && b.pendingWave) g.advanceZoneEventWave(true); } };
const afterTrojan = () => { const g = zone4(); g.zoneCases.cyberhell = 7; g.refreshZoneEvents(); const b = g.startZoneEvent('cyberBreach'); fightAll(g, b); assert.equal(b.over, 'win'); g.endBattle(); return g; };
test('the court of Trojan-9 sits -> case 10 does NOT open the record hall; once the court releases him, N10-1 is pending (and the button works)', () => {
  const g = afterTrojan(); assert.ok(bossJusticeActive(g), 'the field court of Trojan-9 is open'); assert.equal(bossJusticeCase(g).zone, 'cyberhell');
  g.zoneCases.cyberhell = 10; g.refreshZoneEvents(); assert.notEqual(g.zoneEventStatus('cyberSala'), 'pending', 'not while the court sits'); assert.notEqual(g.zoneEventStatus('cyberSala'), 'active');
  g.refreshZoneEvents(); assert.notEqual(g.zoneEventStatus('cyberSala'), 'pending');
  const c = bossJusticeCase(g); c.phase = 'return'; assert.equal(releaseBoss(g), true); assert.equal(bossJusticeActive(g), false);
  assert.equal(g.zoneEventStatus('cyberSala'), 'pending', 'the court is over: the record hall opens at once (no other call needed)');
  assert.ok(g.startZoneEvent('cyberSala'), 'the fight starts (N10-1 is no longer a dead button)');
});
test('a save made with the hall already pending while a court is open puts it back to locked on load, then it opens when the court ends', () => {
  const g = afterTrojan(); g.zoneEvents.cyberhell.cyberSala = 'pending'; g.zoneCases.cyberhell = 10;
  g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberSala'), 'locked', 'the stale pending state is taken back');
  const c = bossJusticeCase(g); c.phase = 'return'; releaseBoss(g); assert.equal(g.zoneEventStatus('cyberSala'), 'pending');
});
test('no court at all (the Trojan-9 fight is cleared without a docket): the hall opens at 10 cases as before', () => {
  const g = zone4(); g.guard = actorFromLegacy({ x:720, y:890 }, 'cyberhell', 'guard'); syncRoster(g); g.zoneEvents.cyberhell.cyberBreach = 'cleared'; g.zoneCases.cyberhell = 10; g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberSala'), 'pending');
});
