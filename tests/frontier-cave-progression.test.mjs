import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {FRONTIER} from '../src/data.js';
import {DUNGEON_CHECKPOINTS,DUNGEON_EXIT,DUNGEON_CORRIDOR,dungeonWalkable,dungeonSegmentClear,dungeonMove,dungeonPath,dungeonEnemyPositions,dungeonAutoEncounter} from '../src/dungeon-view.js';
import {beginDungeon,initializeZoneTravel,nextDungeonEncounter,resolveDungeonEncounter,dungeonStatus,canTravelZone} from '../src/zone-travel.js';
globalThis.Image=class {};
test('outer trail opens after border defense; the cave boss still gates zone 2',()=>{
 const g={zone:'th',bossCleared:{},zoneEvents:{th:{frontierBreach:'cleared',thBorderBoss:'pending'}}};initializeZoneTravel(g);
 assert.equal(beginDungeon(g,'asia'),true);
 for(let n=0;n<2;n++){const e=nextDungeonEncounter(g);assert.equal(e.boss,false);assert.equal(resolveDungeonEncounter(g,e.token,true),true);}
 const boss=nextDungeonEncounter(g);assert.equal(boss.boss,true);
 assert.equal(resolveDungeonEncounter(g,boss.token,true),false,'a generic fight result cannot impersonate the story boss victory');
 assert.equal(canTravelZone(g,'asia'),false);
 g.bossCleared.th=true;g.zoneEvents.th.thBorderBoss='cleared';
 assert.equal(resolveDungeonEncounter(g,boss.token,true),true);assert.equal(dungeonStatus(g).ready,true);
 assert.equal(canTravelZone(g,'asia'),true);
});
test('the physical cave encounter launches the story boss with cave scenery',()=>{
 const g=createGame();g.save=()=>{};g.onChange=()=>{};
 g.zoneEvents.th={prisonBreak:'cleared',devaTest:'cleared',frontierBreach:'cleared',thBorderBoss:'pending'};
 g.zoneCases.th=10;g.player.x=FRONTIER.x;g.player.y=FRONTIER.y;
 assert.equal(g.beginBorderDungeon('asia'),true);
 for(let n=0;n<2;n++){const e=nextDungeonEncounter(g);resolveDungeonEncounter(g,e.token,true);}
 const [x,y]=DUNGEON_CHECKPOINTS[2];g.zoneTravel.active.position={x,y};
 const b=g.startDungeonEncounter();assert.equal(b.eventKey,'thBorderBoss');assert.equal(b.sceneBiome,'cave');assert.ok(b.dungeonToken);
 assert.equal(g.moveZone('asia'),false);
 b.over='win';g.bossCleared.th=true;g.zoneEvents.th.thBorderBoss='cleared';g.endBattle();
 assert.equal(g.zoneTravel.active.checkpoint,3);
 g.zoneTravel.active.position={x:DUNGEON_EXIT[0],y:DUNGEON_EXIT[1]};assert.equal(g.moveZone('asia'),true);
});

test('free movement supports broad clearings, blocks ravines, and routes around the painted bends',()=>{
 const entry=DUNGEON_CORRIDOR[0],cave=DUNGEON_CHECKPOINTS[2];
 assert.equal(dungeonWalkable([cave[0]+.05,cave[1]]),true,'can move sideways across cave clearing');
 assert.equal(dungeonWalkable([.65,.53]),false,'cannot walk into waterfall chasm');
 assert.deepEqual(dungeonMove(entry,[.65,.53]),entry,'a large step cannot cross a ravine');
 const path=dungeonPath(entry,DUNGEON_EXIT);assert.ok(path.length>4);
 let at=entry;for(const p of path){assert.equal(dungeonSegmentClear(at,p),true);at=p;}
 assert.deepEqual(path.at(-1),DUNGEON_EXIT);
});
test('several enemies roam; proximity starts an available encounter once and future victories persist',()=>{
 const g={zone:'th',bossCleared:{},zoneEvents:{th:{frontierBreach:'cleared',thBorderBoss:'pending'}}};initializeZoneTravel(g);beginDungeon(g,'asia');
 const foes=dungeonEnemyPositions(g,0);assert.equal(foes.length,3);assert.equal(foes[2].locked,true);
 assert.notDeepEqual(dungeonEnemyPositions(g,1000)[0].position,foes[0].position);
 assert.equal(dungeonAutoEncounter(g,DUNGEON_CORRIDOR[0]),null);
 const second=foes[1];assert.equal(dungeonAutoEncounter(g,second.position).checkpoint,1);
 const e=nextDungeonEncounter(g,1);assert.ok(e);assert.equal(dungeonAutoEncounter(g,second.position),null,'pending token prevents repeated dispatch');
 resolveDungeonEncounter(g,e.token,true);assert.equal(dungeonStatus(g).checkpoint,0);
 const saved=JSON.parse(JSON.stringify(g.zoneTravel));initializeZoneTravel(g,saved);
 assert.equal(dungeonEnemyPositions(g).length,2,'defeated mob stays gone after restoring');
 const first=nextDungeonEncounter(g,0);resolveDungeonEncounter(g,first.token,true);
 assert.equal(dungeonStatus(g).checkpoint,2);assert.equal(dungeonEnemyPositions(g)[0].locked,false);
});
