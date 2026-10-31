import test from 'node:test';
import assert from 'node:assert/strict';
import {dungeonFollowerRest,dungeonPoint,dungeonWalkable,DUNGEON_FOLLOW_GAP} from '../src/dungeon-view.js';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';

test('Q4-1: Nira rests at her walking gap behind Yama on every route and never on top of him',()=>{
  for(const routeId of Object.keys(ROUTE_GEOMETRY)){
    for(let v=0;v<=1;v+=.05){
      const hero=dungeonPoint(v,routeId),rest=dungeonFollowerRest(hero,routeId,1);
      assert.ok(dungeonWalkable(rest,routeId),`${routeId}@${v} rest is walkable`);
      assert.ok(Math.hypot(rest[0]-hero[0],rest[1]-hero[1])>=DUNGEON_FOLLOW_GAP*.8,`${routeId}@${v} not stacked`);
    }
  }
});

import {createGame} from '../src/game.js';
import {bossPierRetired} from '../src/boss-guides.js';
test('Q4-5: zone 4 boss leaves the pier once beaten (retired flag); other zones keep their guide rules',()=>{
  const g=createGame();g.save=()=>{};g.onChange=()=>{};
  g.zone='cyberhell';g.bossGuarding={...g.bossGuarding,cyberhell:true};
  assert.equal(bossPierRetired(g),false,'still guarding the bridge before the win');
  g.bossCleared.cyberhell=true;
  assert.equal(bossPierRetired(g),true);
  g.zone='west';g.bossCleared.west=true;
  assert.equal(bossPierRetired(g),false,'zone 3 keeps the pier guide until the farewell');
});

import {STATIONS,MERCHANT,ZONE_ENTRY,syncSceneZone} from '../src/data.js';
import {TOWN_HOUSE_SITES,TOWN_HOUSES,townFloorAt} from '../src/town-layout.js?v=k1d';
import {setup,walk} from './helpers/m2-map.mjs';
test('Q4-8: the canteen stands where the crossed-out house was in zones 1-3 (house removed); its door is walkable and cooks reach Ngiw/Krata',()=>{
  for(const z of ['th','asia','west']){
    const {g}=setup(z);g.syncBlocks(true);
    const c=STATIONS.find(s=>s.k==='canteen');
    assert.deepEqual([c.bx,c.by],[1572,646],z+': canteen at the old upper-left house spot');
    assert.equal(TOWN_HOUSE_SITES.length,10,z+': the crossed-out house is gone');
    assert.equal(TOWN_HOUSES.length,9);
    assert.ok(!TOWN_HOUSE_SITES.some(h=>h.x===1551&&h.y===655),z+': no house left at the old spot');
    assert.ok(townFloorAt(c.x,c.y)&&walk.canWalk(c.x,c.y),z+': door on walkable floor');
    for(const post of ['ngiw','krata']){const t=STATIONS.find(s=>s.k===post);assert.ok(walk.findPath(c.x,c.y,t.x,t.y)?.length,z+': door -> '+post);}
  }
  syncSceneZone('th');
});
test('Q4-7/8: zone 4 merchant and canteen follow the owner arrows and stay reachable',()=>{
  const {g}=setup('cyberhell');g.syncBlocks(true);
  const c=STATIONS.find(s=>s.k==='canteen');
  assert.ok(Math.hypot(MERCHANT.x-1760,MERCHANT.y-1590)<5);assert.ok(Math.hypot(c.bx-1600,c.by-670)<5);
  for(const p of [[MERCHANT.x,MERCHANT.y],[c.x,c.y]]){assert.ok(townFloorAt(...p)&&walk.canWalk(...p));assert.ok(walk.findPath(ZONE_ENTRY.gate[0],ZONE_ENTRY.gate[1],...p)?.length);}
  syncSceneZone('th');
});

import {dungeonEnemyPositions,dungeonAutoEncounter,dungeonRoamPoint,DUNGEON_ROAM_REACH} from '../src/dungeon-view.js';
import {initializeZoneTravel,beginDungeon} from '../src/zone-travel.js';
function routeGame(from,to){const g=createGame();g.save=()=>{};g.onChange=()=>{};g.bossCleared[from]=true;initializeZoneTravel(g);g.zone=from;initializeZoneTravel(g);assert.ok(beginDungeon(g,to));return g;}
test('Q4-3: route enemies stroll on the road in every route, smoothly, and cover a visible stretch',()=>{
  for(const [from,to,id] of [['th','asia','th:asia'],['asia','west','asia:west'],['west','cyberhell','west:cyberhell']]){
    const g=routeGame(from,to);let prev=null,travel=new Map();
    for(let t=0;t<=40000;t+=64){
      const list=dungeonEnemyPositions(g,t);
      list.forEach((e,i)=>{
        assert.ok(dungeonWalkable(e.position,id),`${id} ${e.id} @${t} on the road`);
        assert.ok(Math.hypot(e.position[0]-e.anchor[0],e.position[1]-e.anchor[1])<=DUNGEON_ROAM_REACH+1e-9,'stays near its post');
        if(prev)assert.ok(Math.hypot(e.position[0]-prev[i].position[0],e.position[1]-prev[i].position[1])<.0015,`${id} ${e.id} smooth`);
        travel.set(e.id,Math.max(travel.get(e.id)||0,Math.hypot(e.position[0]-list[i].anchor[0],e.position[1]-list[i].anchor[1])));
      });
      prev=list;
    }
    const moving=[...travel.values()].filter(v=>v>.01).length;
    // a few posts sit on a one-lane stair/bridge where the road leaves no room to stroll; they keep their post
    assert.ok(moving>=travel.size-3,`${id}: most enemies visibly stroll (${moving}/${travel.size})`);
  }
});
test('Q4-3: an enemy never starts a battle with a standing Yama; walking toward it (or pressing toward it) does',()=>{
  const g=routeGame('th','asia');const e=dungeonEnemyPositions(g,5000).find(x=>x.patrol&&!x.locked);
  const at=[e.position[0]-.01,e.position[1]];
  assert.equal(dungeonAutoEncounter(g,at,5000,{from:at,heading:null}),null,'standing still: no battle');
  assert.equal(dungeonAutoEncounter(g,at,5000,{from:[at[0]-.01,at[1]],heading:null})?.id,e.id,'closing the distance: battle');
  assert.equal(dungeonAutoEncounter(g,at,5000,{from:at,heading:[1,0]})?.id,e.id,'pressing toward it: battle');
  assert.equal(dungeonAutoEncounter(g,at,5000,{from:[at[0]+.01,at[1]],heading:[-1,0]}),null,'walking away: no battle');
});
