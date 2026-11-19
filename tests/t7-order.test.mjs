// T7a+b - the order of Zone 3's story in ONE run, every scene in the order it plays (Rae R2 part C 0.1): arrive (case 0) -> Little Red (3) -> the frontier (5: freeze, Van Helsing, 3 demon waves, the team + Cerberus under the spell, Valdric,
// Hypnosis, the Gate Guard, the arena trial) -> Loki (7: reveal + fight) -> Eirlin (10: test, crate, flame) -> the witch (12) -> the zone boss (15: serpent, Severin, collateral, HOME-67). Case 15 (the serpent, Severin, the collateral, HOME-67 joins) is in. The relatives' cases (part 6, T7c) and the walk to Frontier 3-4 (T8) are not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { bossJusticeCase, interrogateBoss, mirrorBoss, bossJusticeAnswer, sentenceBoss } from '../src/boss-justice.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
test('Zone 3 from the arrival to the case-12 witch: every scene plays in order; the Guard, Hypnosis, the Valkyrie spear and helper no. 8 are earned by their own events', () => {
  const g = createGame(); g.bossCleared.asia = true; g.save = () => true; g.onChange = () => {}; g.hpMax = g.hp = 500; g.coin = 20000; assert.equal(harbourTravel(g, 'west'), true); g.giveLamp();
  const played = []; const cs = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return cs(); }; const drain = () => { for (let i = 0; i < 60 && g.storyQueue.length; i++) g.completeStory(); };
  const fight = key => { const b = g.startZoneEvent(key); assert.ok(b, `${key} starts`); b.youHp = 99999;
    for (let i = 0; i < 60 && !b.over; i++) { if (b.storyInterlude) { g.completeBattleInterlude(); continue; } if (b.pendingWave) { g.advanceZoneEventWave(); continue; } for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } const f = b.foes.find(v => v.hp > 0); if (!f) break; g.selectFoe(f.id); g.battleAct('atk'); }
    assert.equal(b.over, 'win', `${key} won`); g.endBattle(); drain(); };
  const judge = k => { g.ensureStoryCase(); const at = g.queue.findIndex(s => s.case === k); assert.ok(at >= 0, `${k} is in the queue`); const soul = g.queue[at]; g.queue.splice(at, 1);
    g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === 'krata'), crewK:'taan' }, { soul, intensity:1 }), soul); g.hp = g.hpMax; g.reds = 0; g.over = null; g.pendingWarn = null; g.pendingVerdictScene = null; };
  // case 0
  assert.ok(g.storyQueue.some(s => s.key === 'z3-arrive')); fight('westHypnotized'); g.notices.length = 0;
  // case 3 · Little Red
  g.zoneCases.west = 2; assert.equal(g.storyCaseOwed(), 'redhood'); judge('redhood');
  // case 5 · the frontier
  g.zoneCases.west = 5; g.refreshZoneEvents(); drain(); assert.equal(g.guard, null); fight('westVampireBreach'); assert.equal(g.abilities.hypno, true); assert.ok(g.guard && !g.guard.breachGuest);
  const c = bossJusticeCase(g); assert.ok(c?.arena); interrogateBoss(g); mirrorBoss(g); assert.equal(sentenceBoss(g, bossJusticeAnswer(g)), true); drain(); for (let i = 0; i < 2000 && bossJusticeCase(g); i++) g.stepWorld(100); drain();
  // case 7 · Loki
  g.zoneCases.west = 6; assert.equal(g.storyCaseOwed(), 'lokipriest'); judge('lokipriest'); assert.equal(g.zoneEventStatus('westLoki'), 'pending'); g.queueStory('z3-loki-reveal'); drain(); fight('westLoki');
  // case 10 · Eirlin
  g.zoneCases.west = 10; g.refreshZoneEvents(); g.queueStory('deva-west'); g.devaVisits.west.phase = 'intro'; drain(); fight('westDevaTest'); assert.equal(g.abilities.valkyrieSpear, true);
  // case 12 · the witch
  g.zoneCases.west = 11; assert.equal(g.storyCaseOwed(), 'gingerwitch'); judge('gingerwitch');
  // case 15 · the zone boss: the serpent first, then Severin; z3-sev-win -> the ice panels -> the collateral; HOME-67 asks for help and joins
  g.zoneCases.west = 14; g.refreshZoneEvents(); assert.equal(g.bossReady(), false); g.zoneCases.west = 15; g.bossPending = g.bossReady(); assert.equal(g.bossReady(), true);
  const jb = g.startZoneBoss('alert'); assert.equal(jb.eventKey, 'westJorm'); jb.youHp = 99999; for (let i = 0; i < 20 && !jb.over; i++) { for (const f of jb.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(jb.foes.find(v => v.hp > 0).id); g.battleAct('atk'); } assert.equal(jb.over, 'win'); g.endBattle(); drain();
  const sb = g.startZoneBoss('alert'); assert.equal(sb.kind, 'zoneBoss'); sb.youHp = 99999; for (let i = 0; i < 30 && !sb.over; i++) { for (const f of sb.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(sb.foes.find(v => v.hp > 0).id); g.battleAct('atk'); } assert.equal(sb.over, 'win'); g.endBattle(); drain();
  assert.equal(g.abilities.ice, true); assert.equal(g.home67Waiting(), true); assert.equal(g.joinHome67(), true); drain(); assert.equal(g.home67Joined, true);
  const order = ['z3-arrive', 'z3-clear', 'z3-freeze', 'z3-valdric-down', 'z3-vh-guard', 'frontier-west-boss-to-dais', 'frontier-west-boss-punished', 'frontier-west-boss-released', 'z3-loki-reveal', 'z3-loki-win', 'deva-west', 'z3-eirlin-win', 'z3-jorm-yields', 'z3-sev-win', 'west', 'z3-sev-collateral', 'z3-home67-join'];
  let at = -1; for (const k of order) { const i = played.indexOf(k, at + 1); assert.ok(i > at, `${k} plays after the one before it (${played.join(' > ')})`); at = i; }
  assert.ok(g.storyCaseDone.gingerwitch && g.storyCaseDone.lokipriest && g.storyCaseDone.redhood);
  assert.ok(g.zoneEventStatus('westDevaTest') === 'cleared' && g.zoneEventStatus('westLoki') === 'cleared');
});
