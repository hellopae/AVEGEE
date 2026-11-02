import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {RECOVERY_MS,actorStanding} from '../src/actor-recovery.js';
import {teaRoomStaff,TEA_SEAT_COUNT} from '../src/tea-staff-rest.js';
import {migrateRosterSave} from '../src/roster.js';
import {harbourTravel} from './helpers/travel.mjs';
globalThis.Image??=class{};
const make=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=100000;g.level=5;g.bossCleared={th:true,asia:true,west:true};g.zoneEvents.th={frontierBreach:'cleared'};return g;};
test('a downed reaper occupies a real cushion for exactly 120 seconds; no battle re-entry',()=>{
 const g=make(),c=g.crewOf('taan'),now=Date.now();g.party.members=['taan'];g.startBattle({id:44,who:'test',deserved:4,resist:true});
 assert.equal(RECOVERY_MS,120000);assert.ok(g.downActor(c,now));assert.equal(actorStanding(c),false);
 assert.equal(teaRoomStaff(g).find(s=>s.actor===c).seat,c.teaRest.seat);assert.equal(c.teaRest.zone,'th');
 g.updateActorRecovery(now+119999);assert.equal(c.morale,0);assert.ok(c.teaRest);
 g.updateActorRecovery(now+120000);assert.equal(c.morale,50);assert.equal(c.recoverUntil,0);assert.equal(c.teaRest,null);
 assert.ok(!g.battleCrew().includes(c));g.battle=null;g.startBattle({id:45,who:'next',deserved:4,resist:true});assert.ok(g.battleCrew().includes(c));
});
test('JSON reload preserves recovery seat and remaining time, dormant home-zone crew recovers',()=>{
 const g=make(),c=g.crewOf('taan'),now=Date.now();g.downActor(c,now);const seat=c.teaRest.seat;
 assert.ok(harbourTravel(g,'asia'));assert.equal(teaRoomStaff(g).length,0);
 const copy=make();assert.ok(copy.restore(JSON.parse(JSON.stringify(g.snapshot()))));const a=copy.roster['th:taan'];
 assert.equal(a.teaRest.seat,seat);assert.equal(a.recoverUntil,now+120000);
 copy.updateActorRecovery(now+119999);assert.equal(a.morale,0);copy.updateActorRecovery(now+120000);assert.equal(a.morale,50);assert.equal(a.teaRest,null);
 assert.ok(harbourTravel(copy,'th'));assert.equal(copy.crewOf('taan').morale,50);
});
test('legacy 60-second deadline migrates once while retaining elapsed time and input',()=>{
 const now=1000000;const raw={zone:'th',crew:[{k:'taan',morale:0,recoverUntil:now+30000}],party:{}};
 const d=migrateRosterSave(raw,now),a=d.roster['th:taan'];assert.equal(a.recoverUntil,now+90000);assert.equal(a.recoveryVersion,2);
 assert.equal(raw.crew[0].recoverUntil,now+30000);assert.equal(migrateRosterSave(d,now+10000).roster['th:taan'].recoverUntil,a.recoverUntil);
 const zero=migrateRosterSave({zone:'th',crew:[{k:'taan',morale:0}],party:{}},now);assert.equal(zero.roster['th:taan'].recoverUntil,now+120000);
});
test('full tea room never double-books a cushion; waiting recovery still respects original deadline',()=>{
 const g=make(),now=Date.now(),c=g.crewOf('taan');
 g.workerState.workers=Array.from({length:TEA_SEAT_COUNT},(_,seat)=>({id:'worker:'+seat,teaRest:{phase:'rest',zone:'th',seat,startedAt:now,until:now+120000,returnAt:[1,1]}}));
 g.downActor(c,now);assert.equal(c.teaRest.phase,'recovery-wait');assert.equal(c.teaRest.seat,null);assert.equal(teaRoomStaff(g).length,15);
 g.workerState.workers[4].teaRest=null;g.updateActorRecovery(now+1000);assert.equal(c.teaRest.seat,4);assert.equal(c.teaRest.until,now+120000);
 g.updateActorRecovery(now+120000);assert.equal(c.morale,50);assert.equal(c.teaRest,null);
});
