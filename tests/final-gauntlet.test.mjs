import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BAL } from '../src/data.js';

test('case ten in Zone 4 runs the four controlled rulers before the final boss', () => {
  const g = createGame();
  g.zone = 'cyberhell';
  g.zoneCases.cyberhell = 10;
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared' };
  g.refreshZoneEvents();
  assert.equal(g.zoneEventStatus('cyberFinal'), 'pending');
  assert.equal(g.bossReady(), false);
  const b = g.startZoneEvent('cyberFinal');
  assert.ok(b);
  assert.equal(b.wave, 1);
  assert.equal(b.storyInterlude, 'cyber-approach');
  const names = [], sprites = [];
  for (let wave = 1; wave <= 8; wave++) {
    if (wave >= 4) { names.push(g.battle.foes[0].who); sprites.push(g.battle.foes[0].sp); }
    while (g.battle.foes.some(f => f.hp > 0)) {
      const foe = g.battle.foes.find(f => f.hp > 0);
      g.battle.selectedFoeId = foe.id; foe.hp = 1;
      assert.equal(g.battleAct('atk'), true);
    }
    if (wave < 8) {
      assert.equal(g.battle.pendingWave, wave + 1);
      if (wave === 3 || wave === 7) {
        assert.equal(g.zoneEventRestReady(), true);
        assert.equal(g.advanceZoneEventWave(), false);
        assert.equal(g.battleAct('atk'), false);
        const hp = g.battle.youHp = 20;
        g.inventory.health = 2;
        assert.equal(g.useBossMedicine(), true);
        assert.ok(g.battle.youHp > hp);
        assert.equal(g.inventory.health, 1);
        g.coin = 500;
        assert.equal(g.buyMerchant('teaZ4'), true);
        if (!g.crew.some(c => c.k === 'kan')) assert.equal(g.hire('kan'), true);
        const on = g.party.members.includes('kan');
        assert.equal(g.toggleParty('kan'), true);
        assert.equal(g.battleCrew().some(c => c.k === 'kan'), !on);
        assert.equal(g.advanceZoneEventWave(true), true);
      } else assert.equal(g.advanceZoneEventWave(), true);
      if (wave === 3) assert.equal(g.battle.storyInterlude, 'cyber-control');
      if (wave === 7) assert.equal(g.battle.storyInterlude, 'cyber-duel');
    }
  }
  assert.deepEqual(names, ['พญายมบาท', 'หัวหน้าสาขาบูรพา', 'หัวหน้าสาขาปัจฉิม', 'หัวหน้านรกเครือข่าย', 'จอมข้อมูลไซเบอร์']);
  assert.deepEqual(sprites, ['leader-th-possessed', 'leader-asia-possessed', 'leader-west-possessed', 'leader-cyberhell-possessed', 'zone-boss-cyberhell']);
  assert.equal(g.battle.over, 'win');
  assert.equal(g.gameCompleted, false);
  g.endBattle();
  assert.equal(g.gameCompleted, true);
  assert.equal(g.over?.k, 'finalWin');
  assert.equal(g.zoneEventStatus('cyberFinal'), 'cleared');
  g.over = null; // The ending's "continue playing" action.
  g.kpiPassed = BAL.kpiWin;
  g.checkEnd();
  assert.equal(g.over, null);
  const saved = g.snapshot();
  const loaded = createGame();
  assert.equal(loaded.restore(saved), true);
  assert.equal(loaded.gameCompleted, true);
  assert.equal(loaded.zoneEventStatus('cyberFinal'), 'cleared');
});
