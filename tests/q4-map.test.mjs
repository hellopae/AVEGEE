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

import {STATIONS,syncSceneZone} from '../src/data.js';
import {TOWN_HOUSE_SITES,TOWN_HOUSES,townFloorAt} from '../src/town-layout.js?v=k1d';
import {setup,walk} from './helpers/m2-map.mjs';
test('Q4-8: zones 2-3 canteen stands on the upper-left plaza (house removed), zone 1 keeps its slot; door is walkable and reaches Ngiw/Krata',()=>{
  const slot=(z)=>{syncSceneZone(z);return STATIONS.find(s=>s.k==='canteen');};
  const th=slot('th'),thHouses=TOWN_HOUSE_SITES.length;
  assert.deepEqual([th.bx,th.by],[1536,960],'zone 1 unchanged');
  for(const z of ['asia','west']){
    const {g}=setup(z);g.syncBlocks(true);
    const c=STATIONS.find(s=>s.k==='canteen');
    assert.deepEqual([c.bx,c.by],[680,540],z+': canteen on the upper-left plaza');
    assert.equal(TOWN_HOUSE_SITES.length,thHouses-1,z+': the crossed-out house is gone');
    assert.equal(TOWN_HOUSES.length,thHouses-2);
    assert.ok(!TOWN_HOUSE_SITES.some(h=>h.x===639&&h.y===751),z+': no house left at the old spot');
    assert.ok(townFloorAt(c.x,c.y)&&walk.canWalk(c.x,c.y),z+': door on walkable floor');
    for(const post of ['ngiw','krata']){const t=STATIONS.find(s=>s.k===post);assert.ok(walk.findPath(c.x,c.y,t.x,t.y)?.length,z+': door -> '+post);}
  }
  syncSceneZone('th');
});
