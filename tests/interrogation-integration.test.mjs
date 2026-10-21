import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/game.js';
import {keeperWorkPlan} from '../src/interrogation.js';
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=99999;return g;};
const soul=()=>({id:99001,who:'คดีทดสอบ',name:'คดีทดสอบ',sp:0,deeds:[{s:'greed',w:5,known:true,text:'กรรมที่ทราบ'},{s:'greed',w:-1,known:false,text:'เหตุบรรเทา'}],merits:[],deserved:2,said:[],lines:[]});
const reload=g=>{const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};
test('Kan charges once for one clue and retains cooldown and evidence after reload',()=>{
 let g=game();g.hire('kan');const s=soul();g.queue=[s];g.mp=20;const c=g.crewOf('kan'),morale=c.morale;
 assert.equal(g.kanClueWhy(s),'');assert.equal(g.kanRevealClue(s).kind,'truth');assert.equal(g.mp,16);assert.equal(c.morale,morale-4);assert.equal(s.deeds[1].known,true);
 s.deeds.push({s:'greed',w:1,known:false,text:'อีกประเด็น'});
 assert.equal(g.kanRevealClue(s),null);assert.equal(g.mp,16);
 g=reload(g);assert.match(g.kanClueWhy(g.queue[0]),/พักพลัง/);assert.equal(g.queue[0].deeds[1].known,true);assert.equal(g.queue[0].deeds[2].known,false);
});
test('earned Kan insight replaces only MP and failed actions never consume resources',()=>{
 const g=game();g.hire('kan');const s=soul();g.queue=[s];g.interrogationSupport.insights=1;g.mp=0;const c=g.crewOf('kan'),morale=c.morale;
 c.at='krata';assert.equal(g.kanRevealClue(s),null);assert.equal(g.interrogationSupport.insights,1);assert.equal(c.morale,morale);
 c.at=null;assert.ok(g.kanRevealClue(s));assert.equal(g.mp,0);assert.equal(c.morale,morale-4);assert.equal(g.interrogationSupport.insights,0);assert.ok(g.interrogationSupport.kanReadyAt[c.id]>Date.now());
});
test('completion benefits and reports apply once, with no repeated reward after reload',()=>{
 for(const key of ['taan','boon','kan']){
  let g=game();g.hire(key);const c=g.crewOf(key),st=g.stations.find(x=>x.def.k==='krata'),s=soul();g.order=70;g.karma=10;
  const slot={soul:s,intensity:2,work:{...keeperWorkPlan(s,key),keeperId:c.id},verdict:{destinationCorrect:true,short:0,over:0,coin:12}};st.crewK=key;st.slots=[slot];
  const coins=g.coin;g.finish(st,slot);assert.equal(g.coin,coins+12);assert.equal(g.teamReports.length,1);assert.equal(g.order,key==='taan'?72:70);assert.equal(g.karma,key==='boon'?9:10);assert.equal(g.interrogationSupport.insights,key==='kan'?1:0);
  g.finish(st,slot);assert.equal(g.coin,coins+12);assert.equal(g.teamReports.length,1);
  g=reload(g);assert.equal(g.teamReports.length,1);assert.equal(g.acknowledgeTeamReport(g.teamReports[0].id),true);assert.equal(g.acknowledgeTeamReport(g.teamReports[0].id),false);assert.equal(reload(g).teamReports[0].seen,true);
 }
});
test('wrong or excessive sentences and legacy assignments earn no new role bonuses',()=>{
 for(const variant of ['wrong','over','legacy']){
  const g=game();g.hire('taan');g.order=70;const c=g.crewOf('taan'),st=g.stations.find(x=>x.def.k==='krata'),s=soul();
  const slot={soul:s,intensity:2,verdict:{destinationCorrect:variant!=='wrong',short:0,over:variant==='over'?1:0,coin:0}};
  if(variant!=='legacy')slot.work={...keeperWorkPlan(s,'taan'),keeperId:c.id};st.crewK='taan';st.slots=[slot];g.finish(st,slot);assert.equal(g.order,70);
 }
});
test('old saves default safely and malformed report state cannot corrupt the report counter',()=>{
 const d=game().snapshot();delete d.interrogationSupport;delete d.teamReports;delete d.nextTeamReportId;let g=game();g.restore(d);assert.deepEqual(g.interrogationSupport,{version:1,insights:0,kanReadyAt:{}});assert.equal(g.nextTeamReportId,1);
 d.interrogationSupport={insights:100,kanReadyAt:{bad:'wrong',good:123}};d.teamReports=[null,{id:7,benefits:['ok',null]}];d.nextTeamReportId=-2;g.restore(d);assert.equal(g.interrogationSupport.insights,3);assert.deepEqual(g.interrogationSupport.kanReadyAt,{good:123});assert.equal(g.nextTeamReportId,8);assert.deepEqual(g.teamReports[0].benefits,['ok']);
});
test('Pleng assignment charges food once and refuses without supplies',()=>{
 const g=game();g.hire('plerng');const s=g.queue[0];g.cancelCourtArrival(s.id);s.resist=true;s.beaten=true;g.food=1;
 assert.equal(g.assignBlock(s.id,'krata','plerng').key,'keeperCost');assert.equal(g.assign(s.id,'krata','plerng',2),false);assert.equal(g.food,1);
 g.food=2;assert.equal(g.assign(s.id,'krata','plerng',2),true);assert.equal(g.food,0);const st=g.stations.find(x=>x.def.k==='krata');assert.equal(st.slots[0].work.foodCost,2);
 const restored=reload(g);assert.equal(restored.food,0);assert.equal(restored.stations.find(x=>x.def.k==='krata').slots[0].work.foodCost,2);
});
test('justice and karma are identical across keeper skills and queue crowding',()=>{
 const g=game();for(const k of ['boon','plerng','dam','kan'])g.hire(k);
 const st=g.stations.find(x=>x.def.k==='krata'),s=soul();s.deeds=[{s:st.def.tags[0],w:8,known:true}];
 for(const intensity of [1,2,5]){
  const results=[];
  for(const k of ['taan','boon','plerng','dam','kan'])for(const count of [0,20]){
   g.queue=Array.from({length:count},(_,id)=>({id}));const r=g.judge({...st,crewK:k},{soul:s,intensity});results.push([r.score,r.karma,r.destinationCorrect,r.short,r.over]);
  }
  assert.ok(results.every(r=>JSON.stringify(r)===JSON.stringify(results[0])));
 }
});
