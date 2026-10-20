import test from 'node:test';
import assert from 'node:assert/strict';
import {FRONTIER_WORLD,frontierActorHeight,frontierCameraTarget} from '../src/frontier-view-metrics.js';
test('frontier follow camera keeps native texture scale across phone, laptop and large display',()=>{
 for(const [w,h]of [[390,650],[1280,620],[2560,1440]]){
  const cam=frontierCameraTarget(w,h,[.5,.5]);assert.equal(cam.scale,1);
  assert.equal(frontierActorHeight('yama',cam.scale),92*.8*.75*1.12);
  if(w>=FRONTIER_WORLD.w)assert.equal(cam.x,(w-FRONTIER_WORLD.w)/2);
  else assert.ok(cam.x<=0&&cam.x>=w-FRONTIER_WORLD.w);
 }
});
test('overview contains the complete map and scales every actor with the terrain',()=>{
 for(const [w,h]of [[390,650],[1280,620],[2560,1440]]){
  const c=frontierCameraTarget(w,h,[.05,.9],true);
  assert.ok(c.x>=-1e-9&&c.y>=-1e-9);
  assert.ok(c.x+FRONTIER_WORLD.w*c.scale<=w+1e-9);
  assert.ok(c.y+FRONTIER_WORLD.h*c.scale<=h+1e-9);
  assert.equal(frontierActorHeight('nira',c.scale),82*.8*.75*c.scale);
 }
});

test('frontier decoration trunks stay outside the walkable road',async()=>{
 const {FRONTIER_TREES}=await import('../src/frontier-ambient.js');
 const {dungeonWalkable}=await import('../src/dungeon-view.js');
 for(const p of FRONTIER_TREES)assert.equal(dungeonWalkable(p),false,`tree trunk ${p}`);
});
