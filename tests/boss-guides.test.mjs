import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {initializeBossGuides,bossGuideState,recordBossGuideWin,bossGuideWaiting,bossGuideFollowing,queueBossGuideStory,completeBossGuideStory,bossGuideStory,bossGuideFollowPoint,BOSS_GUIDE_GRANTS,pendingBossGuideGrant,acknowledgeBossGuideGrant} from '../src/boss-guides.js';
const fixture=()=>({zone:'th',bossCleared:{},zoneTravel:{visited:{th:true}},bossGuides:{version:1,zones:{}},storyQueue:[],queueStory(key){if(!this.storyQueue.includes(key))this.storyQueue.push(key);}});
test('first boss victory praises once, invitation follows, farewell dismisses once',()=>{
 const g=fixture(),battle={zone:'th',kind:'zoneEvent',eventKey:'thBorderBoss',over:'win'};
 assert.equal(recordBossGuideWin(g,battle),true);assert.equal(recordBossGuideWin(g,battle),false);assert.equal(g.storyQueue.length,1);
 assert.match(bossGuideStory(g.storyQueue[0]).pages[0].line,/มีฝีมือเก่งมาก เจ้าน่าจะดูแลโซนนี้ได้/);
 assert.equal(bossGuideWaiting(g),true);completeBossGuideStory(g,g.storyQueue[0]);
 assert.equal(queueBossGuideStory(g,'welcome'),true);completeBossGuideStory(g,'boss-guide-th-welcome');assert.equal(bossGuideFollowing(g),true);assert.equal(bossGuideWaiting(g),false);
 assert.equal(queueBossGuideStory(g,'farewell'),true);assert.match(bossGuideStory('boss-guide-th-farewell').pages[0].line,/พามาส่งถึงที่แล้ว ที่เหลือฝากดินแดนนี้ด้วย/);
 completeBossGuideStory(g,'boss-guide-th-farewell');assert.equal(bossGuideFollowing(g),false);assert.equal(completeBossGuideStory(g,'boss-guide-th-welcome'),false);assert.equal(bossGuideFollowing(g),false);assert.equal(queueBossGuideStory(g,'farewell'),false);assert.equal(queueBossGuideStory(g,'welcome'),false);
});
test('migration skips past praise and completed journeys without deleting unfinished invitations',()=>{
 const g={zone:'asia',bossCleared:{th:true,asia:true},zoneTravel:{visited:{th:true,asia:true}}};initializeBossGuides(g);
 assert.equal(bossGuideState(g,'th').farewell,true);assert.equal(bossGuideState(g,'asia').praised,true);assert.equal(bossGuideWaiting(g,'asia'),true);
 const saved=JSON.parse(JSON.stringify(g.bossGuides));saved.zones.asia.following=true;saved.zones.asia.welcomed=true;initializeBossGuides(g,saved);assert.equal(bossGuideFollowing(g,'asia'),true);
});
test('captured bosses cannot guide until their sentencing has finished',()=>{
 const g=fixture();recordBossGuideWin(g,{zone:'th',kind:'zoneBoss',over:'win'});
 g.bossJustice={ledger:{'th:frontier':{zone:'th',phase:'interrogation'}}};assert.equal(bossGuideWaiting(g),false);assert.equal(queueBossGuideStory(g,'welcome'),false);
 g.bossJustice.ledger['th:frontier'].phase='released';assert.equal(bossGuideWaiting(g),true);
});
test('follow positions stay on recorded bends instead of cutting across a ravine',()=>{
 const history=[[.1,.1],[.2,.1],[.2,.2]];assert.deepEqual(bossGuideFollowPoint(history,[.3,.2],.15),[.2,.15]);
});
test('guide state and acknowledged cutscenes survive real game snapshot/restore',()=>{
 globalThis.Image??=class{};const g=createGame();g.save=()=>{};g.onChange=()=>{};
 g.bossCleared.th=true;recordBossGuideWin(g,{zone:'th',kind:'zoneBoss',over:'win'});g.completeStory();
 assert.equal(g.inviteBossGuide(),true);g.completeStory();assert.equal(g.bossGuideFollowing(),true);
 const restored=createGame();restored.save=()=>{};assert.equal(restored.restore(g.snapshot()),true);assert.equal(restored.bossGuideFollowing(),true);
 assert.equal(recordBossGuideWin(restored,{zone:'th',kind:'zoneBoss',over:'win'}),false);
});

test('acknowledged guide stories repair a partial guide save instead of locking the gate',()=>{
 const g=fixture();g.bossCleared.th=true;g.storySeen={'boss-guide-th-praise':true,'boss-guide-th-welcome':true};
 initializeBossGuides(g,{version:1,zones:{th:{won:true}}});
 assert.equal(bossGuideFollowing(g),true);assert.equal(queueBossGuideStory(g,'welcome'),false);
 g.storySeen['boss-guide-th-farewell']=true;initializeBossGuides(g,{version:1,zones:{th:{won:true}}});
 assert.equal(bossGuideFollowing(g),false);assert.equal(bossGuideWaiting(g),false);assert.equal(bossGuideState(g).farewell,true);
});

for(const [zone,amount] of Object.entries(BOSS_GUIDE_GRANTS))test(`${zone} farewell grants ${amount} once on acknowledgment, with a persistent receipt`,()=>{
 const g=fixture();g.zone=zone;g.coin=100;g.logs=[];g.log=(text)=>g.logs.push(text);
 recordBossGuideWin(g,{zone,kind:'zoneBoss',over:'win'});
 completeBossGuideStory(g,`boss-guide-${zone}-welcome`);
 assert.equal(queueBossGuideStory(g,'farewell'),true);assert.equal(g.coin,100,'queueing a cutscene cannot pay');
 assert.equal(completeBossGuideStory(g,`boss-guide-${zone}-farewell`),true);
 assert.equal(g.coin,100+amount);assert.equal(g.logs.length,1);assert.match(g.logs[0],/มอบเงิน.*ดูแลดินแดนใหม่/);
 assert.equal(g.pendingReward.coin,amount);assert.equal(g.pendingReward.guideZone,zone);
 assert.equal(completeBossGuideStory(g,`boss-guide-${zone}-farewell`),false);assert.equal(g.coin,100+amount);
 const reloaded={zone,coin:g.coin,bossGuides:JSON.parse(JSON.stringify(g.bossGuides)),storySeen:{[`boss-guide-${zone}-farewell`]:true}};
 initializeBossGuides(reloaded);assert.equal(reloaded.coin,100+amount);assert.equal(reloaded.pendingReward.coin,amount,'reload restores the receipt without paying again');
 assert.equal(acknowledgeBossGuideGrant(reloaded,zone),true);assert.equal(acknowledgeBossGuideGrant(reloaded,zone),false);
 assert.equal(pendingBossGuideGrant(reloaded),null);assert.equal(reloaded.coin,100+amount);
});
test('legacy acknowledged farewells and repaired partial saves never retroactively grant money',()=>{
 for(const saved of [undefined,{version:1,zones:{th:{won:true,farewell:true}}},{version:1,zones:{th:{won:true}}}]){
  const g={zone:'asia',coin:321,bossCleared:{th:true},zoneTravel:{visited:{th:true,asia:true}},storySeen:{'boss-guide-th-farewell':true}};
  initializeBossGuides(g,saved);assert.equal(g.coin,321);assert.equal(bossGuideState(g,'th').grantPaid,true);
  assert.equal(pendingBossGuideGrant(g),null);assert.equal(completeBossGuideStory(g,'boss-guide-th-farewell'),false);assert.equal(g.coin,321);
 }
});
test('a real reload before farewell acknowledgment pays exactly once and saves the unpaid receipt',()=>{
 globalThis.Image??=class{};const g=createGame();g.save=()=>{};g.onChange=()=>{};g.bossCleared.th=true;
 recordBossGuideWin(g,{zone:'th',kind:'zoneBoss',over:'win'});g.completeStory();g.inviteBossGuide();g.completeStory();
 const before=g.coin;assert.equal(g.farewellBossGuide(),true);assert.equal(g.coin,before);
 const h=createGame();h.save=()=>{};h.onChange=()=>{};assert.equal(h.restore(g.snapshot()),true);assert.equal(h.coin,before);
 h.completeStory();assert.equal(h.coin,before+BOSS_GUIDE_GRANTS.th);assert.equal(h.pendingReward.guideZone,'th');
 const final=createGame();final.save=()=>{};final.onChange=()=>{};assert.equal(final.restore(h.snapshot()),true);
 assert.equal(final.coin,before+BOSS_GUIDE_GRANTS.th);assert.equal(final.pendingReward.guideZone,'th');
 assert.equal(final.farewellBossGuide(),false);assert.equal(final.coin,before+BOSS_GUIDE_GRANTS.th);
});

for(const [zone,to] of [['asia','west'],['west','cyberhell']])test(`a restored active ${zone} route can meet its waiting guide and finish the journey`,async()=>{
 const {DUNGEON_ROUTES}=await import('../src/zone-travel.js');
 const {dungeonPoint,dungeonGuideAnchor,dungeonCanTalkGuide}=await import('../src/dungeon-view.js');
 const g=createGame();g.save=()=>{};g.onChange=()=>{};g.zone=zone;g.bossCleared[zone]=true;
 const route=DUNGEON_ROUTES.find(r=>r.from===zone),exit=dungeonPoint(1,route.id);
 g.zoneTravel={version:1,visited:{th:true,[zone]:true},ports:{},active:{route:route.id,checkpoint:3,cleared:route.checkpoints.map(c=>c.id),defeated:route.checkpoints.map(c=>c.id),attempt:3,pending:null,position:{x:exit[0],y:exit[1]}}};
 const saved=g.snapshot();delete saved.bossGuides; // A real pre-guide save already inside a completed route.
 const restored=createGame();restored.save=()=>{};restored.onChange=()=>{};
 // The live UI pre-populates empty guide entries before an old save is loaded.
 for(const k of ['th','asia','west'])bossGuideState(restored,k);
 assert.equal(restored.restore(saved),true);
 assert.equal(restored.bossGuideWaiting(),true);assert.equal(restored.moveZone(to),false);
 assert.equal(dungeonCanTalkGuide(restored),false,'guide waits at the route entrance rather than the distant exit');
 const entry=dungeonPoint(0,route.id);restored.zoneTravel.active.position={x:entry[0],y:entry[1]};
 assert.ok(dungeonGuideAnchor(restored));assert.equal(dungeonCanTalkGuide(restored),true,'same proximity rule powers the visible button and E key');
 assert.equal(restored.inviteBossGuide(),true);restored.completeStory();assert.equal(restored.bossGuideFollowing(),true);
 assert.equal(dungeonCanTalkGuide(restored),false);
 restored.zoneTravel.active.position={x:exit[0],y:exit[1]};assert.equal(restored.farewellBossGuide(),true);restored.completeStory();
 assert.equal(restored.moveZone(to),true);assert.equal(restored.zone,to);
});
