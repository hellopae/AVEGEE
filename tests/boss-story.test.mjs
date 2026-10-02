import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, ZONE_EVENTS, BATTLE } from '../src/data.js';
import { STORY } from '../src/story.js';
globalThis.Image = class {};
function boss(zone) {
  const g = createGame();
  g.zone = zone; g.zoneCases[zone] = 10;
  g.zoneEvents[zone] = Object.fromEntries(ZONE_EVENTS[zone].filter(e => e.atCases < 10).map(e => [e.k,'cleared']));
  const b = zone === 'th' ? (g.refreshZoneEvents(),g.startZoneEvent('thBorderBoss')) : g.startZoneBoss();
  assert.ok(b); b.youHp = b.youMax;
  return g;
}

test('Zone 1 finale triggers even on a lethal hit, injures the hero and awards flame charge once', () => {
  const g = boss('th'); const b = g.battle;
  assert.equal(b.foes[0].sp, 'zone-boss');
  b.foes[0].hp = 1; const before = b.youHp;
  assert.equal(g.battleAct('atk'), true);
  assert.equal(b.over, 'win'); assert.equal(b.storyFinale, 'th');
  assert.ok(b.youHp > 0 && b.youHp < before);
  assert.equal(g.abilities.flameCharge, true);
  assert.deepEqual(g.storyQueue, [{key:'th',reward:'flameCharge',stage:'comic'}]);
  assert.equal(g.battleAct('atk'), false);
  g.endBattle();
  const loaded = createGame(); loaded.restore(g.snapshot());
  assert.equal(loaded.storyQueue[0].key, 'th');
  loaded.storyQueue[0].stage = 'reward';
  const reloaded = createGame(); reloaded.restore(loaded.snapshot());
  assert.equal(reloaded.storyQueue[0].stage, 'reward');
  reloaded.completeStory(); reloaded.queueStory('th','flameCharge');
  assert.equal(reloaded.storyQueue.length, 0);
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
  loaded.paused = false; loaded.step(); loaded.step();
  assert.equal(loaded.niraRest.remaining,1);
  loaded.step(); assert.equal(loaded.niraRest,null);
});

test('Zone 3 wins grant ice and queue its two story panels', () => {
  const g = boss('west'); const b = g.battle;
  b.foes.forEach(f => { f.hp = 1; });
  while (!b.over) { b.selectedFoeId = b.foes.find(f => f.hp > 0).id; g.battleAct('atk'); }
  assert.equal(b.over,'win'); assert.equal(g.abilities.ice,true);
  assert.equal(g.storyQueue[0].key,'west'); assert.equal(STORY.west.pages.length,2);
});

test('Rage requires three recovery turns after its three boosted attacks', () => {
  const g = createGame(); g.abilities.rage = true; g.mp = g.mpMax = 500;
  const b = g.startBattle({id:123,deserved:100,who:'test'}); b.youHp = b.youMax = 1000;
  assert.equal(g.battleAct('rage'),true);
  for (let i=0;i<3;i++) assert.equal(g.battleAct('atk'),true);
  assert.equal(b.rageTurns,0); assert.equal(b.rageCooldown,3);
  const mp = g.mp;
  for (let i=0;i<3;i++) {
    assert.equal(g.battleAct('rage'),false); assert.equal(g.mp,mp);
    assert.equal(g.battleAct('atk'),true);
  }
  assert.equal(b.rageCooldown,0); assert.equal(g.battleAct('rage'),true);
  assert.equal(g.mp,mp-BATTLE.mpCost.rage);
});

test('old saves keep earned powers and derive the revised milestone rewards', () => {
  const g = createGame(); const saved = g.snapshot();
  saved.zoneEvents.th = {frontierBreach:'cleared'}; saved.abilities = {};
  g.restore(saved); assert.equal(g.abilities.bigFire,true); assert.equal(!!g.abilities.flameCharge,false);
  saved.zoneEvents.th.thBorderBoss = 'cleared'; saved.bossCleared.asia = true;
  g.restore(saved); assert.equal(g.abilities.flameCharge,true); assert.equal(g.abilities.rage,true);
});
