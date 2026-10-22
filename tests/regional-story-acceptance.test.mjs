import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {syncSceneZone,ZONE_EVENTS} from '../src/data.js';
import {bossJusticeCase,bossJusticeActors,bossJusticeAnswer,interrogateBoss,mirrorBoss,sentenceBoss,releaseBoss} from '../src/boss-justice.js';
import {bossGuideState,BOSS_GUIDE_GRANTS,acknowledgeBossGuideGrant} from '../src/boss-guides.js';
import {releasedFrontierBoss} from '../src/frontier.js';
import {finalCourtModel,finalCourtMarkup,FINAL_BOUND_SPRITE} from '../src/boss-court-view.js';
import {keeperBarHtml,teamReportsHtml} from '../src/interrogation-ui.js';
import {storyOf} from '../src/story.js';
import {finalGame,acknowledge} from './final-event-helpers.mjs';

// Node exercises gameplay with fallback art metrics; these are not browser/rendering checks.
globalThis.Image??=class {};
const regions=[['th','frontierBreach'],['asia','asiaRageBreach'],['west','westVampireBreach'],['cyberhell','cyberBreach']];
function setup(zone){
 const g=createGame();g.zone=zone;syncSceneZone(zone);g.snapshot();g.save=()=>true;g.onChange=()=>{};
 g.paused=false;g.coin=10000;g.food=100;g.courtClosed=true;g.storySeen['deva-cyberhell']=true;return g;
}
function reload(g){const h=createGame();h.save=()=>true;h.onChange=()=>{};assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));h.paused=false;return h;}
function winBattle(g){
 const b=g.battle;assert.ok(b);b.youHp=b.youMax;
 for(const f of b.foes){f.atk=[0,0];f.hp=1;}
 for(let n=0;n<40&&!b.over;n++){const f=b.foes.find(v=>v.hp>0);assert.ok(f);g.selectFoe(f.id);assert.equal(g.battleAct('atk'),true);}
 assert.equal(b.over,'win');assert.equal(g.battleAct('atk'),false);return b;
}
function stories(g){for(let n=0;g.storyQueue.length&&n<30;n++)g.completeStory();assert.equal(g.storyQueue.length,0);}
function worldUntil(g,phase){
 for(let n=0;n<3000&&bossJusticeCase(g)?.phase!==phase;n++)g.stepWorld(100);
 assert.equal(bossJusticeCase(g)?.phase,phase);
}
function releaseCourt(g){
 for(let n=0;n<3000&&g.bossJustice.active;n++)g.stepWorld(100);
 assert.equal(g.bossJustice.active,null);
}

for(const [zone,eventKey] of regions)test(`${zone}: real border-challenge victory resumes through trial, escort, punishment and returned NPC`,()=>{
 let g=setup(zone);g.zoneEvents[zone]={[eventKey]:'cleared'};g.challengeOf(zone).checkpoint=9;
 const b=g.startChallenge();assert.ok(b);assert.equal(b.wave,10);winBattle(g);const money=g.coin;g.endBattle();
 const docket=bossJusticeCase(g);assert.equal(docket.zone,zone);assert.equal(docket.phase,'dais');assert.equal(docket.frontierBoss,true);
 assert.ok(bossJusticeActors(g).some(a=>a.id==='justice-nira'));assert.equal(g.startChallenge(),null,'court blocks a second fight');
 assert.equal(sentenceBoss(g,{...bossJusticeAnswer(g),intensity:2}),false,'warrant requires interrogation');
 interrogateBoss(g);g=reload(g);assert.equal(bossJusticeCase(g).asked,true);assert.equal(g.coin,money);
 const pick={...bossJusticeAnswer(g),intensity:2};assert.equal(sentenceBoss(g,pick),true);
 worldUntil(g,'punishment');g=reload(g);assert.equal(bossJusticeCase(g).phase,'punishment');assert.equal(bossJusticeCase(g).pick.intensity,2);
 worldUntil(g,'return');releaseCourt(g);assert.equal(g.coin,money);assert.equal(g.teamReports.length,0,'captured-boss court does not replay ordinary soul rewards');
 const npc=releasedFrontierBoss(g);assert.ok(npc);assert.equal(npc.art,`boss-frontier-${zone}`);
 g=reload(g);assert.equal(releasedFrontierBoss(g).docket,npc.docket);assert.equal(g.coin,money);assert.equal(releaseBoss(g),false);
});

for(const [zone,to] of [['th','asia'],['asia','west'],['west','cyberhell']])test(`${zone}: actual ruler victory unlocks guide only after court, then pays money/outfit once`,()=>{
 let g=setup(zone);g.zoneCases[zone]=10;g.zoneEvents[zone]=Object.fromEntries((ZONE_EVENTS[zone]||[]).map(ev=>[ev.k,'cleared']));
 let b;
 if(zone==='th'){g.zoneEvents.th.thBorderBoss='pending';b=g.startZoneEvent('thBorderBoss');}
 else b=g.startZoneBoss('alert');
 assert.ok(b);winBattle(g);g.endBattle();assert.equal(bossGuideState(g).won,true);assert.ok(bossJusticeCase(g));
 assert.equal(g.bossGuideWaiting(),false);assert.equal(g.inviteBossGuide(),false,'a captured ruler cannot guide from court');
 interrogateBoss(g);assert.ok(sentenceBoss(g,{...bossJusticeAnswer(g),intensity:1}));worldUntil(g,'return');releaseCourt(g);
 stories(g);assert.equal(g.bossGuideWaiting(),true);assert.equal(g.inviteBossGuide(),true);stories(g);assert.equal(g.bossGuideFollowing(),true);
 const before=g.coin;assert.equal(g.farewellBossGuide(),true);g=reload(g);assert.equal(g.coin,before);stories(g);
 assert.equal(g.coin,before+BOSS_GUIDE_GRANTS[zone]);assert.ok(g.outfitsOwned.includes(to));assert.equal(g.pendingReward.guideZone,zone);
 g=reload(g);assert.equal(g.coin,before+BOSS_GUIDE_GRANTS[zone]);assert.equal(g.pendingReward.outfit,to);
 assert.equal(acknowledgeBossGuideGrant(g,zone),true);g.pendingReward=null;g=reload(g);
 assert.equal(g.pendingReward,null);assert.equal(g.farewellBossGuide(),false);assert.equal(g.inviteBossGuide(),false);
 assert.equal(g.outfitsOwned.filter(k=>k===to).length,1);assert.equal(g.coin,before+BOSS_GUIDE_GRANTS[zone]);
});

for(const [zone] of regions)test(`${zone}: Kan opens mitigation, Boon completes an actual assignment and report survives acknowledgement/reload`,()=>{
 const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
 try{
  let g=setup(zone);g.hire('kan');g.hire('boon');g.karma=10;g.mp=20;g.order=70;
  const st=g.stations.find(s=>s.def.k==='krata');
  const soul={id:81001,case:zone==='asia'?'A1':undefined,who:'วิญญาณตรวจรับ',name:'วิญญาณตรวจรับ',sp:0,sex:'m',deeds:[{s:st.def.tags[0],w:3,t:'กรรมที่ทราบ',known:true},{s:st.def.tags[0],w:-1,t:'เหตุบรรเทาเฉพาะสำนวน',known:false}],
   merits:[],deserved:2,said:[],lines:[],courtDisembarked:true,resist:false,traitKey:'concealing'};
  g.queue=[soul];assert.equal(g.spiritTrait(soul).key,'concealing');
  assert.ok(!keeperBarHtml(g,soul,g.crewOf('boon'),'krata').includes('เหตุบรรเทาเฉพาะสำนวน'),'role card cannot leak the clue');
  const morale=g.crewOf('kan').morale;assert.match(g.kanRevealClue(soul).text,/เหตุบรรเทาเฉพาะสำนวน/);
  assert.equal(g.mp,16);assert.equal(g.crewOf('kan').morale,morale-4);assert.equal(g.spiritTrait(soul).key,'concealing','P2: the colour is locked at court entry, opening the truth does not change it');
  g=reload(g);assert.match(g.kanClueWhy(g.queue[0]),/ไม่มีข้อเท็จจริง|พักพลัง/);
  assert.equal(g.assign(g.queue[0].id,'krata','boon',2),true);
  const afterVerdictKarma=g.karma,afterVerdictCoins=g.coin;
  assert.equal(g.pendingVerdict.destinationCorrect,true);assert.equal(g.pendingVerdict.over,0);assert.equal(g.pendingVerdict.short,0);
  for(let frame=0;frame<1800&&!g.teamReports.length;frame++){now+=100;g.stepWorld(100);if(frame%10===0)g.step();}
  assert.equal(g.teamReports.length,1,'ordinary work progresses through the real world/tick APIs');
  const report=g.teamReports[0];assert.equal(report.zone,zone);assert.equal(report.correct,true);assert.match(report.benefits.join(' '),/กรรมยามา −1/);
  assert.equal(g.karma,Math.max(0,afterVerdictKarma-1));assert.ok(g.coin>=afterVerdictCoins);
  assert.ok(teamReportsHtml(g).includes(report.keeperName));g=reload(g);
  assert.equal(g.teamReports[0].id,report.id);const coins=g.coin;assert.equal(g.acknowledgeTeamReport(report.id),true);assert.equal(g.acknowledgeTeamReport(report.id),false);
  g=reload(g);assert.equal(g.teamReports[0].seen,true);assert.equal(g.coin,coins);
 }finally{Date.now=originalNow;}
});

test('full final gauntlet ends in ending01, forced-mirror ordinary court, actual punishment, then ending02 exactly once',()=>{
 let g=finalGame();g.save=()=>true;g.onChange=()=>{};g.paused=false;
 for(const id of ['minion:1','minion:2','minion:3','minion:4','ruler:th','ruler:asia','ruler:west','ruler:cyberhell','boss']){
  assert.ok(g.startFinalEncounter(id));winBattle(g);g.endBattle();
  if(id!=='boss')acknowledge(g);
 }
 assert.equal(g.gameCompleted,false);assert.equal(g.finalEvent.phase,'justice');assert.equal(bossJusticeCase(g).phase,'capture');
 assert.equal(storyOf('ending-capture').pages[0].image,'img/story-ending-01-v4.png');
 assert.ok(g.storyQueue.some(p=>p.key==='ending-capture'));assert.ok(!g.storyQueue.some(p=>p.key==='ending'));
 const captureCoins=g.coin;assert.equal(g.acknowledgeFinalReward(),true);assert.equal(g.coin,captureCoins);stories(g);
 assert.equal(bossJusticeCase(g).phase,'dais');interrogateBoss(g);g=reload(g);
 const assets={background:'court.webp',hero:'yama.webp',portrait:'yama.webp',station:k=>`${k}.webp`,crew:k=>`${k}.webp`};
 const before=structuredClone(g.inventory),c=bossJusticeCase(g),answer=bossJusticeAnswer(g);
 Object.assign(c.pick,answer);assert.equal(finalCourtModel(g).ready,false);assert.equal(sentenceBoss(g,answer),false);
 assert.ok(mirrorBoss(g));assert.deepEqual(g.inventory,before);assert.equal(finalCourtModel(g).ready,true);
 const markup=finalCourtMarkup(g,{assets});assert.match(markup,/hud trial-hud trial-comment8 final-boss-court/);assert.match(markup,/data-justice-answer/);
 assert.ok(markup.includes(FINAL_BOUND_SPRITE));assert.ok(existsSync(new URL('../'+FINAL_BOUND_SPRITE,import.meta.url)));
 assert.equal(sentenceBoss(g,{...answer,intensity:4}),false);assert.equal(sentenceBoss(g,{...answer,crew:'nira'}),false);
 assert.equal(sentenceBoss(g,answer),true);worldUntil(g,'punishment');g=reload(g);worldUntil(g,'sentenceScene');
 assert.equal(g.gameCompleted,false);assert.equal(g.storyQueue.some(p=>p.key==='ending'),false);
 assert.ok(existsSync(new URL('../img/boss-justice/final-sentence-v1.webp',import.meta.url)));
 g=reload(g);assert.equal(releaseBoss(g),true);assert.equal(g.gameCompleted,true);assert.equal(releaseBoss(g),false);
 assert.equal(storyOf('ending').pages[0].image,'img/story-ending-02-v3.png');assert.equal(g.storyQueue.filter(p=>p.key==='ending').length,1);
 const finalCoins=g.coin;stories(g);g=reload(g);assert.equal(g.storySeen.ending,true);assert.equal(g.storyQueue.some(p=>p.key==='ending'),false);assert.equal(g.coin,finalCoins);
});
