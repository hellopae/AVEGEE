import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { CREW_POWER, FRONTIER, MOB, ZONE_EVENTS } from '../src/data.js';

const ready = () => {
  const g = createGame();
  g.zoneCases.th = 5;
  g.zoneEvents.th = { prisonBreak:'cleared', frontierBreach:'pending' };
  g.setFrontierTeam('taan');
  return g;
};

test('case five waits for prison break, including when prison break clears later', () => {
  const g = createGame();
  g.zoneCases.th = 4;
  g.zoneEvents.th = { prisonBreak:'pending' };
  g.applyVerdict({ score:55, karma:0 }, { said:[] });
  assert.equal(g.frontierBreachStatus(), 'locked');
  assert.equal(g.startFrontierBreach(), null);
  g.startPrisonBreak();
  g.battle.youHp = 999;
  g.battle.foes.forEach(f => { f.hp = 1; });
  for (let i = 0; i < 3; i++) g.battleAct('atk');
  assert.equal(g.prisonBreakStatus(), 'cleared');
  assert.equal(g.frontierBreachStatus(), 'pending');
});

test('three waves keep one battle, heal at transition, and reward only after boss', () => {
  const g = ready(), beforeCoin = g.coin;
  const beforeClears = g.frontierOf().clears;
  const beforeBoss = { ...g.bossCleared };
  const beforeBag = { ...g.inventory };
  const b = g.startFrontierBreach();
  assert.equal(b.team[0], 'taan');
  assert.equal(b.foes.length, 1);
  assert.equal(b.foes[0].hp, 55);
  assert.equal(b.foes[0].sp, MOB.kinds[0].img);
  b.youHp = 70;
  b.foes[0].hp = 1;
  g.battleAct('atk');
  assert.equal(b.pendingWave, 2);
  assert.equal(b.over, null);
  assert.equal(g.battleAct('atk'), false);
  assert.equal(g.coin, beforeCoin);
  assert.equal(g.advanceFrontierBreachWave(), true);
  assert.equal(g.battle, b);
  assert.equal(b.wave, 2);
  assert.equal(b.youHp, Math.min(b.youMax, 90));
  assert.deepEqual(b.foes.map(f => f.hp), [40, 40]);
  b.youHp = b.youMax - 5;
  b.foes.forEach(f => { f.hp = 1; });
  g.battleAct('atk');
  assert.equal(b.pendingWave, null);
  g.battleAct('atk');
  assert.equal(b.pendingWave, 3);
  assert.equal(g.advanceFrontierBreachWave(), true);
  assert.equal(b.youHp, b.youMax);
  assert.equal(b.foes[0].hp, 120);
  assert.deepEqual(b.foes[0].atk, [10, 16]);
  assert.equal(b.foes[0].sp, 'boss-frontier-th');
  b.foes[0].hp = 1;
  g.battleAct('atk');
  assert.equal(b.over, 'win');
  assert.equal(g.frontierBreachStatus(), 'cleared');
  assert.equal(g.coin - beforeCoin, ZONE_EVENTS.th[1].reward.coin);
  assert.equal(FRONTIER.drops.reduce((n, k) => n + (g.inventory[k] || 0) - (beforeBag[k] || 0), 0), 1);
  assert.equal(g.frontierOf().clears, beforeClears);
  assert.deepEqual(g.bossCleared, beforeBoss);
  assert.equal(g.battleAct('atk'), false);
  g.endBattle();
  assert.equal(g.startFrontierBreach(), null);
});

test('loss costs eight authority and retry starts at wave one; active save restores pending', () => {
  const g = ready(), hp = g.hp, coin = g.coin;
  g.startFrontierBreach();
  g.battle.youHp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'lose');
  assert.equal(g.hp, hp - 8);
  assert.equal(g.coin, coin);
  assert.equal(g.frontierBreachStatus(), 'pending');
  g.endBattle();
  const b = g.startFrontierBreach();
  b.foes[0].hp = 1;
  g.battleAct('atk');
  g.advanceFrontierBreachWave();
  const saved = JSON.parse(JSON.stringify(g.snapshot()));
  const loaded = createGame();
  loaded.restore(saved);
  assert.equal(loaded.battle, null);
  assert.equal(loaded.frontierBreachStatus(), 'pending');
  assert.equal(loaded.startFrontierBreach().wave, 1);
});

test('older cleared save at case five schedules the breach on load', () => {
  const g = ready();
  const saved = JSON.parse(JSON.stringify(g.snapshot()));
  delete saved.zoneEvents.th.frontierBreach;
  const loaded = createGame();
  loaded.restore(saved);
  assert.equal(loaded.frontierBreachStatus(), 'pending');
});

test('frontier crew and hired guard use the existing combat powers', () => {
  const g = ready();
  assert.equal(g.hireGuard(), true);
  const b = g.startFrontierBreach();
  assert.equal(g.battleAct('crew:taan'), true);
  assert.equal(b.dmg.foe, CREW_POWER.taan.dmg);
  assert.equal(g.battleAct('guard'), true);
  assert.equal(b.dmg.foe, CREW_POWER.guard.dmg);
});

test('battle hypnosis makes the target strike itself, unlike ice stun', () => {
  const g = createGame();
  g.level = 4;
  g.powerOf('hypno').ammo = 1;
  g.startBattle({ id:900, name:'test', who:'test', sp:1 });
  const hp = g.battle.youHp;
  const foeHp = g.battle.foeHp;
  assert.equal(g.battleAct('hypno'), true);
  assert.ok(g.battle.dmg.confuseSelf > 0);
  assert.equal(g.battle.youHp, hp);
  assert.equal(g.battle.foeHp, foeHp - g.battle.dmg.confuseSelf);
  assert.equal(g.powerOf('hypno').ammo, 0);
});

test('a confused foe dying to its own counter queues the next wave', () => {
  const g = ready();
  g.hire('kan');
  g.setFrontierTeam('kan');
  const b = g.startFrontierBreach();
  b.foes[0].hp = 1;
  assert.equal(g.battleAct('crew:kan'), true);
  assert.equal(b.over, null);
  assert.equal(b.pendingWave, 2);
});
