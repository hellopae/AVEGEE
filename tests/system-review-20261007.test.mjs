import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,deservedOf} from '../src/game.js';
import {authorityOf} from '../src/data.js';
import {authorityPunishmentCutscene} from '../src/narrative-cutscenes.js';
import {SENTENCE_COLORS,sentenceColor,sentenceColorGuide} from '../src/sentence-colors.js';
const zones=['th','asia','west','cyberhell'];
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
const red={score:20,karma:0,tham:20,ked:20,rab:20,over:0,short:0};
test('red warnings escalate per regional authority, persist, and end in cauldron/tea recovery',()=>{
 for(const zone of zones){
  const g=game();g.zone=zone;g.hp=g.hpMax;const hp=g.hp;const soul={id:99,said:[],deeds:[{s:'bian',w:5}],pure:false};
  g.applyVerdict({...red},soul);assert.equal(g.hp,hp);assert.equal(g.pendingWarn.n,1);assert.equal(g.pendingWarn.fireball,false);
  g.applyVerdict({...red},soul);assert.ok(g.hp<hp);assert.equal(g.pendingWarn.n,2);assert.equal(g.pendingWarn.fireball,true);
  g.applyVerdict({...red},soul);assert.equal(g.pendingWarn.n,3);assert.equal(g.dadFight,true);
  const copy=game();copy.restore(g.snapshot());assert.equal(copy.pendingWarn.n,3);assert.equal(copy.dadFight,true);
  copy.pendingWarn=null;copy.startDadFight();assert.equal(copy.battle.who,authorityOf(zone).full);
  const restart=game();restart.restore(copy.snapshot());assert.ok(restart.dadFight,'reload must not bypass head punishment');
  assert.equal(copy.battleAct('atk'),true);assert.equal(copy.battle.over,'lose');assert.equal(copy.battle.ultimate.image,authorityPunishmentCutscene(zone));
  copy.endBattle();assert.equal(copy.hp,1);assert.ok(copy.pendingDadPunish);assert.equal(copy.pendingRecovery.stage,'sleep');
  const mp=copy.mp;copy.completeTeaRecovery();assert.equal(copy.hp,copy.hpMax);assert.equal(copy.mp,mp);
 }
});
test('every regional boss ultimate hits Yama, both companions and Guard; ordinary counter hits one',()=>{
 for(const zone of zones){
  const g=game();g.zone=zone;g.coin=10000;g.hire('boon');g.party.members=['taan','boon'];g.hireGuard();
  g.startBattle({id:99,who:'boss test',deserved:4});const B=g.battle;
  B.kind='zoneBoss';B.zone=zone;B.foes=[{id:'boss',who:'boss',sp:'zone-boss',boss:true,hp:400,maxHp:1000,atk:[10,10],stun:0,confuse:0}];B.selectedFoeId='boss';
  const actors=g.battleActors();assert.equal(actors.length,4);const before=new Map(actors.map(a=>[a.id,a.morale]));
  g.battleAct('atk');assert.ok(B.ultimate);assert.deepEqual(B.dmg.enemyHits.map(h=>h.id).sort(),actors.map(a=>a.id).sort());
  if(zone==='th')assert.equal(B.ultimate.image,'img/zone-boss-cutscene.jpeg');
  for(const c of actors.filter(a=>a.id!=='you'))assert.equal(c.morale,before.get(c.id)-B.ultimate.damage);
  B.foes[0].hp=900;B.ultimate=null;g.battleAct('atk');assert.equal(B.ultimate,null);assert.equal(B.dmg.enemyHits.length,1);
 }
});
test('zone-one event boss uses its own cutscene rather than frontier artwork',()=>{
 const g=game();g.startBattle({id:99,who:'test',deserved:4});const B=g.battle;B.kind='zoneEvent';B.zone='th';B.eventKey='test';
 B.foes[0].sp='zone-boss';B.foes[0].boss=true;B.foes[0].maxHp=1000;B.foes[0].hp=400;B.foes[0].atk=[10,10];
 g.battleAct('atk');assert.equal(B.ultimate.image,'img/zone-boss-cutscene.jpeg');
});
test('confession stays tied to temple-land/drug claim and does not reveal unrelated supplement fraud',()=>{
 const g=game();const unrelated={s:'kong',w:4,t:'ขายอาหารเสริมปลอม อ้างว่ารักษามะเร็ง',known:false};
 for(const deed of [{s:'kong',w:5,t:'โกงที่ดินวัด',known:true},{s:'mao',w:4,t:'ส่งยาให้เด็กมัธยม',known:true}]){
  const soul={deeds:[deed,unrelated]};assert.deepEqual(g.pressDeeds(soul,{kind:'deny',sin:deed.s,deedIndex:0}),[deed]);
  assert.deepEqual(g.pressDeeds(soul,{kind:'deny',sin:deed.s}),[deed]);assert.equal(unrelated.known,false);
 }
});
test('five intensity colors map consistently; mitigating deeds subtract from the sentence',()=>{
 assert.equal(SENTENCE_COLORS.length,5);assert.notEqual(sentenceColor(0).color,sentenceColor(1).color);
 for(let i=1;i<=5;i++){assert.equal(sentenceColor(i),SENTENCE_COLORS[i-1]);assert.equal(sentenceColor(-i),sentenceColor(i));assert.ok(sentenceColorGuide.includes(`${i}`));}
 assert.equal(deservedOf({deeds:[{w:5},{w:2},{w:-1}],merits:[{v:2,fake:false}]}),2);
});

test('procedural claims keep both visible and hidden deeds interrogatable without changing subjects',()=>{
 const g=game();g.nextNamedCase=()=>null;
 for(let i=0;i<30;i++){
  g.queue=[];g.spawnSoul();const soul=g.queue[0];assert.ok(soul);
  for(const line of soul.lines.filter(l=>l.kind==='deny')){const deed=soul.deeds[line.deedIndex];assert.ok(line.t.includes(deed.t));assert.deepEqual(g.pressDeeds(soul,line),[deed]);}
  if(soul.deeds.some(d=>!d.known))assert.ok(soul.lines.some(l=>Number.isInteger(l.deedIndex)&&!soul.deeds[l.deedIndex].known));
 }
});
test('special cooldown remains locked until exactly two minutes of battle time',()=>{
 const g=game();g.party.members=['taan'];g.startBattle({id:99,who:'test',deserved:4});g.battle.foes[0].hp=g.battle.foes[0].maxHp=10000;g.battle.foes[0].atk=[0,0];
 assert.equal(g.battleAct('crew:taan'),true);const c=g.crewOf('taan');g.advanceBattleTime(119999);
 assert.equal(g.crewCooldown(c),1);assert.equal(g.battleAct('crew:taan'),false);
 g.advanceBattleTime(1);assert.equal(g.crewCooldown(c),0);assert.equal(g.battleAct('crew:taan'),true);
});
