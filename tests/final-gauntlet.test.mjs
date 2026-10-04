import test from 'node:test';
import assert from 'node:assert/strict';
import { finalGame, win, acknowledge, roundTrip } from './final-event-helpers.mjs';
import { BAL } from '../src/data.js';

test('case ten runs four minion fights, four fixed rulers, then final boss with map rests', () => {
  const g=finalGame();
  assert.equal(g.zoneEventStatus('cyberFinal'),'pending'); assert.equal(g.bossReady(),false);
  const names=[],sprites=[];
  for (const id of ['minion:1','minion:2','minion:3','minion:4','ruler:th','ruler:asia','ruler:west','ruler:cyberhell','boss']) {
    const b=g.startFinalEncounter(id); assert.ok(b);
    if (id==='minion:1') assert.equal(b.storyInterlude,'cyber-approach');
    if (!id.startsWith('minion:')) { names.push(b.foes[0].who); sprites.push(b.foes[0].sp); }
    win(g); assert.equal(g.advanceZoneEventWave(true),false); assert.equal(g.battleAct('atk'),false);
    assert.equal(g.gameCompleted,false); g.endBattle();
    if (id!=='boss') {
      g.hp=20; g.inventory.health=2; assert.equal(g.useBag('health'),true); assert.ok(g.hp>20); assert.equal(g.inventory.health,1);
      g.coin=500; assert.equal(g.buyMerchant('tea'),true);
      const c=g.finalTeamCandidates().find(c=>!g.finalTeamWhy(c));
      const on=(g.party.finalMembers || []).includes(c.id); assert.equal(g.toggleParty(c.id),true);
      assert.equal((g.party.finalMembers || []).includes(c.id),!on); acknowledge(g);
    }
  }
  assert.deepEqual(names,['พญายมบาท','หัวหน้าสาขาบูรพา','หัวหน้าสาขาปัจฉิม','หัวหน้านรกเครือข่าย','จอมข้อมูลไซเบอร์']);
  assert.deepEqual(sprites,['leader-th-possessed','leader-asia-possessed','leader-west-possessed','leader-cyberhell-possessed','zone-boss-cyberhell']);
  assert.equal(g.gameCompleted,true); assert.equal(g.over.k,'finalWin'); assert.equal(g.zoneEventStatus('cyberFinal'),'cleared');
  g.over=null; g.kpiPassed=BAL.kpiWin; g.checkEnd(); assert.equal(g.over,null);
  const h=roundTrip(g); assert.equal(h.gameCompleted,true); assert.equal(h.zoneEventStatus('cyberFinal'),'cleared');
});
