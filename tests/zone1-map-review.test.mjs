import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_LAVA_STAIRS,TOWN_LAVA_LOWER_ROAD,
  townFloorAt,townInPolygon
} from '../src/town-layout.js?v=map-review-v6';
import {STATIONS,syncSceneZone} from '../src/data.js';

test('owner map review: the upper bridge landing no longer has blocking tree roots',()=>{
  const removed=[[1421,455],[1482,480],[1540,493],[1584,493]];
  for(const [x,y] of removed)
    assert.equal(TOWN_PROP_SITES.some(p=>p.kind==='tree'&&Math.hypot(p.x-x,p.y-y)<8),false,`${x},${y}`);
  for(const [x,y] of [[1055,680],[1140,704],[1390,500],[1470,520]])
    assert.equal(townFloorAt(x,y),true,`painted upper stair ${x},${y}`);
});

test('owner map review: both west-city paved routes are walkable across their full width',()=>{
  for(const poly of [TOWN_LAVA_STAIRS,TOWN_LAVA_LOWER_ROAD]){
    const cx=poly.reduce((n,p)=>n+p[0],0)/poly.length,cy=poly.reduce((n,p)=>n+p[1],0)/poly.length;
    assert.equal(townInPolygon(cx,cy,poly),true);
    assert.equal(townFloorAt(cx,cy),true,`${cx},${cy}`);
  }
  for(const [x,y]of [[1050,1000],[1100,1020],[1250,1035],[1445,1040],[720,1150],[900,1150],[1080,1155],[1240,1200],[1410,1190]])
    assert.equal(townFloorAt(x,y),true,`visible paving ${x},${y}`);
});

test('owner arrows flip the requested Zone 1 facades and reserve the waterfall event clearing',()=>{
  syncSceneZone('th');
  assert.deepEqual(STATIONS.filter(s=>s.flip).map(s=>s.k),['krata','dab','lokan','tarang']);
  assert.equal(TOWN_HOUSE_SITES.length,11);
  assert.equal(TOWN_HOUSE_SITES.some(h=>Math.hypot(h.x-3016,h.y-1607)<4),false,'waterfall residence removed');
  for(const [x,y] of [[1536,960],[1551,1661],[2283,1588]])
    assert.equal(TOWN_HOUSE_SITES.find(h=>h.x===x&&h.y===y)?.flip,true,`${x},${y}`);
});

test('map ambience uses shaped leaves, moving clouds, boiling lava and full building shadows',()=>{
  const night=readFileSync(new URL('../src/town-night-effects.js',import.meta.url),'utf8');
  const flow=readFileSync(new URL('../src/town-flow.js',import.meta.url),'utf8');
  const scenery=readFileSync(new URL('../src/town-scenery.js',import.meta.url),'utf8');
  const shade=readFileSync(new URL('../src/town-shade.js',import.meta.url),'utf8');
  const terrain=readFileSync(new URL('../src/town-terrain.js',import.meta.url),'utf8');
  assert.match(night,/export function drawTownClouds/);
  assert.match(night,/bezierCurveTo/,'falling foliage has pointed leaf contours');
  assert.match(flow,/T_BUBBLE/);assert.match(flow,/ellipse\(20,13,15,6\.5/);
  assert.match(scenery,/Layered pointed tongues/);
  assert.match(shade,/\.92\)/,'station shadows retain almost the complete facade height');
  assert.match(terrain,/visible\.every\(v=>v\.c\.state==='ready'\)/,'preview and sharp chunks switch atomically');
});
