// P5b — Codex art inserted: zone-3 boss hands the weapon sheathed (cane v2), pier repair r3-c3, zone-1 worker sheet v2
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {weaponCutsceneSrc,WEAPON_ART_FILES} from '../src/weapons.js';
import {storyOf} from '../src/story.js';
import {TOWN_TERRAIN_REPAIRS} from '../src/town-terrain-repair.js';
import {WORKER_SHEETS_V2,WORKER_ROW_V2,workerSheet,workerSheetV2,workerRow,workerHeading,workerFrameRect,drawWorker} from '../src/workers.js';

const html=readFileSync('index.html','utf8'),catalog=JSON.parse(readFileSync('img/preload-catalog.json','utf8'));
const allCatalogFiles=Object.values(catalog).flatMap(function walk(v){return Array.isArray(v)?v:v&&typeof v==='object'?Object.values(v).flatMap(walk):[];});
function webpSize(file){
  const b=readFileSync(file);assert.equal(b.toString('latin1',0,4),'RIFF');assert.equal(b.toString('latin1',8,12),'WEBP');
  const kind=b.toString('latin1',12,16);
  if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  if(kind==='VP8L'){const v=b.readUInt32LE(21);return [1+(v&0x3fff),1+((v>>14)&0x3fff)];}
  throw new Error('unexpected webp chunk '+kind);
}
function jpegSize(file){
  const b=readFileSync(file);let i=2;
  while(i<b.length){if(b[i]!==0xff){i++;continue;}const m=b[i+1];if(m>=0xc0&&m<=0xc3)return [b.readUInt16BE(i+7),b.readUInt16BE(i+5)];i+=2+b.readUInt16BE(i+2);}
  throw new Error('no SOF');
}

test('P5b boss zone 3: cane cutscene points at the v2 art, other zones unchanged, file is 1375x768',()=>{
  assert.equal(weaponCutsceneSrc('cane'),'img/weapons/weapon-cutscene-cane-v2.jpeg');
  for(const w of ['fang','chain','trojan'])assert.equal(weaponCutsceneSrc(w),`img/weapons/weapon-cutscene-${w}.jpeg`);
  assert.ok(storyOf('weapon-cane').pages[0].image.endsWith('weapon-cutscene-cane-v2.jpeg'),'story page asks for v2');
  assert.ok(WEAPON_ART_FILES.cutscenes.includes('img/weapons/weapon-cutscene-cane-v2.jpeg'));
  assert.deepEqual(jpegSize('img/weapons/weapon-cutscene-cane-v2.jpeg'),[1375,768]);
  assert.ok(existsSync('img/weapons/weapon-cutscene-cane.jpeg'),'v1 file stays (nothing overwritten)');
  assert.ok(allCatalogFiles.includes('img/weapons/weapon-cutscene-cane-v2.jpeg'),'preloaded');
  assert.match(html,/"\.\/src\/weapons\.js": "\.\/src\/weapons\.js\?v=[^"]*p5b"/);
  assert.match(html,/"\.\/src\/weapons\.js\?v=i1b": "\.\/src\/weapons\.js\?v=[^"]*p5b"/);
  assert.match(html,/"\.\/src\/story\.js": "\.\/src\/story\.js\?v=[^"]*p5b"/);
});

test('P5b pier: r3-c3 repair registered once, box covers the pier plus feather, file is a full 1024 chunk',()=>{
  const d=TOWN_TERRAIN_REPAIRS.filter(r=>r.row===3&&r.col===3);
  assert.equal(d.length,1);assert.equal(d[0].url,'img/map-zone1/repairs/r3-c3-pier-v1.webp');
  assert.deepEqual(webpSize(d[0].url),[1024,1024]);
  const [x0,y0,x1,y1]=d[0].boxes[0];
  // changed pixels of the drawing span x712-941 y92-308; the 42px mask feather must fall outside them
  assert.ok(x0+42<=712&&x1-42>=941&&y0+42<=92&&y1-42>=308,'feather lands on untouched water/rock, not on the pier');
  assert.equal(TOWN_TERRAIN_REPAIRS.length,3,'r2-c3 and r1-c3 repairs kept');
  assert.ok(allCatalogFiles.includes(d[0].url));
  assert.match(html,/"\.\/src\/town-terrain-repair\.js": "\.\/src\/town-terrain-repair\.js\?v=[^"]*p5b"/);
});

test('P5b walk mask is untouched: pier floor strip still walkable, water beside it not',async()=>{
  const {townFloorAt}=await import('../src/town-layout.js');
  assert.ok(townFloorAt(2240,1700),'pier deck centre');
  assert.ok(!townFloorAt(2150,1700),'water left of the pier');
});

test('P5b worker sheet v2: 1280x3840, v1 stays for every zone and for thumbnails (P9: all four zones now have a v2 entry)',()=>{
  assert.deepEqual(Object.keys(WORKER_SHEETS_V2),['th','asia','west','cyberhell']);
  assert.equal(workerSheetV2('th'),'img/workers/worker-th-sheet-v2.webp');
  for(const z of ['asia','west','cyberhell'])assert.equal(workerSheetV2(z),`img/workers/worker-${z}-sheet-v2.webp`);
  assert.equal(workerSheetV2('nowhere'),null);
  for(const z of ['th','asia','west','cyberhell'])assert.equal(workerSheet(z),`img/workers/worker-${z}-sheet-v1.webp`);
  assert.deepEqual(webpSize('img/workers/worker-th-sheet-v2.webp'),[1280,3840]);
  assert.equal(WORKER_SHEETS_V2.th.insets.length,48);
  assert.deepEqual(workerFrameRect('th',3,0,WORKER_SHEETS_V2.th.insets),{left:0,top:0,right:0,bottom:0,x:0,y:3,w:1,h:1});
  assert.ok(allCatalogFiles.includes('img/workers/worker-th-sheet-v2.webp'));
  assert.match(html,/"\.\/src\/workers\.js": "\.\/src\/workers\.js\?v=[^"]*p5b[^"]*"/);
  assert.match(html,/src\/ui\.js\?v=[^"]*p5b(-[a-z0-9]+)*-o2"/,'ui.js suffix still ends -o2');
});

test('P5b worker rows follow what the worker is doing (v2) with natural escort walking on both atlas versions',()=>{
  const R=WORKER_ROW_V2,w=o=>({job:null,moving:false,arrived:false,cargo:null,heading:'side',...o});
  assert.equal(workerRow(w({job:{kind:'escort'},moving:true}),true),R.walk);
  assert.equal(workerRow(w({}),true),R.idle);
  assert.equal(workerRow(w({moving:true,job:{kind:'build'}}),true),R.walk);
  assert.equal(workerRow(w({moving:true,heading:'down',job:{kind:'build'}}),true),R.down);
  assert.equal(workerRow(w({moving:true,heading:'up',job:{kind:'build'}}),true),R.up);
  assert.equal(workerRow(w({arrived:true,job:{kind:'build'}}),true),R.build);
  assert.equal(workerRow(w({arrived:true,job:{kind:'repair'}}),true),R.repair);
  assert.equal(workerRow(w({arrived:true,job:{kind:'supervise'}}),true),R.supervise);
  assert.equal(workerRow(w({arrived:true,job:{kind:'gather',material:'ngiwWood',phase:'collect'}}),true),R.chopThorns);
  assert.equal(workerRow(w({arrived:true,job:{kind:'gather',material:'dabShards',phase:'collect'}}),true),R.collectShards);
  assert.notEqual(R.chopThorns,R.collectShards);assert.notEqual(R.repair,R.build);
  assert.equal(workerRow(w({moving:true,cargo:'ngiwWood',heading:'down',job:{kind:'gather',phase:'sell'}}),true),R.carryThorns,'cargo shows the load, even walking vertically');
  assert.equal(workerRow(w({moving:true,cargo:'dabShards',job:{kind:'gather',phase:'sell'}}),true),R.carryShards);
  assert.equal(workerRow(w({arrived:true,cargo:'dabShards',job:{kind:'gather',phase:'sell'}}),true),R.idle,'waiting at the merchant never plays a walk cycle in place');
  // v1 fallback also uses ordinary walking for escort duty.
  assert.equal(workerRow(w({job:{kind:'escort'}})),0);assert.equal(workerRow(w({moving:true})),1);
  assert.equal(workerRow(w({arrived:true,job:{kind:'supervise'}})),0);assert.equal(workerRow(w({arrived:true,job:{kind:'gather'}})),2);
  assert.equal(workerHeading(1,10),'down');assert.equal(workerHeading(1,-10),'up');assert.equal(workerHeading(10,3),'side');assert.equal(workerHeading(-5,5),'side');
});

test('P5b drawWorker reads the 12-row v2 sheet by row and the 4-row v1 sheet for a zone without v2 (P9: only an unknown zone falls back now)',()=>{
  const prevImage=globalThis.Image,srcs=[];
  globalThis.Image=class{constructor(){this.complete=true;}set src(v){this._s=v;srcs.push(v);this.naturalWidth=1280;this.naturalHeight=v.includes('-v2')?3840:1280;}get src(){return this._s;}};
  const calls=[];
  const ctx=new Proxy({},{get:(_,k)=>k==='drawImage'?(...a)=>calls.push(a):()=>{},set:()=>true});
  const mk=(homeZone,extra)=>({homeZone,x:100,y:100,face:1,job:null,moving:false,arrived:false,cargo:null,...extra});
  drawWorker(ctx,mk('th',{arrived:true,job:{kind:'repair'}}),0,48);
  drawWorker(ctx,mk('nowhere',{arrived:true,job:{kind:'repair'}}),0,48);
  globalThis.Image=prevImage;
  assert.ok(srcs.includes('img/workers/worker-th-sheet-v2.webp')&&srcs.includes('img/workers/worker-th-sheet-v1.webp'));
  const th=calls[0],asia=calls[1];
  assert.equal(th[2],8*320,'th repair = v2 row 8 (source y in pixels)');assert.equal(th[4],320);
  assert.equal(Math.floor(asia[2]/320),2,'a zone without a v2 entry keeps v1 build row 2 (th inset table adds a few px of top inset)');
});
