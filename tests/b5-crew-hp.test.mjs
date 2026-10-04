import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { weightedTarget } from '../src/actor-recovery.js';
import { readFileSync } from 'node:fs';
import { standPoints } from '../src/npc-stand.js';
import { hitActor } from '../src/scene.js';
import { STATIONS } from '../src/data.js';
globalThis.Image ??= class {};
const game = () => { const g=createGame(); g.save=()=>true; g.onChange=()=>{}; return g; };
const battle = () => { const g=game(); g.coin=10000; g.hire('taan'); g.party.members=['taan']; g.hireGuard();
 g.startBattle({id:99,who:'test',deserved:4,resist:true});
 g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[10,10];}); return g; };
test('weights are exactly Guard 3 / Yama 2 / each crew 1; recovery cannot be targeted',()=>{
 const c={id:'th:taan',morale:100}, guard={id:'th:guard',morale:100};
 const counts={}; for(let i=0;i<600;i++){const id=weightedTarget([c],guard,()=>(i+.5)/600).id;counts[id]=(counts[id]||0)+1;}
 assert.deepEqual(counts, {you:200,'th:taan':100,'th:guard':300});
 c.recoverUntil=1;guard.morale=0;assert.equal(weightedTarget([c],guard,()=>.99).id,'you');
});
test('actual counters hit crew and Guard, down excludes actions, map discs and clicks',()=>{
 for(const [random,key] of [[.4,'taan'],[.99,'guard']]){
 const g=battle(), actor=key==='guard'?g.guard:g.crewOf(key);actor.morale=5;
 const original=Math.random;Math.random=()=>random;
 try { assert.equal(g.battleAct('atk'),true); } finally {Math.random=original;}
 assert.equal(g.battle.dmg.targetActorId,actor.id);assert.equal(actor.morale,0);assert.ok(actor.recoverUntil>Date.now());
 assert.equal(g.battleAct(key==='guard'?'guard':'crew:taan'),false);
 assert.ok(!g.battleCrew().includes(actor));assert.ok(!standPoints(g).some(p=>p[0]===actor.x&&p[1]===actor.y));
 assert.equal(g.feedCrew(key),false);
 actor.x=500;actor.y=800;assert.notDeepEqual(hitActor(g,500,800),{kind:key==='guard'?'guard':'crew',key:key==='guard'?0:key});
 }
});
test('60 real seconds including reload, no regeneration/items, restore 50 exactly once and join next battle',()=>{
 const g=battle(), c=g.crewOf('taan');const now=Date.now();g.downActor(c,now);g.food=10;
 const copy=game();copy.restore(g.snapshot());const actor=copy.roster[c.id];
 copy.updateActorRecovery(now+59999);assert.equal(actor.morale,0);assert.equal(copy.feedCrew('taan'),false);
 copy.step();assert.equal(actor.morale,0);
 copy.updateActorRecovery(now+60000);assert.equal(actor.morale,50);assert.equal(actor.recoverUntil,0);
 actor.morale=49;copy.updateActorRecovery(now+90000);assert.equal(actor.morale,49);
 // Battle itself is deliberately not persisted by the existing save schema.
 g.updateActorRecovery(now+60000);assert.equal(c.morale,50);assert.ok(!g.battleCrew().includes(c));
 g.battle=null;g.startBattle({id:100,who:'next',deserved:4,resist:true});assert.ok(g.battleCrew().includes(c));
 const guard=g.guard;g.downActor(guard,now);const saved=game();saved.restore(g.snapshot());
 saved.updateActorRecovery(now+59999);assert.equal(saved.guard.morale,0);assert.equal(saved.hireGuard(),false);
 saved.updateActorRecovery(now+60000);assert.equal(saved.guard.morale,50);
 saved.guard.morale=47;saved.updateActorRecovery(now+90000);assert.equal(saved.guard.morale,47);
});
test('Yama loss stages persist through return, sleep, Nira wake; spare heart precedes loss',()=>{
 const g=battle();g.battle.over='lose';g.battle.youHp=0;g.endBattle();
 for(const stage of ['return','sleep','wake']){g.pendingRecovery.stage=stage;const copy=game();copy.restore(g.snapshot());assert.equal(copy.pendingRecovery.stage,stage);}
 g.finishTeaSleep();assert.equal(g.pendingRecovery.stage,'wake');g.completeTeaRecovery();assert.equal(g.hp,g.hpMax);assert.equal(g.pendingRecovery,null);
 const h=battle();h.inventory.spareHeart=1;h.battle.youHp=1;const old=Math.random;Math.random=()=>0;
 try{h.battleAct('atk');}finally{Math.random=old;}assert.equal(h.battle.over,null);assert.ok(h.battle.youHp>0);assert.equal(h.inventory.spareHeart,undefined);
});
test('six final actors retain distinct HP and CD; cooldown stops paused/hidden and survives reload',()=>{
 const g=game();g.restore(JSON.parse(readFileSync(new URL('./fixtures/b1-v3.json',import.meta.url))));
 const ids=['th:taan','asia:taan','west:taan','cyberhell:taan','th:kan','west:boon'];
 g.zone='cyberhell';g.party.finalMembers=ids;
 g.battle={kind:'zoneEvent',eventKey:'cyberFinal',encounter:'ruler:th',team:ids};
 for(const id of ids){g.roster[id].morale=92;g.roster[id].recoverUntil=0;g.roster[id].helpRemainingMs=15000;}
 assert.equal(g.battleCrew().length,6);g.paused=true;g.advanceBattleTime(3000);assert.equal(g.roster[ids[0]].helpRemainingMs,15000);
 g.paused=false;g.advanceBattleTime(3000);assert.equal(g.roster[ids[0]].helpRemainingMs,12000);
 const prev=globalThis.document;globalThis.document={hidden:true};try{g.advanceBattleTime(3000);}finally{globalThis.document=prev;}
 assert.equal(g.roster[ids[0]].helpRemainingMs,12000);
 const copy=game();copy.restore(g.snapshot());assert.equal(copy.roster[ids[0]].helpRemainingMs,12000);
});

test('down worker stops station progress and movement; last special action still resolves at zero morale',()=>{
 const g=game(), c=g.crewOf('taan');
 const st={def:STATIONS.find(s=>s.k==='lokan'),crewK:'taan',build:0,fire:0,slots:[{progress:0,need:100000,soul:{}}]};
 g.stations.push(st);c.at='lokan';c.x=500;c.y=800;g.downActor(c);g.step();
 assert.equal(st.slots[0].progress,0);assert.equal(g.workingCrew.has('taan'),false);
 const x=c.x,y=c.y;g.stepWorld(100);assert.equal(c.x,x);assert.equal(c.y,y);
 const h=battle(), last=h.crewOf('taan');last.morale=6;h.battle.foes[0].atk=[0,0];
 assert.equal(h.battleAct('crew:taan'),true);assert.ok(h.battle.dmg.foe>0);assert.ok(last.recoverUntil);assert.equal(last.morale,0);
});
