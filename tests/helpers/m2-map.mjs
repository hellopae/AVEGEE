import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const manifest = JSON.parse(readFileSync(new URL('../../img/manifest.json', import.meta.url)));
globalThis.fetch = async () => ({ok:true, json:async () => ({...manifest,zones:{}})});
globalThis.Image = class {
  set src(src) {
    this._src = src;
    const key = src.split('/').at(-1).replace(/\.(png|webp)$/, '');
    [this.naturalWidth, this.naturalHeight] = (src.includes('/theme-v4/') || src.includes('/map-v5/')) ? JSON.parse(execFileSync('python3', ['-c', 'from PIL import Image;import json,sys;print(json.dumps(Image.open(sys.argv[1]).size))', fileURLToPath(new URL('../../'+src, import.meta.url))], {encoding:'utf8'})) : manifest.stationSizes[key] || [1678,937];
    if (existsSync(new URL('../../'+src, import.meta.url))) this.onload?.();
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
        fileURLToPath(new URL('../../'+source,import.meta.url)),`${width}`,`${height}`],{maxBuffer:7_000_000}));
      return {data:pixels.get(key)};
    },
  };
}})};
const {STATIONS,ZONES,FRONTIER,ZONE_ENTRY,syncSceneZone} = await import('../../src/data.js');
const {createGame} = await import('../../src/game.js');
const art = await import('../../src/art.js');
const walk = await import('../../src/walk.js');
await new Promise(resolve=>setImmediate(resolve));


export {STATIONS,ZONES,FRONTIER,ZONE_ENTRY,syncSceneZone,art,walk};
export function setup(zone) {
  const g=createGame();g.zone=zone;syncSceneZone(zone);art.bindZone(()=>zone);
  g.stations=STATIONS.map(def=>({def,slots:[],build:0,fire:0,intensity:3}));
  walk.resetWalk();walk.setBlocks([],[]);walk.setNpcDiscs([]);
  const bg={src:'img/'+g.zoneDef().scene+'.png',naturalWidth:1678,naturalHeight:937};
  walk.buildWalk(bg,zone==='west'?{...bg,src:'img/scene-v2-opt.png'}:bg);
  const terrain=new Uint8Array(1678*937);
  for(let y=0;y<937;y++)for(let x=0;x<1678;x++)terrain[y*1678+x]=walk.canWalk(x,y)?1:0;
  const spawn=[g.player.x,g.player.y];
  g.syncBlocks(true);
  return {g,terrain,spawn};
}
export function geometry(d) {
  const im=art.img('st-'+d.k);
  // stationBox is intentionally private; map-v5's public size function is the same data transform.
  return {size:[im.naturalWidth,im.naturalHeight],key:d.k,def:{...d},src:im.src,body:art.bodyBoxOf(d),foot:art.footOf(d),blocks:art.blockRectsOf(d),top:art.topOf(d)};
}
