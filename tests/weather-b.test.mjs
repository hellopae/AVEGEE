import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stormFlash,weatherBudget,drawBiomeWeather,setWeatherEnabled,weatherEnabled} from '../src/map-ambient.js';
import {drawFrontierAmbient} from '../src/frontier-ambient.js';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';
import {createFlowEngine,seedFlow} from '../src/town-flow.js';
const record=()=>{const calls=[];return {calls,ctx:new Proxy({canvas:{width:1440,height:900}},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>(calls.push(['set',k,v]),o[k]=v,true)})};};
test('WEATHER-B flash has one short monotonic pulse per nine seconds; no flash under reduced motion',()=>{
 let starts=[];let prev=0;
 for(let t=0;t<90000;t++){
  const f=stormFlash(t);assert.ok(f>=0&&f<=.055);
  if(f&&!prev)starts.push(t);
  if(t%9000)assert.ok(f<=prev,'pulse never brightens again');
  assert.equal(stormFlash(t,true),0);prev=f;
 }
 assert.equal(starts.length,10);
 for(let i=1;i<starts.length;i++)assert.equal(starts[i]-starts[i-1],9000);
 assert.equal(stormFlash(100),0);
});
test('WEATHER-B budgets shrink with viewport/DPR; settings and reduced motion stop all weather',()=>{
 const old=globalThis.devicePixelRatio;
 try{
  globalThis.devicePixelRatio=1;const desktop=weatherBudget({canvas:{width:1440,height:900}},3840,2560);
  globalThis.devicePixelRatio=2;const mobile=weatherBudget({canvas:{width:780,height:1688}},3840,2560);
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
