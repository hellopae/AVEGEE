import test from 'node:test';
import assert from 'node:assert/strict';
import {DUNGEON_CORRIDOR,DUNGEON_CHECKPOINTS,DUNGEON_EXIT,dungeonPoint,dungeonProjection,dungeonAtCheckpoint,dungeonAtExit,dungeonCompanionPoint} from '../src/dungeon-view.js';
import {initializeZoneTravel,beginDungeon,nextDungeonEncounter,resolveDungeonEncounter} from '../src/zone-travel.js';
const setup=()=>{const g={zone:'th',bossCleared:{th:true}};initializeZoneTravel(g);beginDungeon(g,'asia');return g;};
const position=(g,p)=>g.zoneTravel.active.position={x:p[0],y:p[1]};
test('Nira stays visible beside Yama even when both enter at progress zero',()=>{
  for(let i=0;i<=100;i++){
    const p=i/100,yama=dungeonPoint(p),nira=dungeonCompanionPoint(p);
    assert.ok(Math.hypot(yama[0]-nira[0],yama[1]-nira[1])>.03);
    assert.ok(nira[0]>0&&nira[0]<1&&nira[1]>=0&&nira[1]<=.96);
  }
});
test('corridor click routing stays on its finite connected path at every point',()=>{
 for(let n=0;n<=100;n++) {const progress=n/100,p=dungeonPoint(progress),projected=dungeonProjection(p);assert.ok(Math.abs(progress-projected.progress)<1e-9);assert.ok(projected.distance<1e-9);}
 assert.deepEqual(dungeonPoint(-1),DUNGEON_CORRIDOR[0]);assert.deepEqual(dungeonPoint(2),DUNGEON_EXIT);
});
test('clicks beyond an uncleared checkpoint project onto the allowed route before its gate',()=>{
 const clipped=dungeonProjection(DUNGEON_EXIT,.262);assert.ok(clipped.progress<=.262);assert.ok(Math.hypot(...clipped.point.map((v,i)=>v-dungeonPoint(clipped.progress)[i]))<1e-12);
 // A repainted switchback may have a nearer allowed vertex before the gate.
 assert.ok(clipped.distance<=Math.hypot(...DUNGEON_EXIT.map((v,i)=>v-dungeonPoint(.262)[i]))+1e-12);
 assert.equal(dungeonProjection([NaN,1]).progress,0);assert.equal(dungeonProjection(null).distance,Infinity);
});
test('checkpoint battle requires real persisted position at the CURRENT checkpoint',()=>{
 const g=setup();assert.equal(dungeonAtCheckpoint(g),false);
 position(g,DUNGEON_CHECKPOINTS[2]);assert.equal(dungeonAtCheckpoint(g),false);
 position(g,DUNGEON_CHECKPOINTS[0]);assert.equal(dungeonAtCheckpoint(g),true);
 const e=nextDungeonEncounter(g);resolveDungeonEncounter(g,e.token,true);
 assert.equal(dungeonAtCheckpoint(g),false);position(g,DUNGEON_CHECKPOINTS[1]);assert.equal(dungeonAtCheckpoint(g),true);
});
test('exit requires all victories AND physical exit proximity',()=>{
 const g=setup();position(g,DUNGEON_EXIT);assert.equal(dungeonAtExit(g),false);
 for(let n=0;n<3;n++){const e=nextDungeonEncounter(g);resolveDungeonEncounter(g,e.token,true);}
 position(g,DUNGEON_CHECKPOINTS[2]);assert.equal(dungeonAtExit(g),false);
 position(g,DUNGEON_EXIT);assert.equal(dungeonAtExit(g),true);assert.equal(dungeonAtCheckpoint(g),false);
 position(g,[Infinity,.19]);assert.equal(dungeonAtExit(g),false);
});
