import test from 'node:test';import assert from 'node:assert/strict';import {repairAlpha}from'../src/map-floor-repair.js';
test('local floor patch fills missing owner-floor pixels without painting solid existing art or off-floor objects',()=>{
 const cells=Uint8Array.from([0,0,0,0,0,1,1,0,0,1,1,0]),rgba=new Uint8ClampedArray(4*2*4);rgba[(1)*4+3]=255;
 const out=repairAlpha(rgba,cells,{cols:4,x:0,y:1,width:4,height:2});
 assert.deepEqual([...out].filter((_,i)=>i%4===3),[0,0,255,0,0,255,255,0]);
 assert.equal(rgba[5*4+3],0);assert.equal(cells[0],0);
});
test('residual material fill rejects a large geometry mismatch instead of hiding it',async()=>{
 const {checkResidualInfill}=await import('../src/map-floor-repair.js');assert.doesNotThrow(()=>checkResidualInfill(917,1024));assert.throws(()=>checkResidualInfill(5207,1024),/targeted art patch/);
});
