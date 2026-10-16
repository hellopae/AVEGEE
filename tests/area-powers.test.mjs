import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {BATTLE} from '../src/data.js';
function fight(hp=100) {
 const g=createGame();g.save=()=>true;g.onChange=()=>{};
 g.startBattle({id:700,name:'คู่ซ้อม',who:'คู่ซ้อม',sp:1,deserved:20});
 g.battle.foes=[0,1,2].map(i=>({id:`foe-${i}`,hp,maxHp:hp,atk:[7+i,7+i],stun:0,confuse:0,who:`คู่ซ้อม ${i}`,sp:1}));
 g.battle.selectedFoeId='foe-1';g.battle.counterIndex=0;
 g.mp=g.mpMax=100;g.abilities.ice=g.abilities.windFan=g.abilities.hypno=g.abilities.valkyrieSpear=true;
 return g;
}
test('ice deals immediate damage to all living foes and suppresses exactly one counter turn',()=>{
 const g=fight(), b=g.battle, hp=b.youHp;
 b.foes.push({id:'already-down',hp:0,maxHp:100,stun:0,confuse:0});
 assert.equal(g.battleAct('ice'),true);
 assert.deepEqual(b.foes.map(f=>f.hp),[70,70,70,0]);
 assert.equal(b.youHp,hp);assert.ok(b.foes.every(f=>f.stun===0));
 assert.equal(g.mp,100-BATTLE.mpCost.ice);assert.equal(b.dmg.foeHits.length,3);
 assert.deepEqual(b.mid.foes.map(f=>f.hp),[70,70,70,0]);
 g.battleAct('atk');assert.ok(b.youHp<hp,'counter resumes next player turn');
});
test('wind damages every foe once, charges MP once, and does not freeze them',()=>{
 const g=fight(),b=g.battle,hp=b.youHp;
 g.battleAct('windFan');assert.deepEqual(b.foes.map(f=>f.hp),[64,64,64]);
 assert.equal(g.mp,100-BATTLE.mpCost.wind);assert.ok(b.youHp<hp);
 assert.ok(b.foes.every(f=>f.stun===0));
});
test('hypnosis makes every foe attack a different foe in the same enemy phase',()=>{
 const g=fight(),b=g.battle,hp=b.youHp;
 g.battleAct('hypno');assert.equal(b.youHp,hp);
 assert.deepEqual(b.foes.map(f=>f.hp),[91,93,92]);
 assert.equal(b.dmg.confuseHits.length,3);
 assert.ok(b.dmg.confuseHits.every(h=>h.attackerId!==h.id));
 assert.ok(b.foes.every(f=>f.confuse===0));
 assert.deepEqual(b.mid.foes.map(f=>f.hp),[100,100,100]);
 assert.equal(g.mp,100-BATTLE.mpCost.hypno);
});
test('area kills finish battle; hypnosis handles simultaneous kills and a single survivor',()=>{
 for(const action of ['ice','windFan','hypno']){
  const g=fight(5),b=g.battle;g.battleAct(action);
  assert.equal(b.over,'win');assert.ok(b.foes.every(f=>f.hp===0));
 }
 const g=fight();g.battle.foes=g.battle.foes.slice(1,2);
 g.battleAct('hypno');assert.equal(g.battle.foes[0].hp,92);
});

test('Valkyrie spear hits every living target at the original damage, MP cost and cooldown',async()=>{
 const {yamaSkillRemaining,YAMA_SKILL_SECONDS}=await import('../src/yama-cooldown.js');
 const g=fight(200),b=g.battle;b.foes.push({id:'down',hp:0,maxHp:200});
 assert.equal(g.battleAct('valkyrieSpear'),true);
 assert.deepEqual(b.foes.map(f=>f.hp),[112,112,112,0]);assert.equal(b.dmg.area,true);
 assert.equal(b.dmg.foeHits.length,3);assert.equal(g.mp,100-BATTLE.mpCost.spear);
 assert.equal(yamaSkillRemaining(b,'valkyrieSpear'),YAMA_SKILL_SECONDS.valkyrieSpear);
 const mp=g.mp;assert.equal(g.battleAct('valkyrieSpear'),false);assert.equal(g.mp,mp);
});
test('spear area kills all targets and single-target sword/fire stay unchanged',()=>{
 const spear=fight(40);spear.battleAct('valkyrieSpear');assert.equal(spear.battle.over,'win');
 for(const key of ['atk','fire']){const g=fight(1000),b=g.battle;g.battleAct(key);assert.equal(b.foes[0].hp,1000);assert.equal(b.foes[2].hp,1000);assert.ok(b.foes[1].hp<1000);assert.equal(b.dmg.area,false);}
});
