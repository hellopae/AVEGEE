import test from 'node:test';
import assert from 'node:assert/strict';
import {PUNISHMENT_LEVELS,punishmentLevel,normalizePunishment,advancePunishments,punishmentRemaining} from '../src/punishment.js';
import {createGame} from '../src/game.js';
const fixture=level=>{const slot={soul:{id:17},intensity:level,progress:0,need:0},st={def:{k:'krata',x:0,y:0},slots:[slot],crewK:'taan'},c={k:'taan',morale:100};const g={stations:[st],player:{x:0,y:0},afterlifeWalks:[],crewOf:()=>c,finished:0,finish(a,b){this.finished++;a.slots.splice(a.slots.indexOf(b),1);}};return {slot,st,c,g};};
test('five sentence levels use confirmed seconds and five distinct requested colours',()=>{
 assert.deepEqual(PUNISHMENT_LEVELS.slice(1).map(x=>x.seconds),[10,30,60,120,240]);assert.equal(new Set(PUNISHMENT_LEVELS.slice(1).map(x=>x.color)).size,5);
});
for(let i=1;i<=5;i++)test(`level ${i} completes at exactly ${punishmentLevel(i).seconds} active seconds`,()=>{
 const {g,slot}=fixture(i),duration=punishmentLevel(i).seconds*1000;advancePunishments(g,duration-1);assert.equal(g.finished,0);assert.equal(punishmentRemaining(slot),1);advancePunishments(g,1);assert.equal(g.finished,1);advancePunishments(g,10000);assert.equal(g.finished,1);
});
test('pause, transport, absent keeper, fire and repair cannot consume punishment time',()=>{
 const {g,slot,st,c}=fixture(3);normalizePunishment(slot);
 for(const [owner,key,value] of [[g,'paused',true],[g,'mapTravel',true],[c,'recoverUntil',1],[c,'escort',17],[st,'fire',100],[st,'repair',1]]){owner[key]=value;advancePunishments(g,1000);assert.equal(slot.elapsedMs,0,key);delete owner[key];}
 g.afterlifeWalks=[{destination:'station',soul:{id:17}}];advancePunishments(g,1000);assert.equal(slot.elapsedMs,0);g.afterlifeWalks=[];advancePunishments(g,1000);assert.equal(slot.elapsedMs,1000);
});
test('legacy progress migrates proportionally once and survives JSON roundtrip without offline time',()=>{
 const slot={intensity:4,need:80,progress:20};normalizePunishment(slot);assert.equal(slot.elapsedMs,30000);const restored=JSON.parse(JSON.stringify(slot));normalizePunishment(restored);assert.deepEqual(restored,slot);assert.equal(punishmentRemaining(restored),90);
});
test('keeper strength, upgrades and crowd do not alter standard active seconds',()=>{
 const a=fixture(2),b=fixture(2);b.c.raeng=999;b.st.speedLv=99;b.g.fed=true;b.st.slots.push({soul:{id:18},intensity:5,need:1,progress:0});advancePunishments(a.g,1100);advancePunishments(b.g,1100);assert.equal(a.slot.elapsedMs,b.slot.elapsedMs);
});
test('ordinary verdict score and karma depend on destination and evidence, never chosen force',()=>{
 const g=createGame();g.save=()=>true;const st=g.stations.find(s=>s.def.k==='krata');g.hire('taan');st.crewK='taan';const soul={deserved:3,deeds:[{s:st.def.tags[0],w:5}],merits:[]};const results=[1,2,3,4,5].map(intensity=>g.judge(st,{soul,intensity}));for(const r of results)assert.deepEqual(r,results[0]);
});

test('actual frame advance is not counted again by the management tick',()=>{
 const g=createGame();g.save=()=>true;const st=g.stations.find(s=>s.def.k==='krata'),soul=g.queue[0];st.crewK='taan';st.slots=[{soul,intensity:3,progress:0,need:60,verdict:null}];g.advanceAfterlife(1000);assert.equal(st.slots[0].elapsedMs,1000);g.step();assert.equal(st.slots[0].elapsedMs,1000);g.step();assert.equal(st.slots[0].elapsedMs,1700);
});
test('game snapshot/restore preserves served active milliseconds, not elapsed offline time',()=>{
 const g=createGame();g.save=()=>true;const st=g.stations.find(s=>s.def.k==='krata');st.crewK='taan';st.slots=[{soul:g.queue[0],intensity:2,progress:0,need:30,verdict:null}];g.advanceAfterlife(1234);const copy=createGame();copy.save=()=>true;assert.equal(copy.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);const slot=copy.stations.find(s=>s.def.k==='krata').slots[0];assert.equal(slot.elapsedMs,1234);assert.equal(slot.need,30000);assert.equal(slot.progress,1234);
});
