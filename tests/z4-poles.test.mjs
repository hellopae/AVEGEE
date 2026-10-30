import test from 'node:test';
import assert from 'node:assert/strict';
import {Z4_POLES,Z4_WIRES} from '../src/z4-poles-data.js';
import {Z4_POLE_COUNT,Z4_WIRE_COUNT,z4Layout,z4Electric,z4ElectricBudget,addZ4PoleLayers,drawZ4Bolt,drawZ4Pole} from '../src/z4-poles.js';

const noop=()=>new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:0,height:0,getContext:noop})};   // sprites (glow, pole bodies) bake lazily
const PHONE={width:390,height:844,dpr:3}, DESKTOP={width:1440,height:900,dpr:1};
function mockCtx(view=[0,0,3840,2560]){
 const calls=[],sizes=[];
 const ctx=new Proxy({canvas:{width:view[2]-view[0],height:view[3]-view[1]},
  getTransform:()=>({a:1,b:0,c:0,d:1,e:-view[0],f:-view[1]}),
  drawImage:(_i,x,y,w,h)=>sizes.push([w,h]),
  createRadialGradient:()=>({addColorStop(){}})},
  {get:(t,k)=>k in t?t[k]:(...a)=>{calls.push([k,a]);},set:()=>true});
 return {ctx,calls,sizes};
}

test('Z4-POLES: pole / wire counts are pinned and the data is well-formed',()=>{
 assert.equal(Z4_POLE_COUNT,287);
 assert.equal(Z4_WIRE_COUNT,293);
 assert.equal(Z4_POLES.length,287);assert.equal(Z4_WIRES.length,293);
 for(const [x,y,h] of Z4_POLES){assert.ok(x>0&&x<1&&y>0&&y<1&&h>.005&&h<.05,`pole ${x},${y},${h}`);}
 const seen=new Set();
 for(const [a,b,sag] of Z4_WIRES){
  assert.ok(a<b&&a>=0&&b<Z4_POLE_COUNT);assert.ok(sag>-.1&&sag<.4);
  assert.ok(!seen.has(a+':'+b),'duplicate wire');seen.add(a+':'+b);
 }
 const {poles,wires}=z4Layout();
 assert.equal(poles.length,287);assert.equal(wires.length,293);
 assert.deepEqual([...new Set(poles.map(p=>p.variant))].sort(),[0,1]);   // two pole styles
 for(const w of wires)assert.ok(w.chord>20&&w.chord<500,`wire ${w.i} chord ${w.chord}`);
});

test('Z4-POLES: reduced motion / weather off => no sparks, no bolts, still glowing wires',()=>{
 const all=[...Array(50).keys()];
 for(const opts of [{reduced:true},{enabled:false}])
  for(let t=0;t<30000;t+=37){
   const r=z4Electric(t,{...opts,viewport:DESKTOP,visibleWires:all,visiblePoles:all});
   assert.equal(r.runners.length,0);assert.equal(r.bolt,null);
  }
 const {ctx,calls}=mockCtx();
 for(let t=0;t<9000;t+=97){
  const r=addZ4PoleLayers(()=>{},ctx,t,{reduced:true,viewport:PHONE});
  assert.equal(r.runners,0);assert.equal(r.bolt,false);assert.ok(r.wires>0&&r.poles>0);
 }
 assert.equal(calls.filter(([k])=>k==='globalCompositeOperation').length,0);
});

test('Z4-POLES: at most 3 flashes per second, one at a time, never full-screen',()=>{
 const all=[...Array(80).keys()];
 for(const viewport of [PHONE,DESKTOP,{width:360,height:640,dpr:2}]){
  const onsets=[];let prev=null,total=0;
  for(let t=0;t<60000;t+=10){
   const b=z4Electric(t,{viewport,visibleWires:all,visiblePoles:all}).bolt;
   if(b){assert.ok(b.age>=0&&b.age<=1);total++;}
   if(b&&!prev)onsets.push(t);prev=b;
  }
  assert.ok(onsets.length>5,'lightning happens');
  for(let i=0;i<onsets.length;i++){
   const inSec=onsets.filter(o=>o>=onsets[i]&&o<onsets[i]+1000).length;
   assert.ok(inSec<=3,`${inSec} flashes in 1 s at ${viewport.width}`);
  }
  assert.ok(total*10/60000<.5,'lit < 50% of the time');
 }
 // bolt + halo stay local: every sprite blit is a few dozen world px
 const {ctx,sizes}=mockCtx();
 for(let s=0;s<40;s++)drawZ4Bolt(ctx,z4Layout().poles[s],.2,s,3);
 drawZ4Pole(ctx,z4Layout().poles[0],0);
 assert.ok(sizes.length>0);for(const [w,h] of sizes)assert.ok(w<120&&h<120,`blit ${w}x${h}`);
});

test('Z4-POLES: electricity budget is capped by screen size and zero when reduced',()=>{
 const p=z4ElectricBudget(PHONE),d=z4ElectricBudget(DESKTOP),s=z4ElectricBudget({width:360,height:640,dpr:2});
 assert.ok(p.runners<d.runners&&p.runners>=2&&d.runners<=10);assert.ok(s.runners<=p.runners+1);
 assert.ok(p.slotMs>=d.slotMs&&d.slotMs>=334);   // >=334 ms between bolts = <=3/s
 assert.deepEqual(z4ElectricBudget({...DESKTOP,reduced:true}),{runners:0,bolts:false,slotMs:Infinity});
 const all=[...Array(80).keys()];
 for(let t=0;t<20000;t+=50){
  assert.ok(z4Electric(t,{viewport:PHONE,visibleWires:all,visiblePoles:all}).runners.length<=p.runners);
  assert.ok(z4Electric(t,{viewport:DESKTOP,visibleWires:all,visiblePoles:all}).runners.length<=d.runners);
 }
});

test('Z4-POLES: only on-screen poles/wires are queued, depth key is the pole foot',()=>{
 const full=mockCtx(),small=mockCtx([1500,900,2100,1300]),layers=[];
 const a=addZ4PoleLayers(()=>{},full.ctx,1000,{viewport:DESKTOP});
 const b=addZ4PoleLayers((y,fn)=>layers.push({y,fn}),small.ctx,1000,{viewport:DESKTOP});
 assert.equal(a.poles,287);assert.equal(a.wires,293);
 assert.ok(b.poles>0&&b.poles<40&&b.wires>0&&b.wires<60,JSON.stringify(b));
 const {poles}=z4Layout();
 const foot=new Set(poles.map(p=>p.y));
 assert.ok(layers.filter(l=>foot.has(l.y)).length>=b.poles);
 for(const l of layers)l.fn();   // draws without throwing
});
