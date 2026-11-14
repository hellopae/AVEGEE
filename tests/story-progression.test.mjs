import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {STORY_PROGRESS,storyEncounterRole,grantStoryBattleAbilities,storyPowerHint} from '../src/story-progression.js';
import {ZONE_EVENTS} from '../src/data.js';
import {recordBossGuideWin,bossGuideState} from '../src/boss-guides.js';
import {queueBossJustice,bossJusticeCase} from '../src/boss-justice.js';
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
const reload=g=>{const next=game();next.restore(JSON.parse(JSON.stringify(g.snapshot())));return next;};
const kill=g=>{const b=g.battle;while(!b.over){for(const f of b.foes)f.atk=[0,0];const f=b.foes.find(f=>f.hp>0);if(!f){if(b.kind==='frontierBreach')g.advanceFrontierBreachWave();else g.advanceZoneEventWave();continue;}f.hp=1;b.selectedFoeId=f.id;g.battleAct('atk');if(b.pendingWave){if(b.kind==='frontierBreach')g.advanceFrontierBreachWave();else g.advanceZoneEventWave(true);}}return b;};
test('story sources resolve ruler, frontier and tester independently in every zone',()=>{
 for(const [zone,row]of Object.entries(STORY_PROGRESS)){
  for(const role of ['frontier','tester','ruler','final'])if(row[role]){
   const b={kind:'zoneEvent',zone,eventKey:row[role],over:'win'};
   assert.equal(storyEncounterRole(b),role);
   assert.equal(storyEncounterRole({...b,challenge:true}),'challenge');
   const g=game(),power=row[role+'Power'];
   assert.deepEqual(grantStoryBattleAbilities(g,{...b,over:'lose'}),[]);
   assert.deepEqual(grantStoryBattleAbilities(g,{...b,challenge:true}),[]);
   if(power){assert.deepEqual(grantStoryBattleAbilities(g,b),[power]);assert.equal(g.abilities[power],true);assert.deepEqual(grantStoryBattleAbilities(g,b),[]);}
  }
  if(row.rulerPower){const g=game();assert.deepEqual(grantStoryBattleAbilities(g,{kind:'zoneBoss',zone,over:'win'}),[row.rulerPower]);}
 }
 assert.equal(storyEncounterRole({kind:'mob',zone:'west',boss:true}),'ordinary');
 assert.equal(storyEncounterRole({kind:'zoneBoss',zone:'unknown'}),'ordinary');
 for(const [zone,row]of Object.entries(STORY_PROGRESS))for(const role of ['frontier','tester','ruler']){
  const ev=ZONE_EVENTS[zone].find(e=>e.k===row[role]);if(ev&&row[role+'Power'])assert.equal(ev.reward.ability,row[role+'Power']);
 }
});
test('level ups never unlock or announce Ice, but a real West ruler win unlocks it at any level',()=>{
 const g=game();g.gainExp(10000);assert.equal(g.powerLocked(g.powerOf('ice')),true);g.syncDiscoveries();assert.ok(!g.discoveryQueue.some(k=>k.endsWith(':ice')));
 g.mp=100;g.startBattle({id:1,who:'test',deserved:2});assert.equal(g.battleAct('ice'),false);
 const h=game();h.zone='west';h.zoneCases.west=15;h.legacyBossGate=true;h.zoneEventGateReady=()=>true;h.bossGuarding.west=true;h.player.x=0;h.player.y=0;
 // The alert path uses the same ordinary ruler battle, with story gates satisfied above.
 assert.ok(h.startZoneBoss('alert'));h.battle.youHp=h.battle.youMax=10000;kill(h);
 assert.equal(h.abilities.ice,true);assert.equal(h.powerLocked(h.powerOf('ice')),false);assert.equal(h.storyQueue.filter(p=>p.key==='west').length,1);
 const loaded=reload(h);assert.equal(loaded.powerLocked(loaded.powerOf('ice')),false);
 assert.equal(h.battleAct('atk'),false);assert.equal(h.storyQueue.filter(p=>p.key==='west').length,1);
});
test('legacy premature Ice flags and queued notices are removed without losing earned West powers',()=>{
 const g=game(),s=g.snapshot();s.level=5;s.abilities={ice:true,flameCharge:true};s.discoverySeen={'power:ice':true,'ability:ice':true,'power:roar':true};s.discoveryQueue=['ability:ice','power:ice','power:roar'];s.storyQueue=[{key:'level-ice',reward:'ice',stage:'reward'}];
 for(const west of [false,true]){
  s.bossCleared={west};const h=game();h.restore(structuredClone(s));
  assert.equal(h.powerLocked(h.powerOf('ice')),!west);assert.equal(h.abilities.flameCharge,true);
  if(!west){assert.ok(!h.discoveryQueue.some(k=>k.endsWith(':ice')));assert.equal(h.discoverySeen['power:ice'],undefined);assert.equal(h.storyQueue.some(p=>p.reward==='ice'),false);}
  assert.equal(reload(h).powerLocked(h.powerOf('ice')),!west);
 }
});
test('Thai frontier victory grants the team move, Asia frontier grants big fire, neither retires the ruler',()=>{
 for(const zone of ['th','asia']){
  const g=game();g.zone=zone;g.zoneEvents[zone]={[STORY_PROGRESS[zone].frontier]:'pending',devaTest:'cleared'};g.frontierOf().team=['taan'];
  if(zone==='asia')g.zoneEvents.asia.asiaDevaTest='cleared';
  const b=zone==='th'?g.startFrontierBreach():g.startZoneEvent('asiaRageBreach');assert.ok(b);b.youHp=b.youMax=10000;kill(g);
  assert.equal(g.abilities[STORY_PROGRESS[zone].frontierPower],true);assert.equal(!!g.abilities.bigFire,zone==='asia');
  assert.equal(g.bossCleared[zone],undefined);assert.equal(recordBossGuideWin(g,b),false);assert.equal(bossGuideState(g,zone).won,false);
  assert.equal(queueBossJustice(g,b),true);assert.equal(bossJusticeCase(g).encounterRole,'frontier');
  const loaded=reload(g);assert.equal(loaded.abilities[STORY_PROGRESS[zone].frontierPower],true);
 }
});
test('challenge captains cannot grant ruler praise or ruler abilities even when their sprite is a boss',()=>{
 const g=game(),b={kind:'zoneBoss',zone:'west',over:'win',challenge:true,foes:[{sp:'zone-boss-west',boss:true}]};
 assert.equal(recordBossGuideWin(g,b),false);assert.deepEqual(grantStoryBattleAbilities(g,b),[]);assert.equal(!!g.abilities.ice,false);
 assert.equal(storyPowerHint(g.powerOf('ice')),'ชนะบอสใหญ่โซน 3');assert.equal(storyPowerHint(g.powerOf('hypno')),'ชนะบอสชายแดนโซน 3');
});

test('public merit colors describe claimed merit without leaking whether the claim is true',async()=>{
 const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
 const src=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),start=src.indexOf('function publicMeritLine('),end=src.indexOf('\n}',start)+2;
 const line=runInNewContext(src.slice(start,end)+';publicMeritLine;',{esc:String});
 const merit={t:'แบ่งอาหารให้ผู้หิวโหย',v:5},real=line({...merit,fake:false}),fake=line({...merit,fake:true});
 assert.equal(real,fake);assert.match(real,/color:var\(--success\)/);assert.doesNotMatch(real,/red|destructive|#c0392b|sentenceColor/);
});

test('Thai ruler dockets use ruler identity; released legacy ruler dockets cannot be sentenced twice',()=>{
 const ruler={kind:'zoneEvent',zone:'th',eventKey:'thBorderBoss',over:'win',who:'ผู้ตรวจการ',foes:[{sp:'zone-boss',boss:true}]};
 const g=game();assert.equal(queueBossJustice(g,structuredClone(ruler)),false,'owner 14 Nov: the elder brother has no court');assert.equal(bossJusticeCase(g),null);
 const s=game().snapshot();s.bossJustice={version:1,active:null,ledger:{'th:frontier':{id:'th:frontier',zone:'th',phase:'released',art:'zone-boss',frontierBoss:false}}};
 const h=game();h.restore(s);assert.equal(h.bossJustice.ledger['th:frontier'].encounterRole,'ruler');assert.equal(queueBossJustice(h,structuredClone(ruler)),false);
 const actualFrontier=game();assert.equal(queueBossJustice(actualFrontier,{kind:'frontierBreach',zone:'th',over:'win',who:'บอสชายแดน',foes:[{sp:'boss-frontier-th',boss:true}]}),true);assert.equal(bossJusticeCase(actualFrontier).encounterRole,'frontier');
});
