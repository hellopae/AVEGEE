import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';

const pendingGame = () => {
  const g = createGame();
  g.zoneCases.th = 1;
  g.applyVerdict({ score:55, karma:0 }, { said:[] });
  return g;
};

test('ordinary combat owns HP in one foe and keeps the old result', () => {
  const g = createGame();
  const soul = { id:900, name:'วิญญาณทดสอบ', who:'วิญญาณทดสอบ', sp:1, deserved:3 };
  g.queue.push(soul);
  g.startBattle(soul);
  assert.equal(g.battle.foes.length, 1);
  assert.equal(g.battle.foes[0].hp, g.battle.foeHp);
  assert.equal('value' in Object.getOwnPropertyDescriptor(g.battle, 'foeHp'), false);
  g.battle.foes[0].hp = 1;
  const coin = g.coin;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'win');
  assert.equal(g.coin - coin, 45);
  assert.equal(soul.beaten, true);
});

test('mob, frontier, zone boss, dad, and yama battles each have one foe', () => {
  const check = start => {
    const g = createGame();
    start(g);
    assert.equal(g.battle?.foes.length, 1);
    assert.equal(g.battle.foes[0].hp, g.battle.foeHp);
  };
  check(g => { g.mobs.push({ id:900, kind:0 }); g.startMobBattle(0); });
  check(g => { g.setFrontierTeam('taan'); g.startFrontierBattle(); });
  check(g => { g.zoneCases.th = 10; g.startZoneBoss(); });
  check(g => g.startDadFight());
  check(g => g.startYamaFight());
});

test('case two schedules prison break once and active restore becomes pending', () => {
  const g = pendingGame();
  assert.equal(g.zoneCases.th, 2);
  assert.equal(g.prisonBreakStatus(), 'pending');
  g.applyVerdict({ score:55, karma:0 }, { said:[] });
  assert.equal(g.prisonBreakStatus(), 'pending');
  const save = JSON.parse(JSON.stringify(g.snapshot()));
  const loaded = createGame();
  loaded.restore(save);
  assert.equal(loaded.prisonBreakStatus(), 'pending');
  g.startPrisonBreak();
  assert.equal(g.prisonBreakStatus(), 'active');
  const inBattle = createGame();
  inBattle.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.equal(inBattle.battle, null);
  assert.equal(inBattle.prisonBreakStatus(), 'pending');
});

test('three foes take selected damage, counter in order, and win only when all fall', () => {
  const g = pendingGame();
  g.startPrisonBreak();
  const b = g.battle;
  assert.equal(b.foes.length, 3);
  assert.equal(new Set(b.foes.map(f => f.sp)).size, 3);
  b.youHp = 999;
  const [a, c, d] = b.foes;
  b.foes.forEach(f => { f.hp = 100; f.maxHp = 100; });
  const firstHp = a.hp;
  g.selectFoe(c.id);
  g.battleAct('atk');
  assert.equal(a.hp, firstHp);
  assert.ok(c.hp < c.maxHp);
  assert.equal(b.dmg.counterFoeId, a.id);
  g.battleAct('atk');
  assert.equal(b.dmg.counterFoeId, c.id);
  g.battleAct('atk');
  assert.equal(b.dmg.counterFoeId, d.id);
  a.hp = c.hp = d.hp = 1;
  g.selectFoe(c.id);
  g.battleAct('atk');
  assert.equal(c.hp, 0);
  assert.equal(g.selectFoe(c.id), false);
  assert.equal(b.selectedFoeId, d.id);
  assert.equal(b.over, null);
  g.selectFoe(a.id);
  g.battleAct('atk');
  assert.equal(b.over, null);
  const coin = g.coin, order = g.order;
  g.battleAct('atk');
  assert.equal(b.over, 'win');
  assert.equal(g.prisonBreakStatus(), 'cleared');
  assert.equal(g.coin - coin, 75);
  assert.equal(g.order - order, 2);
  g.endBattle();
  assert.equal(g.startPrisonBreak(), null);
});

test('loss applies the event penalty and allows a fresh retry', () => {
  const g = pendingGame();
  g.startPrisonBreak();
  const b = g.battle, hp = g.hp, order = g.order, coin = g.coin;
  b.youHp = 1;
  g.battleAct('atk');
  assert.equal(b.over, 'lose');
  assert.equal(g.hp, hp - 9);
  assert.equal(g.order, order - 4);
  assert.equal(g.coin, coin);
  assert.equal(g.prisonBreakStatus(), 'pending');
  g.endBattle();
  assert.equal(g.startPrisonBreak().foes.length, 3);
});

test('ice stops the selected foe on its own counter turn', () => {
  const g = pendingGame();
  g.level = 3;
  const ice = g.powerOf('ice');
  ice.ammo = ice.max;
  g.startPrisonBreak();
  const b = g.battle, [first, second] = b.foes;
  second.hp = second.maxHp = 100;
  g.selectFoe(second.id);
  g.battleAct('ice');
  assert.equal(b.dmg.counterFoeId, first.id);
  assert.equal(second.stun, 1);
  const hp = b.youHp;
  g.battleAct('atk');
  assert.equal(b.dmg.counterFoeId, second.id);
  assert.equal(second.stun, 0);
  assert.equal(b.youHp, hp);
});
