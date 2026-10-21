import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {spiritTraitHtml,keeperRoleHtml,keeperImpactHtml,kanClueHtml,bindKanClue,teamReportsHtml,bindTeamReports,onceFeedbackDismiss,mountInterrogationStyles} from '../src/interrogation-ui.js';

const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const keeper={k:'taan',name:'ทัณฑ์',morale:100};
const game=()=>({zone:'th',crew:[keeper,{k:'kan',name:'กานต์',morale:100}],stations:[],workers:()=>[{job:{kind:'repair'}},{job:null}],
  spiritTrait:()=>({key:'concealing',label:'ปิดบังความจริง',icon:'🧿',color:'#b78ae5',keeper:'kan'}),
  keeperTrialInfo:(s,c)=>({benefit:'หากตัดสินถูกและงานจบ ระเบียบ +2',cost:'ต้องอยู่คุมงานจนจบ',matching:c.k==='kan',available:true,why:''}),assignBlock:()=>null});

test('trait badges include readable labels and symbols, independent of severity colors',()=>{
  for(const trait of [{key:'concealing',label:'ปิดบังความจริง',icon:'🧿',color:'#b78ae5'},
    {key:'resisting',label:'ดื้อและต่อต้าน',icon:'🔥',color:'#ef7777'},{key:'accepting',label:'ยอมรับและพร้อมแก้ไข',icon:'🍃',color:'#83ca96'}]){
    const html=spiritTraitHtml(trait);assert.ok(html.includes(trait.label));assert.ok(html.includes(trait.icon));
    assert.match(html,/role="status" aria-live="polite"/);assert.match(html,/ไม่ได้บอกน้ำหนักกรรมหรือระดับทัณฑ์/);
  }
  assert.doesNotMatch(spiritTraitHtml({key:'x',label:'<script>',icon:'<img>',color:'red;position:fixed'}),/<script>|<img>|position:fixed/);
});

test('keeper previews expose conditional benefit, cost and current workload without reading hidden answers',()=>{
  const g=game(),soul={id:11};
  for(const key of ['deeds','merits','secret','deserved','pure'])Object.defineProperty(soul,key,{get(){throw Error('preview read hidden '+key);}});
  const ordinary=keeperRoleHtml(g,soul,keeper,'krata',{choose:true});
  assert.match(ordinary,/คุมได้ตามปกติ/);assert.match(ordinary,/หากตัดสินถูกและงานจบ/);assert.match(ordinary,/ภาระและต้นทุน/);assert.match(ordinary,/งานปัจจุบัน/);
  assert.doesNotMatch(ordinary,/disabled|สมควรได้รับ|เฉลย|คะแนน|secret|deserved/,'nonmatching keepers remain eligible');
  const matching=keeperRoleHtml(g,soul,g.crew[1],'krata',{choose:true});assert.match(matching,/is-trait-match/);assert.match(matching,/เหมาะกับลักษณะนี้/);
  const html=keeperImpactHtml(g,soul,keeper,'krata');assert.match(html,/มีงานแล้ว 1 คน · ว่าง 1 คน/);assert.match(html,/คนงานหนึ่งคนทำได้ทีละงาน/);
  g.assignBlock=()=>({key:'keeperCost',text:'ต้องใช้เสบียงเพิ่ม 2'});
  const blocked=keeperRoleHtml(g,soul,keeper,'krata',{choose:true});assert.match(blocked,/disabled/);assert.match(blocked,/ต้องใช้เสบียงเพิ่ม 2/);
});

test('Kan clue shows the exact resource price and uses a single guarded action, separate from Yama powers',()=>{
  const g=game();let used=false,reveals=0,announcements=0;
  g.kanClueWhy=()=>used?'พักพลังอีก 30 วินาที':'';
  g.kanClueCost=()=>({mp:4,morale:4,cooldownSeconds:30});
  g.kanRevealClue=()=>{used=true;reveals++;return {kind:'truth',text:'เหตุบรรเทาหนึ่งข้อ'};};
  assert.match(kanClueHtml(g,{id:1}),/ใช้ MP 4 · กำลังใจ 4 · พักพลัง 30 วินาที/);
  const button={};bindKanClue({querySelector:()=>button},g,{id:1},()=>announcements++);button.onclick();button.onclick();
  assert.equal(reveals,1);assert.equal(announcements,1);assert.match(kanClueHtml(g,{id:1},'เหตุบรรเทาหนึ่งข้อ'),/disabled/);
  g.kanClueCost=()=>({mp:0,morale:4,cooldownSeconds:30,insight:true});
  assert.match(kanClueHtml(g,{id:1}),/ใช้เบาะแสที่สะสม 1 ประเด็น/);assert.doesNotMatch(kanClueHtml(g,{id:1}),/ใช้ MP 4/);
  assert.match(ui,/\['roar', 'mirror', 'hypno'\]/,'existing powers are still offered separately');
});

test('completion reports remain a bounded unobtrusive regional list and acknowledging only marks read',()=>{
  const g=game();g.teamReports=[{id:1,zone:'asia',keeperName:'other',soulName:'hidden regional',summary:'other'},
    {id:2,zone:'th',keeperName:'ทัณฑ์',soulName:'งานเสร็จ',summary:'คุมงานตรงหมาย',benefits:['ระเบียบ +2'],seen:false}];
  const html=teamReportsHtml(g);assert.match(html,/<details class="team-reports" open>/);assert.match(html,/ระเบียบ \+2/);assert.doesNotMatch(html,/hidden regional|role="dialog"/);
  let paid=40,changed=0;g.acknowledgeTeamReport=id=>{const r=g.teamReports.find(r=>r.id===id);if(r.seen)return false;r.seen=true;return true;};
  const button={dataset:{teamReportAck:'2'}};bindTeamReports({querySelectorAll:()=>[button]},g,()=>changed++);button.onclick();button.onclick();
  assert.equal(changed,1);assert.equal(paid,40);assert.equal(g.teamReports[1].seen,true);assert.doesNotMatch(teamReportsHtml(g),/data-team-report-ack="2"/);
  g.teamReports=Array.from({length:8},(_,i)=>({id:20-i,zone:'th',keeperName:'ผู้คุม',soulName:`คดี ${20-i}`,summary:'งานเสร็จ',benefits:[],seen:true}));
  const recent=teamReportsHtml(g);assert.match(recent,/data-team-report="20"/);assert.doesNotMatch(recent,/data-team-report="15"/);
  assert.equal((recent.match(/class="team-report /g)||[]).length,5,'newest-first game reports stay bounded without hiding the latest entries');
});

test('production supervisor feedback displays the specific reason and skips once without repeating judgment or rewards',()=>{
  const source=ui.slice(ui.indexOf('function showVerdict(v)'),ui.indexOf('\nfunction openEnding(o)'));
  let timer,drawn=0;const g={pendingVerdict:{},bossUntil:0,coin:100,over:null};
  const ctx=vm.createContext({g,fx:null,sfx(){},verdictComment:v=>v.reason,performance:{now:()=>0},onceFeedbackDismiss,
    clearTimeout(){},setTimeout:callback=>{timer=callback;return 1;},drawOverlay:()=>drawn++,updatePlay(){},openEnding(){throw Error('unexpected ending');}});
  vm.runInContext(source,ctx);ctx.showVerdict({stars:5,reason:'เลือกสถานที่ตรงกรรมและระดับทัณฑ์พอดี'});
  assert.match(ctx.fx.line,/ระดับทัณฑ์พอดี/);assert.equal(g.coin,100);
  ctx.showVerdict.dismiss();timer();ctx.showVerdict.dismiss();assert.equal(drawn,1);assert.equal(g.coin,100);assert.equal(ctx.fx,null);
  ctx.showVerdict({stars:4,reason:'คำตัดสินเก่า'});const stale=timer;ctx.showVerdict({stars:5,reason:'คำตัดสินใหม่'});
  stale();assert.equal(ctx.fx.reason,'คำตัดสินใหม่');ctx.showVerdict.dismiss();assert.equal(drawn,2);
  assert.match(ui,/data-dismiss-verdict/);assert.match(ui,/v\.reason \|\| BOSS_LINE/);
});

test('interrogation styles mount once and remain scoped to the new controls',()=>{
  const original=globalThis.document,links=[];
  globalThis.document={getElementById:id=>links.find(link=>link.id===id),createElement:()=>({}),head:{appendChild:link=>links.push(link)}};
  try{mountInterrogationStyles();mountInterrogationStyles();assert.equal(links.length,1);assert.match(links[0].href,/interrogation-ui\.css(?:\?v=[^ ]+)?$/);}finally{globalThis.document=original;}
  const css=readFileSync(new URL('../src/interrogation-ui.css',import.meta.url),'utf8');assert.match(css,/focus-visible/);assert.match(css,/@media\(max-width:700px\)/);
});
