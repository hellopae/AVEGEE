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
