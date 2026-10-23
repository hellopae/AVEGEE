// P9 — Codex round of 23 Oct inserted: Nira combat v2 (4 zones, all rows face right), worker v2 (asia/west/cyberhell), Trojan horse f6/f7
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {niraCombatSheet,niraPoseFacesRight,niraSheetIsV2,NIRA_SHEETS_V2} from '../src/nira-combat.js';
import {WORKER_SHEETS_V2,WORKER_FRAME_INSETS,workerFit,workerSheetV2,workerRow,drawWorker} from '../src/workers.js';

const html=readFileSync('index.html','utf8'),catalog=JSON.parse(readFileSync('img/preload-catalog.json','utf8'));
const allCatalogFiles=Object.values(catalog).flatMap(function walk(v){return Array.isArray(v)?v:v&&typeof v==='object'?Object.values(v).flatMap(walk):[];});
function webpSize(file){
  const b=readFileSync(file);assert.equal(b.toString('latin1',0,4),'RIFF');assert.equal(b.toString('latin1',8,12),'WEBP');
  const kind=b.toString('latin1',12,16);
  if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  if(kind==='VP8L'){const v=b.readUInt32LE(21);return [1+(v&0x3fff),1+((v>>14)&0x3fff)];}
  throw new Error('unexpected webp chunk '+kind);
}
const ZONES=['th','asia','west','cyberhell'];

test('P9 Nira: all four zones draw the v2 sheet (1280x1280, 4x4); v1 files stay on disk untouched',()=>{
  assert.deepEqual([...NIRA_SHEETS_V2],ZONES);
  for(const zone of ZONES) {
    const v2=`img/nira-combat/nira-${zone}-sheet-v2.webp`;
    assert.equal(niraCombatSheet(zone),v2);assert.ok(niraSheetIsV2(zone));
    assert.deepEqual(webpSize(v2),[1280,1280]);
    assert.ok(existsSync(`img/nira-combat/nira-${zone}-sheet-v1.webp`),'v1 kept (art is never overwritten)');
    assert.ok(allCatalogFiles.includes(v2),`${zone} v2 preloaded`);
  }
  assert.equal(niraCombatSheet('nowhere'),'img/nira-combat/nira-th-sheet-v2.webp','unknown zone falls back to th');
});

test('P9 Nira: v2 faces right in every pose so nothing is mirrored by the squad; a v1 sheet keeps the old rule',()=>{
  for(const zone of ZONES)for(const pose of ['idle','attack','hurt','heal'])assert.equal(niraPoseFacesRight(zone,pose),true,`${zone} ${pose}`);
  // the old behaviour is still what a non-v2 zone would get (idle/hurt drawn facing left need the ally mirror)
  const src=readFileSync('src/nira-combat.js','utf8');
  assert.match(src,/niraSheetIsV2\(zone\) \|\| pose === 'attack' \|\| pose === 'heal'/);
  assert.match(src,/!niraSheetIsV2\(zone\) && stripNeighbourLeaks\(/,'neighbour-leak strip only runs on v1 sheets');
  assert.doesNotMatch(src,/pose === 'idle' \? .*face-native/);
});

test('P9 cache-bust: nira-combat.js ends -p9',()=>{
  assert.match(html,/"\.\/src\/nira-combat\.js": "\.\/src\/nira-combat\.js\?v=[^"]*-p9"/);
});

// output of: python3 -I scripts/measure-worker-fit.py <zone>   (row mean alpha height px; v1 standing height of the same zone)
const WORKER_MEASURED={
  asia:{stand:303.0,rows:{3:303.0,4:311.0,5:296.5,6:280.5,7:305.0,8:304.5,9:297.0,10:299.8,11:310.0}},
  west:{stand:305.25,rows:{3:307.5,4:306.5,5:306.5,6:300.8,7:284.0,8:284.0,9:299.5,10:306.8,11:306.0}},
  cyberhell:{stand:304.75,rows:{3:311.0,4:306.5,5:297.0,6:300.2,7:298.5,8:293.2,9:303.8,10:312.2,11:311.0}},
};
const UPRIGHT=[3,4,5,9,10,11];

test('P9 workers: asia/west/cyberhell draw the 12-row v2 sheet (1280x3840); th unchanged; v1 files stay',()=>{
  assert.deepEqual(Object.keys(WORKER_SHEETS_V2),ZONES);
  for(const z of ['asia','west','cyberhell']) {
    const f=`img/workers/worker-${z}-sheet-v2.webp`;
    assert.equal(workerSheetV2(z),f);assert.deepEqual(webpSize(f),[1280,3840]);
    assert.ok(existsSync(`img/workers/worker-${z}-sheet-v1.webp`));assert.ok(allCatalogFiles.includes(f),`${z} v2 preloaded`);
    const v2=WORKER_SHEETS_V2[z];
    assert.equal(v2.rows,12);assert.equal(v2.insets.length,48);
    assert.deepEqual(v2.insets.slice(0,12),WORKER_FRAME_INSETS[z].slice(0,12),'rows 0-2 are v1 copies and keep the zone v1 insets');
    assert.ok(v2.insets.slice(12).every(i=>i.every(n=>n===0)),'rows 3-11 were drawn with >= 6 px margin, no insets');
  }
});

test('P9 workers: upright rows end within 2 % of the zone own v1 standing height; crouch/lean rows 6-8 are deliberately not scaled',()=>{
  for(const [z,{stand,rows}] of Object.entries(WORKER_MEASURED)) {
    for(const [row,h] of Object.entries(rows)) {
      const f=workerFit(WORKER_SHEETS_V2[z],Number(row));
      assert.equal(f.dx,0,'no foot shift measured/needed');
      if(UPRIGHT.includes(Number(row))) assert.ok(Math.abs(h*f.scale/stand-1)<=0.0205,`${z} row ${row}: ${(h*f.scale/stand*100).toFixed(1)} %`);
      else assert.equal(f.scale,1,`${z} row ${row} (crouch/lean) is not scaled`);
    }
    for(const row of [0,1,2,12])assert.deepEqual(workerFit(WORKER_SHEETS_V2[z],row),{scale:1,dx:0});
  }
});

test('P9 drawWorker: asia/west/cyberhell read v2 rows by what the worker does (repair=8, carry shards=11) and apply their scale about the foot baseline',()=>{
  const prevImage=globalThis.Image;
  globalThis.Image=class{constructor(){this.complete=true;}set src(v){this._s=v;this.naturalWidth=1280;this.naturalHeight=v.includes('-v2')?3840:1280;}get src(){return this._s;}};
  const calls=[],ctx=new Proxy({},{get:(_,k)=>k==='drawImage'?(...a)=>calls.push(a):()=>{},set:()=>true});
  const mk=(homeZone,extra)=>({homeZone,x:100,y:100,face:1,job:null,moving:false,arrived:false,cargo:null,...extra});
  drawWorker(ctx,mk('asia',{arrived:true,job:{kind:'repair'}}),0,48);                 // row 8, no scale
  drawWorker(ctx,mk('asia',{moving:true,cargo:'dabShards'}),0,48);                    // row 11, scale 0.977
  drawWorker(ctx,mk('cyberhell',{moving:true,cargo:'ngiwWood'}),0,48);                // row 10, scale 0.976
  drawWorker(ctx,mk('west',{moving:true,cargo:'dabShards'}),0,48);                    // row 11, west has no scale
  globalThis.Image=prevImage;
  const [a8,a11,c10,w11]=calls;
  assert.equal(Math.floor(a8[2]/320),8);assert.equal(Math.floor(a11[2]/320),11);assert.equal(Math.floor(c10[2]/320),10);assert.equal(Math.floor(w11[2]/320),11);
  const near=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-9,m+` (${a} vs ${b})`);
  near(a8[7],48,'asia row 8 plain width');near(a11[7],48*0.977,'asia row 11 drawn at fit scale');near(a11[6]+a11[8],0,'row 11 baseline stays on the foot');
  near(c10[7],48*0.976,'cyberhell row 10 at fit scale');near(w11[7],48,'west row 11 plain');
  assert.equal(workerRow(mk('asia',{moving:true,cargo:'dabShards'}),true),11);
});

test('P9 cache-bust: workers.js ends -p9',()=>{
  assert.match(html,/"\.\/src\/workers\.js": "\.\/src\/workers\.js\?v=[^"]*-p9"/);
});

test('P9 Trojan horse: cyberhell boss-frontier atlas reads the v2 file (same geometry, only attack f6/f7 redrawn), v1 stays; every other zone untouched',()=>{
  const sprites=JSON.parse(readFileSync('img/combat-animation-v1/manifest.json','utf8')).sprites;
  const rec=sprites['boss:cyberhell:boss-frontier'];
  assert.equal(rec.src,'img/boss-combat-v1/cyberhell/boss-frontier-v2.webp');
  assert.deepEqual([rec.frameWidth,rec.frameHeight,rec.cols,rec.rows],[384,512,3,4]);
  assert.deepEqual(rec.modes.attack.frames,[3,4,5,6,7,8],'attack f3-f8 still play in order, f6/f7 are the redrawn cells');
  assert.deepEqual(webpSize(rec.src),[rec.frameWidth*rec.cols,rec.frameHeight*rec.rows]);
  assert.ok(existsSync('img/boss-combat-v1/cyberhell/boss-frontier.webp'),'v1 kept');
  assert.ok(allCatalogFiles.includes(rec.src)&&!allCatalogFiles.includes('img/boss-combat-v1/cyberhell/boss-frontier.webp'));
  for(const z of ['th','asia','west'])assert.equal(sprites[`boss:${z}:boss-frontier`].src,`img/boss-combat-v1/${z}/boss-frontier.webp`);
});

test('P9 manifest fetch carries a new cache key in all three readers, so returning players do not keep the old atlas path',()=>{
  for(const f of ['src/ui.js','src/battle-fx.js','src/combat-sprites.js'])assert.match(readFileSync(f,'utf8'),/combat-animation-v1\/manifest\.json\?v=night-v1-p9'?/,f);
});

import {VERDICT_ART,verdictSceneImage} from '../src/verdict-scene.js';
function pngSize(file){const b=readFileSync(file);assert.equal(b.toString('latin1',1,4),'PNG');return [b.readUInt32BE(16),b.readUInt32BE(20)];}

test('P9 verdict scene: every zone draws its own praise/scold pair (1672x941 PNG); the scene kind `blame` points at the `scold` file; no placeholder left',()=>{
  const manifest=JSON.stringify(JSON.parse(readFileSync("img/manifest.json","utf8")));
  for(const z of ZONES) {
    assert.equal(VERDICT_ART[z].praise,`img/head-${z}-praise-cutscene-v1.png`);
    assert.equal(VERDICT_ART[z].blame,`img/head-${z}-scold-cutscene-v1.png`);
    for(const k of ['praise','blame']) { const f=verdictSceneImage(z,k);assert.deepEqual(pngSize(f),[1672,941],f);assert.ok(manifest.includes(f.replace('img/','')),f+' listed in img/manifest.json'); }
  }
  assert.ok(Object.values(VERDICT_ART).every(v=>!/intro-head|punish/.test(v.praise+v.blame)),'no temporary intro portrait / punishment still wired in');
  assert.match(html,/"\.\/src\/verdict-scene\.js": "\.\/src\/verdict-scene\.js\?v=p9"/);
});
