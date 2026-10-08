import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
globalThis.fetch = async () => ({ok:true, json:async () => manifest});
globalThis.Image = class {
  set src(src) {
    this._src = src;
    const key = src.split('/').at(-1).replace(/\.(png|webp)$/, '');
    [this.naturalWidth, this.naturalHeight] = src.includes('/theme-v4/') ? JSON.parse(execFileSync('python3', ['-c', 'from PIL import Image;import json,sys;print(json.dumps(Image.open(sys.argv[1]).size))', fileURLToPath(new URL('../'+src, import.meta.url))], {encoding:'utf8'})) : manifest.stationSizes[key] || [1678,937];
    if (existsSync(new URL('../'+src, import.meta.url))) this.onload?.();
  }
  get src() { return this._src; }
};
const pixels = new Map();
globalThis.document = {documentElement:{}, createElement:() => ({getContext:() => {
  let source, width, height;
  return {
    drawImage(im,x,y,w,h) {source=im.src; width=w; height=h;},
    getImageData() {
      const key=`${source}:${width}:${height}`;
      if (!pixels.has(key)) pixels.set(key,execFileSync('python3',['-c',
        'from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert("RGBA"); sys.stdout.buffer.write(im.resize((int(sys.argv[2]),int(sys.argv[3])),Image.Resampling.BILINEAR).tobytes())',
        fileURLToPath(new URL('../'+source,import.meta.url)),`${width}`,`${height}`],{maxBuffer:7_000_000}));
      return {data:pixels.get(key)};
    },
  };
}})};
const {STATIONS,ZONES,syncSceneZone} = await import('../src/data.js');
const {createGame} = await import('../src/game.js');
const art = await import('../src/art.js');
const walk = await import('../src/walk.js');
const {STORY} = await import('../src/story.js');
await new Promise(resolve=>setImmediate(resolve));
const fields=['bx','by','x','y','sx','sy','hit'];
const sites=()=>Object.fromEntries(STATIONS.map(d=>[d.k,Object.fromEntries(fields.filter(k=>d[k]!=null).map(k=>[k,Array.isArray(d[k])?[...d[k]]:d[k]]))]));
syncSceneZone('th');
const original=sites();
const offsets={lokan:[73,41],krajok:[90,37],dab:[65,5],krata:[0,42]};
test('30F: CyberHell translations move hits and worker/service points together and restore on every branch change',()=>{
  for (const destination of ['th','asia','west','unknown']) {
    syncSceneZone('cyberhell');
    const once=sites(); syncSceneZone('cyberhell'); assert.deepEqual(sites(),once,'no accumulated offsets');
    for (const [key,[dx,dy]] of Object.entries(offsets)) {
      if(key==='krajok') {
        // E1 supersedes the old translation-only tower: moved, scaled hit, door below the stairs.
        assert.deepEqual(once.krajok,{bx:1540,by:675,x:1510,y:685,hit:[1403.5,441,1676.5,675]});
        continue;
      }
      for (const [field,value] of Object.entries(original[key])) {
        const want=field==='hit'?value.map((v,i)=>v+(i%2?dy:dx)):value+(['bx','x','sx'].includes(field)?dx:dy);
        assert.deepEqual(once[key][field],want,`${key}/${field}`);
      }
    }
    syncSceneZone(destination);
    for(const key of Object.keys(offsets))assert.deepEqual(sites()[key],original[key],`${destination}/${key}: restore original geometry`);
  }
});

test('30F: selected story image is 16:9; both regional sprites have alpha, accurate manifest bounds and sizes',()=>{
  assert.equal(STORY.asia.pages[2].image,'img/story-asia-03.png');
  assert.ok(manifest.rest.includes('story-asia-03.png'));
  const audit=JSON.parse(execFileSync('python3',['-c',
    'from PIL import Image;import json,sys; out=[]\nfor p in sys.argv[1:]:\n im=Image.open(p).convert("RGBA"); a=im.getchannel("A"); b=a.point(lambda v:255 if v>40 else 0).getbbox(); out.append(dict(size=im.size,alpha=a.getextrema(),box=[b[0]/im.width,b[1]/im.height,b[2]/im.width,b[3]/im.height]))\nprint(json.dumps(out))',
    ...['img/story-asia-03.png','img/CyberHell/st-tarang-cyberhell.png','img/CyberHell/st-krajok-cyberhell.png'].map(p=>fileURLToPath(new URL('../'+p,import.meta.url)))],{encoding:'utf8'}));
  assert.equal(audit[0].size[0]*9,audit[0].size[1]*16);
  for(const [i,key] of ['tarang','krajok'].entries()) {
    const stem=`st-${key}-cyberhell`,path=`CyberHell/${stem}.png`,a=audit[i+1];
    assert.equal(manifest.zones.cyberhell.filter(p=>p===path).length,1);
    assert.equal(a.size[0],a.size[1]);assert.ok(a.size[0]>=512);assert.deepEqual(a.alpha,[0,255]);
    assert.deepEqual(manifest.stationSizes[stem],a.size);assert.deepEqual(manifest.boxes[stem],a.box);
  }
});

test('30F: real alpha footprints and lava mask allow paths to every station with all buildings present; old saves restore',()=>{
  const g=createGame();g.zone='cyberhell';syncSceneZone(g.zone);art.bindZone(()=>g.zone);
  g.stations=STATIONS.map(def=>({def,slots:[],build:0,fire:0,intensity:3}));
  walk.resetWalk();walk.setBlocks([],[]);
  assert.equal(walk.buildWalk({src:'img/scene-cyberhell-v2.png',naturalWidth:1678,naturalHeight:937}),true);
  g.syncBlocks(true);
  for(const d of STATIONS) {
    const foot=art.footOf(d);
    assert.ok(foot,d.k+': loaded footprint');
    const path=walk.findPath(835,680,d.x,d.y);
    assert.equal(walk.canWalk(d.x,d.y),true,d.k+': entry on reachable ground');
    // 30D blocks whole buildings, so the walk may stop beside the door; the "enter" button reach (INTERACTION_REACH = 100) is what matters
    const end=path.at(-1);
    assert.ok(Math.hypot(end[0]-d.x,end[1]-d.y)<=100,d.k+': path ends within interaction reach of the door, got '+end);
  }
  assert.equal(art.artUrl('st-tarang'),'img/map-v5/st-tarang-cyberhell.webp');
  const saved=g.snapshot(); saved.v=2;
  const restored=createGame();restored.restore(saved);
  assert.equal(restored.zone,'cyberhell');
  assert.deepEqual(restored.stations.map(s=>s.def.k),g.stations.map(s=>s.def.k));
  assert.deepEqual(restored.stations.find(s=>s.def.k==='lokan').def.hit,STATIONS.find(d=>d.k==='lokan').hit);
  assert.equal(ZONES.find(z=>z.k==='cyberhell').scene,'scene-cyberhell-v2');
  syncSceneZone('th');
});

test('30F review: new Rage image is full-bleed, so the old letterbox crop is gone from cutscene-presentation',async()=>{
  const { comicImageLayout } = await import('../src/cutscene-presentation.js');
  const l = comicImageLayout('img/story-asia-03.png', 1664, 936);
  assert.ok(Math.abs(l.aspect - 1664 / 936) < 1e-6 && l.top === 0 && Math.abs(l.height - 100) < 1e-6);
});

test('themed sprites keep every zone station reachable with the original terrain mask',()=>{
 for(const zone of ['th','asia','west','cyberhell']){
  const g=createGame();g.zone=zone;syncSceneZone(zone);art.bindZone(()=>zone);
  g.stations=STATIONS.map(def=>({def,slots:[],build:0,fire:0,intensity:3}));
  walk.resetWalk();walk.setBlocks([],[]);walk.setNpcDiscs([]);
  const src=zone==='west'?'img/scene-v2-opt.png':'img/'+g.zoneDef().scene+'.png';
  walk.buildWalk({src,naturalWidth:1678,naturalHeight:937});g.syncBlocks(true);
  for(const d of STATIONS){
   const path=walk.findPath(835,680,d.x,d.y),end=path?.at(-1);
   assert.ok(end && Math.hypot(end[0]-d.x,end[1]-d.y)<=100,zone+'/'+d.k+': reachable interaction '+JSON.stringify(end));
  }
 }
 syncSceneZone('th');
});
