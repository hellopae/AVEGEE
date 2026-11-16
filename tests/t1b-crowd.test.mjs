// T1b (owner 16 Nov): the wandering ghosts (mob) and the resisting spirits (soul) are harder - group move + heavy blow from the central boss-move rulebook, longer fights, fitted rows.
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {CROWD_SKILLS,crowdSkillsFor} from '../src/boss-skills-data.js';
import {ENCOUNTER_BALANCE} from '../src/encounter-balance.js';
import {hasSkills} from '../src/boss-skills.js';
import {setup} from '../scripts/sim-balance2.mjs';
globalThis.Image??=class{set src(v){}};

test('T1b: ordinary foes have a group move and a heavy blow, each announced a turn ahead, with TH + EN text and no full-screen card',()=>{
 for(const kind of ['mob','soul']){
  assert.deepEqual(CROWD_SKILLS[kind].map(s=>s.kind),['groupHit','heavyHit'],kind);
  for(const s of CROWD_SKILLS[kind]){
   assert.ok((s.warn??1)>=1,`${kind}/${s.id} is warned`);
   for(const k of ['name','warnText','useText'])assert.ok(s[k].th&&s[k].en,`${kind}/${s.id}.${k} both languages`);
   assert.ok(s.power<=2,'no move above x2.0');
   if(s.kind==='groupHit')assert.equal(s.noCard,true,'a small foe has no card');
  }
 }
 assert.notEqual(crowdSkillsFor('mob'),CROWD_SKILLS.mob,'a foe owns a copy');assert.equal(crowdSkillsFor('boss'),undefined);
});
test('T1b: a mob and a soul fight start with the moves, the zone and a fitted HP / ATK row for every team size of the zone',()=>{
 const sizes={th:[1,2,3,4],asia:[2,3,4,5],west:[3,4,5,6],cyberhell:[4,5,6,7]};
 for(const kind of ['mob','soul'])for(const [zone,list] of Object.entries(sizes))for(const size of list){
  const g=setup({zone,size,kind,moves:false,seed:7}),b=g.battle;g.prepareEncounter();
  assert.equal(b.kind,kind);assert.equal(b.zone,zone);assert.ok(hasSkills(b.foes[0]),`${kind}/${zone}/${size} has moves`);
  const row=ENCOUNTER_BALANCE[`${zone}:${kind}`]?.[size];assert.ok(row&&row.hp>1&&row.atk>0,`${kind}/${zone}/${size} fitted row`);
  assert.equal(b.balance.partySize,size);
 }
});
test('T1b: a team size without its own row takes the nearest fitted one (a fallen / small team)',async()=>{
 const {scaleEncounter}=await import('../src/party-balance.js');
 const row=ENCOUNTER_BALANCE['cyberhell:mob'];
 const mk=()=>({kind:'mob',zone:'cyberhell',foeAtk:[10,20],foes:[{id:'f',hp:100,maxHp:100,atk:[10,20]}]});
 const small=mk(),near=mk();scaleEncounter(small,2);scaleEncounter(near,4);
 assert.equal(small.foes[0].maxHp,near.foes[0].maxHp,'size 2 uses the size-4 row');assert.equal(near.foes[0].maxHp,Math.round(100*row[4].hp));
 assert.deepEqual(small.foes[0].atk,near.foes[0].atk);
});
test('T1b: the group move hits every ally with no card (noCard), the heavy blow one; both are warned first',()=>{
 const g=setup({zone:'west',size:4,kind:'mob',moves:false,seed:11}),b=g.battle;
 g.prepareEncounter();b.foes[0].maxHp=1e7;b.foes[0].hp=5e6;b.foes[0].atk=[1,1];   // half HP: the heavy blow (hpBelow .7) is allowed too
 b.youHp=b.youMax=1e6;
 let warned=false,group=null,heavy=false;
 for(let i=0;i<120&&!(group&&heavy);i++){
  const t=g.beginBattleTurns();
  if(t.side==='foe'){g.runEnemyTurn();
   if(b.skillNotice?.phase==='warn')warned=true;
   if(b.ultimate&&b.ultimate.skill)group=b.ultimate;
   if(b.skillNotice?.phase==='use'&&!b.ultimate)heavy=true;
   b.ultimate=null;}
  else{b.youHp=b.youMax;g.battleActors().forEach(a=>{if(a.id!=='you')a.morale=100;});g.confirmBattleCommand('defend');}
  g.finishBattleCommand();
 }
 assert.ok(warned,'announced a turn ahead');assert.ok(group,'the group move ran');assert.equal(group.noCard,true);assert.equal(group.image,null);assert.ok(group.damage>0);assert.ok(heavy,'the heavy blow ran');
});
test('T1b: the battle screen treats a card-less group move like a banner move (no cut-scene card, not the solo dash)',()=>{
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 assert.match(ui,/if \(ultimate\?\.noCard\) return false;/);
 assert.match(ui,/b\.skillNotice&&\(!b\.ultimate\|\|b\.ultimate\.noCard\)/);
 assert.match(ui,/!attacker\.skills\?\.length/);
});
