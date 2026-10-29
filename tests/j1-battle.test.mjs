import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { YAMA_SKILL_SECONDS, yamaSkillRemaining, immediateSelfSkill } from '../src/yama-cooldown.js';
import { courtWheelReference, placeWheel } from '../src/wheel-place.js';
import { teamNeedsMirror, rageArtSrc, ragePoseSrc } from '../src/battle-facing.js';
const read = f => readFileSync(new URL('../'+f,import.meta.url),'utf8');
function setup() {
 const g=createGame();g.save=()=>true;g.startBattle({id:999,who:'test',deserved:20});
 g.battle.foes.forEach(f=>{f.hp=f.maxHp=100000;f.atk=[0,0];});g.battle.youHp=g.battle.youMax=10000;
 g.mp=g.mpMax=1000;Object.assign(g.abilities,{flameCharge:true,windFan:true,rage:true,valkyrieSpear:true,ice:true,hypno:true,cooldownClock:true});return g;
}
for(const [skill,seconds] of Object.entries(YAMA_SKILL_SECONDS)) test(`J1 ${skill}: rejects reuse without cost; ready exactly after ${seconds} active seconds`,()=>{
 const g=setup();assert.equal(g.battleAct(skill),true);assert.equal(yamaSkillRemaining(g.battle,skill),seconds);
 const mp=g.mp,turn=g.battle.turn,hp=g.battle.foes[0].hp;
 assert.equal(g.battleAct(skill),false);assert.equal(g.mp,mp);assert.equal(g.battle.turn,turn);assert.equal(g.battle.foes[0].hp,hp);
 g.advanceBattleTime(seconds*1000-1,true);assert.equal(yamaSkillRemaining(g.battle,skill),1);assert.equal(g.battleAct(skill),false);
 if(skill==='rage') for(let i=0;i<3;i++)assert.equal(g.battleAct('atk'),true);
 g.advanceBattleTime(1,true);assert.equal(yamaSkillRemaining(g.battle,skill),0);assert.equal(g.battleAct(skill),true);
});
test('J1 cooldown clock shares pause/hidden rules with team, resets powers; sword has no cooldown',()=>{
 const g=setup();g.battleAct('fire');g.advanceBattleTime(999999,false);assert.equal(yamaSkillRemaining(g.battle,'fire'),12);
 const old=globalThis.document;globalThis.document={hidden:true};try{g.advanceBattleTime(999999,true);}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
 assert.equal(yamaSkillRemaining(g.battle,'fire'),12);g.advanceBattleTime(-999,true);assert.equal(yamaSkillRemaining(g.battle,'fire'),12);
 for(let i=0;i<5;i++)assert.equal(g.battleAct('atk'),true);
 assert.equal(yamaSkillRemaining(g.battle,'fire'),12);assert.equal(g.battleAct('cooldownClock'),true);assert.equal(g.battleAct('fire'),true);
});
test('J1 Rage targets only Yama, does no enemy damage, consumes three boosted strikes',()=>{
 const g=setup();const hp=g.battle.foes[0].hp;
 assert.equal(immediateSelfSkill('rage'),true);assert.equal(immediateSelfSkill('fire'),false);
 assert.equal(g.battleAct('rage',{actorId:'you',recipientId:'enemy'}),false);
 assert.equal(g.confirmBattleCommand('rage','you'),true);assert.equal(g.battle.dmg.buffActorId,'you');assert.equal(g.battle.dmg.foe,0);assert.equal(g.battle.foes[0].hp,hp);assert.equal(g.battle.helper,null);
 g.finishBattleCommand();for(let i=2;i>=0;i--){g.battleAct('atk');assert.equal(g.battle.rageTurns,i);}
 const ui=read('src/ui.js');assert.match(ui,/immediateSelfSkill\(el.dataset.act\).*executeCommand\(el.dataset.act, 'you'\)/);
 assert.doesNotMatch(ui,/if \(k === 'rage'\) return;/);assert.match(ui,/fxNow\?\.key === 'rage' \? null/);
 assert.doesNotMatch(read('index.html'),/rageAura|you\.raging::before/);
});
test('J1 rage assets expect J2 filenames and retain real charge pose fallback',()=>{
 const expected=['img/hero-yama-rage.png','img/Asia/hero-yama-asia-rage.png','img/West/hero-yama-west-rage.png','img/CyberHell/hero-yama-cyberhell-rage.png'];
 ['th','asia','west','cyberhell'].forEach((z,i)=>{assert.equal(rageArtSrc(z),expected[i]);assert.ok(existsSync(new URL('../'+ragePoseSrc(z),import.meta.url)));});
 assert.match(read('src/ui.js'),/onerror="this.onerror=null;this.src='\$\{showRage \? \(ragePoseSrc/);
});
test('J1 direction audit: every standing team sprite renders right using independent image audit',()=>{
 // Right-facing raw pixels observed in the 24-image sheet; all remaining files face left.
 const right={th:['guard'],asia:[],west:['taan','plerng','kan','boon','dam','guard'],cyberhell:[]};
 const dirs={th:['',''],asia:['Asia/','-asia'],west:['West/','-west'],cyberhell:['CyberHell/','-cyberhell']};
 for(const [z,[dir,suffix]] of Object.entries(dirs))for(const k of ['taan','plerng','kan','boon','dam','guard']){
  let src=`img/${dir}crew-${k}${suffix}.png`;if(!existsSync(new URL('../'+src,import.meta.url)))src=src.replace('.png','-v2.png');
  assert.ok(existsSync(new URL('../'+src,import.meta.url)),src);
  const drawnRight=right[z].includes(k);assert.equal(drawnRight !== teamNeedsMirror(src),true,src);
 }
});
for(const viewport of [{w:1600,h:900},{w:1280,h:720}])test(`J1 court distance reused at ${viewport.w}x${viewport.h}; ally wheel above without overlaps`,()=>{
 const reference=courtWheelReference(viewport), area=viewport, wheel={w:160,h:160*11/9};
 // Bodies along a typical team row; same relative height at both required sizes.
 const team=[.13,.24,.35].map(x=>({l:area.w*x,t:area.h*.60,r:area.w*x+100,b:area.h*.80}));
 for(const me of team){const p=placeWheel({area,wheel,me,team,reference,above:true});
  const distance=Math.hypot(p.left+.41*wheel.w-(me.l+me.r)/2,p.top+.505*wheel.h-(me.t+me.b)/2);
  assert.ok(Math.abs(distance-reference.distance)<1e-6);assert.ok(p.art.b<=me.t+2);assert.ok(p.art.l>=0&&p.art.r<=area.w&&p.art.t>=0&&p.art.b<=area.h);
  for(const body of team) assert.ok(!(p.art.l<body.r-2&&p.art.r>body.l+2&&p.art.t<body.b-2&&p.art.b>body.t+2));
 }
});
test('J1 power menu removes inherited oval shadows, compacts rows, shows and updates cooldown numbers',()=>{
 const css=read('src/command-wheel.css'),ui=read('src/ui.js');assert.match(css,/row-gap:8px!important;column-gap:8px!important/);assert.match(css,/orb-choice\{box-shadow:none!important;border-radius:0/);
 assert.match(ui,/remaining \? `<em class="skill-cooldown"/);assert.match(ui,/button.disabled = .*\|\| !!remaining/);assert.match(ui,/else badge.remove\(\)/);
});

test('J1 reference numbers are derived from the final court CSS, not an arbitrary battle gap',()=>{
 const css=read('src/command-wheel.css');
 assert.match(css,/\.trial-hud \.hud-stage \.fig.you\{left:14%;bottom:23%;width:16%\}/);
 assert.match(css,/\.trial-hud \.court-wheel\{left:31%;bottom:24%;width:clamp\(205px,21vw,270px\)\}/);
 assert.equal(courtWheelReference({w:1600,h:900}).distance.toFixed(2),'200.67');
 assert.equal(courtWheelReference({w:1280,h:720}).distance.toFixed(2),'192.52');
});
