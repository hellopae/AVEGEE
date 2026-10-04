// Reproducible B2b comparison using actual battle actions and the B1 save roster.
import { readFileSync, writeFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { BATTLE, LEVELS, TRAINING_RULES } from '../src/data.js';
import { normalizeTraining } from '../src/progression.js';
const fixture=JSON.parse(readFileSync(new URL('../tests/fixtures/b1-v3.json',import.meta.url)));
const ids=['th:taan','asia:taan','west:taan','cyberhell:taan','th:kan','west:boon'];
const encounters=['ruler:th','ruler:asia','ruler:west','ruler:cyberhell','boss'];
const originalRandom=Math.random, originalNow=Date.now;
let now=1800000000000;
Date.now=()=>now;
globalThis.Image ??= class {};
const seeded=seed=>()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
function game(id,trained) {
  const g=createGame(); g.restore(structuredClone(fixture));
  g.zone='cyberhell'; g.zoneEvents.cyberhell={cyberRescue:'cleared',cyberBreach:'cleared',cyberFinal:'active'};
  g.bossCleared={th:true,asia:true,west:true};
  // B4: พลังฝึกมาจาก g.training (EXP ต่อคน) ไม่ใช่ upLv — trained = ระดับฝึกที่ต้องการ-1 ของทุกคนที่ลงทีม (0 = ไม่ฝึก = ระดับ 1)
  for(const c of Object.values(g.roster)) {c.morale=92;c.helpReadyAt=0;c.recoverUntil=0;}
  const exp=TRAINING_RULES.exp[Math.min(trained,TRAINING_RULES.exp.length-1)], zones={};
  for(const id of ids) { const [zone]=id.split(':'); (zones[zone] ||= {})[id]={exp,readyAtTick:0,attempts:{}}; }
  g.training=normalizeTraining({shared:{'global:yama':{exp},'global:nira':{exp}},zones});
  g.finalEvent={version:1,migrationVersion:1,phase:'staging',minionsCleared:4,
    rulersCleared:encounters.slice(0,encounters.indexOf(id)).filter(x=>x.startsWith('ruler:')).map(x=>x.split(':')[1]),
    rewardLedger:{},pendingReward:null,activeEncounter:null,reinforcementsSeen:true};
  g.party.finalMembers=ids;
  g.level=5; g.exp=LEVELS[4].exp; g.hp=g.hpMax=LEVELS[4].hpMax; g.mp=g.mpMax=LEVELS[4].mpMax;
  g.abilities={bigFire:true,flameCharge:true,rage:true,ice:true,hypno:true,windFan:true};
  g.inventory={health:2,holyWater:2};g.coin=400;
  g.startFinalEncounter(id); return g;
}
function run(id,adds,trained,seed) {
  now=1800000000000; Math.random=seeded(seed);
  const g=game(id,trained); const b=g.battle;
  if(!adds) b.foes=b.foes.filter(f=>f.boss);
  const startCoin=g.coin;let turns=0;
  while(!b.over && turns<400) {
    now+=3000;turns++;
    g.advanceBattleTime?.(3000); g.updateActorRecovery?.(now);
    const low=b.youHp<b.youMax*.45;
    let acted=false;
    if(low) acted=g.battleAct('crew:west:boon');
    if(!acted && low && g.inventory.health) acted=g.battleAct('health');
    // All six helpers are eligible. Use control first, then available damage.
    if(!acted && b.foes.filter(f=>f.hp>0).length>1) acted=g.battleAct('crew:th:kan');
    if(!acted) for(const c of g.battleCrew().filter(c=>c.kind==='taan')) {
      if(g.battleAct('crew:'+c.id)){acted=true;break;}
    }
    if(!acted && g.mp>=BATTLE.mpCost.fire) acted=g.battleAct('fire');
    if(!acted && g.inventory.holyWater) acted=g.battleAct('holyWater');
    if(!acted) acted=g.battleAct('atk');
    if(!acted) throw Error('bot stuck');
  }
  return {win:b.over==='win',turns,health:2-(g.inventory.health||0),water:2-(g.inventory.holyWater||0),coin:g.coin-startCoin,hp:b.youHp};
}
const rows=[];
try {
  for(const trained of [0,4]) for(const id of encounters) for(const adds of [false,true]) {
    const samples=Array.from({length:100},(_,i)=>run(id,adds,trained,2800+i));
    const mean=k=>Number((samples.reduce((sum,s)=>sum+s[k],0)/samples.length).toFixed(2));
    rows.push({encounter:id,trainLevel:trained+1,adds,wins:samples.filter(s=>s.win).length,samples:100,
      meanTurns:mean('turns'),meanHealthUsed:mean('health'),meanWaterUsed:mean('water'),meanRewardCoin:mean('coin'),meanHp:mean('hp')});
  }
} finally {Math.random=originalRandom;Date.now=originalNow;}
const result={method:'100 paired seeds 2800–2899 per encounter; level 5; six cross-zone helpers; morale 92; full HP/MP after map rest; two health and two holyWater; simulated 3s active battle time per turn; wall-clock actor recovery; no Guard; training level 1 and 5 via g.training. Enemy stats unchanged. Before = same encounter with adds removed.',rows};
if(process.argv[2]) writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
