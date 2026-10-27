import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,walk} from './helpers/m2-map.mjs';
import {nearestInteraction} from '../src/proximity.js';
import {stepWorkers,advanceWorkers} from '../src/workers.js';
import {createGame} from '../src/game.js';
import {TOWN_OWNER_MASK_META} from '../src/town-owner-walkmask-west.js';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

test('new west mask retains source identity and closes only disconnected cells',()=>{
 const layer=readFileSync(new URL('./fixtures/z3-owner-red-20261027.png',import.meta.url));
 assert.equal(createHash('sha256').update(layer).digest('hex'),TOWN_OWNER_MASK_META.source_sha256);
 assert.equal(TOWN_OWNER_MASK_META.reference_sha256,'6ca6f623fdf8c02f64a9deae2f8d333557fcfbdc964e608673fa5d3ded579854');
 assert.equal(TOWN_OWNER_MASK_META.removed_disconnected_cells,10);assert.equal(TOWN_OWNER_MASK_META.dilate,0);
});

test('new west mask: station ngiw is usable from a reachable point',()=>{
 const {g,spawn}=setup('west');const st=g.stations.find(s=>s.def.k==='ngiw');
 const path=walk.findPath(...spawn,st.def.x,st.def.y),end=path?.at(-1);
 assert.ok(end);assert.ok(walk.canWalk(...end));
 assert.equal(nearestInteraction({x:end[0],y:end[1]},[{id:'ngiw',kind:'station',x:st.def.x,y:st.def.y,reach:st.def.interactionReach}])?.id,'ngiw');
});

test('new west mask: worker physically collects ngiw materials and sells them',()=>{
 const {g}=setup('west');g.save=()=>true;g.onChange=()=>{};g.coin=1e5;g.food=1e5;g.paused=false;g.mobs=[];(g.zoneEvents.th||={}).frontierBreach='cleared';
 const worker=g.hireWorker();assert.ok(worker);const st=g.stations.find(s=>s.def.k==='ngiw');g.stations=[st];st.build=0;st.repair=0;
 g.setWorkerMode(worker.id,'gather');stepWorkers(g);
 for(let i=0;i<4000&&!g.workerState.ledger.sales;i++)advanceWorkers(g,120);
 assert.equal(g.workerState.ledger.ngiwWood,1);assert.equal(g.workerState.ledger.sales,1);assert.equal(g.workerState.ledger.income,5);
});

test('new west mask: migrated save on newly blocked location is recovered without losing progress',()=>{
 const {g}=setup('west');g.coin=777;g.casesDone=12;g.townSkinMigrated={west:true};g.player.x=551;g.player.y=1532;
 assert.equal(walk.canWalk(g.player.x,g.player.y),false);
 const saved=JSON.parse(JSON.stringify(g.snapshot()));const loaded=createGame();assert.equal(loaded.restore(saved),true);loaded.paused=false;loaded.over=false;loaded.syncBlocks(true);loaded.stepWorld(16);
 assert.equal(loaded.zone,'west');assert.equal(loaded.coin,777);assert.equal(loaded.casesDone,12);assert.equal(walk.canWalk(loaded.player.x,loaded.player.y),true);
});

for (const kind of ['build','repair']) test(`new west mask: worker reaches ngiw and completes ${kind} work`,()=>{
 const {g}=setup('west');g.save=()=>true;g.onChange=()=>{};g.coin=1e5;g.food=1e5;g.paused=false;g.mobs=[];(g.zoneEvents.th||={}).frontierBreach='cleared';
 const worker=g.hireWorker();assert.ok(worker);const st=g.stations.find(s=>s.def.k==='ngiw');g.stations=[st];st.build=kind==='build'?1:0;st.repair=kind==='repair'?1:0;st.workerWork={ready:false,remaining:600};
 stepWorkers(g);assert.equal(worker.job.kind,kind);
 for(let i=0;i<4000&&!st.workerWork.ready;i++)advanceWorkers(g,120);
 assert.equal(st.workerWork.ready,true);assert.equal(g.workerState.ledger[`${kind}Ms`],600);
});
