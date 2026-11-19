import { bossJusticeCase,interrogateBoss,mirrorBoss,bossJusticeAnswer,sentenceBoss } from '../src/boss-justice.js';
import { harbourTravel } from './helpers/travel.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS, MERCHANT } from '../src/data.js';
import { westRescueActors, westRescuePending, westSpiritsFrozen, WEST_RESCUE, WEST_DEVA_RUN_MS, WEST_DEVA_EXIT_MS } from '../src/west-events.js';
import { devaMapActors } from '../src/deva-map.js';
import { mapInteractions, nearestInteraction } from '../src/proximity.js';
import { standPoints, waitingEvents } from '../src/npc-stand.js';
import { hitActor } from '../src/scene.js';
import { STORY } from '../src/story.js';
import { setLang, t } from '../src/i18n.js';
import { breachApproachActors } from '../src/breach-approach.js';
import { frontierIntroduction } from '../src/narrative-cutscenes.js';
globalThis.Image = class {};
globalThis.document = { documentElement:{} };
function west() { const g=createGame();g.bossCleared.asia=true;assert.equal(harbourTravel(g, 'west'),true);return g; }
function reload(g) { const copy=createGame();copy.restore(JSON.parse(JSON.stringify(g.snapshot())));return copy; }
function win(g) {
 g.battle.youHp=100000;
 for(let n=0;g.battle && !g.battle.over && n<30;n++) {
  if(g.battle.storyInterlude === 'west-hypnosis') {g.completeBattleInterlude();continue;}
  if(g.battle.pendingWave) {g.advanceZoneEventWave();continue;}
  const foe=g.battle.foes.find(f=>f.hp>0);foe.hp=1;g.battle.selectedFoeId=foe.id;
  assert.equal(g.battleAct('atk'),true);
 }
 assert.equal(g.battle.over,'win');g.endBattle();
}
function rescued() {const g=west();g.startZoneEvent('westHypnotized');win(g);g.storyQueue.length=0;g.notices.length=0;return g;}   // T7/1: the win queues z3-clear + N0-4' (those scenes are tested in t7-arrival)
test('arrival: only rescue actors/interactions; yama + Taan; unchanged stats/reward; building unlocks',()=>{
 const g=west();g.party.members=['nira','plerng'];
 assert.equal(westRescuePending(g),true);
 const actors=westRescueActors(g);
 assert.deepEqual(actors.map(a=>a.art),['crew-taan',MERCHANT.img,'spirit1','spirit2','spirit3']);
 assert.ok(actors.every(a=>a.x<500));assert.equal(waitingEvents(g).length,0);
 assert.deepEqual(standPoints(g),actors.map(a=>[a.x,a.y]));
 assert.deepEqual(mapInteractions(g,MERCHANT).map(a=>a.key),['westHypnotized']);
 assert.equal(nearestInteraction({x:870,y:850},mapInteractions(g,MERCHANT)),null);
 assert.equal(nearestInteraction(WEST_RESCUE,mapInteractions(g,MERCHANT)).key,'westHypnotized');
 for(const a of actors) assert.equal(hitActor(g,a.x,a.y).key,'westHypnotized');
 assert.equal(g.build('tea'),false);
 const coin=g.coin;const b=g.startZoneEvent('westHypnotized');
 assert.deepEqual(b.team,['taan']);assert.deepEqual(g.battleActors().map(a=>a.k),['yama','taan']);
 assert.deepEqual(b.foes.map(f=>f.sp),['spirit1','spirit1','spirit1']);
 const ev=ZONE_EVENTS.west[0];assert.ok(ev.foes.every(f=>f.hp===42 && String(f.atk)==='8,12'));
 win(g);assert.equal(g.coin,coin+70);assert.equal(westRescueActors(g).length,0);
 assert.ok(mapInteractions(g,MERCHANT).some(a=>a.kind==='nira'));
 g.level=5;g.coin=9999;assert.ok(g.build('tea'));
});
test('case 3 freezes all walkers and management until vampire win; thaw resumes elapsed position',()=>{
 let g=rescued();g.afterlifeWalks=[{zone:'west',soul:{id:777,sp:7},destination:'queue',path:[[800,650],[880,440]],elapsed:250,duration:2000}];
 g.zoneCases.west=5;g.refreshZoneEvents();assert.equal(westSpiritsFrozen(g),true);
 const tick=g.tick;g.advanceAfterlife(1000);g.step();assert.equal(g.afterlifeWalks[0].elapsed,250);assert.equal(g.tick,tick);
 g=reload(g);assert.equal(westSpiritsFrozen(g),true);assert.equal(g.afterlifeWalks[0].elapsed,250);
 g.startZoneEvent('westVampireBreach');g.advanceAfterlife(1000);assert.equal(g.afterlifeWalks[0].elapsed,250);
 win(g);assert.equal(g.abilities.hypno,true);assert.equal(westSpiritsFrozen(g),false);
 g.advanceAfterlife(100);assert.equal(g.afterlifeWalks[0].elapsed,250,'captured vampire remains under court supervision');
 while(g.storyQueue.length)g.completeStory();interrogateBoss(g);mirrorBoss(g);assert.equal(sentenceBoss(g,bossJusticeAnswer(g)),true);g.paused=false;   // T7/2: arena trial + cutscenes
 while(g.storyQueue.length)g.completeStory();
 for(let n=0;n<10000&&bossJusticeCase(g);n++)g.stepWorld(100);
 assert.equal(bossJusticeCase(g),null);g.advanceAfterlife(100);assert.equal(g.afterlifeWalks[0].elapsed,350);
});
test('vampire approach uses zone art and existing intro; three demon waves, the team under the spell (wave 4), then Valdric and the reward (T7/2)',()=>{
 const actors=breachApproachActors('west','westVampireBreach');assert.equal(actors.length,3);
 assert.equal(actors[0].art,'boss-frontier');
 assert.equal(frontierIntroduction('west','en').image,'img/frontier-west-intro-v1.webp');
 const ev=ZONE_EVENTS.west[1];assert.equal(ev.waves.length,5);assert.equal(ev.waves[2][0].kind,10);assert.equal(ev.waves[4][0].sp,'boss-frontier-west');assert.equal(ev.atCases,5);   // T7/2: 3 demon waves + the fixed team wave + Valdric
 assert.equal(ev.reward.ability,'hypno');
});
test('case 7: run from bottom → saved intro with five bilingual lines → move right → wait → fight → spear once',()=>{
 let g=rescued();g.zoneEvents.west.westVampireBreach='cleared';g.zoneCases.west=10;g.refreshZoneEvents();
 assert.equal(g.devaVisits.west.phase,'descending');assert.equal(devaMapActors(g)[0].y,850);assert.equal(devaMapActors(g)[0].enabled,false);
 g.advanceWestDeva(WEST_DEVA_RUN_MS/2);assert.ok(devaMapActors(g)[0].y<850);
 g=reload(g);g.advanceWestDeva(WEST_DEVA_RUN_MS/2);assert.equal(g.devaVisits.west.phase,'intro');
 assert.equal(g.storyQueue[0].key,'deva-west');assert.equal(devaMapActors(g)[0].y,480);
 assert.equal(STORY['deva-west'].pages[0].image,'img/deva-intro/deva-intro-west-v1.webp');
 for(const lang of ['th','en']) {setLang(lang);const line=STORY['deva-west'].pages[0].line;assert.equal(line.split('\n').length,5);assert.ok(!line.includes('deva.west.arrival'));assert.ok(!t('build.westBlocked').includes('hypnotized'));}
 setLang('th');g=reload(g);g.completeStory();assert.equal(g.devaVisits.west.phase,'descending');
 g.advanceWestDeva(WEST_DEVA_EXIT_MS);assert.equal(g.devaVisits.west.phase,'waiting');
 const a=devaMapActors(g)[0];assert.deepEqual([a.x,a.y,a.art],[1160,400,'boss-tester']);assert.equal(a.enabled,true);
 assert.ok(standPoints(g).some(p=>p[0]===a.x&&p[1]===a.y));assert.equal(hitActor(g,a.x,a.y).kind,'devaEncounter');
 assert.equal(nearestInteraction({x:a.x,y:a.y},mapInteractions(g,MERCHANT)).key,'westDevaTest');
 g.startZoneEvent(a.key);assert.equal(g.devaVisits.west.phase,'fighting');win(g);
 assert.equal(g.abilities.valkyrieSpear,true);assert.equal(devaMapActors(g).length,0);assert.equal(g.startZoneEvent(a.key),null);
});
test('old cleared rescue save is never replayed; interrupted deva battle retries on map',()=>{
 let g=rescued();const save=g.snapshot();delete save.devaVisits;g=createGame();g.restore(save);
 assert.equal(g.zoneEventStatus('westHypnotized'),'cleared');assert.equal(westRescuePending(g),false);assert.equal(g.startZoneEvent('westHypnotized'),null);
 g.zoneEvents.west.westVampireBreach='cleared';g.zoneCases.west=10;g.refreshZoneEvents();g.startZoneEvent('westDevaTest');g=reload(g);
 assert.equal(g.zoneEventStatus('westDevaTest'),'pending');assert.equal(devaMapActors(g)[0].enabled,true);
});
test('west intro preloads in west only; new cache token and rescue proximity UI are wired',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
 const path='img/deva-intro/deva-intro-west-v1.webp';assert.ok(catalog.zones.west.includes(path));assert.ok(!catalog.shared.includes(path));
 for(const z of ['th','asia','cyberhell']) assert.ok(!catalog.zones[z].includes(path));
 const preload=readFileSync(new URL('../src/preload.js',import.meta.url),'utf8');assert.ok(preload.includes('20261008-zone3-hypnosis-ui'));
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');assert.ok(ui.includes("g.startZoneEvent('westHypnotized')"));assert.ok(ui.includes('white-space:pre-line'));
});
test('frozen transit deadlines resume from same point and vampire loss leaves spirits frozen',()=>{
 const g=rescued();g.zoneCases.west=5;g.refreshZoneEvents();
 const now=Date.now;const start=g.westFreezeAt;
 g.transits=[{id:91,started:start-200,duration:1000,arriveAt:start+800}];
 const st=g.stations[0];st.slots=[{pendingUntil:start+800}];
 try {
  Date.now=()=>start+5000;
  g.startZoneEvent('westVampireBreach');
  // Keep foes alive; target only Yama so defeat does not depend on random crew targeting.
  g.battle.team=[];g.battle.absentActors=[g.guard.id];g.battle.youHp=1;g.battleAct('atk');   // T7/2: Van Helsing is also in the fight - he stands aside so only Yama can be hit
  assert.equal(g.battle.over,'lose');g.endBattle();assert.equal(g.guard,null,'the guest Guard goes back when the fight is lost');
  assert.equal(westSpiritsFrozen(g),true);assert.equal(g.zoneEventStatus('westVampireBreach'),'pending');
  g.startZoneEvent('westVampireBreach');win(g);
  assert.equal(g.transits[0].started,start+4800);assert.equal(g.transits[0].arriveAt,start+5800);
  assert.equal(st.slots[0].pendingUntil,start+5800);
  assert.equal(Date.now()-g.transits[0].started,200);
 } finally {Date.now=now;}
});
test('deva defeat returns to waiting actor and permits another challenge without replaying intro',()=>{
 const g=rescued();g.zoneEvents.west.westVampireBreach='cleared';g.zoneCases.west=10;g.refreshZoneEvents();
 g.advanceWestDeva(WEST_DEVA_RUN_MS);g.completeStory();g.advanceWestDeva(WEST_DEVA_EXIT_MS);
 g.startZoneEvent('westDevaTest');g.battle.team=[];g.battle.youHp=1;g.battleAct('atk');
 assert.equal(g.battle.over,'lose');g.endBattle();assert.equal(g.devaVisits.west.phase,'waiting');
 assert.equal(devaMapActors(g)[0].enabled,true);assert.deepEqual(g.storyQueue.map(p=>p.key),['z3-eirlin-lose'],'T7b/4: she lowers the spear (Rae lose scene), no replay of the arrival');
 assert.ok(g.startZoneEvent('westDevaTest'));win(g);assert.equal(g.abilities.valkyrieSpear,true);
});
