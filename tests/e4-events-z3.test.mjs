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
function west() { const g=createGame();g.bossCleared.asia=true;assert.equal(g.moveZone('west'),true);return g; }
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
function rescued() {const g=west();g.startZoneEvent('westHypnotized');win(g);return g;}
test('arrival: only rescue actors/interactions; yama + Taan; unchanged stats/reward; building unlocks',()=>{
 const g=west();g.party.members=['nira','plerng'];
 assert.equal(westRescuePending(g),true);
 const actors=westRescueActors(g);
 assert.deepEqual(actors.map(a=>a.art),['crew-taan',MERCHANT.img,'mob-skeleton','mob-skeleton','mob-werewolf']);
 assert.ok(actors.every(a=>a.x<500));assert.equal(waitingEvents(g).length,0);
 assert.deepEqual(standPoints(g),actors.map(a=>[a.x,a.y]));
 assert.deepEqual(mapInteractions(g,MERCHANT).map(a=>a.key),['westHypnotized']);
 assert.equal(nearestInteraction({x:870,y:850},mapInteractions(g,MERCHANT)),null);
 assert.equal(nearestInteraction(WEST_RESCUE,mapInteractions(g,MERCHANT)).key,'westHypnotized');
 for(const a of actors) assert.equal(hitActor(g,a.x,a.y).key,'westHypnotized');
 assert.equal(g.build('tea'),false);
 const coin=g.coin;const b=g.startZoneEvent('westHypnotized');
 assert.deepEqual(b.team,['taan']);assert.deepEqual(g.battleActors().map(a=>a.k),['yama','taan']);
 assert.deepEqual(b.foes.map(f=>f.sp),['mob-skeleton','mob-skeleton','mob-werewolf']);
 const ev=ZONE_EVENTS.west[0];assert.ok(ev.foes.every(f=>f.hp===45 && String(f.atk)==='8,13'));
 win(g);assert.equal(g.coin,coin+70);assert.equal(westRescueActors(g).length,0);
 assert.ok(mapInteractions(g,MERCHANT).some(a=>a.kind==='nira'));
 g.level=5;g.coin=9999;assert.ok(g.build('tea'));
});
test('case 3 freezes all walkers and management until vampire win; thaw resumes elapsed position',()=>{
 let g=rescued();g.afterlifeWalks=[{zone:'west',soul:{id:777,sp:7},destination:'queue',path:[[800,650],[880,440]],elapsed:250,duration:2000}];
 g.zoneCases.west=3;g.refreshZoneEvents();assert.equal(westSpiritsFrozen(g),true);
 const tick=g.tick;g.advanceAfterlife(1000);g.step();assert.equal(g.afterlifeWalks[0].elapsed,250);assert.equal(g.tick,tick);
 g=reload(g);assert.equal(westSpiritsFrozen(g),true);assert.equal(g.afterlifeWalks[0].elapsed,250);
 g.startZoneEvent('westVampireBreach');g.advanceAfterlife(1000);assert.equal(g.afterlifeWalks[0].elapsed,250);
 win(g);assert.equal(g.abilities.hypno,true);assert.equal(westSpiritsFrozen(g),false);
 g.advanceAfterlife(100);assert.equal(g.afterlifeWalks[0].elapsed,350);
});
test('vampire approach uses zone art and existing intro; two minion waves, hypnotized party wave, then vampire reward',()=>{
 const actors=breachApproachActors('west','westVampireBreach');assert.equal(actors.length,3);
 assert.equal(actors[0].art,'boss-frontier');
 assert.equal(frontierIntroduction('west','en').image,'img/frontier-west-intro-v1.png');
 const ev=ZONE_EVENTS.west[1];assert.equal(ev.waves.length,4);assert.equal(ev.waves[2][0].crew,'taan');assert.equal(ev.waves[3][0].sp,'boss-frontier-west');assert.equal(ev.reward.ability,'hypno');
});
test('case 7: run from bottom → saved intro with five bilingual lines → move right → wait → fight → spear once',()=>{
 let g=rescued();g.zoneEvents.west.westVampireBreach='cleared';g.zoneCases.west=7;g.refreshZoneEvents();
 assert.equal(g.devaVisits.west.phase,'descending');assert.equal(devaMapActors(g)[0].y,850);assert.equal(devaMapActors(g)[0].enabled,false);
 g.advanceWestDeva(WEST_DEVA_RUN_MS/2);assert.ok(devaMapActors(g)[0].y<850);
 g=reload(g);g.advanceWestDeva(WEST_DEVA_RUN_MS/2);assert.equal(g.devaVisits.west.phase,'intro');
 assert.equal(g.storyQueue[0].key,'deva-west');assert.equal(devaMapActors(g)[0].y,480);
 assert.equal(STORY['deva-west'].pages[0].image,'img/deva-intro/deva-intro-west-v1.png');
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
 g.zoneEvents.west.westVampireBreach='cleared';g.zoneCases.west=7;g.refreshZoneEvents();g.startZoneEvent('westDevaTest');g=reload(g);
 assert.equal(g.zoneEventStatus('westDevaTest'),'pending');assert.equal(devaMapActors(g)[0].enabled,true);
});
test('west intro preloads in west only; new cache token and rescue proximity UI are wired',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
 const path='img/deva-intro/deva-intro-west-v1.png';assert.ok(catalog.zones.west.includes(path));assert.ok(!catalog.shared.includes(path));
 for(const z of ['th','asia','cyberhell']) assert.ok(!catalog.zones[z].includes(path));
 const preload=readFileSync(new URL('../src/preload.js',import.meta.url),'utf8');assert.ok(preload.includes('20261008-zone3-hypnosis-ui'));
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');assert.ok(ui.includes("g.startZoneEvent('westHypnotized')"));assert.ok(ui.includes('white-space:pre-line'));
});
test('frozen transit deadlines resume from same point and vampire loss leaves spirits frozen',()=>{
 const g=rescued();g.zoneCases.west=3;g.refreshZoneEvents();
 const now=Date.now;const start=g.westFreezeAt;
 g.transits=[{id:91,started:start-200,duration:1000,arriveAt:start+800}];
 const st=g.stations[0];st.slots=[{pendingUntil:start+800}];
 try {
  Date.now=()=>start+5000;
  g.startZoneEvent('westVampireBreach');
  // Keep foes alive; target only Yama so defeat does not depend on random crew targeting.
  g.battle.team=[];g.battle.youHp=1;g.battleAct('atk');
  assert.equal(g.battle.over,'lose');g.endBattle();
  assert.equal(westSpiritsFrozen(g),true);assert.equal(g.zoneEventStatus('westVampireBreach'),'pending');
  g.startZoneEvent('westVampireBreach');win(g);
  assert.equal(g.transits[0].started,start+4800);assert.equal(g.transits[0].arriveAt,start+5800);
  assert.equal(st.slots[0].pendingUntil,start+5800);
  assert.equal(Date.now()-g.transits[0].started,200);
 } finally {Date.now=now;}
});
test('deva defeat returns to waiting actor and permits another challenge without replaying intro',()=>{
 const g=rescued();g.zoneEvents.west.westVampireBreach='cleared';g.zoneCases.west=7;g.refreshZoneEvents();
 g.advanceWestDeva(WEST_DEVA_RUN_MS);g.completeStory();g.advanceWestDeva(WEST_DEVA_EXIT_MS);
 g.startZoneEvent('westDevaTest');g.battle.team=[];g.battle.youHp=1;g.battleAct('atk');
 assert.equal(g.battle.over,'lose');g.endBattle();assert.equal(g.devaVisits.west.phase,'waiting');
 assert.equal(devaMapActors(g)[0].enabled,true);assert.equal(g.storyQueue.length,0);
 assert.ok(g.startZoneEvent('westDevaTest'));win(g);assert.equal(g.abilities.valkyrieSpear,true);
});
