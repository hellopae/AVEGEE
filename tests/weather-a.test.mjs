import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawMapWeather,weatherBudget,weatherLabelBounds,WEATHER_ZONES,setWeatherEnabled,weatherEnabled,ambientParticles,MAP_FX} from '../src/map-ambient.js';
import {drawFrontierWeather,drawFrontierAmbient,drawFrontierPostWeather} from '../src/frontier-ambient.js';
const viewport={width:1440,height:900,dpr:1};
const MAX_PATCHES=10;   // cloud shadow patches are sized from the visible area, so only a handful can intersect it
const gradient={addColorStop(){}};
function record(){
 const calls=[],values={canvas:{width:1440,height:900},createRadialGradient:()=>gradient,createLinearGradient:()=>gradient};
 const ctx=new Proxy(values,{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>{calls.push(['set',k,v]);o[k]=v;return true;}});
 return{ctx,calls};
}
globalThis.document={createElement:()=>({getContext:()=>record().ctx})};
test('weather cap follows CSS viewport and DPR, never world size, and reduced motion disables particles',()=>{
 assert.equal(weatherBudget(viewport),36);
 assert.ok(weatherBudget({width:390,height:844,dpr:2})<=7);
 assert.ok(weatherBudget({width:390,height:844,dpr:3})<=weatherBudget({width:390,height:844,dpr:2}));
 assert.equal(weatherBudget({...viewport,reduced:true}),0);
 for(const zone of Object.keys(WEATHER_ZONES)){
  assert.ok(ambientParticles(zone,2000,3840,2560,{width:390,height:844,dpr:2}).length<=14);
  const r=record();drawMapWeather(r.ctx,{zone,W:3840,H:2560,time:1000,viewport:{width:390,height:844,dpr:2},sources:[[470,450]]});
  assert.ok(r.calls.filter(c=>c[0]==='arc').length<=7);
  assert.ok(r.calls.filter(c=>c[0]==='drawImage').length<=7+MAX_PATCHES,'at most 7 smoke puffs plus the bounded cloud-shadow patches');
 }
});
test('reduced motion is identical across time, has no smoke/dust, and settings disable every new draw',()=>{
 for(const zone of Object.keys(WEATHER_ZONES)){
  const a=record(),b=record();
  drawMapWeather(a.ctx,{zone,W:3840,H:2560,time:1000,reduced:true,sources:[[470,450]],viewport});
  drawMapWeather(b.ctx,{zone,W:3840,H:2560,time:9000,reduced:true,sources:[[470,450]],viewport});
  assert.deepEqual(a.calls,b.calls);
  assert.equal(a.calls.filter(c=>c[0]==='arc').length,0);
  const patches=a.calls.filter(c=>c[0]==='drawImage').length;
  assert.ok(patches>=1&&patches<=MAX_PATCHES,'only static cloud shadows');
 }
 setWeatherEnabled(false);assert.equal(weatherEnabled(),false);const r=record();drawMapWeather(r.ctx,{W:3840,H:2560});assert.equal(r.calls.length,0);setWeatherEnabled(true);
});
test('pause holds the last weather phase; labels are unioned and clipped before weather',()=>{
 const r=record(),opts={zone:'asia',W:3840,H:2560,viewport};
 drawMapWeather(r.ctx,{...opts,time:1000});const before=r.calls.slice();r.calls.length=0;
 drawMapWeather(r.ctx,{...opts,time:7000,paused:true});assert.deepEqual(r.calls,before);
 assert.deepEqual(weatherLabelBounds([[1,1,20,10],[10,5,20,10],[100,100,5,5]]),[[1,1,29,14],[100,100,5,5]]);
 const a=record();drawMapWeather(a.ctx,{...opts,labels:[[100,100,50,20]]});
 assert.deepEqual(a.calls.slice(0,5),[['save'],['beginPath'],['rect',0,0,3840,2560],['rect',100,100,50,20],['clip','evenodd']]);
});
test('frontiers clip weather to the authored biome halves, retain cold snow, and invent no fire anchors',()=>{
 for(const routeId of ['th:asia','asia:west']){
  const r=record();drawFrontierWeather(r.ctx,{routeId,time:3000,w:1672,h:941,x:0,y:0,viewport});
  const rects=r.calls.filter(c=>c[0]==='rect');assert.equal(rects.length,3);
  assert.ok(r.calls.filter(c=>c[0]==='drawImage').length<=MAX_PATCHES,'cloud shadow patches only: no invented smoke');
  assert.ok(r.calls.some(c=>c[0]==='arc'),'Asia dust is present');
 }
 const r=record();r.ctx.canvas={width:780,height:1688,clientWidth:390,clientHeight:844};
 drawFrontierAmbient(r.ctx,{w:1672,h:941,snowArea:[.48,0,1,1],trees:[],waterfalls:[]});
 assert.ok(r.calls.filter(c=>c[0]==='arc').length<=20);
});
test('scene schedules weather after actors, before dialogue/badges; cache aliases share settings instance',()=>{
 const scene=readFileSync('src/scene.js','utf8'),html=readFileSync('index.html','utf8'),ui=readFileSync('src/ui.js','utf8');
 assert.ok(scene.indexOf('  drawMapWeather(ctx,')>scene.indexOf('if(town)drawTownNightEffects'));
 assert.ok(scene.indexOf('  drawMapWeather(ctx,')>scene.indexOf("drawStandee(ctx, 'hero-boss'"),'ruler receives the same clouds as other actors');
 assert.ok(scene.indexOf('  drawMapWeather(ctx,')<scene.indexOf('  // บทพูดวาดทีหลังทั้งหมด'));
 assert.match(scene,/st=>st\.def\.k==='krata'&&!st\.build/);assert.match(scene,/p\.y-h\*\.85\+9/);assert.match(scene,/weatherLabels\.push/);assert.match(ui,/s-weather/);
 const map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
 assert.equal(map['./src/map-ambient.js'],map['./src/map-ambient.js?v=mapfx-k1d']);
});
test('settings preference persists and restores, and blocked storage never breaks rendering',async()=>{
 const original=globalThis.window,values=new Map([['avegee.weather','off']]);
 try{
  globalThis.window={localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}};
  const m=await import('../src/map-ambient.js?weather-setting-test');
  assert.equal(m.weatherEnabled(),false);m.setWeatherEnabled(true);assert.equal(values.get('avegee.weather'),'on');
  Object.defineProperty(globalThis.window,'localStorage',{get(){throw new Error('blocked storage');}});
  assert.doesNotThrow(()=>m.setWeatherEnabled(false));assert.equal(m.weatherEnabled(),false);
 }finally{if(original===undefined)delete globalThis.window;else globalThis.window=original;}
});
test('unsupported canvas skips weather safely and can retry after a usable context is available',async()=>{
 const old=globalThis.document;
 try{
  const m=await import('../src/map-ambient.js?weather-no-gradient-test');
  globalThis.document={createElement:()=>({getContext:()=>({})})};
  const a=record();assert.doesNotThrow(()=>m.drawMapWeather(a.ctx,{W:600,H:400}));assert.equal(a.calls.length,0);
  globalThis.document=old;
  const b=record();m.drawMapWeather(b.ctx,{W:600,H:400});assert.ok(b.calls.filter(c=>c[0]==='drawImage').length>=1);
 }finally{globalThis.document=old;}
});

test('Q5 cloud shadows are sized from the visible map area, always present, and stay inside the opacity budget',()=>{
 const cloud=MAP_FX.cloud;
 // A zoomed town camera: the 3840x2560 world seen through a 390x844 canvas at 0.5 scale, offset to a corner.
 for(const [a,e,f] of [[.5,-700,-100],[.25,-300,-60],[.1,0,0]]){
  const r=record();r.ctx.canvas={width:390,height:844};
  r.ctx.getTransform=(...x)=>(r.calls.push(['getTransform',...x]),{a,d:a,e,f});
  drawMapWeather(r.ctx,{zone:'th',W:3840,H:2560,time:5000,viewport:{width:390,height:844,dpr:1}});
  const view={w:Math.min(3840,(390-e)/a)-Math.max(0,-e/a),h:Math.min(2560,(844-f)/a)-Math.max(0,-f/a)};
  const imgs=r.calls.filter(c=>c[0]==='drawImage');
  assert.ok(imgs.length>=1,'some shadow is on screen at every zoom');
  for(const [,,x,y,w,h] of imgs){assert.ok(w>=view.w*cloud.size[0]*cloud.spread[0]*(1-cloud.breathe)*.99&&w<=view.w*cloud.size[0]*cloud.spread[1]*(1+cloud.breathe)*1.01,'patch width follows the visible width');assert.ok(h<=view.h*cloud.size[1]*cloud.spread[1]*(1+cloud.breathe)*1.01);}
  let alpha=1;for(const c of r.calls){if(c[0]==='set'&&c[1]==='globalAlpha')alpha=c[2];if(c[0]==='drawImage')assert.ok(alpha>0&&alpha<=cloud.peak+1e-9,'each patch is at most the peak opacity');}
 }
 assert.ok(cloud.peak>=.35&&cloud.peak<=.55,'shadow darkens the ground by roughly 35-45%');
});
test('Q5 cloud shadows drift slowly and hold still when paused',()=>{
 const r=record();r.ctx.canvas={width:390,height:844};r.ctx.getTransform=(...x)=>(r.calls.push(['getTransform',...x]),{a:.5,d:.5,e:-700,f:-100});
 const opts={zone:'asia',W:3840,H:2560,viewport:{width:390,height:844,dpr:1}};
 const xs=[];
 for(let t=0;t<=40000;t+=1000){r.calls.length=0;drawMapWeather(r.ctx,{...opts,time:t});xs.push(r.calls.filter(c=>c[0]==='drawImage').map(c=>c[2]+c[4]/2));}
 assert.notDeepEqual(xs[0],xs[30],'shadow field moves');
 // One pass across the 780-unit-wide view takes tens of seconds: the field moves well under 100 units per second.
 for(let i=1;i<xs.length;i++){const a=xs[i-1],b=xs[i];if(a.length&&b.length&&a.length===b.length)for(let k=0;k<a.length;k++)assert.ok(Math.abs(b[k]-a[k])<60,'no sudden jumps');}
 r.calls.length=0;drawMapWeather(r.ctx,{...opts,time:41000,paused:true});const held=r.calls.filter(c=>c[0]==='drawImage').map(c=>c[2]);
 r.calls.length=0;drawMapWeather(r.ctx,{...opts,time:99000,paused:true});assert.deepEqual(r.calls.filter(c=>c[0]==='drawImage').map(c=>c[2]),held);
});

test('Q5 cloud shadows cover every map type: all three border routes and the frontier post of every zone',async()=>{
 const {setWeatherEnabled:setReleaseWeather}=await import('../src/map-ambient.js?v=mapfx-k1d');   // the module instance frontier-ambient.js imports
 for(const routeId of ['th:asia','asia:west','west:cyberhell']){
  const r=record();drawFrontierWeather(r.ctx,{routeId,time:3000,w:1672,h:941,x:0,y:0,viewport});
  assert.ok(r.calls.some(c=>c[0]==='drawImage'),routeId+' has cloud shadows');
 }
 for(const zone of Object.keys(WEATHER_ZONES)){
  const r=record();drawFrontierPostWeather(r.ctx,{zone,time:3000,w:1672,h:941,x:0,y:0});
  assert.ok(r.calls.some(c=>c[0]==='drawImage'),zone+' frontier post has cloud shadows');
  const off=record();setReleaseWeather(false);drawFrontierPostWeather(off.ctx,{zone,time:3000,w:1672,h:941});setReleaseWeather(true);
  assert.equal(off.calls.length,0,'settings switch silences the frontier post too');
 }
 const frontier=readFileSync('src/frontier.js','utf8');
 assert.ok(frontier.indexOf('drawFrontierPostWeather(ctx')>frontier.indexOf('acts.sort('),'frontier shadows fall over its actors');
});
