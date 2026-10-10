import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { BATTLE, STATIONS } from '../src/data.js';
import { KRATA_WALK, stokeHit, trainingHit, trainingRadius, normalizeFireControl } from '../src/krata-control.js';
import { wideStationRoom } from '../src/room-art-assets.js';
import { walkSegmentInside, makeRoom } from '../src/room.js';
import { setLang, t, englishKeys } from '../src/i18n.js';
import { runBalance } from '../output/Codex/g5/balance.mjs';

globalThis.Image ??= class {};
globalThis.devicePixelRatio=1;
globalThis.document ??= {documentElement:{}};
const inside=(x,y)=>KRATA_WALK.some(({poly})=>{
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j];
    if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
  }
  return hit;
});
function pots() {
  const g=createGame();
  g.save=()=>true;
  const st={def:STATIONS.find(s=>s.k==='krata'),slots:[{need:100,progress:20},{need:150,progress:50},{need:50,progress:10,pendingUntil:100000}],fire:0};
  g.stations.push(st); return {g,st};
}
function trainee() {
  const g=createGame();g.save=()=>true;g.coin=1000;assert.ok(g.hire('plerng'));
  return {g,c:g.crew.find(c=>c.k==='plerng')};
}

test('G5 walk: bright courtyard and carpet; blocks pot plinth, rail, stairs, jars and right stove (12 points)',()=>{
  for (const [name,x,y,allowed] of [
    ['center',.5,.64,true],['left floor',.25,.54,true],['right floor',.68,.62,true],['pot approach',.5,.54,true],['carpet',.5,.95,true],['crew',.28,.74,true],
    ['pot plinth',.5,.36,false],['rail',.63,.40,false],['stairs',.23,.38,false],['jars',.12,.60,false],['right stove',.8,.60,false],['outside carpet',.65,.95,false],
  ]) assert.equal(inside(x,y),allowed,name);
  const room=wideStationRoom('th','krata');assert.equal(room.walk,KRATA_WALK);
  assert.ok(walkSegmentInside(...room.me,...room.act,inside));
  assert.equal(walkSegmentInside(.5,.6,.8,.6,inside),false);
});

test('G5 real room movement and flare draw at 844×390 and 390×844', async()=>{
  const old={Image:globalThis.Image,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame,addEventListener:globalThis.addEventListener,removeEventListener:globalThis.removeEventListener};
  globalThis.Image=class {set src(value){this._src=value;if(value.includes('rooms-wide')){this.naturalWidth=1716;this.naturalHeight=916;queueMicrotask(()=>this.onload?.());}} get src(){return this._src;}};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
  try {for(const [width,height] of [[844,390],[390,844]]) {
    const context=new Proxy({measureText:()=>({width:20}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
    const cv={width:0,height:0,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width,height}),addEventListener(){},removeEventListener(){}};
    const config=wideStationRoom('th','krata'), {g,st}=pots();st.slots=[];
    const room=makeRoom(cv,g,st.def,config,config.image,null);room.st=st;
    try {
      room.start();await new Promise(r=>setImmediate(r));room.tick(0);
      room.lock(true);room.walkTo(...config.act);
      for(let n=0;n<1200 && Math.hypot(room.pos()[0]-.5,room.pos()[1]-.54)>.012;n++){room.tick(16);assert.ok(inside(...room.pos().slice(0,2)));}
      assert.ok(Math.hypot(room.pos()[0]-.5,room.pos()[1]-.54)<.012);
      room.stokeEffect(true);room.tick(16);room.stokeEffect(false);room.tick(16);
    }finally{room.destroy();}
  }}finally{Object.assign(globalThis,old);}
});

test('G5 stoke: 20% remaining on every active pot, miss unchanged, 20s cooldown, no MP, empty/pending blocked',()=>{
  const {g,st}=pots(), mp=g.mp;
  assert.equal(g.stokeWhy({...st,slots:[]},0),'g5.noSouls');
  const session=g.beginStoke(st,0);assert.ok(session);assert.equal(g.beginStoke(st,1),null);
  assert.ok(g.finishStoke(session,true,1000));
  assert.equal(st.slots[0].progress,36);assert.equal(st.slots[1].progress,70);assert.equal(st.slots[2].progress,10);
  assert.equal(g.mp,mp);assert.equal(g.stokeWhy(st,20999),'g5.cooldown');assert.equal(g.stokeWhy(st,21000),'');
  const miss=g.beginStoke(st,21000),before=structuredClone(st.slots);g.finishStoke(miss,false,22000);assert.deepEqual(st.slots,before);
  assert.equal(g.finishStoke(miss,true,22000),false);
  assert.equal(g.stokeWhy(st,41999),'g5.cooldown');assert.equal(g.stokeWhy(st,42000),'');
  st.slots=[{need:100,progress:0,pendingUntil:100000}];assert.equal(g.stokeWhy(st,42000),'g5.noSouls');
  st.slots=[];assert.equal(g.beginStoke(st,100000),null);
  assert.ok(stokeHit(.42));assert.ok(stokeHit(.58));assert.equal(stokeHit(.419),false);
});

test('G5 training: both trainees, 5 hits +1, 3 misses no loss, individual 5-minute cooldown and cap 3',()=>{
  const {g,c}=trainee();
  for(const actor of ['yama',c]) {
    const before={mp:g.mp,coin:g.coin};
    const fail=g.beginFireTraining(actor,1000);for(let i=0;i<3;i++)g.attemptFireTraining(fail,false,1000);
    assert.equal(fail.done,true);assert.equal(fail.won,false);assert.equal(g.fireControlState(actor).level,0);
    assert.deepEqual({mp:g.mp,coin:g.coin},before);
    for(let lv=1;lv<=3;lv++) {
      const now=1000+(lv-1)*300000,session=g.beginFireTraining(actor,now);assert.ok(session);
      for(let n=0;n<5;n++){g.attemptFireTraining(session,true,now);assert.equal(session.hits,n+1);}
      assert.equal(session.won,true);assert.equal(g.fireControlState(actor).level,lv);
      assert.equal(g.attemptFireTraining(session,true,now),null);
      if(lv<3){assert.equal(g.beginFireTraining(actor,now+299999),null);assert.equal(g.fireTrainingWhy(actor,now+300000),'');}
    }
    assert.equal(g.fireTrainingWhy(actor,9999999),'g5.max');
  }
  assert.equal(g.fireTrainingWhy('someone'), 'g5.unavailable');
  const session=g.beginFireTraining('yama',10000000);assert.equal(session,null);
  assert.ok(trainingHit(1));assert.equal(trainingHit(1.13),false);assert.ok(trainingRadius(0)>2);
});

test('G5 fire damage in actual battles follows 0/3/6/9% for Yama and Plerng, normal attacks unchanged',()=>{
  for(const level of [0,1,2,3]) {
    const {g,c}=trainee();g.party.members=['plerng'];g.fireControl.actors.yama={level,readyAt:0};g.fireControl.actors[g.fireActorId(c)]={level,readyAt:0};
    const normal=g.normalAttack(20);
    g.mobs.push({id:999,kind:0});g.startMobBattle(0);g.battle.foes[0].hp=g.battle.foes[0].maxHp=10000;
    assert.ok(g.battleAct('fire'));assert.equal(g.battle.dmg.foe,Math.round(BATTLE.fireDmg*(1+.03*level)));
    c.helpReadyAt=0;c.helpRemainingMs=0;c.morale=100;
    const damage=g.allyStats(c).dmg;
    assert.ok(g.battleAct('crew:plerng'));assert.equal(g.battle.dmg.foe,Math.round(damage*(1+.03*level)));
    assert.equal(g.normalAttack(20),normal);
  }
});

test('G5 save/load preserves levels and real-time cooldowns, old saves default to zero',()=>{
  const {g,c}=trainee();g.fireControl.actors.yama={level:3,readyAt:123456};g.fireControl.actors[g.fireActorId(c)]={level:2,readyAt:234567};g.fireControl.stokeReadyAt=99999;
  const data=JSON.parse(JSON.stringify(g.snapshot(false))),loaded=createGame();loaded.restore(data);
  assert.deepEqual(loaded.fireControl,g.fireControl);assert.equal(loaded.fireControlState(loaded.crew.find(x=>x.k==='plerng')).level,2);
  delete data.fireControl;loaded.restore(data);assert.equal(loaded.fireControlState().level,0);assert.equal(loaded.fireControlState(loaded.crew.find(x=>x.k==='plerng')).level,0);
  assert.equal(normalizeFireControl({actors:{yama:{level:90,readyAt:NaN}}}).actors.yama.level,3);
});

test('G5 new texts have TH+EN; all artwork registered and prompts retained',()=>{
  const keys=englishKeys().filter(k=>k.startsWith('g5.'));assert.ok(keys.length>=20);
  for(const lang of ['th','en']){setLang(lang);for(const key of keys)assert.notEqual(t(key),key);}setLang('th');
  const manifest=readFileSync(new URL('../img/manifest.json',import.meta.url),'utf8');
  const catalog=readFileSync(new URL('../img/preload-catalog.json',import.meta.url),'utf8');
  for(const name of ['yama-cutscene.jpeg','plerng-cutscene.jpeg','fireball.png']){
    assert.ok(existsSync(new URL('../img/krata-minigame/'+name,import.meta.url)));assert.ok(manifest.includes('krata-minigame/'+name));assert.ok(catalog.includes('img/krata-minigame/'+name));
  }
  assert.ok(existsSync(new URL('../output/Codex/g5/prompts.md',import.meta.url)));
});

test('G5 balance: level 3 on both trainees increases each story encounter by at most 10 percentage points',()=>{
  const rows=runBalance(200);
  if(process.env.G5_BAL_VERBOSE) console.log(JSON.stringify(rows,null,2));
  assert.equal(rows.length,11);for(const row of rows) assert.ok(row.delta<=10);
});

test('G5 QTE host: waits for walking, uses timing windows, stops after outcome, auto-misses and cleans animation', async()=>{
  const {runKrataQte}=await import('../src/minigames/krata-qte.js');
  class Element {
    constructor(){this.nodes=new Map();this.children=[];this.style={};this.disabled=false;}
    set innerHTML(html){this.html=html;this.nodes.clear();for(const selector of ['.mg-x','.g5-content','.g5-choices','.g5-count','.g5-orb img','.g5-white','.g5-needle','[data-fire]','p'])this.nodes.set(selector,new Element());this.nodes.get('[data-fire]').disabled=html.includes('type="button" disabled');}
    querySelector(selector){return this.nodes.get(selector)||null;}
    append(el){this.children.push(el);}
    setAttribute(key,value){if(key==='disabled')this.disabled=true;else this[key]=value;}
  }
  const old={document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
  let now=performance.now(),frame=null;
  globalThis.document={documentElement:{},createElement:()=>new Element()};
  globalThis.requestAnimationFrame=fn=>{frame=fn;return 1;};globalThis.cancelAnimationFrame=()=>{frame=null;};
  const advance=ms=>{for(let elapsed=0;elapsed<ms;elapsed+=50){now+=50;const next=frame;frame=null;next?.(now);}};
  try {
    const {g,st}=pots(), host=new Element();let pos=[.5,.88],fx=null,closed=0;
    const room={krataApproach:[.5,.54],walkTo(){},pos:()=>pos,stokeEffect:hit=>{fx=hit;}};
    let stop=runKrataQte(host,{g,st,room,alive:()=>true,onClose:()=>closed++});
    let body=host.querySelector('.g5-content'),button=body.querySelector('[data-fire]');
    button.onclick();assert.equal(st.slots[0].progress,20);assert.equal(button.disabled,true);
    pos=[.5,.54];advance(50);assert.equal(button.disabled,false);button.onclick();assert.equal(fx,true);assert.equal(st.slots[0].progress,36);assert.equal(button.disabled,true);
    button.onclick();assert.equal(st.slots[0].progress,36);stop();assert.equal(frame,null);
    const {g:train,c}=trainee();now=performance.now();
    stop=runKrataQte(host,{g:train,st,room,training:true,alive:()=>true,onClose:()=>closed++});
    body=host.querySelector('.g5-content');assert.equal(body.querySelector('.g5-choices').children.length,2);
    body.querySelector('.g5-choices').children[1].onclick();
    // Five independent contracting circles; match within the green tolerance each time.
    for(let n=0;n<5;n++){advance(1600);body.querySelector('[data-fire]').onclick();}
    assert.equal(train.fireControlState(c).level,1);assert.equal(train.fireControlState().level,0);stop();assert.equal(frame,null);
    now=performance.now();
    stop=runKrataQte(host,{g:train,st,room,training:true,alive:()=>true,onClose:()=>closed++});
    body=host.querySelector('.g5-content');body.querySelector('.g5-choices').children[0].onclick();advance(6000);
    assert.equal(body.querySelector('[data-fire]').disabled,true);assert.equal(train.fireControlState().level,0);assert.equal(train._krataSession,null);
    host.querySelector('.mg-x').onclick();assert.equal(closed,1);assert.equal(frame,null);
  }finally{Object.assign(globalThis,old);}
});
