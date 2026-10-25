import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {STATIONS,ZONE_EVENTS,starsOf,DAD,LEVELS} from '../src/data.js';
import {verdictSceneImage} from '../src/verdict-scene.js';
import {harbourTravel} from './helpers/travel.mjs';
import {resetWalk} from '../src/walk.js?v=k1d';
import {onceFeedbackDismiss} from '../src/interrogation-ui.js';
globalThis.Image??=class{};
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
function fixture(zone='th'){
 resetWalk();const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=100000;g.food=1000;g.level=5;g.bossCleared={th:true,asia:true,west:true};
 for(const [z,events] of Object.entries(ZONE_EVENTS))g.zoneEvents[z]=Object.fromEntries(events.map(e=>[e.k,'cleared']));
 if(zone!=='th')assert.ok(harbourTravel(g,zone));
 g.queue=[];g.courtArrivals=[];g.afterlifeWalks=[];g.storyQueue=[];g.mobs=[];g.pendingZone=null;g.paused=false;
 if(!g.has('krata'))g.stations.push({def:STATIONS.find(s=>s.k==='krata'),slots:[],build:0,repair:0,fire:0});
 g.hpMax=LEVELS[g.level-1].hpMax;g.hp=g.hpMax;g.hire('taan');g.syncBlocks(true);return g;
}
function assign(g,score,extra={}){
 const soul={id:999001,name:'ผู้ต้องคดี',who:'ผู้ต้องคดี',sex:'m',sp:7,deserved:2,deeds:[],merits:[],said:[],courtDisembarked:true};g.queue=[soul];
 const c=g.crew.find(c=>!c.reader&&!c.self);assert.ok(c);
 g.judge=()=>({score,tham:70,ked:60,karma:0,over:0,short:0,reason:'เลือกสถานที่ตรงกรรม แต่ระดับทัณฑ์ยังคลาดเคลื่อน',...extra});
 assert.equal(g.assign(soul.id,'krata',c.k,2),true);return g.pendingVerdictScene;
}
for(const zone of ['th','asia','west','cyberhell'])test(`A5 ${zone}: real assign queues a head scene for every grade boundary`,()=>{
 for(const score of [0,24,25,41,42,49,50,57,58,74,75,77,78,81,82,89,90,100]){
  const g=fixture(zone),coin=g.coin,hp=g.hp,sc=assign(g,score),stars=starsOf(score);
  assert.ok(sc,`${zone}/${score} missing scene`);assert.equal(sc.zone,zone);assert.equal(sc.score,score);assert.equal(sc.stars,stars);assert.equal(sc.id,999001);assert.equal(sc.reason,g.pendingVerdict.reason);assert.equal(g.pendingVerdict.scene,true);
  assert.ok(verdictSceneImage(sc.zone,sc.kind));assert.equal(g.casesDone,1);assert.equal(g.ledger.filter(r=>r.id===999001).length,1);
  assert.equal(g.coin-coin,stars===5?60:stars===4?25:0,'presentation does not add bonuses');
  if(stars===4){assert.match(sc.reward,/\+25/);assert.doesNotMatch(sc.line,/ทุกข้อ|ไม่เกินไม่ขาด/);assert.equal(g.hp,hp);}
  if(score>=50&&score<90){assert.equal(sc.step,0);assert.equal(g.reds,0);assert.equal(g.pendingWarn,undefined);assert.equal(g.dadFight,undefined);if(stars<4)assert.equal(sc.reward,null);}
 }
});
for(const zone of ['th','asia','west','cyberhell'])test(`A5 ${zone}: pending ordinary review survives reload without duplicate rewards`,()=>{
 const g=fixture(zone);const sc=assign(g,80),before={coin:g.coin,hp:g.hp,karma:g.karma,cases:g.casesDone};
 const h=createGame();h.save=()=>true;h.onChange=()=>{};assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));assert.deepEqual(h.pendingVerdictScene,sc);
 assert.deepEqual({coin:h.coin,hp:h.hp,karma:h.karma,cases:h.casesDone},before);assert.equal(h.pendingVerdict,null,'a stale map badge is not restored');
 const again=createGame();again.save=()=>true;again.onChange=()=>{};assert.ok(again.restore(JSON.parse(JSON.stringify(h.snapshot()))));assert.deepEqual(again.pendingVerdictScene,sc);assert.equal(again.coin,before.coin);
});
test('A5 non-red over-punishment is a critical scene with no bonus or new red escalation',()=>{
 const g=fixture(),coin=g.coin,hp=g.hp,sc=assign(g,95,{over:3,karma:3});
 assert.equal(sc.kind,'blame');assert.equal(sc.step,0);assert.equal(sc.stars,2);assert.match(sc.line,/เกินกรรม/);assert.equal(sc.reward,null);assert.equal(g.coin,coin);assert.ok(g.hp<hp);assert.equal(g.reds,0);assert.equal(g.star5,0);
});
test('A5 real scene consumes and skips once, leaving red warning effects untouched across reload',()=>{
 const g=fixture();g.reds=DAD.warnFireballAt-1;assign(g,30);const before={coin:g.coin,hp:g.hp,karma:g.karma,cases:g.casesDone,reds:g.reds},warning=structuredClone(g.pendingWarn);
 let saved,done,closed=0,changed=0;const dlg={innerHTML:'',querySelector:()=>({set onclick(fn){done=fn;}}),close(){closed++;}};
 g.save=()=>{saved=JSON.parse(JSON.stringify(g.snapshot()));return true;};g.onChange=()=>changed++;
 const ctx=vm.createContext({g,dlg,pauseForDlg(){},openDlg(){},prepareComicImages(){},esc:v=>String(v??''),verdictSceneImage,artUrl:()=>'',onDlgClose:fn=>{ctx.closeHandler=fn;}});
 vm.runInContext(ui.slice(ui.indexOf('function openVerdictScene()'),ui.indexOf('\nfunction openDadPunish')),ctx);
 ctx.openVerdictScene();assert.equal(g.pendingVerdictScene,null);assert.equal(g.pendingVerdict,null);assert.equal(saved.pendingVerdictScene,null);assert.match(dlg.innerHTML,/verdict-reason/);assert.match(dlg.innerHTML,/style="color:var\(--destructive\)"/);assert.match(dlg.innerHTML,/data-verdict-scene-done/);
 done();ctx.closeHandler();ctx.openVerdictScene();assert.equal(closed,1);assert.equal(changed,1);assert.deepEqual(g.pendingWarn,warning);
 assert.deepEqual({coin:g.coin,hp:g.hp,karma:g.karma,cases:g.casesDone,reds:g.reds},before);
 const h=createGame();h.save=()=>true;h.onChange=()=>{};assert.ok(h.restore(saved));assert.equal(h.pendingVerdictScene,null);assert.equal(h.hp,before.hp);assert.equal(h.coin,before.coin);assert.deepEqual(h.pendingWarn,warning);
});
test('A5 consumed scene still suppresses the old map bubble, including a stale dismissal timer',()=>{
 let timer;const g={pendingVerdict:{},pendingVerdictScene:null,coin:100,over:null};
 const ctx=vm.createContext({g,fx:null,sfx(){},verdictComment:v=>v.reason,performance:{now:()=>0},onceFeedbackDismiss,clearTimeout(){},setTimeout:fn=>{timer=fn;},drawOverlay(){},updatePlay(){},openEnding(){}});
 vm.runInContext(ui.slice(ui.indexOf('function showVerdict(v)'),ui.indexOf('\nfunction openEnding(o)')),ctx);
 ctx.showVerdict({scene:true,stars:4,reason:'คำตัดสินเดิม'});assert.equal(ctx.fx.quiet,true);const old=timer;
 ctx.showVerdict({scene:true,stars:3,reason:'คำตัดสินใหม่'});old();assert.equal(ctx.fx.reason,'คำตัดสินใหม่');assert.equal(ctx.fx.quiet,true);timer();assert.equal(ctx.fx,null);assert.equal(g.coin,100);
});
