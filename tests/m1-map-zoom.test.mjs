import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE } from '../src/data.js';
import { mapViewport, setMapViewport, prepareMapCanvas, toScene } from '../src/scene.js';

test('M1: camera edges and pointer round trips at both zoom levels, with letterboxing', () => {
  for (const [width,height] of [[1280,720],[720,1280],[1678,937]]) {
    const ratio = Math.min(width/SCENE.w,height/SCENE.h);
    const bw = Math.round(SCENE.w*ratio), bh = Math.round(SCENE.h*ratio);
    for (const z of [1,1.7,2.5]) for (const [x,y] of [[0,0],[880,455],[SCENE.w,SCENE.h]]) {
      const view = mapViewport(width,height,bw,bh,{z,x,y});
      const cv = {getBoundingClientRect:()=>({left:17,top:31,width:width/2,height:height/2})};
      setMapViewport(cv,view);
      if (bw*z >= width) { assert.ok(view.tx <= 0); assert.ok(view.tx+bw*z >= width-1e-9); }
      if (bh*z >= height) { assert.ok(view.ty <= 0); assert.ok(view.ty+bh*z >= height-1e-9); }
      for (const [sx,sy] of [[880,455],[835,400],[1500,800]]) {
        const event={clientX:17+(sx*view.sx+view.tx)/2,clientY:31+(sy*view.sy+view.ty)/2};
        const actual=toScene(cv,event);
        assert.ok(Math.abs(actual[0]-sx)<1e-9); assert.ok(Math.abs(actual[1]-sy)<1e-9);
      }
    }
  }
});

test('M1: backing follows viewport and capped DPR; redraw does not resize; smoothing stays high', () => {
  const previous=globalThis.devicePixelRatio;
  try {
    let writes=0, width=0, height=0;
    const cv={get width(){return width;},set width(v){width=v;writes++;},get height(){return height;},set height(v){height=v;writes++;}};
    const calls=[]; const ctx={canvas:cv,setTransform:(...v)=>calls.push(v),clearRect:()=>{}};
    for (const dpr of [1,1.5,2,3]) {
      globalThis.devicePixelRatio=dpr;
      const view=mapViewport(1280,720,1280,715,{z:2.5,x:880,y:455});
      setMapViewport(cv,view); prepareMapCanvas(ctx);
      assert.equal(width,1280*Math.min(2,dpr)); assert.equal(height,720*Math.min(2,dpr));
      const before=writes; prepareMapCanvas(ctx); assert.equal(writes,before);
      assert.equal(ctx.imageSmoothingEnabled,true); assert.equal(ctx.imageSmoothingQuality,'high');
      const transform=calls.at(-1); assert.equal(transform[0],view.sx*Math.min(2,dpr)); assert.equal(transform[4],view.tx*Math.min(2,dpr));
    }
    setMapViewport(cv,mapViewport(720,1280,720,402,{z:1,x:0,y:0}));
    prepareMapCanvas(ctx); assert.equal(width,1440); assert.equal(height,2560);
  } finally { if(previous===undefined) delete globalThis.devicePixelRatio; else globalThis.devicePixelRatio=previous; }
});

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('M1: UI camera keeps DOM anchors and pointers aligned at the locked 1x zoom', () => {
  const ui = readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
  const source = ui.slice(ui.indexOf('function updateMapCamera(now)'),ui.indexOf('\n/** ตัววาดฉากต่อสู้ซ้ำ'));
  for(const [width,height] of [[1440,820],[720,1100]]) {
    const ratio=Math.min(width/SCENE.w,height/SCENE.h);
    const bw=Math.round(SCENE.w*ratio),bh=Math.round(SCENE.h*ratio);
    const fabs={offsetLeft:100,offsetTop:200,style:{}};
    const box={querySelector:()=>fabs,offsetWidth:bw,offsetHeight:bh,offsetLeft:(width-bw)/2,offsetTop:(height-bh)/2,style:{},getBoundingClientRect(){return {left:this.offsetLeft,top:this.offsetTop};}};
    const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({left:0,top:0})}; const overlay={style:{}};
    const cv={style:{},getBoundingClientRect:()=>({left:0,top:0,width,height})};
    const mapCam={level:0,z:1,x:SCENE.w/2,y:SCENE.h/2,at:0,init:false};
    const g={player:{x:880,y:455}};
    const sandbox={SCENE,mapCam,g,cv,MAP_ZOOM_LEVELS:[1],mapViewport,setMapViewport,matchMedia:()=>({matches:false}),document:{querySelector:s=>s==='.stage'?stage:box,getElementById:()=>overlay}};
    vm.createContext(sandbox);vm.runInContext(source,sandbox);
    let now=0;
    const check=()=>{
      sandbox.updateMapCamera(now+=16);
      const match=overlay.style.transform.match(/translate\(([^p]+)px,([^p]+)px\) scale\(([^)]+)\)/);
      assert.ok(match); const [,tx,ty,z]=match.map(Number);
      for(const [sx,sy] of [[880,455],[835,400],[1100,570]]) {
        const px=box.offsetLeft+tx+sx/SCENE.w*bw*z;
        const py=box.offsetTop+ty+sy/SCENE.h*bh*z;
        const actual=toScene(cv,{clientX:px,clientY:py});
        assert.ok(Math.abs(actual[0]-sx)<1e-8);assert.ok(Math.abs(actual[1]-sy)<1e-8);
      }
      assert.equal(cv.style.width,`${width}px`);assert.equal(cv.style.height,`${height}px`);
      assert.equal(box.style.transform,undefined);
      const fm=fabs.style.transform.match(/translate\(([^p]+)px,([^p]+)px\) scale\(([^)]+)\)/).map(Number);
      assert.ok(Math.abs(fm[1]-(tx+(z-1)*fabs.offsetLeft))<1e-9);
      assert.ok(Math.abs(fm[2]-(ty+(z-1)*fabs.offsetTop))<1e-9);
    };
    check();
    for(let i=0;i<100;i++)check();
    g.player={x:SCENE.w,y:SCENE.h};for(let i=0;i<100;i++)check();
    assert.equal(mapCam.z,1);
  }
});

test('M1: downscaled sprites are resampled once per device size, then blitted from the cache', () => {
  const prevDoc = globalThis.document, prevImg = globalThis.HTMLImageElement, prevDpr = globalThis.devicePixelRatio;
  try {
    class Img { constructor(w,h){ this.naturalWidth=w; this.naturalHeight=h; this.complete=true; } }
    globalThis.HTMLImageElement = Img; globalThis.devicePixelRatio = 2;
    let built = 0; const drawn = [];
    globalThis.document = { createElement: () => { built++; return { getContext: () => ({ drawImage(){} }) }; } };
    const cv = { width:0, height:0 };
    class Ctx { setTransform(){} clearRect(){} getTransform(){ return { a:2, b:0, c:0, d:2, e:0, f:0 }; }
      drawImage(im, ...a){ drawn.push({ im, a, q:this.imageSmoothingQuality }); } }   // prototype method, like a real 2D context
    const ctx = Object.assign(new Ctx(), { canvas:cv });
    prepareMapCanvas(ctx);
    const sprite = new Img(512, 512);
    for (let i = 0; i < 5; i++) ctx.drawImage(sprite, 10 + i, 20, 90, 90);   // 180 device px from 512px source
    assert.equal(built, 1);
    assert.equal(drawn.length, 5);
    assert.ok(drawn.every(d => d.im !== sprite && d.q === 'low'));
    assert.equal(ctx.imageSmoothingQuality, 'high');
    const small = new Img(100, 100); ctx.drawImage(small, 0, 0, 90, 90);        // ~1:1 stays a direct draw
    assert.equal(drawn.at(-1).im, small); assert.equal(built, 1);
  } finally {
    globalThis.document = prevDoc; globalThis.HTMLImageElement = prevImg;
    if (prevDpr === undefined) delete globalThis.devicePixelRatio; else globalThis.devicePixelRatio = prevDpr;
  }
});
