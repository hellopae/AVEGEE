import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,DEFEND_DAMAGE_RATIO} from '../src/game.js';
import {planTurnStep} from '../src/battle-turn-step.js';
import {TH_DICT,EN_DICT} from './helpers/i18n-dicts.mjs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const mk=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;
 g.startBattle({id:99,who:'test',deserved:4,resist:true});
 g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[10,10];});g.beginBattleTurns();return g;};   // the battle UI opens the turn queue on first paint
const rect=(l,t,w,h)=>({l,t,r:l+w,b:t+h});
const hits=(a,b,gap=0)=>a.l<b.r+gap&&a.r>b.l-gap&&a.t<b.b+gap&&a.b>b.t-gap;

test('L2 turn step: the stepping sprite ends clear of every teammate and enemy (bounds, not a fixed offset)',()=>{
 // four-member diagonal like the real formation: each sprite 90x150, next one is right/down
 const team=[0,1,2,3].map(i=>rect(300+i*96,420+i*22,90,150));
 const foes=[rect(900,420,100,150)];
 team.forEach((me,i)=>{
  const others=team.filter((_,j)=>j!==i);
  const step=planTurnStep({active:me,others,foes,base:{x:109,y:-23},bounds:{l:0,t:280,r:890,b:937}});
  assert.equal(step.clear,true,'slot '+i);
  const moved={l:me.l+step.x,r:me.r+step.x,t:me.t+step.y,b:me.b+step.y};
  for(const o of [...others,...foes])assert.equal(hits(moved,o),false,`slot ${i} vs ${JSON.stringify(o)}`);
  assert.ok(step.x>=109&&step.y<=-23,'never steps less than the old fixed step');
 });
});
test('L2 turn step: no room at all returns the least-bad spot and says it is not clear',()=>{
 const me=rect(100,500,90,150),wall=rect(0,0,300,900);
 const step=planTurnStep({active:me,others:[wall],foes:[],base:{x:10,y:-5},bounds:{l:0,t:0,r:300,b:900}});
 assert.equal(step.clear,false);
});

test('L2 defend: the defender takes DEFEND_DAMAGE_RATIO of the hit, others take it in full, and the log says so',()=>{
 assert.equal(DEFEND_DAMAGE_RATIO,.5);
 const run=defend=>{
  const g=mk();const rnd=Math.random;Math.random=()=>0.5;
  try{
   if(defend){assert.equal(g.confirmBattleCommand('defend','you'),true);assert.equal(g.battle.defending.you,true);g.finishBattleCommand();}
   else{g.battle.command='atk';assert.equal(g.confirmBattleCommand('atk','you'),true);g.finishBattleCommand();}
   const hp=g.battle.youHp;let guard=0;
   while(g.battle.youHp===hp&&guard++<6){const turn=g.currentBattleTurn();
    if(turn.side==='foe'){assert.equal(g.runEnemyTurn(),true);g.finishBattleCommand();}
    else{g.confirmBattleCommand('defend','you');g.finishBattleCommand();}}
   return {taken:hp-g.battle.youHp,hits:g.battle.dmg.enemyHits,log:g.battle.log.join('\n')};
  }finally{Math.random=rnd;}
 };
 const guarded=run(true),open=run(false);
 assert.equal(open.taken,10);
 assert.equal(guarded.taken,Math.round(10*DEFEND_DAMAGE_RATIO));
 assert.ok(guarded.taken<open.taken);
 assert.equal(guarded.hits[0].reduced,true);assert.equal(guarded.hits[0].before,10);
 assert.match(guarded.log,/ตั้งรับไว้.*ลดจาก 10 เหลือ 5/);
});
test('L2 defend: the stance ends when that actor’s next turn begins, not before',()=>{
 const g=mk();
 assert.equal(g.confirmBattleCommand('defend','you'),true);
 g.beginBattleTurns();assert.equal(g.battle.defending.you,true,'still guarding while the turn is being played');
 g.finishBattleCommand();
 let guard=0;while(g.currentBattleTurn().side==='foe'&&guard++<4){g.runEnemyTurn();assert.equal(g.battle.defending.you,true,'guard holds through the enemy turn');g.finishBattleCommand();}
 g.beginBattleTurns();
 assert.equal(g.currentBattleTurn().id,'you');assert.equal(!!g.battle.defending?.you,false);
});
test('L2 defend and flee are not attacks: no damage dealt, no enemy HP lost',()=>{
 const g=mk(),hp=g.battle.foes[0].hp;
 assert.equal(g.confirmBattleCommand('defend','you'),true);
 assert.equal(g.battle.foes[0].hp,hp);assert.equal(g.battle.dmg.foe,0);
});
test('L2 flee: plain fights can be fled (no reward, battle over); boss/event fights refuse',()=>{
 const g=mk(),coin=g.coin;
 assert.equal(g.confirmBattleCommand('flee','you'),true);
 assert.equal(g.battle.over,'flee');g.finishBattleCommand();
 const done=g.endBattle();assert.equal(done.over,'flee');assert.equal(g.coin,coin);assert.equal(g.pendingReward,null);assert.equal(g.battle,null);
 const boss=createGame();boss.save=()=>true;boss.onChange=()=>{};boss.bossReady=()=>true;boss.startZoneBoss();
 assert.equal(boss.confirmBattleCommand('flee','you'),false);assert.notEqual(boss.battle.over,'flee');
});

test('L2 wiring: defend/flee never fall into the attack animation; flee asks first; target hint box is gone',()=>{
 const ui=read('src/ui.js');
 assert.match(ui,/const performFlee = \(\) => \{\s*if \(phase \|\| !g\.fleeBattle\(\)\) \{ paint\(\); return; \}\s*sfx\('step'\); clearTimeout\(phaseTimer\); finish\(\);/,'one function applies a confirmed flee');
 assert.match(ui,/if \(action === 'flee'\) \{ performFlee\(\); return; \}/);
 assert.match(ui,/export function openFleeConfirm\(/);assert.match(ui,/export function fleeConfirmHtml\(/);assert.match(ui,/export function bindFleeConfirm\(/);
 assert.match(ui,/if \(action === 'defend'\) \{\s*sfx\('item'\); phase = 'you'; phaseAt = Date\.now\(\); fxNow = \{ key:'defend'/);
 assert.match(ui,/if\(action==='flee'\)\{fleeConfirm=true;paint\(\);\}/,'the tab only opens the confirmation');
 assert.match(ui,/fxNow\?\.key === 'defend' \? null/,'defend plays no lunge');
 assert.match(ui,/fx\.key === 'defend'\) return ''/,'defend draws no slash effect');
 assert.doesNotMatch(ui,/คลิกศัตรูบนสนามเพื่อโจมตีทันที/);
 const shield=ui.match(/function defendShieldHtml\(\) \{[\s\S]*?return (`[^`]*`)/)[1];
 assert.doesNotMatch(shield,/<img/,'an <img> inside the squad/fig would be mistaken for a sprite by fitBattleSprites (broke the whole formation)');
 assert.match(ui,/else if\(b\.command===action\)\{g\.cancelBattleCommand\(\);paint\(\);\}/,'same tab again cancels');
 assert.match(ui,/addEventListener\('contextmenu', cancelGesture\)/);
 assert.match(ui,/e\.key !== 'Escape'/);
 assert.match(ui,/fleeCode = g\.fleeWhy\(b\.kind\)/);
 assert.match(read('src/battle-scale.js'),/planTurnStep\(\{ active:sz\.bounds/,'formation asks the planner for each actor’s step');
 assert.match(read('src/battle-scale.js'),/'--turn-step-x':`\$\{steps\[i\]\.x\}px`/);
});
test('L2 wiring: Where/Keeper/Intensity picks render as thumbnail + name beside their command',()=>{
 const ui=read('src/ui.js'),css=read('src/trial-comment8.css');
 assert.match(ui,/class="court-picked" data-picked="\$\{v\.id\}"/);
 for(const k of ['where','keeper','force'])assert.match(ui,new RegExp(`${k}: .*<img src=`));
 assert.match(css,/\.court-picked\{/);
 assert.match(css,/\.port\.you \.who2 :is\(b,small\)\{color:#fff;text-shadow/,'name/authority/MP under the portrait are white with a dark edge');
});
test('L2 pause buttons: no gold border and no gold focus ring, hover/focus is a lighter fill',()=>{
 const css=read('src/menu-ui.css');
 assert.match(css,/\.pause-actions button\{border:0;/);
 assert.match(css,/\.pause-actions button:hover,\.pause-actions button:focus-visible[^{]*\{outline:none;background:#4b2f3e\}/);
});
test('L2 wording: Thai UI says พลังเวท where it said MP, English keeps MP',()=>{
 assert.equal(TH_DICT['battle.mp'],'พลังเวท');assert.equal(EN_DICT['battle.mp'],'MP');
 for(const [k,v] of Object.entries(TH_DICT))assert.doesNotMatch(v,/\bMP\b/,`th ${k}`);
 assert.ok(Object.values(EN_DICT).some(v=>/\bMP\b/.test(v)));
 for(const f of ['src/data.js','src/story.js','src/sentencing-guide.js']){
  const bad=read(f).split('\n').filter(l=>/\bMP\b/.test(l)&&!/^\s*(\/\/|\*|\/\*)/.test(l)&&!/descEn|sayEn|\/\/.*\bMP\b/.test(l));
  assert.deepEqual(bad.map(l=>l.trim().slice(0,90)),[],f);
 }
 const ui=read('src/ui.js');
 assert.equal(ui.split('\n').filter(l=>/(['"`>])MP\b(?!_)/.test(l)&&!/^\s*(\/\/|\*)/.test(l)&&!/MP full/.test(l)).length,0,'ui.js hard-codes no Thai-visible MP label');
});

test('L2 flee API: fleeWhy / fleeBattle are the single entry points (kinds list lives in game.js)',async()=>{
 const {FLEEABLE_KINDS}=await import('../src/game.js');
 assert.deepEqual(FLEEABLE_KINDS,['soul','mob','frontier']);
 const g=mk();
 assert.equal(g.fleeWhy('soul'),'');assert.equal(g.fleeWhy('mob'),'');assert.equal(g.fleeWhy('frontier'),'');
 assert.equal(g.fleeWhy('zoneBoss'),'noBoss');assert.equal(g.fleeWhy('dad'),'noBoss');assert.equal(g.fleeWhy('zoneEvent'),'noEvent');
 assert.equal(g.fleeBattle(),true);assert.equal(g.battle.over,'flee');assert.equal(g.battle.commandBusy,false);
 assert.equal(g.fleeBattle(),false,'already over');
 const boss=createGame();boss.save=()=>true;boss.onChange=()=>{};boss.bossReady=()=>true;boss.startZoneBoss();
 assert.equal(boss.fleeBattle(),false);assert.ok(!boss.battle.over);
});

// ---------- L2 round 2: receiver picking without a text box + heal effect ----------
import {vitalsOf,vitalGains,healFxHtml,HEAL_FX_MS} from '../src/heal-fx.js';
const party=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=10000;
 g.hire('boon');g.hire('plerng');g.party.members=['boon','plerng'];g.hireGuard();
 g.startBattle({id:99,who:'t',deserved:4,resist:true});g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[0,0];});g.beginBattleTurns();return g;};

test('L2 heal fx: item on a teammate, holy water on Yama and a boon heal each produce one gain entry; nothing else does',()=>{
 const g=party(),c=g.crewOf('plerng');c.morale=40;g.battle.youHp=50;g.mp=5;g.inventory.health=2;g.inventory.holyWater=2;
 const b1=vitalsOf(g);assert.equal(g.confirmBattleCommand('health',c.id),true);
 const gain1=vitalGains(b1,vitalsOf(g));
 assert.equal(gain1.length,1);assert.equal(gain1[0].id,c.id);assert.ok(gain1[0].hp>0);assert.equal(gain1[0].mp,0);
 g.finishBattleCommand();
 let guard=0;while(g.currentBattleTurn().side==='foe'&&guard++<4){g.runEnemyTurn();g.finishBattleCommand();}
 g.selectBattleActor('you');
 const b2=vitalsOf(g);assert.equal(g.confirmBattleCommand('holyWater','you'),true);
 const gain2=vitalGains(b2,vitalsOf(g));
 assert.deepEqual(gain2.map(x=>[x.id,x.hp>0,x.mp>0]),[['you',false,true]],'holy water is MP only -> blue');
 assert.deepEqual(vitalGains(vitalsOf(g),vitalsOf(g)),[],'no change, no effect');
});
test('L2 heal fx: several heals at once all get an entry; losses never do',()=>{
 const before={you:{hp:40,mp:5},a:{hp:30,mp:0},b:{hp:60,mp:0},c:{hp:50,mp:0}};
 const after ={you:{hp:58,mp:14},a:{hp:52,mp:0},b:{hp:60,mp:0},c:{hp:44,mp:0}};
 assert.deepEqual(vitalGains(before,after),[{id:'you',hp:18,mp:9},{id:'a',hp:22,mp:0}]);
});
test('L2 heal fx markup: ring + glow + sparkles + number(s), MP uses its own theme, never an <img>',()=>{
 const hp=healFxHtml({hp:30,mp:0},0,'พลังเวท'),mp=healFxHtml({hp:0,mp:12},0,'พลังเวท'),both=healFxHtml({hp:30,mp:12},250,'พลังเวท');
 for(const h of [hp,mp,both]){assert.doesNotMatch(h,/<img/);assert.match(h,/hf-ring/);assert.match(h,/hf-glow/);assert.ok((h.match(/hf-sp /g)||[]).length>=5);}
 assert.match(hp,/class="heal-fx hp"/);assert.match(hp,/hf-num hp">\+30</);assert.doesNotMatch(hp,/hf-num mp/);
 assert.match(mp,/class="heal-fx mp"/);assert.match(mp,/\+12 พลังเวท/);
 assert.match(both,/heal-fx hp both/);assert.match(both,/hf-num mp second/);assert.match(both,/--fx-el:-250ms/,'a repaint resumes the effect instead of restarting it');
 assert.ok(HEAL_FX_MS>=800&&HEAL_FX_MS<=1200);
 assert.equal(Number(read('src/ui.js').match(/const HEAL_GLOW_MS = (\d+)/)[1]),HEAL_FX_MS,'ui.js and heal-fx.js agree on the duration');
});
test('L2 heal fx wiring/CSS: every command snapshots vitals, all healed actors are drawn, CSS animates transform/opacity only',()=>{
 const ui=read('src/ui.js'),css=read('src/battle-turns.css');
 assert.match(ui,/const vitalsBefore = vitalsOf\(g\);/);assert.match(ui,/for \(const gn of gains\) healFx\.push/);
 assert.match(ui,/showHeals\(vitalsBeforeFoe,400\)/,'enemy-turn recoveries (e.g. spare heart) show too');
 const block=css.slice(css.indexOf('/* L2 — heal effect'));
 assert.doesNotMatch(block,/filter:/,'no filter animations');assert.doesNotMatch(block,/ctx\.filter/);
 assert.match(block,/@keyframes hfNum/);assert.match(block,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(read('src/heal-fx.js'),/ctx\.|drawStandee/);
});
test('L2 receiver picking: no hint box at all, eligible teammates get the same tag as enemies, others dim, cancel like the attack side',()=>{
 const ui=read('src/ui.js'),css=read('src/battle-turns.css');
 assert.match(ui,/const selection = '';/);
 assert.doesNotMatch(ui,/คลิกผู้รับบนสนามหรือการ์ดทีมเพื่อใช้/);assert.doesNotMatch(ui,/เลือกผู้รับ/);
 assert.match(ui,/el\.classList\.toggle\('choose-recipient', !!recipient && !why\)/);
 assert.match(ui,/el\.classList\.toggle\('recipient-off', !!recipient && !!why\)/);
 assert.match(ui,/Choose target' : 'เลือกเป้าหมาย'/);
 assert.match(css,/\.recipient-off\{opacity:\.45/);
 assert.match(ui,/e\.key !== 'Escape'/);assert.match(ui,/addEventListener\('contextmenu', cancelGesture\)/);
});
