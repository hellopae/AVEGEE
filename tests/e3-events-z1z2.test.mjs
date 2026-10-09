import test from 'node:test';
import { readFileSync } from 'node:fs';
import { breachApproachActors } from '../src/breach-approach.js';
import { frontierPath, frontierWalkable } from '../src/frontier-navigation.js';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, ZONE_EVENTS, MOB } from '../src/data.js';
import { ALL_CASES, CASES_BY_ZONE } from '../src/cases.js';
import { STORY } from '../src/story.js';
import { setLang, t } from '../src/i18n.js';
import { devaMapActors, prisonEventBurning, DEVA_DESCENT_MS } from '../src/deva-map.js';
import { mapInteractions, nearestInteraction } from '../src/proximity.js';
globalThis.document={documentElement:{}};
globalThis.Image=class { set src(value) {} };
const reload = g => { const loaded=createGame(); loaded.restore(JSON.parse(JSON.stringify(g.snapshot()))); return loaded; };
function strike(g) { const f=g.battle.foes.find(f=>f.hp>0); f.hp=1;g.battle.selectedFoeId=f.id;assert.equal(g.battleAct('atk'),true); }
for (const right of [true,false]) test(`case five monk → ${right?'praise':'warning'} → test → mirror once`,()=>{
 const g=createGame();g.zoneCases.th=4;g.casesDone=4;g.zoneEvents.th={prisonBreak:'cleared'};
 g.ensureDevaCase();const monk=g.queue[0];assert.equal(monk.case,'devaMonk');assert.equal(monk.pure,true);
 assert.equal(monk.deeds.length,0);assert.equal(g.inventory.mirror||0,0);
 const st={def:STATIONS.find(d=>d.k===(right?'sawan':'krata')),crewK:'taan'};
 const r=g.judge(st,{soul:monk,intensity:1});assert.equal(!!r.right,right);
 g.applyVerdict(r,monk);assert.equal(g.zoneCases.th,5);
 const key=right?'deva-th-praise':'deva-th-warning';assert.equal(g.storyQueue[0].key,key);
 assert.equal(STORY[key].pages[0].image,'img/deva-intro/deva-intro-th-beggar-v2.webp');
 assert.equal(g.battle,null);assert.equal(g.inventory.mirror||0,0);
 for(const lang of ['th','en']) {setLang(lang);assert.notEqual(t('deva.th.praise'),t('deva.th.warning'));assert.ok(!t('deva.th.praise').startsWith('deva.'));}setLang('th');
 const saved=reload(g);saved.completeStory();assert.equal(saved.battle.kind,'devaTest');
 strike(saved);assert.equal(saved.inventory.mirror,1);saved.endBattle();assert.equal(saved.startDevaTest(),null);
 const cleared=reload(saved);assert.equal(cleared.inventory.mirror,1);assert.equal(cleared.storyQueue.length,0);
});
test('Asia: two kills → saved descent → intro → deva defeats third → waiting actor → test → disappears',()=>{
 let g=createGame();g.zone='asia';g.zoneCases.asia=3;g.refreshZoneEvents();
 assert.equal(g.stations.find(s=>s.def.k==='tarang').fire,MOB.burnMax);assert.equal(prisonEventBurning(g),true);
 const coin=g.coin;g.startZoneEvent('asiaPrisonFire');strike(g);
 assert.equal(!!g.battle.devaArrived,false);assert.equal(devaMapActors(g).length,0);
 strike(g);assert.equal(g.battle,null);assert.equal(g.devaVisits.asia.phase,'descending');
 assert.equal(g.devaVisits.asia.battle.foes.filter(f=>f.hp>0).length,1);assert.equal(g.coin,coin);
 g=reload(g);assert.equal(g.zoneEventStatus('asiaPrisonFire'),'active');g.devaDescentStartedAt=1000;
 assert.ok(devaMapActors(g,1000)[0].y < devaMapActors(g,1000+DEVA_DESCENT_MS/2)[0].y);
 assert.equal(g.finishDevaDescent(),true);assert.equal(g.storyQueue[0].key,'deva-asia');
 assert.equal(STORY['deva-asia'].pages[0].image,'img/deva-intro/deva-intro-asia-v1.png');
 g=reload(g);g.completeStory();assert.equal(g.zoneEventStatus('asiaPrisonFire'),'cleared');assert.equal(g.coin-coin,90);
 assert.equal(prisonEventBurning(g),false);assert.equal(g.abilities.windFan,undefined);
 const actor=devaMapActors(g)[0];assert.equal(actor.enabled,true);g.player={x:actor.x,y:actor.y};
 const target=nearestInteraction(g.player,mapInteractions(g,{x:0,y:0}));assert.equal(target.kind,'devaEncounter');
 g=reload(g);assert.equal(devaMapActors(g).length,1);g.startZoneEvent(target.key);strike(g);g.endBattle();
 assert.equal(g.abilities.windFan,true);assert.equal(devaMapActors(g).length,0);assert.equal(devaMapActors(reload(g)).length,0);
});
test('legacy active fire restarts safely, cleared fire waits, completed tester never repeats',()=>{
 const g=createGame();g.zone='asia';g.zoneCases.asia=3;
 for(const [fire,tester,count] of [['active',undefined,0],['cleared','pending',1],['cleared','cleared',0]]) {
 g.zoneEvents.asia={asiaPrisonFire:fire,...(tester?{asiaDevaTest:tester}:{})};const old=g.snapshot();delete old.devaVisits;
 const loaded=createGame();loaded.restore(JSON.parse(JSON.stringify(old)));assert.equal(devaMapActors(loaded).length,count);
 if(fire==='active')assert.ok(loaded.startZoneEvent('asiaPrisonFire'));
 if(tester==='cleared')assert.equal(loaded.startZoneEvent('asiaDevaTest'),null);
 }
});
test('breaches keep thresholds, waves, bosses and saved marching state',()=>{
 for(const [zone,key,cases,waves] of [['th','frontierBreach',8,2],['asia','asiaRageBreach',6,3]]) {
 const g=createGame();g.zone=zone;g.zoneCases[zone]=cases;
 g.zoneEvents[zone]=zone==='th'?{prisonBreak:'cleared',devaTest:'cleared'}:{asiaPrisonFire:'cleared',asiaDevaTest:'cleared'};
 g.refreshZoneEvents();g.dismissEventAlert(key);const loaded=reload(g);assert.equal(loaded.breachMarch().key,key);
 const ev=ZONE_EVENTS[zone].find(e=>e.k===key);assert.equal(ev.waves.length,waves);assert.ok(ev.waves.at(-1).some(f=>f.boss));
 }
});

test('area damage and self-hit still leave the third spirit to the deva',()=>{
 for(const action of ['windFan','atk']) {
  const g=createGame();g.zone='asia';g.zoneCases.asia=3;g.refreshZoneEvents();g.startZoneEvent('asiaPrisonFire');
  if(action==='windFan') {g.abilities.windFan=true;g.mp=999;g.battle.foes.forEach(f=>f.hp=1);}
  else {g.battle.foes[0].hp=0;g.battle.foes[1].hp=1;g.battle.foes[1].confuse=1;g.battle.selectedFoeId=g.battle.foes[2].id;}
  assert.equal(g.battleAct(action),true);assert.equal(g.battle,null);
  assert.equal(g.devaVisits.asia.battle.foes.filter(f=>f.hp>0).length,1);
  g.finishDevaDescent();g.completeStory();assert.equal(g.zoneEventStatus('asiaPrisonFire'),'cleared');
 }
});
test('case five cannot be deferred or replaced; old case-four saves receive the monk',()=>{
 const g=createGame();g.zoneCases.th=4;g.zoneEvents.th={prisonBreak:'cleared'};
 const loaded=reload(g);assert.equal(loaded.queue[0].case,'devaMonk');
 assert.equal(loaded.defer(),false);assert.equal(loaded.jail(loaded.queue[0].id),false);
 loaded.queue.push({id:999999,case:'other'});
 assert.deepEqual(loaded.assignBlock(999999,'krata','taan'),{key:'devaCaseFirst'});
});
test('breach actors stand on navigable ground with a reachable boss; UI waits for approach',()=>{
 for(const [zone,key] of [['th','frontierBreach'],['asia','asiaRageBreach']]) {
  const actors=breachApproachActors(zone,key);assert.equal(actors.length,3);
  assert.ok(actors.every(a=>frontierWalkable(zone,a.x,a.y)));
  const boss=actors.find(a=>a.boss);const path=frontierPath(zone,[.485,.35],[boss.x-.06,boss.y]);
  assert.ok(path.length);assert.ok(Math.hypot(path.at(-1)[0]-boss.x,path.at(-1)[1]-boss.y)<=.09);
 }
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 assert.ok(ui.includes('!approachReached) { openFrontierWalk(breachKey); return; }'));
 assert.ok(ui.includes('if (invasionKey) { FW.destroy(); openFrontier(false, invasionKey, false, true); return; }'));
});
test('both deva intro images preload only in their zones and cache version changed',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
 for(const zone of ['th','asia'])assert.ok(catalog.zones[zone].includes(`img/deva-intro/deva-intro-${zone}-v1.png`));
 assert.ok(readFileSync(new URL('../src/preload.js',import.meta.url),'utf8').includes('20261008-zone3-hypnosis-ui'));
});
test('temple beggar deity stays separate from the abbot and old saves load',()=>{
 const abbot=ALL_CASES.find(c=>c.k==='monk');
 assert.equal(abbot.name,'เจ้าอาวาสดัง');assert.equal(abbot.kind,'twist');assert.ok(abbot.hidden.length>0);
 const dm=ALL_CASES.find(c=>c.k==='devaMonk');assert.equal(dm.kind,'deva');assert.equal(dm.sp,'soul-deva');assert.equal(dm.name,'ขอทานในวัด');assert.equal(dm.sex,'m');assert.deepEqual(dm.seen,[]);assert.deepEqual(dm.hidden,[]);
 assert.equal(ALL_CASES.some(c=>c.k==='deva'),false);
 // case five (th) is devaMonk and the ordinary pool never yields it or the retired beggar
 const g=createGame();g.zoneCases.th=4;g.casesDone=4;g.zoneEvents.th={prisonBreak:'cleared'};
 g.ensureDevaCase();assert.equal(g.queue[0].case,'devaMonk');
 const seen=new Set();
 for(let i=0;i<300;i++){const h=createGame();h.casesDone=5;h.spawns=0;h.has=()=>true;const s=h.nextNamedCase([]);if(s)seen.add(s.case);}
 assert.ok(seen.has('monk'),'abbot is drawable again');
 assert.ok(!seen.has('devaMonk'));assert.ok(!seen.has('deva'));
 assert.ok(CASES_BY_ZONE.th.some(c=>c.k==='monk'));
 // old save with the retired beggar in queue/held/usedCases loads without it
 const old=createGame();const snap=JSON.parse(JSON.stringify(old.snapshot()));
 snap.queue=[{id:7001,case:'deva',who:'ชายชราขอทานหน้าวัด',name:'ชายชราขอทาน',pure:true,deeds:[],merits:[],lines:[]},...(snap.queue||[])];
 snap.held=[{id:7002,case:'deva',pure:true,deeds:[],merits:[],lines:[]}];snap.usedCases=['deva','girl'];
 const loaded=createGame();loaded.restore(snap);
 assert.ok(!loaded.queue.some(s=>s.case==='deva'));assert.ok(!loaded.held.some(s=>s.case==='deva'));
 assert.ok(loaded.usedCases.includes('girl'));
 // interim E3 save: pure 'monk' soul in the case-four slot is migrated to devaMonk
 const mid=createGame();mid.zoneCases.th=4;mid.zoneEvents.th={prisonBreak:'cleared'};
 mid.queue.unshift({id:7003,case:'monk',pure:true,deeds:[],merits:[],lines:[]});
 mid.ensureDevaCase();assert.equal(mid.queue.find(s=>s.id===7003).case,'devaMonk');
});

test('legacy case-five monk is refreshed as the innocent temple beggar without changing soul id',()=>{
 const g=createGame();g.zoneCases.th=4;g.zoneEvents.th={prisonBreak:'cleared'};
 g.queue=[{id:8001,case:'devaMonk',name:'พระจำวัด',who:'พระผู้จำวัด',sex:'monk',sp:'spirit-cleric',pure:true,deeds:[],merits:[],lines:[]}];
 g.ensureDevaCase();const soul=g.queue[0];
 assert.equal(soul.id,8001);assert.equal(soul.name,'ขอทานในวัด');assert.equal(soul.sex,'m');assert.equal(soul.sp,'soul-deva');assert.equal(soul.pure,true);assert.deepEqual(soul.deeds,[]);
 g.ensureDevaCase();assert.equal(g.queue.length,1);
});
