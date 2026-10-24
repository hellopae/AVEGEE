import test from 'node:test';import assert from 'node:assert/strict';
import {STATIONS} from '../src/data.js';
import {createGame} from '../src/game.js';
import {stepWorkers,advanceWorkers} from '../src/workers.js';
import {workerSupplyBlocked} from '../src/worker-ui.js';
const game=()=>{const g=createGame();(g.zoneEvents.th||={}).frontierBreach='cleared';g.coin=10000;g.food=100;g.save=()=>true;g.onChange=()=>{};g.paused=false;g.mobs=[];return g;};
test('closing intake does not strand already disembarked souls waiting for a newly hired worker',()=>{
 const g=game(),s=g.queue[0];g.cancelCourtArrival(s.id);g.courtArrivals=[{soulId:s.id,phase:'dock',zone:g.zone,elapsed:3600,duration:3600}];g.courtClosed=true;
 g.advanceCourtArrivals(120);assert.equal(g.courtArrivals[0].phase,'dock');const w=g.hireWorker();g.setWorkerMode(w.id,'escort');
 g.advanceCourtArrivals(120);assert.equal(g.courtArrivals[0].phase,'escort');assert.equal(g.afterlifeWalks[0].escort.workerId,w.id);
 g.advanceAfterlife(1e7);assert.equal(g.courtArrivals.length,0);assert.equal(g.workerState.ledger.escortsDone,1);assert.equal(w.job,null);
});
test('closed intake still holds boats that have not disembarked',()=>{
 const g=game(),s=g.queue[0];g.cancelCourtArrival(s.id);g.courtArrivals=[{soulId:s.id,phase:'queued',zone:g.zone,elapsed:0,duration:3600}];g.courtClosed=true;g.hireWorker();
 g.advanceCourtArrivals(5000);assert.equal(g.courtArrivals[0].phase,'queued');assert.equal(g.courtArrivals[0].elapsed,0);assert.equal(g.afterlifeWalks.length,0);
});
test('a saved dungeon route does not freeze workers when the town is running',()=>{
 const g=game(),w=g.hireWorker();g.stations.push({def:STATIONS.find(d=>d.k==='ngiw'),build:0,repair:0,slots:[],fire:0});g.zoneTravel.active={route:'th:asia',checkpoint:0,position:{x:.1,y:.1}};
 stepWorkers(g);assert.equal(w.job.kind,'gather');assert.equal(w.funded,true);const start=[w.x,w.y];
 for(let i=0;i<50;i++)advanceWorkers(g,120);assert.ok(Math.hypot(w.x-start[0],w.y-start[1])>10);
 g.paused=true;const at=[w.x,w.y];stepWorkers(g);advanceWorkers(g,120);assert.deepEqual([w.x,w.y],at,'the active dungeon dialog still pauses management via the normal pause state');
});

test('empty central supplies hold dock pickup; a paid refill plus player rice gift resumes the same worker',()=>{
 const g=game(),s=g.queue[0];g.cancelCourtArrival(s.id);g.courtClosed=true;
 g.courtArrivals=[{soulId:s.id,phase:'dock',zone:g.zone,elapsed:3600,duration:3600}];
 const w=g.hireWorker();g.setWorkerMode(w.id,'escort');g.food=0;g.inventory.food=16;
 const start=[w.x,w.y];
 for(let i=0;i<20;i++){stepWorkers(g);g.advanceAfterlife(120);advanceWorkers(g,120);}
 assert.equal(workerSupplyBlocked(g),true);assert.equal(w.resting,true);assert.equal(w.job,null);assert.equal(g.courtArrivals[0].phase,'dock');assert.equal(g.afterlifeWalks.length,0);
 const before=g.coin;assert.equal(g.buy('food',1),true);assert.equal(g.coin,before-10);assert.equal(g.inventory.food,16);assert.equal(workerSupplyBlocked(g),true);assert.equal(g.feedWorker(w.id),true);assert.equal(workerSupplyBlocked(g),false);
 g.advanceAfterlife(120);assert.equal(g.afterlifeWalks[0].escort.workerId,w.id);
 for(let i=0;i<10000&&g.courtArrivals.length;i++){if(i%10===0)stepWorkers(g);g.advanceAfterlife(120);advanceWorkers(g,120);}
 assert.equal(g.courtArrivals.length,0);assert.equal(g.workerState.ledger.escortsDone,1);assert.equal(g.workerState.workers.length,1);assert.ok(Math.hypot(w.x-start[0],w.y-start[1])>10);
});
