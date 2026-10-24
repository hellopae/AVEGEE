import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {teamStatus,teamHudHtml,teamManageHtml,teamMembers} from '../src/team-hud.js';
import {pressReaction} from '../src/interrogation-ui.js';
import {STATIONS,HARD_CASES} from '../src/data.js';
import {setup} from './helpers/m2-map.mjs';
globalThis.Image??=class {};
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
test('TEAM current-zone actors have real vitals and duties; no other zone roster or hiring control leaks into quick manage',()=>{
 const g=game();g.coin=50000;g.level=5;g.bossCleared.th=true;g.hire('kan');g.hireGuard();g.hireWorker();
 const w=g.workers()[0];w.job={kind:'gather',material:'dabShards',phase:'sell'};w.hunger=30;w.morale=50;
 const status=teamStatus(g,w,true);assert.deepEqual(status,{hp:50,hunger:30,duty:'นำของไปขาย',starved:false,busy:true});
 const c=g.crewOf('taan');c.at='krata';c.hunger=22;
 assert.match(teamStatus(g,c).duty,/คุม/);assert.equal(teamStatus(g,c).busy,true);
 const html=teamHudHtml(g,()=>'/portrait.png');assert.match(html,/aria-valuenow="30"/);assert.match(html,/is-busy/);assert.match(html,/เฝ้าประตู/);
 const manage=teamManageHtml(g,()=>'/portrait.png');assert.doesNotMatch(manage,/data-hire|data-power-hire/);assert.match(manage,/data-team-party/);assert.match(manage,/data-team-mode/);
 assert.ok(teamMembers(g).some(x=>x.a.id===g.guard.id));assert.ok(teamMembers(g).some(x=>x.a.k==='nira'));
});
test('TEAM starvation stays visible after kitchen refills; manual rice clears only selected worker and uses inventory once',()=>{
 const g=game();g.coin=50000;g.bossCleared.th=true;g.hireWorker();g.hireWorker();g.food=0;g.inventory.food=2;
 for(const w of g.workers()){w.supplyRest=true;w.hunger=0;w.job=null;}
 g.food=10;assert.equal(teamStatus(g,g.workers()[0],true).starved,true);assert.match(teamHudHtml(g,()=>''),/is-starved/);
 assert.equal(g.feedWorker(g.workers()[0].id),true);assert.equal(g.inventory.food,1);assert.equal(g.workers()[0].supplyRest,false);assert.equal(g.workers()[1].supplyRest,true);
 assert.equal(teamStatus(g,g.workers()[0],true).hunger,40);assert.equal(teamStatus(g,g.workers()[1],true).hunger,0);
});
test('TEAM crew rice follows inventory API and cannot feed a full actor or a reader',()=>{
 const g=game(),c=g.crewOf('taan');g.inventory.food=2;c.hunger=0;
 assert.equal(g.giveCrewItem('food',c.id),true);assert.equal(c.hunger,40);assert.equal(g.inventory.food,1);
 c.hunger=100;assert.equal(g.giveCrewItem('food',c.id),false);assert.equal(g.giveCrewItem('food',g.crewOf('nira').id),false);
 assert.equal(g.inventory.food,1);
});
test('TEAM tea accepts a healthy hungry keeper, walks before recovery and restores hunger only after sitting',()=>{
 const {g}=setup('th');g.save=()=>true;g.onChange=()=>{};g.stations.push({def:STATIONS.find(s=>s.k==='tea'),build:0,slots:[]});g.syncBlocks(true);
 const c=g.crewOf('taan');c.morale=100;c.hunger=5;
 assert.equal(g.restActor(c.id,1000),true);assert.equal(c.hunger,5);assert.equal(c.teaRest.phase,'travel');
 g.updateGuardRest(c,1001000);assert.equal(c.teaRest,null);assert.equal(c.hunger,100);assert.equal(c.morale,100);assert.equal(g.restActor(c.id),false);
});
test('TEAM mitigating press is relief from structured negative deed, ordinary incrimination stays fear and justice weights stay unchanged',()=>{
 const g=game();const hard=HARD_CASES.find(c=>c.hidden?.w<0);assert.ok(hard);
 const s={id:108,who:'คน',said:[],merits:[],deeds:[{...hard.seen,known:true},{...hard.hidden,known:false}],presses:2,lines:[{i:0,kind:'plea',t:'คำให้การ'}]};
 const weights=s.deeds.map(d=>d.w);assert.equal(pressReaction(g,s,s.lines[0]),'relief');assert.ok(g.press(s,0));assert.equal(s.deeds[1].known,true);assert.deepEqual(s.deeds.map(d=>d.w),weights);assert.equal(pressReaction(g,s,s.lines[0]),null);
 for(const kind of ['deny','boast']){const q={deeds:[{w:5,known:false}],merits:[],presses:1};assert.equal(pressReaction(g,q,{kind}), 'fear');}
 assert.equal(pressReaction(g,{deeds:[{w:3,known:false},{w:-2,known:false}],presses:1},{kind:'plea'}),'fear');
 assert.equal(pressReaction(g,{deeds:[],presses:1},{kind:'solid'}),null);
 const misleading={deeds:[{t:'บรรเทาโทษ',w:5,known:false}],presses:1};assert.equal(pressReaction(g,misleading,{kind:'plea'}),'fear');
});
