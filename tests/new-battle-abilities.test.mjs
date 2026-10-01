import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BATTLE } from '../src/data.js';

function battle() {
  const g = createGame();
  g.startBattle({ id:701, name:'คู่ซ้อม', who:'คู่ซ้อม', sp:1, deserved:20 });
  g.battle.foeHp = 1000;
  g.mp = 100;
  g.mpMax = 100;
  return g;
}

test('new powers require their event unlock and enough MP', () => {
  const g = battle();
  for (const action of ['windFan', 'rage', 'valkyrieSpear', 'cooldownClock'])
    assert.equal(g.battleAct(action), false, action);
  g.abilities.windFan = true;
  g.mp = BATTLE.mpCost.wind - 1;
  assert.equal(g.battleAct('windFan'), false);
  assert.equal(g.battle.turn, 1);
});

test('wind fan damages and stops the immediate counter', () => {
  const g = battle();
  g.abilities.windFan = true;
  const hp = g.battle.youHp;
  assert.equal(g.battleAct('windFan'), true);
  assert.equal(g.battle.dmg.foe, 36);
  assert.equal(g.battle.youHp, hp);
  assert.equal(g.mp, 100 - BATTLE.mpCost.wind);
});

test('Rage boosts exactly three damaging actions', () => {
  const g = battle();
  g.abilities.rage = true;
  assert.equal(g.battleAct('rage'), true);
  assert.equal(g.battle.rageTurns, 3);
  assert.equal(g.battleAct('rage'), false);
  for (let remaining = 2; remaining >= 0; remaining--) {
    assert.equal(g.battleAct('fire'), true);
    assert.equal(g.battle.dmg.foe, 60);
    assert.equal(g.battle.rageTurns, remaining);
  }
  assert.equal(g.battleAct('fire'), true);
  assert.equal(g.battle.dmg.foe, 40);
});

test('Valkyrie spear is a strong MP attack', () => {
  const g = battle();
  g.abilities.valkyrieSpear = true;
  assert.equal(g.battleAct('valkyrieSpear'), true);
  assert.equal(g.battle.dmg.foe, 88);
  assert.equal(g.mp, 100 - BATTLE.mpCost.spear);
});

test('clock resets helper cooldowns once per battle', () => {
  const g = battle();
  g.abilities.cooldownClock = true;
  const crew = g.crew[0];
  crew.helpReadyAt = Date.now() + 60000;
  g.powers[0].readyAt = Date.now() + 60000;
  assert.equal(g.battleAct('cooldownClock'), true);
  assert.equal(crew.helpReadyAt, 0);
  assert.equal(g.powers[0].readyAt, 0);
  assert.equal(g.battleAct('cooldownClock'), false);
});

test('event hypnosis can be used before the old level gate', () => {
  const g = battle();
  g.abilities.hypno = true;
  const hp = g.battle.youHp;
  assert.equal(g.battleAct('hypno'), true);
  assert.ok(g.battle.dmg.confuseSelf > 0);
  assert.equal(g.battle.youHp, hp);
});

test('event boss stronger counter exposes its cutscene metadata', () => {
  const g = battle();
  const b = g.battle;
  b.kind = 'zoneEvent';
  b.zone = 'asia';
  b.eventKey = 'asiaDevaTest';
  b.foes[0].boss = true;
  b.foes[0].sp = 'boss-tester-asia';
  b.foes[0].hp = 400;
  b.foes[0].maxHp = 1000;
  assert.equal(g.battleAct('atk'), true);
  assert.equal(b.ultimate?.name, 'คำพิพากษาเทวดา');
  assert.equal(b.ultimate?.image, 'img/raw/Asia/boss-tester-asia-cutscene.jpeg');
  assert.ok(b.ultimate?.damage > 0);
});

test('spare heart revives Yama once when a counterattack would defeat him', () => {
  const g = battle();
  g.inventory.spareHeart = 1;
  g.battle.youHp = 1;
  g.battle.foes[0].atk = [50, 50];
  assert.equal(g.battleAct('atk'), true);
  assert.equal(g.battle.over, null);
  assert.equal(g.battle.youHp, Math.round(g.battle.youMax * 0.4));
  assert.equal(g.inventory.spareHeart, undefined);
});
