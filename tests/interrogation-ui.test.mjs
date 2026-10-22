import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {spiritNameHtml,keeperBarHtml,kanOrbHtml,KAN_BUTTON_COPY,bindKanClue,teamReportsHtml,bindTeamReports,onceFeedbackDismiss,mountInterrogationStyles} from '../src/interrogation-ui.js';

const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const keeper={k:'taan',name:'ทัณฑ์',morale:100};
const game=()=>({zone:'th',crew:[keeper,{k:'kan',name:'กานต์',morale:100}],stations:[],workers:()=>[{job:{kind:'repair'}},{job:null}],
  spiritTrait:()=>({key:'concealing',label:'ปิดบังความจริง',icon:'🧿',color:'#b78ae5',keeper:'kan'}),
  keeperTrialInfo:(s,c)=>({benefit:'หากตัดสินถูกและงานจบ ระเบียบ +2',cost:'ต้องอยู่คุมงานจนจบ',matching:c.k==='kan',available:true,why:''}),assignBlock:()=>null});

const TRAITS=[{key:'concealing',label:'ปิดบังความจริง',icon:'🧿',color:'#b78ae5'},
  {key:'resisting',label:'ดื้อและต่อต้าน',icon:'🔥',color:'#ef7777'},{key:'accepting',label:'ยอมรับและพร้อมแก้ไข',icon:'🍃',color:'#83ca96'}];

test('P2: the trait sits on the spirit name tag with the icon first and an accessible label — never colour alone',()=>{
  for(const trait of TRAITS){
    const html=spiritNameHtml(trait,'พลทหารเกณฑ์หนุ่ม');
    assert.ok(html.indexOf(`>${trait.icon}<`)>0&&html.indexOf(`>${trait.icon}<`)<html.indexOf('spirit-name-text'),'icon leads the name');
    assert.match(html,new RegExp(`aria-label="พลทหารเกณฑ์หนุ่ม · ลักษณะ: ${trait.label}"`));assert.ok(html.includes(`--trait-color:${trait.color}`));assert.match(html,/data-spirit-trait=/);
    assert.doesNotMatch(html,/ลักษณะวิญญาณ<\/small>|trait-explanation/,'the old trait box is gone');
  }
  assert.doesNotMatch(spiritNameHtml({key:'x',label:'<script>',icon:'<img>',color:'red;position:fixed'},'<b>x</b>'),/<script>|<img>|<b>x|position:fixed/);
  assert.equal(spiritNameHtml(null,'ชื่อ').includes('data-spirit-trait'),false);
  assert.match(ui,/spiritNameHtml\(g\.spiritTrait\?\.\(s\)/);assert.doesNotMatch(ui,/spiritTraitHtml/);
});

test('P2: the compact keeper bar lists keepers as picture + name + the colour they suit, and never reads hidden answers',()=>{
  const g=game(),soul={id:11};
  for(const key of ['deeds','merits','secret','deserved','pure'])Object.defineProperty(soul,key,{get(){throw Error('preview read hidden '+key);}});
  g.crew=[keeper,{k:'kan',name:'กานต์',morale:100},{k:'plerng',name:'เพลิง',morale:100}];
  const html=keeperBarHtml(g,soul,keeper,'krata',c=>`img/crew-${c.k}-profile.png`);
  assert.match(html,/data-pickkey="cr" data-k="taan"/);assert.match(html,/data-pickkey="cr" data-k="kan"/);
  assert.match(html,/aria-pressed="true"[^>]*title="[^"]*ทัณฑ์/s);
  assert.match(html,/is-trait-match/);assert.match(html,/คุมได้|เหมาะกับลักษณะนี้/);
  assert.match(html,/data-k="kan"[\s\S]*?🧿/);assert.match(html,/data-k="plerng"[\s\S]*?🔥/);assert.doesNotMatch(html.split('data-k="taan"')[1].split('</button>')[0],/🧿|🔥|🍃/,'taan is not tied to a colour');
  assert.match(html,/มีงานแล้ว 1 คน · ว่าง 1 คน/);
  assert.doesNotMatch(html,/คนงานหนึ่งคนทำได้ทีละงาน|keeper-role-roster|ภาระและต้นทุน:/,'long explanations moved to the handbook');
  g.assignBlock=()=>({key:'keeperCost',text:'ต้องใช้เสบียงเพิ่ม 2'});
  const blocked=keeperBarHtml(g,soul,keeper,'krata');assert.match(blocked,/disabled/);assert.match(blocked,/ต้องใช้เสบียงเพิ่ม 2/);
});

test('P2: Kan is a round icon with the owner label, shown only when Kan is hired, with the exact price and one guarded action',()=>{
  const g=game();let used=false,reveals=0,announcements=0;
  g.kanClueWhy=()=>used?'กานต์กำลังพักพลัง · อีก 30 วินาที':'';
  g.kanClueCost=()=>({mp:4,morale:4,cooldownSeconds:30});
  g.kanRevealClue=()=>{used=true;reveals++;return {kind:'truth',text:'เหตุบรรเทาหนึ่งข้อ'};};
  g.crewOf=k=>g.crew.find(c=>c.k===k);
  const html=kanOrbHtml(g,{id:1},'img/crew-kan-profile.png');
  assert.match(html,/ช่วยเปิดความจริง/);assert.equal(KAN_BUTTON_COPY.label,'ช่วยเปิดความจริง');assert.match(html,/<img src="img\/crew-kan-profile\.png"/);
  assert.match(html,/ใช้พลังเวท 4 · กำลังใจกานต์ 4 · พักพลัง 30 วินาที/);assert.doesNotMatch(html,/ขอเบาะแส 1 ประเด็น|kan-clue"|กานต์ · เปิดความจริงทีละประเด็น/,'the old box is gone');
  const button={};bindKanClue({querySelector:()=>button},g,{id:1},()=>announcements++);button.onclick();button.onclick();
  assert.equal(reveals,1);assert.equal(announcements,1);assert.match(kanOrbHtml(g,{id:1},'x','เหตุบรรเทาหนึ่งข้อ'),/data-kan-clue disabled/);assert.match(kanOrbHtml(g,{id:1},'x'),/กานต์กำลังพักพลัง · อีก 30 วินาที/);
  g.kanClueCost=()=>({mp:0,morale:4,cooldownSeconds:30,insight:true});
  assert.match(kanOrbHtml(g,{id:1},'x'),/ใช้เบาะแสที่สะสม 1 ประเด็น/);assert.doesNotMatch(kanOrbHtml(g,{id:1},'x'),/ใช้พลังเวท 4/);
  g.crew=g.crew.filter(c=>c.k!=='kan');assert.equal(kanOrbHtml(g,{id:1},'x'),'','not hired = no icon');
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
