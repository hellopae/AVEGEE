// P5c — in-code scale / foot-x compensation for the zone-1 v2 worker sheet (the image itself is never edited)
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORKER_SHEETS_V2,WORKER_FIT_TH_V2,workerFit,drawWorker} from '../src/workers.js';

const html=readFileSync('index.html','utf8');
// output of: python3 -I scripts/measure-worker-sheet.py img/workers/worker-th-sheet-v2.webp   (row mean height px, row mean foot x px)
const MEASURED={3:[277.8,152.7],4:[289.8,132.9],5:[274.5,147.0],6:[284.5,102.0],7:[272.8,95.0],8:[284.5,91.7],9:[275.0,159.3],10:[282.8,180.5],11:[289.2,157.7]};
const V1_STAND_H=308;

test('P5c every measured v2 row ends at v1 height +-2% and feet on the cell centre',()=>{
  assert.deepEqual(Object.keys(WORKER_FIT_TH_V2).map(Number),Object.keys(MEASURED).map(Number),'one entry per measured row 3-11');
  for(const [row,[h,foot]] of Object.entries(MEASURED)) {
    const f=workerFit(WORKER_SHEETS_V2.th,Number(row));
    assert.ok(Math.abs(h*f.scale/V1_STAND_H-1)<=0.02,`row ${row} height ${(h*f.scale).toFixed(1)} vs ${V1_STAND_H}`);
    assert.ok(Math.abs(foot+f.dx-160)<=1.5,`row ${row} foot ${(foot+f.dx).toFixed(1)} vs 160`);
  }
  // the three rows the P5b report named
  for(const row of [6,8,10])assert.ok(Math.abs(MEASURED[row][1]+workerFit(WORKER_SHEETS_V2.th,row).dx-160)<=6,`row ${row} feet centred`);
});

test('P5c rows without an entry, and zones without a table, are not compensated',()=>{
  for(const row of [0,1,2,12,40])assert.deepEqual(workerFit(WORKER_SHEETS_V2.th,row),{scale:1,dx:0});
  assert.deepEqual(workerFit({rows:12,insets:[]},5),{scale:1,dx:0},'a future zone with no fit table');
  assert.deepEqual(workerFit(null,5),{scale:1,dx:0},'v1 sheet (no v2 entry)');
  assert.deepEqual(workerFit({fit:{5:{scale:1.2}}},5),{scale:1.2,dx:0},'a partial entry fills the missing half with 0');
  assert.deepEqual(workerFit({fit:{5:{scale:1.2,dx:-9}}},5),{scale:1.2,dx:-9},'a zone brings its own table');
  assert.ok(Object.isFrozen(WORKER_FIT_TH_V2));
});

test('P5c drawWorker applies the row fit: bigger, feet shifted, baseline unchanged; v1 sheets and fit-less rows untouched',()=>{
  const prevImage=globalThis.Image;
  globalThis.Image=class{constructor(){this.complete=true;}set src(v){this._s=v;this.naturalWidth=1280;this.naturalHeight=v.includes('-v2')?3840:1280;}get src(){return this._s;}};
  const calls=[];
  const ctx=new Proxy({},{get:(_,k)=>k==='drawImage'?(...a)=>calls.push(a):()=>{},set:()=>true});
  const mk=(homeZone,extra)=>({homeZone,x:100,y:100,face:1,job:null,moving:false,arrived:false,cargo:null,...extra});
  const H=48;
  drawWorker(ctx,mk('th',{arrived:true,job:{kind:'repair'}}),0,H);   // v2 row 8 (has a fit)
  drawWorker(ctx,mk('th',{}),0,H);                                    // v2 row 0 (no fit)
  drawWorker(ctx,mk('nowhere',{arrived:true,job:{kind:'repair'}}),0,H);  // unknown zone -> v1 sheet (P9: every real zone has a v2 entry)
  globalThis.Image=prevImage;
  const [row8,row0,v1]=calls,f=WORKER_FIT_TH_V2[8],w=H; // cell is square, so width===height at scale 1
  const near=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-9,m+` (${a} vs ${b})`);
  near(row8[7],w*f.scale,'row 8 drawn at fit scale');near(row8[8],H*f.scale,'row 8 height');
  near(row8[5]+row8[7]/2,f.dx/320*w*f.scale,'row 8 art centre shifted by dx');
  near(row8[6]+row8[8],0,'row 8 baseline stays at the worker foot (y offset 0)');
  near(row0[7],w,'row 0 plain width');near(row0[8],H,'row 0 plain height');near(row0[5],-w/2,'row 0 not shifted');near(row0[6]+row0[8],0,'row 0 baseline');
  near(v1[7],w,'v1 sheet plain width');near(v1[5],-w/2,'v1 sheet not shifted');
});

test('P5c cache-bust: workers.js ends -p5c, nothing else of the importmap touched by this round',()=>{
  assert.match(html,/"\.\/src\/workers\.js": "\.\/src\/workers\.js\?v=[^"]*p5b-p5c(?:-[a-z0-9]+)*"/);
});
