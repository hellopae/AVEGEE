import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {keeperCurrentJob,keeperSuitText,keeperCaseGuideHtml} from '../src/interrogation-ui.js';
import {traitForKeeper} from '../src/interrogation.js';
import {SINS,STATIONS} from '../src/data.js';
const source=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const render=source.slice(source.indexOf('    const destinationChoices ='),source.indexOf('    const crewNow ='));
const actors=['kan','plerng','boon','taan','dam'].map(k=>({k,name:k,raeng:8,rabiab:6,panya:4,metta:2,morale:100}));
function choices(){
 const g={crew:actors,keeperTrialInfo:()=>({available:true,benefit:'ผลดีเฉพาะคดี',cost:'เสบียง 2 ห่อ'}),assignBlock:()=>null,stFree:()=>3,stations:[]};
 const dests=['krata','ngiw','tarang','sawan'].map(k=>({def:STATIONS.find(x=>x.k===k),slots:[]}));
 return vm.runInNewContext(render+'\n({crewChoices,destinationChoices});',{g,s:{id:1},dests,answer:null,pick:{cr:'kan'},available:actors.filter(c=>c.k!=='dam'),heaven:false,
  keeperCurrentJob,keeperSuitText,traitForKeeper,SINS,INTENSITY:{},t:x=>x,esc:x=>String(x??''),blockText:b=>b?.text||'',stBg:()=>'/station.webp',artUrl:()=>'/profile.webp',orbImg:(src,alt)=>`<img src="${src}" alt="${alt}">`});
}
test('keeper choices show complete profile sources, suitability and availability without stats or costs',()=>{
 const {crewChoices:html}=choices();
 for(const color of ['ม่วง','แดง','เขียว'])assert.match(html,new RegExp('วิญญาณสี'+color));
 assert.match(html,/ไม่ผูกกับสีวิญญาณ/);assert.match(html,/data-k="kan"[^>]*aria-pressed="true"/);
 assert.match(html,/data-k="dam"[^>]*disabled/);assert.match(html,/ไม่ว่าง/);
 assert.match(html,/<img src="\/profile.webp"/);assert.doesNotMatch(html,/แรง|ระเบียบ|ปัญญา|เมตตา|ภาระ|เสบียง|ผลดีเฉพาะคดี/);
});
test('destination karma names follow public station tags and are present even without a revealed answer',()=>{
 const html=choices().destinationChoices;
 assert.match(html,/ฉ้อโกง \/ มัวเมา/);assert.match(html,/ผิดกาม/);assert.match(html,/ไม่ใช้ลงทัณฑ์/);
 for(const k of ['krata','ngiw','tarang','sawan'])assert.match(html,new RegExp(`data-k="${k}"`));
 assert.doesNotMatch(html,/is-revealed/);
});
test('the handbook holds current keeper attributes, role benefit and cost with escaped text',()=>{
 const c={...actors[0],name:'<กาญ>'};const g={keeperTrialInfo:()=>({benefit:'ช่วย <คดี>',cost:'เสบียง 2 & เวลา'})};
 const before=JSON.stringify(c),html=keeperCaseGuideHtml(g,{},'krata',[c]);
 assert.match(html,/พลังและต้นทุนผู้คุม/);assert.match(html,/แรง 8 · ระเบียบ 6 · ปัญญา 4 · เมตตา 2/);assert.match(html,/เสบียง 2 &amp; เวลา/);assert.match(html,/&lt;กาญ&gt;/);assert.match(html,/ช่วย &lt;คดี&gt;/);assert.equal(JSON.stringify(c),before);
 assert.match(source,/keeperCaseGuideHtml\(g,s,pick.st,shownCrew\)/);assert.doesNotMatch(source,/choices:crewChoices\+`<details class="keeper-menu-info"/);
});
test('choosing a destination or keeper closes its flyout and keeps the next command reachable',()=>{
 const start=source.indexOf("dlg.querySelectorAll('[data-pickkey]')"),body=source.slice(source.indexOf('      pick[',start),source.indexOf('\n    });',start));
 for(const key of ['st','cr']){
  let paints=0;const state={pick:{st:null,cr:null},courtPanel:key==='st'?'where':'keeper',trialError:'old',el:{dataset:{pickkey:key,k:key==='st'?'krata':'kan'}},g:{stations:[{def:{k:'krata'},slots:[]}]},paint:()=>paints++};
  const result=vm.runInNewContext(body+'\n({pick,courtPanel,trialError});',state);
  assert.equal(result.courtPanel,null);assert.equal(result.trialError,'');assert.equal(result.pick[key],key==='st'?'krata':'kan');assert.equal(paints,1);
 }
});
