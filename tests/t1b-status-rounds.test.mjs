// T1b (owner 16 Nov): freeze / hypnosis / fire put on a foe last in ROUNDS of the foe - the count is multiplied by the foe's turns per round (battle-turns.js F3).
import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
const setup=(members)=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;
 for(const k of members)g.hire(k);g.party.members=[...members];
 g.startBattle({id:99,who:'test',deserved:4,resist:true});g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[10,10];});g.beginBattleTurns();return g;};
test('T1b: one freeze stops the foe for its whole round (3 turns when the team is 3)',()=>{
 const g=setup(['taan','dam']),b=g.battle;g.abilities.ice=true;g.mp=100;
 assert.equal(g.foeActsPerRound(b.foes[0].id),3);
 assert.equal(g.confirmBattleCommand('ice'),true);
 assert.equal(b.foes[0].stun,3,'1 round = all 3 turns of the foe');
});
test('T1b: a lone yama (1 foe turn a round) still freezes exactly 1 turn - nothing changes for the old fights',()=>{
 const g=setup([]),b=g.battle;g.abilities.ice=true;g.mp=100;
 assert.equal(g.foeActsPerRound(b.foes[0].id),1);
 assert.equal(g.confirmBattleCommand('ice'),true);assert.equal(b.foes[0].stun,1);
});
test('T1b: hypnosis lasts the foe\'s whole round and each self-blow is its 1/n share (same total as one full blow)',()=>{
 const g=setup(['taan','dam']),b=g.battle;g.abilities.hypno=true;g.mp=100;
 assert.equal(g.confirmBattleCommand('hypno'),true);
 assert.equal(b.foes[0].confuse,3);
 g.finishBattleCommand();
 let hit=0;const hp0=b.foes[0].hp;
 for(let i=0;i<8&&b.turnQueue.remaining.length;i++){
  const t=g.currentBattleTurn();if(t.side==='foe'){g.runEnemyTurn();g.finishBattleCommand();if(b.foes[0].confuse<3)break;}
  else{g.confirmBattleCommand('defend');g.finishBattleCommand();}
 }
 hit=hp0-b.foes[0].hp;assert.ok(hit>0&&hit<=10,'a confused blow on itself is ~10/3, not 10 ('+hit+')');
});
test('T1c: fire lasts the foe\'s rounds (ticks = turns x its turns per round) but the TOTAL is what it was before F3',()=>{
 for(const [members,n] of [[[],1],[['taan'],2],[['taan','dam'],3]]){
  const g=setup(members),b=g.battle,f=b.foes[0];
  assert.equal(g.foeActsPerRound(f.id),n);
  g.tickFoeBurn(b,f,{turns:2,dmg:5});
  assert.equal(f.burn.turns,2*n,'lasts 2 rounds');
  const hp0=f.hp;let ticks=0;
  while(f.burn){g.tickFoeBurn(b,f,null);ticks++;assert.ok(ticks<=2*n);}
  assert.equal(ticks,2*n);assert.equal(hp0-f.hp,10,'total fire damage = turns x dmg = 10, as before F3 (n='+n+')');
 }
});
test('T1c: the same total holds for an odd split (7 x 3 turns a round = 14, no rounding drift)',()=>{
 const g=setup(['taan','dam']),b=g.battle,f=b.foes[0];
 g.tickFoeBurn(b,f,{turns:2,dmg:7});const hp0=f.hp;while(f.burn)g.tickFoeBurn(b,f,null);
 assert.equal(hp0-f.hp,14);
});
test('T1b: the texts say rounds, not a fixed number of turns',async()=>{
 const {t}=await import('../src/i18n.js');
 assert.match(t('profile.power.ice'),/รอบ/);
 assert.match(t('weapon.effect.burn',{chance:15,hp:5,turns:2,cap:8}),/2 รอบ/);
});
