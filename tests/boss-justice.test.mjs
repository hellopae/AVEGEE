import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {syncSceneZone,STATIONS} from '../src/data.js';
import {initializeBossJustice,queueBossJustice,bossJusticeCase,bossJusticeActors,bossJusticeAnswer,interrogateBoss,mirrorBoss,sentenceBoss,advanceBossJustice,completeBossJusticeStory,releaseBoss} from '../src/boss-justice.js';
const game=()=>{const g=createGame();g.paused=false;g.save=()=>true;g.onChange=()=>{};return g;};
const advance=(g,target)=>{for(let i=0;i<2000&&bossJusticeCase(g)?.phase!==target;i++)advanceBossJustice(g,100);assert.equal(bossJusticeCase(g)?.phase,target);};
test('captured zone boss is tried, escorted along map route, punished and released exactly once',()=>{
 const g=game();const b={kind:'zoneBoss',zone:'th',who:'บอสชายแดน',sp:'zone-boss',over:'win'};
 assert.equal(queueBossJustice(g,b),true);assert.equal(queueBossJustice(g,b),false);
 assert.equal(bossJusticeActors(g).length,2);assert.equal(sentenceBoss(g,{station:'krata',crew:'taan',intensity:3}),false);
 interrogateBoss(g);assert.equal(sentenceBoss(g,{station:'krata',crew:'nira',intensity:3}),false);
 assert.equal(sentenceBoss(g,{station:'krata',crew:'taan',intensity:3}),true);
 const first=bossJusticeActors(g)[0];advanceBossJustice(g,100);const second=bossJusticeActors(g)[0];
 assert.notDeepEqual([first.x,first.y],[second.x,second.y]);assert.equal(bossJusticeActors(g).length,2);
 advance(g,'punishment');const c=bossJusticeCase(g);assert.equal(c.punishmentDuration,6000);
 g.paused=true;advanceBossJustice(g,100);assert.equal(c.elapsed,0);g.paused=false;
 advance(g,'return');for(let i=0;i<2000&&g.bossJustice.active;i++)advanceBossJustice(g,100);
 assert.equal(g.bossJustice.active,null);assert.equal(g.bossJustice.ledger['th:ruler'].phase,'released');
 assert.equal(queueBossJustice(g,b),false);assert.equal(releaseBoss(g),false);
});
test('final boss requires asked dossier, mandatory mirror and all correct maximum choices before ending02',()=>{
 const g=game();g.zone='cyberhell';syncSceneZone(g.zone);g.zoneEvents.cyberhell={};
 g.finalEvent={phase:'justice'};g.storyQueue=[];
 queueBossJustice(g,{kind:'zoneEvent',zone:'cyberhell',who:'อาร์คอน',sp:'zone-boss',over:'win'},{final:true});
 assert.equal(bossJusticeCase(g).phase,'capture');assert.equal(mirrorBoss(g),false);
 completeBossJusticeStory(g,'ending-capture');interrogateBoss(g);const answer=bossJusticeAnswer(g);
 assert.equal(sentenceBoss(g,answer),false);mirrorBoss(g);
 assert.equal(sentenceBoss(g,{...answer,intensity:4}),false);assert.equal(sentenceBoss(g,answer),true);
 advance(g,'punishment');advance(g,'sentenceScene');assert.equal(g.gameCompleted,false);
 assert.equal(releaseBoss(g),true);assert.equal(g.gameCompleted,true);assert.equal(g.storyQueue.at(-1).key,'ending');
 assert.equal(g.finalEvent.phase,'completed');assert.equal(g.bossJustice.ledger['final:cyberhell'].phase,'released');
});
test('saved escort and sentence choices resume without receiving another battle reward',()=>{
 const g=game();queueBossJustice(g,{kind:'zoneBoss',zone:'th',who:'บอส',over:'win'});interrogateBoss(g);
 sentenceBoss(g,{station:'krata',crew:'taan',intensity:2});advanceBossJustice(g,100);
 const snapshot=JSON.parse(JSON.stringify(g.snapshot()));const h=createGame();assert.equal(h.restore(snapshot),true);
 assert.equal(bossJusticeCase(h).phase,'escort');assert.equal(bossJusticeCase(h).elapsed,100);
 assert.equal(bossJusticeCase(h).pick.intensity,2);assert.equal(h.coin,g.coin);
});
test('lost battles and ordinary mobs never start a boss docket',()=>{
 const g=game();assert.equal(queueBossJustice(g,{kind:'zoneBoss',over:'lose'}),false);
 assert.equal(queueBossJustice(g,{kind:'mob',over:'win'}),false);assert.equal(g.bossJustice,undefined);
});
test('all four frontier bosses receive one persistent docket and rematches do not repeat sentencing',()=>{
 for(const [zone,eventKey] of [['th','frontierBreach'],['asia','asiaRageBreach'],['west','westVampireBreach'],['cyberhell','cyberBreach']]){
  const g=game();g.zone=zone;syncSceneZone(zone);
  const b={kind:zone==='th'?'frontierBreach':'zoneEvent',zone,eventKey,over:'win',foes:[{who:'ลูกน้อง',sp:'spirit1'},{who:'หัวหน้าชายแดน',sp:`boss-frontier-${zone}`,boss:true}]};
  assert.equal(queueBossJustice(g,b),true);assert.equal(bossJusticeCase(g).name,'หัวหน้าชายแดน');
  interrogateBoss(g);sentenceBoss(g,{...bossJusticeAnswer(g),intensity:2});advance(g,'return');
  for(let i=0;i<2000&&g.bossJustice.active;i++)advanceBossJustice(g,100);
  assert.equal(queueBossJustice(g,b),false);
  assert.equal(queueBossJustice(g,{...b,justiceDocket:null,challenge:true,rematch:true}),false);
  assert.equal(Object.keys(g.bossJustice.ledger).length,1);
 }
});
test('partial saves with no station or keeper requisition court resources and can finish finale',()=>{
 const g=game();g.zone='cyberhell';syncSceneZone(g.zone);g.zoneEvents.cyberhell={};g.finalEvent={phase:'justice'};
 g.stations=[];g.crew=[];queueBossJustice(g,{kind:'zoneEvent',zone:'cyberhell',who:'บอส',over:'win'},{final:true});
 assert.equal(g.stations.length,1);assert.equal(g.stations[0].bossCourtTemporary,true);
 completeBossJusticeStory(g,'ending-capture');interrogateBoss(g);mirrorBoss(g);
 assert.equal(sentenceBoss(g,bossJusticeAnswer(g)),true);advance(g,'sentenceScene');releaseBoss(g);
 assert.equal(g.gameCompleted,true);assert.equal(g.stations.length,0);assert.equal(g.crew.length,0);
});
test('interrupted final sentencing does not auto-complete or skip back to ending02 on load',()=>{
 const g=game();g.zone='cyberhell';syncSceneZone(g.zone);g.zoneEvents.cyberhell={cyberFinal:'active'};g.finalEventState().phase='justice';
 queueBossJustice(g,{kind:'zoneEvent',zone:'cyberhell',who:'บอส',over:'win'},{final:true});
 completeBossJusticeStory(g,'ending-capture');interrogateBoss(g);mirrorBoss(g);
 const h=createGame();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
 assert.equal(h.finalEvent.phase,'justice');assert.equal(h.gameCompleted,false);
 assert.equal(bossJusticeCase(h).phase,'trial');assert.equal(bossJusticeCase(h).mirror,true);
 assert.ok(!h.storyQueue.some(p=>p.key==='ending'));
});
test('actual stepWorld drives court escort, punishment and release; dialog pause release resumes it',async()=>{
 const {readFileSync}=await import('node:fs');
 const {releasedFrontierBoss}=await import('../src/frontier.js');
 const source=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 const start=source.indexOf('function releaseDlgPause() {'),end=source.indexOf('\n}',start)+2;
 const g=game();queueBossJustice(g,{kind:'frontierBreach',zone:'th',eventKey:'frontierBreach',over:'win',foes:[{boss:true,who:'หัวหน้าชายแดน',sp:'boss-frontier-th'}]});
 interrogateBoss(g);assert.equal(sentenceBoss(g,{...bossJusticeAnswer(g),intensity:1}),true);
 const c=bossJusticeCase(g),first=bossJusticeActors(g)[0];g.paused=true;
 const dlg={open:true},pauseDlg={open:false};let playUpdates=0;
 const releasePause=new Function('g','dlg','pauseDlg','userPaused','updatePlay',source.slice(start,end)+';return releaseDlgPause;')(g,dlg,pauseDlg,false,()=>playUpdates++);
 releasePause();g.stepWorld(100);assert.equal(c.elapsed,0);assert.equal(g.paused,true);
 dlg.open=false;releasePause();assert.equal(g.paused,false);assert.equal(playUpdates,1);
 g.stepWorld(100);assert.equal(c.elapsed,100);assert.notDeepEqual(bossJusticeActors(g)[0],first);
 assert.equal(releasedFrontierBoss(g),null);const tick=g.tick;g.step();assert.equal(g.tick,tick);
 const phases=[];g.onChange=()=>phases.push(bossJusticeCase(g)?.phase||'released');
 for(let i=0;i<2000&&g.bossJustice.active;i++)g.stepWorld(100);
 assert.equal(g.bossJustice.active,null);assert.deepEqual(phases,['punishment','return','released']);
 const post=releasedFrontierBoss(g);assert.equal(post.art,'boss-frontier-th');assert.equal(post.name,'หัวหน้าชายแดน');
 const h=createGame();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
 assert.equal(releasedFrontierBoss(h).docket,post.docket);
});
test('released frontier NPC selects newest returned captain without duplicating a ruler guide or active invasion',async()=>{
 const {releasedFrontierBoss}=await import('../src/frontier.js');
 const {frontierWalkable}=await import('../src/frontier-navigation.js');
 for(const zone of ['th','asia','west','cyberhell']){
  const g={zone,bossJustice:{active:null,ledger:{
   old:{id:'old',zone,phase:'released',frontierBoss:true,art:`boss-frontier-${zone}`,name:'เก่า'},
   latest:{id:'latest',zone,phase:'released',frontierBoss:true,art:`boss-frontier-${zone}`,name:'ใหม่'},
   ruler:{id:'ruler',zone,phase:'released',art:'zone-boss',name:'ผู้ตรวจการ'},
  }}};
  const actor=releasedFrontierBoss(g);assert.equal(actor.name,'ใหม่');assert.ok(frontierWalkable(zone,actor.x,actor.y));
  const besideGuide=releasedFrontierBoss(g,{guide:true});assert.ok(frontierWalkable(zone,besideGuide.x,besideGuide.y));
  assert.notDeepEqual([actor.x,actor.y],[besideGuide.x,besideGuide.y]);
  assert.equal(releasedFrontierBoss(g,{invasion:true}),null);
  g.bossJustice.active='latest';assert.equal(releasedFrontierBoss(g),null);
 }
});
test('final world sentencing keeps ending02 locked until mirror, actual punishment and sentencing cutscene acknowledgement',()=>{
 const g=game();g.zone='cyberhell';syncSceneZone(g.zone);g.zoneEvents.cyberhell={cyberFinal:'active'};g.finalEventState().phase='justice';
 queueBossJustice(g,{kind:'zoneEvent',zone:'cyberhell',who:'อาร์คอน-ศูนย์',sp:'zone-boss-cyberhell',over:'win'},{final:true});
 g.queueStory('ending-capture');assert.equal(g.storyQueue[0].key,'ending-capture');
 assert.equal(bossJusticeCase(g).phase,'capture');assert.equal(releaseBoss(g),false);g.completeStory();
 assert.equal(bossJusticeCase(g).phase,'dais');interrogateBoss(g);
 const correct=bossJusticeAnswer(g);assert.equal(sentenceBoss(g,correct),false);mirrorBoss(g);
 assert.equal(sentenceBoss(g,{...correct,intensity:4}),false);assert.equal(sentenceBoss(g,correct),true);
 for(let i=0;i<2000&&bossJusticeCase(g)?.phase!=='sentenceScene';i++)g.stepWorld(100);
 assert.equal(bossJusticeCase(g).phase,'sentenceScene');assert.equal(g.gameCompleted,false);
 assert.ok(!g.storyQueue.some(p=>p.key==='ending'));assert.equal(g.finalEvent.phase,'justice');
 const h=createGame();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
 assert.equal(bossJusticeCase(h).phase,'sentenceScene');assert.equal(h.gameCompleted,false);
 assert.ok(!h.storyQueue.some(p=>p.key==='ending'));
 assert.equal(releaseBoss(h),true);assert.equal(h.storyQueue.at(-1).key,'ending');assert.equal(h.gameCompleted,true);
});
test('actual completed tenth-wave frontier challenges enter court in every zone; unfinished wave does not',()=>{
 for(const [zone,unlock] of [['th','frontierBreach'],['asia','asiaRageBreach'],['west','westVampireBreach'],['cyberhell','cyberBreach']]){
  const g=game();g.zone=zone;syncSceneZone(zone);g.zoneEvents[zone]={[unlock]:'cleared'};
  g.challengeOf(zone).checkpoint=9;const b=g.startChallenge();assert.ok(b);assert.equal(b.wave,10);
  assert.equal(queueBossJustice(g,b),false);
  for(const f of b.foes){f.atk=[0,0];f.hp=1;}b.youHp=b.youMax=10000;
  for(let n=0;n<20&&!b.over;n++){const foe=b.foes.find(f=>f.hp>0);g.selectFoe(foe.id);g.battleAct('atk');}
  assert.equal(b.over,'win');g.endBattle();
  const c=bossJusticeCase(g);assert.ok(c,zone);assert.equal(c.frontierBoss,true);assert.equal(c.art,`boss-frontier-${zone}`);
 }
});
