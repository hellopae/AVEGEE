import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createGame} from '../src/game.js';
import {STATIONS,SPOTS} from '../src/data.js';
import {canWalk,nearestWalk,resetWalk,setBlocks,setNpcDiscs} from '../src/walk.js?v=k1d';
import {WORKER_RULES,normalizeWorkers,stepWorkers,advanceWorkers,workerSupervisionMultiplier,assignWorkerEscort,workerDiscs,workerSheet,workerFrameRect} from '../src/workers.js';
import {workersPanelHtml} from '../src/worker-ui.js';
globalThis.Image??=class {};
function game() {
  const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.food=100;g.nextArrive=g.nextEvent=g.nextPay=g.nextKpi=10000;
  resetWalk();setBlocks([],[]);setNpcDiscs([]);return g;
}
function station(g,repair=false) {
  const def={...STATIONS.find(d=>d.k==='krata'),x:SPOTS.bench.x,y:SPOTS.bench.y+80};
  const st={def,slots:repair?[]:[{soul:{id:9000},need:100000,progress:0}],crewK:'taan',fire:0,build:0,repair:repair?Date.now()+60000:0,intensity:1};
  g.stations=[st];const c=g.crewOf('taan');c.at=repair?null:def.k;c.buildK=repair?def.k:null;c.morale=100;c.hunger=100;
  return st;
}
function arrive(g,w) {
  for(let i=0;i<1000&&!w.arrived;i++)advanceWorkers(g,120);
  assert.equal(w.arrived,true,'assistant reaches the actual walkable service point');
  assert.equal(canWalk(w.x,w.y),true);
}

test('Nira hires multiple unique regional assistants, charges escalating cost and enforces capacity',()=>{
  const g=game(),before=g.coin;
  for(let i=0;i<WORKER_RULES.capacity;i++)assert.ok(g.hireWorker());
  assert.equal(g.workers().length,6);assert.equal(new Set(g.workers().map(w=>w.id)).size,6);
  assert.equal(before-g.coin,180+240+300+360+420+480);
  assert.equal(g.hireWorker(),false);assert.equal(g.workerState.ledger.hired,6);
  g.zone='asia';assert.equal(g.workers().length,0);const other=g.hireWorker();
  assert.equal(other.homeZone,'asia');assert.match(other.name,/โอนิ/);assert.equal(g.workerState.workers.length,7);
  assert.ok(!g.battleActors().some(actor=>actor.id===other.id),'workers never join combat');
  g.zone='th';assert.equal(g.workers().length,6);
});

test('hiring fails without funds or available Nira, without spending coins or IDs',()=>{
  const g=game();g.coin=0;assert.equal(g.hireWorker(),false);assert.equal(g.workerState.nextId,1);
  g.coin=1000;g.niraRest={remaining:3};assert.equal(g.hireWorker(),false);assert.equal(g.coin,1000);
  g.niraRest=null;g.crewOf('nira').morale=0;assert.equal(g.hireWorker(),false);
});

test('supervisors walk to the site and increase real station progress, with at most two per station',()=>{
  const baseline=game(),plain=station(baseline);baseline.step();const ordinary=plain.slots[0].progress;
  const g=game(),st=station(g);const workers=[g.hireWorker(),g.hireWorker(),g.hireWorker()];
  for(const w of workers)g.setWorkerMode(w.id,'supervise');
  stepWorkers(g);
  assert.equal(workerSupervisionMultiplier(g,st),1,'no bonus before physical arrival');
  for(const w of workers.filter(w=>w.job))arrive(g,w);
  assert.equal(workers.filter(w=>w.job).length,2);
  assert.equal(workerSupervisionMultiplier(g,st),1.4);
  g.step();assert.ok(Math.abs(st.slots[0].progress-ordinary*1.4)<1e-8,'the normal gameplay step consumes the multiplier');
  assert.ok(g.workerState.ledger.supervisionTicks>0);
  g.setWorkerMode(workers[0].id,'rest');assert.equal(workerSupervisionMultiplier(g,st),1.2);
});

test('repair helpers accelerate the actual countdown only after Taan arrives and never start a repair alone',()=>{
  const g=game(),st=station(g,true),w=g.hireWorker();g.setWorkerMode(w.id,'repair');
  st.repairWait=true;stepWorkers(g);arrive(g,w);
  const waiting=st.repair;advanceWorkers(g,120);assert.equal(st.repair,waiting);
  st.repairWait=false;const now=Date.now();st.repair=now+60000;
  advanceWorkers(g,100,now);assert.equal(st.repair,now+59980);assert.equal(g.workerState.ledger.repairMs,20);
  g.crewOf('taan').buildK=null;const stopped=st.repair;advanceWorkers(g,100,now);assert.equal(st.repair,stopped);
  stepWorkers(g);assert.equal(w.job,null);
});

test('assistants pick up and escort a real afterlife walk, release it once and keep souls out of the roster until arrival',()=>{
  const g=game(),w=g.hireWorker();g.setWorkerMode(w.id,'escort');
  const start=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+40),end=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+130);
  const soul={id:901,who:'test'},entry={soul,zone:'th',status:'prison'};
  assert.equal(g.startAfterlifeWalk(soul,start,end,'prison',entry),true);
  const walk=g.afterlifeWalks[0];assert.equal(walk.escort.workerId,w.id);assert.equal(w.job.kind,'escort');
  assert.equal(g.sentences.length,0);assert.ok(walk.escort.pickup.length);
  g.advanceAfterlife(walk.delay+20);assert.ok(Number.isFinite(w.x));assert.equal(canWalk(w.x,w.y),true);
  g.advanceAfterlife(walk.duration);assert.equal(g.afterlifeWalks.length,0);assert.equal(g.sentences.filter(x=>x.soul.id===soul.id).length,1);
  assert.equal(w.job,null);assert.equal(g.workerState.ledger.escortsDone,1);
  g.advanceAfterlife(walk.duration);assert.equal(g.workerState.ledger.escortsDone,1);
});

test('stopping an escort or dismissing a worker preserves the soul journey and prevents duplicate assignment',()=>{
  const g=game(),w=g.hireWorker();g.setWorkerMode(w.id,'escort');
  const at=[w.x,w.y],walk={soul:{id:77},path:[at,[at[0]+10,at[1]]],elapsed:0,duration:2000,zone:'th'};
  assert.equal(assignWorkerEscort(g,walk),true);g.afterlifeWalks=[walk];
  assert.equal(assignWorkerEscort(g,walk),false);
  assert.equal(g.dismissWorker(w.id),true);assert.equal(walk.escort,null);assert.equal(g.workers().length,0);
  assert.equal(g.dismissWorker(w.id),false);
});

test('active wages, food and fatigue pause bonuses; rest recovers workers without charging resources',()=>{
  const g=game(),st=station(g),w=g.hireWorker();g.setWorkerMode(w.id,'supervise');stepWorkers(g);arrive(g,w);
  w.workTicks=30;const before=g.coin;stepWorkers(g);assert.equal(before-g.coin,2);assert.equal(g.workerState.ledger.wagesPaid,2);
  g.food=0;stepWorkers(g);assert.equal(w.funded,false);assert.equal(workerSupervisionMultiplier(g,st),1);
  g.food=100;g.coin=0;w.workTicks=30;stepWorkers(g);assert.equal(w.funded,false);assert.equal(w.reason,'รอค่าจ้าง');
  g.setWorkerMode(w.id,'rest');w.stamina=0;const food=g.food;stepWorkers(g);assert.equal(w.stamina,4);assert.equal(g.food,food);
});

test('workers and ledger survive normal game save/restore; old saves initialize empty and damaged data is bounded',()=>{
  const g=game(),w=g.hireWorker();g.setWorkerMode(w.id,'repair');w.stamina=63;
  g.workerState.ledger.wagesPaid=12;
  const saved=JSON.parse(JSON.stringify(g.snapshot()));const loaded=game();assert.equal(loaded.restore(saved),true);
  assert.equal(loaded.workers().length,1);assert.equal(loaded.workers()[0].id,w.id);assert.equal(loaded.workers()[0].mode,'repair');
  assert.equal(loaded.workers()[0].stamina,63);assert.equal(loaded.workerState.ledger.wagesPaid,12);
  delete saved.workerState;const old=game();old.restore(saved);assert.deepEqual(old.workers(),[]);
  const invalid=normalizeWorkers({workers:[{id:'worker:9',homeZone:'th',stamina:-5},{id:'worker:9',homeZone:'th'},{id:'bad',homeZone:'none'}]});
  assert.equal(invalid.workers.length,1);assert.equal(invalid.workers[0].stamina,0);assert.equal(invalid.nextId,10);
});

test('worker collision and Nira management controls expose real hire, task, rest and dismissal actions',()=>{
  const g=game(),w=g.hireWorker();assert.deepEqual(workerDiscs(g),[[w.x,w.y]]);
  w.moving=true;assert.deepEqual(workerDiscs(g),[]);
  const html=workersPanelHtml(g);assert.match(html,/data-hire-worker/);assert.match(html,/data-worker-mode="worker:1"/);assert.match(html,/data-dismiss-worker="worker:1"/);
  for(const zone of ['th','asia','west','cyberhell'])assert.equal(workerSheet(zone),`img/workers/worker-${zone}-sheet-v1.webp`);
});


test('a saved worker escort settles exactly once on reload and releases the assistant',()=>{
  const g=game(),w=g.hireWorker();g.setWorkerMode(w.id,'escort');
  const start=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+40),end=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+130);
  const soul={id:9301,who:'saved escort'},entry={soul,zone:'th',status:'prison'};
  g.startAfterlifeWalk(soul,start,end,'prison',entry);
  const saved=JSON.parse(JSON.stringify(g.snapshot())),loaded=game();
  assert.equal(loaded.restore(saved),true);
  assert.equal(loaded.workers()[0].job,null);
  assert.equal(loaded.workerState.ledger.escortsDone,1);
  assert.equal(loaded.sentences.filter(x=>x.soul.id===soul.id).length,1);
  const again=game();again.restore(JSON.parse(JSON.stringify(loaded.snapshot())));
  assert.equal(again.workerState.ledger.escortsDone,1);
  assert.equal(again.sentences.filter(x=>x.soul.id===soul.id).length,1);
});


test('frame-local atlas guards remove edge bleed without clipping the character or held tool in all 64 source cells',()=>{
  const zones=['th','asia','west','cyberhell'];
  const frames=zones.flatMap(zone=>Array.from({length:16},(_,i)=>({zone,row:Math.floor(i/4),column:i%4,rect:workerFrameRect(zone,Math.floor(i/4),i%4)})));
  const script=`
import json,sys,math
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(sys.argv[1]);frames=json.loads(sys.argv[2]);removed_frames=0
for f in frames:
 im=Image.open(root/('img/workers/worker-'+f['zone']+'-sheet-v1.webp')).convert('RGBA')
 fw,fh=im.width//4,im.height//4
 a=im.getchannel('A').crop((f['column']*fw,f['row']*fh,(f['column']+1)*fw,(f['row']+1)*fh)).point(lambda v:255 if v>32 else 0)
 pixels=a.load()
 _,sx,sy=min(((x-fw*.55)**2+(y-fh*.55)**2,x,y) for y in range(fh) for x in range(fw) if pixels[x,y])
 main=a.copy();ImageDraw.floodfill(main,(sx,sy),128,border=0)
 bbox=main.point(lambda v:255 if v==128 else 0).getbbox()
 r=f['rect'];left=round(r['left']*fw);top=round(r['top']*fh);right=fw-round(r['right']*fw);bottom=fh-round(r['bottom']*fh)
 assert left<=bbox[0] and top<=bbox[1] and right>=bbox[2] and bottom>=bbox[3],str((f,bbox))
 before=sum(v>0 for v in a.tobytes());after=sum(v>0 for v in a.crop((left,top,right,bottom)).tobytes())
 if before>after:removed_frames+=1
assert removed_frames>=12,removed_frames
print(json.dumps({'frames':len(frames),'bleed_removed_frames':removed_frames}))
`;
  const result=JSON.parse(execFileSync('python3',['-c',script,fileURLToPath(new URL('..',import.meta.url)),JSON.stringify(frames)],{encoding:'utf8',timeout:30000}));
  assert.equal(result.frames,64);assert.ok(result.bleed_removed_frames>=12);
  const g=game();g.hireWorker();const r=workerFrameRect('th',0,1);
  assert.ok(workersPanelHtml(g).includes(`clip-path:inset(${r.top*100}% ${r.right*100}% ${r.bottom*100}% ${r.left*100}%)`),'office portrait shares the exact frame-local guard');
});


for(const destination of ['gate','queue']) {
  test(`workers escort legitimate ${destination} deliveries, retaining the soul until exact-once arrival`,()=>{
    const g=game(),worker=g.hireWorker();g.setWorkerMode(worker.id,'escort');
    const start=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+40),end=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+130);
    const soul={id:9401,who:'delivery',deeds:[],merits:[]},entry=destination==='gate'?{soul,zone:'th',stage:'gate',checked:false}:null;
    const returnedBefore=g.returned;
    assert.equal(g.startAfterlifeWalk(soul,start,end,destination,entry,null,'dam'),true);
    const walk=g.afterlifeWalks[0];
    assert.equal(walk.escort.workerId,worker.id);assert.equal(walk.courier,undefined,'worker replaces the fallback courier rather than drawing two escorts');
    const roster=()=>destination==='gate'?g.sentences.filter(x=>x.soul.id===soul.id):g.queue.filter(x=>x.id===soul.id);
    assert.equal(roster().length,0);assert.ok(!g.crew.some(c=>c.escort===soul.id),'keepers continue their existing jobs');
    g.advanceAfterlife(walk.delay+10);assert.equal(roster().length,0);
    g.advanceAfterlife(walk.duration);assert.equal(roster().length,1);assert.equal(worker.job,null);assert.equal(g.workerState.ledger.escortsDone,1);
    if(destination==='queue')assert.equal(g.returned,returnedBefore+1);
    g.advanceAfterlife(walk.duration);assert.equal(roster().length,1);assert.equal(g.workerState.ledger.escortsDone,1);
  });
  test(`saving a ${destination} worker delivery settles once on reload without stranding the assistant`,()=>{
    const g=game(),worker=g.hireWorker();g.setWorkerMode(worker.id,'escort');
    const start=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+40),end=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+130);
    const soul={id:9402,who:'saved delivery',deeds:[],merits:[]},entry=destination==='gate'?{soul,zone:'th',stage:'gate',checked:false}:null;
    g.startAfterlifeWalk(soul,start,end,destination,entry,null,'dam');
    const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
    assert.equal(h.workers()[0].job,null);assert.equal(h.workerState.ledger.escortsDone,1);
    const count=state=>destination==='gate'?state.sentences.filter(x=>x.soul.id===soul.id).length:state.queue.filter(x=>x.id===soul.id).length;
    assert.equal(count(h),1);const again=game();again.restore(JSON.parse(JSON.stringify(h.snapshot())));
    assert.equal(count(again),1);assert.equal(again.workerState.ledger.escortsDone,1);
  });
}

test('non-prison deliveries preserve the legacy courier when no worker is available without borrowing a keeper',()=>{
  for(const destination of ['gate','queue']) {
    const g=game(),start=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+40),end=nearestWalk(SPOTS.bench.x,SPOTS.bench.y+130);
    const soul={id:9501,who:'fallback delivery'},entry={soul,zone:'th',stage:'gate'};
    assert.equal(g.startAfterlifeWalk(soul,start,end,destination,entry,null,'dam'),true);
    const walk=g.afterlifeWalks[0];assert.equal(walk.courier,'dam');assert.equal(walk.escort,undefined);
    assert.ok(!g.crew.some(c=>c.escort===soul.id));
  }
});

test('real prison release dispatches workers to heaven or back to the queue instead of the fallback courier',()=>{
  for(const repentant of [true,false]) {
    const g=game(),worker=g.hireWorker();g.setWorkerMode(worker.id,'escort');
    for(const k of ['tarang','sawan'])if(!g.stations.some(st=>st.def.k===k))g.stations.push({def:STATIONS.find(d=>d.k===k),build:0,slots:[],fire:0,crewK:null});
    const soul={id:repentant?9601:9602,who:'prison release',sex:'m',sp:1,deeds:[{w:4,s:'kong',t:'กรรม',known:true}],merits:[],deserved:4};
    g.sentences.push({soul,zone:'th',stage:'prison',inspected:true,repentant,intensity:3,verdict:{right:true,short:repentant?0:1}});
    assert.equal(g.moveFromPrison(soul.id),true);
    const walk=g.afterlifeWalks[0];assert.ok(walk);assert.equal(walk.destination,repentant?'gate':'queue');
    assert.equal(walk.escort.workerId,worker.id);assert.equal(walk.courier,undefined);
    const deliveredId=walk.soul.id;
    g.advanceAfterlife(100000);
    assert.equal(repentant?g.sentences.filter(x=>x.soul.id===deliveredId).length:g.queue.filter(x=>x.id===deliveredId).length,1);
    assert.equal(g.workerState.ledger.escortsDone,1);assert.equal(worker.job,null);
  }
});
