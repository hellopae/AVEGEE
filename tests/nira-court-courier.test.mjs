import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './helpers/m2-map.mjs';
import {harbourTravel} from './helpers/travel.mjs';
import {ZONE_EVENTS,QUEUE_LINE} from '../src/data.js';
import {canWalk} from '../src/walk.js?v=k1d';
import {escortCrewPosition} from '../src/escort.js';
function game(zone='th'){
 const {g}=setup('th');g.save=()=>true;g.onChange=()=>{};g.paused=false;g.mobs=[];
 for(const [key,events] of Object.entries(ZONE_EVENTS))g.zoneEvents[key]=Object.fromEntries(events.map(e=>[e.k,'cleared']));
 if(zone!=='th')assert.equal(harbourTravel(g,zone),true);
 g.paused=false;g.pendingZone=null;g.queue=[];g.courtArrivals=[];g.afterlifeWalks=[];g.transits=[];g.food=100;g.coin=10000;
 const n=g.crewOf('nira');Object.assign(n,{x:n.hx,y:n.hy,escort:null,path:null});return g;
}
function dock(g,id=700001){const s={id,who:'วิญญาณรอรับ',name:'วิญญาณรอรับ',courtDisembarked:true};g.queue.push(s);g.courtArrivals.push({soulId:id,zone:g.zone,phase:'dock',elapsed:3600,duration:3600});return s;}
for(const zone of ['th','asia','west','cyberhell'])test(`${zone}: no hired worker, Nira physically collects a docked soul and leads it onto the court path`,()=>{
 const g=game(zone),s=dock(g),n=g.crewOf('nira'),taan=g.crewOf('taan');const duty={at:taan?.at,escort:taan?.escort,buildK:taan?.buildK};
 g.advanceCourtArrivals(120);const w=g.afterlifeWalks[0];assert.ok(w);assert.equal(w.escort.k,'nira');assert.equal(w.escort.courtCourier,true);assert.equal(n.escort,s.id);assert.equal(g.courtArrivals[0].phase,'escort');assert.ok(w.escort.pickup.length>1);
 g.advanceAfterlife(Math.max(1,w.delay/2));const pickup=escortCrewPosition(w);assert.ok(Math.hypot(n.x-pickup.x,n.y-pickup.y)<.001);assert.equal(canWalk(n.x,n.y),true);
 g.advanceAfterlife(w.delay-w.elapsed+(w.duration-w.delay)/2);assert.equal(escortCrewPosition(w).phase,'lead');assert.equal(canWalk(n.x,n.y),true);
 g.advanceAfterlife(w.duration);assert.equal(n.escort,null);assert.equal(g.afterlifeWalks.length,0);assert.equal(g.courtArrivals.length,0);assert.equal(g.queue.filter(q=>q.id===s.id).length,1);assert.equal(g.workerState.ledger.escortsDone,0);assert.deepEqual({at:taan?.at,escort:taan?.escort,buildK:taan?.buildK},duty);
});
test('the opening game has only Nira and Taan and ferry arrival dispatches Nira without unlocking hiring or consuming supplies',()=>{
 const g=game();g.zoneEvents={};g.bossCleared={};assert.deepEqual(g.crew.map(c=>c.k).sort(),['nira','taan']);g.food=0;const s={id:700010,who:'เริ่มเกม'};g.queue.push(s);assert.ok(g.startCourtArrival(s));g.advanceCourtArrivals(3600);assert.equal(g.afterlifeWalks[0].escort.k,'nira');assert.equal(g.food,0);assert.match(g.workerHireWhy(),/ชายแดน/);
});
test('Nira handles one arrival at a time; busy/resting Nira leaves the next passenger safely docked',()=>{
 const g=game(),a=dock(g,700020),b=dock(g,700021);g.niraRest={remaining:3};g.advanceCourtArrivals(120);assert.equal(g.afterlifeWalks.length,0);
 g.niraRest=null;g.advanceCourtArrivals(120);assert.equal(g.afterlifeWalks.length,1);assert.equal(g.afterlifeWalks[0].soul.id,a.id);assert.equal(g.courtArrivals.find(v=>v.soulId===b.id).phase,'dock');g.advanceCourtArrivals(120);assert.equal(g.afterlifeWalks.length,1);
 g.advanceAfterlife(g.afterlifeWalks[0].duration);g.advanceCourtArrivals(120);assert.equal(g.afterlifeWalks[0].soul.id,b.id);assert.equal(g.afterlifeWalks[0].escort.k,'nira');
});
for(const phase of ['pickup','lead'])test(`early trial cancels Nira's ${phase} at her visible position, without teleporting her to the destination`,()=>{
 const g=game(),s=dock(g,700030);g.advanceCourtArrivals(120);const w=g.afterlifeWalks[0];g.advanceAfterlife(phase==='pickup'?w.delay*.4:w.delay+(w.duration-w.delay)*.4);const expected=escortCrewPosition(w);
 g.cancelCourtArrival(s.id);const n=g.crewOf('nira');assert.equal(n.escort,null);assert.ok(Math.hypot(n.x-expected.x,n.y-expected.y)<.001);assert.equal(g.afterlifeWalks.length,0);assert.equal(g.queue.filter(q=>q.id===s.id).length,1);g.cancelCourtArrival(s.id);assert.ok(Math.hypot(n.x-expected.x,n.y-expected.y)<.001);
});
test('hiring a worker keeps Nira current delivery intact and routes the next arrival to the worker',()=>{
 const g=game(),a=dock(g,700040);g.advanceCourtArrivals(120);const first=g.afterlifeWalks[0],w=g.hireWorker();assert.ok(w);const b=dock(g,700041);g.advanceCourtArrivals(120);
 assert.equal(first.escort.k,'nira');assert.equal(g.crewOf('nira').escort,a.id);const second=g.afterlifeWalks.find(x=>x.soul.id===b.id);assert.equal(second.escort.workerId,w.id);assert.equal(g.afterlifeWalks.length,2);
});
test('hired workers resting or out of food do not gain a Nira shortcut around their availability rules',()=>{
 const g=game(),w=g.hireWorker();g.setWorkerMode(w.id,'rest');dock(g,700050);g.advanceCourtArrivals(120);assert.equal(g.afterlifeWalks.length,0);assert.equal(g.crewOf('nira').escort,null);
 g.setWorkerMode(w.id,'auto');g.food=0;g.advanceCourtArrivals(120);assert.equal(g.afterlifeWalks.length,0);
});
test('restore of Nira pickup retries from the dock once, without a stuck reader or duplicate soul',()=>{
 const g=game(),s=dock(g,700060);g.advanceCourtArrivals(120);g.advanceAfterlife(g.afterlifeWalks[0].delay*.4);const saved=JSON.parse(JSON.stringify(g.snapshot()));const loaded=game();assert.equal(loaded.restore(saved),true);
 assert.equal(loaded.afterlifeWalks.length,0);assert.equal(loaded.courtArrivals.find(a=>a.soulId===s.id).phase,'dock');assert.ok(!loaded.crewOf('nira').escort);loaded.advanceCourtArrivals(120);assert.equal(loaded.afterlifeWalks.length,1);loaded.advanceAfterlife(loaded.afterlifeWalks[0].duration);assert.equal(loaded.queue.filter(q=>q.id===s.id).length,1);assert.equal(loaded.courtArrivals.length,0);assert.equal(loaded.crewOf('nira').escort,null);
});
