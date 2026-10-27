import {readReleaseFile,assertModuleRelease} from './helpers/release-imports.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { decodeFlow, createFlowEngine, seedFlow, FLOW_W, FLOW_H, FLOW_KIND, FLOW_MAX_PARTICLES, drawTownFlow } from '../src/town-flow.js';
import { townFloorAt, TOWN_SIZE, applyTownZoneLayout } from '../src/town-layout.js';

// Minimal PNG reader (8-bit RGB, non-interlaced) so the baked asset can be checked without a browser.
function readPng(file) {
  const b = readFileSync(file);
  let o = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (o < b.length) {
    const n = b.readUInt32BE(o), type = b.toString('ascii', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + n);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; assert.equal(d[8], 8); assert.equal(d[12], 0, 'not interlaced'); }
    if (type === 'IDAT') idat.push(d);
    o += 12 + n;
  }
  assert.equal(ct, 2, 'RGB');
  const raw = inflateSync(Buffer.concat(idat)), bpp = 3, stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, up = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[y * stride + x] = v & 255;
    }
  }
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = out[i * 3]; rgba[i * 4 + 1] = out[i * 3 + 1]; rgba[i * 4 + 2] = out[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
  return { w, h, rgba };
}

const baked = () => { const p = readPng('img/map-zone1/v4/flow-v4.png'); return decodeFlow(p.rgba, p.w, p.h); };

test('N4: baked flow map has every surface kind in the right part of the painting', () => {
  const f = baked();
  assert.equal(f.w, FLOW_W); assert.equal(f.h, FLOW_H);
  const n = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, ext = {};
  for (let i = 0; i < f.kind.length; i++) {
    const k = f.kind[i]; if (!k) continue;
    n[k]++;
    const x = i % f.w, y = (i / f.w) | 0, e = ext[k] ||= { x0: 1e9, x1: -1, y0: 1e9, y1: -1 };
    e.x0 = Math.min(e.x0, x); e.x1 = Math.max(e.x1, x); e.y0 = Math.min(e.y0, y); e.y1 = Math.max(e.y1, y);
  }
  for (const k of [1, 2, 3, 4, 5]) assert(n[k] > 3000, `kind ${k} has ${n[k]} cells`);
  // purple = the soul river across the whole width, below y 660; lava = west strip; ice = east side
  assert(ext[1].y0 > 650 && ext[1].x0 < 100 && ext[1].x1 > 1400);
  assert(ext[2].x1 < 545 && ext[3].x1 < 545);
  assert(ext[4].x0 > 900 && ext[5].x0 > 1100);
});

test('N4: flow directions are unit vectors, river runs left to right, falls point down', () => {
  const f = baked();
  let purpleRight = 0, purple = 0, fallDown = 0, fall = 0, bad = 0;
  for (let i = 0; i < f.kind.length; i++) {
    const k = f.kind[i]; if (!k) continue;
    const dx = f.dx[i] / 127, dy = f.dy[i] / 127, len = Math.hypot(dx, dy);
    if (Math.abs(len - 1) > .06) bad++;
    if (k === 1) { purple++; if (dx > .95) purpleRight++; }
    if (k === 3 || k === 5) { fall++; if (dy > .95) fallDown++; }
  }
  assert.equal(bad, 0, 'non-unit vectors');
  assert.equal(purpleRight, purple);
  assert.equal(fallDown, fall);
});

test('N4: the baked surfaces keep off bridges, stairs and the dock (walkable floor)', () => {
  const f = baked();
  let cells = 0, onFloor = 0;
  for (let y = 0; y < f.h; y += 2) for (let x = 0; x < f.w; x += 2) {
    if (!f.kind[y * f.w + x]) continue;
    cells++;
    if (townFloorAt((x + .5) * f.unitX, (y + .5) * f.unitY)) onFloor++;
  }
  assert(cells > 10000);
  assert(onFloor / cells < .02, `${onFloor}/${cells} surface cells on walkable floor`);
});

// ---- engine on a synthetic field: a river band running right, a lava column running down ----
function synthetic() {
  const w = 160, h = 100, kind = new Uint8Array(w * h), dx = new Int8Array(w * h), dy = new Int8Array(w * h);
  for (let y = 60; y < 80; y++) for (let x = 5; x < 150; x++) { kind[y * w + x] = 1; dx[y * w + x] = 127; }
  for (let y = 5; y < 50; y++) for (let x = 20; x < 30; x++) { kind[y * w + x] = 2; dy[y * w + x] = 127; }
  return { w, h, kind, dx, dy, unitX: TOWN_SIZE.w / w, unitY: TOWN_SIZE.h / h };
}
const whole = { x0: 0, y0: 0, x1: TOWN_SIZE.w, y1: TOWN_SIZE.h };

test('N4: particles stay on their painted surface and follow its flow', () => {
  seedFlow(7);
  const field = synthetic(), eng = createFlowEngine(field, { floorAt: () => false });
  const start = new Map();
  for (let f = 0; f < 30; f++) eng.update(1 / 60, whole);
  for (const p of eng.particles()) start.set(`${p.kind}`, (start.get(`${p.kind}`) || 0) + 1);
  assert(start.get('1') > 5 && start.get('2') > 5, 'both surfaces get particles');
  let sumDx = 0, sumDy = 0, riverN = 0, lavaN = 0;
  const before = eng.particles();
  for (let f = 0; f < 60; f++) {
    eng.update(1 / 60, whole);
    for (const p of eng.particles()) assert(eng.kindAt(p.x, p.y) > 0 || p.type === 4, 'particle left the surface');
  }
  void before;
  assert(eng.particles().length <= FLOW_MAX_PARTICLES);
  // direction check on a single step
  seedFlow(3);
  const e2 = createFlowEngine(field, { floorAt: () => false });
  e2.update(1 / 60, whole);
  const a = e2.particles().filter(p => p.type === 0 || p.type === 5).map(p => ({ ...p }));
  e2.update(.05, whole);
  const b = e2.particles();
  for (const p of b) {
    const q = a.find(o => Math.abs(o.x - p.x) < 5 && Math.abs(o.y - p.y) < 5 && o.kind === p.kind);
    if (!q) continue;
    if (p.kind === 1) { sumDx += p.x - q.x; riverN++; assert(Math.abs(p.y - q.y) < .01, 'river moves sideways only'); }
    if (p.kind === 2) { sumDy += p.y - q.y; lavaN++; assert(Math.abs(p.x - q.x) < .01, 'lava moves down only'); }
  }
  assert(riverN > 3 && sumDx > 0, `river particles moved right (${riverN})`);
  assert(lavaN > 3 && sumDy > 0, `lava particles moved down (${lavaN})`);
});

test('N4: nothing is simulated when the camera sees no water, and walkable floor kills particles', () => {
  seedFlow(5);
  const field = synthetic();
  const eng = createFlowEngine(field, { floorAt: () => false });
  for (let f = 0; f < 10; f++) eng.update(1 / 60, { x0: 3000, y0: 100, x1: 3400, y1: 300 });
  assert.equal(eng.particles().length, 0);
  const onFloor = createFlowEngine(field, { floorAt: () => true });
  for (let f = 0; f < 10; f++) onFloor.update(1 / 60, whole);
  assert.equal(onFloor.particles().length, 0, 'floor is never covered');
});

test('N4: drawing is plain sprite quads (no ctx.filter / shadowBlur) and reduced motion draws nothing', () => {
  seedFlow(11);
  const fake = {}, sprites = { streak: [null, fake, fake, fake, fake, fake], spark: fake, ring: fake, glow: fake, mist: fake };
  const eng = createFlowEngine(synthetic(), { floorAt: () => false, sprites });
  for (let f = 0; f < 20; f++) eng.update(1 / 60, whole);
  const calls = [], forbidden = [];
  const ctx = new Proxy({}, {
    get: (_, k) => (...a) => { calls.push(k); },
    set: (_, k, v) => { if (k === 'filter' || k === 'shadowBlur') forbidden.push(k); calls.push('set:' + String(k)); return true; },
  });
  eng.draw(ctx, 1, 1000);
  assert(calls.filter(c => c === 'drawImage').length > 10, 'streaks are sprite quads');
  assert(!calls.includes('stroke') && !calls.includes('beginPath'), 'no screen-sized stroked paths (slow on the GPU)');
  assert.deepEqual(forbidden, []);
  // module-level wrapper with reduced motion: nothing at all, not even a transform read
  const spy = new Proxy({}, { get: (_, k) => () => { throw new Error('reduced motion touched ctx.' + String(k)); }, set: () => { throw new Error('set'); } });
  assert.doesNotThrow(() => drawTownFlow(spy, 1000, true));
});

test('N4: scene.js hands the town ground to town-flow and the old colour-guess ambience is off for the town', () => {
  const scene = readFileSync('src/scene.js', 'utf8');
  const flow = readFileSync('src/town-flow.js', 'utf8');
  assert.match(scene, /drawTownFlow\(ctx,t,reduced\)/);
  assert.doesNotMatch(scene, /drawMapAmbientGround\(ctx,townTerrainImage\(\),'town-th'/);
  assertModuleRelease('src/scene.js',readReleaseFile('index.html'),'src/ui.js');
  assertModuleRelease('src/town-flow.js',readReleaseFile('index.html'),'src/scene.js');
  assert.doesNotMatch(flow, /TMPDEBUG|globalThis\.__(?:dens|fp|noFlow)/, 'release has no debug flow controls');
  assert(readdirSync('img/map-zone1/v4').includes('flow-v4.png'));
});

test('L3: Asia repaint flow excludes walkable floor and bridges, with bounded particles', () => {
  const p=readPng('img/map-zone2/v2/flow-v2.png'),f=decodeFlow(p.rgba,p.w,p.h);
  assert.equal(f.w,FLOW_W);assert.equal(f.h,FLOW_H);
  const count={2:0,3:0,4:0,5:0};
  for(let i=0;i<f.kind.length;i++){
    const k=f.kind[i];if(!k)continue;assert.ok(k in count);count[k]++;
    assert.ok(Math.abs(Math.hypot(f.dx[i],f.dy[i])/127-1)<.06,'unit flow direction');
    if(k===3||k===5){assert.equal(f.dx[i],0);assert.equal(f.dy[i],127);}
  }
  for(const k of [2,3,4,5])assert.ok(count[k]>2000,`surface ${k} present`);
  for(const [x,y]of [[375,250],[360,390],[1170,165],[980,394],[1285,625],[768,740]])
    assert.equal(f.kind[y*f.w+x],0,`bridge ${x},${y} stays dry`);
  applyTownZoneLayout('asia');
  try{
    for(let y=0;y<f.h;y+=2)for(let x=0;x<f.w;x+=2){
      if(f.kind[y*f.w+x])assert.equal(townFloorAt((x+.5)*f.unitX,(y+.5)*f.unitY),false,'no effects on walkable floor');
    }
    seedFlow(7);const e=createFlowEngine(f);
    const all={x0:0,y0:0,x1:TOWN_SIZE.w,y1:TOWN_SIZE.h};
    for(let n=0;n<90;n++){
      e.update(1/60,all);
      assert.ok(e.particles().length<=FLOW_MAX_PARTICLES);
      for(const q of e.particles())if(q.type!==4)assert.ok(e.kindAt(q.x,q.y)>0,'stays on a painted surface '+JSON.stringify(q));
    }
    assert.ok(e.particles().length>20,'Asia flow actually emits');
  }finally{applyTownZoneLayout('th');}
});

test('L3: West flow follows cold water only, excluding snow roads and bridge tops',()=>{
 const p=readPng('img/map-zone3/v1/flow-v1.png'),f=decodeFlow(p.rgba,p.w,p.h);
 let water=0,falls=0;
 for(let i=0;i<f.kind.length;i++){
  const k=f.kind[i];if(!k)continue;assert.ok(k===4||k===5,'frozen realm has no lava particles');
  if(k===4)water++;else{falls++;assert.equal(f.dx[i],0);assert.equal(f.dy[i],127);}
 }
 assert.ok(water>10000&&falls>2000);
 for(const [x,y]of [[375,250],[360,390],[1170,165],[980,394],[1285,625],[768,740]])assert.equal(f.kind[y*f.w+x],0,`bridge ${x},${y}`);
 applyTownZoneLayout('west');
 try{
  for(let y=0;y<f.h;y+=2)for(let x=0;x<f.w;x+=2)if(f.kind[y*f.w+x])
   assert.equal(townFloorAt((x+.5)*f.unitX,(y+.5)*f.unitY),false,'snowy road stays dry');
  seedFlow(7);const e=createFlowEngine(f),all={x0:0,y0:0,x1:TOWN_SIZE.w,y1:TOWN_SIZE.h};
  for(let n=0;n<90;n++){e.update(1/60,all);assert.ok(e.particles().length<=FLOW_MAX_PARTICLES);
   for(const q of e.particles())if(q.type!==4)assert.ok(e.kindAt(q.x,q.y)>0);}
  assert.ok(e.particles().length>20);
 }finally{applyTownZoneLayout('th');}
});
