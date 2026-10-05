// B7: paired-seed comparison against a read-only source snapshot of 86e31df.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.argv[2] || process.cwd();
const {createGame}=await import(pathToFileURL(root+'/src/game.js'));
const {BATTLE,LEVELS}=await import(pathToFileURL(root+'/src/data.js'));
const {normalizeTraining}=await import(pathToFileURL(root+'/src/progression.js'));
const fixture=JSON.parse(readFileSync(new URL('../tests/fixtures/b1-v3.json',import.meta.url)));
globalThis.Image ??= class {};
const ids=['th:taan','asia:taan','west:taan','cyberhell:taan','th:kan','west:boon'];
const finalIds=['minion:1','minion:2','minion:3','minion:4','ruler:th','ruler:asia','ruler:west','ruler:cyberhell','boss'];
const events={th:['prisonBreak','devaTest','frontierBreach','thBorderBoss'],asia:['asiaPrisonFire','asiaDevaTest','asiaRageBreach'],west:['westHypnotized','westVampireBreach','westDevaTest'],cyberhell:['cyberRescue','cyberBreach']};
const levels={th:2,asia:3,west:4,cyberhell:5};
let now=1800000000000;
const realNow=Date.now,realRandom=Math.random;
Date.now=()=>now;
function setup(zone,n,finalId) {
 const g=createGame();g.restore(structuredClone(fixture));g.zone=zone;
 g.bossCleared=finalId?{th:true,asia:true,west:true}:{};
 for(const c of Object.values(g.roster)){c.morale=92;c.helpReadyAt=0;c.helpRemainingMs=0;c.recoverUntil=0;}
 g.guard=null;g.party.members=['taan','plerng'].slice(0,n);g.party.finalMembers=ids.slice(0,n);
 g.training=normalizeTraining({});
 g.frontier.zones[zone] ||= {};g.frontier.zones[zone].team=['taan','plerng'].slice(0,n);
 const level=levels[zone],L=LEVELS[level-1];g.level=level;g.exp=L.exp;g.hp=g.hpMax=L.hpMax;g.mp=g.mpMax=L.mpMax;
 const ab=['bigFire','flameCharge','windFan','rage','ice','hypno','valkyrieSpear','cooldownClock'];
 g.abilities={};ab.slice(0,{th:1,asia:3,west:6,cyberhell:8}[zone]).forEach(k=>g.abilities[k]=true);
 g.inventory={health:finalId?2:3,holyWater:finalId?2:3};g.coin=400;g.zoneCases[zone]=10;
 g.zoneEvents[zone]=Object.fromEntries(events[zone].map(k=>[k,'cleared']));
 if(finalId){g.finalEvent={version:1,migrationVersion:1,phase:'staging',minionsCleared:finalId.startsWith('minion:')?+finalId.split(':')[1]-1:4,rulersCleared:finalIds.slice(0,finalIds.indexOf(finalId)).filter(x=>x.startsWith('ruler:')).map(x=>x.split(':')[1]),rewardLedger:{},pendingReward:null,activeEncounter:null,reinforcementsSeen:true};}
 return g;
}
const scenarios=[];
for(const [zone,keys] of Object.entries(events)) {
 for(const key of keys) scenarios.push({zone,id:key,start:g=>{g.zoneEvents[zone][key]='pending';return g.startZoneEvent(key);}});
 if(['asia','west'].includes(zone))scenarios.push({zone,id:zone+':zoneBoss',start:g=>{const ok=g.startZoneBoss();g.startBossFight();return ok;}});
}
for(const id of finalIds)scenarios.push({zone:'cyberhell',id,final:true,start:g=>g.startFinalEncounter(id)});
function run(sc,n,seed){
 now=1800000000000;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const g=setup(sc.zone,n,sc.final?sc.id:null);if(!sc.start(g))throw Error('cannot start '+sc.id);
 const b=g.battle;
 const effective=g.battleCrew().length;let turns=0;
 while(!b.over && turns<800){
  if(b.pendingWave){if(b.kind==='frontierBreach')g.advanceFrontierBreachWave();else g.advanceZoneEventWave();continue;}
  now+=3000;g.advanceBattleTime?.(3000);turns++;
  const crew=g.battleCrew(),key=c=>'crew:'+(g.isFinalBattle()?c.id:c.k);
  let acted=false;
  if(b.youHp<=b.youMax*.45){const healer=crew.find(c=>c.kind==='boon'||c.k==='boon');if(healer)acted=g.battleAct(key(healer));if(!acted&&g.inventory.health)acted=g.battleAct('health');}
  if(!acted)for(const c of crew.filter(c=>['taan','plerng','kan'].includes(c.kind||c.k))){if(g.battleAct(key(c))){acted=true;break;}}
  if(!acted&&g.mp>=BATTLE.mpCost.fire)acted=g.battleAct('fire');
  if(!acted&&g.mp<BATTLE.mpCost.fire&&g.inventory.holyWater)acted=g.battleAct('holyWater');
  if(!acted)acted=g.battleAct('atk');if(!acted)throw Error('stuck '+sc.id);
 }
 return {win:b.over==='win',effective,turns};
}
const rows=[];
try{for(const sc of scenarios.filter(sc=>!process.env.B7_ONLY||process.env.B7_ONLY.split(',').includes(sc.id)))for(const n of [1,2,6]){
 const samples=Array.from({length:100},(_,i)=>run(sc,n,7100+i));
 rows.push({encounter:sc.id,requestedHelpers:n,effectiveHelpers:samples[0].effective,wins:samples.filter(s=>s.win).length,runs:100,meanTurns:+(samples.reduce((a,s)=>a+s.turns,0)/100).toFixed(2)});
}}finally{Date.now=realNow;Math.random=realRandom;}
const result={method:'100 paired seeds 7100–7199 per encounter, 3s active time per action, helpers morale 92, training level 1, full HP/MP, no Guard, three health/water (final: two each), zone levels 2/3/4/5, healing at 45%, crew special then fire then attack. Each encounter starts rested; final chain is not a single gauntlet. Six requested helpers outside final uses the actual normal-team cap (2).',rows};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows));
