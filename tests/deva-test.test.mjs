import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS } from '../src/data.js';

const ready = () => {
  const g = createGame();
  g.zoneCases.th = 10;
  g.zoneEvents.th = { prisonBreak:'cleared', frontierBreach:'cleared', devaTest:'pending' };
  return g;
};

test('the zone-one boss waits until the deva test is cleared', () => {
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
  assert.equal(g.bossReady(), true);
  g.endBattle();
  assert.equal(g.startDevaTest(), null);
  assert.equal(g.startZoneBoss()?.kind, 'zoneBoss');
});

test('a failed deva test can be retried, and an active save restarts the test', () => {
  const g = ready();
  const hp = g.hp;
  g.startDevaTest().youHp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'lose');
  assert.equal(g.hp, hp - ZONE_EVENTS.th[2].lose.hp);
  assert.equal(g.devaTestStatus(), 'pending');
  g.endBattle();
  g.startDevaTest();
  const saved = JSON.parse(JSON.stringify(g.snapshot()));
  const loaded = createGame();
  loaded.restore(saved);
  assert.equal(loaded.battle, null);
  assert.equal(loaded.devaTestStatus(), 'pending');
  assert.equal(loaded.startDevaTest()?.foes[0].hp, 100);
});

test('case eight waits for the frontier breach, then schedules the deva', () => {
  const g = createGame();
  g.zoneCases.th = 7;
  g.zoneEvents.th = { prisonBreak:'cleared', frontierBreach:'pending' };
  g.applyVerdict({ score:55, karma:0 }, { said:[] });
  assert.equal(g.devaTestStatus(), 'locked');
  g.setFrontierTeam('taan');
  const battle = g.startFrontierBreach();
  for (let wave = 1; wave <= 3; wave++) {
    battle.foes.forEach(foe => { foe.hp = 1; });
    for (const foe of battle.foes) g.battleAct('atk');
    if (wave < 3) g.advanceFrontierBreachWave();
  }
  assert.equal(g.frontierBreachStatus(), 'cleared');
  assert.equal(g.devaTestStatus(), 'pending');
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
