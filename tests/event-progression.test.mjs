import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS, MOB } from '../src/data.js';

function winBattle(g) {
  let guard = 0;
  while (g.battle && !g.battle.over && guard++ < 30) {
    if (g.battle.pendingWave) {
      assert.equal(g.advanceZoneEventWave(), true);
      continue;
    }
    const foe = g.battle.foes.find(f => f.hp > 0);
    foe.hp = 1;
    g.battle.selectedFoeId = foe.id;
    g.battleAct('atk');
  }
  assert.equal(g.battle?.over, 'win');
  g.endBattle();
}

test('Zone 1 case 10 boss with two demons awards flame charge and opens Zone 2', () => {
  const g = createGame();
  g.zoneCases.th = 10;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared' };
  g.refreshZoneEvents();
  assert.equal(g.zoneEventStatus('thBorderBoss'), 'pending');
  assert.equal(g.startZoneEvent('thBorderBoss').foes.length, 3);
  winBattle(g);
  assert.equal(g.abilities.flameCharge, true);
  assert.equal(g.bossCleared.th, true);
});

test('Zone 2 fire, deva, and three waves unlock wind fan and reserve Rage for the zone boss', () => {
  const g = createGame();
  g.zone = 'asia'; g.zoneCases.asia = 3;
  g.refreshZoneEvents();
  assert.equal(g.zoneEventStatus('asiaPrisonFire'), 'pending');
  assert.equal(g.stations.some(s => s.fire === MOB.burnMax), true);
  assert.equal(g.startZoneEvent('asiaPrisonFire').foes.length, 3);
  g.battle.foes[0].hp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.devaArrived, true);
  winBattle(g);
  assert.equal(g.zoneEventStatus('asiaDevaTest'), 'pending');
  g.startZoneEvent('asiaDevaTest'); winBattle(g);
  assert.equal(g.abilities.windFan, true);
  g.zoneCases.asia = 6; g.refreshZoneEvents();
  const breach = g.startZoneEvent('asiaRageBreach');
  assert.equal(breach.foes.length, 2);
  winBattle(g);
  assert.equal(!!g.abilities.rage, false);
});

test('Zone 3 blocks building until hypnotized spirits are freed, then awards hypnosis and spear', () => {
  const g = createGame();
  g.zone = 'west'; g.zoneCases.west = 0; g.refreshZoneEvents();
  assert.equal(g.zoneEventStatus('westHypnotized'), 'pending');
  assert.equal(g.build('tea'), false);
  g.startZoneEvent('westHypnotized'); winBattle(g);
  g.zoneCases.west = 3; g.refreshZoneEvents();
  g.startZoneEvent('westVampireBreach'); winBattle(g);
  assert.equal(g.abilities.hypno, true);
  g.zoneCases.west = 7; g.refreshZoneEvents();
  g.startZoneEvent('westDevaTest'); winBattle(g);
  assert.equal(g.abilities.valkyrieSpear, true);
});

test('Zone 4 rescue releases Taan, clock, and four-wave heart reward; loss retries from wave one', () => {
  const g = createGame();
  g.zone = 'cyberhell'; g.zoneCases.cyberhell = 0;
  g.crew = g.crew.filter(c => c.k !== 'taan');
  g.refreshZoneEvents();
  assert.equal(g.zoneCaptivesFree(), false);
  assert.equal(g.build('tea'), false);
  g.coin = 500;
  assert.equal(g.buyMerchant('tea'), false);
  g.startZoneEvent('cyberRescue'); winBattle(g);
  assert.equal(g.zoneCaptivesFree(), true);
  assert.equal(g.buyMerchant('tea'), true);
  assert.equal(g.crew.some(c => c.k === 'taan'), true);
  assert.equal(g.abilities.cooldownClock, true);
  g.zoneCases.cyberhell = 5; g.refreshZoneEvents();
  g.startZoneEvent('cyberBreach');
  g.battle.youHp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'lose');
  assert.equal(g.hp, 1);
  g.endBattle();
  assert.equal(g.zoneEventStatus('cyberBreach'), 'pending');
  g.startZoneEvent('cyberBreach'); winBattle(g);
  assert.equal(g.inventory.spareHeart, 1);
  assert.equal(ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberBreach').waves.length, 4);
});
