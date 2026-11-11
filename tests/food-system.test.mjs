import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {STATIONS,BAL} from '../src/data.js';
import {resetWalk,setBlocks,setNpcDiscs,nearestWalk} from '../src/walk.js?v=k1d';
import {stepWorkers,advanceWorkers,normalizeWorkers,workerRow,workerCookAssets,workerHireCost} from '../src/workers.js';
import {canteenActive,canteenPoint,canteenState,stepCanteen,canteenCookPose} from '../src/canteen.js';
import {canteenPanelHtml,workersPanelHtml} from '../src/worker-ui.js';
import {teamManageHtml} from '../src/team-hud.js';
globalThis.Image??=class{};
function game(){resetWalk();setBlocks([],[]);setNpcDiscs([]);const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.food=100;g.level=5;g.mobs=[];g.zoneEvents.th={frontierBreach:'cleared'};return g;}
const kitchen=g=>g.stations.push({def:STATIONS.find(d=>d.k==='canteen'),build:0,repair:0,fire:0,slots:[]});
const place=(c,p)=>{[c.x,c.y]=p;c.path=null;};
function tick(g,n=1){for(let i=0;i<n;i++){if(i%4===0)stepWorkers(g);stepCanteen(g,120);advanceWorkers(g,120);}}
const reload=g=>{const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};
test('merchant supplies before construction feed from the HUD stock, not the bag; kitchen meals take over after construction',()=>{
 const g=game(),c=g.crewOf('taan');g.food=0;c.hunger=20;assert.equal(g.feedActor(c.id),false);
 const coin=g.coin;assert.equal(g.buy('food',1),true);assert.equal(g.coin,coin-BAL.foodPrice*10);assert.equal(g.food,10);
 assert.equal(g.feedActor(c.id),true);assert.equal(c.hunger,60);assert.equal(g.food,9);
 kitchen(g);c.hunger=20;assert.equal(g.feedActor(c.id),true,'empty kitchen falls back to the central stock');assert.equal(g.food,8);c.hunger=20;canteenState(g).meals=1;assert.equal(g.feedActor(c.id),true);assert.equal(g.food,8,'ready meals first');assert.equal(canteenState(g).meals,0);
});
test('a built kitchen without cooks cannot produce; worker cooks walk to the kitchen and pause/full storage never consumes extra stock',()=>{
 const g=game();kitchen(g);tick(g,40);assert.equal(canteenState(g).meals,0);
 const c=g.hireWorker();g.setWorkerMode(c.id,'cook');stepWorkers(g);const stock=g.food;stepCanteen(g,120);assert.equal(g.food,stock);assert.equal(canteenCookPose(g,c),null);
 for(let i=0;i<700&&canteenState(g).meals<1;i++)tick(g);assert.ok(canteenState(g).meals>=1);assert.ok(Math.hypot(c.x-canteenPoint(g)[0],c.y-canteenPoint(g)[1])<24);assert.ok(canteenCookPose(g,c));assert.equal(workerRow(c,true),2);
 g.paused=true;const frozen=JSON.stringify([g.food,c.job,canteenState(g)]);tick(g,30);assert.equal(JSON.stringify([g.food,c.job,canteenState(g)]),frozen);g.paused=false;
 canteenState(g).meals=6;const before=g.food;for(let i=0;i<30;i++)stepCanteen(g,120);assert.equal(g.food,before);assert.equal(canteenState(g).meals,6);
});
test('cook auto-refills supplies from coins without a manual purchase, but never spends when no funds are available',()=>{
 const g=game();kitchen(g);const c=g.hireWorker();g.setWorkerMode(c.id,'cook');place(c,canteenPoint(g));g.food=0;const coin=g.coin;tick(g,30);assert.ok(canteenState(g).meals>0);assert.equal(g.coin,coin-BAL.foodPrice*10);
 g.food=0;g.coin=0;tick(g,30);assert.equal(g.food,0);assert.equal(g.coin,0);assert.equal(c.supplyRest,true);
});
test('servers target the hungriest available recipient, respect explicit selection, and do not feed before physical arrival',()=>{
 const g=game();kitchen(g);g.hire('dam');g.hire('plerng');const a=g.crewOf('dam'),b=g.crewOf('plerng');a.hunger=20;b.hunger=10;
 const w=g.hireWorker();g.setWorkerMode(w.id,'serve');canteenState(g).meals=3;stepWorkers(g);assert.equal(w.job.recipient,b.id);assert.equal(w.meal,undefined);
 place(w,canteenPoint(g));advanceWorkers(g,120);assert.equal(w.meal,true);assert.equal(b.hunger,10);assert.equal(canteenState(g).meals,2);
 assert.equal(g.setWorkerServeTarget(w.id,a.id),true);assert.equal(w.meal,true);stepWorkers(g);assert.equal(w.job.recipient,a.id);
 place(w,nearestWalk(a.x??a.hx,a.y??a.hy));advanceWorkers(g,120);assert.equal(a.hunger,60);assert.equal(b.hunger,10);assert.equal(w.meal,false);
 assert.equal(g.setWorkerServeTarget(w.id,'missing'),false);
});
function deliveryTime(count){
 const g=game();kitchen(g);g.hire('dam');g.hire('plerng');const at=canteenPoint(g);
 for(const [i,c] of [g.crewOf('taan'),g.crewOf('dam'),g.crewOf('plerng')].entries()){c.hunger=0;place(c,nearestWalk(at[0]-250-i*40,at[1]+100));}
 canteenState(g).meals=6;
 for(let i=0;i<count;i++){const w=g.hireWorker();g.setWorkerMode(w.id,'serve');place(w,at);}
 let frames=0;for(;frames<3000&&canteenState(g).served<3;frames++)tick(g);
 assert.equal(canteenState(g).served,3);return frames*120;
}
test('three servers complete three actual deliveries faster than one server over the same paths',t=>{
 const one=deliveryTime(1),three=deliveryTime(3);t.diagnostic(`1 server: ${one} ms; 3 servers: ${three} ms`);assert.ok(three<one);
});
test('reload preserves cook progress, delivery cargo, selected recipient and stock without duplicating a meal',()=>{
 let g=game();kitchen(g);g.hire('dam');const c=g.hireWorker(),w=g.hireWorker();g.setWorkerMode(c.id,'cook');g.setWorkerMode(w.id,'serve');const dam=g.crewOf('dam');dam.hunger=0;g.setWorkerServeTarget(w.id,dam.id);
 place(c,canteenPoint(g));place(w,canteenPoint(g));tick(g,13);const ms=c.job.ms;assert.ok(ms>0);
 g=reload(g);assert.equal(g.workers().find(a=>a.id===c.id).job.ms,ms);
 for(let i=0;i<50&&!g.workers().find(a=>a.id===w.id).meal;i++)tick(g);
 const held=g.workers().find(a=>a.id===w.id);assert.equal(held.meal,true);assert.equal(g.crewOf('dam').hunger,0);
 const before=canteenState(g).meals;g=reload(g);const resumed=g.workers().find(a=>a.id===w.id);assert.equal(resumed.meal,true);assert.deepEqual(resumed.serveTargets,[dam.id]);assert.equal(resumed.job.phase,'deliver');assert.equal(canteenState(g).meals,before);
 stepWorkers(g);place(resumed,nearestWalk(g.crewOf('dam').x??dam.hx,g.crewOf('dam').y??dam.hy));advanceWorkers(g,120);assert.equal(g.crewOf('dam').hunger,40);assert.equal(canteenState(g).served,1);
 const saved=normalizeWorkers(g.workerState);assert.equal(saved.workers.find(a=>a.id===w.id).meal,false);
});
test('crew, guard and workers walk to eat, wait for ready food, and consume once; no kitchen rejects the order',()=>{
 for(const type of ['crew','guard','worker']){
 const g=game();const c=type==='worker'?g.hireWorker():type==='guard'?(g.hireGuard(),g.guard):g.crewOf('taan');c.hunger=0;
 assert.equal(g.eatAtCanteen(c.id),false);kitchen(g);const stock=g.food;assert.equal(g.eatAtCanteen(c.id),true);assert.equal(g.eatAtCanteen(c.id),false);
 for(let i=0;i<1000&&Math.hypot(c.x-canteenPoint(g)[0],c.y-canteenPoint(g)[1])>=24;i++){if(type==='worker')advanceWorkers(g,120);else if(type==='guard')stepCanteen(g,120);else g.stepWorld(120);}
 assert.ok(Math.hypot(c.x-canteenPoint(g)[0],c.y-canteenPoint(g)[1])<24,type);assert.equal(c.hunger,0);assert.equal(g.food,stock);
 canteenState(g).meals=1;if(type==='worker')advanceWorkers(g,120);else if(type==='guard')stepCanteen(g,120);else g.stepWorld(120);
 assert.equal(c.hunger,40);assert.equal(c.eatOrder,null);assert.equal(canteenState(g).meals,0);assert.equal(canteenState(g).served,1);
 }
});
test('Nira has hire controls only; canteen exposes persistent worker modes and recipient selection; team has food/rest/party controls',()=>{
 const g=game();g.hireWorker();const office=workersPanelHtml(g);assert.match(office,/data-hire-worker/);assert.doesNotMatch(office,/data-worker-buy-food|data-worker-share-food|data-feed-worker|data-worker-mode/);
 kitchen(g);g.setWorkerMode(g.workers()[0].id,'serve');const panel=canteenPanelHtml(g);assert.match(panel,/พ่อครัว/);assert.match(panel,/คนเสิร์ฟ/);assert.match(panel,/data-worker-target/);assert.match(panel,/data-hire-worker-as="cook"/);assert.match(panel,/data-hire-worker-as="serve"/);assert.match(panel,/หิวที่สุดก่อน/);assert.doesNotMatch(panel,/rice-cook|rice-order/);assert.match(canteenPanelHtml(g,false),/data-worker-mode[^>]+disabled/);
 const team=teamManageHtml(g,()=> '');for(const attr of ['feed','eat','rest','party','mode'])assert.match(team,new RegExp('data-team-'+attr));
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');const start=ui.indexOf('function openNiraOffice()'),officeUi=ui.slice(start,ui.indexOf('\nfunction ',start+1));assert.doesNotMatch(officeUi,/niraItemWidget|data-nira-item|data-buy-supply/);
 const merchant=ui.slice(ui.indexOf('function openMerchant()'),ui.indexOf('/** G3b'));assert.match(merchant,/foodSupplyCard/);assert.doesNotMatch(merchant,/data-team-feed|hungerWidget/);
});
test('every zone has a disabled optional cook-art metadata hook and the existing work animation fallback',()=>{
 for(const zone of ['th','asia','west','cyberhell']){const files=workerCookAssets(zone);assert.equal(files.image,`img/workers/worker-${zone}-cook-v1.webp`);const meta=JSON.parse(readFileSync(new URL('../'+files.metadata,import.meta.url),'utf8'));assert.equal(meta.enabled,false);assert.equal(meta.frames,4);}
});
test('cook and server resume automatically after supplies run dry; a lone server can collect its own meal',()=>{
 const g=game();kitchen(g);const w=g.hireWorker(),c=g.hireWorker();g.setWorkerMode(w.id,'serve');g.setWorkerMode(c.id,'cook');
 g.food=0;g.coin=0;stepWorkers(g);assert.equal(w.supplyRest,true);assert.equal(c.supplyRest,true);
 g.coin=100;place(c,canteenPoint(g));place(w,canteenPoint(g));tick(g,160);assert.equal(w.supplyRest,false);assert.equal(c.supplyRest,false);assert.ok(w.hunger>0);assert.ok(canteenState(g).served>0);
});
test('ready food and cooking freeze in other zones; damaged kitchens stop production and reject feeding or eating',()=>{
 const g=game();kitchen(g);const c=g.hireWorker();g.setWorkerMode(c.id,'cook');place(c,canteenPoint(g));tick(g,13);const progress=c.job.ms,stock=g.food;
 g.zone='asia';tick(g,40);assert.equal(c.job.ms,progress);assert.equal(g.food,stock);g.zone='th';tick(g,20);assert.ok(canteenState(g).meals>0);
 const a=g.crewOf('taan');a.hunger=0;const st=g.stations.find(s=>s.def.k==='canteen');st.fire=1;const meals=canteenState(g).meals;
 assert.equal(canteenActive(g),false);g.food=0;assert.equal(g.feedActor(a.id),false);assert.equal(g.eatAtCanteen(a.id),false);tick(g,30);assert.equal(canteenState(g).meals,meals);
});
test('dining survives reload, blocks new keeper/build assignments, and tea rest cancels the meal walk',()=>{
 let g=game();kitchen(g);const a=g.crewOf('taan');a.hunger=0;assert.equal(g.eatAtCanteen(a.id),true);const at=[a.x,a.y];g=reload(g);const c=g.crewOf('taan');assert.ok(c.eatOrder);assert.deepEqual([c.x,c.y],at);
 assert.equal(g.availableBuilder(),null);assert.equal(g.assignBlock(g.queue[0].id,'krata','taan')?.key,'crewBuilding');
 const def=STATIONS.find(d=>d.k==='tea');g.stations.push({def,build:0,repair:0,slots:[]});assert.equal(g.restActor(c.id),true);assert.equal(c.eatOrder,null);assert.ok(c.teaRest);
});

// ---- Khun Pae 11 Nov: hire straight into a canteen role, pick several yomtoot per server, give button falls back to the central stock ----
test('canteen: hire a worker straight as cook / server at the Nira price; buttons only work inside; roles persist',()=>{
 const g=game();kitchen(g);const price=workerHireCost(g),coin=g.coin;
 const cook=g.hireWorker('cook'),serve=g.hireWorker('serve');assert.ok(cook&&serve);
 assert.equal(cook.mode,'cook');assert.equal(serve.mode,'serve');assert.deepEqual(serve.serveTargets,[]);
 assert.equal(g.coin,coin-price-(price+60),'same cost curve as the Nira hire');
 assert.equal(g.hireWorker('bogus').mode,'auto','unknown role = a normal hire');
 const outside=canteenPanelHtml(g,false);assert.match(outside,/data-hire-worker-as="cook"[^>]*disabled/);assert.match(outside,/data-hire-worker-as="serve"[^>]*disabled/);
 assert.doesNotMatch(canteenPanelHtml(g,true),/data-hire-worker-as="cook"[^>]*disabled/);
 const h=reload(g);assert.deepEqual(h.workers().map(w=>w.mode),['cook','serve','auto']);
});
test('server targets: queue order by default, several specific yomtoot allowed, only they are served, saved and restored',()=>{
 const g=game();kitchen(g);g.hire('dam');g.hire('plerng');const w=g.hireWorker('serve'),dam=g.crewOf('dam'),taan=g.crewOf('taan'),plerng=g.crewOf('plerng');
 assert.equal(g.setWorkerServeTarget(w.id,[dam.id,plerng.id]),true);assert.deepEqual(g.workers()[0].serveTargets,[dam.id,plerng.id]);
 assert.equal(g.setWorkerServeTarget(w.id,['nobody']),false,'unknown id rejected');assert.deepEqual(g.workers()[0].serveTargets,[dam.id,plerng.id]);
 const panel=canteenPanelHtml(g);assert.match(panel,/data-worker-queue/);assert.match(panel,/ตามคิว/);assert.equal((panel.match(/data-worker-target=/g)||[]).length,g.crew.filter(c=>!c.reader&&!c.self).length);
 taan.hunger=0;dam.hunger=50;plerng.hunger=20;canteenState(g).meals=3;
 stepWorkers(g);assert.equal(g.workers()[0].job?.kind,'food');assert.equal(g.workers()[0].job.recipient,plerng.id,'hungriest of the picked ones, taan (hungrier) is not picked');
 const h=reload(g);assert.deepEqual(h.workers()[0].serveTargets,[dam.id,plerng.id]);
 assert.equal(g.setWorkerServeTarget(w.id,'auto'),true);assert.deepEqual(g.workers()[0].serveTargets,[]);assert.match(canteenPanelHtml(g),/data-worker-queue="[^"]+" checked/);
 const old=normalizeWorkers({workers:[{...JSON.parse(JSON.stringify(g.workers()[0])),serveTargets:undefined,serveTarget:dam.id}]});assert.deepEqual(old.workers[0].serveTargets,[dam.id],'older save with one target');
});
test('give button: uses ready kitchen meals first, falls back to the central stock when the kitchen is empty',()=>{
 const g=game();kitchen(g);g.hire('dam');const c=g.crewOf('dam');g.food=10;c.hunger=0;
 canteenState(g).meals=0;assert.equal(g.feedActor(c.id),true);assert.equal(g.food,9);assert.equal(c.hunger,40);
 canteenState(g).meals=2;assert.equal(g.feedActor(c.id),true);assert.equal(g.food,9,'kitchen first');assert.equal(canteenState(g).meals,1);assert.equal(canteenState(g).served,1);
 canteenState(g).meals=0;g.food=0;assert.equal(g.feedActor(c.id),false);assert.match(teamManageHtml(g,()=> ''),/data-team-feed="th:dam"[^>]*disabled/);
});
