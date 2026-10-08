import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS, STATIONS } from '../src/data.js';
import { mirrorBeam, mirrorSolution } from '../src/mirror-charge.js';
import { teaRecoveredHp, TEA_SLEEP_MS, TEA_BLACKOUT_MS } from '../src/tea-recovery.js';
import { teamNeedsMirror } from '../src/battle-facing.js';
import { createAssetQueue } from '../src/asset-preload.js';
globalThis.Image ??= class {};
function west(pair, guard=true) {
 const g=createGame();g.bossCleared.asia=true;g.moveZone('west');g.coin=10000;g.level=5;
 g.zoneEvents.west.westHypnotized='cleared';g.zoneEvents.west.westVampireBreach='pending';
 for(const k of pair) if(!g.crewOf(k)) g.hire(k);
 g.frontierOf().team=[...pair];if(guard)g.hireGuard();
 g.startZoneEvent('westVampireBreach');g.battle.youHp=100000;g.battle.youMax=100000;
 return g;
}
function defeatWave(g) {
 const b=g.battle;
 for(const f of b.foes){f.hp=1;f.atk=[0,0];}
 while(b.foes.some(f=>f.hp>0)) {
   b.selectedFoeId=b.foes.find(f=>f.hp>0).id;
   assert.equal(g.battleAct('atk'),true);
 }
}
test('hypnosis enemies match selected party and Guard; freed allies return before vampire',()=>{
 for(const [pair,guard] of [[['taan','dam'],true],[['boon','kan'],true],[['plerng','dam'],false]]) {
  const g=west(pair,guard), allies=g.battle.hypnotizedTeam.map(c=>c.k);
  assert.deepEqual(allies,[...pair,...(guard?['guard']:[])]);
  defeatWave(g);assert.equal(g.advanceZoneEventWave(),true);
  defeatWave(g);assert.equal(g.advanceZoneEventWave(),true);
  assert.equal(g.battle.wave,3);assert.equal(g.battle.storyInterlude,'west-hypnosis');
  assert.deepEqual(g.battle.foes.map(f=>f.crewK),allies);
  assert.deepEqual(g.battleCrew(),[]);assert.equal(g.enemyGuard(),null);
  assert.equal(g.battleAct('atk'),false);
  assert.equal(g.completeBattleInterlude(),true);assert.equal(g.completeBattleInterlude(),false);
  const morale=g.crew.filter(c=>pair.includes(c.k)).map(c=>c.morale);
  defeatWave(g);assert.deepEqual(g.crew.filter(c=>pair.includes(c.k)).map(c=>c.morale),morale);
  assert.equal(g.advanceZoneEventWave(),true);assert.equal(g.battle.wave,4);
  assert.deepEqual(g.battleCrew().map(c=>c.k),pair);assert.equal(!!g.enemyGuard(),guard);
  assert.equal(g.battle.foes[0].sp,'boss-frontier-west');
  assert.equal(g.abilities.hypno,undefined);
  defeatWave(g);assert.equal(g.battle.over,'win');assert.equal(g.abilities.hypno,true);
  const coin=g.coin;g.endBattle();assert.equal(g.coin,coin);assert.equal(g.startZoneEvent('westVampireBreach'),null);
 }
});
test('mirror reflection follows angle and charges only with unlocked mirror, room, correct aim and cooldown',()=>{
 for(const aspect of [1,16/9,1.872,2.1]) {
   const angle=mirrorSolution(aspect);assert.equal(mirrorBeam(angle,aspect).hit,true);
   assert.equal(mirrorBeam(angle+20,aspect).hit,false);
 }
 const g=createGame();g.level=5;g.zoneEvents.th={devaTest:'cleared'};g.tick=100;
 const p=g.powerOf('mirror');p.ammo=0;p.max=3;
 const angle=mirrorSolution();assert.equal(g.chargeMirror(angle),false);
 const st={def:STATIONS.find(d=>d.k==='krajok'),build:0,slots:[]};g.stations.push(st);
 assert.equal(g.chargeMirror(angle+20),false);assert.equal(g.chargeMirror(NaN),false);
 assert.equal(g.chargeMirror(angle),true);assert.equal(p.ammo,1);
 assert.equal(g.chargeMirror(angle),false);g.tick=st.kanCd;
 assert.equal(g.chargeMirror(angle),true);assert.equal(p.ammo,2);
 g.tick=st.kanCd;p.ammo=p.max;assert.equal(g.chargeMirror(angle),false);
 g.zoneEvents.th.devaTest='pending';p.ammo=0;assert.equal(g.chargeMirror(angle),false);
});
test('HP increases during sleep without a blackout; western standing art faces right',()=>{
 assert.equal(TEA_BLACKOUT_MS,0);assert.equal(teaRecoveredHp(20,100,0),20);
 assert.equal(teaRecoveredHp(20,100,TEA_SLEEP_MS/2),60);
 assert.equal(teaRecoveredHp(20,100,TEA_SLEEP_MS),100);
 assert.equal(teamNeedsMirror('img/West/hero-yama-west.png'),false);
 assert.equal(teamNeedsMirror('img/West/hero-yama-west-atk-R.png'),false);
});
test('ready queue identifies only missing assets, including after a failed download',async()=>{
 let calls=0;const q=createAssetQueue(async url=>{calls++;if(url==='bad')throw Error();});
 await q.run(['ready','bad']);assert.deepEqual(q.missing(['ready','bad','new','new']),['bad','new']);
 const before=calls;await q.run(['ready']);assert.equal(calls,before);
});
