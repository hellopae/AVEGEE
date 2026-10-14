import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';import {FRONTIER} from '../src/data.js';
import {DUNGEON_CHECKPOINTS,DUNGEON_EXIT} from '../src/dungeon-view.js';
globalThis.Image=class {};
const setup=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;return g;};
const visit=game=>{
 game.bossCleared[game.zone]=true;game.player.x=FRONTIER.x;game.player.y=FRONTIER.y;
 const target=({th:'asia',asia:'west',west:'cyberhell'})[game.zone];
 assert.equal(game.beginBorderDungeon(target),true);
 for(const [x,y] of DUNGEON_CHECKPOINTS){game.zoneTravel.active.position={x,y};const b=game.startDungeonEncounter();assert.ok(b);b.foes.forEach(f=>{f.hp=1;f.atk=[0,0];});game.beginBattleTurns();assert.ok(game.confirmBattleCommand('atk'));game.finishBattleCommand();assert.equal(b.over,'win');game.endBattle();}
 assert.equal(game.moveZone(target),false,'clearing fights alone is not exit proximity');
 game.zoneTravel.active.position={x:DUNGEON_EXIT[0],y:DUNGEON_EXIT[1]};assert.equal(game.moveZone(target),true);return target;
};
test('physical border, checkpoint and city exit guards are enforced by game methods',()=>{
 const g=setup();g.bossCleared.th=true;assert.equal(g.moveZone('asia'),false);assert.equal(g.beginBorderDungeon('asia'),false);
 g.player.x=FRONTIER.x;g.player.y=FRONTIER.y;assert.equal(g.beginBorderDungeon('asia'),true);assert.equal(g.startDungeonEncounter(),null);
 g.zoneTravel.active.position={x:DUNGEON_CHECKPOINTS[0][0],y:DUNGEON_CHECKPOINTS[0][1]};g.hireGuard();assert.ok(g.startDungeonEncounter(),'city guard does not block a dungeon fight');
});
test('real dungeon victories unlock arrival then dock interaction, keeping local cities on boat return',()=>{
 const g=setup(),stations=g.stations.map(s=>s.def.k);assert.equal(visit(g),'asia');
 assert.equal(g.zoneTravel.visited.asia,true);assert.equal(g.zoneTravel.ports.asia,undefined);
 assert.equal(g.moveZone('th'),false);assert.equal(g.activatePort(),false);
 const p=g.harbourPoint();Object.assign(g.player,p);assert.equal(g.activatePort(),true);assert.equal(g.moveZone('th'),true);
 assert.deepEqual(g.stations.map(s=>s.def.k),stations);assert.ok(g.atHarbour());assert.ok(g.crewOf('nira'));
 assert.equal(g.moveZone('asia'),true);assert.ok(g.atHarbour());assert.equal(g.zoneTravel.ports.asia,true);
});
test('dungeon encounter cleanup leaves ordinary city mobs intact and saves checkpoint position',()=>{
 const g=setup();g.bossCleared.th=true;Object.assign(g.player,{x:FRONTIER.x,y:FRONTIER.y});g.beginBorderDungeon('asia');
 const [x,y]=DUNGEON_CHECKPOINTS[0];g.zoneTravel.active.position={x,y};
 g.mobs.push({id:'city-mob',kind:0,x:1920,y:1700});const b=g.startDungeonEncounter();g.mobs.push({id:'other-mob',kind:0,x:1920,y:1800});
 b.foes.forEach(f=>f.hp=1);g.battleAct('atk');assert.equal(b.over,'win');g.endBattle();
 assert.deepEqual(g.mobs.map(m=>m.id),['city-mob','other-mob']);assert.equal(g.zoneTravel.active.checkpoint,1);
 const saved=g.snapshot(),loaded=setup();assert.equal(loaded.restore(saved),true);
 assert.deepEqual(loaded.zoneTravel.active.position,{x,y});assert.equal(loaded.zoneTravel.active.checkpoint,1);
});
