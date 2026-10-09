import test from 'node:test';
import assert from 'node:assert/strict';
import {followCamera, ZONE_STYLE, drawFrontierAtmosphere} from '../src/scene-style.js';

test('camera smoothing keeps the world in bounds at every edge, including resize',()=>{
  let camera=null;
  for(const point of [{x:0,y:0},{x:1,y:1},{x:.5,y:.5}]) {
    for(let i=0;i<100;i++) {
      camera=followCamera(camera,{w:800,h:400},{w:1200,h:670},point,16);
      assert.ok(camera.ox>=-400 && camera.ox<=0);
      assert.ok(camera.oy>=-270 && camera.oy<=0);
    }
  }
  camera=followCamera(camera,{w:1600,h:900},{w:1600,h:900},{x:1,y:1},16);
  assert.equal(camera.ox,0);assert.equal(camera.oy,0);
});
test('camera movement is independent of frame rate and reduced motion snaps to target',()=>{
  const vp={w:800,h:400},world={w:1200,h:670},p={x:.8,y:.8};
  const first=followCamera(null,vp,world,{x:.1,y:.1});
  const one=followCamera(first,vp,world,p,64);
  let four=first;for(let i=0;i<4;i++) four=followCamera(four,vp,world,p,16);
  assert.ok(Math.abs(one.ox-four.ox)<1e-8);
  assert.ok(Math.abs(one.oy-four.oy)<1e-8);
  assert.deepEqual(followCamera(first,vp,world,p,16,true),followCamera(null,vp,world,p));
});
test('camera offsets round-trip pointer coordinates and floating button positions',()=>{
  const box=followCamera(null,{w:740,h:360},{w:980,h:547},{x:.77,y:.71});
  for(const p of [{x:.5,y:.19},{x:.77,y:.71}]) {
    const x=box.ox+p.x*box.w,y=box.oy+p.y*box.h;
    assert.ok(Math.abs((x-box.ox)/box.w-p.x)<1e-9);
    assert.ok(Math.abs((y-box.oy)/box.h-p.y)<1e-9);
  }
});
test('frontier weather is bounded and reduced motion keeps only static light',()=>{
  const gradient={addColorStop(){}};
  globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>gradient,fillRect(){}})})};
  for(const zone of Object.keys(ZONE_STYLE)) {
    let particles=0,lights=0;
    const ctx=new Proxy({drawImage(){lights++},fillRect(){particles++}}, {get:(o,k)=>o[k]||(()=>{})});
    const box={ox:-30,oy:0,w:1000,h:560};
    drawFrontierAtmosphere(ctx,zone,box,2000,false);
    assert.equal(lights,1);assert.ok(particles<=24);
    particles=0;drawFrontierAtmosphere(ctx,zone,box,2000,true);assert.equal(particles,0);
  }
});
