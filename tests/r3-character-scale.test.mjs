import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_SCALE,characterScale,routeCharacterScale,fitAllySizes} from '../src/character-scale.js';
import {planBattleFormation} from '../src/battle-formation.js';
import {frontierActorHeight} from '../src/frontier-view-metrics.js';
import {DUNGEON_ROUTES} from '../src/zone-travel.js';
import {ROUTE_FOREGROUND,drawRouteForeground} from '../src/route-occlusion.js';
import {fitBattleSprites} from '../src/battle-scale.js';

test('R3 all regional crew identities share the child/adult/guard hierarchy',()=>{
  assert.ok(Object.isFrozen(CHARACTER_SCALE));
  for(const zone of ['th','asia','west','cyberhell'])for(const k of ['nira','taan','kan','boon','dam','plerng','worker']){
    assert.ok(characterScale('yama')<characterScale(`${zone}:${k}`));
    assert.ok(characterScale(`${zone}:${k}`)<characterScale(`${zone}:guard`));
    assert.equal(characterScale(`crew-${k}`),characterScale(`${zone}:${k}`));
  }
});
test('R3 every route scales friends and enemies equally, independently of the camera',()=>{
  for(const r of DUNGEON_ROUTES){
    assert.ok(routeCharacterScale(r.id)>=.75&&routeCharacterScale(r.id)<=.85);
    for(const zoom of [.42,1,1.7]){
      assert.ok(frontierActorHeight('yama',zoom,r.id)<frontierActorHeight('nira',zoom,r.id));
      assert.ok(frontierActorHeight('guard',zoom,r.id)>frontierActorHeight('adult',zoom,r.id));
      assert.equal(frontierActorHeight('enemy',zoom,r.id),78*.8*.75*routeCharacterScale(r.id)*zoom);
    }
  }
});
test('R3 real alpha/aspect variation cannot invert arena order; original slot feet are retained',()=>{
  for(const [width,height] of [[1440,900],[390,844]])for(const keys of [
    ['guard','boon','kan','yama'],['nira','guard','taan','yama'],
    ['th:taan','asia:taan','west:kan','cyberhell:boon','nira','dam','guard','yama'],
  ]){
    const actors=keys.map((key,i)=>({key,box:{l:.1,t:.04,w:.45+i*.035,h:.72+i*.025},aspect:1}));
    const slots=planBattleFormation(keys.length,width,height),saved=structuredClone(slots);
    const sizes=fitAllySizes(height*.24,actors,slots,{width,height});
    assert.deepEqual(slots,saved);
    const visible=sizes.map((s,i)=>actors[i].box.h*s.h),yama=visible.at(-1),guard=visible[keys.indexOf('guard')];
    visible.slice(0,-1).forEach((h,i)=>{assert.ok(h>yama);if(keys[i]!=='guard')assert.ok(h<guard);});
    for(let i=0;i<sizes.length;i++){
      assert.ok(slots[i].y-visible[i]>=height*.08-1e-8);
      assert.ok(slots[i].x+actors[i].box.w*sizes[i].w<=width-4+1e-8);
      const top=slots[i].y-(actors[i].box.t+actors[i].box.h)*sizes[i].h;
      assert.ok(Math.abs(top+(actors[i].box.t+actors[i].box.h)*sizes[i].h-slots[i].y)<1e-8);
      assert.ok(visible[i]<=height*.24*slots[i].scale*.96+1e-8,'no actor exceeds the old companion envelope');
    }
  }
});
test('R3 production fitter remains stable on repeat and moves selection roots with unchanged slot feet',async()=>{
  const oldDoc=globalThis.document,oldStyle=globalThis.getComputedStyle;
  const pixels=new Uint8ClampedArray(10*10*4).fill(255);
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})};
  globalThis.getComputedStyle=()=>({objectPosition:'50% 50%',transform:'none'});
  const style=()=>({setProperty(k,v){this[k]=v;}});
  const make=(key)=>{
    const root={dataset:{crewPick:key},style:style(),classList:{contains:()=>false,add(){},toggle(){}}};
    const image={src:`r3-${key}`,naturalWidth:10,naturalHeight:10,complete:true,style:style(),classList:{contains:()=>true},
      closest:()=>root,getAttribute:()=>`r3-${key}`,getBoundingClientRect:()=>({left:parseFloat(root.style.left)||200,top:parseFloat(root.style.top)||100,width:parseFloat(image.style.width)||100,height:parseFloat(image.style.height)||100})};
    return {root,image};
  };
  const actors=['guard','kan','boon','yama'].map(make),hero=actors.at(-1).image;
  const squad={style:style(),querySelectorAll:()=>actors.slice(0,-1).map(a=>a.image)};
  const stage={isConnected:true,dataset:{},classList:{contains:k=>k==='combat-arena'},getBoundingClientRect:()=>({left:0,top:0,width:1440,height:900}),querySelector:s=>s.includes('.fig.you')?hero:s==='.battle-squad'?squad:null,querySelectorAll:()=>[]};
  try{
    assert.equal(await fitBattleSprites(stage),true);
    const first=actors.map(a=>({width:a.image.style.width,height:a.image.style.height,left:a.root.style.left,top:a.root.style.top}));
    assert.equal(await fitBattleSprites(stage),true);
    assert.deepEqual(actors.map(a=>({width:a.image.style.width,height:a.image.style.height,left:a.root.style.left,top:a.root.style.top})),first);
    const slots=planBattleFormation(4,1440,900);
    actors.forEach((a,i)=>assert.ok(Math.abs(parseFloat(a.root.style.top)+parseFloat(a.root.style.height)-slots[i].y)<1e-8));
    assert.ok(parseFloat(actors[0].image.style.height)>parseFloat(actors[1].image.style.height));
    assert.ok(parseFloat(actors[1].image.style.height)>parseFloat(hero.style.height));
  }finally{globalThis.document=oldDoc;globalThis.getComputedStyle=oldStyle;}
});
test('R3 foreground reuses background pixels under a camera-transformed clip, sorted by ground foot',()=>{
  const calls=[],ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args])});
  const item=ROUTE_FOREGROUND['west:cyberhell'][0],image={complete:true,naturalWidth:1672,naturalHeight:941};
  drawRouteForeground(ctx,image,item,{x:-100,y:-200,w:3344,h:1882});
  assert.deepEqual(calls[2],['moveTo',-100+730*2,-200+759*2]);
  assert.ok(calls.findIndex(c=>c[0]==='clip')<calls.findIndex(c=>c[0]==='drawImage'));
  // only the polygon's bounding box is repainted, at the same scale as the full map would be
  const [,img,sx,sy,sw,sh,dx,dy,dw,dh]=calls.find(c=>c[0]==='drawImage');
  assert.equal(img,image);assert.ok(sw<1672*.2&&sh<941*.2);
  assert.ok(Math.abs(dw/sw-3344/1672)<1e-9&&Math.abs(dh/sh-1882/941)<1e-9);
  assert.ok(Math.abs(dx-(-100+sx*2))<1e-9&&Math.abs(dy-(-200+sy*2))<1e-9);
  const order=[{kind:'actor',foot:item.depth-.01},{kind:'foreground',foot:item.depth},{kind:'actor',foot:item.depth+.01}].sort((a,b)=>a.foot-b.foot);
  assert.equal(order[1].kind,'foreground');
});
test('Q6 occlusion data: every th:asia piece is a closed polygon inside the map, with its baseline at the foot of the polygon',async()=>{
  const {default:map}=await import('../src/route-occlusion-data/th-asia.js');
  const [W,H]=map.size;assert.deepEqual([W,H],[3344,1882]);assert.ok(map.pieces.length>=2);
  const ids=new Set();
  for(const p of map.pieces){
    assert.ok(!ids.has(p.id));ids.add(p.id);assert.ok(p.polygon.length>=8);
    for(const [x,y] of p.polygon)assert.ok(x>=0&&x<=W&&y>=0&&y<=H);
    assert.ok(Math.abs(Math.max(...p.polygon.map(q=>q[1]))-p.baseline)<=2);
  }
  assert.deepEqual(ROUTE_FOREGROUND['th:asia'].map(p=>p.id),map.pieces.map(p=>p.id));
  for(const p of ROUTE_FOREGROUND['th:asia'])assert.ok(p.depth>0&&p.depth<1&&Object.isFrozen(p.polygon));
});
