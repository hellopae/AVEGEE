import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createGame } from '../src/game.js';
import { DEEDS, ZONES } from '../src/data.js';
globalThis.Image=class {};
const ui=fs.readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const section=(a,b)=>ui.slice(ui.indexOf(a),ui.indexOf(b,ui.indexOf(a)));

for(const scene of ['map','battle','popup','cutscene']) test(`pause is idempotent and restores ${scene} after one resume`,()=>{
 const underlying={scene,open:scene!=='map',focus(){this.focused=true;}};
 const buttons={};const pauseDlg={open:false,querySelector(k){return buttons[k]??= {};},showModal(){this.open=true;},close(){this.open=false;}};
 const g={paused:underlying.open,over:false};
 const ctx={g,dlg:underlying,pauseDlg,started:true,document:{hidden:false},esc:String,t:String,updatePlay(){},pauseForDlg(){g.paused=true;},goMenu(){},openSettings(){},openLegacyDrawer(){},addEventListener(){},setTimeout(){}};
 vm.createContext(ctx);
 vm.runInContext('let userPaused=false,autoPausePending=false;'+section('function releaseDlgPause()',"dlg.addEventListener('close', () => setTimeout(releaseDlgPause")+section('function finishPause()', '\nfunction updatePlay()'),ctx);
 for(let round=0;round<3;round++){
  ctx.pauseWhenLeaving();ctx.pauseWhenLeaving();ctx.showAutoPause();ctx.showAutoPause();ctx.openPause(true);ctx.pauseWhenLeaving();ctx.showAutoPause();
  assert.equal(pauseDlg.open,true);assert.equal(underlying.scene,scene);
  buttons['#pause-resume'].onclick();ctx.releaseDlgPause();ctx.showAutoPause();
  assert.equal(pauseDlg.open,false);assert.equal(g.paused,underlying.open);assert.equal(vm.runInContext('userPaused || autoPausePending',ctx),false);
 }
 underlying.open=false;ctx.releaseDlgPause();assert.equal(g.paused,false);
});

test('stale native close event cannot consume new dialog close handler',()=>{
 const listeners=new Set();const ctx={dlgGen:2,dlg:{open:true,addEventListener(_,h){listeners.add(h)},removeEventListener(_,h){listeners.delete(h)}},calls:0};
 vm.createContext(ctx);vm.runInContext(section('function onDlgClose(', '/** เวที Turn-based'),ctx);
 vm.runInContext('onDlgClose(()=>calls++)',ctx);
 for(const h of [...listeners]) h();assert.equal(ctx.calls,0);assert.equal(listeners.size,1);
 ctx.dlg.open=false;for(const h of [...listeners]) h();assert.equal(ctx.calls,1);
});

test('all new zones clear previous bridge and walk commands; first souls are new',()=>{
 const g=createGame();g.level=5;for(const z of ZONES)g.bossCleared[z.k]=true;
 for(const zone of ['asia','west','cyberhell']){
  g.bossWalk={started:1};g.huntMob=true;g.player.path=[[1,1]];
  assert.equal(g.moveZone(zone),true);assert.equal(g.bossWalk,null);assert.equal(g.huntMob,false);
  assert.ok(g.queue.length);assert.ok(g.queue.every(s=>!s.back));
  g.paused=false;assert.equal(g.walkTo(g.player.x+20,g.player.y),true);
  const before=g.player.x;g.stepWorld(100);assert.notEqual(g.player.x,before);
 }
});

const record=zone=>({fromId:900,gave:3,who:'ผู้ทดสอบ',sex:'f',sp:1,zone,at:0,deeds:[{t:'หลอกเอาเงิน',s:'kong',w:4}],merits:[]});
test('delayed returns stay in original zone, including legacy saves',()=>{
 const g=createGame();g.level=5;g.bossCleared.th=true;g.bossCleared.asia=true;g.zoneEvents.th={thBorderBoss:'cleared'};g.moveZone('west');g.paused=false;g.courtClosed=true;
 g.returning=[record('th'),record(undefined),record('asia')];g.step();
 assert.ok(g.queue.every(s=>!s.back));assert.equal(g.zoneSave.th.queue.filter(s=>s.back).length,2);
 assert.equal(g.returning.length,1); // unvisited source cannot spill into the active zone
 const restored=createGame();assert.equal(restored.restore(g.snapshot()),true);assert.equal(restored.returning.length,1);
});
test('a soul actually punished in its branch can still return',()=>{
 const g=createGame();const R=record('th');
 g.sentences.push({soul:{id:R.fromId,who:R.who,sp:R.sp,sex:R.sex,deeds:R.deeds,merits:[]},zone:'th',stage:'prison',intensity:3,inspected:true,repentant:false});
 assert.equal(g.moveFromPrison(900),true);g.advanceAfterlife(100000);
 const soul=g.queue.find(s=>s.back?.id===900);assert.ok(soul);assert.equal(soul.back.gave,3);
});
test('voice fraud uses existing kong category and generates contradictory claim',()=>{
 const deed=DEEDS.find(d=>d.t==='ตัดต่อเสียงพ่อแม่เพื่อหลอกเอาเงินจากลูกของเขา');assert.equal(deed.s,'kong');
 const g=createGame();const soul=g.mkReturnSoul({...record('cyberhell'),deeds:[{...deed,known:true}]});
 const deny=soul.lines.find(l=>l.kind==='deny');assert.ok(deny);assert.equal(deny.sin,'kong');
 const result=g.press(soul,deny.i);assert.ok(result);assert.equal(deny.used,true);assert.ok(result.some(x=>x.kind==='truth'));
});
