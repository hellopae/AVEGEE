import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
const setup=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.hire('taan');g.party.members=['taan'];g.startBattle({id:99,who:'test',deserved:4,resist:true});g.prepareEncounter();g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[10,10];});return g;};
test('each living ally and enemy gets a distinct turn; commands cannot bypass the active unit',()=>{
 const g=setup(),b=g.battle,c=g.crewOf('taan');g.beginBattleTurns();
 assert.equal(g.currentBattleTurn().id,'you');assert.equal(g.selectBattleActor(c.id),false);
 const hp=b.youHp;assert.equal(g.confirmBattleCommand('atk'),true);assert.equal(b.youHp,hp,'enemy cannot counter during allied turn');
 assert.equal(g.confirmBattleCommand('atk'),false,'duplicate locked');g.finishBattleCommand();
 assert.equal(g.currentBattleTurn().side,'foe');assert.equal(g.confirmBattleCommand('atk'),false);
 assert.equal(g.runEnemyTurn(),true);assert.equal(b.dmg.counterFoeId,b.foes[0].id);g.finishBattleCommand();
 // F3: the lone enemy acts as often as the team (2 standing = 2 enemy turns a round), woven between the team's turns
 assert.equal(g.currentBattleTurn().id,c.id);assert.equal(g.confirmBattleCommand('strike'),true);g.finishBattleCommand();
 assert.equal(g.currentBattleTurn().side,'foe');assert.equal(g.runEnemyTurn(),true);g.finishBattleCommand();
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
 const g=setup(),b=g.battle;g.beginBattleTurns();for(const kind of ['zoneBoss','mob','frontier','zoneEvent','soul']){b.kind=kind;assert.equal(g.confirmBattleCommand('flee'),false,kind);assert.equal(b.over,null);}   // FB3-BT1: nothing can flee
});

// F3 (owner 15 Nov): the enemy side acts as many times per round as the team has members standing.
import {orderRound,foeTurnTotal,TURN_RULE} from '../src/battle-turns.js';
const units=(a,f,fs=9)=>[...Array.from({length:a},(_,i)=>({id:'a'+i,side:'ally',speed:12-i})),...Array.from({length:f},(_,i)=>({id:'f'+i,side:'foe',speed:fs-i}))];
const ids=q=>q.map(x=>x.id).join(' ');
test('F3: foe turns per round = team size (never fewer than one each); the old rule is ratio 0',()=>{
 assert.equal(TURN_RULE.ratio,1);
 assert.equal(foeTurnTotal(4,1),4);assert.equal(foeTurnTotal(5,2),5);assert.equal(foeTurnTotal(1,1),1);assert.equal(foeTurnTotal(2,3),3,'more foes than team: one turn each, nothing added');assert.equal(foeTurnTotal(4,1,0),1);
 assert.equal(ids(orderRound(units(3,1))),'a0 f0 a1 f0 a2 f0');
 assert.equal(ids(orderRound(units(5,2))),'a0 f0 a1 f1 a2 f0 a3 f1 a4 f0','extra turns go to the fastest foe, round-robin');
 assert.equal(ids(orderRound(units(1,1))),'a0 f0','1 v 1 is unchanged');
 assert.equal(ids(orderRound(units(2,3))),'a0 a1 f0 f1 f2','more foes than team: the old speed order');
 assert.equal(ids(orderRound(units(4,1),0)),'a0 a1 a2 a3 f0','ratio 0 = old rule');
});
test('F3: no two turns of the foe side touch each other when the team can keep them apart (a warned move always leaves us a turn), also across the round change',()=>{
 for(let a=2;a<=8;a++)for(let f=1;f<a;f++)for(const fs of [5,9,20]){
  const q=orderRound(units(a,f,fs));
  assert.equal(q.length,a+Math.max(f,a),`${a}v${f}`);
  for(let i=0;i<q.length-1;i++)assert.ok(!(q[i].side==='foe'&&q[i+1].side==='foe'),`${a}v${f} speed ${fs}: ${ids(q)}`);
  assert.ok(!(q[0].side==='foe'&&q.at(-1).side==='foe'),`round change ${a}v${f}: ${ids(q)}`);
 }
});
test('F3: the visible timeline lists the repeated turns and a lone boss warned on one turn is used only after one of our turns',()=>{
 const g=setup(),b=g.battle;g.party.members=['taan'];g.beginBattleTurns();
 const line=g.battleTimeline();assert.equal(line.filter(u=>u.side==='foe').length,4,'two rounds of the queue = 2 + 2 enemy turns');
 for(let i=0;i<line.length-1;i++)assert.ok(!(line[i].side==='foe'&&line[i+1].side==='foe'));
});
