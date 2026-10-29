// BALANCE-2: paired seeded trials through the production battle queue and commands.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ENCOUNTER_BALANCE } from '../src/encounter-balance.js';
import { createGame } from '../src/game.js';
import { LEVELS, ZONE_EVENTS, TRAINING_RULES } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { COMBAT_SKILLS, recordSkillTraining, skillForActor } from '../src/combat-skills.js';
export const zones = ['th','asia','west','cyberhell'];
export const teamOrder = ['taan','nira','guard','dam','plerng','boon'];
export const finalEncounters = ['minion:1','minion:2','minion:3','minion:4','ruler:th','ruler:asia','ruler:west','ruler:cyberhell','boss'];
export const outDir = fileURLToPath(new URL('../output/coordination/2026-10-30-balance2/',import.meta.url));
const seeded = seed => () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export function scenarios() {
  const cases=[];
  for (const [index,zone] of zones.entries()) for(let size=3;size<=index+4;size++) {
    // Guard is awarded after the Thai breach, never in the preceding border encounters.
    if(zone!=='th'||size===3) for(const kind of ['frontier','breach']) cases.push({zone,size,kind});
    if(zone!=='cyberhell') cases.push({zone,size,kind:'boss'});
    else for(const encounter of finalEncounters) cases.push({zone,size,kind:'final',encounter});
  }
  return cases;
}
export function setup({zone,size,kind,encounter,moves,fullBreach=false}) {
  const g=createGame();g.save=()=>true;g.onChange=()=>{};g.zone=zone;
  const index=zones.indexOf(zone),kinds=teamOrder.slice(0,size-1);
  g.bossCleared=Object.fromEntries(zones.slice(0,index).map(z=>[z,true]));
  g.crew=kinds.filter(k=>k!=='guard').map(k=>actorFromLegacy({k,morale:100},zone));
  g.guard=kinds.includes('guard')?actorFromLegacy({morale:100},zone,'guard'):null;
  g.roster={};syncRoster(g);g.party.members=kinds.filter(k=>k!=='guard');
  g.party.finalMembers=g.crew.map(a=>a.id);g.frontierOf().team=[...g.party.members];
  g.level=index+2;g.hp=g.hpMax=LEVELS[g.level-1].hpMax;g.mp=g.mpMax=LEVELS[g.level-1].mpMax;
  g.inventory={health:Math.ceil(size/2),holyWater:Math.ceil(size/2)};
  g.zoneEvents[zone]=Object.fromEntries(ZONE_EVENTS[zone].map(ev=>[ev.k,'cleared']));
  if(zone==='th'&&kind!=='boss')g.zoneEvents.th.frontierBreach='pending';
  else g.zoneEvents.th={...g.zoneEvents.th,frontierBreach:'cleared'};
  g.abilities.bigFire=zone!=='th'||kind==='boss';
  g.abilities.teamJudgment=!!moves&&(zone!=='th'||kind==='boss');
  if(moves) for(const actor of [...g.crew,g.guard].filter(Boolean)) {
    const skill=skillForActor(actor),records=actor.k==='nira'?g.training.shared:(g.training.zones[zone]||={});
    const record=records[actor.id]||={exp:0,readyAtTick:0,attempts:{}};
    for(const score of [60,80]) {
      recordSkillTraining(record,actor,COMBAT_SKILLS[skill].station,score);
      record.exp += TRAINING_RULES.rewards.find(reward=>reward.score===score).exp;
    }
  }
  if(kind==='frontier')g.startFrontierBattle({kindIdx:0,level:1,id:'balance2'});
  else if(kind==='breach'&&fullBreach) {
    const key={th:'frontierBreach',asia:'asiaRageBreach',west:'westVampireBreach',cyberhell:'cyberBreach'}[zone];
    g.zoneEvents[zone][key]='pending';
    if(zone==='th')g.startFrontierBreach();else g.startZoneEvent(key);
  }
  else if(kind==='breach') {
    const key={th:'frontierBreach',asia:'asiaRageBreach',west:'westVampireBreach',cyberhell:'cyberBreach'}[zone];
    const ev=ZONE_EVENTS[zone].find(e=>e.k===key),wave=ev.waves.length;
    // Isolate the border lord's real final wave, with normal resources after map rest.
    // Full breach attrition is a separate scenario; this never claims to model its earlier waves.
    g.startBattle({id:999,who:'simulation',deserved:4,resist:true});
    const foes=zone==='th'?g.frontierBreachFoes(wave):g.zoneEventFoes(ev,wave);
    Object.assign(g.battle,{kind:zone==='th'?'frontierBreach':'zoneEvent',zone,eventKey:key,wave,foes,selectedFoeId:foes[0].id});
    delete g.battle.balance;g.prepareEncounter();
  } else if(kind==='final') {
    const position=finalEncounters.indexOf(encounter);
    g.finalEvent={version:1,migrationVersion:2,phase:encounter==='boss'?'bossReady':'staging',
      minionsCleared:encounter.startsWith('minion:')?position:4,
      rulersCleared:finalEncounters.slice(0,position).filter(e=>e.startsWith('ruler:')).map(e=>e.slice(6)),
      reinforcementsSeen:true,approachSeen:true,duelSeen:true,rewardLedger:{}};
    g.startFinalEncounter(encounter);
  } else if(zone==='th') {g.zoneEvents.th.thBorderBoss='pending';g.startZoneEvent('thBorderBoss');}
  else {g.bossGuarding[zone]=true;g.startZoneBoss('alert');}
  if(!g.battle)throw Error(`cannot start ${zone}/${kind}/${encounter}`);
  const actual=g.battleActors().filter(a=>!a.guestGuide).length;
  if(actual!==size)throw Error(`team size ${actual}, expected ${size}`);
  return g;
}
function choose(g,moves) {
  const b=g.battle,actor=g.battleActors().find(a=>a.id===b.actorId),hero=actor.id==='you';
  const missing=a=>a.id==='you'?b.youMax-b.youHp:100-a.morale;
  const receiver=g.battleActors().slice().sort((a,c)=>missing(c)-missing(a))[0];
  const skill=skillForActor(actor);
  if(missing(receiver)>=45&&g.inventory.health>0&&!g.battleRecipientWhy('health',receiver.id))return ['health',receiver.id];
  if(hero&&g.mp<24&&g.inventory.holyWater>0&&!g.battleRecipientWhy('holyWater','you'))return ['holyWater','you'];
  if(['boon','nira'].includes(actor.k)&&missing(receiver)>=20) {
    if(moves&&!g.skillWhy(skill,actor))return [skill,receiver.id];
    if(!g.crewHelpWhy(actor))return ['crew:'+(g.isFinalBattle()?actor.id:actor.k),receiver.id];
  }
  if(hero) {
    if(moves&&!g.skillWhy('teamJudgment',actor))return ['teamJudgment','you'];
    if(!b.simFireUsed&&g.mp>=8){b.simFireUsed=true;return ['fire','you'];}
    return ['atk','you'];
  }
  if(!['boon','nira'].includes(actor.k)) {
    if(moves&&!g.skillWhy(skill,actor))return [skill,'you'];
    if(actor.k==='guard'&&!g.guardHelpWhy())return ['guard','you'];
    if(actor.k!=='guard'&&!g.crewHelpWhy(actor))return ['crew:'+(g.isFinalBattle()?actor.id:actor.k),'you'];
  }
  return ['strike','you'];
}
export function simulate(options) {
  options={fullBreach:options.kind==='breach',...options};
  const random=Math.random,now=Date.now;Math.random=seeded(options.seed);Date.now=()=>1800000000000;
  try {
    const g=setup(options),b=g.battle;
    const initial=b.foes.map(({hp,atk,boss})=>({hp,atk,boss:!!boss}));
    let actions=0,round=1,completedRounds=0,healing=0,absorbed=0;
    while(!b.over&&actions<1000) {
      const turn=g.beginBattleTurns();if(!turn)throw Error('no active turn');
      round=b.turnQueue.round;
      if(turn.side==='foe') {if(!g.runEnemyTurn())throw Error('enemy rejected');}
      else {
        const [action,recipient]=choose(g,options.moves);
        const target=b.foes.find(f=>f.boss&&f.hp>0)||b.foes.find(f=>f.hp>0);if(target)g.selectFoe(target.id);
        if(!g.confirmBattleCommand(action,recipient))throw Error(`rejected ${turn.id}/${action}`);
        healing+=b.dmg?.healAmount||0;
      }
      absorbed+=(b.dmg?.enemyHits||[]).reduce((sum,h)=>sum+(h.absorbed||0),0);
      actions++;g.finishBattleCommand();g.advanceBattleTime(1000,true);
      if(b.pendingWave) {
        if(!options.fullBreach)throw Error('unexpected additional wave in isolated encounter');
        completedRounds+=round;
        const ok=b.kind==='frontierBreach'?g.advanceFrontierBreachWave():g.advanceZoneEventWave(true);
        if(!ok)throw Error('cannot advance breach');
        if(b.storyInterlude==='west-hypnosis')g.completeBattleInterlude();
      }
    }
    return {...options,result:b.over||'timeout',rounds:completedRounds+round,bossRounds:round,actions,healing,absorbed,heroHp:b.youHp,
      fallen:(b.absentActors||[]).length,initial};
  } finally {Math.random=random;Date.now=now;}
}
export function run(label='after',count=200) {
  if(label==='before') for(const key of Object.keys(ENCOUNTER_BALANCE))delete ENCOUNTER_BALANCE[key];
  mkdirSync(outDir,{recursive:true});const rows=[];
  for(const scenario of scenarios())for(const moves of [false,true]) {
    const samples=Array.from({length:count},(_,i)=>simulate({...scenario,moves,seed:30000+i}));
    const wins=samples.filter(r=>r.result==='win');
    const mean=(set,key)=>set.length?Number((set.reduce((sum,r)=>sum+r[key],0)/set.length).toFixed(2)):null;
    const row={...scenario,moves,samples:count,wins:wins.length,winRate:100*wins.length/count,
      rounds:mean(samples,'rounds'),winRounds:mean(wins,'rounds'),bossRounds:mean(samples,'bossRounds'),winBossRounds:mean(wins,'bossRounds'),timeouts:samples.filter(r=>r.result==='timeout').length,
      healing:mean(samples,'healing'),absorbed:mean(samples,'absorbed'),initial:samples[0].initial};
    rows.push(row);console.log(JSON.stringify(row));
  }
  const runtimeHashes=Object.fromEntries(['game','data','combat-skills','party-balance','encounter-balance'].map(name=>[name,createHash('sha256').update(readFileSync(new URL(`../src/${name}.js`,import.meta.url))).digest('hex')]));
  writeFileSync(outDir+label+'.json',JSON.stringify({label,count,seedStart:30000,teamOrder,runtimeHashes,rows},null,2)+'\n');
  return rows;
}
if(process.argv[1]===fileURLToPath(import.meta.url))run(process.argv[2]||'after',Number(process.argv[3]||200));
