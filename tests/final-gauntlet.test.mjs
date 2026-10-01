import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BAL } from '../src/data.js';

test('case ten in Zone 4 runs the former three bosses before the final boss', () => {
  const g = createGame();
  g.zone = 'cyberhell';
  g.zoneCases.cyberhell = 10;
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared' };
  g.refreshZoneEvents();
  assert.equal(g.zoneEventStatus('cyberFinal'), 'pending');
  assert.equal(g.bossReady(), false);
  const b = g.startZoneEvent('cyberFinal');
  assert.ok(b);
  assert.equal(b.foes[0].who, 'พญายมบาท');
  const names = [];
  for (let wave = 1; wave <= 4; wave++) {
    names.push(g.battle.foes[0].who);
    g.battle.foes[0].hp = 1;
    assert.equal(g.battleAct('atk'), true);
    if (wave < 4) {
      assert.equal(g.battle.pendingWave, wave + 1);
      assert.equal(g.advanceZoneEventWave(), true);
    }
  }
  assert.deepEqual(names, ['พญายมบาท', 'แม่ทัพตรวนบูรพา', 'อัศวินบัญชีปัจฉิม', 'จอมข้อมูลไซเบอร์']);
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
