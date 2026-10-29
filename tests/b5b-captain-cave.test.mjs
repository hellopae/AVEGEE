import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {routeRow,routeCaptainCave} from '../src/route-geometry.js';
import {initializeZoneTravel,beginDungeon,dungeonStatus,nextDungeonEncounter,resolveDungeonEncounter,finishZoneArrival} from '../src/zone-travel.js';
import {dungeonWalkable,dungeonPath,dungeonPoint} from '../src/dungeon-view.js';
const fresh=()=>{const g=createGame();g.zone='asia';g.save=()=>true;g.onChange=()=>{};g.zoneEvents.asia={asiaRageBreach:'cleared'};return g;};
test('B5b zone2: refuge is on connected owner floor and keeps all checkpoints and ruler encounter separate',()=>{
 const cave=routeCaptainCave('asia:west');assert.equal(cave.zone,'asia');assert.ok(dungeonWalkable(cave.position,'asia:west'));assert.ok(dungeonPath(dungeonPoint(0,'asia:west'),cave.position,'asia:west').length);
 assert.equal(routeRow('asia:west').bossCave,null);assert.equal(routeCaptainCave('west:cyberhell'),null);assert.equal(routeRow('west:cyberhell').enabled,true);
});
test('B5b zone2: cleared invasion permits visiting captain but cannot bypass the ruler or enter zone3',()=>{
 const g=fresh();initializeZoneTravel(g);assert.ok(beginDungeon(g,'west'));
 for(let i=0;i<3;i++){const e=nextDungeonEncounter(g);assert.ok(e);assert.ok(resolveDungeonEncounter(g,e.token,true));}
 assert.equal(dungeonStatus(g).ready,false);assert.equal(finishZoneArrival(g,'asia','west','dungeon'),false);
 g.zoneTravel.active.position={x:.55,y:.72};assert.equal(g.challengeCanTalk(),true);assert.equal(g.challengeCanTalk({x:.39,y:.70}),false);
 const coin=g.coin,copy=createGame();copy.restore(g.snapshot());assert.equal(copy.challengeCanTalk(),true);assert.equal(copy.coin,coin);assert.equal(!!copy.bossCleared.asia,false);
 copy.bossCleared.asia=true;assert.equal(dungeonStatus(copy).ready,true);
});
test('B5b zone2: no refuge talk before unlock, at a distance, during battle or sentencing',()=>{
 const g=fresh();initializeZoneTravel(g);beginDungeon(g,'west');g.zoneTravel.active.position={x:.55,y:.72};
 assert.equal(g.challengeCanTalk(),true);g.battle={};assert.equal(g.challengeCanTalk(),false);g.battle=null;
 g.bossJustice={version:1,active:'captain',ledger:{captain:{zone:'asia',phase:'trial'}}};assert.equal(g.challengeCanTalk(),false);g.bossJustice.active=null;
 g.zoneTravel.active.position={x:.13,y:.22};assert.equal(g.challengeCanTalk(),false);g.zoneTravel.active.position={x:.55,y:.72};g.zoneEvents.asia.asiaRageBreach='pending';assert.equal(g.challengeCanTalk(),false);
});
