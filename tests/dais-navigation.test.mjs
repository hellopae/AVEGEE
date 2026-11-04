import './_legacy-zone1.mjs';   // Zone 1 on the old painting (layered map = tests/town-v6-zone1.test.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {syncSceneZone} from '../src/data.js';
import {TOWN_DAIS,TOWN_CREW,TOWN_ENTRY,TOWN_SPOTS,townContains,townFloorAt} from '../src/town-layout.js?v=k1d';
import {DAIS_GEOMETRY,daisWorldPoint,daisBlocks} from '../src/town-dais-geometry.js';
import {canWalk,findPath,clearLine,resetWalk,setBlocks} from '../src/walk.js?v=k1d';
globalThis.Image ??= class {};
for(const zone of Object.keys(DAIS_GEOMETRY))test(`${zone}: rails and throne block all foot approaches; Nira remains reachable through front stairs`,()=>{
 createGame();syncSceneZone(zone);resetWalk();setBlocks([],[]);
 const shape=DAIS_GEOMETRY[zone],world=p=>daisWorldPoint(p,TOWN_DAIS);
 for(let i=1;i<shape.rail.length;i++){
  const a=shape.rail[i-1],b=shape.rail[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],p=world(mid);
  assert.equal(townFloorAt(...p),false,`rail segment ${i} blocks even floor overrides`);
  assert.equal(canWalk(...p),false);
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=[-(b[1]-a[1])/len*60,(b[0]-a[0])/len*60];
  assert.equal(clearLine(world([mid[0]-n[0],mid[1]-n[1]]),world([mid[0]+n[0],mid[1]+n[1]])),false,`cannot cut across rail ${i}`);
 }
 for(const [x1,y1,x2,y2]of shape.solids){const p=world([(x1+x2)/2,(y1+y2)/2]);assert.equal(canWalk(...p),false,'chair/column base is solid');}
 for(const point of [TOWN_CREW.nira,TOWN_ENTRY.niraGoal,[TOWN_SPOTS.throne.x,TOWN_SPOTS.throne.y]])assert.equal(townContains(...point),true,'working and interaction anchors stay on floor');
 const from=[TOWN_DAIS.x,TOWN_DAIS.y+40],to=TOWN_CREW.nira,path=findPath(...from,...to);
 assert.ok(path?.length,'route onto platform exists');assert.deepEqual(path.at(-1),to);
 let last=from;
 for(const next of path){assert.ok(clearLine(last,next),'no smoothed shortcut through a fence');last=next;}
 assert.ok(path.some(p=>p[1]<TOWN_DAIS.y-50),'route enters platform');
 syncSceneZone('th');resetWalk();
});
test('Cyber platform matches other town widths and geometry scales around its fixed foot',()=>{
 createGame();syncSceneZone('th');const width=TOWN_DAIS.w;
 syncSceneZone('cyberhell');assert.equal(TOWN_DAIS.w,width);assert.deepEqual([TOWN_DAIS.x,TOWN_DAIS.y],[1855,1062.5]);
 const point=daisWorldPoint([768,350],TOWN_DAIS);assert.equal(daisBlocks(...point,'cyberhell',TOWN_DAIS),true,'throne footprint');
 syncSceneZone('th');resetWalk();
});
