import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/game.js';
import { LEVELS, ZONE_EVENTS } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { COMBAT_SKILLS, recordSkillTraining, skillForActor } from '../src/combat-skills.js';

export const seeds=[11,29,73,131,257,509,1021,2053,4099,8191];
const zones=['th','asia','west','cyberhell'];
const randomSeed=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
export function setup({zone='th',size=3,after=true,kind='boss',damageOnly=false,progression=false}={}) {
  const g=createGame();g.save=()=>true;g.zone=zone;
  const kinds=progression&&size===5?['taan','plerng','nira','guard']:size===3?['taan','plerng']:size===4?['taan','plerng','guard']:size===5?['taan','plerng','dam','nira']:size===6?['taan','plerng','dam','nira','guard']:['taan','plerng','dam','nira','boon','guard'];
  g.crew=kinds.filter(k=>k!=='guard').map(k=>actorFromLegacy({k,morale:100},zone));
  g.guard=kinds.includes('guard')?actorFromLegacy({morale:100},zone,'guard'):null;g.roster={};syncRoster(g);
  g.party.members=kinds.filter(k=>k!=='guard');g.party.finalMembers=g.crew.map(a=>a.id);g.frontierOf().team=[...g.party.members];
  // Hypothetical 3/5/7 comparisons in all zones are explicitly requested by Astra §3.
  // Gameplay progression is tested separately; this override changes only selection capacity.
  g.partyCap=()=>size;g.partyMax=()=>size-1-(g.guard?1:0);
  g.level=zones.indexOf(zone)+2;g.hp=g.hpMax=LEVELS[g.level-1].hpMax;g.mp=g.mpMax=LEVELS[g.level-1].mpMax;
  if(damageOnly)g.mp=10000;
  g.abilities.bigFire=true;g.abilities.teamJudgment=after;
  g.inventory={health:Math.ceil(size/2),holyWater:Math.ceil(size/2)};
  g.zoneEvents[zone]=Object.fromEntries(ZONE_EVENTS[zone].map(ev=>[ev.k,'cleared']));
  if(!after) {
    g.prepareEncounter=()=>{};
    const pressure=g.teamPressure.bind(g);
    g.teamPressure=b=>b.encounter==='boss'?Math.min(3.25,1+.75*Math.max(0,(2+g.battleCrew().length+(g.enemyGuard()?3:0))/2-1)):pressure(b);
  }
  if(after)for(const a of [...g.crew,g.guard].filter(Boolean)){
    const skill=skillForActor(a),records=a.k==='nira'?g.training.shared:(g.training.zones[zone]||={});
    const rec=records[a.id]||={exp:0,readyAtTick:0,attempts:{}};
    for(const score of [60,80])recordSkillTraining(rec,a,COMBAT_SKILLS[skill].station,score);
  }
  if(kind==='breach' && zone==='th') { g.abilities.bigFire=false; g.abilities.teamJudgment=false; }
  if(kind==='frontier')g.startFrontierBattle({kindIdx:0,level:1,id:'sim'});
  else if(kind==='breach'){
    const ev=ZONE_EVENTS[zone].find(e=>e.k===({th:'frontierBreach',asia:'asiaRageBreach',west:'westVampireBreach',cyberhell:'cyberBreach'}[zone]));
    if(!ev)throw Error('missing breach '+zone);
    const wave=ev.waves.length,foes=g.zoneEventFoes(ev,wave);
    g.startBattle({id:999,who:'simulation',deserved:4,resist:true});
    Object.assign(g.battle,{kind:zone==='th'?'frontierBreach':'zoneEvent',zone,eventKey:ev.k,wave,foes,selectedFoeId:foes[0].id});
    g.prepareEncounter();
  } else if(zone==='th'){
    g.zoneEvents.th.thBorderBoss='pending';g.startZoneEvent('thBorderBoss');
  } else if(zone==='cyberhell'){
    g.finalEvent={version:1,migrationVersion:2,phase:'bossReady',minionsCleared:4,rulersCleared:['th','asia','west','cyberhell'],reinforcementsSeen:true,rewardLedger:{},duelSeen:true};
    g.startFinalEncounter('boss');
  } else {
    g.bossGuarding[zone]=true;g.startZoneBoss('alert');
  }
  if(!g.battle)throw Error('could not construct '+zone+' '+kind);
  if(damageOnly)for(const f of g.battle.foes)f.atk=[0,0];
  // The event is a final-boss-only sample, not the preceding encounters/waves.
  g.battle.storyInterlude=null;
  return g;
}
function choose(g,after,damageOnly) {
  const b=g.battle,actor=g.battleActors().find(a=>a.id===b.actorId),hero=actor.id==='you';
  const actors=g.battleActors(),missing=a=>a.id==='you'?b.youMax-b.youHp:100-a.morale;
  const receiver=actors.slice().sort((a,c)=>missing(c)-missing(a))[0];
  const skill=skillForActor(actor);
  if(!damageOnly){
    if(missing(receiver)>=45&&g.inventory.health>0&&g.battleRecipientWhy('health',receiver.id)==='')return ['health',receiver.id];
    if(hero&&g.mp<24&&g.inventory.holyWater>0)return ['holyWater','you'];
    if(['boon','nira'].includes(actor.k)&&missing(receiver)>=20){
      if(after&&!g.skillWhy(skill,actor))return [skill,receiver.id];
      if(!g.crewHelpWhy(actor))return ['crew:'+(g.isFinalBattle()?actor.id:actor.k),receiver.id];
    }
  }
  if(hero){
    if(after&&!g.skillWhy('teamJudgment',actor))return ['teamJudgment','you'];
    if(!b.simFireUsed&&g.mp>=8){b.simFireUsed=true;return ['fire','you'];}
    return ['atk','you'];
  }
  if(!['boon','nira'].includes(actor.k)){
    if(after&&!g.skillWhy(skill,actor))return [skill,'you'];
    if(actor.k==='guard'&&!g.guardHelpWhy())return ['guard','you'];
    if(actor.k!=='guard'&&!g.crewHelpWhy(actor))return ['crew:'+(g.isFinalBattle()?actor.id:actor.k),'you'];
  }
  return ['strike','you'];
}
export function simulate(options={}) {
  const original=Math.random;Math.random=randomSeed(options.seed||11);
  try{
    const g=setup(options),b=g.battle,initialHp=b.foes.reduce((sum,f)=>sum+f.hp,0),foes=b.foes.length;
    const initialItems={...g.inventory},mpStart=g.mp;let rounds=1,actions=0,enemyActions=0,healing=0,absorbed=0,damage=0,mpSpent=0;
    const hpByRound=[];
    g.beginBattleTurns();
    while(!b.over&&actions<600){
      const turn=g.beginBattleTurns();if(!turn)break;
      if(turn.side==='foe') {if(!g.runEnemyTurn())throw Error('enemy command rejected');enemyActions++;}
      else {
        const [action,recipient]=choose(g,options.after,options.damageOnly);
        const target=b.foes.find(f=>f.boss&&f.hp>0)||b.foes.find(f=>f.hp>0);if(target)g.selectFoe(target.id);
        const mp=g.mp;
        if(!g.confirmBattleCommand(action,recipient))throw Error('ally command rejected '+action+' '+turn.id);
        mpSpent+=Math.max(0,mp-g.mp);healing+=b.dmg?.healAmount||0;damage+=b.dmg?.foe||0;
      }
      absorbed+=(b.dmg?.enemyHits||[]).reduce((sum,h)=>sum+(h.absorbed||0),0);
      actions++;g.finishBattleCommand();
      if(!options.damageOnly)g.advanceBattleTime(1000,true);
      const next=b.turnQueue?.round||rounds;
      if(next>rounds||b.over){hpByRound.push(b.foes.reduce((sum,f)=>sum+f.hp,0));rounds=next;}
      if(b.pendingWave)break;
    }
    return {zone:options.zone,size:options.size,after:options.after,kind:options.kind||'boss',seed:options.seed||11,
      initialHp,foes,result:b.over||'incomplete',rounds:Math.max(1,hpByRound.length),hpByRound,actions,enemyActions,
      heroHp:b.youHp,standing:g.battleActors().length,fallen:(b.absentActors||[]).length,healing,absorbed,damage,mpSpent,mpEnd:g.mp,
      medicines:Object.values(initialItems).reduce((a,c)=>a+c,0)-Object.values(g.inventory).slice(0,2).reduce((a,c)=>a+c,0)};
  }finally{Math.random=original;}
}
export function run() {
  const damage=[],practical=[],progression=[];
  for(const zone of zones)for(const size of [3,5,7])for(const kind of ['boss','frontier','breach'])for(const after of [false,true])damage.push(simulate({zone,size,kind,after,damageOnly:true}));
  for(const zone of zones)for(const size of [3,4,5,6,7])for(const after of [false,true])for(const seed of seeds)practical.push(simulate({zone,size,after,seed}));
  for(const [zone,size] of [['th',4],['asia',5],['west',6],['cyberhell',7]])for(const seed of seeds)progression.push(simulate({zone,size,after:true,seed,progression:true}));
  const dir=fileURLToPath(new URL('../output/coordination/2026-10-29-c1/',import.meta.url));mkdirSync(dir,{recursive:true});
  writeFileSync(dir+'balance.json',JSON.stringify({seeds,damage,practical,progression},null,2)+'\n');
  let report='# C1 balance simulation — 2026-10-29\n\nDeterministic model, not browser QA or a claim of final gameplay balance. Commands use confirmBattleCommand / finishBattleCommand and the actual per-actor queue.\n\n';
  report+='## Assumptions\n\nAstra §3 levels 2/3/4/5, training Lv1, no strength upgrades, fire control, equipment or added critical bonus. Teams 3 = Yama/Taan/Plerng; 5 adds Dam/Nira; 7 adds Boon/Guard. Team 4 adds Guard to team 3; team 6 adds Guard to team 5. The hypothetical cap is overridden equally in before/after to compare every size in every zone. Gameplay cap progression is tested separately. Before = original skills and unscaled foes; after = new skills plus encounter profile. Existing 25% story finales remain. Final boss pressure is 3.25 before and 2.25 after; other pressure entries are unchanged.\n\nDamage-only table: enemy ATK zero, MP 10000, healers strike, no seconds advance (ally CD does not refresh), no deaths/items. This isolates elimination speed like Astra, and is not a survival prediction.\n\nSurvival samples: 10 seeds per zone/size, real HP/MP, enemies act normally, 1 active battle second per completed command, finite health/holyWater stocks each ceil(size/2). Policy prioritizes health items at 45 missing HP, support at 20 missing HP, MP restore below 24, then available ultimate/new special/basic attack. Boss selected first. No manual player tactics are inferred.\n\n';
  report+='## Damage-only: remaining enemy HP at each round end (before → after)\n\n| Zone | Team | Boss HP sequence before | After | Initial total HP before → after | Foes before → after |\n|---|---:|---|---|---|---|\n';
  for(const zone of zones)for(const size of [3,5,7]){
    const pair=damage.filter(r=>r.zone===zone&&r.size===size&&r.kind==='boss');const [a,b]=pair;
    report+=`| ${zone} | ${size} | ${a.hpByRound.join('→')} | ${b.hpByRound.join('→')} | ${a.initialHp} → ${b.initialHp} | ${a.foes} → ${b.foes} |\n`;
  }
  report+='\n## Frontier and breach boss-only samples\n\n| Zone | Team | Encounter | Before rounds / enemy actions | After rounds / enemy actions | HP before → after |\n|---|---:|---|---|---|---|\n';
  for(const zone of zones)for(const size of [3,5,7])for(const kind of ['frontier','breach']){
    const [a,b]=damage.filter(r=>r.zone===zone&&r.size===size&&r.kind===kind);
    report+=`| ${zone} | ${size} | ${kind} | ${a.rounds} / ${a.enemyActions} | ${b.rounds} / ${b.enemyActions} | ${a.initialHp} → ${b.initialHp} |\n`;
  }
  report+='\n## Survival samples: wins, rounds, attrition and resource use\n\n| Zone | Team | Before wins/10 | After wins/10 | After mean rounds | After mean fallen | After mean medicines | After mean MP spent | After mean healing / shield absorbed |\n|---|---:|---|---|---:|---:|---:|---:|---|\n';
  for(const zone of zones)for(const size of [3,4,5,6,7]){
    const a=practical.filter(r=>r.zone===zone&&r.size===size&&!r.after),b=practical.filter(r=>r.zone===zone&&r.size===size&&r.after),mean=k=>(b.reduce((s,r)=>s+r[k],0)/b.length).toFixed(1);
    report+=`| ${zone} | ${size} | ${a.filter(r=>r.result==='win').length} | ${b.filter(r=>r.result==='win').length} | ${mean('rounds')} | ${mean('fallen')} | ${mean('medicines')} | ${mean('mpSpent')} | ${mean('healing')} / ${mean('absorbed')} |\n`;
  }
  report+='\n## Story-cap teams, including Guard (after)\n\nThai/West/Cyber teams use the compositions above. Asia 5 uses Yama/Taan/Plerng/Nira/Guard. Ten seeds per phase, same finite resources and policy.\n\n| Zone | Team | Wins/10 | Mean rounds | Mean medicines | Mean MP spent |\n|---|---:|---:|---:|---:|---:|\n';
  for(const zone of zones){
    const rows=progression.filter(r=>r.zone===zone),mean=k=>(rows.reduce((sum,r)=>sum+r[k],0)/rows.length).toFixed(1);
    report+=`| ${zone} | ${rows[0].size} | ${rows.filter(r=>r.result==='win').length} | ${mean('rounds')} | ${mean('medicines')} | ${mean('mpSpent')} |\n`;
  }
  report+='\nLimitations: no browser/layout/facing observation; the requested visual review remains with Dale. No player reaction-time model, map downtime or complete nine-encounter finale run. Results measure this fixed policy, not a probability of a human winning. Raw per-seed results and HP histories are in balance.json.\n';
  writeFileSync(dir+'balance.md',report);
  return {damage:damage.length,practical:practical.length,progression:progression.length,report:dir+'balance.md'};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(run()));
