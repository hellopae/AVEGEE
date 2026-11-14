import {bossJusticeCase,interrogateBoss,bossJusticeAnswer,sentenceBoss,advanceBossJustice} from '../src/boss-justice.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, ZONE_EVENTS, BATTLE } from '../src/data.js';
import { STORY } from '../src/story.js';
globalThis.Image = class {};
function boss(zone) {
  const g = createGame();
  g.zone = zone; g.zoneCases[zone] = (zone === 'th' || zone === 'asia') ? 15 : 10;   // Z1-EVENTS: Zone 1's ruler is the case-15 beat
  g.zoneEvents[zone] = Object.fromEntries(ZONE_EVENTS[zone].filter(e => e.atCases < ((zone === 'th' || zone === 'asia') ? 15 : 10)).map(e => [e.k,'cleared']));
  const b = zone === 'th' ? (g.refreshZoneEvents(),g.startZoneEvent('thBorderBoss')) : g.startZoneBoss();
  assert.ok(b); b.youHp = b.youMax;
  return g;
}

test('Zone 1 finale triggers even on a lethal hit, injures the hero, plays the story inside the fight, then the fire charge ends it and awards flame charge once', () => {
  const g = boss('th'); const b = g.battle;
  assert.equal(b.foes[0].sp, 'zone-boss');
  b.foes[0].hp = 1; const before = b.youHp, mpBefore = g.mp;
  assert.equal(g.battleAct('atk'), true);
  // Z1-EVENTS fixup: his last move wounds Yama, the fight is HELD for story-th-01..05, the power is not paid out yet
  assert.equal(b.over, null); assert.equal(b.storyInterlude, 'th'); assert.equal(b.breachFinale, 'ready'); assert.equal(b.finaleMove, 'flameCharge');
  assert.ok(b.youHp > 0 && b.youHp < before); assert.equal(b.thUltimate.image, 'img/zone-boss-cutscene.webp');
  assert.ok(!g.abilities.flameCharge); assert.deepEqual(g.storyQueue, []);
  assert.equal(g.completeBattleInterlude(), true); assert.equal(g.storySeen.th, true);
  assert.equal(g.runEnemyTurn(), false, 'the foes wait for the closing move');
  assert.equal(g.breachFinaleStrike(), true);   // Yama's new move (free) closes the fight for real
  assert.equal(b.over, 'win'); assert.equal(b.breachFinale, 'done'); assert.ok(b.foes.every(f => f.hp === 0)); assert.equal(g.mp, mpBefore, 'the closing move costs no MP');
  assert.equal(g.abilities.flameCharge, true);
  assert.deepEqual(g.storyQueue.filter(p => p.key === 'th'), [], 'the story is not queued a second time');
  assert.equal(g.battleAct('atk'), false);
  g.endBattle();
  const loaded = createGame(); loaded.restore(g.snapshot());
  assert.equal(loaded.storySeen.th, true); assert.equal(loaded.abilities.flameCharge, true);
  assert.equal(loaded.storyQueue.some(p=>p.key==='th'),false);
  assert.equal(loaded.storyQueue.some(p=>p.key==='boss-guide-th-praise'),true);
});

test('Zone 2 finale saves Nira, unlocks Rage and allows a visit during three turns of rest', () => {
  const g = boss('asia'); const b = g.battle;
  assert.equal(b.foes.length, 3);
  const target = b.foes.find(f => f.boss); target.hp = target.maxHp * .25 + 1;
  b.selectedFoeId = target.id;
  g.battleAct('atk');
  assert.equal(b.storyFinale,'asia'); assert.equal(b.over,'win');
  assert.equal(g.abilities.rage,true); assert.equal(g.niraRest.remaining,3);
  g.endBattle();
  assert.equal(g.visitNira(),false); // Travel to the pavilion before visiting.
  const site = STATIONS.find(s => s.k === 'sala');
  g.player.x = site.x; g.player.y = site.y;
  assert.equal(g.visitNira(),true); assert.equal(g.visitNira(),false);
  const loaded = createGame(); loaded.restore(g.snapshot());
  assert.equal(loaded.niraRest.visited,true);
  loaded.paused = false;
  // owner 14 Nov 2026: zone bosses have no court any more (the boss-guide system takes over), so city turns are not suspended.
  assert.equal(bossJusticeCase(loaded),null);
  while(loaded.storyQueue.length)loaded.completeStory();
  loaded.step(); assert.equal(loaded.niraRest.remaining,2);
  loaded.step(); assert.equal(loaded.niraRest.remaining,1);
  loaded.step(); assert.equal(loaded.niraRest,null);
});

test('Zone 3 wins grant ice and queue its two story panels', () => {
  const g = boss('west'); const b = g.battle;
  b.foes.forEach(f => { f.hp = 1; });
  while (!b.over) { b.selectedFoeId = b.foes.find(f => f.hp > 0).id; g.battleAct('atk'); }
  assert.equal(b.over,'win'); assert.equal(g.abilities.ice,true);
  assert.equal(g.storyQueue[0].key,'west'); assert.equal(STORY.west.pages.length,2);
});

test('Rage requires 60 active seconds and three boosted attacks before reuse', () => {
  const g = createGame(); g.abilities.rage = true; g.mp = g.mpMax = 500;
  const b = g.startBattle({id:123,deserved:100,who:'test'}); b.youHp = b.youMax = 1000;
  assert.equal(g.battleAct('rage'),true);
  for (let i=0;i<3;i++) assert.equal(g.battleAct('atk'),true);
  assert.equal(b.rageTurns,0); assert.equal(b.skillRemainingMs.rage,60000);
  const mp = g.mp;
  for (let i=0;i<3;i++) {
    assert.equal(g.battleAct('rage'),false); assert.equal(g.mp,mp);
    assert.equal(g.battleAct('atk'),true);
  }
  g.advanceBattleTime(60000, true);
  assert.equal(b.skillRemainingMs.rage,0); assert.equal(g.battleAct('rage'),true);
  assert.equal(g.mp,mp-BATTLE.mpCost.rage);
});

test('old saves keep earned powers and derive the revised milestone rewards', () => {
  const g = createGame(); const saved = g.snapshot();
  saved.zoneEvents.th = {frontierBreach:'cleared'}; saved.abilities = {};
  g.restore(saved); assert.equal(g.abilities.teamJudgment,true); assert.equal(!!g.abilities.bigFire,false); assert.equal(!!g.abilities.flameCharge,false);
  saved.zoneEvents.asia={asiaRageBreach:'cleared'};g.restore(saved);assert.equal(g.abilities.bigFire,true);
  saved.zoneEvents.th.thBorderBoss = 'cleared'; saved.bossCleared.asia = true;
  g.restore(saved); assert.equal(g.abilities.flameCharge,true); assert.equal(g.abilities.rage,true);
});
