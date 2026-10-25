import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {STATIONS} from '../src/data.js';
import {actorStanding} from '../src/actor-recovery.js';
import {stepWorkers,advanceWorkers,normalizeWorkers} from '../src/workers.js';
import {STAFF_TEA_REST_MS,teaRoomStaff,teaRestSprite,reserveTeaSeat,TEA_SEAT_COUNT} from '../src/tea-staff-rest.js';
import {harbourTravel} from './helpers/travel.mjs';
import {resetWalk} from '../src/walk.js?v=k1d';
globalThis.Image??=class{};
const game=zone=>{resetWalk();const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=100000;g.level=5;g.bossCleared={th:true,asia:true,west:true};g.zoneEvents.th={frontierBreach:'cleared'};if(zone!=='th')assert.ok(harbourTravel(g,zone));g.hireGuard();for(const k of ['taan','plerng','boon','dam','kan'])if(!g.crewOf(k))g.hire(k);g.stations.push({def:STATIONS.find(s=>s.k==='tea'),build:0,repair:0,slots:[]});return g;};
for(const zone of ['th','asia','west','cyberhell'])test(`A2 ${zone}: shared seats, two minutes on arrival, no drift and save/reload`,()=>{
 const nativeNow=Date.now;let now=nativeNow();Date.now=()=>now;
 try{
  const g=game(zone),crew=g.crew.filter(c=>!c.reader&&!c.self);assert.equal(crew.length,5);
  const actors=[...crew,g.guard];const workers=Array.from({length:6},()=>g.hireWorker());assert.ok(workers.every(Boolean));
  const origins=new Map([...actors,...workers].map(c=>[c.id,[c.x??c.hx,c.y??c.hy]]));
  for(const c of actors){c.morale=20;assert.ok(g.restActor(c.id,now));assert.equal(actorStanding(c),false);assert.equal(g.restActor(c.id,now),false);}
  for(const w of workers){w.stamina=10;w.morale=20;w.hunger=0;w.supplyRest=true;assert.ok(g.restWorkerAtTea(w.id));assert.equal(g.restWorkerAtTea(w.id),false);}
  const seats=[...actors,...workers].map(c=>c.teaRest.seat);assert.equal(new Set(seats).size,12);assert.equal(teaRoomStaff(g).length,0);
  now+=30000;g.updateActorRecovery(now);assert.equal(teaRoomStaff(g).length,12);const points=teaRoomStaff(g).map(c=>c.point.join());assert.equal(new Set(points).size,12);
  for(const c of [...actors,...workers])assert.equal(c.teaRest.until-c.teaRest.startedAt,120000);
  const clone=createGame();clone.save=()=>true;clone.onChange=()=>{};assert.ok(clone.restore(JSON.parse(JSON.stringify(g.snapshot()))));
  const remaining=[...Object.values(clone.roster).filter(c=>c.teaRest),...clone.workerState.workers];assert.equal(remaining.length,12);
  const positions=new Map(remaining.map(c=>[c.id,[c.x,c.y]]));now+=1000;clone.stepWorld(120);stepWorkers(clone);advanceWorkers(clone,120,now);
  for(const c of remaining){assert.deepEqual([c.x,c.y],positions.get(c.id));assert.equal(c.morale,20);}
  // Each person ends at exactly their own arrival + two minutes, including dormant-zone state.
  for(const c of remaining){const end=c.teaRest.until;clone.updateGuardRest(c,end-1);assert.ok(c.teaRest);clone.updateGuardRest(c,end);assert.equal(c.teaRest,null);assert.equal(c.morale,100);assert.equal(c.hunger,100);assert.deepEqual([c.x,c.y],origins.get(c.id));}
  assert.equal(teaRoomStaff(clone).length,0);assert.equal(reserveTeaSeat(clone,zone),0);
 }finally{Date.now=nativeNow;}
});
test('A2 worker rest cancellation releases cushion; legacy boolean orders and old Guard duration migrate',()=>{
 const g=game('th'),w=g.hireWorker();w.mode='gather';assert.ok(g.restWorkerAtTea(w.id));const seat=w.teaRest.seat;assert.ok(g.setWorkerMode(w.id,'food'));assert.equal(w.teaRest,null);assert.equal(reserveTeaSeat(g,'th'),seat);
 const raw=normalizeWorkers({workers:[{...w,mode:'rest',resumeMode:'gather',teaRest:true}]});g.workerState=raw;const old=raw.workers[0];advanceWorkers(g,120);assert.equal(old.teaRest.phase,'travel');assert.equal(old.resumeMode,'gather');
 g.guard.morale=10;g.guard.teaRest={phase:'rest',zone:'th',startedAt:1000,until:61000,returnAt:[800,400]};g.updateGuardRest(g.guard,61000);assert.ok(g.guard.teaRest);assert.equal(g.guard.teaRest.startedAt,1000);assert.equal(g.guard.teaRest.until,121000);g.updateGuardRest(g.guard,120999);assert.equal(g.guard.morale,10);g.updateGuardRest(g.guard,121000);assert.equal(g.guard.teaRest,null);
});
test('A2 every regional seated identity and worker rest sprite exists; cushions stay off Yama seat',()=>{
 for(const zone of ['th','asia','west','cyberhell'])for(const k of ['taan','plerng','boon','dam','kan','guard','nira'])assert.ok(existsSync(new URL('../'+teaRestSprite({id:zone+':'+k,k,homeZone:zone},zone),import.meta.url)));
 for(const zone of ['th','asia','west','cyberhell'])assert.ok(existsSync(new URL('../'+teaRestSprite({id:'worker:1',homeZone:zone},zone),import.meta.url)));
 assert.equal(TEA_SEAT_COUNT,15);
});
