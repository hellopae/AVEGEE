// Execute the actual review module with a small DOM/canvas/image harness.
// This checks loading/drawing logic, not browser appearance or browser decoding.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'docs/art-reviews/2026-11-05-frontier1-redraw');
const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const metadata=JSON.parse(fs.readFileSync(path.join(out,'image-metadata.json'),'utf8'));
const elements=new Map();
for(const match of html.matchAll(/id="([^"]+)"/g)) elements.set(match[1],{
  checked:true,value:'center',style:{},width:1150,height:647,textContent:'',
  setAttribute(key,value){this[key]=value;},removeAttribute(key){delete this[key];},
  getBoundingClientRect(){return {width:1150,height:647};},parentElement:{},
  setPointerCapture(){},
});
const errors=[],draws=[]; let raf, frames=0, timestamp=0, active=0, maxActive=0;
const ctx={clearRect(){},fillRect(){},save(){},restore(){},strokeRect(){},
  drawImage(image,...coords){assert(image && !image.closed);assert(coords.every(Number.isFinite));draws.push(image.src);}};
elements.get('scene').getContext=()=>ctx;
const base='http://local.test/';
const context=vm.createContext({console,URL,AbortController,Math,Map,Set,Promise,Error,
  devicePixelRatio:1,location:{href:base},
  document:{hidden:false,getElementById:id=>{assert(elements.has(id),`missing #${id}`);return elements.get(id);}},
  window:{addEventListener(){}},
  ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn();}},
  requestAnimationFrame(fn){raf=fn;},
  fetch:async src=>{
    const rel=String(src).replace(base,'');const file=path.resolve(out,rel);
    assert(file.startsWith(out+path.sep),`outside output: ${file}`);
    assert(fs.existsSync(file),`missing asset ${rel}`);
    return {ok:true,json:async()=>JSON.parse(fs.readFileSync(file,'utf8')),blob:async()=>({rel})};
  },
  createImageBitmap:async ({rel})=>{
    active++;maxActive=Math.max(active,maxActive);await Promise.resolve();
    assert(metadata[rel],`no dimensions ${rel}`);active--;
    const [width,height]=metadata[rel];return {width,height,src:rel,closed:false,close(){this.closed=true;}};
  },
});
const cache=new vm.SourceTextModule(fs.readFileSync(path.join(out,'viewer-cache.js'),'utf8'),{context});
const main=new vm.SourceTextModule(source,{context});
await main.link(spec=>{assert.equal(spec,'./viewer-cache.js');return cache;});
await main.evaluate();
const review=context.window.terrainReview;
async function tick(count=1){for(let i=0;i<count;i++){timestamp+=16;raf(timestamp);await new Promise(r=>setImmediate(r));frames++;}}
async function settle(){for(let i=0;i<150;i++){await tick();if(review.ready&&review.stats.pending===0)return;}throw Error('cache never settled');}
const checks=[];
for(const focus of ['center','left','right','south']){
  elements.get('location').value=focus;elements.get('location').onchange();
  for(const level of ['near','closer']){
    elements.get(level).onclick();await settle();assert.deepEqual(Array.from(review.stats.errors),[]);
    checks.push({focus,level,bytes:review.stats.bytes,view:Array.from(review.view)});
  }
}
for(const layer of ['sky','mountains','terrain','fluid','objects']){
  elements.get(layer).checked=false;await settle();elements.get(layer).checked=true;await settle();
}
const before=review.clock;elements.get('play').onclick();await tick(900);await settle();
assert(review.clock-before>12,'three cycles did not advance');elements.get('play').onclick();
const paused=review.clock;await tick(20);assert.equal(review.clock,paused);
elements.get('overviewButton').onclick();assert.equal(elements.get('scene').style.display,'none');
assert.equal(elements.get('overview').src,'composite-preview.jpg');
elements.get('overviewButton').onclick();await settle();
assert(maxActive<=2);assert(review.stats.peakBytes<=review.stats.maxBytes);assert.equal(review.stats.errors.length,0);
const report={mode:'Node VM with mocked DOM/canvas and image decoding',browserTested:false,
  browserBlockers:['Headless Chromium launch denied by sandbox MachPort permission','Connected browser access host unavailable'],
  focusZoomChecks:checks,layerToggles:5,animationSeconds:paused-before,pauseStable:true,overview:true,
  maxConcurrentDecodes:maxActive,framesSimulated:frames,drawCalls:draws.length,finalCache:review.stats,
  limitations:['No browser screenshots or responsive-layout verification','No actual browser image decoding','Not in-game testing']};
fs.writeFileSync(path.join(out,'viewer-review.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
