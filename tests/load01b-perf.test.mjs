import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {townFloorAt,townInPolygon,TOWN_SIZE,TOWN_UPPER_BRIDGE_STAIRS,TOWN_UPPER_BRIDGE_LANDING,TOWN_LAVA_STAIRS,TOWN_LAVA_STAIR_LANDING,TOWN_LAVA_LOWER_ROAD,TOWN_CAULDRON_COURT} from '../src/town-layout.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('LOAD-01b: bounding-box reject in townFloorAt never changes which points are walkable',()=>{
  const polys=[TOWN_UPPER_BRIDGE_STAIRS,TOWN_UPPER_BRIDGE_LANDING,TOWN_LAVA_STAIRS,TOWN_LAVA_STAIR_LANDING,TOWN_LAVA_LOWER_ROAD,TOWN_CAULDRON_COURT];
  const box=pts=>({x1:Math.min(...pts.map(p=>p[0])),x2:Math.max(...pts.map(p=>p[0])),y1:Math.min(...pts.map(p=>p[1])),y2:Math.max(...pts.map(p=>p[1]))});
  let inside=0;
  for(const pts of polys){
    const b=box(pts);
    for(let x=b.x1-30;x<=b.x2+30;x+=7)for(let y=b.y1-30;y<=b.y2+30;y+=7){
      const exact=townInPolygon(x,y,pts),fast=x>=b.x1&&x<=b.x2&&y>=b.y1&&y<=b.y2&&townInPolygon(x,y,pts);
      assert.equal(fast,exact,`${x},${y}`);
      if(exact)inside++;
    }
    for(const [x,y] of pts)assert.equal(townInPolygon(x,y,pts),true,'vertices stay walkable (on the edge)');
  }
  assert.ok(inside>500,'the patches really are exercised');
  // the stair / court landmarks stay walkable through the public function
  for(const [x,y] of [[1280,600],[1270,1050],[1300,1150]])assert.equal(townFloorAt(x,y),true,`${x},${y}`);
  assert.equal(townFloorAt(-1,5),false);assert.equal(townFloorAt(TOWN_SIZE.w,5),false);
});

test('LOAD-01b: terrain chunks and preview are graded in time slices before they count as ready',()=>{
  const terrain=read('src/town-terrain.js'),light=read('src/town-lighting.js');
  assert.match(terrain,/await prepareTownLighting\(ready,\[r\.x,r\.y,r\.w,r\.h\]\);\s*if\(!current\(\)\)return;\s*done\(true,ready\)/);
  assert.match(terrain,/await prepareTownLighting\(ready,\[0,0,TOWN_SIZE\.w,TOWN_SIZE\.h\]\);finish\(null,ready\)/);
  assert.match(light,/export async function prepareTownLighting/);
  assert.match(light,/job\.run\(Infinity\)/,'drawHellTerrain still falls back to a synchronous bake, so nothing can ever be missing');
});

test('LOAD-01b: full-bleed opaque dialogs throttle the hidden map, other dialogs do not',()=>{
  const ui=read('src/ui.js');
  assert.match(ui,/function render\(c, game, now, \.\.\.rest\) \{ if \(mapDrawDue\(now\)\) renderMap\(c, game, now, \.\.\.rest\); \}/);
  assert.match(ui,/w \* h < c\.width \* c\.height \* 0\.95\) return false/,'partial dialogs keep the map drawing every frame');
  assert.match(ui,/Number\(parts\[3\]\) >= 1/,'translucent dialogs keep the map drawing every frame');
});
