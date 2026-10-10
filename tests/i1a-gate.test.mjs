import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gateKarma, gateTotalKarma, gateEffectPose, drawGateEffect, GATE_EFFECT_MS, GATE_EFFECT_REDUCED_MS } from '../src/h4-location-ui.js';
const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
globalThis.Image=class {naturalWidth=1717;naturalHeight=916;set src(v){this.url=v;queueMicrotask(()=>this.onload?.());}};
globalThis.devicePixelRatio=1;
globalThis.addEventListener=globalThis.removeEventListener=()=>{};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const {createGame}=await import('../src/game.js');
const {STATIONS}=await import('../src/data.js');
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
const entry=(id,w,checked=false,zone='th')=>({zone,stage:'gate',intensity:1,checked,...(checked?{karmaLeft:w-1}:{}),soul:{id,who:'Soul '+id,sp:7,pure:false,deeds:[{t:'A deed',w}],merits:[]}});

// I1-A ข้อ 4-5 — ประตูสวรรค์: กรรมของยมบาทน้อย + เอฟเฟกต์ส่งวิญญาณ
test('I1-A lotus lowers only little Yama karma (8 per lotus, floor 0) and never touches gate souls',()=>{
 const g=game();g.stations.push({def:STATIONS.find(s=>s.k==='sawan'),build:0,slots:[]});
 g.sentences=[entry(1,4,true),entry(2,9),entry(3,20,true,'asia')];g.karma=11;g.inventory.lotus=3;
 const gateBefore=gateTotalKarma(g);assert.equal(gateBefore,11);
 assert.equal(g.offerLotusBoon(),true);assert.equal(g.karma,3);assert.equal(g.inventory.lotus,2);
 assert.equal(gateTotalKarma(g),gateBefore,'gate souls keep their karma');
 assert.equal(gateKarma(g.sentences[0]),3);assert.equal(gateKarma(g.sentences[1]),8);assert.equal(gateKarma(g.sentences[2]),19);
 assert.equal(g.inspectGate(2),true);assert.equal(g.inspectGate(2),true);assert.equal(gateKarma(g.sentences[1]),8);
 const copy=game();copy.restore(g.snapshot());assert.equal(copy.karma,3);assert.equal(gateTotalKarma(copy),gateBefore);
 assert.equal(copy.offerLotusBoon(),true);assert.equal(copy.karma,0,'cut is capped at the karma that exists');assert.equal(copy.inventory.lotus,1);
 assert.equal(copy.offerLotusBoon(),false);assert.equal(copy.inventory.lotus,1,'no karma = lotus is not consumed');
 assert.equal(gateTotalKarma(copy),gateBefore);
});
test('I1-A lotus line shows little Yama karma, not the gate total, and needs the heaven gate',()=>{
 const g=game();g.sentences=[entry(1,4,true)];g.karma=5;g.inventory.lotus=1;
 assert.equal(g.offerLotusBoon(),false,'heaven gate not built');assert.equal(g.karma,5);assert.equal(g.inventory.lotus,1);
 g.stations.push({def:STATIONS.find(s=>s.k==='sawan'),build:0,slots:[]});
 assert.equal(g.offerLotusBoon(),true);assert.equal(g.karma,0);
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),strings=readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');
 assert.ok(ui.includes("t('h4.yamaKarma').replace('{n}',x.karma)"));assert.ok(ui.includes('karma:Math.round(g.karma*10)/10'));
 assert.ok(!/karma:gateTotalKarma\(g\)/.test(ui),'lotus tag must not show the gate total any more');
 assert.ok(strings.includes("'h4.yamaKarma': 'กรรมของยมบาทน้อย {n}'")&&strings.includes("'h4.yamaKarma': 'Little Yamabal’s karma: {n}'"));
});
test('I1-A sky = soft additive gold light (gradients, sparkles, petals); rebirth = rotating ring that condenses into an orb and flies to the centre gate',()=>{
 const grads=[],ops=[],stops=[];
 const mkGrad=type=>({addColorStop:(o,c)=>stops.push([type,o,c])});
 const ctx=new Proxy({createLinearGradient:()=>{grads.push('linear');return mkGrad('linear')},createRadialGradient:()=>{grads.push('radial');return mkGrad('radial')}},
  {get:(o,k)=>k in o?o[k]:(...a)=>ops.push([k,...a]),set:(o,k,v)=>{ops.push(['set',k,v]);return true}});
 drawGateEffect(ctx,100,200,80,'sky',gateEffectPose('sky',1000),0,{seed:3});
 assert.ok(grads.filter(x=>x==='linear').length>=3&&grads.includes('radial'),'soft edged gradients, not a solid bar');
 assert.ok(ops.some(o=>o[0]==='set'&&o[1]==='globalCompositeOperation'&&o[2]==='lighter'));
 assert.ok(ops.filter(o=>o[0]==='fillRect').length>40,'pillar is built from many faded slices + sparkles');
 assert.ok(ops.some(o=>o[0]==='ellipse'),'lotus petals');
 assert.ok(!ops.some(o=>o[0]==='moveTo'&&o[1]===100-80*.55),'old solid trapezoid is gone');
 ops.length=0;grads.length=0;
 drawGateEffect(ctx,100,200,80,'reborn',gateEffectPose('reborn',350),0,{seed:3,to:[300,40]});
 assert.ok(ops.some(o=>o[0]==='ellipse'),'ring on the pedestal');assert.ok(grads.includes('radial'));
 // the orb ends at the centre gate: at p=.9 the radial glow sits near (300,40), at p=.4 still near the soul
 const centres=[];const ctx2=new Proxy({createLinearGradient:()=>mkGrad('l'),createRadialGradient:(x,y)=>{centres.push([x,y]);return mkGrad('r')}},{get:(o,k)=>k in o?o[k]:()=>{},set:()=>true});
 drawGateEffect(ctx2,100,200,80,'reborn',gateEffectPose('reborn',GATE_EFFECT_MS.reborn*.9),0,{seed:3,to:[300,40]});
 const late=centres.filter(c=>Math.hypot(c[0]-300,c[1]-40)<60);assert.ok(late.length>0,'orb has travelled to the gate');
 centres.length=0;drawGateEffect(ctx2,100,200,80,'reborn',gateEffectPose('reborn',GATE_EFFECT_MS.reborn*.3),0,{seed:3,to:[300,40]});
 assert.ok(centres.filter(c=>c[0]||c[1]).every(c=>Math.hypot(c[0]-100,c[1]-200)<120),'before the orb leaves, all light stays on the pedestal');
 for(const kind of ['sky','reborn']){const s=GATE_EFFECT_MS[kind];assert.ok(s>=1200&&s<=2000,kind+' lasts 1.2-2 s');}
});
test('I1-A reduced motion: departure is a plain fade, no light drawn, shorter, soul stays put',()=>{
 for(const kind of ['sky','reborn']){
  const pose=gateEffectPose(kind,350,true);assert.equal(pose.reduced,true);assert.equal(pose.rise,0);assert.equal(pose.scale,1);assert.ok(pose.alpha>0&&pose.alpha<1);
  assert.equal(gateEffectPose(kind,GATE_EFFECT_REDUCED_MS+1,true).done,true);assert.equal(gateEffectPose(kind,GATE_EFFECT_REDUCED_MS+1,false).done,false);
  const ops=[];drawGateEffect(new Proxy({},{get:()=>(...a)=>ops.push(a),set:()=>true}),100,200,80,kind,pose,0,{});assert.equal(ops.length,0,'nothing drawn');
 }
 const room=readFileSync(new URL('../src/room.js',import.meta.url),'utf8');
 assert.ok(room.includes("prefers-reduced-motion: reduce")&&room.includes('reduced:prefersReducedMotion()'));
});
