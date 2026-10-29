// Node/offscreen evidence. This is the real town renderer, without DOM HUD,
// browser compositing, rAF, touch input or CDP CPU throttling. Not LOAD-01b.
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const dependency=process.env.WEATHER_CANVAS||'/Users/agapae/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas';
const {createCanvas,Image:NativeImage,GlobalFonts}=require(dependency);
GlobalFonts.registerFromPath('/System/Library/Fonts/Supplemental/Thonburi.ttc','IBM Plex Sans Thai');
const out='output/coordination/2026-10-29-weather-a';mkdirSync(out,{recursive:true});
const memory=new Map();Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)}});
const errors=new Set();let pending=0;
class LocalImage extends NativeImage {
 set src(url){
  pending++;
  const done=this.onload,fail=this.onerror;
  this.onload=(...a)=>{pending--;done?.(...a);};this.onerror=(...a)=>{pending--;fail?.(...a);};
  try{super.src=String(url).startsWith('data:')?url:readFileSync(String(url).split('?')[0]);}catch(e){errors.add(String(url));pending--;queueMicrotask(()=>fail?.(e));}
 }
 get src(){return super.src;}
}
globalThis.Image=globalThis.HTMLImageElement=LocalImage;
globalThis.document={createElement:()=>createCanvas(1,1),querySelector:()=>null,documentElement:{},querySelectorAll:()=>[]};
let reduced=false;
globalThis.matchMedia=()=>({get matches(){return reduced;}});
globalThis.fetch=async url=>{try{const b=readFileSync(String(url).split('?')[0]);return{ok:true,json:async()=>JSON.parse(b),arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};}catch{return{ok:false,json:async()=>null};}};
const {createGame}=await import('../src/game.js');
const {render,setMapViewport}=await import('../src/scene.js');
const {syncSceneZone,SCENE}=await import('../src/data.js');
const {bindZone}=await import('../src/art.js');
// scene.js uses the queried module; match it in Node (the browser import map
// aliases all spellings to one version).
const {setWeatherEnabled,drawMapWeather}=await import('../src/map-ambient.js?v=mapfx-k1d');
const {drawFrontierWeather}=await import('../src/frontier-ambient.js');
const {ROUTE_GEOMETRY}=await import('../src/route-geometry.js');
const {preloadTownTerrainPreview}=await import('../src/town-terrain.js?v=k1d');
const {townStartupAssets,retainStartupImage}=await import('../src/town-startup.js');
const g=createGame();bindZone(()=>g.zone);g.save=()=>true;g.paused=false;g.storyQueue=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
const stats=a=>{const s=[...a].sort((x,y)=>x-y);return{median:s[Math.floor(s.length*.5)],p95:s[Math.floor(s.length*.95)],n:s.length};};
const result=process.argv.includes('--borders-only')?JSON.parse(readFileSync(`${out}/offscreen-results.json`,'utf8')):{method:'Node native canvas real town render; CPU elapsed, 4 interleaved pairs, no rAF/GPU/CDP. Effect-off/on in current renderer, not HEAD before/after. Not comparable to LOAD-01b.',profiles:[],reduced:[],missingAssets:[]};
for(const zone of (process.argv.includes('--borders-only')?[]:['th','asia','west','cyberhell'])){
 g.zone=zone;syncSceneZone(zone);g.syncBlocks();
 // Fixed review state: complete the existing stations; no gameplay save written.
 for(const st of g.stations){st.build=0;st.buildWait=false;}
 await preloadTownTerrainPreview(30000,zone);
 for(const url of townStartupAssets(zone)){const image=new LocalImage();image.src=url;try{await image.decode();if(image.naturalWidth)retainStartupImage(url,image);}catch{}}
 for(const profile of [{name:'desktop',width:1440,height:900,dpr:1},{name:'390',width:390,height:844,dpr:2}]){
  globalThis.devicePixelRatio=profile.dpr;
  const cv=createCanvas(profile.width*profile.dpr,profile.height*profile.dpr),ctx=cv.getContext('2d');
  cv.clientWidth=profile.width;cv.clientHeight=profile.height;
  const scale=Math.min(profile.width/SCENE.w,profile.height/SCENE.h);
  setMapViewport(cv,{width:profile.width,height:profile.height,sx:scale,sy:scale,tx:0,ty:(profile.height-SCENE.h*scale)/2});
  // Warm lazy asset requests and all once-per-scene bakes outside the samples.
  setWeatherEnabled(false);
  for(let i=0;i<3;i++){render(ctx,g,5000,null,null);await new Promise(r=>setTimeout(r,50));}
  for(const enabled of [false,true]){
   setWeatherEnabled(enabled);render(ctx,g,5000,null,null);
   writeFileSync(`${out}/${zone}-${profile.name}-${enabled?'after':'before'}.png`,cv.toBuffer('image/png'));
  }
  reduced=true;render(ctx,g,6000,null,null);const still=cv.toBuffer('image/png');render(ctx,g,10000,null,null);const later=cv.toBuffer('image/png');
  writeFileSync(`${out}/${zone}-${profile.name}-reduced.png`,still);
  result.reduced.push({zone,profile:profile.name,identical:hash(still)===hash(later),note:'Whole-scene hash may differ because unrelated actor/light animations use Date.now.'});reduced=false;
  const before=[],after=[];
  // Paired samples; same renderer/state/time. Includes native CPU rasterization.
  for(let i=0;i<4;i++)for(const enabled of (i%2?[true,false]:[false,true])){
   setWeatherEnabled(enabled);const start=performance.now();render(ctx,g,11000+i*16,null,null);(enabled?after:before).push(performance.now()-start);
  }
  result.profiles.push({zone,profile:profile.name,before:stats(before),after:stats(after),medianDelta:stats(after).median-stats(before).median});
 }
}
for(const routeId of ['th:asia','asia:west']){
 const row=ROUTE_GEOMETRY[routeId],bg=new NativeImage();// Native decoder rejects the C2PA PNG metadata on border 2–3. Re-encode
 // the same pixels in memory (no source asset writes).
 bg.src=row.background.endsWith('.png')?execFileSync('python3',['-c',
  'from PIL import Image; import sys; Image.open(sys.argv[1]).save(sys.stdout.buffer, format="PNG")',row.background],{maxBuffer:20_000_000}):readFileSync(row.background);await bg.decode();
 for(const profile of [{name:'desktop',width:1440,height:900,dpr:1},{name:'390',width:390,height:844,dpr:2}]){
  const cv=createCanvas(profile.width*profile.dpr,profile.height*profile.dpr),ctx=cv.getContext('2d');cv.clientWidth=profile.width;cv.clientHeight=profile.height;globalThis.devicePixelRatio=profile.dpr;
  const w=profile.width,h=w*bg.height/bg.width,y=(profile.height-h)/2;ctx.scale(profile.dpr,profile.dpr);
  for(const enabled of [false,true]){
   ctx.clearRect(0,0,profile.width,profile.height);ctx.drawImage(bg,0,y,w,h);
   drawFrontierWeather(ctx,{routeId,time:5000,x:0,y,w,h,enabled});
   writeFileSync(`${out}/${routeId.replace(':','-')}-${profile.name}-${enabled?'after':'before'}.png`,cv.toBuffer('image/png'));
  }
 }
}
// Isolate new effect pixels: exact stillness, clipping and moving floor/actor
// coverage can be checked without unrelated actor or glow clocks.
const pixelChecks=[];
for(const zone of ['th','asia','west','cyberhell']){
 const cv=createCanvas(600,400),ctx=cv.getContext('2d');
 const draw=(time,reduced)=>{ctx.fillStyle='#aaa';ctx.fillRect(0,0,600,400);ctx.fillStyle='#d58b43';ctx.fillRect(210,140,40,100);drawMapWeather(ctx,{zone,time,reduced,enabled:true,W:600,H:400,labels:[[200,260,90,24]],sources:[[220,230]]});return Buffer.from(ctx.getImageData(0,0,600,400).data);};
 const a=draw(1000,true),b=draw(9000,true);const still=hash(a)===hash(b);
 const movingA=draw(1000,false),movingB=draw(21000,false);
 let actor=0,ground=0,label=0;
 for(let y=0;y<400;y++)for(let x=0;x<600;x++){const i=(y*600+x)*4;if(movingA[i]!==movingB[i]||movingA[i+1]!==movingB[i+1]||movingA[i+2]!==movingB[i+2]){
  if(x>=210&&x<250&&y>=140&&y<240)actor++;else ground++;
  if(x>=200&&x<290&&y>=260&&y<284)label++;
 }}
 pixelChecks.push({zone,reducedIdentical:still,movingActorPixels:actor,movingGroundPixels:ground,changedLabelPixels:label});
}
if(pixelChecks.some(r=>!r.reducedIdentical||!r.movingActorPixels||!r.movingGroundPixels||r.changedLabelPixels))throw new Error('weather pixel check failed: '+JSON.stringify(pixelChecks));
result.pixelChecks=pixelChecks;result.missingAssets=[...errors];writeFileSync(`${out}/offscreen-results.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
