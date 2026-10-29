import test from 'node:test';
import assert from 'node:assert/strict';
import {ROUTE_GEOMETRY,FALLBACK_CORRIDOR as ORIGINAL,enableRoute,disableRoute} from '../src/route-geometry.js';
import {dungeonNavigation,dungeonWalkable,dungeonMove,dungeonPath,dungeonSegmentClear,dungeonSnap,dungeonCellProgress,dungeonPoint,dungeonCheckpointProgress,DUNGEON_CORRIDOR} from '../src/dungeon-view.js';
import {drawFrontierTree} from '../src/frontier-ambient.js';
const nav=dungeonNavigation(),start=DUNGEON_CORRIDOR[0];
// B12 repainted terminal floors: left water, north, east after bridge,
// south stairs from cave yard, west plaza edge, central stair spur.
export const BRANCHES=[[.357,.636],[.59,.247],[.889,.596],[.575,.946],[.435,.735],[.512,.525]];
test('F12: exact source dimensions, connected white surface, every cell gets finite geodesic progress',()=>{
 assert.deepEqual([nav.cols,nav.rows],[1672,941]);assert.equal(nav.cells.length,1672*941);
 let count=0;for(let i=0;i<nav.cells.length;i++)if(nav.cells[i]){count++;assert.ok(Number.isFinite(nav.cellProgress[i]));}
 assert.ok(count>100000);
});
test('F12: every corrected vertex and every segment stays within owner mask',()=>{
 for(const p of DUNGEON_CORRIDOR)assert.ok(dungeonWalkable(p),String(p));
 for(let i=1;i<DUNGEON_CORRIDOR.length;i++)assert.ok(dungeonSegmentClear(DUNGEON_CORRIDOR[i-1],DUNGEON_CORRIDOR[i]),`segment ${i-1}`);
});
test('F12: red ground rejects clicks and movement never tunnels through a cliff',()=>{
 for(const p of [[.05,.5],[.65,.53],[.5,.1],[.93,.3]]){assert.equal(dungeonWalkable(p),false);assert.deepEqual(dungeonPath(start,p),[]);}
 const moved=dungeonMove(start,[.65,.53]);assert.ok(dungeonWalkable(moved));assert.ok(dungeonPath(start,moved).length,'long input can slide around a bend on connected floor');
 const bank=[.53,.35],stopped=dungeonMove(bank,[.53,.55]);
 assert.ok(dungeonSegmentClear(bank,stopped));assert.ok(stopped[1]<.4,'straight input stops before crossing the central cliff');
});
test('F12: all six branch endpoints have click paths and keyboard-sized steps reach them',()=>{
 for(const goal of BRANCHES){
  assert.ok(dungeonWalkable(goal),`endpoint ${goal}`);const path=dungeonPath(start,goal);assert.ok(path.length,`path ${goal}`);
  let at=start;
  for(const p of path){assert.ok(dungeonSegmentClear(at,p));const steps=Math.ceil(Math.hypot((p[0]-at[0])*1672,(p[1]-at[1])*941)/2),from=at;
   for(let j=1;j<=steps;j++)at=dungeonMove(at,[from[0]+(p[0]-from[0])*j/steps,from[1]+(p[1]-from[1])*j/steps]);
   assert.ok(Math.hypot(at[0]-p[0],at[1]-p[1])<1e-6);
  }
  assert.deepEqual(path.at(-1),goal);
 }
});
test('F12: checkpoint locks apply to every surface cell including branches and cannot be clicked around',()=>{
 for(const cp of dungeonCheckpointProgress('th:asia')){
  const limit=cp-.018;
  for(let i=0;i<nav.cells.length;i+=7)if(nav.cells[i]&&nav.cellProgress[i]>limit)assert.equal(nav.walkable(nav.point(i),limit),false);
  for(const goal of BRANCHES)if(dungeonCellProgress(goal)>limit)assert.deepEqual(dungeonPath(start,goal,'th:asia',limit),[]);
  assert.deepEqual(dungeonPath(start,dungeonPoint(Math.min(1,cp+.06)),'th:asia',limit),[]);
  const restored=dungeonSnap([.9,.9],'th:asia',limit);assert.ok(nav.walkable(restored,limit));
 }
});
test('F12: old saves snap to closest allowed pixel and valid branch positions survive unchanged',()=>{
 const bad=[.65,.53],p=dungeonSnap(bad);assert.ok(dungeonWalkable(p));
 const distance=q=>((q[0]-bad[0])*1672)**2+((q[1]-bad[1])*941)**2;
 for(let i=0;i<nav.cells.length;i++)if(nav.cells[i])assert.ok(distance(nav.point(i))>=distance(p)-1e-8);
 assert.deepEqual(dungeonSnap(BRANCHES[0]),BRANCHES[0]);
});
test('F12: 80 owner roots outside mask, three sprite types, base and big sizes',()=>{
 const trees=ROUTE_GEOMETRY['th:asia'].ambient.trees;assert.equal(trees.length,80);
 assert.deepEqual([...new Set(trees.map(t=>t.kind))].sort(),['green','lightgreen','red']);
 for(const t of trees)assert.equal(dungeonWalkable([t.x,t.y]),false);
 const calls=[],ctx={drawImage(...args){calls.push(args);}},image={complete:true,naturalWidth:200,naturalHeight:400};
 drawFrontierTree(ctx,{}, {x:40,y:90,height:1000,image});drawFrontierTree(ctx,{big:true},{x:40,y:90,height:1000,image});
 assert.equal(calls[0][4],52);assert.equal(calls[1][4],52*1.4);
});
test('F12: owner route 3-4 has an independent enabled corridor',()=>{
 assert.deepEqual(dungeonPoint(0,'west:cyberhell'),ROUTE_GEOMETRY['west:cyberhell'].corridor[0]);
 assert.equal(ROUTE_GEOMETRY['west:cyberhell'].enabled,true);
 assert.notDeepEqual(ROUTE_GEOMETRY['west:cyberhell'].corridor,ORIGINAL);
 assert.ok(ROUTE_GEOMETRY['west:cyberhell'].walkMask.runs.length);
 assert.notDeepEqual(ROUTE_GEOMETRY['asia:west'].corridor,ORIGINAL);
});
