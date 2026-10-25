import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS, BAL } from '../src/data.js';
import { actorStanding } from '../src/actor-recovery.js';
const game = () => { const g=createGame(); g.save=()=>true; g.onChange=()=>{}; g.coin=10000; g.hireGuard(); return g; };
const tea = g => g.stations.push({def:STATIONS.find(s=>s.k==='tea'),build:0,slots:[],fire:0});
const reload = g => { const copy=game(); assert.ok(copy.restore(JSON.parse(JSON.stringify(g.snapshot())))); return copy; };
test('J3 bag rejects other recipients; Nira food restores hunger only and medicine HP only',()=>{
 const g=game();
 for (const c of [g.crewOf('taan'),g.guard]) {
  c.morale=1;c.hunger=10;g.inventory.food=1;g.inventory.health=1;g.food=7;
  assert.equal(g.useBag('food',c.id),false);assert.equal(g.useBag('health',c.id),false);
  assert.ok(g.giveCrewItem('food',c.id));assert.equal(c.hunger,10+BAL.feedHunger);assert.equal(c.morale,1);assert.equal(g.inventory.food,undefined);assert.equal(g.food,7);
  const hunger=c.hunger;assert.ok(g.giveCrewItem('health',c.id));assert.equal(c.morale,66);assert.equal(c.hunger,hunger);assert.equal(g.inventory.health,undefined);
  assert.equal(g.giveCrewItem('health',c.id),false);
  c.morale=100;c.hunger=100;g.inventory.food=1;g.inventory.health=1;
  assert.equal(g.giveCrewItem('food',c.id),false);assert.equal(g.giveCrewItem('health',c.id),false);assert.equal(g.inventory.food,1);assert.equal(g.inventory.health,1);
 }
 g.hp=1;g.inventory.health=1;assert.ok(g.useBag('health'));assert.ok(g.hp>1);
});
test('J3 fallen guard stays out of current battle, returns to map/reload at HP 1 without auto healing',()=>{
 const g=game();g.startBattle({id:99,who:'test',deserved:4,resist:true});g.guard.morale=1;
 g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[10,10];});
 const random=Math.random;Math.random=()=>.99;
 try { assert.ok(g.battleAct('atk')); } finally {Math.random=random;}
 assert.equal(g.guard.morale,1);assert.equal(g.enemyGuard(),null);assert.equal(g.guardActive(),false);assert.equal(g.battleAct('guard'),false);
 g.battle.over='win';g.endBattle();assert.equal(g.guard.morale,1);assert.ok(g.guardActive());
 const copy=reload(g);copy.updateActorRecovery(Date.now()+300000);assert.equal(copy.guard.morale,1);assert.ok(copy.guardActive());
});
test('J3 guard travels on map, rests exactly 120 s across saves, resumes original post and automatic combat slot',()=>{
 const g=game();tea(g);g.guard.morale=99;g.guard.at='patrol';g.guard.path=[[1,2]];g.guard.target=[1,2];
 const now=Date.now(), original=[g.guard.x,g.guard.y];assert.ok(g.restGuard(undefined,now));
 assert.equal(g.guard.at,null);assert.equal(g.guard.path,null);assert.equal(g.guard.target,null);assert.ok(g.guard.teaRest.path.length);
 assert.equal(g.restGuard(),false);assert.equal(g.guardActive(),false);assert.equal(actorStanding(g.guard),false);
 g.updateActorRecovery(now+1000);assert.notDeepEqual([g.guard.x,g.guard.y],original);
 let copy=reload(g);copy.updateActorRecovery(now+30000);const rest=copy.guard.teaRest;assert.equal(rest.phase,'rest');assert.equal(rest.until-rest.startedAt,120000);
 assert.deepEqual([copy.guard.x,copy.guard.y],rest.dest);const started=rest.startedAt;
 copy=reload(copy);copy.updateActorRecovery(started+119999);assert.equal(copy.guard.morale,99);assert.equal(copy.guardActive(),false);
 copy.inventory.health=1;assert.equal(copy.giveCrewItem('health',copy.guard.id),false);
 copy.startBattle({id:100,who:'next',deserved:4,resist:true});assert.equal(copy.enemyGuard(),null);assert.equal(copy.battleActors().some(c=>c.id===copy.guard.id),false);
 copy.battle=null;copy.updateActorRecovery(started+120000);assert.equal(copy.guard.morale,100);assert.equal(copy.guard.teaRest,null);assert.deepEqual([copy.guard.x,copy.guard.y],original);assert.ok(copy.guardActive());
 copy.startBattle({id:101,who:'after',deserved:4,resist:true});assert.equal(copy.enemyGuard(),copy.guard);
 const offline=reload(g);offline.updateActorRecovery(now+300000);assert.equal(offline.guard.morale,100);assert.equal(offline.guard.teaRest,null);
});
test('J3 UI exposes per actor bag-stock controls and current zone guard, without old bag or Nira bulk controls',()=>{
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 assert.doesNotMatch(ui,/data-bag-target|data-gift-nira|ส่งข้าวปั้นให้นิราแจกทีม/);
 assert.match(ui,/niraItemWidget\(c\) \+ guardRestWidget\(c\)/);assert.match(ui,/niraItemWidget\(g\.guard\)/);
 assert.match(ui,/g\.giveCrewItem\(b\.dataset\.niraItem, b\.dataset\.actorId\)/);
 assert.match(ui,/rest\.until-Date\.now\(\)/);assert.match(ui,/พักฟื้น — ไม่ร่วมต่อสู้/);
});
