import test from 'node:test';
import assert from 'node:assert/strict';
import {createRhythm,createSlicing,segmentDistance,NOTE_WINDOW} from '../src/minigames/training/sword-engines.js';
import {createTrainingGame} from '../src/minigames/training/index.js';
test('rhythm matches lane and press window; spam and expired notes count once',()=>{
 const e=createRhythm(8),first=e.view().notes[0];e.step(first.at-NOTE_WINDOW+.001);e.input({type:'note',lane:first.lane});assert.equal(e.view().hits,1);
 e.input({type:'note',lane:first.lane});assert.equal(e.view().hits,1);assert.equal(e.view().misses,1);
 const late=createRhythm(8);late.step(first.at+NOTE_WINDOW+.01);assert.equal(late.view().misses,1);late.step(.01);assert.equal(late.view().misses,1);
 late.input({type:'note',lane:first.lane});assert.equal(late.view().hits,0);
});
test('both schools can be won across 100 seeds, end once, and never reward after completion',()=>{
 for(let seed=1;seed<=100;seed++){
  const rhythm=createTrainingGame('dab',seed);for(const n of rhythm.view().notes.slice(0,10)){rhythm.step(n.at-rhythm.view().time);rhythm.input({type:'note',lane:n.lane});}
  assert.ok(rhythm.completed());assert.equal(rhythm.score(),100);const before=rhythm.view();rhythm.step(100);rhythm.input({type:'note',lane:0});assert.deepEqual(rhythm.view(),before);
  const slice=createTrainingGame('ngiw',seed);for(let i=0;i<1000&&!slice.view().done;i++){slice.step(.05);for(const p of slice.view().logs.filter(p=>p.state==='waiting'&&p.y<.9))slice.input({type:'slice',from:{x:p.x-.12,y:p.y},to:{x:p.x+.12,y:p.y}});}
  assert.ok(slice.completed(),`seed ${seed}`);assert.equal(slice.score(),100);
 }
});
test('slices use complete swept segment, not only endpoint; each log counts once',()=>{
 assert.equal(segmentDistance({x:.5,y:.5},{x:0,y:.5},{x:1,y:.5}),0);
 const e=createSlicing(1);e.step(1.5);const p=e.view().logs[0],stroke={type:'slice',from:{x:0,y:p.y},to:{x:1,y:p.y}};
 e.input(stroke);e.input(stroke);assert.equal(e.view().hits,1);
});
test('idle play loses; malformed inputs and pause cancellation cannot create hits',()=>{
 for(const e of [createRhythm(1),createSlicing(1)]){const v=e.view();e.step(NaN);e.step(-5);for(const a of [null,'cancel',{}, {type:'note',lane:NaN},{type:'slice',from:{x:NaN,y:0},to:{x:1,y:1}}])e.input(a);assert.deepEqual(e.view(),v);for(let i=0;i<400;i++)e.step(.1);assert.ok(e.view().done);assert.equal(e.completed(),false);}
});
import {runPanel} from '../src/minigames/training/panel-host.js';
test('both sword hosts freeze inputs/time while paused or hidden and remove frames/listeners on close',()=>{
 const old=globalThis.document;const doc=Object.assign(new EventTarget(),{hidden:false});globalThis.document=doc;
 try {for(const create of [createRhythm,createSlicing]){
  const engine=create(7);let frame=null,paused=false,alive=true,abandoned=0,context,destroyed=0;
  const stop=runPanel({replaceChildren(){}},{seconds:30,ui:(host,e,ctx)=>{context=ctx;ctx.listen(doc,'test-input',()=>ctx.input({type:'note',lane:0}));return{update(){},destroy(){destroyed++;}};}},engine,
   {session:{id:'test'},paused:()=>paused,alive:()=>alive,onResult:()=>assert.fail('no finish'),onAbandon:()=>abandoned++,raf:fn=>(frame=fn,1),caf:()=>frame=null});
  frame(0);frame(100);const before=engine.view();paused=true;frame(10000);context.input({type:'note',lane:0});assert.deepEqual(engine.view(),before);
  paused=false;doc.hidden=true;frame(20000);doc.dispatchEvent(new Event('test-input'));assert.deepEqual(engine.view(),before);
  doc.hidden=false;alive=false;frame(20100);assert.equal(abandoned,1);assert.equal(frame,null);assert.equal(destroyed,1);stop();assert.equal(destroyed,1);
  doc.dispatchEvent(new Event('test-input'));assert.deepEqual(engine.view(),before);
 }}finally{globalThis.document=old;}
});
