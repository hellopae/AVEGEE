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
 assert.match(ui,/if \(action === 'flee'\) \{ sfx\('step'\)[^}]*finish\(\); return; \}/,'flee leaves the fight directly');
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
 assert.match(ui,/fleeWhy = \['soul','mob','frontier'\]/);
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
