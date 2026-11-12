import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { TEA_SLEEP_MS, teaRoom } from '../src/tea-recovery.js';
import { makeRoom } from '../src/room.js';
// own file = own process: art.js remembers a lost picture for 10 s, so this must not share a process with a test that loses the same file
const game = () => { const g=createGame(); g.save=()=>true; g.onChange=()=>{}; return g; };

test('FB2-13: sleeping waits (max 8 s) for the lying picture so the bed is never empty, then carries on',async()=>{
 const noop=()=>{}; const ctx=new Proxy({}, {get:(obj,key)=>key in obj?obj[key]:key==='measureText'?()=>({width:0}):()=>new Proxy({}, {get:()=>noop})});
 const prevWindow=globalThis.window,prevDocument=globalThis.document,PrevImage=globalThis.Image;
 globalThis.window={addEventListener:noop,removeEventListener:noop};globalThis.devicePixelRatio=1;globalThis.addEventListener=noop;globalThis.removeEventListener=noop;
 globalThis.document={createElement:()=>({getContext:()=>ctx})};
 globalThis.Image=class{set src(v){this._src=v;} get src(){return this._src;}};          // never loads, never fails
 globalThis.Image.prototype.onerror=null;
 try {
  const cv={width:900,height:620,getContext:()=>ctx,addEventListener:noop,removeEventListener:noop,getBoundingClientRect:()=>({width:900,height:620})};
  const g=game();g.zone='asia';g.hp=10;
  const R=makeRoom(cv,g,STATIONS.find(d=>d.k==='tea'),teaRoom('asia'),'img/tea-asia-recovery.webp',null);
  const bed=teaRoom('asia').bed;R.setSleep(true);
  R.tick(3000);assert.equal(g.hp,10,'the sleep clock waits while the picture is still loading');assert.equal(R.sleeping(),true);
  R.tick(5200);R.tick(TEA_SLEEP_MS);assert.equal(g.hp,g.hpMax,'after the 8 s cap the sleep goes on without the picture');
 } finally {globalThis.window=prevWindow;globalThis.document=prevDocument;globalThis.Image=PrevImage;}
});
