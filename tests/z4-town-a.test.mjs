import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setup,walk,art} from './helpers/m2-map.mjs';
import {createGame} from '../src/game.js';
import {STATIONS,SPOTS,MERCHANT,GUARD_POST,CHALLENGE_STAND,ZONE_ENTRY,QUEUE_LINE,FRONTIER,FINAL_EVENT,SCENE,syncSceneZone} from '../src/data.js';
import {TOWN_CREW,TOWN_DAIS,TOWN_PROP_SITES,townFloorAt} from '../src/town-layout.js?v=k1d';
import {TOWN_OWNER_MASK_META} from '../src/town-owner-walkmask-cyberhell.js';
import {DEVA_MAP} from '../src/deva-map.js';
import {CYBERHELL_LAYOUT} from '../src/town-cyberhell-layout.js';
import {stationBox} from '../src/art.js';
import {townSites} from '../src/town-map.js?v=k1d';
import {canteenActive,canteenPoint} from '../src/canteen.js';
import {merchantRun} from '../src/side-quests.js';

function targets(){return [
 ...STATIONS.map(d=>({key:d.k,x:d.x,y:d.y})),
 ...Object.entries(TOWN_CREW).map(([key,[x,y]])=>({key:'crew:'+key,x,y})),
 ...Object.entries(ZONE_ENTRY).map(([key,[x,y]])=>({key:'entry:'+key,x,y})),
 ...QUEUE_LINE.map(([x,y],i)=>({key:'queue:'+i,x,y})),
 ...FINAL_EVENT.enemyPositions.map(([x,y],i)=>({key:'enemy:'+i,x,y})),
 ...FINAL_EVENT.reinforcementPositions.map(([x,y],i)=>({key:'reinforcement:'+i,x,y})),
 {key:'plaza',...SPOTS.plaza},{key:'throne',...SPOTS.throne},
 {key:'spawn',x:SPOTS.bench.x+60,y:SPOTS.bench.y},
 {key:'final:staging',x:1700,y:980},{key:'final:rest',x:FINAL_EVENT.restPosition[0],y:FINAL_EVENT.restPosition[1]},
 {key:'merchant',...MERCHANT},{key:'guard',x:GUARD_POST[0],y:GUARD_POST[1]},
 {key:'challenge',...CHALLENGE_STAND},{key:'frontier',x:FRONTIER.x,y:FRONTIER.y},
 {key:'harbour',x:SPOTS.ferry.from[0],y:SPOTS.ferry.from[1]},
 {key:'deva',...DEVA_MAP.cyberhell},
 ];}
for(const allBuilt of [false,true])test(`Z4-TOWN-A: all destinations reachable with ${allBuilt?'all':'initial'} buildings`,()=>{
 const {g}=setup('cyberhell');
 if(!allBuilt)g.stations=g.stations.filter(s=>['sala','tarang'].includes(s.def.k));
 g.syncBlocks(true);
 assert.deepEqual([SCENE.w,SCENE.h],[3840,2560]);
 assert.equal(TOWN_PROP_SITES.some(p=>p.kind==='tree'||p.kind==='palm'),false);
 const start=[...ZONE_ENTRY.gate],points=targets();
 assert.ok(walk.canWalk(...start));
 for(const p of points){
  assert.ok(townFloorAt(p.x,p.y),p.key+': inside owner mask');
  assert.ok(walk.canWalk(p.x,p.y),p.key+': outside actual building collisions');
  const path=walk.findPath(...start,p.x,p.y);assert.ok(path?.length,p.key+': route from entry');
  assert.deepEqual(path.at(-1),[p.x,p.y],p.key+': route reaches exact destination');
  let a=start;
  for(const b of path){
   const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));
   for(let i=0;i<=n;i++)assert.ok(walk.canWalk(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n),p.key+': complete smoothed route stays legal');
   a=b;
  }
  p.path=path;
 }
 // The original red stripe and two little holes must never be reopened by UI pads.
 for(const [x,y] of [[745,359],[710,405],[777,405]])assert.equal(townFloorAt(x*2.5,y*2.5),false);
 assert.ok(TOWN_DAIS.y<1100,'judgment on central circle, not bottom entry circle');
 for(const st of g.stations)assert.ok(art.blockRectsOf(st.def)?.length,st.def.k+': actual sprite collision loaded');
 if(allBuilt&&process.env.Z4_EVIDENCE){
  const describe=d=>{const b=stationBox(d);return {key:d.k,door:[d.x,d.y],bx:d.bx,by:d.by,bw:d.bw,box:b&&{x:b.x,y:b.y,w:b.w,h:b.h,flip:b.flip,src:b.im.src},blocks:art.blockRectsOf(d)};};
  const buildings=STATIONS.map(describe),frontier=describe(FRONTIER);
  writeFileSync('output/coordination/2026-10-30-z4-town-a/navigation.json',JSON.stringify({world:SCENE,sourceScale:2.5,start,points,buildings,frontier,dais:TOWN_DAIS},null,2)+'\n');
 }
 syncSceneZone('th');
});

test('Z4-TOWN-A: owner mask source authenticated and no dilation/disconnected islands',()=>{
 const bytes=readFileSync(TOWN_OWNER_MASK_META.source);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),TOWN_OWNER_MASK_META.source_sha256);
 assert.equal(TOWN_OWNER_MASK_META.removed_disconnected_cells,0);
 assert.equal(TOWN_OWNER_MASK_META.dilate,0);
});

for(const v of [2,3,4])test(`Z4-TOWN-A: v${v} old save repaired on restore and remains stable after reload`,()=>{
 const {g}=setup('cyberhell');g.coin=777;g.casesDone=12;
 const d=JSON.parse(JSON.stringify(g.snapshot()));d.v=v;delete d.z4TownVersion;d.townSkinMigrated.cyberhell=true;
 Object.assign(d.player,{x:20,y:20,tx:1200,ty:400,path:[[1200,400]]});
 const loaded=createGame();assert.equal(loaded.restore(d),true);
 assert.equal(loaded.coin,777);assert.equal(loaded.casesDone,12);assert.equal(loaded.zone,'cyberhell');
 assert.ok(walk.canWalk(loaded.player.x,loaded.player.y));assert.equal(loaded.player.path,null);
 const p=[loaded.player.x,loaded.player.y],twice=createGame();twice.restore(loaded.snapshot());
 assert.deepEqual([twice.player.x,twice.player.y],p);assert.ok(walk.canWalk(...p));
 syncSceneZone('th');
});

test('Z4-TOWN-A: inactive parked save and retry snapshot use zone 4 geometry while another town is open',()=>{
 const {g}=setup('th'),d=JSON.parse(JSON.stringify(g.snapshot()));delete d.z4TownVersion;
 d.zoneSave.cyberhell={player:{x:0,y:0},items:[{k:'wood',x:0,y:0}],crew:[],stations:[],guard:null};
 d.zoneEntry={zone:'cyberhell',player:{x:0,y:0},crew:[],items:[]};
 const loaded=createGame();loaded.restore(d);
 const expected=[CYBERHELL_LAYOUT.spots.bench.x+60,CYBERHELL_LAYOUT.spots.bench.y];
 assert.deepEqual([loaded.zoneSave.cyberhell.player.x,loaded.zoneSave.cyberhell.player.y],expected);
 assert.deepEqual([loaded.zoneSave.cyberhell.items[0].x,loaded.zoneSave.cyberhell.items[0].y],expected);
 if(loaded.zoneEntry?.zone==='cyberhell')assert.deepEqual([loaded.zoneEntry.player.x,loaded.zoneEntry.player.y],expected);
 assert.equal(loaded.zone,'th');
});

// Fresh snapshots already use v3 geometry even before the legacy skin marker is set.
// A reload during the army warp must keep Yama between allies and enemies.
test('Z4-TOWN-A: fresh v3 save keeps its legal location and army staging across reload',()=>{
 const {g}=setup('cyberhell');
 Object.assign(g.player,{x:1700,y:980,tx:null,ty:null,path:null});
 const d=JSON.parse(JSON.stringify(g.snapshot()));delete d.townSkinMigrated;
 const loaded=createGame();assert.equal(loaded.restore(d),true);
 assert.deepEqual([loaded.player.x,loaded.player.y],[1700,980]);
 assert.ok(walk.canWalk(loaded.player.x,loaded.player.y));
 assert.ok(FINAL_EVENT.enemyPositions.every(([x])=>x>loaded.player.x));
 assert.ok(FINAL_EVENT.reinforcementPositions.every(([x])=>x<loaded.player.x));
 syncSceneZone('th');
});

test('Z4-TOWN-A: v3 save with an invalid position is repaired before the first world step',()=>{
 const {g}=setup('cyberhell'),d=JSON.parse(JSON.stringify(g.snapshot()));
 Object.assign(d.player,{x:-500,y:4000,tx:20,ty:20,path:[[20,20]]});
 const loaded=createGame();assert.equal(loaded.restore(d),true);
 assert.ok(walk.canWalk(loaded.player.x,loaded.player.y));
 assert.equal(loaded.player.path,null);assert.equal(loaded.player.tx,null);assert.equal(loaded.player.ty,null);
 syncSceneZone('th');
});

test('Z4-TOWN-A: FOOD-A kitchen remains a plot until constructed, then uses the reserved court door',()=>{
 const {g}=setup('cyberhell');g.stations=g.stations.filter(s=>s.def.k!=='canteen');g.syncBlocks(true);
 assert.equal(townSites(g).find(s=>s.key==='canteen').state,'plot');assert.equal(canteenActive(g),false);
 const d=STATIONS.find(s=>s.k==='canteen'),st={def:d,build:100,slots:[],fire:0};g.stations.push(st);
 assert.equal(townSites(g).find(s=>s.key==='canteen').state,'building');assert.equal(canteenActive(g),false);
 st.build=0;g.syncBlocks(true);
 assert.equal(townSites(g).find(s=>s.key==='canteen').state,'built');assert.equal(canteenActive(g),true);
 assert.deepEqual(canteenPoint(g),[d.x,d.y]);
 assert.deepEqual([d.bx,d.by,d.bw],[500,1665,187.5]);   // Q4-8: moved to the lower-left plaza, buildings x1.5
 syncSceneZone('th');
});

test('Z4-TOWN-A: interrupted merchant arrival discards its old route and walks only on the new floor',()=>{
 const {g}=setup('cyberhell');
 g.merchantJourney={cyberhell:{running:true,runMs:0,arrived:false,path:[[1038,350],[MERCHANT.x,MERCHANT.y]]}};
 const old=g.merchantJourney.cyberhell.path;
 assert.deepEqual(merchantRun(g),{x:ZONE_ENTRY.gate[0],y:ZONE_ENTRY.gate[1]});
 assert.notEqual(g.merchantJourney.cyberhell.path,old);
 for(let ms=0;ms<=6000;ms+=10){g.merchantJourney.cyberhell.runMs=ms;const p=merchantRun(g);assert.ok(walk.canWalk(p.x,p.y),`merchant at ${ms} ms`);}
 assert.deepEqual(merchantRun(g),{x:MERCHANT.x,y:MERCHANT.y});
 syncSceneZone('th');
});
