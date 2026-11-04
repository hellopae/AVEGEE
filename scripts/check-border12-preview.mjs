// Executes the shipped viewer code with file-backed fetch and mocked canvas/DOM.
// This verifies camera/layer/cache/animation logic, NOT a real browser rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'docs/art-reviews/2026-11-05-border12-redraw');
const html=await fs.readFile(path.join(out,'index.html'),'utf8');
const body=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const dimensions=spawnSync('python3',['-c',`import json,sys
from pathlib import Path
from PIL import Image
p=Path(sys.argv[1]);r={}
for f in p.rglob('*'):
 if f.suffix.lower() in ['.png','.webp','.jpg']:
  with Image.open(f) as im:r[str(f.relative_to(p))]=list(im.size)
print(json.dumps(r))`,out],{encoding:'utf8'});
assert.equal(dimensions.status,0,dimensions.stderr);
const sizes=JSON.parse(dimensions.stdout),errors=[],requested=[];
let raf=null,now=0,viewport={width:1440,height:690},drawn=[];
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',setAttribute(k,v){this[k]=v}});return elements.get(id)};
const canvas=element('canvas');canvas.getBoundingClientRect=()=>viewport;canvas.setPointerCapture=()=>{};
const context={setTransform(){},fillRect(){},translate(){},scale(){},save(){},restore(){},beginPath(){},arc(){},fill(){},fillText(){},drawImage(im){assert(!im.closed,'draw of evicted bitmap');drawn.push(im.src)}};
canvas.getContext=()=>context;
const inputs=['sky','mountains','fluids','terrain','objects','feet'].map(name=>({dataset:{layer:name},checked:name!=='feet'}));
const document={querySelector:selector=>selector==='canvas'?canvas:element(selector),querySelectorAll:()=>inputs};
const window={};
const fetch=async src=>{requested.push(src);try{const data=await fs.readFile(path.join(out,src));return {ok:true,status:200,json:async()=>JSON.parse(data),blob:async()=>({src})}}catch(e){errors.push(String(e));return {ok:false,status:404}}};
const createImageBitmap=async blob=>{assert(sizes[blob.src],blob.src);return {src:blob.src,width:sizes[blob.src][0],height:sizes[blob.src][1],closed:false,close(){this.closed=true}}};
const requestAnimationFrame=fn=>{raf=fn};let observer;
const ResizeObserver=class {constructor(fn){observer=fn}observe(){this.fn?.()}};
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
await new AsyncFunction('document','window','fetch','createImageBitmap','requestAnimationFrame','ResizeObserver','performance','devicePixelRatio',body)(document,window,fetch,createImageBitmap,requestAnimationFrame,ResizeObserver,{now:()=>now},1);
async function pump(t=now){now=t;for(let i=0;i<100;i++){raf(now);await new Promise(r=>setTimeout(r,5));if(window.borderReview.metrics().pending===0){raf(now);if(window.borderReview.metrics().pending===0)return}}throw Error('viewer did not settle; possible cache thrash')}
await pump();const wide=window.borderReview.metrics();assert.equal(wide.visibleTiles,19);assert.equal(wide.failed.length,0);assert(wide.bytes<=40*1048576);
assert(!requested.includes('terrain-atlas.png'));assert(!requested.some(s=>s.startsWith('terrain-png/')));assert(!requested.some(s=>/^objects\//.test(s)));
element('#near').onclick();await pump();const near=window.borderReview.metrics();assert.equal(near.level,2);assert(near.visibleTiles<wide.visibleTiles);
canvas.onpointerdown({clientX:400,clientY:300,pointerId:1});canvas.onpointermove({clientX:200,clientY:400});canvas.onpointerup();await pump();assert.notEqual(window.borderReview.camera.x,1152);
inputs.find(i=>i.dataset.layer==='terrain').checked=false;inputs.find(i=>i.dataset.layer==='terrain').onchange();await pump();assert.equal(window.borderReview.metrics().visibleTiles,0);
inputs.find(i=>i.dataset.layer==='terrain').checked=true;inputs.find(i=>i.dataset.layer==='terrain').onchange();
for(const [layer,prefix] of [['sky','layers/sky'],['mountains','layers/mountains'],['fluids','flows/'],['objects','objects-preview/']]){const input=inputs.find(i=>i.dataset.layer===layer);drawn=[];input.checked=false;input.onchange();await pump();assert(!drawn.some(src=>src.startsWith(prefix)),layer+' was drawn while disabled');input.checked=true;input.onchange();await pump()}
element('#play').onclick();assert.equal(window.borderReview.metrics().playing,true);await pump(now+1000);assert(window.borderReview.metrics().frame>0);
element('#play').onclick();assert.equal(window.borderReview.metrics().playing,false);
element('#play').onclick();const start=now;for(let i=1;i<=36;i++)await pump(start+i*334);assert.equal(window.borderReview.metrics().loops,3);assert.equal(window.borderReview.metrics().playing,false);
viewport={width:390,height:500};observer();await pump();const mobile=window.borderReview.metrics();assert(mobile.bytes<=40*1048576);
element('#reset').onclick();await pump();assert.equal(window.borderReview.metrics().level,1);assert.equal(window.borderReview.camera.x,1152);assert.equal(window.borderReview.camera.y,900);
assert.deepEqual(errors,[]);assert.deepEqual(window.borderReview.metrics().failed,[]);
const report={method:'actual shipped JS executed in mocked DOM/canvas with real file reads; no browser rendering',syntaxAndExecution:true,cameraZoomLevels:2,visibleTilesWide:wide.visibleTiles,visibleTilesNear:near.visibleTiles,panChangesCamera:true,allFiveLayerToggles:true,playPause:true,stopsAfterThreeLoops:true,mobileViewport:[390,500],maxCacheLimitBytes:40*1048576,finalCacheBytes:window.borderReview.metrics().bytes,missingFiles:errors,fullTerrainAtlasRequested:false,nativeObjectPngRequested:false,realBrowserTest:'blocked: browser access host unavailable'};
await fs.writeFile(path.join(out,'preview-code-review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
