import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWN_PROP_SITES, TOWN_PROP_COLLIDERS, TOWN_WALK_RECTS,
  TOWN_WALK_POLYS, TOWN_STATION_SITES, TOWN_SPOTS, TOWN_CREW, TOWN_QUEUE,
  townInRect, townInPolygon, townContains, townPropBlocks } from '../src/town-layout.js';

const unoccupiedFloor = (x,y) => TOWN_WALK_RECTS.some(r=>townInRect(x,y,r))
  || TOWN_WALK_POLYS.some(p=>townInPolygon(x,y,p));

test('standalone scenery has unique rooted art metadata and solid compact feet',()=>{
  assert.ok(TOWN_PROP_SITES.length>=50,'large world has independently placed scenery');
  assert.equal(new Set(TOWN_PROP_SITES.map(p=>p.id)).size,TOWN_PROP_SITES.length);
  assert.equal(TOWN_PROP_COLLIDERS.length,TOWN_PROP_SITES.length);
  const kinds=new Set(TOWN_PROP_SITES.map(p=>p.kind));
  for(const kind of ['tree','bush','rock','volcano','ice-ridge','waterfall'])assert.ok(kinds.has(kind),kind);
  for(const p of TOWN_PROP_SITES){
    assert.ok(p.key.startsWith('town-'),p.id+' has an independently resolved sprite');
    assert.ok([p.x,p.y,p.w,p.rx,p.ry].every(Number.isFinite),p.id);
    assert.ok(p.w>0&&p.rx>0&&p.ry>0&&p.rx*2<=p.w,p.id+' collision stays narrower than silhouette');
    assert.equal(townPropBlocks(p.x,p.y),true,p.id+' root is solid');
    assert.equal(townContains(p.x,p.y),false,p.id+' cannot be walked through');
    assert.equal(unoccupiedFloor(p.x,p.y),false,p.id+' is placed beside the established route');
    assert.ok(p.y<=1940,p.id+' stays on the terrestrial side of the coast');
  }
});

test('mountain and waterfall collisions use ground roots rather than their tall art bounds',()=>{
  assert.equal(townPropBlocks(220,480),true,'volcano foot');
  assert.equal(townPropBlocks(340,480),true,'closed horizontal edge');
  assert.equal(townPropBlocks(341,480),false,'one pixel past root boundary');
  assert.equal(townPropBlocks(340,430),false,'empty corner of the root bounding rectangle');
  assert.equal(townPropBlocks(3230,1700),true,'waterfall pool root');
  assert.equal(townPropBlocks(3300,1700),true,'pool edge');
  assert.equal(townPropBlocks(3301,1700),false,'outside pool footprint');
  assert.equal(townPropBlocks(3420,360),true,'ice ridge foot');
  assert.equal(townPropBlocks(3420,270),false,'visible ridge height does not enlarge ground collision');
});

test('rooted props leave service doors, civic platform, crew and queue anchors accessible',()=>{
  const anchors=[...Object.entries(TOWN_STATION_SITES).map(([k,p])=>[k,p.x,p.y]),
    ...Object.entries(TOWN_CREW).map(([k,p])=>[k,...p]),
    ...Object.entries(TOWN_SPOTS).filter(([,p])=>p.x!=null).map(([k,p])=>[k,p.x,p.y]),
    ...TOWN_QUEUE.map((p,i)=>['queue '+i,...p])];
  for(const [key,x,y]of anchors){
    assert.equal(townPropBlocks(x,y),false,key+' stays outside solid roots');
    assert.equal(townContains(x,y),true,key+' remains on the route');
  }
});
