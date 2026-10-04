import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
export function finalGame() {
  const g = createGame(); g.zone = 'cyberhell'; g.zoneCases.cyberhell = 10;
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared' };
  g.refreshZoneEvents(); return g;
}
export function win(g) {
  g.battle.youHp = g.battle.youMax; // State transitions tested independently of attrition.
  for (let i = 0; g.battle.foes.some(f => f.hp > 0) && i < 30; i++) {
    const f = g.battle.foes.find(f => f.hp > 0); g.selectFoe(f.id); f.hp = 1;
    assert.equal(g.battleAct('atk'), true);
  }
  assert.equal(g.battle.over, 'win');
}
export function roundTrip(g) {
  const h = createGame(); assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); return h;
}
export function acknowledge(g) {
  assert.equal(g.acknowledgeFinalReward(), true);
  if (g.finalEvent.phase === 'reinforcementCutscene') {
    assert.equal(g.storyQueue[0].key, 'cyber-reinforcements'); g.completeStory();
    assert.equal(g.finalEvent.phase, g.finalEvent.rulersCleared.length === 4 ? 'bossReady' : 'staging');
  }
}
export function clearMinions(g) {
  for (let i=1;i<=4;i++) { assert.ok(g.startFinalEncounter(`minion:${i}`)); win(g); g.endBattle(); acknowledge(g); }
}
