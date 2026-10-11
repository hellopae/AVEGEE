import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,STATIONS,ZONES,FRONTIER,ZONE_ENTRY,art,walk,syncSceneZone} from './helpers/m2-map.mjs';
import {reviewStationBox} from '../src/map-art-v5.js';
import {nearestInteraction,mapInteractions,stationButtonPos} from '../src/proximity.js';

test('M2: every zone has an exact door route from both spawns; 1px stepTo movement stays on terrain',async t=>{
 for(const {k:zone} of ZONES){
  const {g,terrain,spawn}=setup(zone);
  for(const d of [...STATIONS,FRONTIER])for(const start of [spawn,ZONE_ENTRY.gate])await t.test(`${zone}/${d.k} from ${start}`,()=>{
   const path=walk.findPath(...start,d.x,d.y);
   assert.ok(path?.length,`${zone}/${d.k}: path`);
   assert.deepEqual(path.at(-1),[d.x,d.y],`${zone}/${d.k}: exact door, not nearest endpoint`);
   // Follow stepWorld's waypoint tolerance, sliding, and findPath replan on collision.
   const p={x:start[0],y:start[1]};let queue=[...path],steps=0,replans=0;
   while(queue.length && steps++<20000){
    const [x,y]=queue[0],dist=Math.hypot(x-p.x,y-p.y);
    // same corner rule as game.js: cut the corner only when the next leg is clear from here
    if(dist<5&&!(queue.length>1&&dist>0.6&&!walk.clearLine([p.x,p.y],queue[1]))){queue.shift();continue;}
    if(!walk.stepTo(p,(x-p.x)/dist,(y-p.y)/dist,true)){
     assert.ok(++replans<=20,`${zone}/${d.k}: repeated stuck replans at ${p.x},${p.y}`);
     queue=walk.findPath(p.x,p.y,d.x,d.y,true);
     assert.ok(queue?.length,`${zone}/${d.k}: game cannot replan`);
    }
    assert.equal(terrain[Math.floor(p.y)*1678+Math.floor(p.x)],1,`${zone}/${d.k}: actual step on terrain`);
   }
   assert.ok(steps<20000,`${zone}/${d.k}: bounded game movement`);
   assert.ok(Math.hypot(p.x-d.x,p.y-d.y)<5,`${zone}/${d.k}: walks to door`);
  });
 }
 syncSceneZone('th');
});

test('M2: map-v5 dimensions shrink 20%, preserve the base, scale H2 bands, and follow the roof button',()=>{
 for(const {k:zone} of ZONES){
  const {g}=setup(zone);
  for(const d of [...STATIONS,FRONTIER]){
   if(!art.artUrl('st-'+d.k).includes('/map-v5/'))continue;
   const im=art.img('st-'+d.k),box=reviewStationBox(d,im,zone);
   const old=reviewStationBox({...d,mapScale:d.mapScale/.8},im,zone);
   assert.ok(Math.abs(box.w/old.w-.8)<1e-12);
   assert.ok(Math.abs(box.h/old.h-.8)<1e-12);
   assert.equal(box.x+box.w/2,d.bx);assert.equal(box.y+box.h,d.by);
   const bands=art.blockRectsOf(d),prior=art.blockRectsOf({...d,mapScale:d.mapScale/.8,blockScale:1});
   assert.equal(bands.length,prior.length);
   for(let i=0;i<bands.length;i++)for(let j=0;j<4;j++){
    const base=j%2?d.by:d.bx;
    assert.ok(Math.abs((bands[i][j]-base)-(prior[i][j]-base)*.8)<1e-6,`${zone}/${d.k}: band`);
   }
   const pos=stationButtonPos(d),body=art.bodyBoxOf(d);
   assert.equal(pos.bx,(body[0]+body[2])/2);assert.ok(pos.by>=body[1]&&pos.by<=body[3]);
  }
  const target=mapInteractions(g,{x:0,y:0}).find(t=>t.key==='lan');
  assert.equal(target.reach,80);
  assert.equal(nearestInteraction({x:target.x+80,y:target.y},[target]),target);
  assert.equal(nearestInteraction({x:target.x+80.01,y:target.y},[target]),null);
  const first=STATIONS.map(d=>JSON.stringify(d));syncSceneZone(zone);
  assert.deepEqual(STATIONS.map(d=>JSON.stringify(d)),first,'zone sync never accumulates scale');
 }
 syncSceneZone('th');
});
