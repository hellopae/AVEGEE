import test from 'node:test';
import assert from 'node:assert/strict';

let serial=0;
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
async function fixture(options={}) {
  const original={Image:globalThis.Image,HTMLImageElement:globalThis.HTMLImageElement,document:globalThis.document,
    setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,now:Date.now};
  let time=100000,nextId=0;const timers=new Map(),images=[];
  globalThis.setTimeout=(fn,ms)=>{const id=++nextId;timers.set(id,{fn,at:time+ms});return id;};
  globalThis.clearTimeout=id=>timers.delete(id);Date.now=()=>time;
  class FakeImage {
    naturalWidth=4;naturalHeight=4;
    constructor(){images.push(this);}
    set src(value){this._src=value;}
    get src(){return this._src;}
    decode(){return options.decode?.(this)??Promise.resolve();}
  }
  globalThis.Image=FakeImage;
  if(options.repairs)globalThis.HTMLImageElement=FakeImage;else delete globalThis.HTMLImageElement;
  const gradient=()=>({addColorStop(){}});
  const canvasContext={drawImage(){},putImageData(){},fillRect(){},createLinearGradient:gradient,
    getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})};
  globalThis.document={createElement:()=>({width:4,height:4,getContext:()=>canvasContext,toDataURL:()=> 'data:image/png;base64,AA=='})};
  const module=await import(`../src/town-terrain.js?loading-audit=${++serial}`);
  const context={canvas:{width:options.w??700,height:options.h??500},save(){},restore(){},drawImage(){},
    getTransform:()=>({a:1,d:1,b:0,c:0,e:options.x?-options.x:0,f:options.y?-options.y:0})};
  return {module,images,draw:()=>module.drawTownTerrain(context,null,0,true),chunks:()=>images.filter(im=>/\/r\d-c\d\.webp/.test(im.src)),
    async advance(ms){const end=time+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;time=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}time=end;await flush();},
    restore(){for(const [key,value]of Object.entries(original)){if(key==='now')Date.now=value;else if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
  };
}

test('a failed sharp tile retries after backoff with a fresh URL while the decoded overview remains available',async()=>{
  const f=await fixture();try {
    const preview=f.module.preloadTownTerrainPreview();f.images[0].onload();await preview;
    f.draw();assert.equal(f.chunks().length,1);f.chunks()[0].onerror();
    assert.ok(f.module.townTerrainImage(),'a detail failure cannot discard the decoded overview');
    f.draw();await f.advance(999);f.draw();assert.equal(f.chunks().length,1,'no frame-by-frame retry storm');
    await f.advance(1);f.draw();assert.equal(f.chunks().length,2);assert.match(f.chunks()[1].src,/\?recover=/);
    await f.chunks()[1].onload();assert.equal(f.module.townTerrainStats().ready,1);
    assert.equal(f.module.townTerrainStats().loading,0);f.draw();
    assert.equal(f.chunks().filter(image=>image.src.split('?')[0]===f.chunks()[0].src).length,2,'successful detail is reused while neighboring tiles prefetch');
  }finally{f.restore();}
});

test('stalled requests release all three loading lanes and ignore late callbacks from the expired generation',async()=>{
  const f=await fixture({w:1300,h:900});try {
    f.draw();assert.equal(f.chunks().length,3);const expired=f.chunks().map(im=>im.onload);
    await f.advance(15000);assert.equal(f.module.townTerrainStats().loading,0);assert.equal(f.module.townTerrainStats().error,3);
    f.draw();assert.equal(f.chunks().length,4,'an unfetched visible tile can use a released lane');
    for(const callback of expired)await callback();assert.equal(f.module.townTerrainStats().loading,1);
    assert.equal(f.module.townTerrainStats().ready,0,'stale responses cannot publish expired images');
    await f.advance(1000);f.draw();assert.equal(f.module.townTerrainStats().loading,3);
    for(const callback of expired)await callback();assert.equal(f.module.townTerrainStats().loading,3,'old generations cannot decrement current lanes');
  }finally{f.restore();}
});

test('a decode that finishes after timeout cannot overwrite its successful replacement',async()=>{
  let finishOld;const f=await fixture({decode:image=>image.hang?new Promise(resolve=>{finishOld=resolve;}):Promise.resolve()});try {
    f.draw();const old=f.chunks()[0];old.hang=true;const pending=old.onload();await flush();
    await f.advance(16000);assert.equal(f.module.townTerrainStats().loading,0);f.draw();
    const replacement=f.chunks()[1];await replacement.onload();assert.equal(f.module.townTerrainStats().ready,1);
    finishOld();await pending;assert.equal(f.module.townTerrainStats().ready,1);assert.equal(f.module.townTerrainStats().loading,0);
  }finally{f.restore();}
});

test('optional terrain repair composition and decoding finish before the sharp tile becomes ready',async()=>{
  let finishRepair;const f=await fixture({repairs:true,x:1700,y:900,
    decode:image=>image.src?.startsWith('data:')?new Promise(resolve=>{finishRepair=resolve;}):Promise.resolve()});try {
    f.draw();const tile=f.chunks()[0];assert.match(tile.src,/r2-c3/);const pending=tile.onload();await flush();
    assert.equal(f.module.townTerrainStats().ready,0);assert.equal(f.module.townTerrainStats().loading,1);
    const patch=f.images.find(image=>/repairs\/r2-c3/.test(image.src));assert.ok(patch);patch.onload();await flush();
    assert.equal(typeof finishRepair,'function');assert.equal(f.module.townTerrainStats().ready,0);
    finishRepair();await pending;assert.equal(f.module.townTerrainStats().ready,1);assert.equal(f.module.townTerrainStats().loading,0);
  }finally{f.restore();}
});
