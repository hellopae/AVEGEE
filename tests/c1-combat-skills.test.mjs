import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { normalizeTraining } from '../src/progression.js';
import { COMBAT_SKILLS, recordSkillTraining, skillEffect, grantProtection, attackBuff, absorbShield, teamCombo } from '../src/combat-skills.js';
import { partyCap, encounterProfile, scaleEncounter } from '../src/party-balance.js';
import { SKILL_ICONS, skillScenes, SKILL_CAST_MS, SKILL_FX } from '../src/combat-skill-assets.js';
import * as fxMapping from '../src/battle-fx-map.js';
import { specialCooldown } from '../src/actor-recovery.js';
import { assertModuleRelease, assertStylesheetRelease, readReleaseFile } from './helpers/release-imports.mjs';

function game(zone='th', kinds=['taan','plerng']) {
  const g=createGame(); g.zone=zone; g.save=()=>true;
  g.crew=kinds.filter(k=>k!=='guard').map(k=>actorFromLegacy({k,morale:100},zone));
  g.guard=kinds.includes('guard')?actorFromLegacy({morale:100},zone,'guard'):null;
  g.roster={}; syncRoster(g); g.party.members=kinds.filter(k=>k!=='guard');
  g.stations=Object.keys(STATIONS.reduce((out,s)=>({...out,[s.k]:1}),{})).map(k=>({def:STATIONS.find(s=>s.k===k),build:0,slots:[]}));
  return g;
}
function unlock(g,a,skill) {
  const shared=a.k==='nira', home=a.homeZone;
  const records=shared?g.training.shared:(g.training.zones[home]||={});
  const rec=records[a.id]||={exp:0,level:1,readyAtTick:0,attempts:{}};
  for(const score of [60,80]) recordSkillTraining(rec,a,COMBAT_SKILLS[skill].station,score);
}
function battle(g) {
  g.startBattle({id:200,who:'คู่ซ้อม',deserved:4,resist:true});
  for(const f of g.battle.foes){f.hp=f.maxHp=10000;f.atk=[0,0];}
  g.mp=g.mpMax=1000; g.beginBattleTurns(); return g.battle;
}
function actorTurn(g,id) {
  g.battle.turnQueue={version:1,wave:g.battle.wave||0,round:1,remaining:[{id,side:'ally'},...g.battle.foes.filter(f=>f.hp>0).map(f=>({id:f.id,side:'foe'}))]};
  g.beginBattleTurns();
}
function command(g,action,id='you',recipient='you') {
  actorTurn(g,id); assert.equal(g.confirmBattleCommand(action,recipient),true,action);g.finishBattleCommand();
}

test('C1 personal training unlocks each of seven moves once, persists by ID, and requires 60/80 evidence',()=>{
  for(const [skill,def] of Object.entries(COMBAT_SKILLS).filter(([,d])=>d.station)) {
    const g=game('th',[def.actor]); const a=def.actor==='guard'?g.guard:g.crew[0];
    const finish=score=>{const s=g.startTraining(def.station,a.id); assert.ok(s); const r={sessionId:s.id,completed:true,score};const result=g.finishTraining(r);assert.equal(g.finishTraining(r),null);g.tick+=100;return result;};
    assert.equal(finish(59).unlockedSkill,null);assert.equal(g.skillUnlocked(a,skill),false);
    assert.equal(finish(60).unlockedSkill,null);assert.equal(finish(60).unlockedSkill,null);
    assert.equal(g.skillUnlocked(a,skill),false);assert.equal(finish(80).unlockedSkill,skill);
    assert.equal(g.skillUnlocked(a,skill),true);
    const copy=createGame();assert.equal(copy.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
    assert.equal(copy.skillUnlocked(copy.roster[a.id],skill),true);
    if(def.actor!=='nira') assert.equal(copy.skillUnlocked(actorFromLegacy({k:def.actor},'west'),skill),false);
    else {copy.zone='west';assert.equal(copy.skillUnlocked(copy.roster[a.id],skill),true);}
  }
});

test('C1 capped old saves can train only for a missing skill; failed saves roll back skill and session together',()=>{
  const g=game('th',['taan']);const a=g.crew[0];
  g.training=normalizeTraining({zones:{th:{[a.id]:{exp:60}}}});
  assert.equal(g.skillUnlocked(a,'laborJudgment'),false);
  const s=g.startTraining('lan',a.id), result={sessionId:s.id,completed:true,score:80};
  g.save=()=>false;assert.equal(g.finishTraining(result),null);assert.equal(g.training.activeSession.id,s.id);
  g.save=()=>true;assert.equal(g.finishTraining(result).exp,0);g.tick=100;
  const next=g.startTraining('lan',a.id);assert.equal(g.finishTraining({sessionId:next.id,completed:true,score:60}).unlockedSkill,'laborJudgment');
  g.tick=200;assert.match(g.trainingWhy('lan',a.id),/cap/);
  assert.equal(g.finishTraining(result),null);
});

test('C1 acceleration and old fire-control levels do not fabricate personal scores; fire QTE unlocks once',()=>{
  const g=game('th',['plerng']), a=g.crew[0];
  g.fireControl.actors[a.id]={level:3,readyAt:0};
  assert.equal(g.skillUnlocked(a,'copperInferno'),false);assert.equal(g.fireTrainingWhy(a,1000),'');
  for(let round=0;round<2;round++){
    const s=g.beginFireTraining(a,1000+round*400000);assert.ok(s);
    for(let i=0;i<5;i++)assert.ok(g.attemptFireTraining(s,true,1000+round*400000));
    assert.equal(g.attemptFireTraining(s,true),null);
  }
  assert.equal(g.skillUnlocked(a,'copperInferno'),true);
  const copy=createGame();copy.restore(JSON.parse(JSON.stringify(g.snapshot())));assert.equal(copy.skillUnlocked(copy.roster[a.id],'copperInferno'),true);
});

test('C1 damage/heal formula uses existing effective stats and fire bonus exactly once; base specials share CD',()=>{
  for(const [skill,expected] of [['copperInferno',56],['laborJudgment',51],['shadowCleaver',51],['abyssGatebreaker',78],['karmaFracture',28]]){
    const kind=COMBAT_SKILLS[skill].actor,g=game('cyberhell',[kind]),a=kind==='guard'?g.guard:g.crew[0];
    // Thai base formulas are also covered independently of the training used to unlock.
    g.zone='th';a.homeZone=kind==='guard'?'th':'global';a.id=kind==='guard'?'th:guard':a.id;
    assert.equal(skillEffect(g,a,skill).damage,expected,skill);
  }
  const g=game('th',['plerng']),a=g.crew[0];unlock(g,a,'copperInferno');g.fireControl.actors[a.id]={level:2,readyAt:0};battle(g);
  command(g,'copperInferno',a.id);assert.equal(g.battle.dmg.foe,59);assert.equal(a.morale,94);assert.equal(a.helpRemainingMs,120000);
  assert.match(g.crewHelpWhy(a),/120/);assert.equal(g.battleAct('crew:plerng'),false);
  const h=game('th',['guard']);unlock(h,h.guard,'abyssGatebreaker');battle(h);command(h,'abyssGatebreaker',h.guard.id);
  assert.equal(h.guard.helpRemainingMs,120000);assert.equal(specialCooldown(h.guard),120);h.advanceBattleTime(120000);
  command(h,'guard',h.guard.id);assert.equal(specialCooldown(h.guard),20);assert.equal(h.guard.helpRemainingMs,20000);
});

test('C1 support skills target full HP, shield takes post-defend damage, stronger effects replace rather than add',()=>{
  const g=game('cyberhell',['nira','boon']);const n=g.crewOf('nira'),a=g.crewOf('boon');unlock(g,n,'mercySeal');unlock(g,a,'lotusSanctuary');battle(g);
  g.battle.youHp=g.battle.youMax;command(g,'mercySeal',n.id);
  assert.equal(g.battle.protection.you.shield,29);assert.equal(g.battle.protection.you.buff,.15);
  command(g,'lotusSanctuary',a.id);
  assert.equal(g.battle.protection.you.shield,38);assert.equal(g.battle.protection.you.buff,.2);
  assert.equal(attackBuff(g.battle,'you',100),120);assert.equal(attackBuff(g.battle,'you',0),0);assert.equal(g.battle.protection.you.attacks,1);
  // One real enemy hit after defending: 20 raw -> 10 after guard -> all 10 shield.
  command(g,'defend');g.battle.foes[0].atk=[20,20];g.teamPressure=()=>1;g.enemyTarget=()=>({id:'you'});
  const hp=g.battle.youHp;g.battle.turnQueue.remaining=[{id:g.battle.foes[0].id,side:'foe'}];g.runEnemyTurn();g.finishBattleCommand();
  assert.equal(g.battle.youHp,hp);assert.equal(g.battle.protection.you.shield,28);
  assert.equal(g.battle.dmg.enemyHits[0].absorbed,10);
  command(g,'defend');assert.equal(g.battle.protection.you,undefined);
});

test('C1 self protection lasts through two subsequent owner turns; non-damaging commands do not consume attack charges',()=>{
  const g=game('th',['nira']),a=g.crew[0];unlock(g,a,'mercySeal');battle(g);
  command(g,'mercySeal',a.id,a.id);assert.ok(g.battle.protection[a.id]);
  command(g,'defend',a.id);assert.equal(g.battle.protection[a.id].attacks,2);
  command(g,'defend',a.id);assert.equal(g.battle.protection[a.id],undefined);
});

for(const n of [3,5,7])test(`C1 combo snapshots ${n-1} actual teammates, charges once, ignores rage/buff/weapon, and T1 becomes ready on T6 (${n})`,()=>{
  const kinds=n===3?['taan','plerng']:n===5?['taan','plerng','dam','nira']:['taan','plerng','dam','nira','boon','guard'];
  const g=game('cyberhell',kinds);g.partyCap=()=>n;g.partyMax=()=>n-1-(g.guard?1:0);g.level=2;g.abilities.teamJudgment=true;g.abilities.cooldownClock=true;
  battle(g);g.battle.rageTurns=3;g.battle.weaponCd=2;grantProtection(g.battle,'you',{shield:24,buff:.2});
  const expected=teamCombo(g).reduce((sum,h)=>sum+h.damage,0),mp=g.mp, morale=g.battleActors().map(a=>a.morale);
  actorTurn(g,'you');assert.equal(g.confirmBattleCommand('teamJudgment'),true);
  assert.equal(g.battle.comboHits.length,n);assert.equal(g.battle.dmg.foe,expected);assert.equal(g.mp,mp-24);
  assert.equal(g.battle.rageTurns,3);assert.equal(g.battle.protection.you.attacks,2);assert.equal(g.battle.weaponCd,2);
  assert.deepEqual(g.battleActors().map(a=>a.morale),morale);
  const hp=g.battle.foes[0].hp;assert.equal(g.confirmBattleCommand('teamJudgment'),false);assert.equal(g.battle.foes[0].hp,hp);
  g.finishBattleCommand();g.finishBattleCommand();assert.equal(g.battle.actorTurns.you,1);
  g.advanceBattleTime(999999);assert.equal(g.teamJudgmentRemaining(),4);
  // Yama's clock command is T2; it advances the owner's turn but does not clear ultimate CD.
  command(g,'cooldownClock');assert.equal(g.teamJudgmentRemaining(),3);
  for(let t=3;t<=5;t++){assert.match(g.skillWhy('teamJudgment',{id:'you'}),/เทิร์น/);command(g,'defend');}
  assert.equal(g.teamJudgmentRemaining(),0);command(g,'teamJudgment');
});

test('C1 combo retargets deterministically without spill and omits fallen/absent/guest actors',()=>{
  const g=game('cyberhell',['taan','plerng','nira']);g.level=2;g.abilities.teamJudgment=true;battle(g);
  g.battle.absentActors=[g.crewOf('plerng').id];g.crewOf('nira').morale=0;
  g.battle.foes[0].hp=1;g.battle.foes.push({...g.battle.foes[0],id:'second',hp:100,maxHp:100});
  command(g,'teamJudgment');assert.equal(g.battle.comboHits.length,2);
  assert.deepEqual(g.battle.comboHits.map(h=>[h.foeId,h.dealt]),[[g.battle.foes[0].id,1],['second',64]]);
  assert.equal(g.battle.foes[1].hp,36);
});

test('C1 total party cap grows 3/4/5/6/7 without creating actors or deleting excess saved selections',()=>{
  const g=createGame();assert.equal(g.partyCap(),3);assert.equal(g.battleActors().length,3);
  g.zoneEvents.th={frontierBreach:'cleared'};assert.equal(g.partyCap(),4);
  for(const [zone,cap] of [['asia',5],['west',6],['cyberhell',7]]){g.zone=zone;assert.equal(g.partyCap(),cap);}
  g.zoneSave={cyberhell:{crew:[]}};g.zone='th';assert.equal(g.partyCap(),7);
  const legacy=JSON.parse(readFileSync(new URL('./fixtures/b1-v3.json',import.meta.url)));
  const ids=['th:taan','asia:taan','west:taan','cyberhell:taan','th:kan','west:boon'];legacy.party.finalMembers=ids;
  const h=createGame();assert.ok(h.restore(legacy));assert.deepEqual(h.party.finalMembers,ids);
  h.battle={kind:'zoneEvent',eventKey:'cyberFinal',team:ids};assert.equal(h.battleActors().length,7);
  const saved=h.snapshot();assert.deepEqual(saved.party.finalMembers,ids);
});

test('C1 victory grants teamJudgment and Guard once; old cleared saves infer only Yama entitlement',()=>{
  const g=game('th',['taan','nira']);g.zoneEvents.th={frontierBreach:'pending',devaTest:'cleared'};
  g.frontierOf().team=['taan','nira'];const b=g.startFrontierBreach();assert.ok(b);b.wave=2;b.foes=g.frontierBreachFoes(2);b.selectedFoeId=b.foes[0].id;
  b.foes.forEach(f=>f.hp=1);g.abilities.windFan=true;g.mp=100;assert.equal(g.battleAct('windFan'),true);
  assert.equal(g.abilities.teamJudgment,true);assert.ok(g.guard);assert.equal(g.partyCap(),4);
  assert.equal(g.storyQueue.filter(s=>s.key==='c1-guard-arrival').length,1);
  const coin=g.coin;assert.equal(g.battleAct('windFan'),false);assert.equal(g.coin,coin);
  const d=g.snapshot();d.guard=null;delete d.roster['th:guard'];delete d.abilities.teamJudgment;
  const h=createGame();h.restore(d);assert.equal(h.abilities.teamJudgment,true);assert.equal(h.guard,null);
});

test('C1 final save/load retains cooldown, protection and already-applied hits; next encounter keeps remaining owner turns',()=>{
  const g=game('cyberhell',['taan','guard']);g.abilities.teamJudgment=true;const b=battle(g);
  Object.assign(b,{kind:'zoneEvent',eventKey:'cyberFinal',encounter:'minion:1'});g.zoneEvents.cyberhell={cyberBreach:'cleared',signalClose:'cleared',cyberFinal:'active'};
  g.finalEventState().activeEncounter='minion:1';g.finalEventState().phase='minions';grantProtection(b,'you',{shield:24,buff:.2});
  command(g,'teamJudgment');assert.equal(g.finalEventState().teamCooldownTurns,4);
  const snap=JSON.parse(JSON.stringify(g.snapshot())),h=createGame();assert.ok(h.restore(snap));
  assert.equal(h.teamJudgmentRemaining(),4);assert.equal(h.battle.protection.you.shield,24);
  assert.equal(h.battle.foes[0].hp,b.foes[0].hp);assert.equal(h.battle.comboHits.length,b.comboHits.length);
  const remaining=h.finalEventState().teamCooldownTurns;h.battle=null;
  const s=h.finalEventState();s.activeEncounter=null;s.phase='ready';s.minionsCleared=1;s.pendingReward=null;h.pendingReward=null;
  assert.ok(h.startFinalEncounter('minion:2'));assert.equal(h.teamJudgmentRemaining(),remaining);
});

test('C1 encounter scaling is frozen at creation, handles teams 3–7, and does not increase enemy ATK',()=>{
  for(const n of [3,4,5,6,7]){
    const b={kind:'zoneBoss',wave:1,foes:[{id:'boss',boss:true,hp:100,maxHp:100,atk:[10,20]},{id:'add',hp:30,maxHp:30,atk:[4,8]}]};
    scaleEncounter(b,n);assert.equal(b.foes[0].hp,Math.round(100*encounterProfile(b,n).hp));
    assert.deepEqual(b.foes[0].atk,[10,20]);assert.equal(b.foes.length,2+Math.floor((n-3)/2));
    const snapshot=structuredClone(b);scaleEncounter(b,1);assert.deepEqual(b,snapshot);
  }
});

test('C1 regional art uses explicit Thai fallbacks and all referenced scenes/icons exist',()=>{
  for(const skill of Object.keys(COMBAT_SKILLS))for(const zone of ['th','asia','west','cyberhell']){
    assert.deepEqual(skillScenes(skill,zone),skillScenes(skill,'th'));
    for(const src of [...skillScenes(skill,zone),SKILL_ICONS[skill]])assert.ok(existsSync(new URL('../'+src,import.meta.url)),src);
  }
});

for (const reduced of [false,true]) test(`C1 skip/duplicate animation completion applies once, reduced motion=${reduced} (actual UI executeSkill)`,async()=>{
  const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
  const start=ui.indexOf('    const executeSkill = async'),end=ui.indexOf('    const executeCommand = async',start);
  const g=game('cyberhell',['taan','plerng']);g.abilities.teamJudgment=true;battle(g);actorTurn(g,'you');
  let finishes=0,hits=0;const realFinish=g.finishBattleCommand.bind(g);g.finishBattleCommand=()=>{finishes++;realFinish();};
  const context={g,COMBAT_SKILLS,skillScenes,SKILL_CAST_MS,allyImg:()=>null,dlg:{open:true},vitalsOf:()=>({}),commandMenuOpen:true,phase:null,phaseAt:0,skillView:null,fxNow:null,
    matchMedia:()=>({matches:reduced}),paint(){},playSkillScene:async()=>{},keyOfActor:id=>id,foeImg:()=>({}),
    runDash:async options=>{
      hits++;options.onHit();const visible=context.skillView.foes[0].hp;
      options.onHit();assert.equal(context.skillView.foes[0].hp,visible,'duplicate callback does not repeat the visual hit');
      options.onFinish();options.onFinish();
    },
    startMoveFx(){},showHeals(){},finishWave(){},refresh(){},finish(){},setTimeout,Date};
  const execute=vm.runInNewContext(ui.slice(start,end)+'\nexecuteSkill;',context);
  const before=g.battle.foes[0].hp;await execute('teamJudgment','you');
  assert.equal(hits,reduced?0:3);assert.equal(finishes,1);assert.equal(before-g.battle.foes[0].hp,g.battle.comboHits.reduce((sum,h)=>sum+h.dealt,0));
});

test('C1 wave transition keeps owner-turn cooldown and encounter party size after a teammate falls',()=>{
  const g=game('th',['taan','plerng']);g.zoneEvents.th={frontierBreach:'pending',devaTest:'cleared'};
  g.abilities.teamJudgment=true;g.frontierOf().team=['taan','plerng'];
  const b=g.startFrontierBreach();b.foes.forEach(f=>f.hp=1);g.mp=100;g.beginBattleTurns();
  command(g,'teamJudgment');assert.ok(b.pendingWave);assert.equal(g.teamJudgmentRemaining(),4);
  const size=b.balance.partySize;g.crewOf('plerng').morale=0;
  assert.equal(g.advanceFrontierBreachWave(),true);g.beginBattleTurns();
  assert.equal(g.teamJudgmentRemaining(),4);assert.equal(b.balance.partySize,size);
  const hp=b.foes.map(f=>f.hp);g.prepareEncounter();assert.deepEqual(b.foes.map(f=>f.hp),hp);
});

test('C1 loading a final command before animation completes settles its turn once without replaying costs or damage',()=>{
  const g=game('cyberhell',['taan','guard']);g.abilities.teamJudgment=true;const b=battle(g);
  Object.assign(b,{kind:'zoneEvent',eventKey:'cyberFinal',encounter:'minion:1'});
  g.zoneEvents.cyberhell={cyberFinal:'active'};g.finalEventState().phase='minions';g.finalEventState().activeEncounter='minion:1';
  actorTurn(g,'you');assert.equal(g.confirmBattleCommand('teamJudgment'),true);
  assert.equal(b.commandBusy,true);const hp=b.foes[0].hp,mp=g.mp;
  const h=createGame();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
  assert.equal(h.battle.foes[0].hp,hp);assert.equal(h.mp,mp);assert.equal(h.battle.actorTurns.you,1);
  assert.equal(h.teamJudgmentRemaining(),4);assert.equal(h.battle.commandBusy,false);
  h.finishBattleCommand();assert.equal(h.battle.actorTurns.you,1);
  const k=createGame();k.restore(JSON.parse(JSON.stringify(h.snapshot())));
  assert.equal(k.battle.actorTurns.you,1);assert.equal(k.teamJudgmentRemaining(),4);
});

test('C1 imported release aliases and review entry share the changed modules and stylesheet',()=>{
  const modules=['actor-recovery','battle-fx-map','battle-fx-tex','battle-fx','battle-turns','combat-skill-assets','combat-skills','data','game','krata-control','party-balance','progression','roster','story','team-hud','training','ui'];
  for(const page of ['index.html','output/game-review/index.html']){
    const html=readReleaseFile(page);
    for(const module of modules) assertModuleRelease(`src/${module}.js`,html);
    assertModuleRelease('src/ui.js',html,null,{entry:true});
    assertModuleRelease('src/minigames/krata-qte.js',html);
    assertStylesheetRelease('src/command-wheel.css',html);
  }
});

test('C1 ranged FX fly once for 250 ms in either direction; reduced motion keeps only the impact',()=>{
  const source=readFileSync(new URL('../src/battle-fx.js',import.meta.url),'utf8')
    .replace(/^import .*;$/gm,'').replace(/^export \{.*\};$/gm,'').replace(/\bexport /g,'');
  const context=vm.createContext({...fxMapping,SKILL_FX,TEX_KEYS:[],preloadTex(){},performance,
    requestAnimationFrame:()=>1,cancelAnimationFrame(){}});
  vm.runInContext(source+`\nE.canvas={};E.stage={style:{}};E.w=900;E.h=500;
    globalThis.run=(action,reduced,mirror)=>{stopBattleFx();E.reduce=reduced;
      playBattleFx({action,opts:{skill:action},numbers:false,
        src:mirror?{l:650,t:150,r:750,b:350}:{l:50,t:150,r:150,b:350},
        targets:[{rect:mirror?{l:50,t:150,r:150,b:350}:{l:650,t:150,r:750,b:350}}]});return E.items;};`,context);
  for(const action of ['copperInferno','karmaFracture'])for(const mirror of [false,true]){
    const items=context.run(action,false,mirror),flight=items.find(i=>typeof i.x==='function');
    assert.equal(items.length,2,'one projectile and one impact, without the legacy recipe');
    assert.equal(flight.dur,250);assert.equal(flight.x(0)<flight.x(1),!mirror);
    assert.ok(flight.y(0)>150&&flight.y(0)<250,'origin stays in the upper body of the measured sprite');
    assert.equal(items.find(i=>i!==flight).delay,250);
    const reduced=context.run(action,true,mirror);assert.equal(reduced.length,1);assert.equal(reduced[0].delay,0);
  }
});
