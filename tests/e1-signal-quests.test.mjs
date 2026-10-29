import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {ALL_CASES, CASES_BY_ZONE} from '../src/cases.js';
import {QUEST_CASES} from '../src/quest-cases.js';
import {ZONE_EVENTS,isFrontierBreachEvent,returnsToFrontier,syncSceneZone,MERCHANT,ITEMS} from '../src/data.js';
import {SIGNAL_KEYS,signalStory} from '../src/signal-arc.js';
import {SIDE_QUESTS,KIN_QUESTS,questTarget,advanceQuest,advanceMerchant,questState,crossZoneTalk,questsPaused,merchantAvailable,merchantRun,questDialogue} from '../src/side-quests.js';
import {SIGNAL_STORIES,CHARACTER_HISTORY,CROSS_ZONE_LINES} from '../src/e1-content.js';
import {breachApproachActors} from '../src/breach-approach.js';
import {releasedFrontierBoss} from '../src/frontier.js';
import {calcRemorse} from '../src/remorse.js';
globalThis.Image=class {};
import {harbourTravel} from './helpers/travel.mjs';
const reload=g=>{const h=createGame();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};
function zone(g,z){g.zone=z;syncSceneZone(z);g.pendingZone=null;g.refreshZoneEvents();}
function unlock(g){g.zoneTravel.visited={th:true,asia:true,west:true,cyberhell:true};g.zoneEvents.cyberhell={cyberRescue:'cleared',cyberBreach:'cleared'};zone(g,'cyberhell');g.merchantJourney={asia:{arrived:true},west:{arrived:true},cyberhell:{arrived:true}};}
function meet(g,q){const p=questTarget(g,q);zone(g,p.zone);Object.assign(g.player,questTarget(g,q));}
function win(g){
 for(let n=0;g.battle&&!g.battle.over&&n<70;n++){
  if(g.battle.pendingWave){assert.equal(g.advanceZoneEventWave(),true);continue;}
  for(const f of g.battle.foes)f.atk=[0,0];
  const f=g.battle.foes.find(f=>f.hp>0);f.hp=1;g.selectFoe(f.id);g.battleAct('atk');
 }
 assert.equal(g.battle?.over,'win');g.endBattle();g.pendingReward=null;
}
function verdict(g,q,right=true){
 const soul=g.queue.find(s=>s.case===q.caseId);assert.ok(soul);
 g.applyVerdict({right,heaven:soul.pure&&right,score:75,stars:3,tham:100,ked:75,over:0,short:0,karma:0},soul,'ทดสอบคำตัดสิน');
 g.queue=g.queue.filter(s=>s!==soul);return soul;
}
test('SIG opens at seven CYBER cases, cross-zone visits cannot accelerate it; final waits for all three captains and close acknowledgement',()=>{
 let g=createGame();unlock(g);g.zoneCases.cyberhell=6;g.zoneCases.th=500;g.refreshZoneEvents();assert.equal(g.zoneEventStatus('cyberSignal'),'locked');
 g.zoneCases.cyberhell=7;g.refreshZoneEvents();assert.equal(g.zoneEventStatus('cyberSignal'),'pending');assert.equal(g.startZoneEvent('cyberSignal','call'),null);
 g.storySeen['cyber-signal-open']=true;assert.ok(g.startZoneEvent('cyberSignal','call'));win(g);assert.ok(!g.bossJustice?.active);
 g=reload(g);assert.equal(g.zoneEventStatus('cyberSignal'),'cleared');
 for(const z of ['th','asia','west']){
  zone(g,z);const key=SIGNAL_KEYS[z];assert.equal(g.zoneEventStatus(key),'pending');
  g.storySeen[signalStory(key,'open')]=true;assert.ok(g.startZoneEvent(key,'call'));win(g);
  assert.ok(!g.bossJustice?.active);assert.equal(g.zoneEvents[z][key],'cleared');g=reload(g);
 }
 zone(g,'cyberhell');g.zoneCases.cyberhell=10;g.refreshZoneEvents();assert.equal(g.zoneEventStatus('cyberFinal'),'locked');assert.equal(g.startFinalEncounter(),null);
 assert.ok(g.storyQueue.some(s=>s.key==='cyber-signal-close'));while(g.storyQueue.length)g.completeStory();
 assert.equal(g.zoneEventStatus('signalClose'),'cleared');assert.equal(g.zoneEventStatus('cyberFinal'),'pending');
 const heart=g.inventory.spareHeart,exp=g.exp;g.refreshZoneEvents();g.completeStory();assert.equal(g.inventory.spareHeart,heart);assert.equal(g.exp,exp);
 assert.ok(g.startFinalEncounter());
});
test('SIG victims never queue a repeat trial; friendly post remains in its ledger and returns after invasion',()=>{
 const g=createGame();unlock(g);
 for(const [z,key]of Object.entries(SIGNAL_KEYS)){
  assert.equal(isFrontierBreachEvent(z,key),false);assert.equal(returnsToFrontier({kind:'zoneEvent',eventKey:key,zone:z,over:'win'}),true);
  const actors=breachApproachActors(z,key);assert.equal(actors[0].hypno,true);assert.equal(actors[0].boss,true);
 }
 g.zone='west';g.bossJustice={active:null,ledger:{west:{id:'west',zone:'west',phase:'released',frontierBoss:true,art:'boss-frontier-west',name:'วาลดริก'}}};
 assert.equal(releasedFrontierBoss(g,{invasion:true}),null);assert.ok(releasedFrontierBoss(g));
});
test('SIG choice survives defeat/reload; call stuns the returning boss, rush pays 25 percent exactly once',()=>{
 for(const choice of ['call','rush']){
  let g=createGame();unlock(g);g.zoneCases.cyberhell=7;g.refreshZoneEvents();g.storySeen['cyber-signal-open']=true;
  g.startZoneEvent('cyberSignal',choice);g.battle.over='lose';g.endBattle();g=reload(g);g.pendingReward=null;
  assert.equal(g.signalChoices.cyberSignal,choice);assert.equal(g.zoneEventStatus('cyberSignal'),'pending');
  g.startZoneEvent('cyberSignal');for(const f of g.battle.foes)f.hp=0;g.battle.pendingWave=2;g.advanceZoneEventWave();
  assert.equal(g.battle.foes.find(f=>f.boss).stun,choice==='call'?1:0);
  const before=g.coin,exp=g.exp;win(g);assert.ok(g.coin>=before+Math.round(150*(choice==='rush'?1.25:1)));assert.equal(g.exp,exp+20);
  const coin=g.coin;assert.equal(g.startZoneEvent('cyberSignal',choice),null);g=reload(g);assert.equal(g.coin,coin);
 }
});
test('eight quest cases have unique ids, correct zones, and never enter named random pools even at Asia recycle',()=>{
 assert.equal(QUEST_CASES.length,8);assert.equal(new Set(ALL_CASES.map(c=>c.k)).size,ALL_CASES.length);
 for(const q of SIDE_QUESTS){const c=QUEST_CASES.find(c=>c.k===q.caseId);assert.equal(c.quest,q.id);assert.equal(c.zone,q.zone);assert.ok(CASES_BY_ZONE[q.zone].includes(c));}
 const g=createGame();g.casesDone=100;g.spawns=3;
 for(const z of ['th','asia','west']){zone(g,z);g.usedCases=ALL_CASES.filter(c=>!c.quest).map(c=>c.k);for(let i=0;i<50;i++){const c=g.nextNamedCase([]);assert.ok(!c||!QUEST_CASES.some(q=>q.k===c.case));}}
});
for(const choice of [0,1])test(`all eight side quests: real enqueue/verdict, branch ${choice}, save/reload and single claim`,()=>{
 for(const q of SIDE_QUESTS){
  let g=createGame();unlock(g);g.coin=1000;g.order=30;g.exp=0;
  meet(g,q);assert.equal(advanceQuest(g,q.id),true);g=reload(g);meet(g,q);
  assert.equal(advanceQuest(g,q.id,q.id==='sqBoon'?choice:null),true);assert.equal(advanceQuest(g,q.id),false);
  const soul=g.queue.find(s=>s.case===q.caseId);assert.ok(soul);assert.equal(g.enqueueQuestCase(q.caseId),false);
  if(q.id==='sqBoon')assert.equal(soul.remorseBonus||0,choice===0?15:0);
  g=reload(g);assert.ok(g.queue.some(s=>s.case===q.caseId));verdict(g,q);meet(g,q);
  assert.equal(advanceQuest(g,q.id,choice),true);meet(g,q);assert.equal(advanceQuest(g,q.id),true);
  assert.equal(questState(g,q.id).done,true);const coin=g.coin,inv=structuredClone(g.inventory),exp=g.exp;
  assert.equal(advanceQuest(g,q.id,choice),false);g=reload(g);meet(g,q);assert.equal(advanceQuest(g,q.id,choice),false);assert.equal(g.coin,coin);assert.deepEqual(g.inventory,inv);assert.equal(g.exp,exp);
 }
});
test('Dam wrong verdict closes only the failure route with 30 coin and no item reward',()=>{
 const g=createGame();unlock(g);const q=SIDE_QUESTS.find(q=>q.id==='sqDam');meet(g,q);advanceQuest(g,q.id);meet(g,q);advanceQuest(g,q.id);verdict(g,q,false);meet(g,q);
 const before=g.coin,inv=structuredClone(g.inventory);assert.equal(advanceQuest(g,q.id),true);assert.equal(g.coin,before+30);assert.deepEqual(g.inventory,inv);assert.equal(questState(g,q.id).done,true);
});
test('quests pause during finale; completed state resumes walking, boat travel and quests without replaying finale',()=>{
 let g=createGame();unlock(g);g.zoneEvents.cyberhell.signalClose='cleared';g.finalEventState().phase='ready';g.zoneEvents.cyberhell.cyberFinal='pending';assert.equal(questsPaused(g),true);
 const q=SIDE_QUESTS[0];meet(g,q);assert.equal(advanceQuest(g,q.id),false);
 g.gameCompleted=true;g.finalEvent.phase='completed';g.zoneEvents.cyberhell.cyberFinal='cleared';g.over={k:'finalWin'};
 assert.equal(g.continueAfterEnding(),true);assert.equal(questsPaused(g),false);assert.equal(advanceQuest(g,q.id),true);
 assert.equal(g.startFinalEncounter(),null);g=reload(g);assert.equal(g.over,null);g.paused=false;g.storyQueue=[];
 assert.equal(harbourTravel(g,'th'),true);g.pendingZone=null;assert.equal(harbourTravel(g,'cyberhell'),true);g.pendingZone=null;assert.equal(g.startFinalEncounter(),null);
});
test('legacy empty, pending finale, interrupted SIG and completed saves migrate without duplicate rewards',()=>{
 const old=createGame().snapshot();delete old.e1Version;delete old.sideQuests;delete old.merchantJourney;
 let g=createGame();assert.equal(g.restore(old),true);assert.deepEqual(g.sideQuests,{});
 old.zone='cyberhell';old.zoneCases={cyberhell:10};old.zoneEvents={cyberhell:{cyberRescue:'cleared',cyberBreach:'cleared',cyberFinal:'pending'}};
 g=createGame();g.restore(structuredClone(old));assert.equal(g.zoneEventStatus('cyberFinal'),'locked');assert.equal(g.startFinalEncounter(),null);
 old.gameCompleted=true;old.zoneEvents.cyberhell.cyberFinal='cleared';g=createGame();g.restore(old);assert.equal(g.gameCompleted,true);assert.equal(g.zoneEventStatus('signalClose'),'cleared');assert.equal(g.finalEvent.phase,'completed');assert.equal(g.inventory.spareHeart,undefined);
});
test('private information costs six additional karma only once with mirror/hypno, ordinary questioning is free',()=>{
 for(const power of ['mirror','hypno']){
  const g=createGame();unlock(g);zone(g,'asia');g.level=10;g.zoneEvents.th={devaTest:'cleared'};g.abilities.hypno=true;g.inventory.mirror=3;g.mp=100;
  assert.equal(g.enqueueQuestCase('silentman'),true);const s=g.queue.find(s=>s.case==='silentman'),p=g.powerOf(power);p.readyAt=0;p.cd=0;p.ammo=3;
  const before=g.karma;assert.ok(g.usePower(power,s));assert.equal(s.privateOpened,true);assert.equal(g.karma,before+p.karma+6);
  p.readyAt=0;p.cd=0;g.usePower(power,s);assert.equal(g.karma,before+2*p.karma+6);
 }
 const g=createGame();zone(g,'asia');g.enqueueQuestCase('silentman');const s=g.queue.find(s=>s.case==='silentman');g.press(s,0);g.press(s,1);assert.equal(g.karma,0);
});
test('W3: all eight kin journeys advance through actual zones, choices and one reward after reload',()=>{
 for(const q of KIN_QUESTS){let g=createGame();unlock(g);for(const z of Object.keys(g.zoneTravel.visited))g.zoneTravel.ports[z]=true;
  for(let step=0;step<3;step++){meet(g,q);assert.equal(advanceQuest(g,q.id,0),true);g=reload(g);}
  assert.equal(questState(g,q.id).done,true);meet(g,q);const coin=g.coin;assert.equal(advanceQuest(g,q.id,0),false);assert.equal(g.coin,coin);
 }
});
test('merchant arrives exactly 90 seconds after Asia arrival, pauses/out-of-zone preserve timer; hostages stay in west/cyber',()=>{
 let g=createGame();zone(g,'asia');assert.equal(merchantAvailable(g),false);advanceMerchant(g,45000);g=reload(g);zone(g,'th');advanceMerchant(g,99999);assert.equal(g.merchantJourney.asia.elapsed,45000);
 zone(g,'asia');g.paused=true;advanceMerchant(g,99999);assert.equal(g.merchantJourney.asia.elapsed,45000);g.paused=false;g.storyQueue=[];
 advanceMerchant(g,44999);assert.equal(merchantAvailable(g),false);advanceMerchant(g,1);assert.equal(merchantAvailable(g),true);assert.ok(g.storyQueue.some(s=>s.key==='mrun-asia'));g.completeStory();advanceMerchant(g,99999);assert.ok(!g.storyQueue.some(s=>s.key==='mrun-asia'));
 for(const [z,key]of [['west','westHypnotized'],['cyberhell','cyberRescue']]){zone(g,z);g.storyQueue=[];assert.equal(merchantAvailable(g),false);advanceMerchant(g,999999);assert.equal(g.merchantJourney[z]?.arrived||false,false);g.zoneEvents[z][key]='cleared';g.storyQueue=[];advanceMerchant(g,6000);assert.equal(g.merchantJourney[z].arrived,true);}
});
test('cross-zone dialogue needs both meetings and plays each direction once, including saved state',()=>{
 let g=createGame();assert.equal(crossZoneTalk(g,'taan'),null);zone(g,'cyberhell');assert.match(crossZoneTalk(g,'taan'),/พ่อผม/);assert.equal(crossZoneTalk(g,'taan'),null);g=reload(g);zone(g,'th');assert.match(crossZoneTalk(g,'taan'),/เลิกนอนดึก/);assert.equal(crossZoneTalk(g,'taan'),null);
 assert.equal(CROSS_ZONE_LINES.length,34);
});
test('authored assets exist, history opens with full S0 and Grace is female; history is reachable from both manuals',()=>{
 for(const [z,k]of Object.entries(SIGNAL_KEYS))for(const item of Object.keys(ZONE_EVENTS[z].find(e=>e.k===k).reward.items))assert.ok(ITEMS[item],item);
 assert.equal(Object.keys(SIGNAL_STORIES).length,9);for(const story of Object.values(SIGNAL_STORIES))for(const p of story.pages)assert.ok(existsSync(p.image),p.image);
 assert.equal(CHARACTER_HISTORY.length,44);assert.match(CHARACTER_HISTORY[0].text,/ไม่ใช่คำสอนทางพุทธศาสนา/);assert.match(CROSS_ZONE_LINES.find(p=>p.id==='xz-boon-as-we-f').line,/ดิฉัน|ค่ะ/);
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');assert.ok(ui.includes('${historyHtml()}'));assert.ok(ui.includes("guide.insertAdjacentHTML('beforeend',historyHtml())"));
 const soul={deeds:[],merits:[],traitKey:'accepting',deserved:2},args={soul,keeperK:'boon',intensity:2,verdict:{tham:100}};assert.equal(calcRemorse({...args,soul:{...soul,remorseBonus:15}}).total,Math.min(100,calcRemorse(args).total+15));
});

test('stale pending final gates cannot bypass SIG through the map, either entry API, or save reload',()=>{
  let g=createGame();unlock(g);g.zoneCases.cyberhell=10;
  g.zoneEvents.cyberhell.cyberFinal='pending';
  assert.equal(g.finalEventState().phase,'locked');
  assert.equal(g.finalEventOnMap(),false);
  assert.equal(g.startZoneEvent('cyberFinal'),null);
  assert.equal(g.startFinalEncounter(),null);
  g.refreshZoneEvents();assert.equal(g.zoneEventStatus('cyberFinal'),'locked');
  for(const version of [undefined,1]){
    const save=g.snapshot();save.e1Version=version;
    save.zoneEvents.cyberhell.cyberFinal='pending';
    save.finalEvent.phase='ready';save.finalEvent.presentation='approach';
    save.storyQueue=[{key:'cyber-approach',stage:'comic'}];
    const h=createGame();assert.equal(h.restore(save),true);
    assert.equal(h.finalEventState().phase,'locked');
    assert.equal(h.zoneEventStatus('cyberFinal'),'locked');
    assert.ok(!h.storyQueue.some(s=>s.key==='cyber-approach'));
    assert.equal(h.startFinalEncounter(),null);
  }
});
test('each cross-zone prerequisite is enforced, including stale pending SIG and close acknowledgement',()=>{
  for(const z of ['th','asia','west']){
    const g=createGame();zone(g,z);g.zoneCases[z]=500;g.refreshZoneEvents();
    assert.equal(g.zoneEventStatus(SIGNAL_KEYS[z]),'locked');
    g.zoneEvents[z][SIGNAL_KEYS[z]]='pending';g.storySeen[signalStory(SIGNAL_KEYS[z],'open')]=true;
    assert.equal(g.startZoneEvent(SIGNAL_KEYS[z],'rush'),null);
    (g.zoneEvents.cyberhell ||= {}).cyberSignal='cleared';assert.ok(g.startZoneEvent(SIGNAL_KEYS[z],'rush'));
  }
  for(const missing of ['th','asia','west']){
    const g=createGame();unlock(g);g.zoneCases.cyberhell=10;g.zoneEvents.cyberhell.cyberSignal='cleared';
    for(const z of ['th','asia','west'])(g.zoneEvents[z] ||= {})[SIGNAL_KEYS[z]]=z===missing?'pending':'cleared';
    g.refreshZoneEvents();assert.equal(g.zoneEventStatus('signalClose'),'locked');
    g.zoneEvents.cyberhell.signalClose='pending';g.queueStory('cyber-signal-close');g.completeStory();
    assert.notEqual(g.zoneEventStatus('signalClose'),'cleared');assert.equal(g.inventory.spareHeart,undefined);
    assert.equal(g.startZoneEvent('cyberFinal'),null);
  }
});
test('legacy finals already fought retain progress and ledger without paying SIG rewards',()=>{
  for(const legacyBattle of [false,true]){
    let g=createGame();unlock(g);g.zoneCases.cyberhell=10;g.zoneEvents.cyberhell.signalClose='cleared';g.refreshZoneEvents();
    assert.ok(g.startFinalEncounter());
    if(!legacyBattle){win(g);assert.equal(g.finalEvent.minionsCleared,1);}
    const save=g.snapshot();delete save.e1Version;
    for(const [z,k]of Object.entries(SIGNAL_KEYS))delete (save.zoneEvents[z] ||= {})[k];
    delete save.zoneEvents.cyberhell.signalClose;
    if(legacyBattle){save.battle=save.finalBattle;delete save.finalBattle;delete save.finalEvent;}
    save.inventory.cooldownClock=1; // Existing rescue entitlement is normalized on restore.
    const inv=structuredClone(save.inventory),coin=save.coin;
    const h=createGame();assert.equal(h.restore(save),true);
    assert.equal(h.zoneEventStatus('signalClose'),'cleared');assert.notEqual(h.finalEvent.phase,'locked');
    assert.equal(h.coin,coin);assert.deepEqual(h.inventory,inv);
    if(!legacyBattle){assert.equal(h.finalEvent.minionsCleared,1);assert.deepEqual(h.finalEvent.rewardLedger,save.finalEvent.rewardLedger);}
    const again=reload(h);assert.deepEqual(again.inventory,inv);assert.equal(again.coin,coin);
  }
});
test('W2 exact branch rewards, including optional helper EXP replaced by two food only when awarded',()=>{
  const expected={
    sqNira:[[90,10,{ }],[60,0,{lotus:2}]],
    sqTaan:[[100,8,{food:2}],[60,0,{food:2,lotus:1}]],
    sqPlerng:[[100,8,{food:2}],[60,0,{food:2,holyWater:1}]],
    sqKan:[[100,8,{food:2}],[60,0,{food:2,lotus:1}]],
    sqBoon:[[100,8,{food:2}],[60,0,{food:2,lotus:1}]],
    sqDam:[[60,0,{food:4}],[80,0,{}]],
    sqMerchant:[[60,0,{lotus:1}],[-60,0,{lotus:2}]],
    sqGuard:[[60,0,{food:2,lotus:1}],[80,0,{}]],
  };
  for(const q of SIDE_QUESTS)for(const choice of [0,1]){
    const g=createGame();unlock(g);meet(g,q);advanceQuest(g,q.id);meet(g,q);
    assert.ok(advanceQuest(g,q.id,q.id==='sqBoon'?choice:null));verdict(g,q);meet(g,q);
    g.coin=1000;g.order=20;g.inventory={};g.exp=0;g.level=1;
    assert.ok(advanceQuest(g,q.id,choice));meet(g,q);assert.ok(advanceQuest(g,q.id));
    const [coin,order,items]=expected[q.id][choice];
    assert.equal(g.coin,1000+coin,`${q.id}/${choice} coin`);
    assert.equal(g.order,20+order,`${q.id}/${choice} order`);
    assert.equal(g.exp,30,`${q.id}/${choice} exp`);assert.deepEqual(g.inventory,items,`${q.id}/${choice} items`);
  }
});
test('W3 kin choices pay exact rewards through real harbour travel, persist, and stay open during finale',()=>{
  for(const q of KIN_QUESTS)for(const choice of [0,1]){
    let g=createGame();unlock(g);g.zoneEvents.cyberhell.signalClose='cleared';g.zoneEvents.cyberhell.cyberFinal='pending';g.finalEventState().phase='ready';
    for(let step=0;step<3;step++){
      const p=questTarget(g,q);
      if(g.zone!==p.zone){assert.equal(harbourTravel(g,p.zone),true);g.pendingZone=null;}
      Object.assign(g.player,questTarget(g,q));
      if(step===2){g.coin=1000;g.order=20;g.inventory={};g.exp=0;g.level=1;}
      assert.ok(advanceQuest(g,q.id,choice),q.id);g=reload(g);
    }
    const plain=q.id==='kinDamCousin',coin=plain?70:choice===0?100:60;
    const items=plain?{food:3,tea:1}:choice===0?{food:2}:{food:2,[q.item]:q.item==='food'?4:1};
    assert.equal(g.coin,1000+coin,q.id);assert.equal(g.order,20+(!plain&&choice===0?8:0),q.id);
    assert.equal(g.exp,30,q.id);assert.deepEqual(g.inventory,{...items,cooldownClock:1},q.id); // Rescue already awards the reusable clock on restore.
    const before=g.snapshot();assert.equal(advanceQuest(g,q.id,choice),false);assert.equal(g.coin,before.coin);
  }
});
test('W3 all 34 cross-zone lines need their meetings and play only once across reload',()=>{
  const zones={th:'th',as:'asia',we:'west',cy:'cyberhell'};
  for(const c of CROSS_ZONE_LINES){
    let g=createGame();const [,npc,a,b,direction]=c.id.split('-');
    const zoneName=npc==='mer'?'th':zones[direction==='f'?b:a];zone(g,zoneName);
    assert.equal(crossZoneTalk(g,npc==='mer'?'merchant':npc),null,c.id);
    if(npc==='mer'){
      g.talk.seen[`met:${a}@th`]=true;g.talk.seen[`met:${a}@${a==='boon'?'asia':'cyberhell'}`]=true;
    }else g.talk.seen[`met:${npc}@${zones[direction==='f'?a:b]}`]=true;
    if(c.id==='xz-guard-as-we-f'){
      assert.equal(crossZoneTalk(g,npc),null);g.zoneEvents.west.westVampireBreach='cleared';
    }
    // Suppress other eligible lines to isolate each table row.
    for(const other of CROSS_ZONE_LINES)if(other.id!==c.id)g.talk.seen[`xz:${other.id}`]=true;
    assert.equal(crossZoneTalk(g,npc==='mer'?'merchant':npc),c.line,c.id);
    g=reload(g);assert.equal(crossZoneTalk(g,npc==='mer'?'merchant':npc),null,c.id);
  }
});
test('W3 merchant has actual story dialogue and a walkable route; legacy arrivals stay silent',async()=>{
  const {storyOf}=await import('../src/story.js');const {canWalk}=await import('../src/walk.js?v=k1d');
  for(const [z,key]of [['asia','mrun-asia'],['west','mrun-west'],['cyberhell','mrun-cyber']]){
    const story=storyOf(key);assert.ok(story.pages[0].line.length>150);assert.match(story.pages[0].line,/นิรา:/);
    const g=createGame();zone(g,z);g.merchantJourney[z]={running:true,runMs:0,arrived:false};
    for(let ms=0;ms<=6000;ms+=100){g.merchantJourney[z].runMs=ms;const p=merchantRun(g);assert.ok(canWalk(p.x,p.y),`${z} ${ms}: ${JSON.stringify(p)}`);}
  }
  let g=createGame();unlock(g);g.zoneEvents.west={westHypnotized:'cleared'};const save=g.snapshot();delete save.e1Version;delete save.merchantJourney;
  g=createGame();g.restore(save);
  for(const z of ['asia','west','cyberhell']){zone(g,z);g.storyQueue=[];advanceMerchant(g,999999);assert.equal(g.merchantJourney[z].arrived,true);assert.equal(g.storyQueue.length,0);}
});
test('SIG battle and frontier consume the supplied signal boss art, CyberHell keeps mint overlay',async()=>{
  const {artUrl}=await import('../src/art.js');
  for(const z of ['th','asia','west']){
    const ev=ZONE_EVENTS[z].find(e=>e.k===SIGNAL_KEYS[z]),boss=ev.waves.flat().find(f=>f.boss);
    assert.equal(artUrl(boss.sp),`img/story-sig/boss-frontier-${z}-signal-v1.webp`);assert.ok(existsSync(artUrl(boss.sp)));
    assert.equal(breachApproachActors(z,ev.k)[0].art,boss.sp);
  }
  const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');assert.ok(ui.includes("hp?.foes?.[0]?.hypno ? ' signal-controlled'"));
});
test('ordinary questioning that already opened private facts adds no later privacy surcharge',()=>{
  const g=createGame();zone(g,'asia');g.level=10;g.abilities.hypno=true;g.mp=100;
  assert.ok(g.enqueueQuestCase('silentman'));const soul=g.queue.find(s=>s.case==='silentman');
  for(const d of soul.deeds){d.known=true;d.visible=true;}
  const before=g.karma;assert.ok(g.usePower('hypno',soul));assert.equal(g.karma,before+g.powerOf('hypno').karma);assert.ok(!soul.privateOpened);
});

test('Asia shop opens at 90 seconds from actual arrival without requiring a first case',async()=>{
  const {clearedDungeonTravel}=await import('./helpers/travel.mjs');
  const g=createGame();g.bossCleared.th=true;assert.equal(clearedDungeonTravel(g,'asia'),true);
  g.coin=1000;g.level=10;g.inventory.bladeShard=2;
  advanceMerchant(g,90000);assert.equal(g.merchantJourney.asia?.elapsed||0,0); // Arrival panel still open.
  g.pendingZone=null;g.paused=false;g.storyQueue=[];
  assert.equal(g.zoneCases.asia,0);assert.equal(g.buyMerchant('health'),false);assert.equal(g.sellMaterial('bladeShard'),false);
  advanceMerchant(g,89999);assert.equal(g.merchantAvailable(),false);
  advanceMerchant(g,1);assert.equal(g.merchantAvailable(),true);
  assert.equal(g.buyMerchant('health'),true);assert.equal(g.sellMaterial('bladeShard'),true);
  assert.ok(g.storyQueue.some(s=>s.key==='mrun-asia'));
});
test('completed finale can resume real world walking after restore without opening the finale again',async()=>{
  const {nearestWalk}=await import('../src/walk.js?v=k1d');
  let g=createGame();unlock(g);g.gameCompleted=true;g.finalEventState().phase='completed';g.zoneEvents.cyberhell.cyberFinal='cleared';
  g=reload(g);g.over={k:'finalWin'};assert.ok(g.continueAfterEnding());g.storyQueue=[];
  const start=nearestWalk(800,580),end=nearestWalk(1000,580);Object.assign(g.player,{x:start[0],y:start[1],path:null,tx:null,ty:null});
  assert.ok(g.walkTo(...end));g.stepWorld(100);assert.notDeepEqual([g.player.x,g.player.y],start);
  assert.equal(g.finalEventOnMap(),false);assert.equal(g.startZoneEvent('cyberFinal'),null);
});
test('quest conversation shows the selected branch only and mothers message at the selected time',()=>{
  const g=createGame();unlock(g);
  for(const q of KIN_QUESTS.filter(q=>q.choices.length)){
    g.sideQuests[q.id]={step:q.id==='kinGuard'?2:1,choice:null};
    assert.ok(!questDialogue(g,q).some(line=>line.includes('**[')));
    for(const choice of [0,1]){
      g.sideQuests[q.id]={step:3,choice,done:true};const text=questDialogue(g,q).join('\n');
      const opposite=q.dialogue.flat().find(line=>line.startsWith(`**[${q.choices[1-choice]}]`)).split('→')[1].trim();
      assert.ok(!text.includes(opposite),`${q.id}/${choice}`);assert.ok(text.length>10);
    }
  }
  const q=SIDE_QUESTS.find(q=>q.id==='sqBoon');
  for(const choice of [0,1]){
    g.sideQuests[q.id]={step:2,choice};assert.equal(questDialogue(g,q).join('\n').includes('แม่ฝากบอก'),choice===0);
    g.sideQuests[q.id].step=3;assert.equal(questDialogue(g,q).join('\n').includes('แม่ฝากบอก'),choice===1);
  }
});

test('legacy final court is proof of a fought finale even when older saves lack wave counters',async()=>{
  const {queueBossJustice,bossJusticeCase}=await import('../src/boss-justice.js');
  const g=createGame();unlock(g);g.finalEventState().phase='justice';
  assert.ok(queueBossJustice(g,{kind:'zoneEvent',zone:'cyberhell',eventKey:'cyberFinal',who:'อาร์คอน-ศูนย์',over:'win'},{final:true}));
  const save=JSON.parse(JSON.stringify(g.snapshot()));delete save.e1Version;
  delete save.finalEvent.minionsCleared;delete save.finalEvent.rulersCleared;delete save.zoneEvents.cyberhell.signalClose;
  const h=createGame();assert.ok(h.restore(save));assert.equal(h.finalEvent.phase,'justice');
  assert.equal(bossJusticeCase(h).phase,'capture');assert.equal(h.zoneEventStatus('signalClose'),'cleared');
  assert.equal(h.gameCompleted,false);assert.equal(h.coin,save.coin);assert.equal(h.inventory.spareHeart,undefined);
  assert.equal(h.startFinalEncounter(),null);assert.ok(!h.storyQueue.some(s=>s.key==='ending'));
});
