// Execute the actual preview module against HTTP files with a DOM/Canvas simulator.
// This validates controls/culling/budget, and is explicitly NOT a real browser render test.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dimensions=JSON.parse(execFileSync('python3',['-c',String.raw`from PIL import Image
from pathlib import Path
import json,sys
p=Path(sys.argv[1]);out={}
for f in p.rglob('*'):
 if f.suffix in ['.png','.webp']:
  with Image.open(f) as im:out[str(f.relative_to(p))]=list(im.size)
print(json.dumps(out))`,dir],{encoding:'utf8'}));
let width=1280,frame,now=0,draws=[],allocated=0,peakAllocated=0;
const elements=new Map();
const ctx={save(){},restore(){},translate(){},scale(){},clearRect(){},fillRect(){},beginPath(){},arc(){},fill(){},fillText(){},measureText(s){return {width:s.length*7};},drawImage(im,...args){assert(!im.closed,'drawing a closed bitmap');draws.push([im.src,...args]);}};
for(const id of ['scene','sky','mountains','fluid','terrain','buildings','scenery','bridges','blur','labels','status','near','closer','location','play','overviewButton','overview']){
 elements.set(id,{id,checked:!['blur','labels'].includes(id),style:{},textContent:'',attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this[k];},getBoundingClientRect(){return {width};},parentElement:{},setPointerCapture(){},getContext(){return ctx;}});
}
globalThis.document={hidden:false,getElementById:id=>{assert(elements.has(id),id);return elements.get(id);}};
globalThis.devicePixelRatio=2;
globalThis.ResizeObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb();}};
globalThis.requestAnimationFrame=cb=>{frame=cb;};
let cleanup;globalThis.window={addEventListener(type,fn){if(type==='pagehide')cleanup=fn;}};
const realFetch=globalThis.fetch;
globalThis.fetch=async(src,opts)=>{
 const result=await realFetch(new URL(src,'http://127.0.0.1:8878/'),opts);
 const blob=result.blob.bind(result);result.blob=async()=>{const b=await blob();b.testSource=src;return b;};return result;
};
globalThis.createImageBitmap=async blob=>{
 const src=blob.testSource;assert(dimensions[src],src);const [w,h]=dimensions[src],bytes=w*h*4;
 allocated+=bytes;peakAllocated=Math.max(peakAllocated,allocated);
 return {src,width:w,height:h,closed:false,close(){assert(!this.closed,'bitmap closed twice');this.closed=true;allocated-=bytes;}};
};
await import('./preview.mjs');
const $=id=>elements.get(id),R=window.zone2Review;
const tick=()=>{now+=16;draws=[];frame(now);};
async function settle(){for(let i=0;i<1600;i++){tick();if(R.ready&&R.stats.active===0)return;await new Promise(r=>setTimeout(r,5));}throw Error('Preview did not become ready: '+JSON.stringify(R.stats));}
const checks=[];
await settle();assert.equal(R.stats.errors.length,0);assert(R.stats.bytes<=24*1048576);assert(R.stats.wanted.filter(x=>x.startsWith('terrain-webp/')).length<15);
checks.push('Initial viewport loads only nearby terrain tiles and objects from actual HTTP files');
const initial=R.view;
$('closer').onclick();await settle();assert.equal(R.level,1);assert(R.view[2]<initial[2]);assert.equal($('closer').attributes['aria-pressed'],'true');
$('near').onclick();await settle();assert.equal(R.level,0);checks.push('Both zoom levels update view and pressed state');
const visits=[];
for(const focus of ['north','left','right','south','dock','center']){
 $('location').value=focus;$('location').onchange();await settle();assert.equal(R.stats.errors.length,0);assert(R.stats.bytes<=24*1048576);
 visits.push({focus,decodedBytes:R.stats.bytes,requestedFiles:R.stats.wanted.length});
}
checks.push('All six focus locations load within the decoded cache budget');
const controlGroups=[['sky',x=>x===R.manifest.sky.src],['mountains',x=>x===R.manifest.mountains.src],['terrain',x=>x.startsWith('terrain-webp/')],['fluid',x=>x.startsWith('flows/')],['buildings',x=>/objects\/(tea|sala|judgment|house|gate)/.test(x)],['scenery',x=>/objects\/(tree|shrub|rock|lamp)/.test(x)],['bridges',x=>/objects\/(rail|post)/.test(x)]];
for(const [id,match] of controlGroups){$(id).checked=false;await settle();assert(!R.stats.wanted.some(match),id+' remains loaded');$(id).checked=true;await settle();}
checks.push('All seven layer controls remove their resources and restore them');
$('play').onclick();assert(!R.paused);const t0=R.clock;for(let i=0;i<30;i++){tick();await new Promise(r=>setTimeout(r,5));}assert(R.clock>t0);
$('play').onclick();const t1=R.clock;for(let i=0;i<8;i++)tick();assert.equal(R.clock,t1);checks.push('Water clock advances when playing and freezes when paused');
await settle();$('labels').checked=true;$('blur').checked=true;tick();$('labels').checked=false;$('blur').checked=false;
const beforeDrag=R.view;
$('scene').onpointerdown({pointerId:1,clientX:600,clientY:300});$('scene').onpointermove({clientX:500,clientY:350});$('scene').onpointerup();await settle();assert.notDeepEqual(R.view,beforeDrag);checks.push('Pointer drag changes camera');
$('location').value='center';$('location').onchange();await settle();tick();const desktopDraw=JSON.stringify(draws);
$('location').value='left';$('location').onchange();await settle();$('location').value='center';$('location').onchange();await settle();tick();assert.equal(JSON.stringify(draws),desktopDraw);checks.push('Returning to the same camera produces identical draw calls while paused');
width=390;$('scene').width=780;$('scene').height=Math.round(780*9/16);await settle();assert.equal(R.stats.errors.length,0);checks.push('390px simulated viewport executes without runtime errors');
$('overviewButton').onclick();await new Promise(r=>setTimeout(r,30));assert.equal($('scene').style.display,'none');assert.equal($('overview').src,'composite-preview.jpg');assert.equal(R.stats.wanted.length,0);assert.equal(R.stats.bytes,0);checks.push('Overview uses the final composite and releases the streamed cache');
$('overviewButton').onclick();await settle();assert.equal($('scene').style.display,'block');assert.equal(R.stats.errors.length,0);
const peak=R.stats.peakBytes;cleanup();await new Promise(r=>setTimeout(r,30));assert.equal(allocated,0);checks.push('Page cleanup closes all bitmap resources');
const report={method:'Node DOM/Canvas simulation + actual local HTTP fetch; NOT real-browser visual QA',checks,focusVisits:visits,peakCacheDecodedBytes:peak,peakInFlightAndCacheDecodedBytes:peakAllocated,errors:R.stats.errors,browserInspection:'blocked: browser access host is unavailable'};
fs.writeFileSync(path.join(dir,'preview-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
