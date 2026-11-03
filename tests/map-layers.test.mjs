import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapLayers,layerRect} from '../src/map-layers.js';
const camera={x:-100,y:-50},viewport={w:1000,h:600};
test('floor stays registered to actors; only distant scenery uses parallax',()=>{
 assert.deepEqual(layerRect({space:'world',rect:[.2,.3,.4,.5]},camera,viewport),{x:100,y:130,w:400,h:300});
 assert.equal(layerRect({parallax:.5},camera,viewport).x,-50);
 assert.throws(()=>createMapLayers([{id:'floor',space:'world',parallax:.7}]),/World geometry/);
 assert.throws(()=>createMapLayers([{id:'water',motion:[2,0]}]),/clip/);
});
function recorder(){const draws=[];return {draws,save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},drawImage(...a){draws.push(a);}};}
test('water texture scrolls under fixed banks, freezes when paused or reduced',async()=>{
 const m=createMapLayers([{id:'water',src:'water',motion:[10,0],clip:[[0,0],[1,0],[1,1],[0,1]]}],{loadImage:async()=>({})});await m.ready;
 const x=()=>{const c=recorder();m.draw(c,{camera,viewport});return c.draws[0][1];};
 m.tick(0);const start=x();m.tick(50);const moved=x();assert.equal(moved-start,.5);
 m.tick(100,{paused:true});assert.equal(x(),moved);
 m.tick(150,{reduced:true});assert.equal(x(),moved);
 m.destroy();const c=recorder();m.draw(c,{camera,viewport});assert.equal(c.draws.length,0);
});
test('loads sequentially, reports missing layers, and releases late loads after destroy',async()=>{
 let calls=0,release;const m=createMapLayers([{id:'first',src:'a'},{id:'second',src:'b'}],{loadImage:()=>{calls++;return new Promise(r=>release=r);}});
 assert.equal(calls,1);m.destroy();release({});await m.ready;assert.equal(calls,1);
 const bad=createMapLayers([{id:'bad',src:'x'}],{loadImage:async()=>{throw Error('missing');}});await bad.ready;assert.deepEqual(bad.errors,['bad']);
});
