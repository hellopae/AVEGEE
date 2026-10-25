import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {STATIONS,SPOTS,MERCHANT,BUILD_TIME,REPAIR_TIME} from '../src/data.js';
import {resetWalk,setBlocks,setNpcDiscs,nearestWalk} from '../src/walk.js?v=k1d';
import {normalizeWorkers,WORKER_MODES,stepWorkers,advanceWorkers,assignWorkerEscort} from '../src/workers.js';
import {canteenPoint,canteenState,prepareCooks,stepCanteen} from '../src/canteen.js';
import {beginMapTravel,advanceMapTravel,finishMapTravel,cancelMapTravel,KAN_HANDOFF} from '../src/map-travel.js';
globalThis.Image??=class{};
function game(unlock=true){resetWalk();setBlocks([],[]);setNpcDiscs([]);const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.food=100;g.level=5;g.paused=false;g.mobs=[];if(unlock)(g.zoneEvents.th||={}).frontierBreach='cleared';return g;}
const place=(w,p)=>{[w.x,w.y]=p;w.path=null;w.arrived=false;};
test('new hiring is gated by the invading demon victory, existing workers survive legacy mode migration',()=>{
 const g=game(false),before=g.coin;assert.equal(g.hireWorker(),false);assert.match(g.workerHireWhy(),/ชายแดน/);assert.equal(g.coin,before);
 (g.zoneEvents.th||={}).frontierBreach='active';assert.equal(g.hireWorker(),false);(g.zoneEvents.th||={}).frontierBreach='cleared';assert.ok(g.hireWorker());
 const raw={version:2,workers:[{id:'worker:7',homeZone:'th',mode:'supervise',stamina:55}]};const migrated=normalizeWorkers(raw);assert.equal(migrated.workers[0].mode,'auto');assert.equal(migrated.workers[0].stamina,55);assert.equal(migrated.nextId,8);
 assert.deepEqual(Object.keys(WORKER_MODES),['auto','gather','food','rest']);
});
for(const kind of ['build','repair'])test(`workers ${kind} without Taan and cannot open the building before physical inspection`,()=>{
 const g=game(),w=g.hireWorker(),taan=g.crewOf('taan');taan.at='krata';
 const key=kind==='build'?STATIONS.find(d=>d.cost>0&&!g.stations.some(st=>st.def.k===d.k)).k:g.stations[0].def.k;
 if(kind==='build')assert.equal(g.build(key),true);else{g.stations[0].fire=100;assert.equal(g.repairStation(key),true);}
 const st=g.stations.find(st=>st.def.k===key);assert.ok(st.workerWork);assert.equal(taan.buildK??null,null);stepWorkers(g);assert.equal(w.job.kind,kind);
 place(w,nearestWalk(st.def.x-34,st.def.y+36));for(let i=0;i<2000&&!st.workerWork.ready;i++)advanceWorkers(g,120);
 assert.equal(st.workerWork.ready,true);g.stepWorld(16);assert.ok(st[kind]);if(kind==='repair')assert.equal(st.fire,100);
 const saved=g.snapshot();const loaded=game();assert.equal(loaded.restore(saved),true);const resumed=loaded.stations.find(s=>s.def.k===key);assert.equal(resumed.workerWork.ready,true);assert.ok(resumed[kind]);
 taan.at=null;const at=nearestWalk(st.def.x,st.def.y);place(taan,at);g.stepWorld(16);assert.equal(st[kind],0);if(kind==='repair')assert.equal(st.fire,0);
});
test('when no worker is hired Taan still builds and repairs normally',()=>{
 const g=game(),d=STATIONS.find(d=>d.cost>0&&!g.stations.some(st=>st.def.k===d.k));assert.ok(g.build(d.k));assert.equal(g.crewOf('taan').buildK,d.k);assert.equal(g.stations.find(s=>s.def.k===d.k).workerWork,undefined);
});
test('gathering requires a real built resource station and sells exactly the collected load at merchant',()=>{
 const g=game(),w=g.hireWorker();g.stations=[];g.setWorkerMode(w.id,'gather');stepWorkers(g);assert.equal(w.job,null);
 const def=STATIONS.find(d=>d.k==='ngiw');g.stations=[{def,build:1}];stepWorkers(g);assert.equal(w.job,null);g.stations[0].build=0;stepWorkers(g);assert.equal(w.job.kind,'gather');
 place(w,nearestWalk(def.x,def.y));for(let i=0;i<20&&!w.cargo;i++)advanceWorkers(g,120);assert.equal(w.cargo,'ngiwWood');const coin=g.coin;assert.equal(g.workerState.ledger.sales,0);
 place(w,nearestWalk(MERCHANT.x,MERCHANT.y));for(let i=0;i<20&&!g.workerState.ledger.sales;i++)advanceWorkers(g,120);assert.equal(g.coin,coin+5);assert.equal(w.cargo,null);assert.equal(g.workerState.ledger.sales,1);
});
test('cooks physically reach canteen, make food, courier picks up and delivers it without consuming inventory rice',()=>{
 const g=game(),w=g.hireWorker();g.hire('dam');g.hire('plerng');g.inventory.food=9;g.food=0;prepareCooks(g);const at=canteenPoint(g);
 for(const c of g.crew.filter(c=>c.cook))place(c,[at[0],at[1]]);
 for(let i=0;i<30;i++)stepCanteen(g,120);assert.ok(g.food>0);assert.ok(canteenState(g).meals>0);
 const taan=g.crewOf('taan');taan.hunger=15;taan.morale=35;g.setWorkerMode(w.id,'food');stepWorkers(g);assert.equal(w.job.kind,'food');assert.equal(taan.hunger,15);
 place(w,at);advanceWorkers(g,120);assert.equal(w.meal,true);assert.equal(taan.hunger,15);
 place(w,nearestWalk(taan.x??taan.hx,taan.y??taan.hy));advanceWorkers(g,120);assert.equal(taan.hunger,55);assert.equal(taan.morale,55);assert.equal(w.meal,false);assert.equal(g.inventory.food,9);assert.equal(canteenState(g).served,1);
});
test('worker with zero morale walks to rest seats, sits and recovers; seated art exists for all zones',()=>{
 const g=game(),w=g.hireWorker();w.morale=0;stepWorkers(g);assert.equal(w.recovering,true);const at=canteenPoint(g);place(w,nearestWalk(at[0]-80,at[1]+50));advanceWorkers(g,120);assert.equal(w.sitting,true);assert.ok(w.morale>0);
 for(const z of ['th','asia','west','cyberhell'])assert.ok(existsSync(new URL(`../img/workers/worker-${z}-rest-v1.webp`,import.meta.url)));
});
function boat(){const g=game();g.zoneTravel.visited.asia=true;g.zoneTravel.ports.asia=true;const p=g.harbourPoint();g.player.x=p.x;g.player.y=p.y;return g;}
test('on-map journey includes handoff, boarding, right departure, left arrival and commits zone exactly once',()=>{
 const g=boat();let moves=0;const move=g.moveZone.bind(g);g.moveZone=k=>{moves++;return move(k);};assert.equal(beginMapTravel(g,'asia'),true);assert.equal(beginMapTravel(g,'asia'),false);assert.equal(g.walkTo(10,10),false);
 const phases=new Set();for(let i=0;i<2000&&g.mapTravel;i++){phases.add(g.mapTravel.phase);advanceMapTravel(g,120);}
 assert.equal(g.mapTravel,null);assert.equal(g.zone,'asia');assert.equal(moves,1);assert.deepEqual([...phases],['approach','handoff','board','depart','arrive','land']);assert.equal(KAN_HANDOFF,'เดี๋ยวข้าดูแลโซนนี้ต่อเอง ไม่ต้องห่วง');assert.equal(finishMapTravel(g),false);
});
test('cancel before departure preserves source, skip travels once, reduced motion keeps readable handoff',()=>{
 const g=boat();beginMapTravel(g,'asia');assert.equal(cancelMapTravel(g),true);assert.equal(g.zone,'th');beginMapTravel(g,'asia',{reduced:true});advanceMapTravel(g,120);assert.equal(g.mapTravel.phase,'handoff');advanceMapTravel(g,120);assert.equal(g.mapTravel.phase,'handoff');assert.equal(finishMapTravel(g),true);assert.equal(g.zone,'asia');assert.equal(finishMapTravel(g),false);
});

test('empty supplies seat workers and require a player rice gift or tea-rest order even after kitchen refills',()=>{
 const g=game(),w=g.hireWorker();g.setWorkerMode(w.id,'gather');g.stations.push({def:STATIONS.find(d=>d.k==='ngiw'),build:0,repair:0,slots:[]});
 g.food=0;stepWorkers(g);assert.equal(w.supplyRest,true);assert.equal(w.hunger,0);assert.equal(w.funded,false);g.food=30;stepWorkers(g);assert.equal(w.supplyRest,true);assert.equal(w.job,null);
 assert.equal(g.feedWorker(w.id),false);g.inventory.food=1;assert.equal(g.feedWorker(w.id),true);assert.equal(g.inventory.food,undefined);assert.equal(w.supplyRest,false);stepWorkers(g);assert.equal(w.funded,true);
 g.food=0;stepWorkers(g);assert.equal(w.supplyRest,true);assert.equal(g.restWorkerAtTea(w.id),false);const def=STATIONS.find(d=>d.k==='tea');g.stations.push({def,build:0,repair:0,slots:[]});assert.equal(g.restWorkerAtTea(w.id),true);
 place(w,w.teaRest.dest);w.teaRest.path=[];advanceWorkers(g,120);assert.equal(w.sitting,true);const started=w.teaRest.startedAt;g.food=20;for(let i=0;i<6;i++)stepWorkers(g);assert.equal(w.supplyRest,true);g.updateActorRecovery(started+119999);assert.equal(w.mode,'rest');g.updateActorRecovery(started+120000);assert.equal(w.supplyRest,false);assert.equal(w.mode,'gather');
});

test('a keeper collects successive judged souls one journey at a time and a cook can leave for an assigned case',()=>{
 const g=game(),w=g.hireWorker();g.queue.forEach(s=>s.courtDisembarked=true);const first=g.queue[0];assert.equal(g.assign(first.id,'krata','taan',3),true);const a=g.afterlifeWalks.find(v=>v.destination==='station');assert.equal(a.escort.k,'taan');
 g.spawnSoul();const second=g.queue[0];g.cancelCourtArrival(second.id);second.courtDisembarked=true;assert.equal(g.assign(second.id,'krata','taan',3),true);const b=g.afterlifeWalks.find(v=>v.soul.id===second.id);assert.equal(b.awaitKeeper,true);g.advanceAfterlife(120);assert.equal(b.elapsed,0);
 g.advanceAfterlife(a.duration);g.advanceAfterlife(120);assert.equal(b.awaitKeeper,false);assert.equal(b.escort.k,'taan');assert.ok(b.elapsed>0);assert.equal(w.job,null);
 const g2=game();g2.hireWorker();g2.hire('dam');prepareCooks(g2);assert.equal(g2.crewOf('dam').cook,true);const soul=g2.queue[0];soul.courtDisembarked=true;assert.equal(g2.assign(soul.id,'krata','dam',3),true);assert.equal(g2.crewOf('dam').cook,false);assert.equal(g2.afterlifeWalks.find(v=>v.destination==='station').escort.k,'dam');
});
