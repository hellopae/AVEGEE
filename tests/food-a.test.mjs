import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {STATIONS,syncSceneZone} from '../src/data.js';
import {resetWalk,setBlocks,setNpcDiscs} from '../src/walk.js?v=k1d';
import {canteenActive,canteenState,canteenPoint,prepareCooks,stepCanteen} from '../src/canteen.js';
import {mapInteractions} from '../src/proximity.js';
globalThis.Image??=class{};
function game(){resetWalk();setBlocks([],[]);setNpcDiscs([]);const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.level=5;g.hire('dam');g.hire('plerng');return g;}
function kitchen(g){g.stations.push({def:STATIONS.find(d=>d.k==='canteen'),slots:[],build:0,fire:0});}
function cook(g,key='dam',n=1){assert.equal(g.orderRice(key,n),true);prepareCooks(g);const c=g.crewOf(key);[c.x,c.y]=canteenPoint(g);return c;}
function advance(g,n=25){for(let i=0;i<n;i++){prepareCooks(g);stepCanteen(g,120);}}
test('no implicit kitchen after worker unlock; construction charges once and entry waits for completion',()=>{
 const g=game();g.zoneEvents.th={frontierBreach:'cleared'};g.hireWorker();prepareCooks(g);advance(g);assert.equal(canteenActive(g),false);assert.equal(g.crewOf('dam').cook,false);assert.equal(g.orderRice('dam',1),false);
 const coins=g.coin;assert.equal(g.build('canteen'),true);assert.equal(g.coin,coins-120);assert.equal(g.build('canteen'),false);assert.equal(canteenActive(g),false);assert.ok(!mapInteractions(g,{}).some(t=>t.key==='canteen'));
 const st=g.stations.find(s=>s.def.k==='canteen');st.build=0;st.buildWait=false;st.workerWork=null;
 assert.equal(canteenActive(g),true);assert.ok(mapInteractions(g,{}).some(t=>t.key==='canteen'&&t.kind==='station'));
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');assert.match(ui,/if\(k==='canteen'\)return \{\.\.\.ROOM_DEFAULT/);assert.match(ui,/rice-order/);assert.match(ui,/if\(!R\?\.inReach\(\)\)return/);
});
test('legacy implicit kitchens migrate visited branches once; new saves keep unbuilt kitchens absent',()=>{
 const g=game();g.zoneEvents.th={frontierBreach:'cleared'};let d=g.snapshot();delete d.canteenVersion;d.zoneSave={asia:{stations:[{k:'sala',slots:[]}]}};
 const loaded=game();assert.equal(loaded.restore(d),true);assert.equal(canteenActive(loaded),true);assert.equal(loaded.zoneSave.asia.stations.filter(s=>s.k==='canteen').length,1);
 const twice=game();twice.restore(loaded.snapshot());assert.equal(twice.stations.filter(s=>s.def.k==='canteen').length,1);
 const fresh=game();fresh.restore(g.snapshot());assert.equal(canteenActive(fresh),false);
});
test('paid FIFO batches wait for arrival, reject duplicates, pause and cancel/refund only unfinished portions',()=>{
 const g=game();kitchen(g);const coins=g.coin;assert.equal(g.orderRice('dam',2),true);assert.equal(g.orderRice('dam',1),false);assert.equal(g.orderRice('plerng',2),true);assert.equal(g.coin,coins-8);
 advance(g,40);assert.equal(canteenState(g).meals,0);const c=g.crewOf('dam');[c.x,c.y]=canteenPoint(g);advance(g);assert.equal(canteenState(g).meals,1);
 g.paused=true;advance(g,30);assert.equal(canteenState(g).meals,1);g.paused=false;assert.equal(g.cancelRice('dam'),true);assert.equal(g.coin,coins-6);assert.equal(g.cancelRice('dam'),false);
 assert.equal(c.cook,false);assert.equal(g.cancelRice('plerng'),true);assert.equal(g.coin,coins-2);assert.equal(g.crewOf('plerng').cook,false);
});
test('keeper conflicts, invalid quantities and insufficient resources cannot create an order',()=>{
 const g=game();kitchen(g);for(const n of [0,-1,1.5,7,NaN])assert.equal(g.orderRice('dam',n),false);
 g.coin=1;assert.equal(g.orderRice('dam',1),false);g.coin=100;g.crewOf('dam').escort=42;assert.equal(g.orderRice('dam',1),false);g.crewOf('dam').escort=null;
 const st=g.stations[1];st.crewK='dam';st.slots=[{}];assert.equal(g.orderRice('dam',1),false);st.slots=[];
 cook(g);const soul=g.queue[0];soul.courtDisembarked=true;assert.equal(g.assign(soul.id,'krata','dam',3),false);g.cancelRice('dam');assert.equal(g.assign(soul.id,'krata','dam',3),true);
});
test('save/load mid-batch and after completion never replays portions or currency; cooks return to posts',()=>{
 let g=game();kitchen(g);cook(g,'dam',2);advance(g,30);assert.equal(canteenState(g).meals,1);const coins=g.coin;
 const loaded=game();loaded.restore(g.snapshot());g=loaded;advance(g,20);assert.equal(canteenState(g).meals,2);assert.equal(g.coin,coins);assert.equal(g.crewOf('dam').cook,false);assert.equal(canteenState(g).orders.length,0);
 const done=game();done.restore(g.snapshot());advance(done,100);assert.equal(canteenState(done).meals,2);
 cook(done,'plerng');advance(done);assert.equal(done.crewOf('plerng').cook,false);assert.equal(canteenState(done).meals,3);
 const dam=done.crewOf('dam'),plerng=done.crewOf('plerng');done.stepWorld(120);assert.equal(dam.cook,false);assert.equal(plerng.cook,false);
});
test('zone changes freeze source orders and resume them once on return',()=>{
 const g=game();kitchen(g);cook(g);advance(g,10);g.zoneTravel.visited.asia=true;g.zoneTravel.ports.asia=true;
 Object.assign(g.player,g.harbourPoint());assert.equal(g.moveZone('asia'),true);advance(g,100);assert.equal(g.canteenState.th.meals,0);assert.equal(g.canteenState.th.orders[0].ms,1200);
 assert.equal(g.moveZone('th'),true);prepareCooks(g);const c=g.crewOf('dam');[c.x,c.y]=canteenPoint(g);advance(g,15);assert.equal(canteenState(g).meals,1);advance(g,50);assert.equal(canteenState(g).meals,1);
});
test('kitchen footprints and entry are finite in every zone and repeat without drift',()=>{
 for(const z of ['th','asia','west','cyberhell']){syncSceneZone(z);const d=STATIONS.find(s=>s.k==='canteen'),before=JSON.stringify(d);assert.ok([d.x,d.y,d.bx,d.by,...d.hit].every(Number.isFinite));syncSceneZone(z);assert.equal(JSON.stringify(d),before);}syncSceneZone('th');
});

test('both cooks physically walk back to ngiw/krata after their ordered batch',()=>{
 const g=game();kitchen(g);
 for(const [key,post] of [['dam','ngiw'],['plerng','krata']]){
  const c=cook(g,key);advance(g);assert.equal(c.cook,false);
  const target=STATIONS.find(d=>d.k===post);
  let frames=0;while(Math.hypot(c.x-target.x,c.y-target.y)>100&&frames++<4000)g.stepWorld(120);
  assert.ok(Math.hypot(c.x-target.x,c.y-target.y)<=100,key+' returns to '+post);
 }
});
