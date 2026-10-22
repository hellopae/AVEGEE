import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {ALL_CASES,CASES} from '../src/cases.js';
import {spiritTrait,traitKeyFor,lockSoulTrait,keeperWorkPlan,hiddenIssues,revealOneIssue,TRAIT_KEYS} from '../src/interrogation.js';
import {kanOrbHtml} from '../src/interrogation-ui.js';
import {soulTraitGuide,keeperTeamGuide,firstInterrogationLesson,sentencingChapters} from '../src/sentencing-guide.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.has=()=>true;g.coin=99999;return g;};
const reload=g=>{const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};
const tally=()=>({concealing:0,resisting:0,accepting:0});
function namedSouls(){
 const g=game(),out=[];
 for(const c of ALL_CASES){
  g.zone=c.zone==='asia'?'asia':'th';g.casesDone=1;g.spawns=3;g.usedCases=ALL_CASES.map(x=>x.k).filter(k=>k!==c.k);
  let s;if(c.k==='devaMonk'){g.queue=[];g.zoneCases.th=4;g.ensureDevaCase();s=g.queue[0];}else s=g.nextNamedCase([]);
  assert.equal(s.case,c.k);out.push(s);
 }
 return out;
}

test('P2 lock: every named case and every generated soul gets a trait the moment it enters court',()=>{
 for(const s of namedSouls())assert.ok(TRAIT_KEYS.includes(s.traitKey),s.case);
 const g=game();g.casesDone=2;g.usedCases=ALL_CASES.map(x=>x.k);
 for(let i=0;i<300;i++){g.queue=[];g.spawns=1;g.spawnSoul();assert.ok(TRAIT_KEYS.includes(g.queue[0].traitKey));}
});

test('P2 spread: all three colours are common, for named cases and for generated souls',()=>{
 const named=tally();for(const s of namedSouls())named[s.traitKey]++;
 assert.equal(named.concealing+named.resisting+named.accepting,ALL_CASES.length);
 for(const k of TRAIT_KEYS)assert.ok(named[k]>=8,`named ${k} ${named[k]}`);
 const g=game(),random=tally();g.casesDone=2;g.usedCases=ALL_CASES.map(x=>x.k);const N=3000;
 for(let i=0;i<N;i++){g.queue=[];g.spawns=1;g.spawnSoul();random[g.queue[0].traitKey]++;}
 for(const k of TRAIT_KEYS)assert.ok(random[k]/N>=0.15,`random ${k} ${random[k]/N}`);
});

test('P2 rule: priority is resist → concealment (fake merit / secret / heavy hidden deed) → hard denial → accepting',()=>{
 const base={deeds:[{w:3,known:true}],merits:[]};
 assert.equal(traitKeyFor({...base,resist:true}),'resisting');
 assert.equal(traitKeyFor({...base,resist:true,calm:true}),'accepting','calm spirits do not resist');
 assert.equal(traitKeyFor({...base,merits:[{fake:true}]}),'concealing');
 assert.equal(traitKeyFor({...base,secret:'ความลับ'}),'concealing');
 assert.equal(traitKeyFor({...base,deeds:[{w:3,known:true},{w:5,known:false}]}),'concealing');
 assert.equal(traitKeyFor({...base,deeds:[{w:3,known:true},{w:-2,known:false}]}),'accepting','a hidden mitigating fact is not concealment');
 assert.equal(traitKeyFor({...base,resist:true,merits:[{fake:true}]}),'resisting','fighting back comes before concealing');
 assert.equal(traitKeyFor({...base,denied:'ปฏิเสธ'}),'resisting');
 assert.equal(traitKeyFor({kind:'tragic',deeds:[{w:4,known:true}],merits:[],denied:null,lines:[{kind:'deny'}]}),'accepting');
 assert.equal(traitKeyFor({kind:'twist',deeds:[{w:5,known:true}],merits:[],lines:[{kind:'deny'}]}),'resisting');
 assert.equal(traitKeyFor({kind:'twist',deeds:[{w:4,known:true}],merits:[],lines:[{kind:'deny'}]}),'accepting','a deny of a lighter charge is not a hard denial');
});

test('P2 lock survives the whole interrogation, a save/load and a returned verdict',()=>{
 for(const s of namedSouls().filter(x=>['pol','nun','recruit','monk'].includes(x.case))){
  const before=s.traitKey,g=game();g.queue=[s];s.courtDisembarked=true;
  while(hiddenIssues(s).length)revealOneIssue(s);
  for(const l of s.lines)l.used=true;s.denied=null;s.resist=!s.resist;s.beaten=true;
  assert.equal(spiritTrait(s).key,before,s.case);
  const h=reload(g);assert.equal(h.queue[0].traitKey,before);assert.equal(h.spiritTrait(h.queue[0]).key,before);
 }
});

test('P2 old saves: a soul without a locked colour is locked from its case data on load, and never changes again',()=>{
 let g=game();const souls=namedSouls();
 const nurse=souls.find(s=>s.case==='nurse'),pol=souls.find(s=>s.case==='pol'),dev=souls.find(s=>s.case==='devaMonk');
 const want={nurse:nurse.traitKey,pol:pol.traitKey};
 g.queue=[nurse,pol];const data=JSON.parse(JSON.stringify(g.snapshot()));
 for(const s of data.queue){delete s.traitKey;}
 // the hand-written case data is the memory of what was hidden, so even after the truth was opened the old save locks correctly
 for(const s of data.queue)for(const d of s.deeds)d.known=true,d.visible=true;
 const h=game();assert.equal(h.restore(data),true);
 assert.equal(h.queue.find(s=>s.case==='nurse').traitKey,want.nurse);assert.equal(h.queue.find(s=>s.case==='pol').traitKey,want.pol);
 assert.equal(want.pol,'resisting');assert.equal(want.nurse,'concealing');assert.ok(dev.traitKey);
 const again=reload(h);assert.equal(again.queue.find(s=>s.case==='pol').traitKey,'resisting');
});

test('P2 keeper plan and recommendation use the locked colour, not what the player has since uncovered',()=>{
 const s={deeds:[{w:3,known:true},{w:5,known:false}],merits:[],traitKey:'concealing'};
 revealOneIssue(s);assert.equal(keeperWorkPlan(s,'plerng').trait,'concealing');assert.equal(keeperWorkPlan(s,'plerng').resistanceControl,false);
 const red={deeds:[],merits:[],traitKey:'resisting'};assert.equal(keeperWorkPlan(red,'plerng').resistanceControl,true);assert.equal(keeperWorkPlan(red,'kan').resistanceControl,false);
 assert.match(read('src/game.js'),/spiritTrait\(soul\)\.keeper===c\.k/);
});

test('P2 Kan icon appears only once Kan is hired and keeps the original reasons for a disabled state',()=>{
 const g=game(),soul=g.queue[0];g.cancelCourtArrival(soul.id);
 assert.equal(kanOrbHtml(g,soul,'img/crew-kan-profile.png'),'');
 g.hire('kan');g.mp=g.mpMax;const html=kanOrbHtml(g,soul,'img/crew-kan-profile.png');
 assert.match(html,/ช่วยเปิดความจริง/);assert.match(html,/data-kan-clue/);
 g.mp=0;assert.match(kanOrbHtml(g,soul,'x'),/พลังเวทไม่พอ|data-kan-clue disabled/);
 assert.doesNotMatch(read('src/game.js'),/กานต์ต้องมีบารมี|บารมีกานต์ −/,'Kan morale is always "กำลังใจ"');
});

test('P2 camera: a correct press closes in on the spirit with a fright beat; a wrong press never moves the camera',()=>{
 const ui=read('src/ui.js'),start=ui.indexOf("dlg.querySelectorAll('[data-line]')"),block=ui.slice(start,ui.indexOf('// M2: a repaint replaces the stage',start));
 const wrong=block.slice(block.indexOf('if (!hit)'),block.indexOf('// P2: a correct press'));
 assert.match(wrong,/paint\(\); refresh\(\); return;/);assert.doesNotMatch(wrong,/camera\./);
 assert.match(block,/const hit = s\.lines\[\+el\.dataset\.line\]\?\.kind !== 'solid'/);assert.match(block,/camera\.cue\('interrogate-reveal', \{ targets:'suspect' \}\)/);assert.match(block,/is-frightened/);assert.match(block,/camera\.cue\('idle'\)/);
 assert.doesNotMatch(block,/interrogate-ask/);assert.match(ui,/bindKanClue\(dlg,g,s,clue=>\{[^}]*\}\);/);
 assert.doesNotMatch(/bindKanClue\(dlg,g,s,clue=>\{[^}]*\}\);/.exec(ui)[0],/camera\./,'Kan\'s reveal is not a fright beat');
 const css=read('src/interrogation-ui.css');
 assert.match(css,/is-fear-zoom \.cam-stage-box \.fig\.you\{opacity:0\}/,'Yama steps out of frame instead of being cut in half');
 for(const f of ['sweat-drops','gloom-lines','shock-burst','tremble-marks']){assert.ok(existsSync(new URL(`../img/fx/fx-soul-${f}.webp`,import.meta.url)),f);assert.ok(css.includes(`fx-soul-${f}.webp`),f);}
 assert.match(css,/prefers-reduced-motion/);
});

test('P2 lesson: three pages, shown once per save after the first-warrant lesson',()=>{
 assert.equal(firstInterrogationLesson.length,3);assert.deepEqual(firstInterrogationLesson.map(p=>p.next),['ถัดไป','ถัดไป','เข้าใจแล้ว']);
 const ui=read('src/ui.js');
 assert.match(ui,/!g\.taught\.includes\('trial-calculation'\)[\s\S]{0,400}!g\.taught\.includes\('interrogation-traits'\) \? traitLessonHtml\(traitLessonPage\)/);
 assert.match(ui,/g\.taught\.push\('interrogation-traits'\)/);assert.match(ui,/aria-label="หน้า \$\{page \+ 1\} จาก \$\{n\}"/);
 const g=game();assert.ok(!g.taught.includes('interrogation-traits'));g.taught.push('interrogation-traits');assert.ok(reload(g).taught.includes('interrogation-traits'),'saved with the game');
});

test('P2 handbook: trait page + keeper-team page exist, carry five keeper profile slots, and match the code',()=>{
 assert.ok(sentencingChapters.includes(soulTraitGuide));assert.ok(sentencingChapters.includes(keeperTeamGuide));
 assert.ok(sentencingChapters.indexOf(soulTraitGuide)>sentencingChapters.findIndex(c=>c.includes('3. เลือกยมทูตคนไหน')));
 for(const k of ['taan','boon','plerng','dam','kan'])assert.ok(keeperTeamGuide.includes(`data-profile-slot="${k}"`),k);
 for(const k of ['taan','boon','plerng','dam','kan'])assert.ok(existsSync(new URL(`../img/crew-${k}-profile.png`,import.meta.url)),k);
 assert.match(keeperTeamGuide,/สถานีเดียวกัน/);assert.match(soulTraitGuide,/สถานีเดียวกัน/);
 const chapter3=sentencingChapters.find(c=>c.includes('3. เลือกยมทูตคนไหน'));assert.doesNotMatch(chapter3,/มีโอกาสเพิ่มกรรมของเราเอง/);
 assert.match(keeperTeamGuide,/ไม่มีการสุ่มบวกโทษหรือกรรม/);assert.doesNotMatch(read('src/game.js'),/Math\.random\(\)[^\n]*karma|karma[^\n]*Math\.random\(\)/,'no random karma mechanism exists');
 assert.doesNotMatch(soulTraitGuide+keeperTeamGuide,/\bMP\b|บารมี/);
 assert.match(soulTraitGuide,/ขัดขืนไม่ยอมเดินเอง/);assert.doesNotMatch(soulTraitGuide,/ชื่อจะเป็นสีม่วง สีม่วงหมายถึง/);
});

test('P2 case 15: the false-charity merit and its boast claim replace the old chanting merit; Kan can expose it',()=>{
 const c=CASES.find(x=>x.k==='novice');
 assert.equal(c.merits.length,2);const fake=c.merits.find(m=>m.fake);assert.equal(fake.t,'ส่งเงินช่วยบ้านพักคนชราแห่งหนึ่งทุกเดือนโดยไม่ออกนาม');assert.equal(fake.v,1);
 assert.equal(c.claims.length,5);assert.deepEqual(c.claims.map(l=>l.kind),['deny','boast','solid','solid','solid']);
 const boast=c.claims.find(l=>l.kind==='boast');assert.equal(boast.merit,fake.t);assert.ok(c.merits.some(m=>m.t===boast.merit));
 assert.doesNotMatch(read('src/cases.js'),/ทำวัตรเช้า-เย็น/);
 const g=game();g.zone='th';g.casesDone=1;g.spawns=3;g.usedCases=ALL_CASES.map(x=>x.k).filter(k=>k!=='novice');
 const s=g.nextNamedCase([]);g.queue=[s];s.courtDisembarked=true;
 assert.equal(s.lines.length,5);const issues=[];while(hiddenIssues(s).length){issues.push(revealOneIssue(s).text);}
 assert.ok(issues.some(t=>t.includes('ส่งเงินช่วยบ้านพักคนชรา')&&t.includes('เป็นเรื่องแต่งขึ้น')));assert.ok(s.merits.find(m=>m.fake).exposed);
 const s2=(()=>{const h=game();h.zone='th';h.casesDone=1;h.spawns=3;h.usedCases=ALL_CASES.map(x=>x.k).filter(k=>k!=='novice');const x=h.nextNamedCase([]);h.queue=[x];x.courtDisembarked=true;h.cancelCourtArrival?.(x.id);return [h,x];})();
 const [h,x]=s2,idx=x.lines.findIndex(l=>l.kind==='boast');const out=h.press(x,idx);
 assert.ok(out?.some(l=>l.kind==='truth'||l.kind==='confess'),'pressing the boast reveals');assert.ok(x.merits.find(m=>m.fake).exposed);
});
