import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {setup,walk} from './helpers/m2-map.mjs';
import * as L from '../src/town-layout.js?v=k1d';
import {townPropArtKey} from '../src/town-scenery.js?v=k1d';
import {WEST_TREE_POINTS} from '../src/town-west-trees.js';
import {TOWN_OWNER_MASK_META} from '../src/town-owner-walkmask-west.js';
import {ZONE_SKIN,PLANNED_ART,isTownZone} from '../src/zone-skin.js';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';
import {createGame} from '../src/game.js';
import {harbourTravel} from './helpers/travel.mjs';

test('Z3: production west skin has all16 sprites/preloads and20 chunks; pending borders stay closed',()=>{
 assert.equal(isTownZone('west'),true);assert.equal(ZONE_SKIN.cyberhell.enabled,false);
 const skin=ZONE_SKIN.west,catalog=JSON.parse(readFileSync('img/preload-catalog.json'));
 assert.equal(skin.flowUrl,null);assert.equal(skin.terrain.repairs,false);assert.equal(skin.treeTint,false);
 const files=[...Object.values(skin.art),...Object.values(skin.stations.facade)];assert.equal(files.length,16);
 for(const f of files){assert.ok(existsSync(f),f);assert.ok(catalog.zones.west.includes(f),f+' preload');}
 for(let r=1;r<=4;r++)for(let c=1;c<=5;c++)assert.ok(existsSync(`img/map-zone3/v1/r${r}-c${c}.webp`));
 for(const k of ['asia:west','west:cyberhell'])assert.equal(ROUTE_GEOMETRY[k].enabled,false,k);
});

test('Z3: owner grid preserves28586 cells, one component, small blocked reserves and no dilation',()=>{
 setup('west');assert.equal(L.townPathCell(),8);assert.deepEqual(walk.walkGridSize(),{cols:480,rows:320});
 assert.equal(TOWN_OWNER_MASK_META.dilate,0);assert.equal(TOWN_OWNER_MASK_META.walkable_cells,28586);
 assert.equal(L.TOWN_ZONE_LAYOUT.west.patches,false);
 const {data,cols,rows}=L.TOWN_WALK_MASK;assert.equal(data.reduce((a,b)=>a+b,0),28586);
 const start=data.findIndex(x=>x),seen=new Set([start]),q=[start];
 for(let h=0;h<q.length;h++){const c=q[h],x=c%cols,y=c/cols|0;for(const n of [x?c-1:-1,x+1<cols?c+1:-1,y?c-cols:-1,y+1<rows?c+cols:-1])if(n>=0&&data[n]&&!seen.has(n)){seen.add(n);q.push(n);}}
 assert.equal(seen.size,28586);
 const points=JSON.parse(readFileSync(new URL('./fixtures/z3-owner-floor-points.json',import.meta.url)));
 for(const p of points){const [x,y]=p.preview_xy.map(v=>v*2.5);assert.equal(data[(y/8|0)*cols+(x/8|0)]===1,p.expected_walkable,p.point);}
});

test('Z3: all28 owner trunk feet are unchanged, with real solid roots and suitable west sprites',()=>{
 setup('west');const trees=L.TOWN_PROP_SITES.filter(p=>p.kind==='tree');assert.equal(trees.length,28);
 assert.deepEqual(WEST_TREE_POINTS.reduce((a,p)=>(a[p.kind]=(a[p.kind]||0)+1,a),{}),{green:14,cyan:9,white:5});
 for(const [i,p]of trees.entries()){
  const owner=WEST_TREE_POINTS[i];assert.deepEqual([p.x,p.y],[owner.x*3840,owner.y*2560]);
  assert.equal(owner.moved,false);assert.equal(p.ownerFoot,true);assert.equal(walk.canWalk(p.x,p.y),false);
  assert.equal(townPropArtKey(p),p.key,'renderer must preserve the selected species');assert.ok(existsSync(ZONE_SKIN.west.art[p.key]));
  if(owner.kind==='cyan')assert.equal(p.species,'blackthorn');if(owner.kind==='white')assert.equal(p.species,'silver-fir');
 }
});

function continuous(spawn,path,key){assert.ok(path?.length,key);let from=spawn;for(const to of path){const n=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1]));for(let i=1;i<=n;i++)assert.equal(walk.canWalk(from[0]+(to[0]-from[0])*i/n,from[1]+(to[1]-from[1])*i/n),true,key);from=to;}}
test('Z3: actual paths reach all10 built station doors, entry, harbour and civic anchors',()=>{
 const {spawn}=setup('west');const targets=[...Object.entries(L.TOWN_ENTRY),['harbour',L.TOWN_SPOTS.ferry.from],['guard',L.TOWN_GUARD_POST],['challenge',L.TOWN_CHALLENGE],['merchant',[L.TOWN_MERCHANT.x,L.TOWN_MERCHANT.y]],...Object.entries(L.TOWN_STATION_SITES).map(([k,p])=>[k,[p.x,p.y]])];
 for(const [key,to]of targets){const path=walk.findPath(...spawn,...to);assert.deepEqual(path?.at(-1),to,key+' exact arrival');continuous(spawn,path,key);}
 for(const [key,to]of Object.entries(L.TOWN_CREW)){const path=walk.findPath(...spawn,...to);continuous(spawn,path,key);const end=path.at(-1);assert.deepEqual(end,to,key+' exact NPC home');}
});

test('Z3: NPC avoidance takes a valid detour on the entry plaza',()=>{
 setup('west');const from=[1850,2170],to=[1990,2170];walk.setNpcDiscs([[1920,2170]]);
 const path=walk.findPath(...from,...to,true);assert.deepEqual(path?.at(-1),to);continuous(from,path,'NPC detour');let a=from;
 for(const b of path){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=1;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,y=a[1]+(b[1]-a[1])*i/n;assert.equal(walk.inNpcDisc(x,y),false);}a=b;}
 walk.setNpcDiscs([]);
});

test('Z3: leaving west restores Zone1/Asia geometry and original house/lamp/torch feet',()=>{
 const snap=()=>JSON.stringify([L.TOWN_STATION_SITES,L.TOWN_DAIS,L.TOWN_HOUSE_SITES,L.TOWN_PROP_SITES]);setup('th');const th=snap();const buildings=JSON.stringify([L.TOWN_STATION_SITES,L.TOWN_HOUSE_SITES,L.TOWN_PROP_SITES.filter(p=>['lamp','torch'].includes(p.kind))]);
 setup('asia');const asia=snap();setup('west');assert.equal(JSON.stringify([L.TOWN_STATION_SITES,L.TOWN_HOUSE_SITES,L.TOWN_PROP_SITES.filter(p=>['lamp','torch'].includes(p.kind))]),buildings);
 setup('th');assert.equal(L.TOWN_CREW.boon[1],470);assert.equal(snap(),th);assert.equal(L.townPathCell(),16);setup('asia');assert.equal(snap(),asia);setup('th');
});

test('Z3: old western saves migrate exactly once and keep rewards/progress',()=>{
 const g=createGame();g.bossCleared.asia=true;assert.equal(harbourTravel(g,'west'),true);g.coin=777;g.player.x=1200;g.player.y=600;
 const save=JSON.parse(JSON.stringify(g.snapshot()));delete save.townSkinMigrated;const restored=createGame();assert.equal(restored.restore(save),true);
 assert.equal(restored.zone,'west');assert.equal(restored.coin,777);assert.equal(restored.townSkinMigrated.west,true);assert.notDeepEqual([restored.player.x,restored.player.y],[1200,600]);assert.equal(L.townContains(restored.player.x,restored.player.y),true);
 const again=createGame();assert.equal(again.restore(JSON.parse(JSON.stringify(restored.snapshot()))),true);assert.deepEqual([again.player.x,again.player.y],[restored.player.x,restored.player.y]);setup('th');
});
