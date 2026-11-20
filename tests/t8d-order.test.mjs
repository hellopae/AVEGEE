// T8d (Rae R2 part D section 8, the whole order in ONE run - nothing of the owner's steps may drop): case 15 of Zone 4 = NF-1 (the alert) -> the army appears -> NF-2 (Begin / Not yet) -> z4-final-open -> preparation ->
// wave 1 -> 2 -> 3 -> cyber-approach -> cyber-reinforcements -> the map -> cyber-reinforcements-advance -> cyber-control -> the four lords (each: his broken line, the fight, his thanks) -> cyber-duel -> Archon-Zero ->
// the three lines after the win -> ending-capture -> the dais -> ending -> ending-coda -> the end window. Meanwhile HOME-67 is bound beside Archon-Zero and the Lupin quest is paused, then it goes on after the ending (NF-2 warns
// while it is pending: Claudy 19 Nov). No dice: every foe 1 hp / atk 0; Lupin's fight is won the same way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { finalGame, win, roundTrip, finishBossJustice } from './final-event-helpers.mjs';
import { ZONE_EVENTS } from '../src/data.js';
import { finalEventActors } from '../src/final-event.js';
import { Z4H_NF1, Z4H_NF2 } from '../src/z4h-final.js';
import { Z4L } from '../src/z4f-lupin.js';
globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };

test('the whole finale in order (and the Lupin quest survives it)', () => {
  const g = finalGame(); const log = []; const s = g.finalEventState();
  g.home67 = { phase:'harbor', gift:true }; g.home67Joined = true; g.lupin = { phase:'taken' };   // HOME-67's side job was taken and is not done
  const story = key => { assert.equal(g.storyQueue[0]?.key, key, `story ${key}`); log.push(key); g.completeStory(); };
  const fight = id => { assert.ok(g.startFinalEncounter(id), id); log.push(id); win(g); g.endBattle(); assert.equal(g.acknowledgeFinalReward(), true); };
  // NF-1: the alert of case 15
  const ev = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal'); assert.equal(g.zoneEventStatus('cyberFinal'), 'pending'); assert.deepEqual(ev.title, Z4H_NF1.title); log.push('NF-1');
  assert.equal(g.finalUnderway(), true); assert.equal(g.lupinWorkerOn(), false, 'the worker waits while the finale is on'); assert.equal(g.lupinPending(), true, 'NF-2 will warn');
  // the army appears
  assert.equal(g.beginFinalArrival(), true); log.push(s.presentation);
  g.advanceFinalArrival(1200); log.push(s.presentation);
  assert.equal(g.lupinPending() && Z4H_NF2.warn.th.length > 0, true); log.push('NF-2');
  assert.equal(g.beginFinalChapter(), true); story('z4-final-open'); log.push(s.presentation); g.dismissFinalPreparation();
  for (let i = 1; i <= 3; i++) fight(`minion:${i}`);
  story('cyber-approach'); story('cyber-reinforcements'); log.push(s.presentation);
  assert.equal(finalEventActors(g).filter(a => a.reinforcement).length, 4); assert.ok(finalEventActors(g).some(a => a.id === 'home67-bound'));
  assert.equal(g.continueFinalMapScene(), true); story('cyber-reinforcements-advance'); story('cyber-control'); log.push(s.presentation); g.dismissFinalPreparation();
  const g2 = roundTrip(g); assert.equal(g2.finalEvent.phase, 'staging'); assert.equal(g2.finalEvent.rulersCleared.length, 0);
  for (const z of ['th', 'asia', 'west', 'cyberhell']) { fight(`ruler:${z}`); story(`z4-ruler-free-${z}`); }
  story('cyber-duel'); log.push(s.presentation); g.dismissFinalPreparation();
  assert.ok(g.startFinalEncounter('boss')); log.push('boss'); win(g); g.endBattle();
  story('z4-archon-down'); story('ending-capture'); log.push(s.phase);
  finishBossJustice(g); log.push('dais-done');
  story('ending'); story('ending-coda'); log.push(g.over?.k);
  assert.deepEqual(log, ['NF-1', 'warp', 'gate', 'NF-2', 'z4-final-open', 'prepare', 'minion:1', 'minion:2', 'minion:3', 'cyber-approach', 'cyber-reinforcements', 'reinforcementMap',
    'cyber-reinforcements-advance', 'cyber-control', 'prepare', 'ruler:th', 'z4-ruler-free-th', 'ruler:asia', 'z4-ruler-free-asia', 'ruler:west', 'z4-ruler-free-west', 'ruler:cyberhell', 'z4-ruler-free-cyberhell',
    'cyber-duel', 'prepare', 'boss', 'z4-archon-down', 'ending-capture', 'justice', 'dais-done', 'ending', 'ending-coda', 'finalWin']);
  // after the ending: the game is completed and the quest of Lupin goes on (NOT closed by the finale)
  assert.equal(g.gameCompleted, true); assert.equal(g.finalUnderway(), false); assert.equal(g.lupin.phase, 'taken'); assert.equal(g.lupinWorkerOn(), true); assert.equal(g.home67Talk(), true);
  const k = roundTrip(g); assert.equal(k.lupinWorkerOn(), true);
  g.over = null; const b = g.startLupinFight(); assert.ok(b, 'the Lupin fight can still be started after the ending'); assert.equal(b.eventKey, Z4L.eventKey); win(g); g.endBattle();
  while (g.storyQueue.length) g.completeStory();
  assert.equal(g.lupin.phase, 'done'); assert.equal(g.lupinPending(), false, 'NF-2 would not warn now');
});

test('the same finale when the player says "Not yet" first and comes back (the order is the same, no scene twice)', () => {
  const g = finalGame(); const s = g.finalEventState(); const log = [];
  g.beginFinalArrival(); g.advanceFinalArrival(1200); assert.equal(g.declineFinalChapter(), true); log.push('not-yet');
  assert.deepEqual(g.storyQueue, []); assert.equal(g.beginFinalChapter(), true); log.push(g.storyQueue[0].key); g.completeStory(); g.dismissFinalPreparation();
  for (let i = 1; i <= 3; i++) { assert.ok(g.startFinalEncounter(`minion:${i}`)); win(g); g.endBattle(); g.acknowledgeFinalReward(); }
  log.push(...g.storyQueue.map(p => p.key)); assert.deepEqual(log, ['not-yet', 'z4-final-open', 'cyber-approach', 'cyber-reinforcements']);
  assert.equal(s.openSeen, true);
});
