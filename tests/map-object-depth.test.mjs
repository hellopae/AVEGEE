import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionDepthPixels,drawObjectDepthQueue,authoredObjectFootGrid} from '../src/map-object-depth.js';
const rect=(id,x,y,w,h,baseline,extra={})=>({id,baseline,polygon:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],...extra});
test('a doorway hole stays in the base, overlapping silhouettes own each source pixel once',()=>{
 const rgba=new Uint8ClampedArray(6*6*4);for(let i=0;i<rgba.length;i++)rgba[i]=(i%4===3)?(i%8?180:255):(i*11)%256;
 const original=rgba.slice();const spec={size:[6,6],pieces:[rect('arch',1,0,4,5,5,{holes:[[[2,2],[4,2],[4,5],[2,5]]]}),rect('tree',3,1,3,5,6)]};
 const r=partitionDepthPixels(rgba,6,6,spec);assert.deepEqual(rgba,original);
 assert.equal(r.owner[3*6+2],0);assert.equal(r.owner[1*6+3],1);assert.equal(r.objects[0].depth,5/6);
 const restored=r.base.slice();for(const o of r.objects){const x=Math.round(o.rect[0]*6),y=Math.round(o.rect[1]*6);for(let py=0;py<o.height;py++)for(let px=0;px<o.width;px++){const i=(py*o.width+px)*4;if(o.data[i+3])restored.set(o.data.subarray(i,i+4),((y+py)*6+x+px)*4);}}
 assert.deepEqual(restored,rgba);assert.equal(r.objects.reduce((n,o)=>n+o.pixels,0),[...r.owner].filter(Boolean).length);
});
test('object scale preserves normalized baseline and rejects duplicate IDs',()=>{
 const rgba=new Uint8ClampedArray(4*4*4).fill(255),p=rect('gate',0,0,8,8,6);
 assert.equal(partitionDepthPixels(rgba,4,4,{size:[8,8],pieces:[p]}).objects[0].depth,.75);
 assert.throws(()=>partitionDepthPixels(rgba,4,4,{size:[8,8],pieces:[p,p]}),/identity/);
});
test('foliage, actor and rail slices interleave by feet; actor wins a baseline tie',()=>{
 const order=[],ctx={drawImage:image=>order.push(image)},scene={width:10,height:10,objects:[{image:'tree',depth:.7,rect:[0,0,1,1]},{image:'gate',depth:.3,rect:[0,0,1,1]}]};
 drawObjectDepthQueue(ctx,scene,{actors:[{depth:.5,draw:()=>order.push('hero')},{depth:.7,draw:()=>order.push('equal-foot')}],rails:{image:'rails',structure:{}},drawRails:(c,i,s,v)=>order.push([v.after,v.through??Infinity])});
 assert.deepEqual(order, [[-Infinity,.3],'gate',[.3,.5],'hero',[.5,.7],'tree',[.7,.7],'equal-foot',[.7,Infinity]]);
});

test('authored post feet block pedestals while the arch opening and roof stay non-solid',()=>{
 const spec={size:[10,10],pieces:[{footprints:[[1,8,3,10],[7,8,9,10]]}]},g=authoredObjectFootGrid(spec,10,10);
 assert.equal(g.blocked[9*10+1],1);assert.equal(g.blocked[9*10+8],1);assert.equal(g.blocked[9*10+5],0);assert.equal(g.blocked[2*10+1],0);assert.equal(g.blocked.reduce((n,v)=>n+v,0),8);
 assert.throws(()=>authoredObjectFootGrid({size:[10,10],pieces:[{footprints:[[2,2,12,8]]}]},10,10),/foot rectangle/);
});
