import test from 'node:test';import assert from 'node:assert/strict';
import {drawTerrainDetail,terrainDetailStats} from '../src/terrain-detail.js';
test('terrain detail resamples once per device size, stays within the hard budget and avoids full-world zoom canvases',()=>{
 const old=globalThis.document;let builds=0;const blits=[];
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){builds++;}})})};
 const ctx={getTransform:()=>({a:2,d:2,b:0,c:0}),drawImage:(...a)=>blits.push(a)};
 try{
 const image={width:1024,height:1024},rect=[0,0,700,700];drawTerrainDetail(ctx,image,rect);drawTerrainDetail(ctx,image,rect);assert.equal(builds,1);assert.equal(blits[0][0],blits[1][0]);assert.notEqual(blits[0][0],image);
 for(let i=0;i<15;i++)drawTerrainDetail(ctx,{width:1024,height:1024},rect);
 assert.ok(terrainDetailStats().pixels<=terrainDetailStats().hardPixels);
 const n=builds;drawTerrainDetail(ctx,image,[0,0,3840,2560]);assert.equal(builds,n);assert.equal(blits.at(-1)[0],image);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});

// PERF-1110: the soft budget (16 M px) must never evict a tile the camera is still drawing - that was a 6 fps thrash at DPR 2 (16 tiles / ~36 M px visible)
test('terrain detail: the working set (tiles drawn in the last 1.5 s) is kept above the soft budget; cold tiles are trimmed; the hard budget falls back to the source image',()=>{
 const old=globalThis.document,realNow=performance.now.bind(performance);let builds=0,clock=1e6;const blits=[];
 performance.now=()=>clock;
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){builds++;}})})};
 const ctx={getTransform:()=>({a:2,d:2,b:0,c:0}),drawImage:(...a)=>blits.push(a)};
 try{
  const tiles=Array.from({length:12},()=>({width:1024,height:1024})),rect=[0,0,700,700];   // 12 x 1.96 M px = 23.5 M px > 16 M soft budget
  for(const t of tiles)drawTerrainDetail(ctx,t,rect);
  assert.equal(builds,12);
  const stats=terrainDetailStats();assert.ok(stats.pixels>stats.maxPixels,'the working set may exceed the soft budget');
  for(let frame=0;frame<5;frame++){clock+=16;for(const t of tiles)drawTerrainDetail(ctx,t,rect);}
  assert.equal(builds,12,'the same 12 tiles on the following frames are cache hits - no re-resample');
  clock+=5000;                                   // the camera moved away: every old tile is cold now
  const fresh={width:1024,height:1024};drawTerrainDetail(ctx,fresh,rect);
  assert.ok(terrainDetailStats().pixels<=terrainDetailStats().maxPixels,'cold tiles are trimmed back to the soft budget');
  // hard budget: tiles that are all hot and would exceed it are blitted from the source instead of allocating
  clock+=5000;const hard=terrainDetailStats().hardPixels,big=[];
  for(let i=0;i<Math.ceil(hard/1_960_000)+3;i++){big.push({width:1024,height:1024});drawTerrainDetail(ctx,big[i],rect);}
  assert.ok(terrainDetailStats().pixels<=hard,'never above the hard budget');
  assert.equal(blits.at(-1)[0],big.at(-1),'the tile that did not fit is drawn straight from the image');
 }finally{performance.now=realNow;if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
