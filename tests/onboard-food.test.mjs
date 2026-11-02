import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';import {STATIONS,BAL} from '../src/data.js';import {beginCourtOnboarding,firstCourtJob,needsFirstDestination,COURT_FIRST_STEPS} from '../src/onboarding.js';
import {canteenPoint,prepareCooks,stepCanteen,canteenCookPose,canteenState} from '../src/canteen.js';
globalThis.Image??=class{};const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.level=5;return g;};
test('only explicit New Game removes free cauldron; opening lesson persists once and waits for completion',()=>{
 const existing=game();assert.ok(!firstCourtJob(existing));assert.ok(!needsFirstDestination(existing));assert.ok(existing.stations.some(s=>s.def.k==='krata'));
 const g=game();assert.equal(beginCourtOnboarding(g),true);assert.equal(beginCourtOnboarding(g),false);assert.ok(needsFirstDestination(g));assert.ok(!g.stations.some(s=>s.def.k==='krata'));
 assert.ok(g.build('krata'));assert.ok(needsFirstDestination(g));g.stations.find(s=>s.def.k==='krata').build=0;assert.equal(needsFirstDestination(g),false);
 g.casesDone=1;assert.equal(firstCourtJob(g),false);assert.match(COURT_FIRST_STEPS,/เปิดศาล.*รับวิญญาณ.*พิจารณาคดี.*สอบสวน.*สร้างกระทะทองแดง/);
});
test('cook enters from stairs, produces inside only, and reload retains room pose with one paid batch',()=>{
 const g=game();g.hire('dam');g.stations.push({def:STATIONS.find(s=>s.k==='canteen'),slots:[],build:0,fire:0});const coins=g.coin;
 assert.ok(g.orderRice('dam',1));prepareCooks(g);const c=g.crewOf('dam');assert.equal(canteenCookPose(g,c),null);[c.x,c.y]=canteenPoint(g);
 stepCanteen(g,120);const first=canteenCookPose(g,c);assert.ok(first.moving);assert.ok(first.point[0]<.80);assert.equal(canteenState(g).meals,0);
 for(let i=0;i<8;i++)stepCanteen(g,120);assert.equal(canteenCookPose(g,c).moving,false);assert.ok(Math.abs(canteenCookPose(g,c).point[0]-.61)<1e-8);assert.ok(Math.abs(canteenCookPose(g,c).point[1]-.59)<1e-8);
 const loaded=game();loaded.restore(JSON.parse(JSON.stringify(g.snapshot())));assert.deepEqual(canteenCookPose(loaded,loaded.crewOf('dam')),canteenCookPose(g,c));
 delete canteenState(loaded).orders[0].walkMs;prepareCooks(loaded);stepCanteen(loaded,120);assert.equal(canteenCookPose(loaded,loaded.crewOf('dam')).moving,false);
 for(let i=0;i<16;i++)stepCanteen(g,120);assert.equal(canteenState(g).meals,1);assert.equal(canteenCookPose(g,c),null);assert.equal(g.coin,coins-2);
});
test('merchant and canteen buy pooled rice without Nira; cook hidden outside and rendered inside',()=>{
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),room=readFileSync(new URL('../src/room.js',import.meta.url),'utf8'),scene=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
 assert.match(ui,/bindFoodSupply\(dlg,paint\)/);assert.match(ui,/bindFoodSupply\(L,panels,\(\)=>!!R\?\.inReach\(\)\)/);assert.match(ui,/g\.buy\('food',1\)/);
 assert.match(room,/def\.k === 'canteen'[\s\S]*canteenCookPose\(g,c\)/);assert.match(scene,/if\(canteenCookPose\(g,c\)\)continue/);
 const g=game();g.niraRest={};const before=g.food,coin=g.coin;assert.ok(g.buy('food',1));assert.equal(g.food,before+10);assert.equal(g.coin,coin-BAL.foodPrice*10);
});
