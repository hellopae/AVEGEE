// T8d (Rae R2 part D section 8.1 - 8.3 · NF-1 NF-2 NF-3): case 15 - the opening of the finale. THREE minion waves (the game had four) · the army appears (warp) -> NF-2 "The Final Chapter" (Begin / Not yet) ->
// z4-final-open (2 pages) -> the preparation window -> wave 1 -> 2 -> 3 -> `cyber-approach` (AFTER wave 3, not before wave 1) -> `cyber-reinforcements` (the Zone 4 label follows the picture: Gate Guard) -> the map.
// HOME-67 is bound beside Archon-Zero meanwhile (not on the pier) and the quest of Lupin is paused, NOT closed (Claudy 19 Nov: it goes on after the ending); NF-2 warns only while that job is pending. TH + EN.
// No dice: every foe is set to 1 hp with 0 attack (finalGame / win in final-event-helpers).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { finalGame, win, roundTrip } from './final-event-helpers.mjs';
import { FINAL_EVENT, ZONE_EVENTS } from '../src/data.js';
import { migrateFinalEvent, nextFinalEncounter, finalEventActors, MINION_WAVES } from '../src/final-event.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { Z4H_NF1, Z4H_NF2, finalBannerLabel, finalReinforcementLabel } from '../src/z4h-final.js';
import { RAW_Z4H_NF1, RAW_Z4H_NF2, RAW_Z4H_NF3 } from '../src/z4h-raw.js';
globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };   // setLang
const THAI = /[฀-๿]/;
const home = g => { g.home67 = { phase:'harbor', gift:true }; g.home67Joined = true; return g; };

test('three minion waves: the data, the rewards and the rulers behind them (waves[3..6]) and the boss (waves[7])', () => {
  assert.equal(MINION_WAVES, 3); assert.equal(FINAL_EVENT.minionWaves, 3); assert.equal(FINAL_EVENT.waveRewards.length, 3);
  const w = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal').waves; assert.equal(w.length, 8);
  assert.deepEqual(w.slice(0, 3).map(x => x[0].kind), [14, 15, 16]);
  assert.deepEqual(w.slice(3).map(x => x[0].sp), ['leader-th-possessed', 'leader-asia-possessed', 'leader-west-possessed', 'leader-cyberhell-possessed', 'zone-boss-cyberhell']);
  const g = finalGame(); assert.equal(g.startFinalEncounter('minion:4'), null, 'there is no fourth wave'); assert.equal(nextFinalEncounter(g.finalEvent), 'minion:1');
});

test('the order of the opening: warp -> NF-2 gate -> Begin -> z4-final-open (2 pages) -> prepare -> wave 1 -> 2 -> 3 -> approach -> reinforcements -> staging', () => {
  const g = finalGame(); const s = g.finalEventState();
  assert.equal(g.beginFinalArrival(), true); assert.equal(s.presentation, 'warp'); assert.deepEqual(g.storyQueue, [], 'the old approach story does NOT play before wave 1');
  g.advanceFinalArrival(1200); assert.equal(s.presentation, 'gate', 'the army stands in front of him: NF-2 asks'); assert.deepEqual(g.storyQueue, []);
  assert.equal(g.startFinalEncounter(), null, 'no fight while the window is up'); assert.equal(finalEventActors(g).find(a => a.id === 'minion:1').enabled, false);
  assert.equal(g.beginFinalChapter(), true); assert.equal(s.presentation, 'opening'); assert.deepEqual(g.storyQueue.map(p => p.key), ['z4-final-open']);
  assert.equal(storyOf('z4-final-open').pages.length, 2);
  g.completeStory(); assert.equal(s.openSeen, true); assert.equal(s.presentation, 'prepare', 'then the preparation window (with the fight button for wave 1 - ui.js)');
  g.dismissFinalPreparation(); assert.equal(s.presentation, null); assert.equal(nextFinalEncounter(s), 'minion:1'); assert.equal(g.beginFinalArrival(), false, 'the warp does not come back');
  for (let i = 1; i <= 3; i++) {
    const b = g.startFinalEncounter(`minion:${i}`); assert.ok(b, `wave ${i}`); assert.equal(b.storyInterlude, null, 'the opening was seen: no interlude in the fight'); assert.equal(b.sub, `ระลอก ${i}/3`);
    win(g); g.endBattle(); assert.equal(g.acknowledgeFinalReward(), true);
    if (i < 3) { assert.equal(s.phase, 'ready'); assert.deepEqual(g.storyQueue, [], `no cutscene after wave ${i}`); }
  }
  assert.equal(s.phase, 'reinforcementCutscene'); assert.equal(s.presentation, 'approach'); assert.deepEqual(g.storyQueue.map(p => p.key), ['cyber-approach', 'cyber-reinforcements']);
  assert.equal(finalEventActors(g).filter(a => a.id.startsWith('army') || a.id.startsWith('minion') || a.id === 'boss').length >= 3, true, 'the army still stands while the story plays');
  g.completeStory(); assert.equal(s.approachSeen, true); assert.equal(s.presentation, 'reinforcementIntro'); assert.equal(s.phase, 'reinforcementCutscene');
  g.completeStory(); assert.equal(s.phase, 'staging'); assert.equal(s.reinforcementsSeen, true); assert.equal(s.presentation, 'reinforcementMap');
  assert.equal(finalEventActors(g).filter(a => a.reinforcement).length, 4);
  const h = roundTrip(g); assert.equal(h.finalEvent.phase, 'staging'); assert.equal(h.finalEvent.minionsCleared, 3);
});

test('"Not yet": the player rests first - the warp does not repeat, the window comes back at the army, Begin works from the map too', () => {
  const g = finalGame(); const s = g.finalEventState(); g.beginFinalArrival(); g.advanceFinalArrival(1200); assert.equal(s.presentation, 'gate');
  assert.equal(g.declineFinalChapter(), true); assert.equal(s.presentation, null); assert.equal(s.openSeen, false); assert.equal(g.declineFinalChapter(), false);
  assert.equal(g.beginFinalArrival(), false, 'no second warp'); assert.equal(nextFinalEncounter(s), 'minion:1');
  const h = roundTrip(g); assert.equal(h.finalEvent.presentation, null); assert.equal(h.beginFinalArrival(), false);
  assert.equal(h.beginFinalChapter(), true, 'from the map (ui.js openFinalEncounter -> the same window)'); assert.deepEqual(h.storyQueue.map(p => p.key), ['z4-final-open']);
  assert.equal(h.beginFinalChapter(), false, 'once'); h.completeStory(); assert.equal(h.beginFinalChapter(), false, 'and never again after the scene');
});

test('a reload in the middle of the gate window / the opening scene returns to it', () => {
  const g = finalGame(); g.beginFinalArrival(); g.advanceFinalArrival(1200); const h = roundTrip(g); assert.equal(h.finalEvent.presentation, 'gate');
  h.beginFinalChapter(); const k = roundTrip(h); assert.equal(k.finalEvent.presentation, 'opening'); assert.deepEqual(k.storyQueue.map(p => p.key), ['z4-final-open']); k.completeStory(); assert.equal(k.finalEvent.presentation, 'prepare');
});

test('an API caller that starts wave 1 without the map still sees the opening once (as an interlude) and it is then marked seen', () => {
  const g = finalGame(); const b = g.startFinalEncounter('minion:1'); assert.equal(b.storyInterlude, 'z4-final-open'); assert.equal(g.finalEvent.openSeen, true);
});

test('NF-1 / NF-2 / NF-3: Rae\'s windows, verbatim, TH + EN (no Thai in the English ones); the warning is shown only while HOME-67\'s side job is pending', () => {
  assert.equal(Z4H_NF1.title.th, RAW_Z4H_NF1.th.title); assert.equal(Z4H_NF1.text.en, RAW_Z4H_NF1.en.text); assert.equal(Z4H_NF1.button.th, 'ไปที่นั่น'); assert.equal(Z4H_NF1.button.en, 'Go there');
  const ev = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal'); assert.deepEqual(ev.title, Z4H_NF1.title); assert.deepEqual(ev.alert, Z4H_NF1.text); assert.deepEqual(ev.go, Z4H_NF1.button);
  assert.equal(Z4H_NF2.begin.th, 'เริ่ม'); assert.equal(Z4H_NF2.notYet.th, 'ยังก่อน'); assert.equal(Z4H_NF2.begin.en, 'Begin'); assert.equal(Z4H_NF2.notYet.en, 'Not yet');
  assert.equal(Z4H_NF2.text.th, RAW_Z4H_NF2.th.text); assert.equal(Z4H_NF2.warn.en, RAW_Z4H_NF2.warn.en); assert.match(Z4H_NF2.warn.th, /จอมโจรที่ยืนเฉย/); assert.match(Z4H_NF2.warn.en, /the thief who stands still/);
  for (const v of [Z4H_NF1.title.en, Z4H_NF1.text.en, Z4H_NF1.button.en, Z4H_NF2.title.en, Z4H_NF2.text.en, Z4H_NF2.begin.en, Z4H_NF2.notYet.en, Z4H_NF2.warn.en]) assert.ok(!THAI.test(v), v);
  assert.equal(finalBannerLabel('minion:2', 2, 'th'), 'ศึกสุดท้าย · ลูกน้องระลอกที่ 2'); assert.equal(finalBannerLabel('minion:3', 3, 'en'), 'The Final Battle · Wave 3');
  assert.equal(finalBannerLabel('ruler:th', 5, 'th'), 'ศึกสุดท้าย · ผู้ถูกควบคุมทั้งสี่'); assert.equal(finalBannerLabel('ruler:west', 6, 'en'), 'The Final Battle · The Four Under Control');
  assert.equal(finalBannerLabel('boss', 8, 'th'), 'ศึกสุดท้าย · อาร์คอน-ศูนย์'); assert.equal(finalBannerLabel('boss', 8, 'en'), 'The Final Battle · Archon-Zero'); assert.deepEqual(RAW_Z4H_NF3.th.length, 4);
  const g = finalGame(); assert.equal(g.lupinPending(), false, 'the side job was never offered');
  home(g); assert.equal(g.lupinPending(), true, 'offered, not taken'); g.lupin = { phase:'taken' }; assert.equal(g.lupinPending(), true); g.lupin = { phase:'done' }; assert.equal(g.lupinPending(), false);
  const src = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(src, /function openFinalGate\(\)/); assert.match(src, /g\.lupinPending\?\.\(\) \?/); assert.match(src, /presentation === 'gate'\) \{ openFinalGate\(\)/); assert.match(src, /id === 'minion:1' && !g\.finalEventState\(\)\.openSeen\) \{ openFinalGate\(\)/);
  assert.match(src, /finalBannerLabel\(b\.encounter, b\.wave, getLang\(\)\)/);
});

test('the four reinforcements carry Rae\'s labels; the Zone 4 one says Gate Guard (the picture crew-guard is the Guard)', () => {
  const g = finalGame(); for (let i = 1; i <= 3; i++) { g.startFinalEncounter(`minion:${i}`); win(g); g.endBattle(); g.acknowledgeFinalReward(); }
  while (g.storyQueue.length) g.completeStory();
  const r = Object.fromEntries(finalEventActors(g).filter(a => a.reinforcement).map(a => [a.sourceZone, a]));
  setLang('th'); assert.deepEqual(Object.values(r).map(a => a.art), ['crew-plerng', 'crew-dam', 'crew-boon', 'crew-guard']);
  assert.equal(finalReinforcementLabel('th', 'th'), 'เพลิงและกุมภัณฑ์'); assert.equal(finalReinforcementLabel('asia', 'th'), 'ดำ (คุโร) และกวนอู'); assert.equal(finalReinforcementLabel('west', 'th'), 'บุญ (เกรซ) และแวน เฮลซิง');
  assert.equal(finalReinforcementLabel('cyberhell', 'th'), 'ผู้เฝ้าด่านโซน 4'); assert.equal(finalReinforcementLabel('cyberhell', 'en'), 'Zone 4 Gate Guard'); assert.equal(r.cyberhell.name, 'ผู้เฝ้าด่านโซน 4');
  assert.deepEqual(['th', 'asia', 'west'].map(z => finalReinforcementLabel(z, 'en')), ['Pleng and Kumphan', 'Dam (Kuro) and Guan Yu', 'Boon (Grace) and Van Helsing']);
  setLang('en'); try { assert.equal(finalEventActors(g).find(a => a.sourceZone === 'cyberhell' && a.reinforcement).name, 'Zone 4 Gate Guard'); } finally { setLang('th'); }
});

test('HOME-67 is bound beside Archon-Zero while the finale is under way (not on the pier, no pier talk, no Lupin offer / worker) and the Lupin quest is NOT closed: it comes back after the ending', () => {
  const g = home(finalGame()); g.lupin = { phase:'taken' }; const s = g.finalEventState();
  assert.equal(g.finalUnderway(), true); assert.equal(g.home67Talk(), false); assert.equal(g.lupinWorkerOn(), false, 'the worker waits'); assert.equal(g.lupin.phase, 'taken', 'but the quest stays taken');
  const bound = finalEventActors(g).find(a => a.id === 'home67-bound'); assert.ok(bound && bound.bound && bound.art === 'char-home67' && bound.enabled === false);
  assert.deepEqual([bound.x, bound.y], FINAL_EVENT.boundPosition);
  assert.equal(g.startFinalEncounter('home67-bound'), null);
  const h = home(finalGame()); h.lupin = null; assert.equal(h.lupinOffer(), false, 'no new offer during the finale');
  // after the ending
  g.gameCompleted = true; s.phase = 'completed'; assert.equal(g.finalUnderway(), false); assert.equal(g.home67Talk(), true); assert.equal(g.lupinWorkerOn(), true, 'the quest goes on'); assert.equal(g.lupinPending(), true);
  assert.equal(finalEventActors(g).length, 0);
  const k = roundTrip(g); assert.equal(k.lupin.phase, 'taken'); assert.equal(k.lupinWorkerOn(), true);
  const src = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8'); assert.match(src, /home67\?\.phase === 'harbor' && !g\.finalUnderway\?\.\(\)/);
});

test('old saves: four-wave progress becomes three-wave progress (nothing is paid twice, nothing is lost); an old battle of the removed fourth wave is dropped', () => {
  const old = (n, phase, extra = {}) => ({ finalEvent:{ version:1, migrationVersion:2, phase, minionsCleared:n, rulersCleared:[], rewardLedger:{}, pendingReward:null, activeEncounter:null, approachSeen:n > 0, controlSeen:false, duelSeen:false, reinforcementsSeen:false, presentation:null, ...extra } });
  let s = migrateFinalEvent(old(4, 'reinforcementCutscene')); assert.equal(s.minionsCleared, 3); assert.equal(s.phase, 'reinforcementCutscene'); assert.equal(s.approachSeen, false, 'the new story plays after wave 3: not seen yet'); assert.equal(s.migrationVersion, 3);
  s = migrateFinalEvent(old(3, 'ready')); assert.equal(s.minionsCleared, 3); assert.equal(s.phase, 'reinforcementCutscene', 'three waves are all the waves now: the cutscene is next'); assert.equal(s.openSeen, true);
  s = migrateFinalEvent(old(2, 'ready')); assert.equal(s.phase, 'ready'); assert.equal(nextFinalEncounter(s), 'minion:3'); assert.equal(s.openSeen, true, 'he has fought: no opening scene now');
  s = migrateFinalEvent(old(0, 'ready', { presentation:'approach', approachSeen:false })); assert.equal(s.presentation, null); assert.equal(s.openSeen, false);
  s = migrateFinalEvent(old(4, 'staging', { reinforcementsSeen:true, rulersCleared:['th'] })); assert.equal(s.minionsCleared, 3); assert.equal(s.phase, 'staging'); assert.deepEqual(s.rulersCleared, ['th']);
  assert.deepEqual(migrateFinalEvent({ finalEvent:s }), s, 'idempotent');
  // a saved fight of the removed fourth wave
  const g = finalGame(); g.startFinalEncounter('minion:1'); const save = JSON.parse(JSON.stringify(g.snapshot()));
  save.finalBattle.encounter = 'minion:4'; save.finalEvent.minionsCleared = 3; save.finalEvent.phase = 'minions'; save.finalEvent.activeEncounter = 'minion:4';
  const h = finalGame(); assert.equal(h.restore(save), true); assert.equal(h.battle, null, 'dropped'); assert.equal(h.finalEvent.activeEncounter, null); assert.notEqual(h.finalEvent.phase, 'minions');
});
