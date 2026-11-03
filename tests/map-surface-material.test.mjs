import test from 'node:test';import assert from 'node:assert/strict';import {surfaceAlpha}from'../src/map-surface-material.js';
test('moving materials select river/lava colors and preserve alpha, leaving paving and vegetation fixed',()=>{
 const pixels=Uint8ClampedArray.from([20,160,220,255,240,100,20,200,210,180,140,255,40,140,30,255,220,220,230,255]);
 assert.deepEqual([...surfaceAlpha(pixels,'water')].filter((_,i)=>i%4===3),[255,0,0,0,0]);
 assert.deepEqual([...surfaceAlpha(pixels,'lava')].filter((_,i)=>i%4===3),[0,200,0,0,0]);
 assert.equal(surfaceAlpha(pixels,'unsupported').some(Boolean),false);
});
test('authored flow masks select only their encoded material, never color-match rocks',async()=>{
 const {flowSurfaceAlpha}=await import('../src/map-surface-material.js');const p=Uint8ClampedArray.from([0,160,240,255,40,128,128,255,80,128,128,255,120,128,128,255,160,128,128,255,200,128,128,255]);
 assert.deepEqual([...flowSurfaceAlpha(p,'water')].filter((_,i)=>i%4===3),[0,0,0,0,255,255]);
 assert.deepEqual([...flowSurfaceAlpha(p,'lava')].filter((_,i)=>i%4===3),[0,0,255,255,0,0]);
});
test('sprite frames wrap exactly without moving the bank mask',async()=>{
 const {spriteFrame}=await import('../src/map-surface-material.js'),sheet={cols:4,rows:2,frames:8,fps:8};
 assert.deepEqual(spriteFrame(0,sheet),[0,0,.25,.5]);assert.deepEqual(spriteFrame(125,sheet),[.25,0,.25,.5]);assert.deepEqual(spriteFrame(1000,sheet),spriteFrame(0,sheet));
 assert.throws(()=>spriteFrame(0,{cols:2,rows:2,frames:8,fps:8}),/grid/);
});
test('faint blue/orange extraction halos do not become moving water beyond a bank',()=>{
 const p=Uint8ClampedArray.from([10,150,220,50,250,90,20,30]);assert.equal(surfaceAlpha(p,'water').some(Boolean),false);assert.equal(surfaceAlpha(p,'lava').some(Boolean),false);
});
