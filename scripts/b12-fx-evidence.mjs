// Real mountDungeonView renderer on native canvas + minimal DOM adapter.
// Does not exercise browser CSS/layout/compositing or real touch hardware.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const {createCanvas,Image:NativeImage}=require(process.env.WEATHER_CANVAS||'/Users/agapae/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const out='output/coordination/2026-10-30-b12-fx';mkdirSync(out,{recursive:true});
let pending=0,reduced=false,profile={width:1440,height:900},queue=new Map(),id=0;
const missing=[];
class LocalImage extends NativeImage {
 set src(url){
  if(!url)return;
  pending++;const done=this.onload,fail=this.onerror;
  this.onload=(...a)=>{pending--;done?.(...a);};this.onerror=(...a)=>{pending--;fail?.(...a);};
  try{super.src=readFileSync(String(url).split('?')[0]);}catch(e){pending--;missing.push(String(url));fail?.(e);}
 }
 get src(){return super.src;}
}
globalThis.Image=globalThis.HTMLImageElement=LocalImage;
const bounds=()=>({left:0,top:0,width:profile.width,height:profile.height});
function el(){const n=new EventTarget();return Object.assign(n,{hidden:false,textContent:'',style:{},classList:{add(){},remove(){}},getBoundingClientRect:bounds,focus(){},remove(){},setPointerCapture(){}});}
function canvas(){const c=createCanvas(1,1),events=el();for(const k of ['addEventListener','removeEventListener','dispatchEvent'])c[k]=events[k].bind(events);Object.assign(c,{getBoundingClientRect:bounds,focus(){},setPointerCapture(){}});return c;}
let root;
function section(){
 const r=el(),stage=el(),cv=canvas(),mini=canvas();cv.parentElement=stage;
 const map=new Map([['.dungeon-stage',stage],['.dungeon-stage > canvas',cv],['.dungeon-minimap',mini]]);
 for(const key of ['.dungeon-status','.dungeon-load','.dungeon-guide','.dungeon-challenge','[data-action="menu"]','[data-zoom="less"]','[data-zoom="more"]','[data-zoom="overview"]'])map.set(key,el());
 const hud=['profile','manual','bag','pause','settings'].map(action=>Object.assign(el(),{dataset:{hud:action}}));
 stage.insertAdjacentHTML=()=>{};r.querySelector=s=>map.get(s);r.querySelectorAll=()=>hud;r.cv=cv;r.map=map;r.hud=hud;root=r;return r;
}
globalThis.document={createElement:tag=>tag==='section'?section():canvas(),querySelector:()=>null,querySelectorAll:()=>[],documentElement:{}};
globalThis.window=Object.assign(el(),{devicePixelRatio:1,matchMedia:()=>({get matches(){return reduced;}})});
globalThis.matchMedia=window.matchMedia;
globalThis.requestAnimationFrame=fn=>{queue.set(++id,fn);return id;};globalThis.cancelAnimationFrame=n=>queue.delete(n);
const tick=t=>{const frames=[...queue.values()];queue.clear();for(const f of frames)f(t);};
const settle=async()=>{for(let i=0;i<100&&pending;i++)await new Promise(r=>setTimeout(r,10));};
const {mountDungeonView}=await import('../src/dungeon-view.js');
const {initializeZoneTravel,beginDungeon}=await import('../src/zone-travel.js');
const {ROUTE_GEOMETRY}=await import('../src/route-geometry.js');
const {BORDER12_TREES}=await import('../src/frontier-walkmask-th-asia-b12.js');
const {setWeatherEnabled}=await import('../src/map-ambient.js?v=mapfx-k1d');
const {seedFlow}=await import('../src/town-flow.js');
const {drawFrontierWeather}=await import('../src/frontier-ambient.js');
const {createRouteFlow}=await import('../src/route-flow.js?v=20261030-b12-fx');
const ambient=ROUTE_GEOMETRY['th:asia'].ambient,flowUrl=ambient.flowUrl;
const hash=b=>createHash('sha256').update(b).digest('hex');
const fire=(node,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);node.dispatchEvent(e);};
const stats=values=>{const s=values.sort((a,b)=>a-b);return{median:s[Math.floor(s.length/2)],p95:s[Math.floor(s.length*.95)],n:s.length};};
const results={method:'Actual mountDungeonView on @napi-rs/canvas with minimal DOM adapter. No browser, CSS, real pointer hardware, GPU or rAF timing. Before reconstructs 80 old overlay trees on current renderer with FX off; not a baseline browser screenshot.',profiles:[],missing};
for(profile of [{name:'desktop',width:1440,height:900},{name:'390',width:390,height:844}]){
 const measurements={};
 for(const before of [true,false]){
  ambient.trees=before?BORDER12_TREES:[];ambient.flowUrl=before?null:flowUrl;setWeatherEnabled(!before);seedFlow(123);
  const g={zone:'th',bossCleared:{th:true},zoneSave:{},zoneEvents:{},save(){},challengeUnlocked:()=>false};initializeZoneTravel(g);beginDungeon(g,'asia');
  // First plaza keeps enemies away, so evidence render cannot trigger an encounter.
  g.zoneTravel.active.position={x:.20,y:.27};
  let paused=false;
  const destroy=mountDungeonView({append(){}},g,{isPaused:()=>paused});await settle();
  for(let i=0;i<12;i++){tick(i*16);await settle();}
  const capture=name=>writeFileSync(`${out}/${profile.name}-${before?'before':'after'}-${name}.png`,root.cv.toBuffer('image/png'));
  capture('native');
  for(let i=0;i<4;i++)fire(root.map.get('[data-zoom="more"]'),'click');
  for(let i=0;i<60;i++)tick(300+i*16);capture('max');
  fire(root.map.get('[data-zoom="overview"]'),'click');for(let i=0;i<60;i++)tick(1500+i*16);capture('overview');
  const times=[];for(let i=0;i<80;i++){const start=performance.now();tick(2500+i*16);times.push(performance.now()-start);}measurements[before?'before':'after']=stats(times);
  if(!before){
   reduced=true;tick(4000);for(let i=0;i<60;i++)tick(4100+i*16);const a=root.cv.toBuffer('image/png');tick(6000);const b=root.cv.toBuffer('image/png');
   measurements.wholeSceneReducedIdentical=hash(a)===hash(b);capture('reduced');reduced=false;
   // Dispatch controls through actual mounted renderer.
   fire(root.cv,'wheel',{deltaY:-1});tick(6100);
   fire(root.cv,'keydown',{key:'d'});
   fire(root.cv,'pointerdown',{pointerId:1,clientX:50,clientY:300});fire(root.cv,'pointerdown',{pointerId:2,clientX:150,clientY:300});fire(root.cv,'pointermove',{pointerId:2,clientX:250,clientY:300});
   tick(6120);fire(root.cv,'pointercancel',{pointerId:2});tick(6140);fire(root.cv,'pointerup',{pointerId:1});await Promise.resolve();tick(6160);
   measurements.positionAfterPinch=g.zoneTravel.active.position;
   assert.deepEqual(g.zoneTravel.active.position,{x:.2,y:.27},'pinch does not issue a walk target');
   // Finish lazy sprite decoding before comparing two paused render frames.
   await settle();paused=true;tick(6180);const pausedA=root.cv.toBuffer('image/png');tick(6190);
   measurements.pauseFreezesScene=hash(pausedA)===hash(root.cv.toBuffer('image/png'));
   assert.equal(measurements.pauseFreezesScene,true,'pause holds actors and every FX layer');paused=false;
   const paired={off:[],on:[]};
   for(let pair=0;pair<12;pair++)for(const enabled of (pair%2?[true,false]:[false,true])){
    setWeatherEnabled(enabled);const start=performance.now();tick(6200+pair*16);paired[enabled?'on':'off'].push(performance.now()-start);
   }
   measurements.pairedCurrentFx={off:stats(paired.off),on:stats(paired.on)};setWeatherEnabled(true);
  }
  destroy();queue.clear();
 }
 results.profiles.push({...profile,...measurements,medianDelta:measurements.after.median-measurements.before.median});
 console.log(`Completed renderer evidence: ${profile.name}`);
}
ambient.trees=[];ambient.flowUrl=flowUrl;
// Check FX separately: the whole scene still contains unrelated roaming NPCs.
setWeatherEnabled(true);
const layer=canvas();layer.width=390;layer.height=844;const lc=layer.getContext('2d'),flow=createRouteFlow(flowUrl);await settle();
const frame=(time,isReduced)=>{lc.clearRect(0,0,390,844);flow.draw(lc,{time,reduced:isReduced,x:0,y:0,w:390,h:220,width:390,height:844});drawFrontierWeather(lc,{routeId:'th:asia',time,reduced:isReduced,x:0,y:0,w:390,h:220});return layer.toBuffer('image/png');};
const stillA=frame(1000,true),stillB=frame(9000,true);results.reducedFxIdentical=hash(stillA)===hash(stillB);assert.equal(results.reducedFxIdentical,true);
writeFileSync(`${out}/390-reduced-fx-layer.png`,stillA);
const movingA=frame(10000,false),movingB=frame(11000,false);results.animatedFxChanges=hash(movingA)!==hash(movingB);assert.equal(results.animatedFxChanges,true);
setWeatherEnabled(false);const offA=frame(12000,false);results.toggleClearsFx=lc.getImageData(0,0,390,844).data.every(v=>v===0);assert.equal(results.toggleClearsFx,true);flow.destroy();
writeFileSync(`${out}/offscreen-results.json`,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
