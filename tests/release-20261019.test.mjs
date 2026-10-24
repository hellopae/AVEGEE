import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {SPOTS,STATIONS} from '../src/data.js';
import {resetWalk,setBlocks,setNpcDiscs,nearestWalk} from '../src/walk.js?v=k1d';
import {stepWorkers,advanceWorkers} from '../src/workers.js';
import {initializeBossGuides,recordBossGuideWin,completeBossGuideStory} from '../src/boss-guides.js';
const setup=()=>{const g=createGame();(g.zoneEvents.th||={}).frontierBreach='cleared';g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.food=100;resetWalk();setBlocks([],[]);setNpcDiscs([]);return g;};
test('worker delivers harbour arrivals immediately available for trial, then hands the judged soul to its keeper',()=>{
 const g=setup(),w=g.hireWorker();g.setWorkerMode(w.id,'escort');const soul=g.queue[0];
 assert.equal(g.startCourtArrival(soul),true);assert.equal(g.queue[0].id,soul.id);
 assert.equal(g.caseReady(soul),false,'the trial stays closed while the ferry is inbound');
 g.advanceAfterlife(3600);
 assert.equal(g.caseReady(soul),true,'the case opens as soon as the soul disembarks');
 assert.equal(g.afterlifeWalks[0].escort.workerId,w.id);
 assert.equal(g.assign(soul.id,'krata','taan',3),true);
 assert.equal(g.afterlifeWalks.some(w=>w.destination==='arrival'),false);
 const walk=g.afterlifeWalks.find(w=>w.destination==='station');assert.ok(walk);assert.equal(walk.escort.k,'taan');assert.equal(walk.escort.workerId,undefined);
 assert.equal(g.crewOf('taan').at,'krata');g.advanceAfterlife(1e7);assert.equal(w.job,null);
 assert.equal(g.queue.some(s=>s.id===soul.id),false);
});
test('court ferry waits for an open court and leaves a soul at the harbour when no worker is free',()=>{
 const g=setup(),soul=g.queue[0];g.courtClosed=true;
 assert.equal(g.startCourtArrival(soul),true);g.advanceAfterlife(5000);
 assert.equal(g.courtArrivals[0].phase,'ferry');assert.equal(g.courtArrivals[0].elapsed,0);
 assert.equal(g.caseReady(soul),false);
 g.courtClosed=false;g.advanceAfterlife(3600);
 assert.equal(g.courtArrivals[0].phase,'dock');assert.equal(g.afterlifeWalks.length,0);
 assert.equal(g.caseReady(soul),true,'trial is available while the soul safely waits at the dock');
 const w=g.hireWorker();g.setWorkerMode(w.id,'escort');g.advanceAfterlife(1);
 assert.equal(g.courtArrivals[0].phase,'escort');
 assert.equal(g.afterlifeWalks[0].escort.workerId,w.id);
});
test('saving an inbound or escorted ferry case never restores the soul on the dais stairs',()=>{
 for(const withWorker of [false,true]){
  const g=setup(),soul=g.queue[0];
  if(withWorker){const w=g.hireWorker();g.setWorkerMode(w.id,'escort');}
  g.startCourtArrival(soul);g.advanceAfterlife(withWorker?3600:1200);
  const restored=setup();assert.equal(restored.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
  const arrival=restored.courtArrivals.find(a=>a.soulId===soul.id);assert.ok(arrival);
  assert.ok(['ferry','dock'].includes(arrival.phase));
  assert.equal(restored.queue.some(s=>s.id===soul.id),true);
 }
});
test('gatherers physically visit the resource site and merchant before income is paid',()=>{
 const g=setup(),w=g.hireWorker();g.setWorkerMode(w.id,'gather');if(!g.stations.some(s=>s.def.k==='ngiw'))g.stations.push({def:STATIONS.find(d=>d.k==='ngiw'),build:0,repair:0,slots:[],fire:0});stepWorkers(g);
 const before=g.coin;assert.equal(w.job.phase,'collect');assert.equal(g.workerState.ledger.sales,0);
 for(let i=0;i<20000&&!g.workerState.ledger.sales;i++){if(i%50===0)stepWorkers(g);advanceWorkers(g,120);}
 assert.equal(g.workerState.ledger.sales,1);assert.ok(g.workerState.ledger.income>0);assert.ok(g.coin>before-30);
});
test('build helpers only accelerate a real Taan construction after physical arrival',()=>{
 const g=setup(),w=g.hireWorker();g.setWorkerMode(w.id,'build');
 const def={...STATIONS.find(s=>s.k==='ngiw'),x:SPOTS.bench.x,y:SPOTS.bench.y+60};
 const st={def,slots:[],fire:0,build:Date.now()+60000,buildWait:false};g.stations=[st];g.crewOf('taan').buildK='ngiw';
 stepWorkers(g);for(let i=0;i<2000&&!w.arrived;i++)advanceWorkers(g,120);
 assert.equal(w.arrived,true);const now=Date.now();st.build=now+60000;advanceWorkers(g,100,now);assert.equal(st.build,now+59980);
});
test('each farewell grants next-zone outfit once, with no money replay during old-save migration',()=>{
 for(const [zone,next] of [['th','asia'],['asia','west'],['west','cyberhell']]){
  const g={zone,coin:10,outfitsOwned:['th'],queueStory(){}};initializeBossGuides(g);recordBossGuideWin(g,{zone,kind:'zoneBoss',over:'win'});
  completeBossGuideStory(g,`boss-guide-${zone}-welcome`);completeBossGuideStory(g,`boss-guide-${zone}-farewell`);
  assert.ok(g.outfitsOwned.includes(next));const coin=g.coin;completeBossGuideStory(g,`boss-guide-${zone}-farewell`);assert.equal(g.coin,coin);
  const saved=JSON.parse(JSON.stringify(g.bossGuides));delete saved.zones[zone].outfitGranted;g.outfitsOwned=['th'];initializeBossGuides(g,saved);assert.ok(g.outfitsOwned.includes(next));assert.equal(g.coin,coin);
 }
});
test('renderer preload retains the decoded image and retries a broken browser response',async()=>{
 const saved=globalThis.Image;let urls=[],finish;
 globalThis.Image=class{set src(v){urls.push(v);queueMicrotask(()=>urls.length===1?this.onerror?.():this.onload?.());}decode(){return new Promise(r=>{finish=r;});}};
 const mod=await import('../src/town-terrain.js?test-retained-preview');let ready=false;
 const pending=mod.preloadTownTerrainPreview(1000).then(()=>{ready=true;});await new Promise(r=>setTimeout(r,0));assert.equal(ready,false);assert.match(urls[1],/recover=/);finish();await pending;assert.ok(mod.townTerrainImage());globalThis.Image=saved;
});

// Reopening a court must never send an already delivered soul back onto the ferry.
test('delivered court souls remain ashore across reopening and save restore',()=>{
 for(const withWorker of [false,true]){
  const g=setup(),soul=g.queue[0];
  if(withWorker){const w=g.hireWorker();g.setWorkerMode(w.id,'escort');}
  assert.equal(g.startCourtArrival(soul),true);g.advanceAfterlife(3600);g.advanceAfterlife(1e7);
  assert.equal(soul.courtDisembarked,true);
  assert.equal(g.startCourtArrival(soul),false);assert.equal(g.caseReady(soul),true);
  const restored=setup();assert.equal(restored.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
  const saved=restored.queue.find(s=>s.id===soul.id);
  assert.equal(restored.startCourtArrival(saved),false);assert.equal(restored.caseReady(saved),true);
 }
});
