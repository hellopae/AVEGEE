import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {routeRow,isWildernessRoute} from '../src/route-geometry.js';
import {dungeonNavigation,dungeonPoint,dungeonCheckpointProgress,dungeonEnemyPositions,dungeonAtExit} from '../src/dungeon-view.js';
import {initializeZoneTravel,beginDungeon,nextDungeonEncounter,resolveDungeonEncounter,dungeonStatus} from '../src/zone-travel.js';
const id='asia:west',row=routeRow(id),nav=dungeonNavigation(id);
const game=()=>({zone:'asia',bossCleared:{asia:true},zoneSave:{},zoneEvents:{}});
test('registered owner floor is one connected surface and every route segment stays inside it',()=>{
  assert.equal(createHash('sha256').update(readFileSync(new URL('./fixtures/border23-owner-mask.png',import.meta.url))).digest('hex'),'52c3ff4b7b32bff1ff2410e8b8a00e1d531211734b9ea46351405d4010933b1c');
  assert.deepEqual([nav.cols,nav.rows],[1672,941]);
  assert.equal(nav.cells.reduce((n,v)=>n+v,0),171611);
  assert.equal(nav.cellProgress.filter(Number.isFinite).length,171611,'all floor is reachable from the trail');
  for(let i=1;i<row.corridor.length;i++)assert.ok(nav.clear(row.corridor[i-1],row.corridor[i]),`segment ${i}`);
  const start=row.corridor[0],end=row.corridor.at(-1),path=nav.path(start,end);
  assert.ok(path.length>1);let p=start;for(const q of path){assert.ok(nav.clear(p,q));p=nav.move(p,q);assert.deepEqual(p,q);}assert.deepEqual(p,end);
  assert.equal(nav.walkable([.5,.1]),false);assert.equal(nav.walkable([.5,.53]),false);
});
test('stair passage connects southwest and northeast road mouths without cliff shortcuts',()=>{
  const lower=row.corridor.find(p=>Math.abs(p[0]-700.5/1672)<1e-8);
  const upper=row.corridor.find(p=>Math.abs(p[0]-800.5/1672)<1e-8);
  assert.ok(lower&&upper);const path=nav.path(lower,upper);assert.ok(path.length);
  let p=lower;for(const q of path){assert.ok(nav.clear(p,q));p=q;}assert.deepEqual(p,upper);
  assert.ok(nav.walkable([.467,.414]));
});
test('checkpoints and moving patrols stay on owner floor; an uncompleted checkpoint limits movement',()=>{
  const g=game();initializeZoneTravel(g);assert.ok(beginDungeon(g,'west'));
  const points=dungeonCheckpointProgress(id);assert.equal(points.length,3);
  for(let i=0;i<3;i++){
    const at=dungeonPoint(points[i],id);assert.ok(nav.walkable(at));
    const limit=points[i]-.018;assert.equal(nav.walkable(dungeonPoint(Math.min(1,points[i]+.04),id),limit),false);
    const approach=nav.snap(at,limit);assert.ok(Math.hypot(at[0]-approach[0],at[1]-approach[1])<=.045,'encounter within reach before the movement gate');
    for(const time of [0,8000,16000,32000])for(const e of dungeonEnemyPositions(g,time))assert.ok(nav.walkable(e.position),`${e.id} at ${time}`);
    const encounter=nextDungeonEncounter(g);assert.ok(resolveDungeonEncounter(g,encounter.token,true));assert.equal(resolveDungeonEncounter(g,encounter.token,true),false);
  }
  assert.ok(dungeonStatus(g).ready);const [x,y]=row.corridor.at(-1);g.zoneTravel.active.position={x,y};assert.ok(dungeonAtExit(g));
});
test('old vertical-route saves migrate at the last cleared checkpoint without losing progress or restoring a battle',()=>{
  for(let checkpoint=0;checkpoint<=3;checkpoint++){
    const g=game(),cleared=Array.from({length:checkpoint},(_,i)=>`${id}:${i}`);
    initializeZoneTravel(g,{version:1,visited:{asia:true},ports:{asia:true},active:{route:id,checkpoint,cleared,position:{x:.5,y:.925},guidePosition:{x:.5,y:.8},attempt:7,pending:'old-token'}});
    const a=g.zoneTravel.active;assert.ok(a);assert.deepEqual(a.cleared,cleared);assert.equal(a.checkpoint,checkpoint);assert.equal(a.attempt,7);assert.equal(a.pending,null);assert.equal(a.geometryVersion,1);assert.equal(a.guidePosition,null);
    assert.deepEqual([a.position.x,a.position.y],row.corridor[checkpoint?row.checkpointVertex[checkpoint-1]:0]);
    const current={x:a.position.x+.001,y:a.position.y};a.position=current;initializeZoneTravel(g);assert.deepEqual(g.zoneTravel.active.position,current,'new-format saves preserve their position');
  }
  const locked=game();locked.bossCleared.asia=false;initializeZoneTravel(locked);assert.equal(beginDungeon(locked,'west'),false);assert.equal(isWildernessRoute('west:cyberhell'),true);
});
