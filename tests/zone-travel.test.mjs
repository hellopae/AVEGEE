import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeZoneTravel, beginDungeon, nextDungeonEncounter, resolveDungeonEncounter,
  canTravelZone, finishZoneArrival, activateHarbour, harbourDestinations, leaveDungeon, dungeonStatus } from '../src/zone-travel.js';
const game = () => { const g={zone:'th',bossCleared:{},zoneSave:{}}; initializeZoneTravel(g); return g; };
const winRoute = g => { for(let i=0;i<3;i++) { const encounter=nextDungeonEncounter(g); assert.ok(encounter); assert.equal(resolveDungeonEncounter(g, encounter.token, true),true); } };
test('boss victory opens only adjacent dungeon and cannot skip straight into next city',()=>{
 const g=game(); assert.equal(beginDungeon(g,'asia'),false); g.bossCleared.th=true;
 assert.equal(canTravelZone(g,'asia'),false); assert.equal(beginDungeon(g,'west'),false);
 assert.equal(beginDungeon(g,'asia'),true); assert.equal(beginDungeon(g,'asia'),false);
 assert.equal(canTravelZone(g,'asia'),false); winRoute(g);
 assert.equal(canTravelZone(g,'asia'),true); assert.equal(canTravelZone(g,'west'),false);
});
test('loss retries current checkpoint; unrelated and duplicate battle results do not advance',()=>{
 const g=game(); g.bossCleared.th=true; beginDungeon(g,'asia');
 const e=nextDungeonEncounter(g); assert.equal(nextDungeonEncounter(g),null);
 assert.equal(resolveDungeonEncounter(g,'forged',true),false);
 assert.equal(resolveDungeonEncounter(g,e.token,false),true); assert.equal(dungeonStatus(g).checkpoint,0);
 const retry=nextDungeonEncounter(g); assert.notEqual(retry.token,e.token);
 assert.equal(resolveDungeonEncounter(g,e.token,true),false);
 assert.equal(resolveDungeonEncounter(g,retry.token,true),true);
 assert.equal(resolveDungeonEncounter(g,retry.token,true),false); assert.equal(dungeonStatus(g).checkpoint,1);
});
test('first arrival requires route completion, then separate harbour activation unlocks boat return',()=>{
 const g=game(); g.bossCleared.th=true; beginDungeon(g,'asia'); winRoute(g);
 assert.equal(finishZoneArrival(g,'th','asia','dungeon'),false); // move must happen first
 g.zone='asia'; assert.equal(finishZoneArrival(g,'th','asia','dungeon'),true);
 assert.equal(g.zoneTravel.visited.asia,true); assert.equal(g.zoneTravel.ports.asia,undefined);
 assert.equal(canTravelZone(g,'th'),false); assert.equal(activateHarbour(g),true);
 assert.deepEqual(harbourDestinations(g),['th']); assert.equal(canTravelZone(g,'th'),true);
 g.zone='th'; assert.equal(finishZoneArrival(g,'asia','th','boat'),true);
 assert.equal(canTravelZone(g,'asia'),true); assert.equal(canTravelZone(g,'west'),false);
});
test('restore preserves cleared checkpoints but resets in-flight combat for a safe retry',()=>{
 const g=game(); g.bossCleared.th=true; beginDungeon(g,'asia');
 let e=nextDungeonEncounter(g); resolveDungeonEncounter(g,e.token,true); e=nextDungeonEncounter(g);
 const saved=JSON.parse(JSON.stringify(g.zoneTravel)); initializeZoneTravel(g,saved);
 assert.equal(dungeonStatus(g).checkpoint,1); assert.equal(dungeonStatus(g).pending,null);
 const retry=nextDungeonEncounter(g); assert.notEqual(retry.token,e.token);
 assert.equal(resolveDungeonEncounter(g,e.token,true),false);
});
test('legacy migration preserves actually visited towns without unlocking boss-only destinations',()=>{
 const g={zone:'asia',zoneSave:{th:{},fake:{}},bossCleared:{th:true,asia:true}};
 initializeZoneTravel(g); assert.deepEqual(harbourDestinations(g),['th']);
 assert.equal(g.zoneTravel.visited.west,undefined); assert.equal(canTravelZone(g,'west'),false);
});
test('invalid saved route indices/evidence and unknown ports cannot unlock travel',()=>{
 const g=game(); g.bossCleared.th=true;
 initializeZoneTravel(g,{version:1,visited:{th:true},ports:{th:true,west:true,fake:true},active:{route:'th:asia',checkpoint:3,cleared:[],attempt:0}});
 assert.equal(g.zoneTravel.active,null); assert.equal(g.zoneTravel.ports.west,undefined);
 g.zoneTravel.active={route:'th:asia',checkpoint:3,cleared:[],pending:null};
 assert.equal(canTravelZone(g,'asia'),false); assert.equal(nextDungeonEncounter(g),null);
});
test('busy states prevent travel, dock activation, leaving and new encounters',()=>{
 const g=game(); g.bossCleared.th=true; g.battle={}; assert.equal(beginDungeon(g,'asia'),false);
 g.battle=null; beginDungeon(g,'asia'); g.battle={};
 assert.equal(nextDungeonEncounter(g),null); assert.equal(leaveDungeon(g),false); assert.equal(activateHarbour(g),false);
 g.battle=null; assert.equal(leaveDungeon(g),true);
});
test('each subsequent boss gates its own route and full route chain visits all cities',()=>{
 const g=game(); const zones=['th','asia','west','cyberhell'];
 for(let i=0;i<3;i++) {
  const from=zones[i],to=zones[i+1]; assert.equal(beginDungeon(g,to),false);
  g.bossCleared[from]=true; assert.equal(beginDungeon(g,to),true); winRoute(g);
  assert.equal(canTravelZone(g,to),true); g.zone=to; assert.equal(finishZoneArrival(g,from,to,'dungeon'),true);
  assert.equal(activateHarbour(g),true);
 }
 assert.deepEqual(harbourDestinations(g),['th','asia','west']);
});
