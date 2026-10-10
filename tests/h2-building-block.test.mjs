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
const {STATIONS,syncSceneZone} = await import('../src/data.js');
const {createGame} = await import('../src/game.js');
const art = await import('../src/art.js');
const walk = await import('../src/walk.js');
await new Promise(resolve=>setImmediate(resolve));

// H2 (10 ต.ค. 2569) — คุณเป้: ตัวละครเดินทับตัวอาคารไม่ได้ (เดิม 2.5D ชนแค่แถบฐาน เดินเข้า "หลัง" อาคารได้)
const inRect=(x,y,r)=>x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3];

function setup(zone){
  const g=createGame();g.zone=zone;syncSceneZone(zone);art.bindZone(()=>zone);
  g.stations=STATIONS.map(def=>({def,slots:[],build:0,fire:0,intensity:3}));
  walk.resetWalk();walk.setBlocks([],[]);walk.setNpcDiscs([]);
  walk.buildWalk({src:zone==='west'?'img/scene-v2-opt.png':'img/'+g.zoneDef().scene+'.png',naturalWidth:1678,naturalHeight:937});
  g.syncBlocks(true);
  return g;
}
/** จุดกลางตัวอาคาร: กลางแถบหลังคา/ผนัง (ไม่ใช่แถบฐานที่ติดพื้น) และไม่อยู่ในช่องบริการของผู้คุม */
function bodyPoints(d){
  const rects=art.blockRectsOf(d),foot=art.footOf(d);
  const holes=[d.x-16,d.y-16,d.x+16,Math.max(d.y+16,foot[3]+26)];
  const pts=[];
  for(const r of rects){
    const x=(r[0]+r[2])/2,y=(r[1]+r[3])/2;
    if(r[3]>foot[1])continue;                       // เฉพาะส่วนที่อยู่เหนือแถบฐาน = ส่วน "หลังอาคาร" ที่ 2.5D เคยปล่อยให้เดินเข้า
    if(inRect(x,y,holes))continue;
    if(r[2]-r[0]<24)continue;                       // ยอดแหลมแคบ ๆ ไม่นับ
    pts.push([x,y]);
  }
  return pts;
}

test('H2: every zone — points inside the painted building body (above the ground strip) cannot be walked, for at least 3 buildings per zone',()=>{
  for(const zone of ['th','asia','west','cyberhell']){
    setup(zone);
    let checked=0;
    for(const d of STATIONS){
      const pts=bodyPoints(d);
      if(!pts.length)continue;
      for(const [x,y] of pts)assert.equal(walk.canWalk(x,y),false,`${zone}/${d.k}: body point ${x|0},${y|0} must be blocked`);
      checked++;
    }
    assert.ok(checked>=3,`${zone}: only ${checked} buildings had measurable bodies`);
  }
  syncSceneZone('th');
});

test('H2: the ground strip is still blocked and the whole silhouette is covered (roof, wall and base rows are contiguous)',()=>{
  setup('th');
  for(const d of STATIONS){
    const rects=art.blockRectsOf(d),foot=art.footOf(d),body=art.bodyBoxOf(d);
    assert.ok(rects.length>3,d.k+': several silhouette bands');
    const all=art.blockOf(d);
    assert.ok(all[1]<=body[1]+4 && all[3]>=foot[3]-4,d.k+': bands span roof to base');
    // no vertical gap between consecutive bands
    const sorted=[...rects].sort((a,b)=>a[1]-b[1]);
    for(let i=1;i<sorted.length;i++)assert.ok(sorted[i][1]-sorted[i-1][3]<=0.5||sorted[i][1]<=sorted[i-1][3]+0.5,d.k+': bands are stacked without gaps');
  }
  syncSceneZone('th');
});

test('H2: the service door of every building stays walkable and reachable on every zone; free ground beside buildings stays open',()=>{
  for(const zone of ['th','asia','west','cyberhell']){
    setup(zone);
    for(const d of STATIONS){
      assert.equal(walk.canWalk(d.x,d.y),true,`${zone}/${d.k}: door point still walkable`);
      const path=walk.findPath(835,680,d.x,d.y),end=path?.at(-1);
      assert.ok(end && Math.hypot(end[0]-d.x,end[1]-d.y)<=100,`${zone}/${d.k}: reachable ${JSON.stringify(end)}`);
    }
    // the judge's platform, the bridge stairs and the queue line must remain open
    for(const [x,y] of [[836,447],[835,560],[835,670],[880,440]])assert.equal(walk.canWalk(x,y),true,`${zone}: open ground ${x},${y}`);
  }
  syncSceneZone('th');
});

test('H2: a player standing where a newly built body appears is moved out of it',()=>{
  const g=setup('th');
  const d=STATIONS.find(s=>s.k==='sala'),pts=bodyPoints(d);
  g.player.x=pts[0][0];g.player.y=pts[0][1];
  g.syncBlocks(true);
  assert.equal(walk.canWalk(g.player.x,g.player.y),true,'player pushed onto open ground');
  assert.equal(art.blockRectsOf(d).some(r=>inRect(g.player.x,g.player.y,r)),false);
  syncSceneZone('th');
});
