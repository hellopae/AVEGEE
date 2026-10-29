import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {drawMapWeather,weatherBudget,weatherLabelBounds,WEATHER_ZONES,setWeatherEnabled,weatherEnabled,ambientParticles} from '../src/map-ambient.js';
import {drawFrontierWeather,drawFrontierAmbient} from '../src/frontier-ambient.js';
const viewport={width:1440,height:900,dpr:1};
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
  assert.ok(r.calls.filter(c=>c[0]==='drawImage').length<=10);
 }
});
test('reduced motion is identical across time, has no smoke/dust, and settings disable every new draw',()=>{
 for(const zone of Object.keys(WEATHER_ZONES)){
  const a=record(),b=record();
  drawMapWeather(a.ctx,{zone,W:3840,H:2560,time:1000,reduced:true,sources:[[470,450]],viewport});
  drawMapWeather(b.ctx,{zone,W:3840,H:2560,time:9000,reduced:true,sources:[[470,450]],viewport});
  assert.deepEqual(a.calls,b.calls);
  assert.equal(a.calls.filter(c=>c[0]==='arc').length,0);
  assert.equal(a.calls.filter(c=>c[0]==='drawImage').length,3,'only static cloud shadows');
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
  assert.equal(r.calls.filter(c=>c[0]==='drawImage').length,6,'cloud sprites only: no invented smoke');
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
  const b=record();m.drawMapWeather(b.ctx,{W:600,H:400});assert.equal(b.calls.filter(c=>c[0]==='drawImage').length,3);
 }finally{globalThis.document=old;}
});
