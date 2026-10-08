import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { finalGame, win, roundTrip } from './final-event-helpers.mjs';
import { finalEventActors, finalPreparationTargets, migrateFinalEvent } from '../src/final-event.js';
import { devaMapActors } from '../src/deva-map.js';
import { breachApproachActors } from '../src/breach-approach.js';
import { frontierIntroduction } from '../src/narrative-cutscenes.js';
import { STORY } from '../src/story.js';
import { ZONE_EVENTS, MERCHANT, STATIONS } from '../src/data.js';
import { setLang } from '../src/i18n.js';
import { mapInteractions } from '../src/proximity.js';
globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };
function story(g, key, images) {
  assert.equal(g.storyQueue[0]?.key,key);
  images.push(...STORY[key].pages.map(p=>p.image.split('/').at(-1)));
  g.completeStory();
}
function encounter(g, id) {
  assert.ok(g.startFinalEncounter(id), id); win(g); g.endBattle(); assert.ok(g.acknowledgeFinalReward());
}
test('E5 a→e: warp before approach/preparation, four waves, reinforcement map, control, four rulers, duel and ending exactly once',()=>{
  let g=finalGame();const images=[];
  assert.ok(g.beginFinalArrival());assert.equal(g.finalEvent.presentation,'warp');
  assert.ok(finalEventActors(g).some(a=>a.id==='boss'));assert.equal(g.startFinalEncounter(),null);
  g.advanceFinalArrival(600);g=roundTrip(g);assert.equal(g.finalEvent.warpElapsed,600);
  g.advanceFinalArrival(600);story(g,'cyber-approach',images);
  assert.equal(g.finalEvent.presentation,'prepare');assert.equal(g.startFinalEncounter(),null);
  g.dismissFinalPreparation();
  for(let i=1;i<=4;i++) encounter(g,`minion:${i}`);
  assert.equal(g.finalEvent.presentation,'reinforcementIntro');g=roundTrip(g);
  story(g,'cyber-reinforcements',images);
  assert.equal(g.finalEvent.presentation,'reinforcementMap');assert.equal(g.storyQueue.length,0);
  const reinforcements=finalEventActors(g).filter(a=>a.reinforcement);
  assert.equal(reinforcements.length,4);assert.equal(new Set(reinforcements.map(a=>a.art)).size,4);
  assert.equal(new Set(reinforcements.map(a=>a.sourceZone)).size,4);
  assert.ok(reinforcements.every(a=>a.x<g.player.x));assert.equal(g.startFinalEncounter(),null);
  g=roundTrip(g);assert.ok(g.continueFinalMapScene());assert.equal(g.continueFinalMapScene(),false);
  story(g,'cyber-reinforcements-advance',images);story(g,'cyber-control',images);
  assert.equal(finalEventActors(g).filter(a=>a.id.startsWith('ruler:')).length,4);
  assert.ok(finalEventActors(g).filter(a=>!a.reinforcement).every(a=>a.x>g.player.x));
  assert.equal(g.finalEvent.presentation,'prepare');g.dismissFinalPreparation();
  for(const z of ['th','asia','west','cyberhell']) encounter(g,`ruler:${z}`);
  g=roundTrip(g);story(g,'cyber-duel',images);assert.equal(g.finalEvent.presentation,'prepare');
  assert.deepEqual(finalEventActors(g).filter(a=>!a.reinforcement).map(a=>a.id),['boss']);
  g.dismissFinalPreparation();encounter(g,'boss');story(g,'ending',images);
  assert.deepEqual(images,['story-cyberhell-01-v2.png','story-cyberhell-reinforcements-01.png',
    'story-cyberhell-reinforcements-02.png','story-cyberhell-02-v3.png','story-cyberhell-03-v4.png',
    'story-ending-01-v4.png','story-ending-02-v3.png','story-ending-03-v1.png']);
  assert.equal(new Set(images).size,images.length);assert.equal(g.gameCompleted,true);
});
test('E5 rescue: deva at throne, saved three-line bilingual intro, unchanged foes/reward, loss retry and captives released on win',()=>{
  let g=createGame();g.zone='cyberhell';g.refreshZoneEvents();
  assert.equal(g.zoneCaptivesFree(),false);assert.equal(g.devaVisits.cyberhell.phase,'intro');
  const a=devaMapActors(g)[0];assert.deepEqual([a.x,a.y,a.art],[880,480,'boss-tester']);
  assert.equal(a.enabled,false);g=roundTrip(g);
  for(const lang of ['th','en']) {setLang(lang);assert.equal(STORY['deva-cyberhell'].pages[0].line.split('\n').length,3);}
  setLang('th');Object.assign(g.player,{x:880,y:455});story(g,'deva-cyberhell',[]);assert.equal(devaMapActors(g)[0].enabled,true);
  // Arrival ends on the throne spot: Yama must not stand on top of Lumen (Dale fix).
  assert.ok(Math.hypot(g.player.x-880,g.player.y-480)>=90);
  assert.ok(mapInteractions(g,MERCHANT).some(a=>a.key==='cyberRescue'));
  const ev=ZONE_EVENTS.cyberhell[0];assert.equal(ev.foes[0].count,2);assert.equal(ev.foes[0].hp,105);
  g.startZoneEvent('cyberRescue');assert.equal(g.devaVisits.cyberhell.phase,'fighting');
  g=roundTrip(g);assert.equal(devaMapActors(g)[0].enabled,true);
  g.startZoneEvent('cyberRescue');g.battle.team=[];g.battle.youHp=1;g.battleAct('atk');
  assert.equal(g.battle.over,'lose');g.endBattle();assert.equal(g.zoneCaptivesFree(),false);
  assert.equal(devaMapActors(g)[0].enabled,true);g.pendingRecovery=null;g.hp=100;
  g.startZoneEvent('cyberRescue');win(g);g.endBattle();assert.equal(g.zoneCaptivesFree(),true);
  assert.equal(g.inventory.cooldownClock,1);assert.equal(devaMapActors(g).length,0);
  assert.equal(g.startZoneEvent('cyberRescue'),null);
});
test('E5 cyber breach uses walk-to-boss before existing intro; four waves and spare heart unchanged',()=>{
  const ev=ZONE_EVENTS.cyberhell[1];assert.equal(ev.atCases,5);assert.equal(ev.waves.length,4);
  assert.equal(ev.waves[3][0].name,'โทรจัน-9');assert.equal(ev.reward.item,'spareHeart');
  assert.equal(breachApproachActors('cyberhell','cyberBreach')[0].art,'boss-frontier');
  assert.equal(frontierIntroduction('cyberhell','en').image,'img/frontier-cyberhell-intro-v1.png');
  const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
  assert.ok(ui.includes("'westVampireBreach','cyberBreach'].includes(breachKey) && !approachReached"));
});
test('E5 three preparation destinations produce reachable paths to merchant, Nira and existing tea pavilion/fallback',()=>{
  const g=finalGame();g.stepWorld(16);
  for(const built of [false,true]) {
    if(built) g.stations.push({def:STATIONS.find(s=>s.k==='tea'),slots:[],build:false});
    const targets=finalPreparationTargets(g);
    assert.deepEqual(targets.merchant,{x:MERCHANT.x,y:MERCHANT.y});
    assert.deepEqual(targets.nira,{x:g.crewOf('nira').x,y:g.crewOf('nira').y});
    if(built) assert.deepEqual(targets.tea,{x:STATIONS.find(s=>s.k==='tea').x,y:STATIONS.find(s=>s.k==='tea').y});
    for(const [key,p] of Object.entries(targets)) {
      Object.assign(g.player,{x:880,y:550});assert.equal(g.walkTo(p.x,p.y),true,key);
      for(let n=0;g.player.path?.length&&n<500;n++)g.stepWorld(100);
      assert.ok(Math.hypot(g.player.x-p.x,g.player.y-p.y)<100,key);
    }
  }
});
test('E5 every legacy final phase normalizes to a resumable map, reward, story or ending without changing ledger',()=>{
  for(const phase of ['locked','ready','minions','reward','reinforcementCutscene','staging','rulerBattle','bossReady','finalBoss','ending','completed']) {
    const g=finalGame(),save=g.snapshot();
    const late=['reinforcementCutscene','staging','rulerBattle','bossReady','finalBoss','ending','completed'].includes(phase);
    const last=['bossReady','finalBoss','ending','completed'].includes(phase);
    save.finalEvent={version:1,migrationVersion:1,phase,minionsCleared:late?4:0,
      rulersCleared:last?['th','asia','west','cyberhell']:[],reinforcementsSeen:late&&phase!=='reinforcementCutscene',
      activeEncounter:['minions','rulerBattle','finalBoss'].includes(phase)?'boss':null,pendingReward:null,
      rewardLedger:{'minion:1':{coin:40}}};delete save.finalBattle;
    assert.ok(g.restore(save),phase);const s=g.finalEventState();
    assert.deepEqual(s.rewardLedger,{'minion:1':{coin:40}},phase);
    assert.ok(!['minions','rulerBattle','finalBoss','reward','ending'].includes(s.phase),phase);
    assert.deepEqual(migrateFinalEvent(g.snapshot()),s,phase);
    assert.equal(roundTrip(g).finalEvent.phase,s.phase,phase);
    if(!['completed'].includes(s.phase)) {
      g.beginFinalArrival();
      for(let n=0;n<8;n++) {
        if(s.presentation==='warp')g.advanceFinalArrival(1200);
        if(g.storyQueue.length)g.completeStory();
        if(s.presentation==='reinforcementMap')g.continueFinalMapScene();
        if(s.presentation==='prepare')g.dismissFinalPreparation();
      }
      assert.ok(g.startFinalEncounter(),phase);
    }
  }
});
test('E5 interrupted presentation reloads each cutscene and map/preparation without repeating rewards',()=>{
  for(const presentation of ['warp','approach','reinforcementIntro','reinforcementMap','reinforcementAdvance','control','duel','prepare']) {
    const g=finalGame(),save=g.snapshot();Object.assign(save.finalEvent,{choreography:true,presentation});
    save.storyQueue=[];save.storySeen={};assert.ok(g.restore(save));
    const keys={approach:'cyber-approach',reinforcementIntro:'cyber-reinforcements',reinforcementAdvance:'cyber-reinforcements-advance',control:'cyber-control',duel:'cyber-duel'};
    if(keys[presentation])assert.equal(g.storyQueue[0].key,keys[presentation]);
    else assert.equal(g.finalEvent.presentation,presentation);
    assert.deepEqual(g.finalEvent.rewardLedger,{});
  }
});
test('E5 runtime intro is preloaded only in CyberHell, cache bumped, canvas lightning stops with release',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
  const path='img/deva-intro/deva-intro-cyberhell-v1.png';assert.ok(existsSync(path));assert.ok(catalog.zones.cyberhell.includes(path));
  assert.ok(!catalog.shared.includes(path));for(const z of ['th','asia','west'])assert.ok(!catalog.zones[z].includes(path));
  assert.ok(readFileSync(new URL('../src/preload.js',import.meta.url),'utf8').includes('20261008-zone3-hypnosis-ui'));
  const scene=readFileSync(new URL('../src/scene.js',import.meta.url),'utf8');
  assert.ok(scene.includes('if (!g.zoneCaptivesFree())'));assert.ok(scene.includes('drawCaptiveLightning(ctx, t)'));
});
test('E5 old nonempty rewards acknowledge once; serialized battles resume; seen reinforcement saves cannot lock the gate',()=>{
  for(const phase of ['reward','ending','completed']) {
    const g=finalGame(),save=g.snapshot();
    Object.assign(save.finalEvent,{migrationVersion:1,phase,minionsCleared:4,
      rulersCleared:phase==='reward'?[]:['th','asia','west','cyberhell'],reinforcementsSeen:true,
      pendingReward:{encounter:phase==='reward'?'ruler:th':'boss',coin:10,items:[],abilities:[]},
      rewardLedger:{receipt:{coin:10}}});
    const coin=save.coin;assert.ok(g.restore(save));assert.ok(g.pendingReward);
    assert.equal(g.startFinalEncounter(),null);assert.equal(g.acknowledgeFinalReward(),true);
    assert.equal(g.acknowledgeFinalReward(),false);assert.equal(g.coin,coin);
    assert.deepEqual(g.finalEvent.rewardLedger,{receipt:{coin:10}});
    if(phase!=='reward')assert.equal(g.storyQueue[0].key,'ending');
  }
  for(const id of ['minion:1','ruler:asia','boss']) {
    const g=finalGame();Object.assign(g.finalEventState(),{minionsCleared:id==='minion:1'?0:4,
      reinforcementsSeen:id!=='minion:1',rulersCleared:id==='boss'?['th','asia','west','cyberhell']:id.startsWith('ruler:')?['th']:[],
      phase:id==='boss'?'bossReady':id.startsWith('ruler:')?'staging':'ready'});
    g.startFinalEncounter(id);g.battle.youHp=27;g.battle.turn=6;
    const save=g.snapshot();save.finalEvent.migrationVersion=1;
    const h=createGame();assert.ok(h.restore(save));assert.equal(h.battle.encounter,id);
    assert.equal(h.battle.youHp,27);assert.equal(h.battle.turn,6);win(h);h.endBattle();
    assert.ok(h.acknowledgeFinalReward());
  }
  const g=finalGame(),save=g.snapshot();Object.assign(save.finalEvent,{phase:'reinforcementCutscene',minionsCleared:4,migrationVersion:1});
  save.storySeen={'cyber-reinforcements':true};assert.ok(g.restore(save));
  assert.equal(g.storyQueue[0].key,'cyber-reinforcements');g.completeStory();assert.equal(g.finalEvent.phase,'staging');
});
test('E5 restore outside Zone 4 must queue Lumen intro on later arrival, and preserve cleared rescue on return',()=>{
  let g=createGame();g=roundTrip(g);g.bossCleared.west=true;
  assert.equal(g.moveZone('cyberhell'),true);
  assert.equal(g.storyQueue[0].key,'deva-cyberhell');g.completeStory();
  g.startZoneEvent('cyberRescue');win(g);g.endBattle();
  g.moveZone('th');g=roundTrip(g);g.moveZone('cyberhell');
  assert.equal(g.zoneEventStatus('cyberRescue'),'cleared');
  assert.equal(g.storyQueue.some(p=>p.key==='deva-cyberhell'),false);
});
