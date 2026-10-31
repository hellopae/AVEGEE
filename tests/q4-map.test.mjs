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
