// FOOD-A building/migration contracts retained; FOOD-SYSTEM replaces paid crew cooking.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {STATIONS,syncSceneZone} from '../src/data.js';
import {resetWalk,setBlocks,setNpcDiscs} from '../src/walk.js?v=k1d';
import {canteenActive,canteenState,prepareCooks,stepCanteen} from '../src/canteen.js';
import {mapInteractions} from '../src/proximity.js';
globalThis.Image??=class{};
function game(){resetWalk();setBlocks([],[]);setNpcDiscs([]);const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.level=5;g.hire('dam');g.hire('plerng');return g;}
test('canteen construction requires zone-1 victory, charges once, and entry waits for completion',()=>{
 const g=game();assert.equal(g.build('canteen'),false);assert.equal(canteenActive(g),false);
 g.zoneEvents.th={frontierBreach:'cleared'};g.hireWorker();prepareCooks(g);stepCanteen(g,120);assert.equal(canteenActive(g),false);assert.equal(g.crewOf('dam').cook,false);
 const coins=g.coin;assert.equal(g.build('canteen'),true);assert.equal(g.coin,coins-120);assert.equal(g.build('canteen'),false);assert.equal(canteenActive(g),false);assert.ok(!mapInteractions(g,{}).some(t=>t.key==='canteen'));
 const st=g.stations.find(s=>s.def.k==='canteen');st.build=0;st.buildWait=false;st.workerWork=null;
 assert.equal(canteenActive(g),true);assert.ok(mapInteractions(g,{}).some(t=>t.key==='canteen'&&t.kind==='station'));
});
test('legacy implicit kitchens migrate visited branches once; new saves keep unbuilt kitchens absent',()=>{
 const g=game();g.zoneEvents.th={frontierBreach:'cleared'};let d=g.snapshot();delete d.canteenVersion;d.zoneSave={asia:{stations:[{k:'sala',slots:[]}]}};
 const loaded=game();assert.equal(loaded.restore(d),true);assert.equal(canteenActive(loaded),true);assert.equal(loaded.zoneSave.asia.stations.filter(s=>s.k==='canteen').length,1);
 const twice=game();twice.restore(loaded.snapshot());assert.equal(twice.stations.filter(s=>s.def.k==='canteen').length,1);
 const fresh=game();fresh.restore(g.snapshot());assert.equal(canteenActive(fresh),false);
});
test('legacy paid crew queues refund only unfinished portions across zones, once; cooked and carried meals survive',()=>{
 const g=game();g.zoneEvents.th={frontierBreach:'cleared'};const worker=g.hireWorker();worker.mode='food';worker.meal=true;
 const save=JSON.parse(JSON.stringify(g.snapshot()));delete save.foodSystemVersion;
 save.canteenState={th:{meals:2,served:7,orders:[{cook:'dam',remaining:2,ms:1900}]},asia:{meals:1,orders:[{cook:'plerng',remaining:3}]}};
 save.roster['th:dam'].cook=true;
 const loaded=game();assert.equal(loaded.restore(save),true);assert.equal(loaded.coin,save.coin+10);
 assert.equal(canteenState(loaded).meals,2);assert.equal(loaded.canteenState.asia.meals,1);assert.equal(canteenState(loaded).served,7);assert.deepEqual(canteenState(loaded).orders,[]);
 assert.equal(loaded.workers()[0].mode,'serve');assert.equal(loaded.workers()[0].meal,true);assert.equal(loaded.crewOf('dam').cook,false);
 assert.equal(loaded.orderRice('dam',1),false);assert.equal(loaded.orderRice('plerng',1),false);
 const twice=game();assert.equal(twice.restore(loaded.snapshot()),true);assert.equal(twice.coin,loaded.coin);assert.equal(canteenState(twice).meals,2);
});
test('kitchen footprints and entry are finite in every zone and repeat without drift',()=>{
 for(const z of ['th','asia','west','cyberhell']){syncSceneZone(z);const d=STATIONS.find(s=>s.k==='canteen'),before=JSON.stringify(d);assert.ok([d.x,d.y,d.bx,d.by,...d.hit].every(Number.isFinite));syncSceneZone(z);assert.equal(JSON.stringify(d),before);}syncSceneZone('th');
});
