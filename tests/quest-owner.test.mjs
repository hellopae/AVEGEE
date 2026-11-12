import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';import {MERCHANT,syncSceneZone} from '../src/data.js';
import {QUESTS,SIDE_QUESTS,KIN_QUESTS,questTarget,questState,questsForActor,advanceQuest,recordQuestVerdict} from '../src/side-quests.js';import {activeQuestEntries} from '../src/quest-journal.js';
globalThis.Image??=class{};
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.gameCompleted=true;g.zoneTravel.visited={th:true,asia:true,west:true,cyberhell:true};g.zoneTravel.ports={th:true,asia:true,west:true,cyberhell:true};g.merchantJourney={asia:{arrived:true},west:{arrived:true},cyberhell:{arrived:true}};return g;};
import {hireFor,hireAll} from './helpers/quest-hire.mjs';
const meet=(g,q)=>{const p=questTarget(g,q);g.zone=p.zone;syncSceneZone(p.zone);hireFor(g,q);Object.assign(g.player,questTarget(g,q));};
const reload=g=>{const h=game();assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));h.save=()=>true;h.onChange=()=>{};return h;};
for(const q of QUESTS)test(`${q.id}: acceptance belongs only to its named regional owner and logs title once`,()=>{
 const g=game(),target=questTarget(g,q),zone=q.kin?q.from:q.zone;assert.equal(target.zone,zone);assert.equal(target.npc,q.npc);
 assert.ok(!questsForActor(g,q.npc,zone).some(x=>x.id===q.id)||['nira','merchant'].includes(q.npc)||q.npc==='taan'&&zone==='th','PART-A: hidden until the character is hired');g.zone=zone;syncSceneZone(zone);hireFor(g,q);g.zone='th';syncSceneZone('th');
 assert.ok(questsForActor(g,q.npc,zone).some(x=>x.id===q.id));for(const wrong of ['th','asia','west','cyberhell'].filter(z=>z!==zone))assert.ok(!questsForActor(g,q.npc,wrong).some(x=>x.id===q.id));
 if(q.npc!=='merchant')assert.ok(!questsForActor(g,'merchant',zone).some(x=>x.id===q.id));
 g.zone=zone==='th'?'asia':'th';syncSceneZone(g.zone);g.player.x=target.x;g.player.y=target.y;const untouched=JSON.stringify(g.sideQuests);assert.equal(advanceQuest(g,q.id),false);assert.equal(JSON.stringify(g.sideQuests),untouched);
 meet(g,q);g.player.x+=2000;assert.equal(advanceQuest(g,q.id),false);meet(g,q);assert.ok(advanceQuest(g,q.id));assert.equal(questState(g,q.id).step,1);
 const logs=JSON.stringify(g.logs);assert.equal(logs.split(`รับภารกิจ: ${q.title}`).length-1,1);const h=reload(g);meet(h,q);advanceQuest(h,q.id,0);assert.equal(JSON.stringify(h.logs).split(`รับภารกิจ: ${q.title}`).length-1,1);assert.ok(activeQuestEntries(h).some(x=>x.id===q.id));
});
test('generic Cyber merchant cannot accept side missions; dedicated merchant quest starts in Asia',()=>{
 const g=game();g.zone='cyberhell';syncSceneZone(g.zone);Object.assign(g.player,{x:MERCHANT.x,y:MERCHANT.y});assert.deepEqual(questsForActor(g,'merchant'),[]);
 for(const q of SIDE_QUESTS)assert.equal(advanceQuest(g,q.id),false);
 const own=SIDE_QUESTS.find(q=>q.id==='sqMerchant');meet(g,own);assert.deepEqual(questsForActor(g,'merchant').map(q=>q.id),['sqMerchant']);assert.ok(advanceQuest(g,own.id));
});
test('journal excludes unaccepted/completed missions, labels pending verdict and follows later TH reply routing without mutation',()=>{
 const g=game();assert.deepEqual(activeQuestEntries(g),[]);hireAll(g);
 for(const q of SIDE_QUESTS){g.sideQuests[q.id]={step:2,done:false,caseId:q.caseId};}
 const before=JSON.stringify(g),entries=activeQuestEntries(g);assert.equal(entries.length,8);assert.ok(entries.every(e=>e.title&&!e.title.includes(e.id)&&e.objective.includes('ออกหมาย')&&e.objective.includes(e.name)));assert.equal(JSON.stringify(g),before);
 for(const q of SIDE_QUESTS){meet(g,q);assert.equal(advanceQuest(g,q.id,0),false);recordQuestVerdict(g,{case:q.caseId},{right:true});assert.equal(questState(g,q.id).step,3);}
 for(const id of ['sqPlerng','sqBoon']){g.sideQuests[id].step=4;const q=QUESTS.find(x=>x.id===id),entry=activeQuestEntries(g).find(e=>e.id===id);assert.equal(entry.zone,'th');assert.ok(questsForActor(g,q.npc,'th').some(x=>x.id===id));assert.ok(!questsForActor(g,q.npc,q.zone).some(x=>x.id===id));}
 g.sideQuests.sqNira.done=true;assert.ok(!activeQuestEntries(g).some(e=>e.id==='sqNira'));
});
test('kin from-to-from routing stays intact; paused side missions remain readable but kin retain finale availability',()=>{
 const g=game();g.gameCompleted=false;g.zoneEvents.cyberhell={cyberBreach:'cleared',cyberRescue:'cleared',cyberFinal:'pending'};g.finalEventState().phase='ready';
 hireAll(g);for(const q of QUESTS)g.sideQuests[q.id]={step:1,done:false};const entries=activeQuestEntries(g);assert.equal(entries.length,16);
 for(const q of QUESTS){const e=entries.find(x=>x.id===q.id);assert.equal(e.paused,!q.kin);assert.ok(questsForActor(g,q.npc,e.zone).some(x=>x.id===q.id));}
 for(const q of SIDE_QUESTS){meet(g,q);assert.equal(advanceQuest(g,q.id,0),false);}
 for(const q of KIN_QUESTS){for(const [step,z]of [[0,q.from],[1,q.to],[2,q.from]]){g.sideQuests[q.id].step=step;assert.equal(questTarget(g,q).zone,z);}g.sideQuests[q.id].step=0;meet(g,q);assert.ok(advanceQuest(g,q.id));}
});
test('old saved progress/rewards/choices survive helper reads and real restore, without creating quest save fields',()=>{
 const g=game();hireAll(g);for(const [i,q]of QUESTS.entries())g.sideQuests[q.id]={step:q.kin?2:3,choice:i%2,done:false,caseId:q.caseId||null,verdict:{right:true,heaven:false,privateOpened:false}};
 const saved=g.snapshot(),before=JSON.stringify(saved.sideQuests);const h=reload(g);activeQuestEntries(h);for(const npc of ['nira','taan','plerng','kan','boon','dam','guard','merchant'])questsForActor(h,npc);assert.equal(JSON.stringify(h.snapshot().sideQuests),before);assert.deepEqual(Object.keys(h.snapshot().sideQuests[QUESTS[0].id]).sort(),Object.keys(saved.sideQuests[QUESTS[0].id]).sort());
});

test('Nira owner conversation uses her available current map feet, while off-zone/resting fallback stays stable',()=>{
 const g=game(),q=QUESTS.find(q=>q.id==='sqNira'),nira=g.crewOf('nira');g.zone='th';syncSceneZone('th');
 nira.x=g.player.x;nira.y=g.player.y;const local=questTarget(g,q);assert.ok(Math.hypot(local.x-nira.x,local.y-nira.y)<=32);assert.ok(advanceQuest(g,q.id));
 g.zone='cyberhell';syncSceneZone(g.zone);const off=questTarget(g,q);nira.x+=500;nira.y+=500;assert.deepEqual(questTarget(g,q),off);
 g.zone='th';syncSceneZone('th');g.niraRest={};const resting=questTarget(g,q);nira.x+=100;nira.y+=100;assert.deepEqual(questTarget(g,q),resting);
});
test('locked owner missions are not offered and pure helper reads never initialize absent state',()=>{
 const g=createGame();const before=JSON.stringify(g.sideQuests);for(const npc of ['nira','taan','plerng','kan','boon','dam','guard','merchant'])assert.deepEqual(questsForActor(g,npc),[]);assert.deepEqual(activeQuestEntries(g),[]);assert.equal(JSON.stringify(g.sideQuests),before);
});
