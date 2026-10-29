import test from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';
import {dungeonNavigation,dungeonCheckpointProgress,dungeonPoint} from '../src/dungeon-view.js';
const nav=dungeonNavigation('th:asia'),route=ROUTE_GEOMETRY['th:asia'];

test('B12: the entire floor is one four-neighbor component reachable from entry',()=>{
 const seen=new Uint8Array(nav.cells.length),queue=new Int32Array(nav.cells.length);
 let head=0,tail=0;const start=nav.index(route.corridor[0]);queue[tail++]=start;seen[start]=1;
 while(head<tail){const i=queue[head++],x=i%nav.cols;
  const visit=j=>{if(j>=0&&j<nav.cells.length&&nav.cells[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}};
  if(x)visit(i-1);if(x<nav.cols-1)visit(i+1);visit(i-nav.cols);visit(i+nav.cols);
 }
 assert.equal(tail,nav.cells.reduce((n,v)=>n+v,0));
});

test('B12: actual navigation walks entry, all three checkpoints including cave, and exit',()=>{
 let at=route.corridor[0];
 const goals=[...route.checkpointVertex.map(i=>route.corridor[i]),route.corridor.at(-1)];
 for(const goal of goals){
  const path=nav.path(at,goal);assert.ok(path.length,`path to ${goal}`);
  for(const waypoint of path){
   assert.ok(nav.clear(at,waypoint));
   const from=at,steps=Math.ceil(Math.hypot((waypoint[0]-at[0])*nav.cols,(waypoint[1]-at[1])*nav.rows)/2);
   for(let i=1;i<=steps;i++){
    const next=from.map((v,k)=>v+(waypoint[k]-v)*i/steps);at=nav.move(at,next);
    assert.ok(nav.walkable(at));assert.deepEqual(at,next);
   }
  }
  assert.deepEqual(at,goal);
 }
 const cave=goals[2],guide=cave.map((v,i)=>v+route.bossCave.guide[i]);
 assert.ok(nav.walkable(guide),'guide stands on the cave plaza');assert.ok(nav.path(cave,guide).length);
});

test('B12: wider floor cannot bypass any checkpoint lock, and a removed rock spur rejects input',()=>{
 for(const progress of dungeonCheckpointProgress('th:asia')){
  const goal=dungeonPoint(Math.min(1,progress+.04));
  assert.deepEqual(nav.path(route.corridor[0],goal,progress-.018),[]);
 }
 for(const rock of [[.451,.471],[.65,.53],[.93,.30]]){
  assert.equal(nav.walkable(rock),false);assert.deepEqual(nav.path(route.corridor[0],rock),[]);
 }
});

test('B12: repaint migration keeps cleared checkpoints and current-format positions',async()=>{
 const {initializeZoneTravel}=await import('../src/zone-travel.js');
 for(let checkpoint=0;checkpoint<=3;checkpoint++){
  const g={zone:'th',bossCleared:{th:true}},cleared=Array.from({length:checkpoint},(_,i)=>`th:asia:${i}`);
  initializeZoneTravel(g,{version:1,visited:{th:true},ports:{th:true},active:{route:'th:asia',checkpoint,cleared,position:{x:.65,y:.53},guidePosition:{x:.65,y:.53},attempt:7,pending:'stale-battle'}});
  const a=g.zoneTravel.active;assert.ok(a);assert.deepEqual(a.cleared,cleared);assert.equal(a.checkpoint,checkpoint);assert.equal(a.attempt,7);
  assert.equal(a.pending,null);assert.equal(a.geometryVersion,2);assert.equal(a.guidePosition,null);
  assert.deepEqual([a.position.x,a.position.y],route.corridor[checkpoint?route.checkpointVertex[checkpoint-1]:0]);
  assert.ok(nav.walkable([a.position.x,a.position.y]));
  a.position={x:.512,y:.525};initializeZoneTravel(g);assert.deepEqual(g.zoneTravel.active.position,{x:.512,y:.525});
 }
});
