import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the real renderer and pointer/tick movement with a recording canvas.
// This does not substitute for a browser screenshot or a gameplay QA run.
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
globalThis.fetch = async () => ({ok:true, json:async () => manifest});
const keys = ['sala','krata','dab','ngiw','lan','sawan','krajok','tarang'];
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
    if (/img\/Asia\/BG-/.test(v)) {
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
async function fixture(key) {
  const config = {...ROOMS[key], ...ROOMS[key].zones.asia};
  const calls = [], handlers = {};
  const context = new Proxy({
    drawImage(...args) { calls.push(args); },
    measureText: () => ({width:20}),
  }, {get:(o,k) => k in o ? o[k] : () => {}});
  // Actual desktop CSS frame at 1280x800: dialog width 1280-32;
  // round backing-store height exactly as room.js does.
  const canvas = {width:0,height:0,getContext:() => context,
    getBoundingClientRect:() => ({left:0,top:0,width:1248,height:1248*1025/1913}),
    addEventListener:(name,fn) => {handlers[name]=fn;}, removeEventListener:() => {}};
  const src = art.artUrl(`BG-${key[0].toUpperCase()}${key.slice(1)}`, 'webp');
  const room = makeRoom(canvas, {zone:'asia',items:[],held:[],sentences:[]},
    STATIONS.find(s => s.k===key), config, src, null);
  room.start(); await new Promise(resolve => setImmediate(resolve)); room.tick(0);
  return {config,canvas,calls,room,handlers,src};
}

test('29G: all eight manifest-selected Asia assets fill the real desktop renderer bounds', async () => {
  for (const key of keys) {
    const f=await fixture(key);
    try {
      assert.match(f.src, /^img\/Asia\/BG-.*-asia\.webp$/);
      assert.equal(manifest.zones.asia.filter(p => 'img/'+p===f.src).length,1);
      assert.deepEqual(dimensions(f.src),[1024,549]);
      const draw=f.calls.findLast(a => a.length===9 && a[0].src===f.src);
      assert.ok(draw, key + ': actual background draw recorded');
      const [,, ,sw,sh,ox,oy,w,h]=draw;
      assert.ok(Math.abs(sw/sh-1913/1025)<1e-10);
      assert.ok(ox>=0 && oy>=0);
      assert.ok(ox<.5 && oy<.5 && f.canvas.width-w<1 && f.canvas.height-h<1,
        key + ': no whole-pixel letterbox, backing-store rounding only');
    } finally { f.room.destroy(); }
  }
});

test('29G: pointer/tick walks from spawn to work point and back to the exit staircase', async () => {
  for (const key of keys) {
    const f=await fixture(key), allowed=(x,y)=>inside(x,y,f.config.walk);
    const route=key==='lan' ? [[.61,.66],[.63,.60],[.61,.56],f.config.act] : [f.config.act];
    async function walkTo(target) {
      assert.ok(allowed(...target),key+': destination on walkable floor');
      const [cx,cy]=f.room.project(target);
      f.handlers.pointerdown({clientX:cx,clientY:cy});
      for(let n=0;n<1200 && Math.hypot(f.room.pos()[0]-target[0],f.room.pos()[1]-target[1])>.009;n++) {
        f.room.tick(16);
        assert.ok(allowed(...f.room.pos().slice(0,2)),key+': stays in walkable area');
      }
      assert.ok(Math.hypot(f.room.pos()[0]-target[0],f.room.pos()[1]-target[1])<=.009,
        key+': reaches '+target+'; position '+f.room.pos());
    }
    try {
      assert.ok(allowed(...f.config.me));
      assert.ok(allowed(...f.config.crew));
      if (['sawan','tarang'].includes(key)) assert.ok(allowed(f.config.crew[0]+.13,f.config.crew[1]),key+': assigned crew');
      if(f.config.item) assert.ok(allowed(...f.config.item));
      assert.equal(nearRoomExit(f.config.me,roomExit(key,'asia',f.config)),false,key+': exit hidden at spawn');
      for(const target of route) await walkTo(target);
      assert.ok(f.room.inReach(),key+': can act');
      for(const target of route.slice(0,-1).reverse()) await walkTo(target);
      await walkTo(f.config.me);
      const exit=roomExit(key,'asia',f.config);
      await walkTo([exit.x,exit.y]);
      assert.ok(nearRoomExit(f.room.pos(),exit),key+': exit enabled at steps');
      assert.equal(walkSegmentInside(.5,.94,.1,.94,allowed),false,key+': cannot cross stair rail');
    } finally { f.room.destroy(); }
  }
});
