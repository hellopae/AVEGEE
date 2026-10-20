import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {escortCrewPosition} from '../src/escort.js';
import {resetWalk,setBlocks,setNpcDiscs} from '../src/walk.js?v=k1d';

const setup=()=>{
  const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.food=100;
  resetWalk();setBlocks([],[]);setNpcDiscs([]);return g;
};

for(const phase of ['pickup','lead'])test(`early trial preserves the worker's ${phase} position before station delivery`,()=>{
  const g=setup(),worker=g.hireWorker(),soul=g.queue[0];
  g.setWorkerMode(worker.id,'escort');g.startCourtArrival(soul);g.advanceAfterlife(3600);
  const inbound=g.afterlifeWalks.find(w=>w.destination==='arrival');assert.ok(inbound);
  if(phase==='lead')g.advanceAfterlife(Math.max(0,inbound.delay+200-inbound.elapsed));
  const expected=escortCrewPosition(inbound);assert.equal(expected.phase,phase);
  assert.equal(g.caseReady(soul),true,'trial is available immediately after disembarkation');
  assert.equal(g.assign(soul.id,'krata','taan',3),true);
  assert.ok(Math.hypot(worker.x-expected.x,worker.y-expected.y)<.001,'cancelling the inbound walk must not teleport its worker');
  assert.equal(g.afterlifeWalks.some(w=>w.destination==='arrival'),false);
  const delivery=g.afterlifeWalks.find(w=>w.destination==='station');assert.ok(delivery);
  assert.equal(delivery.escort.workerId,worker.id);
  assert.deepEqual(delivery.escort.pickup[0],[expected.x,expected.y],'new route starts at the worker visible position');
  assert.equal(g.workerState.ledger.escortsDone,0,'interrupted arrival is not counted as a completed delivery');
  g.advanceAfterlife(delivery.duration);
  assert.deepEqual([worker.x,worker.y],delivery.path.at(-1),'completed delivery still releases at its destination');
  assert.equal(worker.job,null);assert.equal(g.workerState.ledger.escortsDone,1);
  g.advanceAfterlife(delivery.duration);assert.equal(g.workerState.ledger.escortsDone,1);
});
