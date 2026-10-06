import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, deservedOf } from '../src/game.js';
import { finalGame, win, acknowledge, roundTrip } from './final-event-helpers.mjs';
import { sentencingChapters } from '../src/sentencing-guide.js';
globalThis.Image ??= class {};
const useClock=g=>{g.mp=0;g.battle.foes.forEach(f=>f.atk=[0,0]);return g.battleAct('cooldownClock');};
test('clock is a reusable item, works with zero MP, persists unlock and cannot be consumed from map bag',()=>{
 const g=createGame();g.save=()=>true;g.inventory.cooldownClock=1;
 assert.equal(g.useBag('cooldownClock'),false);
 g.startBattle({id:500,who:'คู่ซ้อม',sp:1,deserved:20});
 g.mp=0;g.battle.foes.forEach(f=>f.atk=[0,0]);
 assert.equal(g.confirmBattleCommand('cooldownClock'),true);g.finishBattleCommand();assert.equal(g.mp,0);assert.equal(g.inventory.cooldownClock,1);
 assert.equal(useClock(g),false);g.battle.over='win';g.endBattle();
 g.startBattle({id:501,who:'คู่ซ้อม',sp:1,deserved:20});assert.equal(useClock(g),true);
 const old=createGame();old.abilities.cooldownClock=true;
 assert.equal(roundTrip(old).inventory.cooldownClock,1);
});
test('clock cannot refresh between ordinary event waves',()=>{
 const g=createGame();g.zone='asia';g.zoneEvents.asia={asiaRageBreach:'pending'};g.inventory.cooldownClock=1;
 assert.ok(g.startZoneEvent('asiaRageBreach'));
 assert.equal(useClock(g),true);
 // Finish the first wave through real attacks, then advance the same battle.
 for(const f of g.battle.foes) {f.hp=1;g.selectFoe(f.id);g.battleAct('atk');}
 assert.ok(g.battle.pendingWave);g.advanceZoneEventWave();assert.equal(useClock(g),false);
});
test('finale clock shared by all minions, then all four rulers, then final boss, including save/load',()=>{
 let g=finalGame();g.abilities.cooldownClock=true;g.inventory.cooldownClock=1;
 for(let i=1;i<=4;i++){
  g.startFinalEncounter(`minion:${i}`);
  assert.equal(useClock(g),i===1);
  if(i===1) delete g.finalEvent.clockUsedByGroup; // Older active-battle saves still retain the spent use.
  g=roundTrip(g);assert.equal(useClock(g),false);
  win(g);g.endBattle();acknowledge(g);g=roundTrip(g);
 }
 for(const [i,z] of ['th','asia','west','cyberhell'].entries()) {
  g.startFinalEncounter(`ruler:${z}`);assert.equal(useClock(g),i===0);
  g=roundTrip(g);assert.equal(useClock(g),false);
  win(g);g.endBattle();acknowledge(g);g=roundTrip(g);
 }
 g.startFinalEncounter('boss');assert.equal(useClock(g),true);assert.equal(useClock(g),false);
});
test('handbook worked example agrees with actual punishment calculation',()=>{
 assert.equal(deservedOf({deeds:[{w:4},{w:2}],merits:[{v:1},{v:4,fake:true}]}),3);
 assert.ok(sentencingChapters[1].includes('4 − 1'));
});
