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
test('crew cooking stays disabled and only arrived worker cooks appear inside the canteen',()=>{
 const g=game();g.bossCleared.th=true;g.stations.push({def:STATIONS.find(s=>s.k==='canteen'),slots:[],build:0,fire:0});
 assert.equal(g.orderRice('dam',1),false);prepareCooks(g);assert.equal(canteenCookPose(g,g.crewOf('taan')),null);
 const w=g.hireWorker();g.setWorkerMode(w.id,'cook');assert.equal(canteenCookPose(g,w),null);
 w.job={kind:'cook',ms:0};w.arrived=true;[w.x,w.y]=canteenPoint(g);assert.deepEqual(canteenCookPose(g,w).point,[.61,.59]);
});
test('merchant buys pooled rice without Nira; worker cook hidden outside and rendered inside',()=>{
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),room=readFileSync(new URL('../src/room.js',import.meta.url),'utf8'),scene=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
 assert.match(ui,/bindFoodSupply\(dlg,paint\)/);assert.match(ui,/canteenPanelHtml\(g,inside\)/);assert.match(ui,/g\.buy\('food',1\)/);
 assert.match(room,/def\.k === 'canteen'[\s\S]*canteenCookPose\(g,c\)/);assert.match(scene,/if\(canteenCookPose\(g,worker\)/);
 const g=game();g.niraRest={};const before=g.food,coin=g.coin;assert.ok(g.buy('food',1));assert.equal(g.food,before+10);assert.equal(g.coin,coin-BAL.foodPrice*10);
});
