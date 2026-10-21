import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {stepWorkers,advanceWorkers} from '../src/workers.js';
const game=()=>{const g=createGame();g.coin=10000;g.food=100;g.save=()=>true;g.onChange=()=>{};g.paused=false;g.mobs=[];return g;};
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
 const g=game(),w=g.hireWorker();g.zoneTravel.active={route:'th:asia',checkpoint:0,position:{x:.1,y:.1}};
 stepWorkers(g);assert.equal(w.job.kind,'gather');assert.equal(w.funded,true);const start=[w.x,w.y];
 for(let i=0;i<50;i++)advanceWorkers(g,120);assert.ok(Math.hypot(w.x-start[0],w.y-start[1])>10);
 g.paused=true;const at=[w.x,w.y];stepWorkers(g);advanceWorkers(g,120);assert.deepEqual([w.x,w.y],at,'the active dungeon dialog still pauses management via the normal pause state');
});
