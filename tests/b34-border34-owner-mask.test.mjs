import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {routeRow,routeBossCave,routeCaptainCave} from '../src/route-geometry.js';
import {dungeonNavigation,dungeonPoint,dungeonCheckpointProgress,dungeonEnemyPositions,dungeonAtExit} from '../src/dungeon-view.js';
import {initializeZoneTravel,beginDungeon,nextDungeonEncounter,resolveDungeonEncounter,dungeonStatus} from '../src/zone-travel.js';
const id='west:cyberhell',row=routeRow(id),nav=dungeonNavigation(id);
const game=()=>({zone:'west',bossCleared:{west:true},zoneSave:{},zoneEvents:{}});
// Decode the independently supplied 8-bit grayscale PNG, including its row filters.
function ownerPixels(){
 const png=readFileSync(new URL('./fixtures/border34-owner-mask.png',import.meta.url)),parts=[];
 assert.equal(png[24],8);assert.equal(png[25],0);
 for(let o=8;o<png.length;){const n=png.readUInt32BE(o);if(png.toString('ascii',o+4,o+8)==='IDAT')parts.push(png.subarray(o+8,o+8+n));o+=n+12;}
 const raw=inflateSync(Buffer.concat(parts)),out=new Uint8Array(1672*941);let k=0;
 for(let y=0;y<941;y++){const f=raw[k++];for(let x=0;x<1672;x++){
  const i=y*1672+x,a=x?out[i-1]:0,b=y?out[i-1672]:0,c=x&&y?out[i-1673]:0,p=a+b-c;
  const pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
  out[i]=(raw[k++]+[0,a,b,Math.floor((a+b)/2),pa<=pb&&pa<=pc?a:pb<=pc?b:c][f])&255;
 }}return out.map(v=>v?1:0);
}
test('B34: RLE equals every source pixel; 107353 pixels form one four-connected surface',()=>{
 assert.deepEqual(nav.cells,ownerPixels());assert.equal(nav.cells.reduce((s,v)=>s+v,0),107353);
 const seen=new Set(),queue=[nav.index(row.corridor[0])];seen.add(queue[0]);
 for(let k=0;k<queue.length;k++){const i=queue[k],x=i%nav.cols;for(const j of [x?i-1:-1,x<nav.cols-1?i+1:-1,i-nav.cols,i+nav.cols])if(nav.cells[j]&&!seen.has(j)){seen.add(j);queue.push(j);}}
 assert.equal(seen.size,107353);assert.equal(nav.cellProgress.filter(Number.isFinite).length,107353);
 for(let i=1;i<row.corridor.length;i++)assert.ok(nav.clear(row.corridor[i-1],row.corridor[i]),`segment ${i}`);
});
export const blockedBanks=[[.12,.14],[.22,.22],[.4,.47],[.58,.29],[.81,.6],[.67,.78]];
test('B34: six banks including the closed northern branch reject click and held movement',()=>{
 for(const p of blockedBanks){assert.equal(nav.walkable(p),false,`${p}`);assert.deepEqual(nav.path(row.corridor[0],p),[]);
  const at=nav.snap(p);assert.ok(nav.walkable(at));let moved=at;
  for(let i=0;i<80;i++){moved=nav.move(moved,[moved[0]+(p[0]-at[0])/80,moved[1]+(p[1]-at[1])/80]);assert.ok(nav.walkable(moved));}
  assert.notDeepEqual(moved,p);
 }
});
test('B34: native navigation reaches three checkpoint approaches and the exit with ordinary foes 10/11/12',()=>{
 const g=game();initializeZoneTravel(g);assert.ok(beginDungeon(g,'cyberhell'));let at=row.corridor[0];
 for(const [i,cp] of dungeonCheckpointProgress(id).entries()){
  const target=dungeonPoint(cp,id),limit=cp-.018,approach=nav.snap(target,limit),path=nav.path(at,approach,limit);assert.ok(path.length);
  for(const p of path){assert.ok(nav.clear(at,p,limit));at=nav.move(at,p,limit);assert.deepEqual(at,p);}
  assert.ok(Math.hypot(at[0]-target[0],at[1]-target[1])<=.045);
  assert.equal(nav.walkable(dungeonPoint(cp+.04,id),limit),false);
  for(const time of [0,8000,32000])for(const e of dungeonEnemyPositions(g,time))assert.ok(nav.walkable(e.position));
  const e=nextDungeonEncounter(g);assert.equal(e.kindIdx,10+i);assert.equal(e.boss,false);assert.ok(resolveDungeonEncounter(g,e.token,true));
 }
 const end=row.corridor.at(-1);for(const p of nav.path(at,end)){assert.ok(nav.clear(at,p));at=nav.move(at,p);}assert.deepEqual(at,end);
 g.zoneTravel.active.position={x:at[0],y:at[1]};assert.ok(dungeonStatus(g).ready);assert.ok(dungeonAtExit(g));
 assert.equal(routeBossCave(id),null);assert.equal(routeCaptainCave(id),null);
});
test('B34: 28 owner roots retain preview positions and stay outside floor, including moved roots 11/25',()=>{
 const source=JSON.parse(readFileSync(new URL('./fixtures/border34-owner-trees.json',import.meta.url)));
 assert.deepEqual(row.ambient.trees,source.map(({id,kind,x,y})=>({id,kind,x,y})));
 assert.deepEqual(source.reduce((n,t)=>(n[t.kind]=(n[t.kind]||0)+1,n),{}),{teal:11,purple:1,white:16});
 for(const t of row.ambient.trees)assert.equal(nav.walkable([t.x,t.y]),false,`tree ${t.id}`);
});
test('B34: legacy saves migrate to last completed checkpoint without adding caves or losing wins',()=>{
 for(let checkpoint=0;checkpoint<=3;checkpoint++){
  const g=game(),cleared=Array.from({length:checkpoint},(_,i)=>`${id}:${i}`);
  initializeZoneTravel(g,{version:1,visited:{west:true},ports:{west:true},active:{route:id,checkpoint,cleared,position:{x:.5,y:.925},pending:'old',attempt:4}});
  const a=g.zoneTravel.active;assert.equal(a.pending,null);assert.equal(a.geometryVersion,1);assert.equal(a.checkpoint,checkpoint);assert.deepEqual(a.cleared,cleared);
  assert.deepEqual([a.position.x,a.position.y],row.corridor[checkpoint?row.checkpointVertex[checkpoint-1]:0]);
 }
});
