import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
const setup=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.hire('taan');g.party.members=['taan'];g.startBattle({id:99,who:'test',deserved:4,resist:true});g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[10,10];});return g;};
test('each living ally and enemy gets a distinct turn; commands cannot bypass the active unit',()=>{
 const g=setup(),b=g.battle,c=g.crewOf('taan');g.beginBattleTurns();
 assert.equal(g.currentBattleTurn().id,'you');assert.equal(g.selectBattleActor(c.id),false);
 const hp=b.youHp;assert.equal(g.confirmBattleCommand('atk'),true);assert.equal(b.youHp,hp,'enemy cannot counter during allied turn');
 assert.equal(g.confirmBattleCommand('atk'),false,'duplicate locked');g.finishBattleCommand();
 assert.equal(g.currentBattleTurn().side,'foe');assert.equal(g.confirmBattleCommand('atk'),false);
 assert.equal(g.runEnemyTurn(),true);assert.equal(b.dmg.counterFoeId,b.foes[0].id);g.finishBattleCommand();
 assert.equal(g.currentBattleTurn().id,c.id);assert.equal(g.confirmBattleCommand('strike'),true);g.finishBattleCommand();
 assert.equal(g.currentBattleTurn().id,'you');assert.equal(b.turnQueue.round,2);
});
test('dead foes drop out and every remaining enemy acts once per round',()=>{
 const g=setup(),b=g.battle;b.foes.push({...b.foes[0],id:'second',hp:1,maxHp:1,speed:15});g.beginBattleTurns();
 assert.equal(g.currentBattleTurn().id,'second');g.runEnemyTurn();g.finishBattleCommand();
 b.foes[1].hp=0;assert.equal(g.currentBattleTurn().id,'you');
 assert.ok(!g.battleTimeline().some(u=>u.id==='second'));
});
test('defense lasts through enemy turns, reduces damage and expires on actor next action',()=>{
 const g=setup();g.party.members=[];const b=g.battle;g.beginBattleTurns();
 assert.equal(g.confirmBattleCommand('defend'),true);g.finishBattleCommand();const hp=b.youHp;
 g.runEnemyTurn();assert.equal(hp-b.youHp,5);g.finishBattleCommand();
 assert.equal(g.confirmBattleCommand('atk'),true);assert.equal(b.defending.you,undefined);
});
test('queue survives JSON save shape and a new wave starts a fresh round',()=>{
 const g=setup(),b=g.battle;g.beginBattleTurns();g.confirmBattleCommand('atk');g.finishBattleCommand();
 b.turnQueue=JSON.parse(JSON.stringify(b.turnQueue));assert.equal(g.currentBattleTurn().side,'foe');
 b.wave=2;b.foes=[{...b.foes[0],id:'new-wave'}];g.beginBattleTurns();
 assert.equal(g.currentBattleTurn().id,'you');assert.equal(b.turnQueue.round,1);
});

test('queued hypnosis redirects each enemy on its own turn, and burns tick only on that enemy turn',()=>{
 const g=setup(),b=g.battle;g.abilities.hypno=true;g.mp=100;b.foes.push({...b.foes[0],id:'second'});g.beginBattleTurns();
 assert.equal(g.confirmBattleCommand('hypno'),true);g.finishBattleCommand();
 const hp=b.foes.map(f=>f.hp);assert.equal(g.runEnemyTurn(),true);
 assert.equal(b.foes[0].hp,hp[0]);assert.equal(b.foes[1].hp,hp[1]-10);g.finishBattleCommand();
 b.foes[1].burn={turns:2,dmg:5};const first=b.foes[0].hp;g.runEnemyTurn();
 assert.equal(b.foes[1].burn.turns,1);assert.equal(b.foes[0].hp,first-10);g.finishBattleCommand();
 const remaining=b.foes[1].burn.turns;g.confirmBattleCommand('strike');assert.equal(b.foes[1].burn.turns,remaining);
});
test('retreat cannot skip a dungeon checkpoint or bypass a story boss',()=>{
 const g=setup(),b=g.battle;g.beginBattleTurns();b.kind='zoneBoss';assert.equal(g.confirmBattleCommand('flee'),false);assert.equal(b.over,null);
 b.kind='mob';assert.equal(g.confirmBattleCommand('flee'),true);assert.equal(b.over,'flee');
});
