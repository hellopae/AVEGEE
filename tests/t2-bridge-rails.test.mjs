import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,walk,syncSceneZone} from './helpers/m2-map.mjs';
import {BRIDGE_RAILS,onBridgeRail,bridgeSurface} from '../src/town-bridge-rails.js';

// F13 (owner 15 Nov, b1.png): the fences / parapets of every bridge were walkable.  Each bridge is a narrow corridor now.
const distToPath=(x,y,path)=>Math.min(...path.slice(1).map((b,i)=>{const a=path[i],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l)):0;return Math.hypot(a[0]+t*dx-x,a[1]+t*dy-y);}));
const zones=Object.keys(BRIDGE_RAILS);

test('F13: bridges are measured in every fenced zone (zone 1: the ice arch; zones 2-4: the five span bridges of each)',()=>{
  assert.deepEqual(zones,['th','asia','west','cyberhell']);
  assert.equal(BRIDGE_RAILS.th.length,1);assert.equal(BRIDGE_RAILS.asia.length,5);assert.equal(BRIDGE_RAILS.west.length,2);assert.equal(BRIDGE_RAILS.cyberhell.length,5);
  for(const z of zones)for(const b of BRIDGE_RAILS[z]){
    assert.ok(b.hw>=7&&b.hw<=10,'deck stays comfortably walkable but not the rails');
    assert.ok(b.path.length>=5);
    assert.ok(b.rect[0]<b.rect[2]&&b.rect[1]<b.rect[3]);
  }
});

test('F13: the rail rule only removes floor and ignores points outside every bridge rect',()=>{
  assert.equal(onBridgeRail('th',100,100),false);
  assert.equal(onBridgeRail('nowhere',3000,410),false);
  const b=BRIDGE_RAILS.th[0];
  assert.equal(onBridgeRail('th',3000,407),false,'deck centre');
  assert.equal(bridgeSurface('th',3000,407),1);assert.equal(bridgeSurface('th',100,100),-1);
  assert.equal(onBridgeRail('th',3000,407-b.hw-3),true,'back edge / rail');
  assert.equal(onBridgeRail('th',3000,407+b.hw+3),true,'front rail / beam');
  assert.equal(onBridgeRail('th',b.rect[0]-5,430),false,'the landing beside the bridge is untouched');
});

for(const zone of zones)test(`F13 ${zone}: every bridge can be crossed end to end (click-to-walk path + 1px stepping), the rails and beam are not floor`,async t=>{
  const {terrainContains}=setup(zone);
  for(const [i,b] of BRIDGE_RAILS[zone].entries())await t.test(`${zone} bridge ${i}`,()=>{
    const mid=b.path.filter(q=>q[0]>=b.rect[0]+2&&q[0]<=b.rect[2]-2);
    const start=mid[0],end=mid.at(-1);
    assert.ok(terrainContains(...start)&&terrainContains(...end),'both ends of the deck are floor');
    const path=walk.findPath(...start,...end);
    assert.ok(path?.length,'a path exists across the bridge');
    assert.deepEqual(path.at(-1),end,'path reaches the far end exactly, not the nearest endpoint');
    // follow it the way the game does
    const p={x:start[0],y:start[1]};let queue=[...path],steps=0;
    while(queue.length&&steps++<6000){
      const [x,y]=queue[0],d=Math.hypot(x-p.x,y-p.y);
      if(d<3){queue.shift();continue;}
      assert.ok(walk.stepTo(p,(x-p.x)/d,(y-p.y)/d,true)||(queue=walk.findPath(p.x,p.y,...end,true))?.length,'stepping gets stuck at '+p.x+','+p.y);
      assert.ok(distToPath(p.x,p.y,b.path)<=b.hw+1,'stays on the deck strip');
    }
    assert.ok(Math.hypot(p.x-end[0],p.y-end[1])<4,'arrives');
    // the rails: ride the whole span along both sides, none of it may be floor
    for(let k=1;k<b.path.length-1;k++){
      const [x,y]=b.path[k];
      if(x<b.rect[0]||x>b.rect[2])continue;
      for(const dy of [-(b.hw+4),b.hw+4,-(b.hw+14),b.hw+14])assert.equal(terrainContains(x,y+dy),false,`${zone} bridge ${i}: rail/air at ${x},${y+dy} is not floor`);
    }
  });
  syncSceneZone('th');
});
