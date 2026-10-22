import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {CREW_POWER,REMORSE_PASS,RETURN} from '../src/data.js';
import {rollRemorse} from '../src/remorse.js';

const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=99999;return g;};
const reload=g=>{const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};
const soul=id=>({id,who:'คดีทดสอบ',name:'คดีทดสอบ',sp:0,deeds:[{s:'greed',w:5,known:true,text:'กรรมที่ทราบ'}],merits:[],deserved:2,said:[],lines:[]});
const seq=(...v)=>{let i=0;return()=>v[Math.min(i++,v.length-1)];};

test('remorse: same outcome probabilities as the old roll (short<=0 always, else 30%)',()=>{
  assert.equal(REMORSE_PASS,60);
  // the first draw decides the branch, exactly like the old `Math.random() > RETURN.chance`
  let pass=0,N=2000;
  for(let i=0;i<N;i++){
    const u=(i+.5)/N;
    const old=u>RETURN.chance;
    const now=rollRemorse(3,seq(u,.5))>=REMORSE_PASS;
    assert.equal(now,old,`u=${u}`);
    if(now)pass++;
  }
  assert.ok(Math.abs(pass/N-.3)<.001,`pass rate ${pass/N}`);
});

test('remorse: bands and short<=0 always repentant; every value in 0..100',()=>{
  let s=12345;const rng=()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
  for(let i=0;i<5000;i++){
    for(const short of [0,-2,undefined]){const r=rollRemorse(short,rng);assert.ok(r>=65&&r<=100,`short=${short} r=${r}`);}
    const r=rollRemorse(2,rng);
    assert.ok(Number.isInteger(r)&&r>=25&&r<=85&&!(r>54&&r<REMORSE_PASS),`short>0 r=${r}`);
  }
  assert.equal(rollRemorse(2,seq(.1,0)),25);assert.equal(rollRemorse(2,seq(.1,.999999)),54);   // not repentant band
  assert.equal(rollRemorse(2,seq(.9,0)),60);assert.equal(rollRemorse(2,seq(.9,.999999)),85);   // repentant band
});

test('finish() stores station/keeper/need/servedAt/remorse; inspect reads the stored number; reload cannot re-roll',()=>{
  const g=game();g.hire('taan');
  const st=g.stations.find(x=>x.def.k==='krata'),c=g.crewOf('taan');
  const make=(id,short,rem)=>{
    const s=soul(id),slot={soul:s,intensity:2,need:42,progress:42,verdict:{destinationCorrect:true,short,over:0,coin:5,stars:3,score:70}};
    st.crewK='taan';st.slots=[slot];
    const realRandom=Math.random;Math.random=seq(rem===undefined?.1:rem,.5);
    try{g.finish(st,slot);}finally{Math.random=realRandom;}
    return g.sentences.find(x=>x.soul.id===id)||null;
  };
  // no prison station in a fresh game? ensureTarang gives one; the soul may be walking there — find the entry either way
  const entryOf=id=>g.sentences.find(x=>x.soul.id===id)||g.afterlifeWalks.find(w=>w.entry?.soul.id===id)?.entry;
  make(7001,3,.1);const e=entryOf(7001);
  assert.ok(e,'entry exists');
  assert.equal(e.stationK,'krata');assert.equal(e.keeperK,'taan');assert.equal(e.keeperName,c.name);
  assert.equal(e.need,42);assert.equal(e.servedAt,g.tick);
  assert.ok(Number.isInteger(e.remorse)&&e.remorse>=25&&e.remorse<=54,'short>0 first draw .1 -> not repentant band');
  g.sentences.push(e);e.stage='prison';e.readyAt=0;
  const stored=e.remorse;
  assert.equal(g.inspectPrison(7001),true);
  assert.equal(e.repentant,false);
  const h=reload(g);const e2=h.sentences.find(x=>x.soul.id===7001);
  assert.equal(e2.remorse,stored,'remorse survives save/load');
  // legacy entry (no remorse) still rolls the old way
  const legacy={soul:soul(7002),verdict:{short:3,over:0},intensity:2,stage:'prison',readyAt:0,inspected:false,repentant:null,zone:g.zone};
  g.sentences.push(legacy);
  const rr=Math.random;Math.random=()=>0.99;try{g.inspectPrison(7002);}finally{Math.random=rr;}
  assert.equal(legacy.repentant,true);
  const legacy0={soul:soul(7003),verdict:{short:0,over:0},intensity:2,stage:'prison',readyAt:0,inspected:false,repentant:null,zone:g.zone};
  g.sentences.push(legacy0);Math.random=()=>0.01;try{g.inspectPrison(7003);}finally{Math.random=rr;}
  assert.equal(legacy0.repentant,true,'short<=0 still always repentant');
});

test('CREW_POWER metadata: every fighter has name/icon/tint/kind and the icon file ships',()=>{
  for(const k of ['nira','taan','plerng','dam','kan','boon','guard']){
    const p=CREW_POWER[k];
    assert.ok(p.name&&p.icon&&p.tint&&p.kind,k);
    assert.match(p.icon,/^img\/ui\/power-[a-z-]+\.webp$/);
    readFileSync(new URL('../'+p.icon,import.meta.url));
  }
  // balance numbers untouched
  assert.deepEqual([CREW_POWER.taan.dmg,CREW_POWER.plerng.dmg,CREW_POWER.dam.dmg,CREW_POWER.guard.dmg,CREW_POWER.boon.heal,CREW_POWER.nira.heal,CREW_POWER.kan.confuse],[35,40,35,60,50,32,1]);
});
