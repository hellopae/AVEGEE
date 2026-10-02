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
 let from=[.15,.32];const path=frontierPath('th',from,[.28,.40]);assert.ok(path.length>1);
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
