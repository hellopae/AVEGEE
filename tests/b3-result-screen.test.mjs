import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {rewardView,startRewardCount,selectedLivingFoeId,battleStatuses,specialMoveKey} from '../src/battle-result.js';
import {createGame} from '../src/game.js';
import {win} from './final-event-helpers.mjs';
globalThis.Image ??= class {};

function clock() {
  let now=0,id=0;const jobs=new Map(),timers=new Map();
  const advance=(ms,render=true)=>{now+=ms;for(const [key,job] of [...timers])if(job.at<=now){timers.delete(key);job.fn();}if(render){const tasks=[...jobs.values()];jobs.clear();tasks.forEach(fn=>fn(now));}};
  return {now:()=>now,raf:fn=>{jobs.set(++id,fn);return id;},caf:i=>jobs.delete(i),schedule:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},unschedule:i=>timers.delete(i),get pending(){return jobs.size+timers.size;},step:advance,timersOnly:ms=>advance(ms,false)};
}
test('B3 receipt view combines duplicate drops without modifying a paid receipt',()=>{
  const receipt={coin:65,exp:30,items:[{k:'lotus',n:1},{k:'tea',n:2},{k:'lotus',n:2}],weapons:['th','th'],abilities:['ice','ice']};
  const original=JSON.stringify(receipt),v=rewardView(receipt);
  assert.deepEqual(v,{coin:65,exp:30,items:[{k:'lotus',n:3},{k:'tea',n:2}],weapons:['th'],abilities:['ice']});
  assert.equal(JSON.stringify(receipt),original);
});
test('B3 display reaches the exact totals within 800ms and announces only once',()=>{
  const c=clock(),updates=[],done=[];startRewardCount({coin:135,exp:27,...c,onUpdate:v=>updates.push(v),onDone:v=>done.push(v)});
  assert.deepEqual(updates[0],{coin:0,exp:0});c.step(300);assert.ok(updates.at(-1).coin>0&&updates.at(-1).coin<135);
  c.step(450);assert.deepEqual(updates.at(-1),{coin:135,exp:27});assert.equal(done.length,1);assert.equal(c.pending,0);c.step(1000);assert.equal(done.length,1);
});
test('B3 deadline finishes without animation frames and is cancelled with the dialog',()=>{
  const c=clock(),values=[];let done=0;startRewardCount({coin:88,exp:12,...c,onUpdate:v=>values.push(v),onDone:()=>done++});
  c.timersOnly(750);assert.deepEqual(values.at(-1),{coin:88,exp:12});assert.equal(done,1);assert.equal(c.pending,0);
  const other=clock();let touched=false;const run=startRewardCount({coin:4,...other,onDone:()=>touched=true});run.cancel();other.timersOnly(1000);assert.equal(touched,false);assert.equal(other.pending,0);
});
test('B3 skip finishes once; reduced motion and zero totals do not queue frames',()=>{
  const c=clock();let done=0;const run=startRewardCount({coin:50,exp:0,...c,onDone:()=>done++});
  assert.equal(run.skip(),true);assert.equal(run.skip(),false);assert.equal(done,1);assert.equal(c.pending,0);
  const r=clock(),values=[];startRewardCount({coin:40,exp:5,...r,reduced:true,onUpdate:v=>values.push(v)});
  assert.deepEqual(values,[{coin:40,exp:5}]);assert.equal(r.pending,0);
  const z=clock();startRewardCount({...z});assert.equal(z.pending,0);
});
test('B3 cancellation and receipt identity prevent writes from an old animation',()=>{
  const c=clock(),values=[];let current=true;startRewardCount({coin:99,...c,isCurrent:()=>current,onUpdate:v=>values.push(v)});
  current=false;c.step(500);assert.equal(values.length,1);assert.equal(c.pending,0);
  const other=clock();const run=startRewardCount({exp:30,...other,onUpdate:v=>values.push(v)});const before=values.length;run.cancel();other.step(900);assert.equal(values.length,before);assert.equal(other.pending,0);
});
test('B3 target and status presentation follows live state, deaths and replacement waves',()=>{
  const b={selectedFoeId:'two',foes:[{id:'one',hp:40,stun:1},{id:'two',hp:50,confuse:2,burn:{turns:3}}]};
  assert.equal(selectedLivingFoeId(b),'two');assert.deepEqual(battleStatuses(b.foes[1]),[{key:'confuse',n:2},{key:'burn',n:3}]);
  b.foes[1].hp=0;assert.equal(selectedLivingFoeId(b),'one');assert.deepEqual(battleStatuses(b.foes[1]),[]);assert.equal(b.selectedFoeId,'two','presentation does not modify the model');
  b.foes=[{id:'new-wave',hp:80,stun:0,confuse:0}];assert.equal(selectedLivingFoeId(b),'new-wave');assert.deepEqual(battleStatuses(b.foes[0]),[]);
  assert.deepEqual(battleStatuses({hp:30},{defending:true,rage:2}),[{key:'defend',n:1},{key:'rage',n:2}]);
});
test('B3 only special moves get a name; ordinary attacks and consumables stay ordinary',()=>{
  for(const k of ['fire','crew:taan','crew:nira','guard','ice','rage'])assert.equal(specialMoveKey(k),k);
  for(const k of ['atk','strike','health','food','defend','flee'])assert.equal(specialMoveKey(k),null);
  assert.equal(specialMoveKey(null,{name:'boss attack'}),'enemy');
});

// Execute the production reward opener with a minimal dialog adapter. The game receipt is real;
// the adapter only replaces rendering and the animation clock, not grants or acknowledgement.
const source=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const rewardSource=source.slice(source.indexOf('function openBattleReward() {'),source.indexOf('\nfunction openBossJustice()',source.indexOf('function openBattleReward() {')));
function rewardHarness(g,{reduced=false}={}) {
  const c=clock(),events=new Set(),elements=new Map();let html='',changes=0,closes=0;
  const el=()=>({textContent:'',onclick:null});
  const dlg={open:false,querySelector:s=>elements.get(s)||null,addEventListener:(n,fn)=>events.add(fn),removeEventListener:(n,fn)=>events.delete(fn),
    close(){this.open=false;closes++;[...events].forEach(fn=>fn());}};
  const ctx={g,dlg,dlgGen:0,rewardOpen:false,rewardAfter:null,rewardView,
    startRewardCount:opts=>startRewardCount({...opts,...c}),matchMedia:()=>({matches:reduced}),sfx(){},
    t:(k,p)=>p?k+' '+JSON.stringify(p):k,esc:v=>String(v),ITEMS:{lotus:{},tea:{}},itemName:k=>k,itemImg:()=>'<img>',weaponImg:()=>'<img>',ABILITY_FX:{},
    acknowledgeBossGuideGrant(){ctx.guideAcks++;},guideAcks:0,onDlgClose:fn=>fn(),
    modal(value){html=value;elements.clear();for(const name of ['next','live','coin','exp'])if(html.includes('data-reward-'+name))elements.set('[data-reward-'+name+']',el());dlg.open=true;ctx.dlgGen++;}};
  g.onChange=()=>changes++;g.save=()=>true;vm.createContext(ctx);vm.runInContext(rewardSource,ctx);
  return {ctx,c,dlg,get html(){return html;},get changes(){return changes;},get closes(){return closes;},node:name=>elements.get('[data-reward-'+name+']'),
    open:()=>ctx.openBattleReward(),oldCloseEvent:()=>[...events].forEach(fn=>fn())};
}
test('B3 real paid mob receipt: opening, skipping, repeated clicking and closing never grant again',()=>{
  const g=createGame();g.mobs.push({id:999,kind:0});g.startMobBattle(0);win(g);g.endBattle();assert.ok(g.pendingReward);
  const before=JSON.stringify([g.coin,g.exp,g.inventory,g.weapons]),receipt=g.pendingReward;const h=rewardHarness(g);h.open();
  h.oldCloseEvent();assert.equal(g.pendingReward,receipt,'old battle close must not acknowledge the new reward');
  h.node('next').onclick();assert.equal(h.closes,0,'first click skips display only');assert.equal(g.pendingReward,receipt);
  h.node('next').onclick();assert.equal(h.closes,1);assert.equal(g.pendingReward,null);assert.equal(h.c.pending,0);
  assert.equal(JSON.stringify([g.coin,g.exp,g.inventory,g.weapons]),before);
});
test('B3 close during counting cancels pending frames and cannot clear a replacement receipt',()=>{
  const g={pendingReward:{coin:60,exp:20,items:[],abilities:[]}},h=rewardHarness(g);h.open();
  const next={coin:10,exp:0,items:[],abilities:[]};g.pendingReward=next;h.c.step(300);h.dlg.close();
  assert.equal(g.pendingReward,next);assert.equal(h.c.pending,0);assert.equal(h.changes,1);
});
test('B3 guide and final receipts retain titles, descriptions and exactly one acknowledgement',()=>{
  const guide={pendingReward:{guideZone:'asia',title:'Guide gift',description:'Owner description',coin:0,exp:0,items:[],abilities:['ice']}};
  const h=rewardHarness(guide,{reduced:true});h.open();assert.ok(h.html.includes('Guide gift'));assert.ok(h.html.includes('Owner description'));assert.equal(h.node('exp'),undefined);assert.equal(h.node('next').textContent,'reward.continue');h.node('next').onclick();h.oldCloseEvent();assert.equal(h.ctx.guideAcks,1);
  let acks=0;const final={pendingReward:{encounter:'ruler:asia',coin:30,exp:0,items:[],abilities:[]},acknowledgeFinalReward(){acks++;this.pendingReward=null;return true;}};
  const f=rewardHarness(final,{reduced:true});f.open();f.node('next').onclick();f.oldCloseEvent();assert.equal(acks,1);
});
test('B3 empty and long loot receipts preserve static quantities and do not invent EXP rows',()=>{
  const empty=rewardHarness({pendingReward:{coin:0,exp:0,items:[],abilities:[]}});empty.open();assert.ok(empty.html.includes('reward.noDrop'));assert.equal(empty.node('exp'),undefined);assert.equal(empty.c.pending,0);
  const long=rewardHarness({pendingReward:{coin:100,exp:0,items:Array.from({length:12},()=>({k:'tea',n:1})),abilities:[]}});long.open();assert.ok(long.html.includes('×12'));long.c.step(750);assert.ok(long.html.includes('×12'));assert.equal(long.node('exp'),undefined);
});
test('B3 new UI keys resolve in both languages, including status labels and special names',async()=>{
  globalThis.document??={documentElement:{}};const {t,setLang,englishKeys}=await import('../src/i18n.js');
  const keys=['reward.summary','reward.loot','reward.noGain','reward.showTotals','reward.continue','reward.background','reward.totalsAnnounce',...['stun','confuse','burn','defend','rage'].map(k=>'battle.status.'+k),...['enemy','fire','flameCharge','windFan','rage','valkyrieSpear','ice','hypno','cooldownClock'].map(k=>'battle.move.'+k)];
  const en=new Set(englishKeys());for(const key of keys)assert.ok(en.has(key),key);
  for(const lang of ['th','en']){setLang(lang);for(const key of keys){const label=t(key,{coin:10,exp:4,n:2,name:'Boss'});assert.notEqual(label,key);assert.doesNotMatch(label,/\{\w+\}/);}}setLang('th');
});
