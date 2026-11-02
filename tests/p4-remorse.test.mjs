import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,deservedOf} from '../src/game.js';
import {CREW_POWER,REMORSE,REMORSE_PASS,STATIONS} from '../src/data.js';
import {ALL_CASES} from '../src/cases.js';
import {lockSoulTrait} from '../src/interrogation.js';
import {calcRemorse,remorseOf,isRepentant,keeperFitOf} from '../src/remorse.js';

const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=99999;return g;};
const reload=g=>{const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};
const soul=(id,extra={})=>({id,who:'คดีทดสอบ',name:'คดีทดสอบ',sp:0,deeds:[{s:'greed',w:5,known:true,text:'กรรมที่ทราบ'}],merits:[],deserved:2,said:[],lines:[],traitKey:'accepting',...extra});

// ---- a soul built the way game.js mkCaseSoul builds it (only the fields the rules read) ----
const caseSoul=c=>{
  const s={case:c.k,kind:c.kind,who:c.who,sex:c.sex,resist:!!c.resist,calm:!!c.calm,pure:c.kind==='innocent'||c.kind==='deva',secret:c.secret||null,
    deeds:[...c.seen.map(d=>({...d,known:true})),...(c.hidden||[]).map(d=>({...d,known:false}))],merits:(c.merits||[]).map(m=>({...m})),said:[],lines:[]};
  s.deserved=s.pure?0:deservedOf(s);return lockSoulTrait(s,c);
};
const PUNISH=STATIONS.filter(d=>d.tags?.length&&!d.heaven);
const bestTham=s=>{const pos=s.deeds.filter(d=>d.w>0),tw=pos.reduce((a,d)=>a+d.w,0);
  return Math.max(...PUNISH.map(st=>tw?Math.round(100*pos.filter(d=>st.tags.includes(d.s)).reduce((a,d)=>a+d.w,0)/tw):0));};
const KEEPERS=['taan','plerng','kan','boon','dam'];

/** every hand-written case × every keeper × intensity 1..5, at the best-matching punishment station */
export function simulate(tham=null){
  const rows=[];
  for(const c of ALL_CASES){const s=caseSoul(c);if(s.pure)continue;const th=tham??bestTham(s);
    for(const keeperK of KEEPERS)for(let intensity=1;intensity<=5;intensity++){
      const r=calcRemorse({soul:s,keeperK,intensity,verdict:{tham:th}});
      rows.push({case:c.k,traitKey:r.detail.traitKey,keeperK,intensity,short:r.detail.short,over:r.detail.over,total:r.total,pass:r.total>=REMORSE_PASS});
    }}
  return rows;
}
/** innocents / devas (deserved 0) wrongly sentenced at a punishing station: judge() gives tham 0 */
export function simulatePure(){
  const rows=[];
  for(const c of ALL_CASES){const s=caseSoul(c);if(!s.pure)continue;
    for(const keeperK of KEEPERS)for(let intensity=1;intensity<=5;intensity++){
      const r=calcRemorse({soul:s,keeperK,intensity,verdict:{tham:0}});
      rows.push({case:c.k,traitKey:r.detail.traitKey,keeperK,intensity,over:r.detail.over,total:r.total,pass:r.total>=REMORSE_PASS});}}
  return rows;
}
const rate=rows=>rows.length?rows.filter(r=>r.pass).length/rows.length:NaN;

test('REMORSE constants live in data.js: weights sum to 100, pass = 60',()=>{
  const W=REMORSE.weights;assert.equal(W.keeper+W.intensity+W.trait,100);
  assert.equal(REMORSE_PASS,60);assert.equal(REMORSE.pass,60);
});

test('calcRemorse is deterministic and returns {total,parts:{keeper,intensity,trait}} in 0..100',()=>{
  const s=soul(1);const a=calcRemorse({soul:s,keeperK:'boon',intensity:2,verdict:{tham:100}});
  const b=calcRemorse({soul:s,keeperK:'boon',intensity:2,verdict:{tham:100}});
  assert.deepEqual(a,b);
  assert.equal(a.total,100);assert.deepEqual(Object.keys(a.parts).sort(),['intensity','keeper','trait']);
  assert.ok(a.parts.keeper<=REMORSE.weights.keeper&&a.parts.intensity<=REMORSE.weights.intensity&&a.parts.trait<=REMORSE.weights.trait);
  for(const r of simulate())assert.ok(r.total>=0&&r.total<=100&&Number.isInteger(r.total));
});

test('keeper fit: matching colour > neutral (taan/dam) > mismatching colour',()=>{
  assert.equal(keeperFitOf('boon','accepting'),'match');assert.equal(keeperFitOf('plerng','resisting'),'match');assert.equal(keeperFitOf('kan','concealing'),'match');
  assert.equal(keeperFitOf('taan','resisting'),'neutral');assert.equal(keeperFitOf('dam','concealing'),'neutral');
  assert.equal(keeperFitOf('plerng','accepting'),'mismatch');assert.equal(keeperFitOf('boon','resisting'),'mismatch');
  const s=soul(2,{traitKey:'resisting'}),tot=k=>calcRemorse({soul:s,keeperK:k,intensity:2,verdict:{tham:100}}).total;
  assert.ok(tot('plerng')>tot('taan')&&tot('taan')>tot('boon'));
});

test('force changes neither remorse credit nor outcome for every case and keeper',()=>{
 const rows=simulate();const groups=new Map();
 for(const row of rows){const key=row.case+':'+row.keeperK;const first=groups.get(key);if(first){assert.equal(row.total,first.total);assert.equal(row.pass,first.pass);}else groups.set(key,row);assert.equal(row.short,0);assert.equal(row.over,0);}
 assert.ok(groups.size>100);
 assert.ok(rate(simulate(0))<=rate(rows),'destination remains relevant');
});

test('finish() stores station/keeper/need/servedAt and the computed remorse; inspect reads it; reload keeps it',()=>{
  const g=game();g.hire('boon');
  const st=g.stations.find(x=>x.def.k==='krata'),c=g.crewOf('boon');
  const s=soul(7001,{traitKey:'accepting'}),slot={soul:s,intensity:2,need:42,progress:42,verdict:{destinationCorrect:true,short:0,over:0,coin:5,stars:3,score:70,tham:100}};
  st.crewK='boon';st.slots=[slot];
  g.finish(st,slot);
  const e=g.sentences.find(x=>x.soul.id===7001)||g.afterlifeWalks.find(w=>w.entry?.soul.id===7001)?.entry;
  assert.ok(e,'entry exists');
  assert.equal(e.stationK,'krata');assert.equal(e.keeperK,'boon');assert.equal(e.keeperName,c.name);assert.equal(e.need,42);assert.equal(e.servedAt,g.tick);
  assert.equal(e.remorse.total,100);assert.deepEqual(e.remorse,calcRemorse({soul:s,keeperK:'boon',intensity:2,verdict:slot.verdict}));
  if(!g.sentences.includes(e))g.sentences.push(e);
  e.stage='prison';e.readyAt=0;
  const rr=Math.random;Math.random=()=>{throw new Error('inspectPrison must not roll');};
  try{assert.equal(g.inspectPrison(7001),true);}finally{Math.random=rr;}
  assert.equal(e.repentant,true);
  const h=reload(g);assert.deepEqual(h.sentences.find(x=>x.soul.id===7001).remorse,e.remorse);
  // low remorse -> not repentant -> back to queue
  const bad=soul(7002,{traitKey:'resisting'}),slot2={soul:bad,intensity:5,need:40,progress:40,verdict:{destinationCorrect:false,short:0,over:3,coin:0,tham:0}};
  st.crewK='boon';st.slots=[slot2];g.finish(st,slot2);
  const e2=g.sentences.find(x=>x.soul.id===7002)||g.afterlifeWalks.find(w=>w.entry?.soul.id===7002)?.entry;
  assert.ok(e2.remorse.total<REMORSE_PASS);
  if(!g.sentences.includes(e2))g.sentences.push(e2);e2.stage='prison';e2.readyAt=0;g.inspectPrison(7002);
  assert.equal(e2.repentant,false);
});

test('legacy entries without remorse keep the old inspect roll',()=>{
  const g=game();
  const mk=(id,short)=>{const x={soul:soul(id),verdict:{short,over:0},intensity:2,stage:'prison',readyAt:0,inspected:false,repentant:null,zone:g.zone};g.sentences.push(x);return x;};
  assert.equal(remorseOf({}),undefined);assert.equal(remorseOf({remorse:77}),77);assert.equal(isRepentant(60),true);assert.equal(isRepentant(59),false);
  const rr=Math.random;
  try{
    const a=mk(8001,3);Math.random=()=>0.99;g.inspectPrison(8001);assert.equal(a.repentant,true);
    const b=mk(8002,3);Math.random=()=>0.01;g.inspectPrison(8002);assert.equal(b.repentant,false);
    const c=mk(8003,0);Math.random=()=>0.01;g.inspectPrison(8003);assert.equal(c.repentant,true,'short<=0 always repentant (old save)');
  }finally{Math.random=rr;}
});

test('CREW_POWER metadata: every fighter has name/icon/tint/kind and the icon file ships; balance numbers untouched',()=>{
  for(const k of ['nira','taan','plerng','dam','kan','boon','guard']){
    const p=CREW_POWER[k];
    assert.ok(p.name&&p.icon&&p.tint&&p.kind,k);
    assert.match(p.icon,/^img\/ui\/power-[a-z-]+\.webp$/);
    readFileSync(new URL('../'+p.icon,import.meta.url));
  }
  assert.deepEqual([CREW_POWER.taan.dmg,CREW_POWER.plerng.dmg,CREW_POWER.dam.dmg,CREW_POWER.guard.dmg,CREW_POWER.boon.heal,CREW_POWER.nira.heal,CREW_POWER.kan.confuse],[35,40,35,60,50,32,1]);
});

test('CREW_POWER job icons ship for every keeper (nira + taan/plerng/kan/boon/dam)',()=>{
  for(const k of ['nira','taan','plerng','dam','kan','boon']){
    assert.match(CREW_POWER[k].jobIcon,/^img\/ui\/job-[a-z]+\.webp$/);
    readFileSync(new URL('../'+CREW_POWER[k].jobIcon,import.meta.url));
  }
  assert.equal(CREW_POWER.guard.jobIcon,undefined);
});

test('innocents cannot be treated as having earned repentance by selecting any force',()=>{
 const rows=simulatePure();assert.ok(rows.length>0);assert.ok(rows.every(r=>!r.pass));
});
