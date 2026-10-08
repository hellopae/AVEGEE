import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierPath,frontierWalkable,frontierSegmentClear} from '../src/frontier-navigation.js';
for(const zone of ['th','asia','west','cyberhell']) {
 test(`${zone}: bottom entrance reaches top gate without crossing obstacles`,()=>{
  let from=[.5,.955];const path=frontierPath(zone,from,[.5,.19]);assert.ok(path.length);
  for(const to of path){assert.ok(frontierSegmentClear(zone,from,to));from=to;}
  assert.ok(Math.hypot(from[0]-.5,from[1]-.19)<.01);
  assert.equal(frontierWalkable(zone,.01,.5),false);
 });
}
test('Thai annotated fences and tower block walking; clicks route around the tower',()=>{
 assert.equal(frontierWalkable('th',.20,.35),false);
 assert.equal(frontierWalkable('th',.75,.48),false);
 // Map-Zone1-3.jpg paints the former [.15,.32] start inside the tower.
 // Start on the north-west floor; retain the same obstacle and detour checks.
 let from=[.145,.265];assert.ok(frontierWalkable('th',...from));
 const path=frontierPath('th',from,[.28,.40]);assert.ok(path.length>1);
 for(const to of path){assert.ok(frontierSegmentClear('th',from,to));from=to;}
});
test('Zone-specific water, buildings and machinery block movement and destination clicks',()=>{
 for(const [zone,p] of [['asia',[.80,.40]],['west',[.80,.80]],['cyberhell',[.70,.36]]]) {
  assert.equal(frontierWalkable(zone,...p),false);
  let from=[.5,.55],path=frontierPath(zone,from,p);assert.ok(path.length);
  for(const to of path){assert.ok(frontierSegmentClear(zone,from,to));from=to;}
  assert.ok(frontierWalkable(zone,...from));
 }
});
test('approved cyber frontier mask blocks structures and connects side floor, gate and stairs',()=>{
 for(const p of [[.43,.265],[.575,.265],[.16,.5],[.7,.36],[.82,.48],[.3,.8]])assert.equal(frontierWalkable('cyberhell',...p),false,`blocked ${p}`);
 for(const p of [[.5,.19],[.46,.30],[.548,.30],[.23,.55],[.80,.58],[.5,.955]]){
  assert.ok(frontierWalkable('cyberhell',...p),`floor ${p}`);
  let from=[.485,.35];const path=frontierPath('cyberhell',from,p);assert.ok(path.length);
  for(const next of path){assert.ok(frontierSegmentClear('cyberhell',from,next));from=next;}
  assert.ok(Math.hypot(from[0]-p[0],from[1]-p[1])<1e-8);
 }
});
