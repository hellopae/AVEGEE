import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {DUNGEON_PATROLS,initializeZoneTravel,beginDungeon,nextDungeonEncounter,resolveDungeonEncounter,dungeonStatus,canTravelZone} from '../src/zone-travel.js';
import {dungeonEnemyPositions,dungeonAutoEncounter,dungeonPoint,dungeonWalkable,dungeonAtPatrol} from '../src/dungeon-view.js';
const setup=()=>{const g=createGame();g.save=()=>{};g.onChange=()=>{};g.bossCleared.th=true;initializeZoneTravel(g);beginDungeon(g,'asia');return g;};
const at=(g,p)=>g.zoneTravel.active.position={x:p[0],y:p[1]};
test('six extra patrols move only on the walkable road and proximity chooses their real encounter',()=>{
 const g=setup();const first=dungeonEnemyPositions(g,0).find(e=>e.patrol);
 assert.equal(dungeonEnemyPositions(g).length,9);
 assert.notDeepEqual(first.position,dungeonEnemyPositions(g,1300).find(e=>e.id===first.id).position);
 for(let t=0;t<12000;t+=330)for(const e of dungeonEnemyPositions(g,t).filter(e=>e.patrol))assert.ok(dungeonWalkable(e.position));
 at(g,first.position);assert.equal(dungeonAutoEncounter(g,first.position).patrol,first.id);assert.ok(dungeonAtPatrol(g,first.id));
 const b=g.startDungeonEncounter({patrol:first.id});assert.ok(b?.dungeonToken);assert.equal(g.startDungeonEncounter({patrol:first.id}),null);
 b.over='win';g.endBattle();assert.equal(dungeonEnemyPositions(g).some(e=>e.id===first.id),false);
 assert.equal(dungeonStatus(g).checkpoint,0);assert.equal(canTravelZone(g,'asia'),false);
 const restored=createGame();restored.save=()=>{};assert.ok(restored.restore(g.snapshot()));assert.equal(dungeonEnemyPositions(restored).some(e=>e.id===first.id),false);
});
test('patrols cannot start remotely or via forged ids and stale results cannot grant victory',()=>{
 const g=setup(),p=DUNGEON_PATROLS[0];at(g,dungeonPoint(0));assert.equal(g.startDungeonEncounter({patrol:p.id}),null);
 assert.equal(nextDungeonEncounter(g,'th:asia:patrol:999'),null);
 at(g,dungeonPoint(p.progress));const b=g.startDungeonEncounter({patrol:p.id});assert.ok(b);
 assert.equal(resolveDungeonEncounter(g,'forged',true),false);b.over='flee';g.endBattle();
 assert.equal(g.zoneTravel.active.patrolDefeated.length,0);assert.equal(g.dungeonChaseCooldown,true);
 assert.equal(dungeonAutoEncounter(g,dungeonPoint(p.progress)),null);
 assert.ok(g.zoneTravel.active.position.x!==dungeonPoint(p.progress)[0]);
});
test('patrol victories persist but never impersonate story checkpoints, including after the cave',()=>{
 const g=setup();for(const p of DUNGEON_PATROLS){const e=nextDungeonEncounter(g,p.id);assert.ok(e);assert.equal(resolveDungeonEncounter(g,e.token,true),true);assert.equal(resolveDungeonEncounter(g,e.token,true),false);}
 assert.equal(dungeonStatus(g).checkpoint,0);assert.equal(g.zoneTravel.active.patrolDefeated.length,6);
 const other=setup();for(let i=0;i<3;i++){const e=nextDungeonEncounter(other);resolveDungeonEncounter(other,e.token,true);}
 assert.equal(dungeonStatus(other).ready,true);assert.equal(dungeonEnemyPositions(other).length,6);
 at(other,dungeonPoint(DUNGEON_PATROLS[5].progress));const b=other.startDungeonEncounter({patrol:DUNGEON_PATROLS[5].id});assert.ok(b);b.over='win';other.endBattle();assert.equal(dungeonStatus(other).ready,true);assert.equal(dungeonEnemyPositions(other).length,5);
});
test('restore clears interrupted patrol tokens for retry and rejects unknown saved patrol evidence',()=>{
 const g=setup();const e=nextDungeonEncounter(g,DUNGEON_PATROLS[1].id);const saved=structuredClone(g.zoneTravel);
 saved.active.patrolDefeated=[DUNGEON_PATROLS[0].id,'forged'];initializeZoneTravel(g,saved);
 assert.deepEqual(g.zoneTravel.active.patrolDefeated,[DUNGEON_PATROLS[0].id]);assert.equal(g.zoneTravel.active.pending,null);
 assert.equal(resolveDungeonEncounter(g,e.token,true),false);assert.ok(nextDungeonEncounter(g,DUNGEON_PATROLS[1].id));
});
