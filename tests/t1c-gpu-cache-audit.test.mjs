// T1c (owner 18 Nov): after a GPU loss the game rebuilds every baked picture IN PLACE (no reload).  That only works if no module keeps a baked canvas / bitmap that the loss reset
// does not know about.  This audit scans src/ for the places that make canvases / bitmaps and fails for any file that is neither wired to src/gpu-budget.js (registerGpuLossReset,
// LossMap, LossWeakMap, gpuLossEpoch, registerGpuCache) nor on the reviewed list below WITH the reason it needs nothing.
import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {LossMap,LossWeakMap,registerGpuLossReset,resetAfterGpuLoss,gpuLossEpoch,gpuLossMapCount,gpuLossResetNames} from '../src/gpu-budget.js';
import {watchGraphicsLoss,gpuLossStats,GPU_MODE_KEY} from '../src/gpu-recovery.js';

const SRC=new URL('../src/',import.meta.url);
const MAKES=/createElement\(\s*['"]canvas['"]\s*\)|new OffscreenCanvas|createImageBitmap\(/;
const WIRED=/gpu-budget\.js/;
// reviewed: these make canvases but need no loss reset - the reason is the contract
const REVIEWED={
 'action-cutscene-fx.js':'live canvas, repainted every animation frame',
 'battle-fx.js':'live effect layer, repainted every animation frame (its textures: battle-fx-tex.js, wired)',
 'battle-scale.js':'CPU canvas (willReadFrequently) used once to measure a picture, keeps numbers only',
 'combat-sprites.js':'live pose canvas, redrawn on every requestAnimationFrame tick',
 'cover-fx-h5b.js':'title-screen engine: built by installCoverFx() every time the title is shown, never lives through play',
 'nira-combat.js':'frames are kept as data URLs (CPU), the canvases are scratch',
 'route-flow.js':'CPU read-back canvas (willReadFrequently), keeps the decoded flow field only',
 'scene-atmosphere.js':'live DOM canvases, repainted every animation frame',
 'terrain-bake-worker.js':'worker-side canvases of one bake job; the results live in town-lighting.js (wired)',
 'town-flow.js':'CPU read-back canvases (willReadFrequently) that decode the flow field',
 'walk.js':'CPU read-back mask (willReadFrequently): gameplay data, not a picture',
 'yama-sword.js':'live overlay canvases (repainted every frame) and a CPU measuring canvas',
 'yama-trial-idle.js':'frames are object URLs / data (CPU); the canvases are scratch',
 'gpu-hold.js':'T3/13: the last-picture copy is a CPU canvas (willReadFrequently) published as a JPEG blob behind a <div> - it must NOT be lost with the GPU, that is its whole purpose',
 'ui.js':'one 24x24 CPU scratch canvas (willReadFrequently) for the post-recovery check',
};
const files=readdirSync(SRC).filter(f=>f.endsWith('.js'));
test('T1c audit: every file that makes canvases / bitmaps is wired to the GPU-loss reset or reviewed with a reason',()=>{
 const loose=[];
 for(const f of files){
  const text=readFileSync(new URL(f,SRC),'utf8');
  if(!MAKES.test(text)||WIRED.test(text))continue;
  if(!REVIEWED[f])loose.push(f);
 }
 assert.deepEqual(loose,[],'these files bake canvases / bitmaps but are not wired to gpu-budget.js (registerGpuLossReset / LossMap / LossWeakMap / gpuLossEpoch) and not reviewed: '+loose.join(', '));
});
test('T1c audit: the reviewed list has no stale entries (every listed file still makes canvases and is still NOT wired)',()=>{
 for(const f of Object.keys(REVIEWED)){
  assert.ok(files.includes(f),f+' exists');
  const text=readFileSync(new URL(f,SRC),'utf8');
  assert.ok(MAKES.test(text),f+' no longer makes canvases - remove it from the reviewed list');
  assert.ok(!WIRED.test(text)||f==='ui.js','f is wired now - remove it from the reviewed list: '+f);
 }
});
test('T1c: LossMap / LossWeakMap forget everything on a loss reset, the epoch counts the losses',()=>{
 const m=new LossMap([[1,'a']]),w=new LossWeakMap(),k={};w.set(k,1);m.set(2,'b');
 assert.equal(w.get(k),1);assert.equal(w.has(k),true);assert.equal(m.size,2);
 const e0=gpuLossEpoch();const r=resetAfterGpuLoss();
 assert.deepEqual(r.failed,[]);assert.equal(m.size,0);assert.equal(w.has(k),false);assert.equal(gpuLossEpoch(),e0+1);
 w.set(k,2);assert.equal(w.get(k),2,'usable again after the reset');w.delete(k);assert.equal(w.has(k),false);
 assert.ok(gpuLossMapCount()>=2);
});
test('T1c: a registered reset runs, a reset that throws is reported (the caller then reloads)',()=>{
 let n=0;registerGpuLossReset('t1c-test-ok',()=>{n++;});registerGpuLossReset('t1c-test-bad',()=>{throw new Error('boom');});
 const r=resetAfterGpuLoss();assert.equal(n,1);assert.ok(r.ok.includes('t1c-test-ok'));
 assert.deepEqual(r.failed.map(x=>x.name),['t1c-test-bad']);
 registerGpuLossReset('t1c-test-bad',()=>{});assert.deepEqual(resetAfterGpuLoss().failed,[]);
});
test('T1c: the modules that bake the map pictures have registered their resets',async()=>{
 const mods=['town-lighting','town-terrain','town-shade','map-ambient','zone-clouds','town-clouds-codex','zone3-fog','terrain-detail','z4-poles','pot-souls','scene-style','sun-shafts','town-night-effects','battle-fx-tex','town-fluid-fx','art','scene','town-scenery','town-map','town-terrain-repair','fluid-shader'];
 for(const m of mods){try{await import(`../src/${m}.js`);}catch(e){/* a module that needs the browser cannot load in node: the static audit above covers it */}}
 const names=gpuLossResetNames();
 for(const need of ['town-lighting','town-terrain','town-shade','map-ambient','zone-clouds','terrain-detail'])assert.ok(names.includes(need),'registered: '+need+' (have '+names.join(',')+')');
});
const fakeCanvas=()=>{const h={};return {addEventListener:(n,f)=>{(h[n]||=[]).push(f);},removeEventListener(){},fire:n=>(h[n]||[]).forEach(f=>f({}))};};
const fakeStore=(init={})=>{const m=new Map(Object.entries(init));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
test('T1c recovery: a loss is rebuilt in place - no reload; a failed rebuild falls back to the reload',()=>{
 const cv=fakeCanvas(),store=fakeStore();let reloads=0,rebuilds=0,t=100000;
 watchGraphicsLoss(cv,{recover:()=>reloads++,rebuild:()=>{rebuilds++;return {ok:[],failed:[]};},storage:store,now:()=>t,setTimer:()=>0});
 cv.fire('contextlost');cv.fire('contextrestored');assert.equal(rebuilds,1);assert.equal(reloads,0);
 const cv2=fakeCanvas();
 watchGraphicsLoss(cv2,{recover:()=>reloads++,rebuild:()=>({ok:[],failed:[{name:'x',error:'boom'}]}),storage:fakeStore(),now:()=>t,setTimer:()=>0});
 cv2.fire('contextrestored');assert.equal(reloads,1,'a reset that failed -> reload');
 const cv3=fakeCanvas();
 watchGraphicsLoss(cv3,{recover:()=>reloads++,rebuild:()=>{throw new Error('x');},storage:fakeStore(),now:()=>t,setTimer:()=>0});
 cv3.fire('contextrestored');assert.equal(reloads,2,'a rebuild that throws -> reload');
});
test('T1c recovery: the check after the rebuild - holes -> reload (once, guarded), fine -> nothing',()=>{
 let timers=[],reloads=0,fine=false;const store=fakeStore(),t=500000;
 const cv=fakeCanvas();
 watchGraphicsLoss(cv,{recover:()=>reloads++,rebuild:()=>({ok:[],failed:[]}),verify:()=>fine,storage:store,now:()=>t,setTimer:f=>timers.push(f)});
 const before={...gpuLossStats};
 cv.fire('contextrestored');assert.equal(reloads,0,'not yet');timers.shift()();assert.equal(reloads,1,'holes -> reload');assert.equal(gpuLossStats.verifyFailed-before.verifyFailed,1);
 cv.fire('contextrestored');timers.shift()();assert.equal(reloads,1,'a second failure inside the guard window does not reload again');
 fine=true;const cv2=fakeCanvas();watchGraphicsLoss(cv2,{recover:()=>reloads++,rebuild:()=>({ok:[],failed:[]}),verify:()=>fine,storage:fakeStore(),now:()=>t,setTimer:f=>timers.push(f)});
 cv2.fire('contextrestored');timers.shift()();assert.equal(reloads,1,'fine -> no reload');
});
test('T1c recovery: dev switch - mode reload keeps the old path, mode none does nothing',()=>{
 let reloads=0,rebuilds=0;
 const a=fakeCanvas();watchGraphicsLoss(a,{recover:()=>reloads++,rebuild:()=>{rebuilds++;return {failed:[]};},storage:fakeStore({[GPU_MODE_KEY]:'reload'}),now:()=>1e6,setTimer:()=>0});
 a.fire('contextrestored');assert.equal(reloads,1);assert.equal(rebuilds,0);
 const b=fakeCanvas();watchGraphicsLoss(b,{recover:()=>reloads++,rebuild:()=>{rebuilds++;return {failed:[]};},storage:fakeStore({[GPU_MODE_KEY]:'none'}),now:()=>2e6,setTimer:()=>0});
 b.fire('contextrestored');assert.equal(reloads,1);assert.equal(rebuilds,0);
});
test('T1c: ui.js hands the rebuild and the check to the watcher, and the importmap carries the new modules',()=>{
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 assert.match(ui,/rebuild: \(\) => resetAfterGpuLoss\(\)/);assert.match(ui,/verify: \(\) => \{/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const f of ['gpu-budget','gpu-recovery'])assert.match(html,new RegExp(`"\\./src/${f}\\.js": "\\./src/${f}\\.js\\?v=[^"]+"`));
});
