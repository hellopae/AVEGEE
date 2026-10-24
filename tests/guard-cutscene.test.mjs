import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {createGame} from '../src/game.js';
import {planDash,dashTiming,createDashSequence} from '../src/battle-dash.js';
import {GUARD} from '../src/data.js';
import {regionalCrewCutscene} from '../src/zone-introductions.js';
globalThis.Image??=class {};
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const dashSource=ui.slice(ui.indexOf('  const runDash = async'),ui.indexOf('  const finishWaveAfterDash ='));
function game(){
 const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;g.hireGuard();g.party.members=[];
 g.startBattle({id:90210,who:'คู่ซ้อม',deserved:4,resist:true});
 const b=g.battle;for(const f of b.foes)f.hp=f.maxHp=10000;
 g.beginBattleTurns();b.turnQueue.remaining=[{id:g.guard.id,side:'ally'},{id:'you',side:'ally'},...b.foes.map(f=>({id:f.id,side:'foe'}))];
 g.beginBattleTurns();assert.equal(b.actorId,g.guard.id);return g;
}
async function harness({reduced=false,mounted=true,action='guard'}={}){
 const g=game(),b=g.battle;let now=0,id=0;const timers=new Map(),cuts=[],positions=[],hits=[];
 const image={};const stage={_battleSpriteFit:Promise.resolve(true)};
 const deps={g,dlg:{open:true,querySelector:()=>stage},phase:null,phaseAt:0,phaseTimer:0,commandMenuOpen:true,dash:null,fxNow:null,fxHandled:false,
  setMoveName(){},clearMoveName(){},dashRoot:()=>null,allyImg:()=>image,foeImg:()=>image,
  fxRect:async()=>({l:100,r:150,t:100,b:200}),cameraRectOf:()=>({l:100,r:150,t:100,b:200}),
  planDash,dashTiming,createDashSequence,ACTION_CUT_MS:1300,
  keyOfActor:id=>id===g.guard.id?'guard':id,paint(){},applyDashPosition(){positions.push({...deps.dash.position});},
  playActionCutscene:key=>{cuts.push({key,at:now,hp:b.foes[0].hp});return mounted;},
  camera:{flash(){}},moveName:null,powerSound(){},startMoveFx(){},finish(){},finishWaveAfterDash(){},sfx(){},
  performance:{now:()=>now},matchMedia:()=>({matches:reduced}),userPaused:false,pauseDlg:{open:false},
  setTimeout:(fn,delay)=>{const key=++id;timers.set(key,{fn,at:now+delay});return key;},clearTimeout:key=>timers.delete(key)};
 const run=vm.runInNewContext(dashSource+'\nrunDash;',deps);
 await run({side:'you',key:'guard',targetImage:image,contact:260,pose:580,action,crew:'guard',onHit:()=>{hits.push(now);return g.confirmBattleCommand('guard');},onFinish(){}});
 const advance=at=>{for(;;){const next=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>at)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=at;};
 return {g,b,deps,advance,cuts,hits,positions};
}
for(const reduced of [false,true])test(`A1 Guard cutscene precedes one real contact and keeps its turn until return (reduced=${reduced})`,async()=>{
 const h=await harness({reduced}),{g,b}=h;const hp=b.foes[0].hp,morale=g.guard.morale;
 assert.deepEqual(h.cuts,[{key:'guard',at:0,hp}]);assert.equal(b.commandBusy,true);
 assert.equal(g.confirmBattleCommand('guard'),false,'second input is blocked during cutscene');
 h.advance(1299);assert.equal(b.foes[0].hp,hp);assert.equal(g.guard.morale,morale);assert.equal(g.guard.helpRemainingMs,0);
 const timing=dashTiming({reduced,leadIn:1300});h.advance(timing.hit-1);assert.equal(b.foes[0].hp,hp);
 h.advance(timing.hit+16);assert.ok(b.foes[0].hp<hp);assert.equal(h.hits.length,1);assert.equal(g.guard.morale,morale-GUARD.helpMorale);assert.equal(g.guard.helpRemainingMs,GUARD.helpCdMs);assert.equal(g.currentBattleTurn().id,g.guard.id);
 const after=b.foes[0].hp;h.advance(timing.end+32);assert.equal(g.currentBattleTurn().id,'you');assert.equal(b.commandBusy,false);h.advance(9000);assert.equal(h.hits.length,1);assert.equal(b.foes[0].hp,after);
 if(reduced)assert.ok(h.positions.every(p=>p.x===0&&p.y===0));
});
test('A1 absent cutscene has no blank delay; other melee paths do not acquire a new cutscene',async()=>{
 const h=await harness({mounted:false});h.advance(dashTiming().hit+16);assert.equal(h.hits.length,1);
 const ordinary=await harness({action:'atk'});assert.deepEqual(ordinary.cuts,[]);ordinary.advance(dashTiming().hit+16);assert.equal(ordinary.hits.length,1);
});
test('A1 closing/replacing the battle during the introduction does not pay or hit a new battle',async()=>{
 for(const replacement of [false,true]){const h=await harness(),hp=h.b.foes[0].hp,morale=h.g.guard.morale;
  if(replacement)h.g.battle={foes:[{hp:9999}]};else h.deps.dlg.open=false;
  h.advance(5000);assert.equal(h.hits.length,0);assert.equal(h.b.foes[0].hp,hp);assert.equal(h.g.guard.morale,morale);assert.equal(h.g.guard.helpRemainingMs,0);
  if(replacement)assert.equal(h.g.battle.foes[0].hp,9999);
 }
});
test('A1 actual Guard identity determines branch cutscene independently of Yama outfit',()=>{
 const start=ui.indexOf('function crewCutsceneSrc('),end=ui.indexOf('\n}\n',start)+2;
 for(const zone of ['th','asia','west','cyberhell']){
  const g={zone:'th',outfit:'cyberhell',roster:{},guard:{kind:'guard',k:'guard',homeZone:zone}};
  const lookup=vm.runInNewContext(ui.slice(start,end)+'\ncrewCutsceneSrc;',{g,regionalCrewCutscene,artUrl:(k,ext,z)=>`${k}.${z}.${ext}`});
  const result=lookup('guard');assert.equal(result.src,regionalCrewCutscene('guard',zone).src);assert.ok(existsSync(new URL('../'+result.src,import.meta.url)));
 }
});
