import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ambientPixelKind,drawMapAmbientGround,strictSurfaceCells} from '../src/map-ambient.js';
import {H3_BUDGET,h3SurfaceContains,prepareH3SurfaceTracks,drawH3Surfaces} from '../src/map-fx-h3.js';
const recorder=()=>{
 const calls=[];
 const c=new Proxy({calls},{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>{calls.push(['set',k,v]);o[k]=v;return true;}});
 return c;
};
test('H3 spatial masks include painted channels and exclude orange buildings and paths',()=>{
 for(const zone of ['th','asia']){
  for(const [x,y] of [[.34,.24],[.37,.55],[.57,.64],[.66,.72]]){
   assert.equal(h3SurfaceContains(zone,x,y),true);
   assert.equal(ambientPixelKind(255,120,20,y,zone,x),'lava');
  }
  for(const [x,y] of [[.05,.4],[.85,.18],[.49,.45],[.7,.5],[.2,.6]]){
   assert.equal(ambientPixelKind(255,120,20,y,zone,x),null);
  }
  assert.equal(ambientPixelKind(120,75,40,.82,zone,.29),null,'wood excluded');
  assert.equal(ambientPixelKind(65,85,100,.8,zone,.49),null,'grey bridge excluded');
 }
 assert.equal(ambientPixelKind(74,65,105,.83,'th',.2),'water');
 assert.equal(ambientPixelKind(40,125,155,.75,'asia',.25),'water','shore cascade');
 assert.equal(ambientPixelKind(255,120,20,.08,'th',.46),'lava','upper cliff');
});
test('H3 bounded tracks contain flow, bubbles, sparks, edge pulse, falls and mist with changing frames',()=>{
 for(const zone of ['th','asia'])for(const kind of ['lava','water']){
  const points=kind==='lava'?[[.35,.16],[.36,.25],[.65,.71]]:[[.04,.77],[.25,.76],[.73,.77],[.2,.85]];
  const tracks=prepareH3SurfaceTracks(zone,kind,points,points);
  assert.ok(tracks.flow.length);
  assert.equal(tracks.sparks.length,kind==='lava'?H3_BUDGET.sparks:0);
  assert.equal(tracks.bubbles.length,kind==='lava'?H3_BUDGET.bubbles:0);
  assert.equal(tracks.edges.length,kind==='lava'?H3_BUDGET.edgeGlow:0);
  assert.equal(tracks.falls.length,kind==='water'&&zone==='th'?0:18);
  assert.equal(tracks.mist.length,kind==='water'&&zone==='asia'?12:0);
  assert.deepEqual(tracks,prepareH3SurfaceTracks(zone,kind,points,points));
  const c=recorder();drawH3Surfaces(c,zone,kind,1000,1678,937,tracks);
  const first=JSON.stringify(c.calls);c.calls.length=0;
  drawH3Surfaces(c,zone,kind,2500,1678,937,tracks);
  assert.notEqual(JSON.stringify(c.calls),first);
  assert.ok(c.calls.filter(a=>['stroke','fill','fillRect'].includes(a[0])).length<=(kind==='lava'?91:94));
 }
 assert.equal(Object.values(H3_BUDGET).reduce((a,b)=>a+b),184);
});
test('reduced motion skips mask allocation and all H3 drawing',()=>{
 const prev=globalThis.document;
 globalThis.document={createElement(){throw Error('must not allocate');}};
 try{for(const zone of ['th','asia']){
  const c=recorder();drawMapAmbientGround(c,{},zone,1000,1678,937,true);assert.deepEqual(c.calls,[]);
 }}finally{globalThis.document=prev;}
});
test('mask readback and allocation are cached; both surfaces composite before scaling to scene size',()=>{
 const prev=globalThis.document;let reads=0,allocations=0;
 globalThis.document={createElement(){
  allocations++;
  const canvas={width:1,height:1},c=recorder();let stored;
  c.createImageData=(w,h)=>({data:new Uint8ClampedArray(w*h*4)});
  c.putImageData=p=>{stored=p;};
  c.getImageData=()=>{
   reads++;if(stored)return stored;
   const data=new Uint8ClampedArray(canvas.width*canvas.height*4);
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const i=(y*canvas.width+x)*4;
    data.set(y/canvas.height>.735?[74,65,105,255]:[255,120,20,255],i);
   }
   return {data};
  };
  canvas.getContext=()=>c;return canvas;
 }};
 try{
  const bg={naturalWidth:320,naturalHeight:180};
  const c=recorder();drawMapAmbientGround(c,bg,'th',1000,1678,937);
  const initial={reads,allocations};
  c.calls.length=0;drawMapAmbientGround(c,bg,'th',2500,839,468.5);
  assert.deepEqual({reads,allocations},initial,'no frame readback or allocation');
  const images=c.calls.filter(a=>a[0]==='drawImage');assert.equal(images.length,2);
  for(const call of images)assert.deepEqual(call.slice(-4),[0,0,839,468.5]);
 }finally{globalThis.document=prev;}
});
test('ground effects remain below depth sorted buildings and actors in existing scene renderer',()=>{
 const scene=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
 assert.ok(scene.indexOf('if (bg) drawMapAmbientGround')<scene.indexOf('drawStationShadow(ctx'));
 assert.ok(scene.includes('!!reducedMotion?.matches'));
});

test('strict sampling rejects an entire cell when even one painted pixel is a rock',()=>{
 const w=40,h=40,data=new Uint8ClampedArray(w*h*4);
 for(let i=0;i<data.length;i+=4)data.set([74,65,105,255],i);
 const before=strictSurfaceCells(data,w,h,10,10,'th');
 assert.equal(before[82],'water');
 data.set([90,70,50,255],(33*w+9)*4);
 const after=strictSurfaceCells(data,w,h,10,10,'th');
 assert.equal(after[82],null);
 assert.equal(after[83],'water');
});
