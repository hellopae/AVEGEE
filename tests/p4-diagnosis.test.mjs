import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {diagnosisModel,diagnosisSubjects,subjectKey,nextTodo} from '../src/diagnosis.js';
import {closingLine} from '../src/diagnosis-ui.js';
import {gateKarma} from '../src/h4-location-ui.js';
import {TALK_LINES} from '../src/talk-lines.js';
// the helper only reads the base TH/EN tables; P4 keys live in Object.assign(TH|EN, {...}) blocks at the end of i18n.js
const I18N=readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');
const assigned=name=>{const out={};for(const b of I18N.matchAll(new RegExp('Object\\.assign\\('+name+', \\{([\\s\\S]*?)\\n\\}\\);','g')))
  for(const m of b[1].matchAll(/^\s*'([^']+)':\s*'((?:[^'\\]|\\.)*)'/gm))out[m[1]]=m[2];return out;};
const TH_DICT=assigned('TH'),EN_DICT=assigned('EN');

const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
const soul=(id,extra={})=>({id,who:'ชาวบ้าน',name:'สมชาย',sex:'m',sp:1,deserved:3,said:[],waited:0,traitKey:'accepting',
  deeds:[{s:'kong',w:5,t:'กรรมที่เปิดเผย',known:true},{s:'pak',w:2,t:'กรรมที่ซ่อน',known:false},{s:'kong',w:-1,t:'เหตุบรรเทา',known:true},{s:'kha',w:1,t:'ข้อที่ยังมองไม่เห็น',known:true,visible:false}],
  merits:[{t:'บุญจริง',v:1,fake:false},{t:'บุญปลอมที่ยังไม่โดนเปิด',v:2,fake:true},{t:'บุญปลอมที่โดนเปิด',v:2,fake:true,exposed:true}],...extra});
const verdict={tham:100,ked:80,score:80,stars:4,short:0,over:0,coin:4};
const entry=(s,extra={})=>({soul:s,verdict,intensity:3,stage:'prison',readyAt:0,inspected:false,repentant:null,zone:'th',stationK:'krata',keeperK:'boon',keeperName:'บุญ',need:40,servedAt:1,
  remorse:{total:90,parts:{keeper:25,intensity:45,trait:20},detail:{traitKey:'accepting',keeperFit:'match',stationFit:1,short:0,over:0}},...extra});

test('held soul (D4): sheet opens but shows public facts only and every meter is locked',()=>{
  const g=game();g.held=[soul(1)];
  const [s]=diagnosisSubjects(g,'tarang');assert.equal(s.kind,'held');
  const m=diagnosisModel(g,s);
  assert.deepEqual(m.deeds.map(d=>d.t),['กรรมที่เปิดเผย','เหตุบรรเทา'],'hidden / not-yet-visible deeds never listed');
  assert.deepEqual(m.merits.map(x=>x.t),['บุญจริง','บุญปลอมที่โดนเปิด'],'unexposed fake merit is not listed');
  assert.equal(m.ked.locked,true);assert.equal(m.remorse.state,'locked');assert.equal(m.remorse.value,null);assert.equal(m.remorse.parts,null);assert.equal(m.karma.locked,true);
  assert.equal(m.order,null);assert.equal(m.banner.id,'held');assert.equal(m.action.kind,'release');assert.equal(m.closing,null);
  assert.doesNotMatch(JSON.stringify(m.deeds),/กรรมที่ซ่อน/);
});

test('prison soul before inspection (D2): remorse locked, no number and no breakdown; truth is revealed (D5)',()=>{
  const g=game();const s=soul(2);const e=entry(s);g.sentences=[e];g.tick=10;
  const m=diagnosisModel(g,diagnosisSubjects(g,'tarang')[0]);
  assert.equal(m.remorse.state,'locked');assert.equal(m.remorse.why,'uninspected');assert.equal(m.remorse.value,null);assert.equal(m.remorse.parts,null);
  assert.doesNotMatch(JSON.stringify({r:m.remorse}),/90|keeper|intensity/);
  assert.equal(m.deeds.length,4,'closed case: everything shown, including hidden deeds');assert.ok(m.deeds.some(d=>d.hidden));
  assert.equal(m.merits.length,3);
  assert.equal(m.ked.value,80);assert.equal(m.banner.id,'prisonInspect');assert.equal(m.action.kind,'inspectPrison');assert.equal(m.closing,'tarangPending');
  assert.equal(m.order.stationK,'krata');assert.equal(m.order.keeperName,'บุญ');assert.equal(m.order.diff,0);
});

test('prison soul: countdown, then after inspection the number + 3-part breakdown appear and banner follows repentant',()=>{
  const g=game();const e=entry(soul(3),{readyAt:20});g.sentences=[e];g.tick=15;
  let m=diagnosisModel(g,diagnosisSubjects(g,'tarang')[0]);
  assert.equal(m.banner.id,'prisonWait');assert.equal(m.banner.n,5);assert.equal(m.action.disabled,true);
  g.tick=20;g.inspectPrison(3);
  m=diagnosisModel(g,diagnosisSubjects(g,'tarang')[0]);
  assert.equal(m.remorse.state,'pass');assert.equal(m.remorse.value,90);assert.deepEqual(Object.keys(m.remorse.parts).sort(),['intensity','keeper','trait']);
  assert.equal(m.banner.id,'prisonKed');assert.equal(m.closing,'ked');
  assert.equal(m.action.kind,'moveFromPrison');assert.equal(m.action.disabled,true,'no Heaven Gate yet -> button disabled with the needSawan reason');assert.equal(m.action.reason,'room.needSawan');
  const bad=entry(soul(4),{inspected:true,repentant:false,remorse:{total:41,parts:{keeper:10,intensity:20,trait:11},detail:{}}});g.sentences=[bad];
  m=diagnosisModel(g,diagnosisSubjects(g,'tarang')[0]);
  assert.equal(m.remorse.state,'fail');assert.equal(m.banner.id,'prisonNotKed');assert.equal(m.closing,'notKed');assert.equal(m.action.disabled,false);
});

test('gate soul: expected karma before the check equals gateKarma and the waterfall adds up; reborn / heaven banners',()=>{
  const g=game();const s=soul(5);const e=entry(s,{stage:'gate',checked:false,inspected:true,repentant:true});g.sentences=[e];
  let m=diagnosisModel(g,diagnosisSubjects(g,'sawan')[0]);
  assert.equal(m.banner.id,'gateWait');assert.equal(m.karma.expected,true);assert.equal(m.karma.left,gateKarma(e));
  const k=m.karma;assert.equal(Math.max(0,Math.round((k.sin-k.relief-k.merit-k.intensity-k.lotus)*10)/10),k.left,'waterfall identity');
  g.inspectGate(5);m=diagnosisModel(g,diagnosisSubjects(g,'sawan')[0]);
  assert.equal(m.karma.expected,false);
  assert.equal(m.banner.id,e.karmaLeft>0?'gateReborn':'gateHeaven');assert.equal(m.closing,e.karmaLeft>0?'reborn':'heaven');
  const zero=entry(soul(6,{deeds:[{s:'kong',w:1,t:'เบามาก',known:true}],merits:[]}),{stage:'gate',checked:true,karmaLeft:0,rewardEligible:true,inspected:true,repentant:true});g.sentences=[zero];
  m=diagnosisModel(g,diagnosisSubjects(g,'sawan')[0]);assert.equal(m.banner.id,'gateHeaven');assert.equal(m.banner.reward,true);assert.equal(m.action.kind,'resolveGate');
});

test('innocent soul gets the "pure" closing; old saves without station/keeper/remorse say "no data" instead of guessing',()=>{
  const g=game();
  const pure=entry(soul(7,{pure:true}),{inspected:true,repentant:true});g.sentences=[pure];
  assert.equal(diagnosisModel(g,diagnosisSubjects(g,'tarang')[0]).closing,'pure');
  const old={soul:soul(8),verdict:{ked:60,short:1,over:0},intensity:2,stage:'prison',readyAt:0,inspected:true,repentant:true,zone:'th'};g.sentences=[old];
  const m=diagnosisModel(g,diagnosisSubjects(g,'tarang')[0]);
  assert.equal(m.order.legacy,true);assert.equal(m.order.stationName,null);assert.equal(m.order.keeperName,null);
  assert.equal(m.remorse.state,'pass');assert.equal(m.remorse.value,null,'no number invented');assert.equal(m.remorse.parts,null);
});

test('rooms: tarang lists prison + held, sawan lists gate only; nextTodo skips the soul just handled and disabled actions',()=>{
  const g=game();g.held=[soul(10)];
  g.sentences=[entry(soul(11)),entry(soul(12),{stage:'gate',checked:false}),entry(soul(13),{readyAt:999})];g.tick=0;
  assert.deepEqual(diagnosisSubjects(g,'tarang').map(subjectKey),['prison:11','prison:13','held:10']);
  assert.deepEqual(diagnosisSubjects(g,'sawan').map(subjectKey),['gate:12']);
  assert.deepEqual(diagnosisSubjects(g,'krata'),[]);
  assert.equal(subjectKey(nextTodo(g,'tarang','prison:11')),'held:10','13 is still serving its term (disabled) so it is skipped');
  assert.equal(nextTodo(g,'sawan','gate:12'),null);
});

test('closing lines come from Rae\'s diagnosisClosing set and go through voice()',()=>{
  const m={closing:'ked',id:6,sex:'f'};const line=closingLine(m);
  assert.ok(TALK_LINES.diagnosisClosing.ked.some(t=>t.replace(/\{[a-z]+\}/g,'').length>0));
  assert.doesNotMatch(line,/\{(i|p|my|na)\}/);assert.match(line,/ค่ะ|ดิฉัน|นะคะ/);
  assert.equal(closingLine({closing:null,id:1,sex:'m'}),'');
  assert.equal(closingLine({closing:'ked',id:6,sex:'f'}),line,'stable per soul');
});

test('i18n: every diag.* key used by the sheet exists in TH and EN',()=>{
  const used=new Set();
  for(const f of ['src/diagnosis-ui.js','src/diagnosis.js','src/ui.js'])
    for(const x of readFileSync(new URL('../'+f,import.meta.url),'utf8').matchAll(/['`"](diag\.[a-zA-Z.]+)/g))used.add(x[1]);
  // dynamic keys built as 'diag.b.'+id, 'diag.mode.'+mode, 'diag.part.'+k, 'diag.part.keeper.'+fit, ...
  for(const id of ['held','prisonWait','prisonInspect','prisonKed','prisonNotKed','gateWait','gateReborn','gateHeaven','gateHeavenReward'])used.add('diag.b.'+id);
  for(const m of ['held','prison','gate'])used.add('diag.mode.'+m);
  for(const k of ['keeper','intensity','trait'])used.add('diag.part.'+k);
  for(const f of ['match','neutral','mismatch'])used.add('diag.part.keeper.'+f);
  for(const f of ['exact','short','over'])used.add('diag.part.intensity.'+f);
  for(const f of ['accepting','concealing','resisting'])used.add('diag.part.trait.'+f);
  for(const key of used){if(/\.$/.test(key))continue;assert.ok(key in TH_DICT,'TH missing '+key);assert.ok(key in EN_DICT,'EN missing '+key);}
  assert.ok(used.size>40);
});
