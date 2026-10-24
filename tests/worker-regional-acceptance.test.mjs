import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {STATIONS,ZONE_EVENTS} from '../src/data.js';
import {canWalk,resetWalk,setNpcDiscs} from '../src/walk.js?v=k1d';
import {stepWorkers,advanceWorkers,workerSupervisionMultiplier} from '../src/workers.js';
import {harbourTravel} from './helpers/travel.mjs';

// Gameplay simulations, not browser/image-mask acceptance. The branch fixture
// starts after its story gates and construction are complete, then uses real
// movement, collision, assignment, wages, ferry, sentencing and worker APIs.
globalThis.Image??=class {};
const zones=['th','asia','west','cyberhell'];
function fixture(zone){
  const nativeNow=Date.now;let now=nativeNow(),frame=0;Date.now=()=>now;
  const g=createGame();(g.zoneEvents.th||={}).frontierBreach='cleared';g.save=()=>true;g.onChange=()=>{};g.coin=100000;g.food=3000;g.level=5;
  g.bossCleared={th:true,asia:true,west:true};
  for(const [key,events]of Object.entries(ZONE_EVENTS))g.zoneEvents[key]=Object.fromEntries(events.map(ev=>[ev.k,'cleared']));
  if(zone!=='th')assert.equal(harbourTravel(g,zone),true);
  if(!g.crewOf('taan'))assert.equal(g.hire('taan'),true);
  for(const key of ['krata','ngiw','dab','sawan'])if(!g.has(key)){
    assert.equal(g.build(key),true);const st=g.stations.find(s=>s.def.k===key);st.build=0;st.buildWait=false;
    for(const c of g.crew)if(c.buildK===key)c.buildK=null;
  }
  g.paused=false;g.queue=[];g.courtArrivals=[];g.afterlifeWalks=[];g.transits=[];g.pendingZone=null;g.pendingReward=null;g.storyQueue=[];
  g.player.path=null;g.player.tx=g.player.ty=null;g.nextArrive=g.nextEvent=g.nextPay=g.nextKpi=1e9;
  resetWalk();setNpcDiscs([]);g.syncBlocks(true);
  const step=({management=true,world=true,afterlife=true}={})=>{
    now+=120;if(frame++%8===0){if(management)g.step();else stepWorkers(g);}
    if(world)g.stepWorld(120);else advanceWorkers(g,120);
    if(afterlife)g.advanceAfterlife(120);
  };
  return {g,step,until(predicate,label,options,max=2500){for(let i=0;i<max&&!predicate();i++)step(options);assert.ok(predicate(),`${zone}: ${label} ${JSON.stringify({workers:g.workers(),builders:g.crew.filter(c=>c.buildK).map(c=>({k:c.k,at:c.buildK,x:c.x,y:c.y})),sites:g.stations.filter(s=>s.build||s.repair).map(s=>({key:s.def.k,build:s.build,wait:s.buildWait}))})}`);},
    restore(){Date.now=nativeNow;}};
}
const soul=zone=>({id:97501,who:'วิญญาณทดสอบงาน',name:'วิญญาณทดสอบงาน',zone,sex:'m',sp:1,pure:false,
  case:zone==='asia'?'A1':null,deeds:[{s:'kong',w:4,t:'โกงเงินผู้อื่น',known:true}],merits:[],deserved:4,presses:2,said:[],lines:[],calm:true,resist:false});

for(const zone of zones){
  test(`${zone}: both regional gatherers physically collect and sell distinct materials with real wages`,()=>{
    const f=fixture(zone),{g}=f;try{
      const workers=[g.hireWorker(),g.hireWorker()],sold=new Map();
      for(const worker of workers){assert.equal(worker.homeZone,zone);g.setWorkerMode(worker.id,'gather');sold.set(worker.id,0);}
      stepWorkers(g);let expectedIncome=0;
      for(let i=0;i<20000&&workers.some(w=>!sold.get(w.id));i++){
        const carried=new Map(workers.map(w=>[w.id,w.cargo]));f.step({management:false,world:false});
        for(const w of workers)if(carried.get(w.id)&&!w.cargo){sold.set(w.id,sold.get(w.id)+1);expectedIncome+=carried.get(w.id)==='dabShards'?7:5;}
      }
      assert.ok(workers.every(w=>sold.get(w.id)>0),'each worker reaches its resource site and the merchant');
      assert.ok(g.workerState.ledger.ngiwWood>0&&g.workerState.ledger.dabShards>0);
      assert.equal(g.workerState.ledger.income,expectedIncome);assert.equal(g.workerState.ledger.sales,[...sold.values()].reduce((a,b)=>a+b,0));
      for(let n=0;n<40&&!g.workerState.ledger.wagesPaid;n++)stepWorkers(g);assert.ok(g.workerState.ledger.wagesPaid>0);assert.ok(workers.every(w=>canWalk(w.x,w.y)));
      assert.ok(g.workers().every(w=>w.homeZone===zone));
    }finally{f.restore();}
  });

  test(`${zone}: ferry, worker court delivery, keeper handoff, prison and heaven form one exact-once lifecycle`,()=>{
    const f=fixture(zone),{g}=f;try{
      const worker=g.hireWorker(),subject=soul(zone);g.setWorkerMode(worker.id,'escort');g.queue=[subject];
      g.courtClosed=true;assert.equal(g.startCourtArrival(subject),true);g.advanceAfterlife(3600);
      assert.equal(g.caseReady(subject),false);assert.equal(g.courtArrivals[0].elapsed,0);
      g.courtClosed=false;f.until(()=>g.caseReady(subject),'ferry disembarks',{management:false});
      assert.equal(subject.courtDisembarked,true);assert.equal(g.afterlifeWalks[0]?.escort.workerId,worker.id);
      f.until(()=>!g.afterlifeWalks.some(w=>w.destination==='arrival'),'worker reaches the court',{management:false});
      const atCourt=[worker.x,worker.y];assert.equal(g.workerState.ledger.escortsDone,1);assert.equal(g.startCourtArrival(subject),false);
      assert.equal(g.assign(subject.id,'krata','taan',4),true);const delivery=g.afterlifeWalks.find(w=>w.destination==='station');assert.ok(delivery);
      assert.equal(delivery.escort.k,'taan');assert.equal(delivery.escort.workerId,undefined);assert.deepEqual([worker.x,worker.y],atCourt);
      assert.equal(g.crewOf('taan').at,'krata');assert.notEqual(worker.job?.kind,'escort');
      f.until(()=>!g.afterlifeWalks.some(w=>w.destination==='station'),'worker hands soul to the keeper',{management:false});
      assert.notEqual(worker.job?.kind,'escort');assert.equal(g.workerState.ledger.escortsDone,1);
      const station=g.stations.find(st=>st.def.k==='krata'),slot=station.slots[0];assert.ok(slot);
      f.until(()=>!station.slots.length,'keeper completes actual sentence progress');
      const prisonWalk=g.afterlifeWalks.find(w=>w.destination==='prison');assert.ok(prisonWalk);assert.equal(prisonWalk.escort.workerId,worker.id);
      assert.equal(g.sentences.some(x=>x.soul.id===subject.id),false,'prison cannot receive the soul early');
      f.until(()=>!!g.sentenceOf(subject.id,'prison'),'worker reaches prison',{management:false});
      const prison=g.sentenceOf(subject.id,'prison');g.tick=Math.max(g.tick,prison.readyAt);assert.equal(g.inspectPrison(subject.id),true);assert.equal(prison.repentant,true);
      assert.equal(g.moveFromPrison(subject.id),true);const heaven=g.afterlifeWalks.find(w=>w.destination==='gate');assert.ok(heaven);assert.equal(heaven.escort.workerId,worker.id);
      f.until(()=>!!g.sentenceOf(subject.id,'gate'),'worker reaches heaven',{management:false});
      assert.equal(g.inspectGate(subject.id),true);const outcomes=g.ascended+g.reborn;assert.equal(g.resolveGate(subject.id),true);assert.equal(g.ascended+g.reborn,outcomes+1);
      assert.equal(g.workerState.ledger.escortsDone,3);assert.notEqual(worker.job?.kind,'escort');
      const coin=g.coin,reports=g.teamReports.length;g.finish(station,slot);assert.equal(g.coin,coin);assert.equal(g.teamReports.length,reports);
      assert.equal(g.closed.filter(c=>c.soul.id===subject.id).length,1);
    }finally{f.restore();}
  });

  test(`${zone}: workers build and repair before Taan inspection; jobs remain exclusive`,()=>{
    const f=fixture(zone),{g}=f;try{
      const worker=g.hireWorker(),taan=g.crewOf('taan');taan.at='krata';assert.equal(g.build('lan'),true);
      const site=g.stations.find(st=>st.def.k==='lan');stepWorkers(g);
      f.until(()=>site.workerWork.ready,'workers finish construction while Taan is busy',{management:false});
      assert.ok(site.build);assert.equal(site.buildWait,true);assert.ok(g.workerState.ledger.buildMs>0);
      taan.at=null;f.until(()=>!site.build,'Taan reaches and inspects the completed site',{management:false});
      assert.equal(taan.buildK,null);site.fire=100;taan.at='krata';assert.equal(g.repairStation('lan'),true);stepWorkers(g);
      f.until(()=>site.workerWork.ready,'workers finish repair before inspection',{management:false});assert.equal(site.fire,100);
      taan.at=null;f.until(()=>!site.repair,'Taan inspects repair',{management:false});assert.equal(site.fire,0);
      assert.equal(workerSupervisionMultiplier(g,site),1);
    }finally{f.restore();}
  });

  test(`${zone}: save/restore keeps inbound dock availability and the regional worker roster without duplicating delivery`,()=>{
    const f=fixture(zone),{g}=f;try{
      const worker=g.hireWorker(),subject=soul(zone);g.setWorkerMode(worker.id,'escort');g.queue=[subject];g.courtClosed=false;
      assert.equal(g.startCourtArrival(subject),true);g.advanceAfterlife(3600);assert.ok(g.afterlifeWalks.some(w=>w.destination==='arrival'));
      const saved=JSON.parse(JSON.stringify(g.snapshot())),loaded=createGame();loaded.save=()=>true;loaded.onChange=()=>{};
      assert.equal(loaded.restore(saved),true);assert.equal(loaded.zone,zone);assert.equal(loaded.workers()[0].id,worker.id);
      assert.equal(loaded.workers()[0].homeZone,zone);assert.equal(loaded.workers()[0].job,null);
      const arrival=loaded.courtArrivals.find(a=>a.soulId===subject.id);assert.equal(arrival.phase,'dock');assert.equal(loaded.caseReady(loaded.queue[0]),true);
      assert.equal(loaded.workerState.ledger.escortsDone,0);loaded.advanceAfterlife(1);assert.equal(loaded.afterlifeWalks.filter(w=>w.destination==='arrival').length,1);
      loaded.advanceAfterlife(1e7);assert.equal(loaded.workerState.ledger.escortsDone,1);assert.equal(loaded.startCourtArrival(loaded.queue[0]),false);
    }finally{f.restore();}
  });
}
