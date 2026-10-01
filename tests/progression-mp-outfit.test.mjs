import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BATTLE, LEVELS } from '../src/data.js';

test('combat powers spend MP, tea restores MP, and the values survive a save', () => {
  const g = createGame();
  g.startBattle({ id:777, name:'test', who:'test', sp:1, deserved:3 });
  const before = g.mp;
  assert.equal(g.battleAct('fire'), true);
  assert.equal(g.mp, before - BATTLE.mpCost.fire);
  g.endBattle();
  g.inventory.tea = 1;
  assert.equal(g.useBag('tea'), true);
  assert.equal(g.mp, before);
  const loaded = createGame();
  loaded.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.equal(loaded.mp, g.mp);
  assert.equal(loaded.mpMax, g.mpMax);
});

test('EXP from cases and battles raises HP and MP caps without green verdict gating', () => {
  const g = createGame();
  g.greens = 20;
  g.checkLevel();
  assert.equal(g.level, 1);
  g.gainExp(LEVELS[1].exp, 'ทดสอบ');
  assert.equal(g.level, 2);
  assert.equal(g.hpMax, LEVELS[1].hpMax);
  assert.equal(g.mpMax, LEVELS[1].mpMax);
});

test('zone outfit stays locked until purchased in that zone and survives a save', () => {
  const g = createGame();
  g.zone = 'asia';
  g.coin = 200;
  assert.equal(g.setOutfit('asia'), false);
  assert.equal(g.buyZoneOutfit(), true);
  assert.equal(g.setOutfit('asia'), true);
  const loaded = createGame();
  loaded.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.equal(loaded.outfit, 'asia');
  assert.ok(loaded.outfitsOwned.includes('asia'));
});

test('defeating a branch boss opens the next zone even before its old rank gate', () => {
  const g = createGame();
  assert.equal(g.canMoveZone('asia'), false);
  g.bossCleared.th = true;
  assert.equal(g.level, 1);
  assert.equal(g.canMoveZone('asia'), true);
});

test('merchant gifts need delivery to Nira and Boon before they take effect', () => {
  const g = createGame();
  g.coin = 500;
  g.food = 0;
  g.karma = 18;
  g.crewOf('nira').morale = 50;
  assert.equal(g.buyMerchant('food'), true);
  assert.equal(g.useBag('food'), false);
  assert.equal(g.food, 0);
  assert.equal(g.giveOnigiriNira(), true);
  assert.ok(g.food > 0);
  assert.ok(g.crewOf('nira').morale > 50);
  assert.equal(g.buyMerchant('lotus'), true);
  assert.equal(g.useBag('lotus'), false);
  assert.equal(g.offerLotusBoon(), false, 'must build heaven gate first');
  g.stations.push({ def:{ k:'sawan' }, build:0 });
  assert.equal(g.offerLotusBoon(), true);
  assert.equal(g.karma, 10);
});
