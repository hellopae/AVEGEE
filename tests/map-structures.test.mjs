import test from 'node:test';import assert from 'node:assert/strict';
import {traceStructureRuns,structureFootBlocked,drawStructureDepth}from'../src/map-structures.js';
test('post silhouette occludes actors, but only its foot blocks the floor',()=>{
 const rgba=new Uint8Array(10*10*4);for(let y=1;y<8;y++)for(let x=3;x<6;x++)rgba[(y*10+x)*4+3]=255;
 const s=traceStructureRuns(rgba,10,10);assert.equal(s.pieces.length,3);
 assert.equal(structureFootBlocked(s,[.4,.2]),false);assert.equal(structureFootBlocked(s,[.4,.7]),true);assert.equal(structureFootBlocked(s,[.6,.7]),false);
 let draws=0;const ctx={save(){},restore(){},beginPath(){},rect(){},clip(){},drawImage(){draws++;}},im={complete:true,naturalWidth:10};
 drawStructureDepth(ctx,im,s,{x:0,y:0,w:100,h:100,after:0,through:.5});assert.equal(draws,0);
 drawStructureDepth(ctx,im,s,{x:0,y:0,w:100,h:100,after:.5,through:.9});assert.equal(draws,1);
 drawStructureDepth(ctx,im,s,{x:0,y:0,w:100,h:100,after:.9,through:1});assert.equal(draws,1);
});
test('faint fringes and one-pixel noise cannot block walking',()=>{
 const rgba=new Uint8Array(8*8*4);for(let y=0;y<8;y++)rgba[(y*8)*4+3]=100;rgba[(5*8+5)*4+3]=255;
 const s=traceStructureRuns(rgba,8,8);assert.equal(s.pieces.length,0);assert.equal(s.blocked.reduce((a,b)=>a+b),0);
});
test('structure feet subtract physical blockers without reopening the owner floor',async()=>{
 const {maskWithoutStructureFeet}=await import('../src/map-structures.js');
 const mask={cols:4,rows:2,runs:[1,5,2]},blocked=Uint8Array.from([1,0,1,0,0,0,0,0]);
 assert.deepEqual(maskWithoutStructureFeet(mask,{width:4,height:2,blocked}).runs,[1,1,1,3,2]);
 assert.deepEqual(mask.runs,[1,5,2]);
 assert.throws(()=>maskWithoutStructureFeet(mask,{width:2,height:4,blocked}),/same grid/);
});
test('a tower window is grouped with its support, not added as an aerial collision foot',()=>{
 const rgba=new Uint8Array(4*30*4);for(const [from,to]of [[2,9],[13,22]])for(let y=from;y<to;y++)rgba[(y*4+1)*4+3]=255;
 const s=traceStructureRuns(rgba,4,30,{mergeGap:5});assert.equal(s.pieces.length,2);assert.equal(s.pieces[0].depth,22/30);
 assert.equal(structureFootBlocked(s,[.3,8/30]),false);assert.equal(structureFootBlocked(s,[.3,21/30]),true);
});
test('high-resolution structure feet sample into the owner grid without changing the owner mask',async()=>{
 const {structureFootGrid}=await import('../src/map-structures.js');const b=new Uint8Array(8*8);b[5*8+3]=1;
 const s=structureFootGrid({width:8,height:8,blocked:b},4,4);assert.equal(s.width,4);assert.equal(s.blocked[2*4+1],1);assert.equal(s.blocked.reduce((a,b)=>a+b),1);
});
