import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWN_TREES,TOWN_WATERFALL,TOWN_EDGE_HOMES,sceneryPoint} from '../src/town-scenery.js';
import {townContains,TOWN_PLAZA,TOWN_SIZE} from '../src/town-layout.js';
import {townCameraRect,townHouseDepth} from '../src/town-map.js';

test('camera world rectangle stays inside the map at edges, with a true full-map overview',()=>{
  for(const zoom of [1,3.5,5,6.5])for(const [x,y]of [[0,0],[3840,2560],[1920,1250]]){
    const r=townCameraRect(x,y,zoom);
    assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=TOWN_SIZE.w+1e-8&&r.y+r.h<=TOWN_SIZE.h+1e-8);
    assert.equal(r.w,TOWN_SIZE.w/zoom);assert.equal(r.h,TOWN_SIZE.h/zoom);
  }
  assert.deepEqual(townCameraRect(0,0,1),{x:0,y:0,w:3840,h:2560});
});
test('residential facade occlusion sorts by its ground base',()=>{
  assert.equal(townHouseDepth([100,200,300,400]),400);
});

test('decorative roots and waterfall occupy closed scenery ground, leaving civic center walkable',()=>{
  for(const p of [...TOWN_TREES,TOWN_WATERFALL])assert.equal(townContains(p.x,p.y),false,JSON.stringify(p));
  for(const [x,y]of TOWN_EDGE_HOMES)assert.equal(townContains(x,y),false);
  assert.equal(townContains(...TOWN_PLAZA),true);
  assert.ok(Math.abs(TOWN_PLAZA[0]-TOWN_SIZE.w/2)<10);
});
test('near scenery travels faster and distant scenery slower than the clamped camera',()=>{
  const a={cx:300,cy:400,zoom:3.5},b={cx:400,cy:500,zoom:3.5};
  const screen=(view,rate)=>{const p=sceneryPoint(500,600,view,rate);return [p.x-view.cx,p.y-view.cy];};
  for(const rate of [.045,-.025]){
    const p=screen(a,rate),q=screen(b,rate);
    assert.ok(Math.abs(q[0]-p[0]+100*(1+rate))<1e-8);
    assert.ok(Math.abs(q[1]-p[1]+100*(1+rate))<1e-8);
  }
  assert.deepEqual(sceneryPoint(500,600,{...a,zoom:1},.045),{x:500,y:600});
  assert.deepEqual(sceneryPoint(500,600,a,.045,true),{x:500,y:600});
  const p=sceneryPoint(500,600,{cx:9000,cy:9000,zoom:4.5},.045);
  assert.ok(Math.abs(p.x-500)<=42&&Math.abs(p.y-600)<=22);
});
