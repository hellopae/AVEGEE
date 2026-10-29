import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ZONE_SKIN} from '../src/zone-skin.js';
import {syncSceneZone,SCENE} from '../src/data.js';

async function fixture(){
  const previous={Image:globalThis.Image,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,now:Date.now};
  const images=[],timers=new Set();let now=0;
  globalThis.Image=class {constructor(){images.push(this);}decode(){return Promise.resolve();}};
  globalThis.setTimeout=fn=>{timers.add(fn);return fn;};globalThis.clearTimeout=fn=>timers.delete(fn);Date.now=()=>now;
  const mod=await import('../src/cyberhell-terrain.js?test='+Math.random());
  const calls=[];const ctx={canvas:{width:1600,height:1200},getTransform:()=>({a:2,d:2,b:0,c:0,e:-1200,f:-600}),drawImage:(...a)=>calls.push(a)};
  return {mod,ctx,calls,images,timers,advance:n=>now+=n,async load(){for(const im of images)if(im.onload)await im.onload();},restore(){globalThis.Image=previous.Image;globalThis.setTimeout=previous.setTimeout;globalThis.clearTimeout=previous.clearTimeout;Date.now=previous.now;}};
}

test('MAP-Z4 v3: enabled town uses owner mask and a 3:2 world',async()=>{
  assert.equal(ZONE_SKIN.cyberhell.enabled,true);
  syncSceneZone('cyberhell');assert.deepEqual([SCENE.w,SCENE.h],[3840,2560]);syncSceneZone('th');
  assert.equal(ZONE_SKIN.cyberhell.terrain.dir,'img/map-zone4/v3/');
  const {TOWN_OWNER_WALK_RUNS}=await import('../src/town-owner-walkmask-cyberhell.js');
  assert.ok(TOWN_OWNER_WALK_RUNS.length>0);
});

test('MAP-Z4: tiles exactly cover the new 3:2 world; production files exist',async()=>{
  const {CYBERHELL_TERRAIN:t,cyberhellTileRect:rect}=await import('../src/cyberhell-terrain.js');
  let area=0;
  for(let row=1;row<=4;row++)for(let col=1;col<=5;col++){
    const r=rect(row,col);area+=r.w*r.h;
    if(col<5)assert.ok(Math.abs(r.x+r.w-rect(row,col+1).x)<1e-10);
    if(row<4)assert.ok(Math.abs(r.y+r.h-rect(row+1,col).y)<1e-10);
    assert.ok(existsSync(t.dir+`r${row}-c${col}.webp`));
  }
  assert.ok(Math.abs(area-3840*2560)<1e-8);
});

test('MAP-Z4: three load lanes, complete-camera switch, same tile destinations for clipped ferry redraw',async()=>{
  const f=await fixture();try{
    assert.equal(f.mod.drawCyberhellTerrain(f.ctx),false);assert.equal(f.images.length,3);assert.equal(f.calls.length,0);
    for(let i=0;i<10&&!f.mod.drawCyberhellTerrain(f.ctx);i++)await f.load();
    assert.ok(f.calls.length>0);assert.equal(f.mod.cyberhellTerrainStats().loading,0);
    const a=f.calls.map(v=>v.slice(1));f.calls.length=0;const before=f.images.length;
    assert.equal(f.mod.drawCyberhellTerrain(f.ctx),true);assert.deepEqual(f.calls.map(v=>v.slice(1)),a);assert.equal(f.images.length,before);
  }finally{f.restore();}
});

test('MAP-Z4: failed and stalled loads retry with backoff; late decode cannot publish expired pixels',async()=>{
  const f=await fixture();try{
    f.mod.drawCyberhellTerrain(f.ctx);const first=f.images[0],late=first.onload;
    first.onerror();f.mod.drawCyberhellTerrain(f.ctx);assert.equal(f.images.filter(i=>i.src.includes('r1-c1')).length,1);
    for(const timer of [...f.timers])timer();assert.equal(f.mod.cyberhellTerrainStats().loading,0);
    await late();assert.equal(f.mod.cyberhellTerrainStats().ready,0);
    f.advance(16000);f.mod.drawCyberhellTerrain(f.ctx);assert.equal(f.mod.cyberhellTerrainStats().loading,3);
    assert.ok(f.images.some(i=>i.src.includes('?recover=')));
  }finally{f.restore();}
});

test('MAP-Z4: overview uses painting without allocations; panning keeps at most twelve images',async()=>{
  const f=await fixture();try{
    f.ctx.getTransform=()=>({a:.3,d:.3,b:0,c:0,e:0,f:0});assert.equal(f.mod.drawCyberhellTerrain(f.ctx),false);assert.equal(f.images.length,0);
    for(const [e,ff]of [[0,0],[-2000,0],[-2000,-1000],[0,-1000],[-600,-300]]){
      f.ctx.getTransform=()=>({a:2,d:2,b:0,c:0,e,f:ff});
      for(let i=0;i<10;i++){f.mod.drawCyberhellTerrain(f.ctx);await f.load();const stats=f.mod.cyberhellTerrainStats();assert.ok(stats.ready+stats.loading<=12);assert.ok(stats.loading<=3);}
    }
  }finally{f.restore();}
});

test('MAP-Z4: delivered tile dimensions and mobile allocation budget match the Zone 2 size class',()=>{
  const report=JSON.parse(readFileSync('img/map-zone4/v3/stitch-report.json'));
  const sizes=file=>{const b=readFileSync(file),k=b.toString('latin1',12,16);
    if(k==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
    if(k==='VP8 ')return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
    if(k==='VP8L'){const v=b.readUInt32LE(21);return [1+(v&0x3fff),1+((v>>14)&0x3fff)];}
    throw Error('unexpected WebP '+k);};
  let decoded=0,bytes=0;
  for(let r=1;r<=4;r++)for(let c=1;c<=5;c++){
    const file=`img/map-zone4/v3/r${r}-c${c}.webp`,size=sizes(file);
    assert.deepEqual(size,[c===5?819:1024,r===4?205:1024]);decoded+=size[0]*size[1]*4;bytes+=readFileSync(file).length;
  }
  const ref=report.comparison['map-zone2/v2'];assert.equal(decoded,ref.decodedRGBABytes);
  assert.ok(bytes<ref.encodedBytes*1.5,'at most 1.5x Zone 2 transfer size');
  assert.ok(report.surfaceDetailFraction>.1,'substantial area receives newly generated detail');
  assert.equal(report.mobile.upperBoundTileRGBABytes,12*1024*1024*4);
});

test('MAP-Z4: unchanged fallback and routes retain their baseline, allowing the B12 reference row',async()=>{
  const {createHash}=await import('node:crypto');
  const baseline=JSON.parse(readFileSync('output/coordination/2026-10-29-map-z4/baseline.json'));
  for(const [path,hash]of Object.entries(baseline))if(path!=='note'&&!['src/data.js','src/town-layout.js','src/town-owner-walkmask-cyberhell.js','src/zone-skin.js'].includes(path)){
    let bytes=readFileSync(path);
    if(path==='src/route-geometry.js'){
      const current='ambient:{trees:BORDER34_TREES,waterfalls:[],leafArea:null,snowArea:[0,0,.46,1],rainArea:[.54,0,1,1],';
      const original='ambient:{trees:BORDER34_TREES,waterfalls:[],leafArea:null,';
      const base=readFileSync(new URL('./fixtures/b12-base-route-geometry.txt',import.meta.url),'utf8');
      // Authenticate the pre-B12 fixture against the unchanged MAP-Z4 baseline.
      assert.equal(createHash('sha256').update(base.replace(current,original)).digest('hex'),hash);
      const normalize=text=>text
        .replace(/import \{BORDER12_MASK(?:,BORDER12_TREES)?\} from '\.\/frontier-walkmask-th-asia-b12\.js';\n/,'')
        .replace(/import \{[^}]+\} from '\.\/frontier-walkmask-th-asia\.js';/,"import OWNER from './frontier-walkmask-th-asia.js';")
        .replace(/export const DUNGEON_CORRIDOR = .*?;\n/,'B12_CORRIDOR\n')
        .replace(/const TREES = .*?;\n/,'')
        .replace(/const WATERFALLS = .*?;\n/,'')
        .replace(/  'th:asia': row\('th:asia', \{[\s\S]*?\n  \}\),/,'B12_ROW')
        .replace(/\/\/[^\n]*/g,'').replace(/\n\s*\n/g,'\n');
      assert.equal(normalize(bytes.toString()),normalize(base),'only the B12 import, corridor, trees, falls and reference row may differ');
      // Other routes and fallback runtime bytes remain protected by the original fixture hash.
      bytes=Buffer.from(base.replace(current,original));
    }
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,path);
  }
});
