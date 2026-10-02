import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BATTLE, CREW_POWER, FRONTIER, MOB, ZONE_EVENTS } from '../src/data.js';

const ready = () => {
  const g = createGame();
  g.zoneCases.th = 8;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' };
  g.setFrontierTeam('taan');
  return g;
};

test('case eight waits for deva test before frontier breach', () => {
  const g = createGame();
  g.zoneCases.th = 7;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'pending' };
  g.applyVerdict({ score:55, karma:0 }, { said:[] });
  assert.equal(g.frontierBreachStatus(), 'locked');
  assert.equal(g.startFrontierBreach(), null);
  g.startDevaTest();
  g.battle.foes[0].hp = 1;
  g.battleAct('atk');
  assert.equal(g.devaTestStatus(), 'cleared');
  assert.equal(g.frontierBreachStatus(), 'pending');
});

test('two waves keep one battle, heal at transition, and reward after both', () => {
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
  assert.deepEqual(b.foes.map(f => f.hp), [40, 90]);
  b.youHp = b.youMax - 5;
  b.foes.forEach(f => { f.hp = 1; });
  g.battleAct('atk');
  assert.equal(b.pendingWave, null);
  g.battleAct('atk');
  assert.equal(b.over, 'win');
  assert.equal(g.abilities.bigFire, true);
  assert.equal(!!g.abilities.flameCharge, false);
  assert.equal(g.frontierBreachStatus(), 'cleared');
  assert.equal(g.coin - beforeCoin, ZONE_EVENTS.th[1].reward.coin);
  // ชุด 27D รอบ 2 — ชนะทั้งศึกได้ของชายแดน 1 ชิ้น (รางวัลเดิม) + winLoot สุ่ม 1 ชิ้น (ครั้งเดียวต่อศึก ไม่ใช่ต่อระลอก)
  const gained = Object.keys(g.inventory).reduce((n, k) => n + (g.inventory[k] || 0) - (beforeBag[k] || 0), 0);
  assert.equal(gained, 2);
  assert.ok((g.inventory[b.reward.item] || 0) - (beforeBag[b.reward.item] || 0) >= 1);
  assert.ok(b.loot);
  assert.equal(g.frontierOf().clears, beforeClears);
  assert.deepEqual(g.bossCleared, beforeBoss);
  assert.equal(g.battleAct('atk'), false);
  g.endBattle();
  assert.equal(g.startFrontierBreach(), null);
});

test('loss leaves one authority and retry starts at wave one; active save restores pending', () => {
  const g = ready(), coin = g.coin;
  g.startFrontierBreach();
  g.battle.youHp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'lose');
  assert.equal(g.hp, 1);
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

test('cleared deva save at case eight schedules the breach on load', () => {
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
  const mp = g.mp;
  assert.equal(g.battleAct('hypno'), true);
  assert.ok(g.battle.dmg.confuseSelf > 0);
  assert.equal(g.battle.youHp, hp);
  assert.equal(g.battle.foeHp, foeHp - g.battle.dmg.confuseSelf);
  assert.equal(g.mp, mp - BATTLE.mpCost.hypno);
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
