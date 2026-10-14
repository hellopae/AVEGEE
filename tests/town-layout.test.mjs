import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWN_SIZE, TOWN_PLAZA, TOWN_STATION_SITES, TOWN_SPOTS, TOWN_CREW,
  TOWN_GUARD_POST,TOWN_CHALLENGE,TOWN_MERCHANT,TOWN_FRONTIER,
  TOWN_QUEUE,TOWN_ENTRY,TOWN_HOUSES,TOWN_STAIRS,townContains } from '../src/town-layout.js';

test('large city has connected avenues, yards and waterfront entrances',()=>{
  assert.ok(TOWN_SIZE.w*TOWN_SIZE.h>1678*937*6,'world has at least six times the old area');
  // Flood the actual floor geometry, avoiding diagonal corner shortcuts.
  const cell=10,cols=Math.ceil(TOWN_SIZE.w/cell),rows=Math.ceil(TOWN_SIZE.h/cell);
  const reachable=new Set(),queue=[TOWN_PLAZA];
  const key=(x,y)=>(y/cell)*cols+x/cell;
  reachable.add(key(...TOWN_PLAZA));
  for(let i=0;i<queue.length;i++) {
    const [x,y]=queue[i];
    for(const [dx,dy] of [[cell,0],[-cell,0],[0,cell],[0,-cell]]) {
      const nx=x+dx,ny=y+dy,k=key(nx,ny);
      if(nx<0||ny<0||nx>=cols*cell||ny>=rows*cell||reachable.has(k)||!townContains(nx,ny))continue;
      reachable.add(k);queue.push([nx,ny]);
    }
  }
  const targets=[
    ...Object.entries(TOWN_STATION_SITES).map(([key,s])=>[key,s.x,s.y]),
    ...Object.entries(TOWN_CREW).map(([key,p])=>[key,...p]),
    ...Object.entries(TOWN_SPOTS).filter(([,p])=>p.x!=null).map(([key,p])=>[key,p.x,p.y]),
    ['merchant',TOWN_MERCHANT.x,TOWN_MERCHANT.y],
    ['frontier',TOWN_FRONTIER.x,TOWN_FRONTIER.y],['guard',...TOWN_GUARD_POST],
    ['challenge',...TOWN_CHALLENGE],
    ...TOWN_QUEUE.map((p,i)=>['queue'+i,...p]),
    ...Object.entries(TOWN_ENTRY).map(([key,p])=>['entry '+key,...p]),
    ['west quay',...TOWN_SPOTS.ferry.from],['east quay',...TOWN_SPOTS.ferry.to],
  ];
  for(const [label,x,y] of targets) {
    assert.equal(townContains(x,y),true,label+' is walkable');
    const gx=Math.round(x/cell)*cell,gy=Math.round(y/cell)*cell;
    assert.ok(reachable.has(key(gx,gy)),label+' connects to plaza');
  }
  for(const {key:label,rect:[x1,y1,x2,y2]} of TOWN_STAIRS)
    assert.equal(townContains((x1+x2)/2,(y1+y2)/2),true,label+' stair connects to city');
});

test('housing, river outside the frontier island and world edges cannot be crossed',()=>{
  for(const [x1,y1,x2,y2] of TOWN_HOUSES)
    assert.equal(townContains((x1+x2)/2,(y1+y2)/2),false,'occupied house is blocked');
  for(const [x,y] of [[900,2400],[2900,2400],[1950,2450],[50,1200],[3800,1200],
    [1920,50],[1920,2520],[NaN,1250],[1920,Infinity]])
    assert.equal(townContains(x,y),false,`${x},${y} is outside city floor`);
  assert.equal(townContains(TOWN_FRONTIER.x,TOWN_FRONTIER.y+30),true,'frontier island extends over river');
});
