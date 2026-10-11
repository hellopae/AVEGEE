import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the real renderer and pointer/tick movement with a recording canvas.
// This does not substitute for a browser screenshot or a gameplay QA run.
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
globalThis.fetch = async () => ({ok:true, json:async () => manifest});
const keys = ['sala','krata','dab','ngiw','lan','sawan','krajok','tarang','lokan'];
const { wideStationRoom } = await import('../src/room-art-assets.js');
function dimensions(src) {
  const b = readFileSync(new URL('../' + src, import.meta.url));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF');
  assert.equal(b.toString('ascii', 8, 12), 'WEBP');
  for (let i = 12; i < b.length;) {
    const n = b.readUInt32LE(i + 4);
    if (b.toString('ascii', i, i + 4) === 'VP8 ') {
      assert.equal(b.subarray(i + 11, i + 14).toString('hex'), '9d012a');
      return [b.readUInt16LE(i + 14) & 0x3fff, b.readUInt16LE(i + 16) & 0x3fff];
    }
    // F3 local repairs use lossless WebP to preserve original pixels outside the patch.
    if (b.toString('ascii', i, i + 4) === 'VP8L') {
      assert.equal(b[i + 8], 0x2f);
      const bits = b.readUInt32LE(i + 9);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    i += 8 + n + (n % 2);
  }
  throw Error('Expected VP8/VP8L WebP: ' + src);
}
globalThis.Image = class {
  set src(v) {
    this._src = v;
    if (/img\/rooms-wide\//.test(v)) {
      [this.naturalWidth, this.naturalHeight] = dimensions(v);
      queueMicrotask(() => this.onload?.());
    }
  }
  get src() { return this._src; }
};
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
const { ROOMS, STATIONS } = await import('../src/data.js');
const { makeRoom, walkSegmentInside } = await import('../src/room.js');
const { roomExit, nearRoomExit } = await import('../src/proximity.js');
const art = await import('../src/art.js');
await new Promise(resolve => setImmediate(resolve));
art.bindZone(() => 'asia');

function inside(x, y, walk) {
  return walk.some(({poly}) => {
    let hit = false;
    for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const a=poly[i],b=poly[j];
      if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
    }
    return hit;
  });
}
async function fixture(key, zone) {
  const config = wideStationRoom(zone,key);
  const calls = [], handlers = {};
  const context = new Proxy({
    createLinearGradient: () => ({addColorStop(){}}),
    drawImage(...args) { calls.push(args); },
    measureText: () => ({width:20}),
  }, {get:(o,k) => k in o ? o[k] : () => {}});
  // Actual desktop CSS frame at 1280x800: dialog width 1280-32;
  // round backing-store height exactly as room.js does.
  const canvas = {width:0,height:0,getContext:() => context,
    getBoundingClientRect:() => ({left:0,top:0,width:1248,height:1248*1025/1913}),
    addEventListener:(name,fn) => {handlers[name]=fn;}, removeEventListener:() => {}};
  const src = config.image;
  const room = makeRoom(canvas, {zone,items:[],held:[],sentences:[]},
    STATIONS.find(s => s.k===key), config, src, null);
  room.start(); await new Promise(resolve => setImmediate(resolve)); room.tick(0);
  return {config,canvas,calls,room,handlers,src};
}

test('all 36 regional rooms draw their new background and allow service, training and exit travel', async () => {
  for (const zone of ['th','asia','west','cyberhell']) for (const key of keys) {
    const f = await fixture(key,zone), allowed=(x,y)=>inside(x,y,f.config.walk);
    async function walkTo(target) {
      assert.ok(allowed(...target),`${zone}/${key}: floor destination`);
      const [cx,cy] = f.room.project(target);
      f.handlers.pointerdown({clientX:cx,clientY:cy});
      for(let n=0;n<1200 && Math.hypot(f.room.pos()[0]-target[0],f.room.pos()[1]-target[1])>.009;n++) {
        f.room.tick(16); assert.ok(allowed(...f.room.pos().slice(0,2)));
      }
      assert.ok(Math.hypot(f.room.pos()[0]-target[0],f.room.pos()[1]-target[1])<=.009,`${zone}/${key}: reaches ${target}`);
    }
    try {
      const draw=f.calls.findLast(a=>a.length===9 && a[0].src===f.src);
      assert.ok(draw,`${zone}/${key}: new room rendered`);
      const [,,,,,ox,oy,w,h]=draw;
      assert.ok(ox<=.5 && oy<=.5 && w>=f.canvas.width-.5 && h>=f.canvas.height-.5);
      const exit=roomExit(key,zone,f.config);
      assert.equal(nearRoomExit(f.room.pos(),exit),false);
      await walkTo([.5,.78]); await walkTo(f.config.act); assert.ok(f.room.inReach());
      await walkTo([.5,.78]);
      if(f.config.training) {
        await walkTo(f.config.training); assert.ok(f.room.inTrainingReach()); await walkTo([.5,.78]);
      }
      await walkTo([exit.x,exit.y]); assert.ok(nearRoomExit(f.room.pos(),exit));
      assert.equal(walkSegmentInside(.5,.94,.1,.94,allowed),false);
    } finally { f.room.destroy(); }
  }
});
