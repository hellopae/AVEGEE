import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { TEA_BED_COST, TEA_SLEEP_MS, roomImageBox, teaRoom, yamaDownImage } from '../src/tea-recovery.js';
import { makeRoom } from '../src/room.js';
globalThis.Image ??= class {};
const game = () => { const g=createGame(); g.save=()=>true; g.onChange=()=>{}; return g; };
test('bed purchases are per zone, charged once and require a completed tea pavilion', () => {
 const g=game(); g.coin=1000;
 assert.equal(g.buyTeaBed(),false);
 g.stations.push({def:STATIONS.find(d=>d.k==='tea'),build:1,slots:[]});
 assert.equal(g.buyTeaBed(),false); g.stations.at(-1).build=0;
 for(const z of ['th','asia','west','cyberhell']) {g.zone=z; const before=g.coin;
  assert.equal(g.buyTeaBed(),true); assert.equal(g.coin,before-TEA_BED_COST);
  assert.equal(g.buyTeaBed(),false); assert.equal(g.coin,before-TEA_BED_COST);
 }
 const copy=game(); copy.restore(g.snapshot()); assert.deepEqual(copy.teaBeds,g.teaBeds);
});
test('losses queue recovery without ending the game; recovery survives saving and restores full HP', () => {
 for(const kind of ['frontierBreach','devaTest','prisonBreak','zoneEvent','zoneBoss','mob','frontier','soul','yama','dad']) {
  const g=game(); g.zone='asia'; g.outfit='west'; g.hp=1;
  g.battle={kind,zone:'asia',eventKey:'asiaDevaTest',over:'lose',who:'test',youHp:0,youMax:g.hpMax};
  g.endBattle(); assert.equal(g.battle,null); assert.equal(g.over,null,kind);
  assert.equal(g.pendingRecovery.zone,'asia'); assert.equal(g.pendingRecovery.outfit,'west');
  const copy=game(); copy.restore(g.snapshot()); assert.deepEqual(copy.pendingRecovery,g.pendingRecovery);
  copy.completeTeaRecovery(); assert.equal(copy.hp,copy.hpMax); assert.equal(copy.pendingRecovery,null);
 }
 const g=game(); g.battle={kind:'frontier',over:'win',youHp:30,wave:1};g.endBattle();assert.equal(g.pendingRecovery,null);
});
test('tea backgrounds fill desktop and portrait canvases without distorting their aspect ratio',()=>{
 for(const [W,H] of [[1866,1000],[900,620],[390,844],[1024,768]]){
  const b=roomImageBox(W,H,1536,864,true);
  assert.ok(b.ox<=0 && b.oy<=0 && b.w>=W && b.h>=H);
  assert.ok(Math.abs(b.w/b.h-1536/864)<1e-9);
 }
});
test('actual room sleep heals in 1.2 seconds, blocks unowned manual use and allows emergency recovery',()=>{
 const prevWindow=globalThis.window,prevDocument=globalThis.document;
 const noop=()=>{}; const ctx=new Proxy({}, {get:(obj,key)=>key in obj?obj[key]:key==='measureText'?()=>({width:0}):()=>new Proxy({}, {get:()=>noop})});
 globalThis.window={addEventListener:noop,removeEventListener:noop};
 globalThis.devicePixelRatio=1;
 globalThis.addEventListener=noop;globalThis.removeEventListener=noop;
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 const cv={width:900,height:620,getContext:()=>ctx,addEventListener:noop,removeEventListener:noop,getBoundingClientRect:()=>({width:900,height:620})};
 try {
  for (const zone of ['th','asia','west','cyberhell']) {
   const sitter=game();sitter.zone=zone;sitter.hp=1;sitter.mp=0;
   const seatRoom=teaRoom(zone);seatRoom.me=[seatRoom.act[0]+.03,seatRoom.act[1]+.02];
   const seated=makeRoom(cv,sitter,STATIONS.find(d=>d.k==='tea'),seatRoom,`img/tea-${zone}-recovery.png`,null);
   assert.equal(seated.setSit(true),true);
   assert.deepEqual(seated.pos().slice(0,2),seatRoom.act,`${zone} sits exactly on its cushion`);
   seated.tick(1000);
   assert.ok(sitter.hp>1,`${zone} restores health without stopping the room loop`);
   assert.equal(sitter.mp,5);
   seated.setSit(false);
  }
  const g=game();g.hp=1;g.pendingRecovery={zone:'th'};
  const R=makeRoom(cv,g,STATIONS.find(d=>d.k==='tea'),teaRoom(),'img/tea-th-recovery.png',null);
  assert.equal(R.setSleep(),false);assert.equal(R.setSleep(true),true);
  assert.equal(R.setSit(true),false);
  assert.deepEqual(R.pos().slice(0,2),teaRoom().bed);
  R.tick(TEA_SLEEP_MS-1);assert.equal(g.hp,1);assert.equal(R.sleeping(),true);
  R.tick(1);assert.equal(g.pendingRecovery.stage,'wake'); assert.equal(g.hp,1);
  R.tick(TEA_SLEEP_MS);assert.equal(g.hp,g.hpMax);assert.equal(R.sleeping(),false);assert.equal(g.pendingRecovery,null);
  for (const stage of ['sleep','wake']) {
   const resumed=game();g.hp=1;g.pendingRecovery={zone:'th',stage};resumed.restore(g.snapshot());
   const room=makeRoom(cv,resumed,STATIONS.find(d=>d.k==='tea'),teaRoom(),'img/tea-th-recovery.png',null);
   assert.equal(room.setSleep(true),true);room.tick(TEA_SLEEP_MS-1);assert.equal(resumed.hp,1);
   room.tick(1);if(stage==='sleep'){assert.equal(resumed.pendingRecovery.stage,'wake');room.tick(TEA_SLEEP_MS);}
   assert.equal(resumed.hp,resumed.hpMax);assert.equal(resumed.pendingRecovery,null);assert.equal(room.sleeping(),false);
  }
  g.pendingRecovery=null;
  g.hp=1;g.teaBeds.th=true;assert.equal(R.setSleep(),true);assert.deepEqual(R.pos().slice(0,2),teaRoom().bed);R.tick(TEA_SLEEP_MS);assert.equal(g.hp,g.hpMax);
 } finally {globalThis.window=prevWindow;globalThis.document=prevDocument;}
});
