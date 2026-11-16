// T1b (owner 16 Nov, "the graphics card resets by itself"): the graphics memory of the zones the player left is given back; a zone that is visited again is rebuilt.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
globalThis.Image??=class{set src(v){}};
const {registerGpuCache,releaseGpuCaches,gpuBudgetTick,ZONE_STAY_MS,gpuBudgetStats}=await import('../src/gpu-budget.js');

test('T1b: a registered cache is released with the zone to keep; one failing cache does not stop the others',()=>{
 const seen=[];registerGpuCache('t-a',(keep)=>{seen.push(['a',keep]);return 5;});registerGpuCache('t-bad',()=>{throw new Error('boom');});registerGpuCache('t-b',(keep)=>{seen.push(['b',keep]);return 7;});
 const mb=releaseGpuCaches('asia',0);
 assert.ok(mb>=12,'the numbers add up');assert.deepEqual(seen,[['a','asia'],['b','asia']]);assert.ok(gpuBudgetStats.lastNames.includes('t-a')&&gpuBudgetStats.lastNames.includes('t-b'));
});
test('T1b: after a stay of ZONE_STAY_MS in one zone the others are released once; a new zone starts a new stay',()=>{
 let n=0;registerGpuCache('t-count',()=>{n++;return 0;});
 assert.equal(gpuBudgetTick(0,'th'),false);assert.equal(gpuBudgetTick(ZONE_STAY_MS-1,'th'),false);
 const before=n;assert.equal(gpuBudgetTick(ZONE_STAY_MS,'th'),true);assert.equal(n,before+1);
 assert.equal(gpuBudgetTick(ZONE_STAY_MS*3,'th'),false,'only once per stay');
 assert.equal(gpuBudgetTick(ZONE_STAY_MS*3+1,'asia'),false,'a zone change restarts the clock');
 assert.equal(gpuBudgetTick(ZONE_STAY_MS*4+1,'asia'),true);
});
test('T1b: a fluid-shader store is given back whole (textures, context) and can start again; its lost-context handler does not mark it failed',async()=>{
 const {disposeShaderStore,shaderStoreOf}=await import('../src/fluid-shader.js');
 const st=shaderStoreOf('img/test-zone/'),deleted=[];let lost=0;
 const gl={deleteTexture:t=>deleted.push(t),getExtension:n=>n==='WEBGL_lose_context'?{loseContext:()=>{lost++;}}:null};
 const listeners=new Set();const cv={width:2048,height:1024,removeEventListener:(n,f)=>listeners.delete(f)};st.onLost=()=>{};listeners.add(st.onLost);
 Object.assign(st,{status:'ready',gl,glCanvas:cv,pieces:[{tex:'f1',ground:{tex:'g1',texB:'g1b',size:[512,512]}},{tex:null,ground:null}]});
 const mb=disposeShaderStore(st);
 assert.deepEqual(deleted.sort(),['f1','g1','g1b']);assert.equal(lost,1);assert.equal(st.status,'idle');assert.equal(st.gl,null);assert.equal(st.pieces.length,0);assert.equal(listeners.size,0);assert.ok(mb>=8,'it reports what it freed');
 assert.equal(cv.width,1);assert.equal(disposeShaderStore(st),0,'an idle store has nothing to give back');
});
test('T1b: the frame loop ticks the budget, scene.js and fluid-shader.js register their per-zone caches',()=>{
 assert.match(readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),/gpuBudgetTick\(now, g\.zone\)/);
 assert.match(readFileSync(new URL('../src/scene.js',import.meta.url),'utf8'),/registerGpuCache\('scene-ground'/);
 assert.match(readFileSync(new URL('../src/fluid-shader.js',import.meta.url),'utf8'),/registerGpuCache\('fluid-shader'/);
});
