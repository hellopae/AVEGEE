import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS, scaleFoeHp } from '../src/data.js';

const ready = () => {
  const g = createGame();
  g.zoneCases.th = 10;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'pending' };
  return g;
};

test('the zone-one border boss waits for deva and frontier events', () => {
  const g = ready();
  assert.equal(g.bossReady(), false);
  assert.equal(g.startZoneBoss(), null);
  const coin = g.coin;
  const battle = g.startDevaTest();
  assert.equal(battle.foes.length, 1);
  assert.equal(battle.foes[0].sp, 'boss-tester-th');
  battle.foes[0].hp = 1;
  assert.equal(g.battleAct('atk'), true);
  assert.equal(battle.over, 'win');
  assert.equal(g.devaTestStatus(), 'cleared');
  assert.equal(g.coin - coin, ZONE_EVENTS.th[2].reward.coin);
  assert.equal(g.bossReady(), false);
  g.endBattle();
  assert.equal(g.startDevaTest(), null);
  assert.equal(g.frontierBreachStatus(), 'pending');
  g.zoneEvents.th.frontierBreach = 'cleared';
  g.refreshZoneEvents('th');
  assert.equal(g.zoneEventStatus('thBorderBoss'), 'pending');
  assert.equal(g.startZoneEvent('thBorderBoss')?.kind, 'zoneEvent');
});

test('a failed deva test can be retried, and an active save restarts the test', () => {
  const g = ready();
  g.startDevaTest().youHp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'lose');
  assert.equal(g.hp, 1);
  assert.equal(g.devaTestStatus(), 'pending');
  g.endBattle();
  g.startDevaTest();
  const saved = JSON.parse(JSON.stringify(g.snapshot()));
  const loaded = createGame();
  loaded.restore(saved);
  assert.equal(loaded.battle, null);
  assert.equal(loaded.devaTestStatus(), 'pending');
  assert.equal(loaded.startDevaTest()?.foes[0].hp, scaleFoeHp('th', 100, 'boss'));   // ชุด 28B: บอสอึดขึ้น
});

test('case five schedules deva after prison; case eight schedules frontier after deva', () => {
  const g = createGame();
  g.zoneCases.th = 4;
  g.zoneEvents.th = { prisonBreak:'cleared' };
  g.applyVerdict({ score:55, karma:0 }, { said:[] });
  assert.equal(g.devaTestStatus(), 'pending');
  g.startDevaTest().foes[0].hp = 1;
  g.battleAct('atk');
  assert.equal(g.devaTestStatus(), 'cleared');
  g.endBattle();
  g.zoneCases.th = 7;
  g.applyVerdict({ score:55, karma:0 }, { said:[] });
  assert.equal(g.frontierBreachStatus(), 'pending');
});

test('a pre-event save already at the boss keeps its old access; a new save does not', () => {
  const g = ready();
  const modern = JSON.parse(JSON.stringify(g.snapshot()));
  modern.zoneEvents.th.devaTest = 'pending';
  const modernLoaded = createGame();
  modernLoaded.restore(modern);
  assert.equal(modernLoaded.legacyBossGate, false);
  assert.equal(modernLoaded.bossReady(), false);

  const older = JSON.parse(JSON.stringify(modern));
  delete older.legacyBossGate;
  delete older.zoneEvents.th.devaTest;
  const oldLoaded = createGame();
  oldLoaded.restore(older);
  assert.equal(oldLoaded.legacyBossGate, true);
  assert.equal(oldLoaded.devaTestStatus(), 'cleared');
  assert.equal(oldLoaded.bossReady(), true);
});
