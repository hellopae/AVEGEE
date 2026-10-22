import test from 'node:test';
import assert from 'node:assert/strict';
import {spiritTrait,lockSoulTrait,traitKeyFor,keeperRole,hiddenIssues,revealOneIssue,justiceCorrect,keeperWorkPlan,KAN_SUPPORT} from '../src/interrogation.js';

const caseSoul=()=>({deeds:[{t:'กรรมที่เปิดแล้ว',s:'kong',w:4,known:true},
  {t:'เหตุบรรเทาที่ซ่อน',s:'kong',w:-1,known:false},{t:'สำนวนชั้นแรก',s:'bian',w:2,known:true,visible:false}],
 merits:[{t:'บุญจริง',v:1,fake:false},{t:'บุญปลอม',v:3,fake:true}],secret:'เรื่องที่ปิดไว้',said:[],
 denied:'ยังปฏิเสธ',lines:[{kind:'deny',used:false}],resist:false,deserved:2});

test('traits use accessible text, icons and matching keepers without deriving sentence weight',()=>{
 const soul=caseSoul(),original=structuredClone(soul),trait=spiritTrait(soul);
 assert.equal(trait.key,'concealing');assert.equal(trait.keeper,'kan');assert.ok(trait.icon&&trait.label&&trait.color);
 assert.deepEqual(soul,original,'reading a trait does not reveal or mutate evidence');
 const red=spiritTrait({deeds:[],merits:[],resist:true,deserved:1});assert.equal(red.key,'resisting');assert.equal(red.keeper,'plerng');
 const green=spiritTrait({deeds:[{w:5,known:true}],merits:[],deserved:5});assert.equal(green.key,'accepting');assert.equal(green.keeper,'boon');
 assert.notEqual(red.color,green.color);assert.notEqual(red.color,trait.color);
 assert.equal(spiritTrait({pure:true,calm:true,deeds:[],resist:true}).key,'accepting');
});

test('Kan opens one issue at a time, including mitigation, sealed records, false claims and secrets',()=>{
 const soul=caseSoul();assert.deepEqual(hiddenIssues(soul),[{kind:'deed',index:1},{kind:'deed',index:2},{kind:'merit',index:1},{kind:'secret'}]);
 let line=revealOneIssue(soul);assert.equal(line.kind,'truth');assert.match(line.text,/เหตุบรรเทาที่ซ่อน/);
 assert.equal(soul.deeds[1].known,true);assert.equal(soul.deeds[1].visible,true);
 assert.equal(soul.deeds[2].visible,false);assert.equal(soul.merits[1].exposed,undefined);assert.equal(soul.secretSeen,undefined);
 assert.equal(soul.deserved,2,'assistance never adjusts the deserved sentence');assert.equal(soul.said.length,0,'caller owns announcement');
 assert.equal(hiddenIssues(soul).length,3);assert.equal(spiritTrait(soul).key,'concealing');
 line=revealOneIssue(soul);assert.match(line.text,/สำนวนชั้นแรก/);assert.equal(soul.deeds[2].visible,true);
 line=revealOneIssue(soul);assert.match(line.text,/บุญปลอม/);assert.equal(soul.merits[1].exposed,true);assert.equal(soul.merits[0].fake,false);
 line=revealOneIssue(soul);assert.match(line.text,/เรื่องที่ปิดไว้/);assert.equal(soul.secretSeen,true);
 assert.deepEqual(hiddenIssues(soul),[]);assert.equal(revealOneIssue(soul),null);
});

test('P2: the trait is locked on court entry — opening the truth, answering denials or losing a fight never changes it',()=>{
 let soul=caseSoul();soul.traitKey='concealing';
 while(hiddenIssues(soul).length)revealOneIssue(soul);
 assert.equal(spiritTrait(soul).key,'concealing','evidence can be exposed and the colour stays');
 soul=JSON.parse(JSON.stringify(soul));assert.equal(spiritTrait(soul).key,'concealing','survives save/load');
 soul.denied=null;soul.lines[0].used=true;soul.resist=true;soul.beaten=true;assert.equal(spiritTrait(soul).key,'concealing');
 assert.equal(soul.repentant,undefined,'the behavior badge cannot claim repentance');
 const fresh={deeds:[],merits:[],resist:true};assert.equal(spiritTrait(fresh).key,'resisting','a never-locked soul reads the same rule');
 assert.equal(lockSoulTrait(fresh).traitKey,'resisting');fresh.resist=false;assert.equal(lockSoulTrait(fresh).traitKey,'resisting','locking twice keeps the first value');
 const junk={traitKey:'nonsense',deeds:[],merits:[]};assert.equal(spiritTrait(junk).key,'accepting');assert.equal(lockSoulTrait(junk).traitKey,'accepting');
});

test('justice requires the appropriate destination and exact sentence; keeper stats or high scores do not excuse errors',()=>{
 const exact={destinationCorrect:true,tham:88,short:0,over:0,score:100};assert.equal(justiceCorrect(exact),true,'primary destination may handle a multi-sin case');
 assert.equal(justiceCorrect({...exact,destinationCorrect:false,tham:100}),false,'explicit station accuracy overrides boosted matching score');
 assert.equal(justiceCorrect({...exact,over:1}),false);assert.equal(justiceCorrect({...exact,short:1}),false);
 assert.equal(justiceCorrect({tham:100,short:0,over:0}),true,'legacy verdict compatibility');
 assert.equal(justiceCorrect({tham:99,short:0,over:0,score:100}),false);
 assert.equal(justiceCorrect({heaven:true,right:true,score:0}),true);
 assert.equal(justiceCorrect({heaven:true,right:false,short:0,over:0,tham:100,score:100}),false);
 assert.equal(justiceCorrect({destinationCorrect:true,score:100}),false);
 for(const value of [undefined,null,{},100])assert.equal(justiceCorrect(value),false);
});

test('all five roles describe an advantage and a visible tradeoff; other keepers remain available',()=>{
 for(const key of ['taan','boon','plerng','dam','kan']){
  const role=keeperRole(key);assert.equal(role.key,key);assert.ok(role.name&&role.benefit&&role.cost);assert.equal(Object.isFrozen(role),true);
 }
 assert.equal(keeperRole('pleng'),keeperRole('plerng'));
 assert.equal(keeperRole('unknown').key,'ordinary');assert.match(keeperRole('unknown').benefit,/ตามปกติ/);
 assert.deepEqual(KAN_SUPPORT,{mpCost:4,moraleCost:4,cooldownMs:30000});
 assert.equal(keeperRole('kan').mpCost,4);assert.match(keeperRole('kan').cost,/30/);
});

test('work plans snapshot only public behavior and explicit costs, without revealing hidden answers',()=>{
 const soul=caseSoul(),before=structuredClone(soul),taan=keeperWorkPlan(soul,'taan');
 assert.equal(taan.completionOrder,2);assert.equal(taan.requiresJustice,true);assert.equal(Object.isFrozen(taan),true);
 const boon=keeperWorkPlan(soul,'boon');assert.equal(boon.speedMultiplier,1/1.2);assert.equal(boon.completionKarma,-1);
 const fire=keeperWorkPlan({...soul,deeds:[],merits:[],secret:null},'plerng');assert.equal(fire.foodCost,2);assert.equal(fire.resistanceControl,true);
 assert.equal(keeperWorkPlan(soul,'plerng').resistanceControl,false,'concealment does not automatically imply resistance');
 assert.equal(keeperWorkPlan(soul,'dam').crowdSupport,true);
 const preview=JSON.stringify([taan,boon,fire,keeperWorkPlan(soul,'kan')]);
 for(const hidden of ['เหตุบรรเทาที่ซ่อน','บุญปลอม','เรื่องที่ปิดไว้','deserved','station','score','hiddenCount'])assert.ok(!preview.includes(hidden),hidden);
 assert.deepEqual(JSON.parse(JSON.stringify(taan)),{...taan});assert.deepEqual(soul,before);
 revealOneIssue(soul);assert.equal(taan.trait,'concealing','an existing assignment retains its original trait snapshot');
 assert.equal(keeperWorkPlan({pure:true},'taan').completionOrder,0);assert.equal(keeperWorkPlan({pure:true},'boon').completionKarma,0);
});
