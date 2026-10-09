import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ITEMS, STATIONS, BAL } from '../src/data.js';
import { actorStanding, weightedTarget } from '../src/actor-recovery.js';
import { medicineResult } from '../src/progression.js';
import { snapshotRoster } from '../src/roster.js';
import { t, setLang } from '../src/i18n.js';
import { readFileSync } from 'node:fs';
const game = () => { const g=createGame(); g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.hireGuard();return g; };
const tea = g => g.stations.push({def:STATIONS.find(s=>s.k==='tea'),build:0,slots:[],fire:0});
test('G1 all four item families restore only the specified resource, round and cap by maximum',()=>{
 for(const k of Object.keys(ITEMS).filter(k=>/^(food|health|tea|holyWater)(Z[234])?$/.test(k))){
  const hp=/^(food|health)/.test(k), ratio=/^(food|tea)/.test(k) ? .30 : .65;
  const result=medicineResult(k,1,137,1,72,'battle');
  assert.equal(result.hp, hp ? 1+Math.round(137*ratio) : 1,k);
  assert.equal(result.mp, hp ? 1 : 1+Math.round(72*ratio),k);
  assert.equal(medicineResult(k,137,137,72,72),null);
  const capped=medicineResult(k,136,137,71,72);
  assert.equal(hp ? capped.hp : capped.mp, hp ? 137 : 72);
 }
 const g=game();g.hp=10;g.mp=0;g.inventory.tea=1;assert.ok(g.useBag('tea'));assert.equal(g.hp,10);assert.equal(g.mp,12);
});
test('G1 rice balls and medicine heal real crew and Guard in bag; hunger and stock remain correct',()=>{
 const g=game();
 for(const c of [g.crewOf('taan'),g.guard]){
  c.morale=10;c.hunger=0;g.inventory.food=2;g.inventory.health=1;
  assert.ok(g.useBag('food',c.id));assert.equal(c.morale,40);assert.equal(c.hunger,BAL.feedHunger);assert.equal(g.inventory.food,1);
  assert.ok(g.useBag('health',c.id));assert.equal(c.morale,100);assert.equal(g.inventory.health,undefined);
  c.hunger=100;assert.equal(g.useBag('food',c.id),false);assert.equal(g.inventory.food,1);
  g.inventory.tea=1;assert.equal(g.useBag('tea',c.id),false);assert.equal(g.inventory.tea,1);
 }
 g.guard.morale=10;g.guard.hunger=0;g.food=1;assert.ok(g.feedCrew('guard'));assert.equal(g.guard.morale,40);assert.equal(g.guard.hunger,BAL.feedHunger);assert.equal(g.food,0);
});
test('G1 battle recipient commands heal crew/Guard, also feed hunger, never give MP to crew',()=>{
 const g=game();g.party.members=['taan'];g.startBattle({id:99,who:'test',deserved:4,resist:true});
 g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[0,0];});
 for(const c of [g.crewOf('taan'),g.guard]){
  c.morale=10;c.hunger=0;g.inventory.food=1;g.inventory.health=1;
  assert.ok(g.confirmBattleCommand('food',c.id));assert.equal(c.morale,40);assert.equal(c.hunger,BAL.feedHunger);g.finishBattleCommand();
  assert.ok(g.confirmBattleCommand('health',c.id));assert.equal(c.morale,100);g.finishBattleCommand();
  g.inventory.tea=1;assert.equal(g.confirmBattleCommand('tea',c.id),false);assert.equal(g.inventory.tea,1);
 }
});
test('G1 Guard rest requires built pavilion, HP below 50 and available actor',()=>{
 const g=game();g.guard.morale=49;assert.equal(g.restGuard(),false);tea(g);g.stations.at(-1).build=1;assert.equal(g.restGuard(),false);
 g.stations.at(-1).build=0;g.guard.morale=50;assert.equal(g.restGuard(),false);
 g.guard.morale=0;assert.equal(g.restGuard(),false);g.guard.morale=49;assert.ok(g.restGuard());assert.equal(g.restGuard(),false);
});
test('G1 travel, save/load, sixty-second rest, inactivity, full HP and original post survive real serialization',()=>{
 const g=game();tea(g);g.guard.morale=20;const original=[g.guard.x,g.guard.y],now=Date.now();
 assert.ok(g.restGuard(undefined,now));assert.equal(g.guard.teaRest.phase,'travel');assert.equal(actorStanding(g.guard),false);assert.equal(g.guardActive(),false);
 assert.equal(weightedTarget([],g.guard,()=>.99).id,'you');
 g.updateActorRecovery(now+1000);assert.notDeepEqual([g.guard.x,g.guard.y],original);
 const save=JSON.parse(JSON.stringify(g.snapshot())),clone=game();assert.ok(clone.restore(save));assert.deepEqual(clone.guard.teaRest,g.guard.teaRest);
 clone.updateActorRecovery(now+30000);assert.equal(clone.guard.teaRest.phase,'rest');
 const started=clone.guard.teaRest.startedAt;assert.equal(clone.guard.teaRest.until-started,60000);
 const copied=snapshotRoster(clone.roster);clone.guard.teaRest.returnAt[0]+=1;assert.notEqual(copied[clone.guard.id].teaRest.returnAt[0],clone.guard.teaRest.returnAt[0]);clone.guard.teaRest.returnAt[0]-=1;
 const reloaded=game();assert.ok(reloaded.restore(JSON.parse(JSON.stringify(clone.snapshot()))));
 reloaded.updateActorRecovery(started+59999);assert.equal(reloaded.guard.morale,20);assert.equal(reloaded.guardActive(),false);
 assert.equal(reloaded.feedCrew('guard'),false);reloaded.inventory.health=1;assert.equal(reloaded.useBag('health',reloaded.guard.id),false);
 reloaded.updateActorRecovery(started+60000);assert.equal(reloaded.guard.morale,100);assert.equal(reloaded.guard.teaRest,null);assert.deepEqual([reloaded.guard.x,reloaded.guard.y],original);assert.ok(reloaded.guardActive());
 reloaded.guard.morale=97;reloaded.updateActorRecovery(started+90000);assert.equal(reloaded.guard.morale,97);
});
test('G1 old saves load without rest fields; offline completion and dormant branch rest remain valid',()=>{
 const g=game();const old=JSON.parse(JSON.stringify(g.snapshot()));delete old.roster;delete old.rosterVersion;assert.ok(g.restore(old));assert.ok(g.guardActive());
 tea(g);g.guard.morale=20;assert.ok(g.restGuard(undefined,Date.now()-180000));g.updateActorRecovery();assert.equal(g.guard.morale,100);assert.equal(g.guard.teaRest,null);
});
test('G1 translated controls, bag targets, HP/progress widgets and animated pavilion use real shared state',()=>{
 const previous=globalThis.document;globalThis.document={documentElement:{}};
 try{for(const lang of ['th','en']){setLang(lang);for(const key of ['g1.rest','g1.needTea','g1.travel','g1.resting','g1.target','g1.food.desc','g1.tea.desc','g1.health.desc','g1.holyWater.desc'])assert.notEqual(t(key),key);}}finally{setLang('th');globalThis.document=previous;}
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),room=readFileSync(new URL('../src/room.js',import.meta.url),'utf8');
 assert.match(ui,/data-bag-target/);assert.match(ui,/c\.morale < 50/);assert.match(ui,/data-tea-rest-panel/);assert.match(ui,/guardRestWidget\(g\.guard\)/);
 assert.match(room,/c\.teaRest\.phase === 'rest'/);assert.match(room,/drawCrewWalk\(ctx,key/);
});
