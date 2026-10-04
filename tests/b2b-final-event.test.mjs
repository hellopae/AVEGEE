import test from 'node:test';
import assert from 'node:assert/strict';
import { finalGame, win, roundTrip, acknowledge, clearMinions } from './final-event-helpers.mjs';
import { migrateFinalEvent, nextFinalEncounter, finalEventActors } from '../src/final-event.js';
import { FINAL_EVENT, STATIONS, MERCHANT } from '../src/data.js';
import { mapInteractions } from '../src/proximity.js';
import { hitActor } from '../src/scene.js';
import { makeRoom } from '../src/room.js';
globalThis.Image ??= class {};

test('four minion waves pay coin and an item exactly once; wave 4 reward precedes cutscene then map', () => {
  let g = finalGame(); const initial = g.coin, exp = g.exp;
  for (let i=1;i<=4;i++) {
    assert.equal(g.startFinalEncounter('boss'), null);
    assert.ok(g.startFinalEncounter(`minion:${i}`)); win(g);
    const balance = g.coin, items = g.inventory.holyWater;
    assert.equal(g.finalEvent.minionsCleared, i);
    assert.equal(g.finalEvent.phase, 'reward');
    assert.equal(g.finalEvent.rewardLedger[`minion:${i}`].coin, FINAL_EVENT.waveRewards[i-1].coin);
    assert.equal(g.battleAct('atk'), false);
    g = roundTrip(g); assert.equal(g.coin,balance); assert.equal(g.inventory.holyWater,items);
    assert.equal(g.battle.over,'win'); g.endBattle();
    assert.equal(g.pendingReward.coin, FINAL_EVENT.waveRewards[i-1].coin);
    assert.equal(g.startFinalEncounter(),null);
    assert.ok(!g.storyQueue.some(p => p.key === 'cyber-reinforcements'));
    g = roundTrip(g); assert.equal(g.pendingReward.encounter,`minion:${i}`);
    assert.equal(g.acknowledgeFinalReward(),true); assert.equal(g.acknowledgeFinalReward(),false);
    assert.equal(g.coin,balance);
    if (i===4) {
      assert.equal(g.finalEvent.phase,'reinforcementCutscene');
      assert.equal(nextFinalEncounter(g.finalEvent),null);
      g=roundTrip(g); assert.equal(g.storyQueue[0].key,'cyber-reinforcements');
      g.completeStory(); assert.equal(g.finalEvent.phase,'staging');
      assert.equal(g.finalEvent.reinforcementsSeen,true);
      assert.equal(finalEventActors(g).filter(a=>a.reinforcement).length,4);
    } else assert.equal(g.finalEvent.phase,'ready');
  }
  assert.equal(g.coin-initial,220); assert.equal(g.inventory.holyWater,4); assert.equal(g.exp-exp,20);
});

test('fixed ruler order, individual persisted wins, boss gate, ending only after boss', () => {
  let g=finalGame(); clearMinions(g);
  const names=[];
  for (const z of ['th','asia','west','cyberhell']) {
    assert.equal(g.startFinalEncounter('boss'),null);
    const next=`ruler:${z}`, a=finalEventActors(g).find(a=>a.id===next);
    assert.equal(a.enabled,true); assert.equal(hitActor(g,a.x,a.y).key,next);
    for (const other of finalEventActors(g).filter(a=>!a.reinforcement && a.id!==next)) {
      assert.equal(other.enabled,false); assert.equal(g.startFinalEncounter(other.id),null);
    }
    assert.ok(g.startFinalEncounter(next)); names.push(g.battle.foes[0].sp);
    assert.equal(g.advanceZoneEventWave(true),false);
    assert.equal(g.battle.foes.length,1+FINAL_EVENT.rulerAdds[names.length-1]);
    win(g); g.endBattle(); g=roundTrip(g);
    assert.deepEqual(g.finalEvent.rulersCleared,['th','asia','west','cyberhell'].slice(0,names.length));
    assert.equal(g.gameCompleted,false); acknowledge(g);
    assert.equal(g.startFinalEncounter(next),null);
  }
  assert.deepEqual(names,['leader-th-possessed','leader-asia-possessed','leader-west-possessed','leader-cyberhell-possessed']);
  assert.equal(g.finalEvent.phase,'bossReady');
  assert.ok(g.startFinalEncounter('boss')); assert.equal(g.battle.foes.length,1+FINAL_EVENT.bossAdds);
  win(g); assert.equal(g.gameCompleted,false); g=roundTrip(g); g.endBattle();
  assert.equal(g.gameCompleted,true); assert.equal(g.over.k,'finalWin');
  assert.equal(g.zoneEventStatus('cyberFinal'),'cleared');
  g=roundTrip(g); assert.equal(g.finalEvent.phase,'completed'); assert.equal(g.gameCompleted,true);
});

test('defeat and reload retry the same ruler without clearing earlier victories', () => {
  let g=finalGame(); clearMinions(g);
  g.startFinalEncounter('ruler:th'); win(g); g.endBattle(); acknowledge(g);
  g.startFinalEncounter('ruler:asia'); const prior=structuredClone(g.finalEvent.rewardLedger);
  g.battle.youHp=1; g.battle.foes.forEach(f=>{ f.hp=1000; f.atk=[100,100]; });
  assert.equal(g.battleAct('atk'),true); assert.equal(g.battle.over,'lose');
  g.endBattle(); g=roundTrip(g);
  assert.deepEqual(g.finalEvent.rulersCleared,['th']); assert.deepEqual(g.finalEvent.rewardLedger,prior);
  assert.equal(g.startFinalEncounter('ruler:west'),null); g.pendingRecovery=null;
  assert.ok(g.startFinalEncounter('ruler:asia'));
});

test('active encounter round trips turn, targets, foes, HP, status and one-use flags', () => {
  const g=finalGame(); g.startFinalEncounter(); const b=g.battle;
  b.turn=7; b.foes[0].hp=23; b.foes[0].confuse=1; b.ultimateUsed=true; b.youHp=31;
  g.selectFoe(b.foes[1].id); const h=roundTrip(g);
  for (const key of ['foes','turn','selectedFoeId','youHp','ultimateUsed','encounter','team']) assert.deepEqual(h.battle[key],b[key],key);
  assert.equal(h.finalEvent.activeEncounter,'minion:1');
});

test('confusion victory also records a single receipt', () => {
  const g=finalGame(); g.startFinalEncounter();
  g.battle.foes[0].hp=0; const f=g.battle.foes[1]; f.hp=1; f.confuse=1;
  g.selectFoe(f.id); g.battle.youHp=20; g.inventory.health=1;
  assert.equal(g.battleAct('health'),true); assert.equal(g.battle.over,'win');
  assert.equal(g.finalEvent.minionsCleared,1); assert.equal(Object.keys(g.finalEvent.rewardLedger).length,1);
});

test('map preparation remains accessible between every fight and management is suspended', () => {
  const g=finalGame(); clearMinions(g);
  for (const z of ['th','asia','west','cyberhell']) {
    assert.equal(g.battle,null); const tick=g.tick, coin=g.coin; g.step(); assert.equal(g.tick,tick); assert.equal(g.coin,coin);
    g.stepWorld(16); const targets=mapInteractions(g,MERCHANT);
    assert.ok(targets.some(t=>t.kind==='nira')); assert.ok(targets.some(t=>t.kind==='merchant'));
    assert.ok(targets.some(t=>t.kind==='finalRest' || t.key==='tea'));
    assert.equal(g.walkTo(MERCHANT.x,MERCHANT.y),true);
    const n=g.crewOf('nira'); assert.equal(g.walkTo(n.x,n.y),true);
    const tea=STATIONS.find(s=>s.k==='tea'); assert.equal(g.walkTo(tea.x,tea.y),true);
    g.coin=500; assert.equal(g.buyMerchant('tea'),true);
    const candidate=g.finalTeamCandidates().find(c=>!g.finalTeamWhy(c)); assert.equal(g.toggleParty(candidate.id),true);
    g.startFinalEncounter(`ruler:${z}`); win(g); g.endBattle(); acknowledge(g);
  }
});

test('legacy migration is idempotent and keeps the closest explicit Wave x/8 progress without retroactive loot', () => {
  for (let wave=1;wave<=8;wave++) {
    const save={ zoneEvents:{cyberhell:{cyberFinal:'active'}},battle:{eventKey:'cyberFinal',wave} };
    const s=migrateFinalEvent(save);
    assert.equal(s.minionsCleared,Math.min(3,wave-1));
    assert.deepEqual(s.rulersCleared,['th','asia','west','cyberhell'].slice(0,Math.max(0,wave-4)));
    assert.deepEqual(migrateFinalEvent({ ...save,finalEvent:s }),s);
    assert.equal(s.pendingReward,null);
  }
  assert.equal(migrateFinalEvent({zoneEvents:{cyberhell:{cyberFinal:'active'}}}).phase,'ready');
  assert.equal(migrateFinalEvent({gameCompleted:true}).phase,'completed');
  let g=finalGame(), save=g.snapshot(); delete save.finalEvent; delete save.finalBattle; save.v=3;
  save.battle={eventKey:'cyberFinal',wave:6}; save.coin=123;
  assert.equal(g.restore(save),true); assert.equal(g.coin,123); assert.deepEqual(g.finalEvent.rulersCleared,['th','asia']);
  assert.equal(nextFinalEncounter(g.finalEvent),'minion:4');
  assert.deepEqual(roundTrip(g).finalEvent,g.finalEvent);
});

test('failed storage blocks acknowledgement and the next encounter; retry does not double pay', () => {
  const before=globalThis.localStorage;
  try {
    const g=finalGame(); g.startFinalEncounter(); win(g); g.endBattle(); const coin=g.coin;
    globalThis.localStorage={setItem(){throw Error('full');}};
    assert.equal(g.acknowledgeFinalReward(),false); assert.equal(g.finalEvent.phase,'reward');
    assert.equal(g.startFinalEncounter(),null); assert.equal(g.coin,coin);
    globalThis.localStorage={setItem(){}};
    assert.equal(g.acknowledgeFinalReward(),true); assert.equal(g.coin,coin);
    assert.ok(g.startFinalEncounter('minion:2'));
  } finally { if (before===undefined) delete globalThis.localStorage; else globalThis.localStorage=before; }
});

test('map boss stands with the zone-boss standee art, not the battle-only sprite key', () => {
  const g=finalGame(); clearMinions(g);
  for (const z of ['th','asia','west','cyberhell']) { g.startFinalEncounter(`ruler:${z}`); win(g); g.endBattle(); acknowledge(g); }
  const boss=finalEventActors(g).find(a=>a.id==='boss');
  assert.equal(boss.art,'zone-boss'); assert.equal(boss.enabled,true);
});
