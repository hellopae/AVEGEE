import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {setup,walk,art} from './helpers/m2-map.mjs';
import * as L from '../src/town-layout.js?v=k1d';
import {TOWN_OWNER_MASK_META} from '../src/town-owner-walkmask-asia.js';
import {townPropArt,addTownSceneryLayers} from '../src/town-scenery.js?v=k1d';
import {townSkinArt} from '../src/zone-skin.js';
const source=JSON.parse(readFileSync(new URL('./fixtures/z2-asia-trees-source.json',import.meta.url)));
// The real image loader must receive onerror for deliberately absent optional sprites.
const RealImage=globalThis.Image;
globalThis.Image=class extends RealImage {
  set src(src){if(existsSync(new URL('../'+src,import.meta.url)))super.src=src;else this.onerror?.();}
  get src(){return super.src;}
};

test('Z2: owner mask loads as one four-connected component and disables Zone 1 patches',()=>{
  setup('asia');
  assert.equal(L.TOWN_ZONE_LAYOUT.asia.patches,false);
  assert.equal(TOWN_OWNER_MASK_META.source_sha256,'cae690cd67ed29d6105f768e08abaa1077c6a58922bb7f5a9de2bbdc0ade9acf');
  assert.equal(TOWN_OWNER_MASK_META.dilate,0);
  const {data,cols,rows}=L.TOWN_WALK_MASK;
  assert.equal(data.reduce((a,b)=>a+b,0),28770);
  const start=data.findIndex(x=>x),seen=new Set([start]),q=[start];
  for(let h=0;h<q.length;h++){
    const c=q[h],x=c%cols,y=c/cols|0;
    for(const n of [x?c-1:-1,x+1<cols?c+1:-1,y?c-cols:-1,y+1<rows?c+cols:-1])
      if(n>=0&&data[n]&&!seen.has(n)){seen.add(n);q.push(n);}
  }
  assert.equal(seen.size,TOWN_OWNER_MASK_META.walkable_cells);
  assert.equal(L.townFloorAt(1402,466),false,'old upper-bridge patch stays closed under the new mask');
});

test('Z2: exactly 29 owner tree feet, kinds, big scale and solid roots; no inherited trees',()=>{
  setup('asia');
  const trees=L.TOWN_PROP_SITES.filter(p=>p.kind==='tree');
  assert.equal(trees.length,29);assert.equal(source.length,29);
  assert.deepEqual(trees.reduce((m,p)=>(m[p.treeKind]=(m[p.treeKind]||0)+1,m),{}),{green:17,red:9,white:2,teal:1});
  const keys={green:'town-tree-th',red:'town-tree-red-th',white:'town-tree-sakura',teal:'town-tree-willow'};
  for(const [i,p] of trees.entries()){
    assert.deepEqual([p.x,p.y],[source[i].x*3840,source[i].y*2560],p.id);
    assert.equal(p.treeKind,source[i].kind);assert.equal(p.key,keys[source[i].kind]);
    assert.equal(p.w,160*(source[i].big?1.4:1));assert.equal(p.on_walk,source[i].on_walk);
    assert.deepEqual([p.rx,p.ry],[16,11]);assert.equal(walk.canWalk(p.x,p.y),false,p.id);
  }
  const depths=[];
  addTownSceneryLayers((depth)=>depths.push(depth),{},null,null,null,{},0,null,true,()=>null);
  assert.deepEqual(depths,L.TOWN_PROP_SITES.map(p=>p.y),'every tree uses its actual foot in the shared depth queue');
});

test('Z2: missing sakura/willow files fall back through the actual image loader; ready primary wins',()=>{
  setup('asia');art.bindZone(()=> 'asia');
  for(const kind of ['white','teal']){
    const p=L.TOWN_PROP_SITES.find(p=>p.treeKind===kind);
    const primary=townSkinArt('asia',p.key),fallback=townSkinArt('asia',p.fallbackKey);
    assert.ok(existsSync(new URL('../'+fallback,import.meta.url)));
    const image=townPropArt(p,null,null,art.img);
    assert.equal(image.src,existsSync(new URL('../'+primary,import.meta.url))?primary:fallback);
    const ready={src:primary,naturalWidth:100,naturalHeight:100};
    assert.equal(townPropArt(p,null,null,key=>key===p.key?ready:null),ready);
  }
});

test('Z2: buildings, all 11 house placements (four types), lamps and torches retain Zone 1 coordinates and restore',()=>{
  setup('th');
  const snap=()=>structuredClone([L.TOWN_STATION_SITES,L.TOWN_DAIS,L.TOWN_HOUSE_SITES,L.TOWN_PROP_SITES.filter(p=>['lamp','torch'].includes(p.kind))]);
  const baseline=snap();
  setup('asia');assert.deepEqual(snap(),baseline);assert.equal(L.townPathCell(),8);
  setup('th');assert.deepEqual(snap(),baseline);assert.equal(L.townPathCell(),16);
});

test('Z2: actual 8-unit routes reach spawn, exits, NPCs and station/sign anchors with every building built',()=>{
  const {spawn}=setup('asia');
  assert.deepEqual(walk.walkGridSize(),{cols:480,rows:320});
  const anchors=[['spawn',spawn],...Object.entries(L.TOWN_ENTRY),...Object.entries(L.TOWN_CREW),
    ['harbour',L.TOWN_SPOTS.ferry.from],['frontier',L.TOWN_ENTRY.gate],['guard',L.TOWN_GUARD_POST],
    ['challenge',L.TOWN_CHALLENGE],['merchant',[L.TOWN_MERCHANT.x,L.TOWN_MERCHANT.y]],
    ...Object.entries(L.TOWN_STATION_SITES).map(([k,p])=>['station/sign:'+k,[p.x,p.y]])];
  for(const [key,target] of anchors){
    assert.equal(L.townFloorAt(...target),true,key+' floor');assert.equal(walk.canWalk(...target),true,key+' collision');
    const path=walk.findPath(...spawn,...target);
    assert.deepEqual(path?.at(-1),target,key+' exact arrival (nearest reachable fallback is insufficient)');
    let from=spawn;
    for(const to of path){
      const n=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1]));
      for(let i=1;i<=n;i++)assert.equal(walk.canWalk(from[0]+(to[0]-from[0])*i/n,from[1]+(to[1]-from[1])*i/n),true,key+' continuous path');
      from=to;
    }
  }
});

test('Z2: on-walk tree roots force a real detour without crossing the trunk',()=>{
  setup('asia');
  const p=L.TOWN_PROP_SITES.find(p=>p.id==='asia-tree-2');
  const from=[p.x-25,p.y],to=[p.x+25,p.y];
  assert.equal(walk.canWalk(...from),true);assert.equal(walk.canWalk(...to),true);
  assert.equal(walk.clearLine(from,to),false);
  const path=walk.findPath(...from,...to);assert.ok(path.length>1);assert.deepEqual(path.at(-1),to);
  let a=from;
  for(const b of path){const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));for(let i=1;i<=n;i++)assert.equal(walk.canWalk(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n),true);a=b;}
});
