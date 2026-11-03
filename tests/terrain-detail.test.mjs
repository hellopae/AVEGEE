import test from 'node:test';import assert from 'node:assert/strict';
import {drawTerrainDetail,terrainDetailStats} from '../src/terrain-detail.js';
test('terrain detail resamples once per device size, evicts within budget and avoids full-world zoom canvases',()=>{
 const old=globalThis.document;let builds=0;const blits=[];
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){builds++;}})})};
 const ctx={getTransform:()=>({a:2,d:2,b:0,c:0}),drawImage:(...a)=>blits.push(a)};
 try{
 const image={width:1024,height:1024},rect=[0,0,700,700];drawTerrainDetail(ctx,image,rect);drawTerrainDetail(ctx,image,rect);assert.equal(builds,1);assert.equal(blits[0][0],blits[1][0]);assert.notEqual(blits[0][0],image);
 for(let i=0;i<15;i++)drawTerrainDetail(ctx,{width:1024,height:1024},rect);
 assert.ok(terrainDetailStats().pixels<=terrainDetailStats().maxPixels);
 const n=builds;drawTerrainDetail(ctx,image,[0,0,3840,2560]);assert.equal(builds,n);assert.equal(blits.at(-1)[0],image);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
