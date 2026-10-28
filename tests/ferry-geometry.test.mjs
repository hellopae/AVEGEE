import test from 'node:test';
import assert from 'node:assert/strict';
import {ferryBerth,ferryBridge,withFerryOcclusion} from '../src/ferry-geometry.js';
import {mapTravelPose,beginMapTravel,advanceMapTravel} from '../src/map-travel.js';
import {createGame} from '../src/game.js';
import {harbourTravel} from './helpers/travel.mjs';
import {inPoly} from '../src/walk.js?v=k1d';
globalThis.Image??=class{};
const near=(a,b)=>{assert(Math.abs(a.x-b.x)<1e-8);assert(Math.abs(a.y-b.y)<1e-8);};
function a(){return {mode:'boat',pier:{x:2225,y:1780},waterY:1840,niraPath:[[2100,1680],[2225,1780]],boardingHop:8,reduced:false};}
for(const zone of ['th','asia','west'])test(`${zone}: reviewed berth is close to the quay and bridge clips only river crossings`,()=>{
 const b=ferryBerth(zone,{x:2225,y:1780});assert.deepEqual(b,{x:2225,y:1840,hop:8});
 assert(inPoly(1930,b.y,ferryBridge(zone)));assert(!inPoly(b.x,b.y,ferryBridge(zone)));assert(!inPoly(1600,b.y,ferryBridge(zone)));
 const source=a(),start=mapTravelPose({...source,phase:'board',progress:0},400),end=mapTravelPose({...source,phase:'board',progress:1},400);
 assert(Math.abs(end.hero.y-start.hero.y)<60,'boarding is less than the old 124-unit jump');
});
test('boarding and landing meet the same bobbing deck used while sailing',()=>{
 for(const reduced of [false,true])for(const time of [0,400,1234]){
  const source={...a(),reduced};
  near(mapTravelPose({...source,phase:'handoff',progress:1},time).reader,mapTravelPose({...source,phase:'board',progress:0},time).reader);
  for(const key of ['hero','reader']){
   near(mapTravelPose({...source,phase:'board',progress:1},time)[key],mapTravelPose({...source,phase:'depart',progress:0},time)[key]);
   near(mapTravelPose({...source,phase:'arrive',progress:1},time)[key],mapTravelPose({...source,phase:'land',progress:0},time)[key]);
  }
 }
});
test('landing uses the destination quay, never the previous branch pickup path',()=>{
 const dest={...a(),pier:{x:470,y:682},waterY:802,phase:'land',progress:1};
 const p=mapTravelPose(dest,0);near(p.hero,{x:456,y:682});near(p.reader,{x:492,y:682});
 assert.deepEqual(ferryBerth('cyberhell',dest.pier),{x:470,y:802,hop:40},'unfinished legacy berth retains its offset');
});
test('bridge clipping restores canvas state even if a vessel draw fails',()=>{
 const calls=[],ctx={save(){calls.push('save');},restore(){calls.push('restore');},beginPath(){},rect(){},moveTo(){},lineTo(){},closePath(){},clip(rule){calls.push(rule);}};
 assert.throws(()=>withFerryOcclusion(ctx,'th',()=>{calls.push('draw');throw Error('draw failed');}),/draw failed/);
 assert.deepEqual(calls,['save','evenodd','draw','restore']);
});
test('committing between town and legacy ports resets berth and boarding height to destination geometry',()=>{
 const g=createGame();g.save=()=>true;g.onChange=()=>{};g.bossCleared={th:true,asia:true,west:true};
 harbourTravel(g,'west');g.zoneTravel.visited.cyberhell=g.zoneTravel.ports.cyberhell=true;Object.assign(g.player,g.harbourPoint());
 assert(beginMapTravel(g,'cyberhell'));assert.equal(g.mapTravel.boardingHop,8);
 for(let i=0;i<2000&&g.mapTravel&&!g.mapTravel.committed;i++)advanceMapTravel(g,120);
 assert.equal(g.zone,'cyberhell');assert.equal(g.mapTravel.boardingHop,40);assert.equal(g.mapTravel.waterY,g.harbourPoint().y+120);
});
