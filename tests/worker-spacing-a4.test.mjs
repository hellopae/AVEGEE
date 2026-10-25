import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {STATIONS,QUEUE_LINE,ZONE_EVENTS,SCENE} from '../src/data.js';
import {canWalk,resetWalk,setNpcDiscs,setBlocks,nearestWalk} from '../src/walk.js?v=k1d';
import {soulWalkPosition,escortCrewPosition} from '../src/escort.js';
import {releaseWorkerEscort} from '../src/workers.js';
import {planWorkerEscort,WORKER_HANDOFF_GAP,WORKER_PICKUP_GAP} from '../src/worker-escort-spacing.js';
import {harbourTravel} from './helpers/travel.mjs';
globalThis.Image??=class{};
function fixture(zone){
 resetWalk();const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=100000;g.food=1000;g.level=5;g.bossCleared={th:true,asia:true,west:true};
 for(const [z,events] of Object.entries(ZONE_EVENTS))g.zoneEvents[z]=Object.fromEntries(events.map(e=>[e.k,'cleared']));
 if(zone!=='th')assert.ok(harbourTravel(g,zone));g.paused=false;g.queue=[];g.courtArrivals=[];g.afterlifeWalks=[];g.mobs=[];g.storyQueue=[];g.pendingZone=null;
 for(const k of ['krata','tarang','sawan'])if(!g.has(k))g.stations.push({def:STATIONS.find(s=>s.k===k),build:0,repair:0,slots:[],fire:0});
 resetWalk();setNpcDiscs([]);g.syncBlocks(true);return g;
}
function dispatch(g,destination,id=88001){
 const soul={id,who:'ทดสอบนำส่ง',name:'ทดสอบนำส่ง',sex:'m',sp:1,deeds:[],merits:[]},spot=k=>{const s=STATIONS.find(s=>s.k===k);return [s.x,s.y];};
 const from=destination==='arrival'?[g.harbourPoint().x,g.harbourPoint().y]:spot(destination==='prison'?'krata':'tarang'),to=destination==='gate'?spot('sawan'):destination==='prison'?spot('tarang'):QUEUE_LINE[0];
 if(destination==='arrival')g.queue.push(soul);
 assert.ok(g.startAfterlifeWalk(soul,from,to,destination,{soul,zone:g.zone,stage:destination==='prison'?'prison':'gate'}));
 const walk=g.afterlifeWalks.find(w=>w.soul.id===id);assert.ok(walk.escort?.workerId,`${g.zone} ${destination}: worker must accept safe handoff`);return walk;
}
for(const zone of ['th','asia','west','cyberhell'])for(const destination of ['arrival','prison','gate','queue'])test(`A4 ${zone}/${destination}: separated pickup, walkable delivery and exact-once release`,()=>{
 const g=fixture(zone),w=g.hireWorker(),walk=dispatch(g,destination);const source=JSON.stringify(walk.path),travel=walk.duration-walk.delay;
 assert.ok(walk.escort.workerPath);assert.ok(walk.escort.leadAt>=56||walk.escort.formation==='follow');let minLead=Infinity,minPickup=Infinity;
 const step=Math.max(10,walk.duration/150);
 for(let time=step;time<walk.duration;time+=step){
  g.advanceAfterlife(time-walk.elapsed);const soul=soulWalkPosition(walk),d=Math.hypot(w.x-soul[0],w.y-soul[1]);assert.ok(canWalk(w.x,w.y),`${zone}/${destination} worker left floor at ${time}`);
  if(time>=walk.delay)minLead=Math.min(minLead,d);else minPickup=Math.min(minPickup,d);
 }
 assert.ok(minPickup>=WORKER_PICKUP_GAP-.5,`${zone}/${destination} pickup gap ${minPickup}`);
 assert.ok(minLead>=39.5,`${zone}/${destination} moving gap ${minLead}`);
 assert.equal(walk.duration-walk.delay,travel);assert.equal(JSON.stringify(walk.path),source,'soul route unchanged');
 g.advanceAfterlife(walk.duration-walk.elapsed);assert.equal(w.job,null);assert.equal(g.workerState.ledger.escortsDone,1);assert.ok(canWalk(w.x,w.y));
 const end=walk.path.at(-1);assert.ok(Math.hypot(w.x-end[0],w.y-end[1])>=WORKER_HANDOFF_GAP-.01);
 if(destination==='arrival'||destination==='queue')assert.ok(Math.hypot(w.x-QUEUE_LINE[0][0],w.y-QUEUE_LINE[0][1])>=48,'worker also clears the visible queue foot');
 const count=()=>destination==='arrival'?g.courtArrivals.length:destination==='queue'?g.queue.filter(s=>s.id===walk.soul.id).length:g.sentences.filter(s=>s.soul.id===walk.soul.id).length;
 assert.equal(count(),destination==='arrival'?0:1);assert.equal(releaseWorkerEscort(g,walk),false);g.advanceAfterlife(1e7);assert.equal(g.workerState.ledger.escortsDone,1);assert.equal(count(),destination==='arrival'?0:1);
});
test('A4 handoff reservations separate workers; cancellation and legacy save retain a safe position',()=>{
 const g=fixture('th'),first=g.hireWorker(),second=g.hireWorker(),a=dispatch(g,'prison',88011),b=dispatch(g,'prison',88012);
 assert.ok(Math.hypot(a.escort.dropoff[0]-b.escort.dropoff[0],a.escort.dropoff[1]-b.escort.dropoff[1])>=48);
 g.advanceAfterlife(a.delay+200);const worker=g.workers().find(w=>w.id===a.escort.workerId),pos=escortCrewPosition(a);assert.ok(g.setWorkerMode(worker.id,'rest'));assert.deepEqual([worker.x,worker.y],[pos.x,pos.y]);assert.equal(a.escort,null);
 const old=structuredClone(b);delete old.escort.workerPath;delete old.escort.dropoff;delete old.escort.leadAt;
 const remaining=g.workers().find(w=>w.id===old.escort.workerId);assert.ok(releaseWorkerEscort(g,{...old,elapsed:old.duration}));assert.ok(Math.hypot(remaining.x-old.path.at(-1)[0],remaining.y-old.path.at(-1)[1])>=72);
 assert.equal(releaseWorkerEscort(g,{...old,elapsed:old.duration}),false);
});
test('A4 no safe floor does not assign or alter the soul journey',()=>{
 const g=fixture('th'),w=g.hireWorker(),at=nearestWalk(w.x,w.y),walk={path:[at,[at[0]+16,at[1]]],soul:{id:89999},duration:1100,elapsed:0};
 const before=JSON.stringify(walk);setBlocks([[0,0,SCENE.w,SCENE.h]],[]);assert.equal(planWorkerEscort(g,w,walk),null);assert.equal(JSON.stringify(walk),before);assert.equal(w.job,null);resetWalk();
});
for(const zone of ['th','asia','west','cyberhell'])test(`A4 ${zone}: saved gate delivery settles beside the soul once across two reloads`,()=>{
 const g=fixture(zone),w=g.hireWorker(),walk=dispatch(g,'gate');g.advanceAfterlife(walk.delay+150);const h=createGame();h.save=()=>true;h.onChange=()=>{};assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));
 const worker=h.workers().find(c=>c.id===w.id),end=walk.path.at(-1);assert.equal(worker.job,null);assert.equal(h.workerState.ledger.escortsDone,1);assert.ok(Math.hypot(worker.x-end[0],worker.y-end[1])>=72);assert.ok(canWalk(worker.x,worker.y));assert.equal(h.sentences.filter(s=>s.soul.id===walk.soul.id).length,1);
 const again=createGame();again.save=()=>true;again.onChange=()=>{};assert.ok(again.restore(JSON.parse(JSON.stringify(h.snapshot()))));assert.equal(again.workerState.ledger.escortsDone,1);assert.equal(again.sentences.filter(s=>s.soul.id===walk.soul.id).length,1);
});
test('A4 frozen west save preserves the separated route and resumes without settling early',()=>{
 const g=fixture('west'),w=g.hireWorker(),walk=dispatch(g,'gate');g.advanceAfterlife(walk.delay+150);g.zoneEvents.west.westVampireBreach='pending';
 const h=createGame();h.save=()=>true;h.onChange=()=>{};assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));assert.deepEqual(h.afterlifeWalks[0].escort.workerPath,walk.escort.workerPath);
 const before=h.afterlifeWalks[0].elapsed;h.advanceAfterlife(5000);assert.equal(h.afterlifeWalks[0].elapsed,before);assert.equal(h.workerState.ledger.escortsDone,0);
 h.zoneEvents.west.westVampireBreach='cleared';h.paused=false;h.advanceAfterlife(1e7);assert.equal(h.afterlifeWalks.length,0);assert.equal(h.workerState.ledger.escortsDone,1);assert.equal(h.workers().find(c=>c.id===w.id).job,null);
});
