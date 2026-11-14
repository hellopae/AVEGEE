import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {z3FogDensity,Z3_FOG_GRID,Z3_FOG_COLS,Z3_FOG_ROWS} from '../src/z3-fog-density.js';
import {fogBanks,addZ3FogLayers,FOG_FX} from '../src/zone3-fog.js';
import {rainDrops,rainSplashes,MAP_FX,drawMapAmbientOver,drawMapAmbientSky,drawBiomeWeather} from '../src/map-ambient.js';
import {z4Layout,z4Electric,z4ElectricBudget,drawWire,addZ4PoleLayers} from '../src/z4-poles.js';

const gradient={addColorStop(){}};
const stub=()=>new Proxy({createRadialGradient:()=>gradient},{get:(t,k)=>k in t?t[k]:()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:stub})};
function mockCtx(a=1){
 const calls=[],ctx=new Proxy({canvas:{width:3840*a,height:2560*a},getTransform:()=>({a,b:0,c:0,d:a,e:0,f:0}),
  createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},
  {get:(t,k)=>k in t?t[k]:(...x)=>{calls.push([k,...x]);},set:(t,k,v)=>{calls.push(['set',k,v]);t[k]=v;return true;}});
 return {ctx,calls};
}

test('Z3-FOG: density map is thick over the frozen water and falls, thin on the plazas',()=>{
 assert.equal(Z3_FOG_GRID.length,Z3_FOG_ROWS);for(const r of Z3_FOG_GRID)assert.equal(r.length,Z3_FOG_COLS);
 for(let u=0;u<=1;u+=.037)for(let v=0;v<=1;v+=.041){const d=z3FogDensity(u,v);assert.ok(d>=0&&d<=1);}
 // the wide river across the south of the map (preview y ~ .70) against the central plaza (preview ~ (.49,.40))
 assert.ok(z3FogDensity(.3,.70)>.6,'river is foggy');assert.ok(z3FogDensity(.49,.40)<.3,'plaza is clear');
 assert.ok(z3FogDensity(.3,.70)>2*z3FogDensity(.49,.40));
});

test('Z3-FOG: banks are puffs of the visible area, sorted back to front, thick only where the map is thick, drifting slowly',()=>{
 const {ctx}=mockCtx(),view={x:600,y:400,w:1792,h:958,u:1};
 const dens=(x,y)=>z3FogDensity(x/3840,y/2560);
 const a=fogBanks(ctx,view,1000,{densityAt:dens});
 assert.ok(a.length>=2&&a.length<=14,'a handful of banks, not a sheet: '+a.length);
 for(let i=1;i<a.length;i++)assert.ok(a[i].depth>=a[i-1].depth,'back to front');
 for(const b of a){assert.ok(b.dens>=FOG_FX.minDensity);assert.ok(b.ph<b.pw,'banks are wider than tall');assert.ok(b.pw<Math.sqrt(view.w*view.h)*FOG_FX.fit*FOG_FX.spread[1]*1.2);}
 const b=fogBanks(ctx,view,9000,{densityAt:dens});   // 8 s later the same lattice has moved sideways
 assert.notDeepEqual(a.map(x=>Math.round(x.cx)),b.map(x=>Math.round(x.cx)));
 const none=fogBanks(mockCtx().ctx,view,1000,{densityAt:()=>0});assert.equal(none.length,0,'no density, no fog');
});

test('Z3-FOG: banks join the depth-sorted actor list (so they veil only what stands behind them); none under reduced / paused',()=>{
 const {ctx,calls}=mockCtx(),layers=[],at=(y,fn)=>layers.push({y,fn});
 const n=addZ3FogLayers(at,ctx,{x:0,y:0,w:3840,h:2560,u:1},3000);
 assert.equal(layers.length,n);assert.ok(n>0);
 for(const l of layers){assert.ok(l.y>-1500&&l.y<4500);l.fn();}
 assert.ok(calls.some(c=>c[0]==='drawImage'),'banks are drawn when their layer runs');
 assert.equal(addZ3FogLayers(at,ctx,null,3000),0);
 const scene=readFileSync('src/scene.js','utf8'),i=scene.indexOf('addZ3FogLayers(at,'),sort=scene.indexOf('layer.sort(');
 assert.ok(i>0&&i<sort,'registered before the layer list is sorted');
 assert.match(scene,/g\.zone==='west'&&weatherEnabled\(\)&&!reduced&&!g\.paused\)addZ3FogLayers/);
});

test('Z3-FOG: the town draws only snow in the sky pass, the frontier / dialog scenes still draw fog with it; no tint or filter on the art',()=>{
 const t=mockCtx(.5);drawMapAmbientSky(t.ctx,'west',5000,3840,2560,false,true);
 assert.ok(!t.calls.some(c=>c[0]==='drawImage'),'town sky pass: no fog sprites (they are depth sorted)');
 const f=mockCtx(.5);drawMapAmbientSky(f.ctx,'west',5000,3840,2560,false,false);
 assert.ok(f.calls.some(c=>c[0]==='drawImage'),'frontier / scene: fog banks drawn with the snow');
 for(const src of ['src/zone3-fog.js','src/z3-fog-density.js'])assert.ok(!/\.filter\s*=|getImageData|globalCompositeOperation\s*=\s*['"](multiply|overlay|color)/.test(readFileSync(src,'utf8')),'never filters the ground');
});

test('Z4-RAIN: three distance layers, every drop its own length / speed / slant, a gusting wind, bounded and deterministic',()=>{
 const W=1440,H=900,a=rainDrops(5000,W,H,600);
 assert.deepEqual(a,rainDrops(5000,W,H,600));
 for(const d of a){assert.ok(d.x>=0&&d.x<W&&d.y>=0&&d.y<H);assert.ok([0,1,2].includes(d.layer));}
 const by=[0,1,2].map(l=>a.filter(d=>d.layer===l));for(const g of by)assert.ok(g.length>=60,'every layer is populated');
 const mean=g=>g.reduce((s,d)=>s+d.len,0)/g.length;
 assert.ok(mean(by[0])<mean(by[1])&&mean(by[1])<mean(by[2]),'near drops are longer');
 const sp=g=>g.reduce((s,d)=>s+d.speed,0)/g.length;assert.ok(sp(by[0])<sp(by[2]),'near drops are faster');
 const slants=new Set(a.map(d=>d.dx.toFixed(3)));assert.ok(slants.size>=150,'not parallel: '+slants.size+' distinct slants');
 const lens=new Set(a.map(d=>d.len.toFixed(1)));assert.ok(lens.size>=60,'distinct lengths: '+lens.size);
 const meanLean=t=>{const l=rainDrops(t,W,H,300);return l.reduce((s,d)=>s+d.dx,0)/l.length;};
 const leans=[0,2000,4000,6000,8000,10000,12000,14000].map(meanLean);assert.ok(Math.max(...leans)-Math.min(...leans)>.04,'the wind changes the lean over time');
 const b=rainDrops(5100,W,H,600);let moved=0;for(let i=0;i<a.length;i++)if(Math.abs(b[i].y-a[i].y)>1)moved++;assert.ok(moved>500,'drops fall');
 for(const l of MAP_FX.rain.layers){assert.ok(l.alpha[1]<=.8&&l.width<=2);}
});

test('Z4-RAIN: splashes are small, short lived and bounded',()=>{
 const S=MAP_FX.rain.splash,n=200;
 for(let t=0;t<6000;t+=137){const s=rainSplashes(t,1440,900,n);assert.ok(s.length>0&&s.length<n);for(const p of s){assert.ok(p.age>=0&&p.age<1&&p.x>=0&&p.x<1440&&p.y>=0&&p.y<900);}}
 assert.ok(S.life<=1&&S.alpha<=.6);
});

test('Z4-RAIN: the town draws no rain in the sky pass, the rain pass runs after the actors, other zones are untouched',()=>{
 const sky=mockCtx(.5);drawMapAmbientSky(sky.ctx,'cyberhell',5000,3840,2560,false,true);
 assert.ok(!sky.calls.some(c=>c[0]==='stroke'),'town sky pass: no rain');
 const over=mockCtx(.5);drawMapAmbientOver(over.ctx,'cyberhell',5000,3840,2560,false);
 const strokes=over.calls.filter(c=>c[0]==='stroke').length;assert.ok(strokes>=3&&strokes<=5,'rain: one stroke per distance layer plus the splashes (each full-screen stroke is a raster pass): '+strokes);
 const none=mockCtx(.5);drawMapAmbientOver(none.ctx,'west',5000,3840,2560,false);drawMapAmbientOver(none.ctx,'th',5000,3840,2560,false);
 assert.equal(none.calls.length,0,'only zone 4 has an over pass');
 const quiet=mockCtx(.5);drawMapAmbientOver(quiet.ctx,'cyberhell',5000,3840,2560,true);assert.equal(quiet.calls.length,0,'reduced motion / paused: no rain');
 const dialog=mockCtx(.5);drawBiomeWeather(dialog.ctx,'cyberhell',5000,3840,2560,false);assert.ok(dialog.calls.some(c=>c[0]==='stroke'),'dialog scenes keep rain in one pass');
 const scene=readFileSync('src/scene.js','utf8'),at=scene.indexOf("drawMapAmbientOver(ctx,g.zone"),sort=scene.indexOf('layer.sort('),weather=scene.indexOf('  drawMapWeather(ctx,{zone:g.zone');
 assert.ok(sort>0&&at>sort&&at<weather,'rain after the sorted sprites, before the cloud shadows');
});

test('Z4-WIRES: every span sags, the cable is a slim line in device pixels at every zoom, with a highlight; tip sparks are budgeted',()=>{
 const {wires}=z4Layout();
 for(const w of wires){const sag=(w.cy-(w.y0+w.y1)/2)/2/w.chord;assert.ok(sag>=.045&&sag<=.14,`wire ${w.i} sag ${sag.toFixed(3)}`);}
 for(const zoom of [.4,1,2]){
  const {ctx,calls}=mockCtx(zoom);drawWire(ctx,wires[5],false,1,1000);
  const widths=calls.filter(c=>c[0]==='set'&&c[1]==='lineWidth').map(c=>c[2]*zoom);   // device px
  assert.ok(widths.length>=3&&Math.max(...widths)<=3.5,`widest stroke ${Math.max(...widths)} device px at zoom ${zoom}`);
  assert.ok(Math.min(...widths)<=.7,'1-device-pixel-class highlight');
 }
 const all=[...Array(80).keys()];
 for(const vp of [{width:390,height:844,dpr:3},{width:1440,height:900,dpr:1}]){
  const b=z4ElectricBudget(vp);let max=0,seen=0;
  for(let t=0;t<20000;t+=40){const r=z4Electric(t,{viewport:vp,visibleWires:all,visiblePoles:all});max=Math.max(max,r.sparks.length);seen+=r.sparks.length?1:0;for(const s of r.sparks)assert.ok(s.age>=0&&s.age<1&&(s.side===1||s.side===-1));}
  assert.ok(max<=b.sparks&&seen>20,`sparks happen but stay under ${b.sparks}: max ${max}`);
 }
 assert.deepEqual(z4Electric(1000,{reduced:true,visibleWires:all,visiblePoles:all}).sparks,[]);
 const {ctx}=mockCtx(1),layers=[];const r=addZ4PoleLayers((y,fn)=>layers.push({y,fn}),ctx,1234,{viewport:{width:1440,height:900,dpr:1}});
 assert.ok(r.sparks>=0);for(const l of layers)l.fn();
});
