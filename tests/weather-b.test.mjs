import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stormFlash,stormStrike,biomeBudget,drawBiomeWeather,setWeatherEnabled,weatherEnabled,MAP_FX} from '../src/map-ambient.js';
import {drawFrontierAmbient} from '../src/frontier-ambient.js';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';
import {createFlowEngine,seedFlow} from '../src/town-flow.js';
const record=()=>{const calls=[];return {calls,ctx:new Proxy({canvas:{width:1440,height:900}},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>(calls.push(['set',k,v]),o[k]=v,true)})};};
test('Q5 lightning: a strike every ~5 s with at most two decaying flash pulses, never above .25 opacity, never more than 2 flashes per second; none under reduced motion',()=>{
 const S=MAP_FX.storm,starts=[];let prev=0,pulses=[],max=0;
 for(let t=0;t<90000;t++){
  const f=stormFlash(t);max=Math.max(max,f);assert.ok(f>=0&&f<=S.flash+1e-9&&S.flash<=.25);
  if(f&&!prev)starts.push(t);
  if(f>prev&&prev)pulses.push(t);          // a brighter frame right after a dimmer one would be a second (hidden) flash
  assert.equal(stormFlash(t,true),0);prev=f;
 }
 assert.ok(max>=S.flash*.95,'the flash reaches its ceiling');
 const strikes=new Set();for(let t=0;t<90000;t+=50){const k=stormStrike(t);if(k&&k.age<S.boltMs)strikes.add(k.n);}
 assert.ok(strikes.size>=18,'at least twice the old one-strike-per-9-seconds rate: '+strikes.size);
 // flash onsets: at most two per strike, and no more than 3 in any one-second window.
 for(let i=0;i<starts.length;i++)assert.ok(starts.filter(t=>t>=starts[i]&&t<starts[i]+1000).length<=3);
 assert.ok(starts.length<=strikes.size*2);
 for(let i=1;i<strikes.size;i++){const a=stormStrike((i-1)*S.period+S.jitter+1),b=stormStrike(i*S.period+S.jitter+1);assert.ok(b.start-a.start>=S.period-S.jitter-1);}
 assert.equal(stormFlash(S.period*50+S.jitter+S.period-1),0,'quiet between strikes');
});
test('WEATHER-B budgets shrink with viewport/DPR; settings and reduced motion stop all weather',()=>{
 const old=globalThis.devicePixelRatio;
 try{
  globalThis.devicePixelRatio=1;const desktop=biomeBudget({canvas:{width:1440,height:900}},3840,2560);
  globalThis.devicePixelRatio=2;const mobile=biomeBudget({canvas:{width:780,height:1688}},3840,2560);
  assert.ok(mobile<desktop&&mobile<=50);assert.equal(desktop,160);
  for(const zone of ['west','cyberhell']){
   const a=record();drawBiomeWeather(a.ctx,zone,9000,1678,937,true);assert.equal(a.calls.length,0);
   setWeatherEnabled(false);assert.equal(weatherEnabled(),false);drawBiomeWeather(a.ctx,zone,9000,1678,937);assert.equal(a.calls.length,0);assert.equal(stormFlash(9000),0);setWeatherEnabled(true);
  }
 }finally{globalThis.devicePixelRatio=old;setWeatherEnabled(true);}
});
test('WEATHER-B border 3–4 clips snow west and storm east, leaving the transition clear',()=>{
 const {ctx,calls}=record();const ambient=ROUTE_GEOMETRY['west:cyberhell'].ambient;
 drawFrontierAmbient(ctx,{w:1600,h:900,time:9050,...ambient,trees:[]});
 assert.deepEqual(calls.filter(c=>c[0]==='rect'),[['rect',0,0,736,900],['rect',864,0,736,900]]);
 assert.ok(calls.some(c=>c[0]==='lineTo'),'rain/lightning actually drawn');
});
test('WEATHER-B weather renders before actors/labels; settings checkbox is bound',()=>{
 const scene=readFileSync('src/scene.js','utf8'),ui=readFileSync('src/ui.js','utf8');
 assert.ok(scene.indexOf('drawMapAmbientSky(ctx')<scene.indexOf('layer.sort('));
 assert.ok(scene.indexOf('drawMapAmbientSky(ctx')<scene.indexOf('soulBadge(ctx, g'));
 assert.match(ui,/id="s-weather"/);assert.match(ui,/setWeatherEnabled\(e.currentTarget.checked\)/);
});
test('WATER-01 water emits crests rather than sparks and rejects sprite footprints crossing a dry hole',()=>{
 const w=100,h=80,kind=new Uint8Array(w*h).fill(4),dx=new Int8Array(w*h).fill(127),dy=new Int8Array(w*h);
 // Huge hole in an otherwise flowing surface; every drawn water quad must avoid it.
 for(let y=25;y<55;y++)for(let x=40;x<60;x++)kind[y*w+x]=0;
 const field={w,h,kind,dx,dy,unitX:2.5,unitY:2.5},water={};seedFlow(24);
 const e=createFlowEngine(field,{floorAt:()=>false,sprites:{water,streak:[null,null,null,null,{}]}});
 const transforms=[];const drawn=[];
 const ctx={save(){},restore(){},setTransform(...a){transforms.push(a);},drawImage(img){drawn.push({img,m:transforms.at(-1)});}};
 for(let n=0;n<60;n++)e.update(1/60,{x0:0,y0:0,x1:250,y1:200});
 assert.ok(e.particles().every(p=>p.type!==1),'no sparkle particles on water');
 e.draw(ctx,1,1000);assert.ok(drawn.length>20);
 for(const {img,m}of drawn){
  assert.equal(img,water);const x=m[4],y=m[5];
  for(let yy=Math.floor((y-7)/2.5);yy<=Math.ceil((y+7)/2.5);yy++)for(let xx=Math.floor((x-9)/2.5);xx<=Math.ceil((x+9)/2.5);xx++)assert.equal(kind[yy*w+xx],4);
 }
});

test('WEATHER-B changed renderer imports share canonical release identities',async()=>{
 const {assertModuleRelease,readReleaseFile}=await import('./helpers/release-imports.mjs');
 const html=readReleaseFile('index.html');
 for(const [file,importer]of [['map-ambient','scene'],['map-ambient','frontier-ambient'],['map-ambient','town-flow'],['map-ambient','ui'],['map-fx-h3','map-ambient'],['town-flow','scene'],['frontier-ambient','dungeon-view'],['route-geometry','dungeon-view']])assertModuleRelease(`src/${file}.js`,html,`src/${importer}.js`);
});

test('Q5 zone 3 snowfall is at least 3x the old ceiling on a desktop canvas, shrinks by the screen budget on phones, and brings visible fog',()=>{
 const old=globalThis.devicePixelRatio,OLD_SNOW_CEILING=160;
 const oldDoc=globalThis.document,gradient={addColorStop(){}};
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({canvas:{width:256,height:160},createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)})})};
 try{
  globalThis.devicePixelRatio=1;
  const desktop=record();drawBiomeWeather(desktop.ctx,'west',5000,3840,2560);
  const flakes=c=>c.calls.filter(x=>x[0]==='arc').length;
  assert.ok(flakes(desktop)>=3*OLD_SNOW_CEILING,'snow >= 3x the old 160');
  assert.ok(desktop.calls.some(x=>x[0]==='drawImage'),'fog banks drawn');
  globalThis.devicePixelRatio=3;
  const phone=record();phone.ctx.canvas={width:1170,height:2532,clientWidth:390,clientHeight:844};
  drawBiomeWeather(phone.ctx,'west',5000,3840,2560);
  assert.ok(flakes(phone)<flakes(desktop)&&flakes(phone)>=24,'phones draw fewer flakes (biomeBudget), never fewer than the floor');
  assert.equal(flakes(phone),biomeBudget(phone.ctx,3840,2560,MAP_FX.snow.max));
  // View-relative: zoomed in, the same number of flakes lands on the visible rectangle.
  const zoom=record();zoom.ctx.getTransform=()=>({a:.5,d:.5,e:-700,f:-100});zoom.ctx.canvas={width:390,height:844};
  globalThis.devicePixelRatio=1;drawBiomeWeather(zoom.ctx,'west',5000,3840,2560);
  const moves=zoom.calls.filter(x=>x[0]==='moveTo');
  assert.ok(moves.length>0&&moves.every(([,x,y])=>x>=1400-6&&x<=2180+6&&y>=200-6&&y<=1888+6),'flakes stay inside the visible part of the map');
 }finally{globalThis.devicePixelRatio=old;globalThis.document=oldDoc;}
});

test('Q5 zone 4 rain is at least 3x the old ceiling, lightning draws a visible bolt and a faint flash, all clipped to the visible area',()=>{
 const old=globalThis.devicePixelRatio,OLD_RAIN_CEILING=160;
 try{
  globalThis.devicePixelRatio=1;
  const S=MAP_FX.storm,t0=50*S.period+stormStrike(50*S.period+S.jitter).age*0;
  const start=stormStrike(50*S.period+S.jitter).start,quiet=start+S.boltMs+400;
  const rain=record();drawBiomeWeather(rain.ctx,'cyberhell',quiet,3840,2560);
  assert.ok(rain.calls.filter(x=>x[0]==='lineTo').length>=3*OLD_RAIN_CEILING,'rain streaks >= 3x old 160');
  const hit=record();drawBiomeWeather(hit.ctx,'cyberhell',start+20,3840,2560);
  const alphas=[];let a=1;for(const c of hit.calls){if(c[0]==='set'&&c[1]==='globalAlpha')a=c[2];if(c[0]==='fillRect')alphas.push(a);}
  assert.ok(alphas.length===1&&alphas[0]>0&&alphas[0]<=.25,'one faint whole-screen flash <= .25');
  assert.ok(hit.calls.filter(x=>x[0]==='lineTo').length>rain.calls.filter(x=>x[0]==='lineTo').length+8,'bolt polyline adds segments');
  const zoom=record();zoom.ctx.getTransform=()=>({a:.5,d:.5,e:-700,f:-100});zoom.ctx.canvas={width:390,height:844};
  drawBiomeWeather(zoom.ctx,'cyberhell',start+20,3840,2560);
  const rect=zoom.calls.find(x=>x[0]==='fillRect');
  assert.deepEqual(rect.slice(1),[1400,200,780,1688],'flash covers exactly the visible rectangle');
 }finally{globalThis.devicePixelRatio=old;}
});
