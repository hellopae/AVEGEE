import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {CREW, GUARD, BATTLE, ZONES, TUTOR} from '../src/data.js';
import {COMBAT_SKILLS} from '../src/combat-skills.js';
import {recommendedHire, hireRank} from '../src/unlocks.js';
import {ABILITY_REWARDS} from '../src/story.js';
import {ENCOUNTER_BALANCE} from '../src/encounter-balance.js';
import {scaleEncounter} from '../src/party-balance.js';
import {assertModuleRelease,assertStylesheetRelease} from './helpers/release-imports.mjs';
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const noOp=()=>{};
function functionSource(name) {
  const start=ui.indexOf(`function ${name}(`),end=ui.indexOf('\n}\n',start)+2;
  assert.ok(start>=0&&end>start);return ui.slice(start,end);
}
test('BALANCE-2 new-game office buttons really remove and restore taan+nira without moving map actors',()=>{
  const g=createGame();g.save=()=>true;g.onChange=noOp;
  assert.deepEqual(g.party.members,['taan','nira']);assert.equal(g.partyCap(),3);
  const positions=g.crew.map(({id,x,y,follow})=>({id,x,y,follow}));
  let buttons=[];
  const dlg={open:true,html:'',set innerHTML(html){this.html=html;buttons=[...html.matchAll(/<button data-party="([^"]+)"([^>]*)>/g)].map(([,key,attrs])=>({dataset:{party:key},disabled:/disabled/.test(attrs)}));},get innerHTML(){return this.html;},
    querySelectorAll(selector){return selector==='[data-party]'?buttons:[];},querySelector(selector){return selector==='[data-quests]'?{}:null;}};
  const context=vm.createContext({g,dlg,CREW,GUARD,BATTLE,ZONES,dlgGen:1,afterPowerSheet:null,
    artUrl:()=>'',pauseForDlg:noOp,greetLine:()=>'',esc:String,crewArt:()=>'',powerBadgeHtml:()=>'',crewName:d=>d.name,
    recommendedHire,hireRank,t:()=>'',crewAbility:()=>'',niraItemWidget:()=>'',guardRestWidget:()=>'',
    workersPanelHtml:()=>'',bindWorkersPanel:noOp,bindHungerWidgets:noOp,refresh:noOp,sfx:noOp,openDlg:noOp,
    setInterval:()=>1,clearInterval:noOp});
  vm.runInContext(functionSource('openNiraOffice')+'\nopenNiraOffice();',context);
  for(const kind of ['taan','nira']) {
    const button=buttons.find(b=>b.dataset.party===kind);assert.ok(button);assert.equal(button.disabled,false);button.onclick();
    assert.equal(g.party.members.includes(kind),false);
    const add=buttons.find(b=>b.dataset.party===kind);assert.equal(add.disabled,false);add.onclick();
    assert.equal(g.party.members.includes(kind),true);
  }
  assert.deepEqual(g.crew.map(({id,x,y,follow})=>({id,x,y,follow})),positions);
  assert.equal(g.crewOf('nira').follow,true);assert.ok(!g.crewOf('taan').follow);
});
test('BALANCE-2 tutor keeps the exact approved sentence; intro and help disclose back-line support',()=>{
  assert.equal(TUTOR.find(t=>t.k==='read').text,'"ทางซ้ายมือเจ้าคือนิรา หน้าที่ของเธอคืออ่านสำนวนให้เจ้าฟัง และคอยช่วยอยู่ด้านหลังเวลาออกศึก เธอไม่ลงทัณฑ์ให้ใครทั้งนั้น ส่วนทัณฑ์ที่ยืนอยู่ตรงกระทะนั่นคือคนเดียวที่รับเวรได้ตอนนี้ — เจ้ามีคนสองคน จำไว้"');
  assert.match(functionSource('openIntro'),/นิราจะอ่านสำนวนให้ท่าน และแค่คอยช่วยอยู่ด้านหลัง/);
  assert.match(functionSource('openHelp'),/นิรา<\/b> จะอ่านสำนวนให้ท่าน และแค่คอยช่วยอยู่ด้านหลัง/);
});
test('BALANCE-2 every new move renders an unclipped-name row, ultimate chip short name and full tooltip/manual',()=>{
  const start=ui.indexOf('    const battleChoice = '),end=ui.indexOf('    const battleItem = ',start);
  const choice=vm.runInNewContext(ui.slice(start,end)+'\nbattleChoice;',{COMBAT_SKILLS,b:{},yamaSkillRemaining:()=>0,esc:String});
  for(const [key,def] of Object.entries(COMBAT_SKILLS)) {
    const html=choice(key,'img/icon.png',def.name,true,'ready');
    assert.match(html,/class="orb-choice combat-skill-choice"/);
    const text=html.match(/<b>(.*?)<\/b>/)[1].replace(/<[^>]+>/g,'');
    assert.equal(text,def.shortName||def.name);assert.equal(def.chipParts.join(''),text);
    assert.ok(html.includes('<wbr>'));
    assert.ok(html.includes(`title="${def.name} · ready"`));assert.doesNotMatch(html.match(/<b>(.*?)<\/b>/)[1],/…|\.\.\./);
  }
  assert.equal(COMBAT_SKILLS.teamJudgment.shortName,'ประสานพิพากษา');
  assert.equal(ABILITY_REWARDS.teamJudgment.name,COMBAT_SKILLS.teamJudgment.name);
  const css=readFileSync(new URL('../src/battle-turns.css',import.meta.url),'utf8');
  // Source contracts only: no browser/font layout is available in this sandbox.
  // The final, high-specificity rules override the earlier 1280px and <=700px rows.
  for(const selector of ['.orb-choice.combat-skill-choice{','.orb-choice.combat-skill-choice b{','.orb-choice.combat-skill-choice i{'])assert.ok(css.includes(selector));
  const overrides=css.slice(css.indexOf('/* BALANCE-2:'));
  assert.match(overrides,/height:auto!important/);assert.match(overrides,/grid-template-rows:auto auto/);
  assert.match(overrides,/b\{[^}]*white-space:normal;overflow:visible;text-overflow:clip;word-break:normal;overflow-wrap:normal/);
  assert.match(overrides,/i\{[^}]*grid-row:2;max-width:none;white-space:normal/);
});
test('BALANCE-2 enemy scaling freezes the initial party count and does not rescale an ongoing/restored wave',()=>{
  for(const [key,sizes] of Object.entries(ENCOUNTER_BALANCE))for(const [size,tuning] of Object.entries(sizes)) {
    assert.ok(tuning.hp>0&&tuning.atk>0,key);
    const [zone,...parts]=key.split(':'),kind=parts.join(':');
    const b={zone,kind:kind==='frontier'?'frontier':'zoneBoss',wave:1,foes:[{id:'boss',boss:true,hp:100,maxHp:100,atk:[10,20]}]};
    if(!['boss','frontier','breach'].includes(kind))b.encounter=kind;
    if(kind==='breach')b.kind='frontierBreach';
    scaleEncounter(b,Number(size));const copy=structuredClone(b);scaleEncounter(b,3);assert.deepEqual(b,copy);
    const restored=structuredClone(b);scaleEncounter(restored,7);assert.deepEqual(restored,copy);
  }
});
test('BALANCE-2 changed runtime modules share release identities; stylesheet is versioned',()=>{
  for(const file of ['data','ui','combat-skills','party-balance','encounter-balance'])assertModuleRelease(`src/${file}.js`);
  assertStylesheetRelease('src/battle-turns.css');
  assertModuleRelease('src/encounter-balance.js',undefined,'src/party-balance.js');
});

test('BALANCE-2 Western hypnosis uses the initial party size for its solo-Yama enemy group',()=>{
  const g=createGame();g.battle={zone:'west',kind:'zoneEvent',eventKey:'westVampireBreach',wave:3,
    balance:{wave:2,partySize:6},foes:[{id:'hypnotized',hp:91,maxHp:91,atk:[12,18],boss:false}]};
  g.battleActors=()=>[{id:'you'}];g.prepareEncounter();
  const tuning=ENCOUNTER_BALANCE['west:hypnosis'][6];
  assert.equal(g.battle.balance.partySize,6);assert.equal(g.battle.foes.length,1);
  assert.equal(g.battle.foes[0].hp,Math.round(91*tuning.hp));
  assert.deepEqual(g.battle.foes[0].atk,[12,18].map(v=>Math.max(1,Math.round(v*tuning.atk))));
});

test('BALANCE-2 evidence covers 200 paired trials per case and stays tied to the runtime under test',async()=>{
  const {createHash}=await import('node:crypto');
  const {scenarios,simulate,outDir}=await import('../scripts/sim-balance2.mjs');
  const before=JSON.parse(readFileSync(outDir+'before.json')),after=JSON.parse(readFileSync(outDir+'after.json'));
  const id=r=>`${r.zone}/${r.size}/${r.kind}/${r.encounter||''}/${r.moves}`;
  const expected=scenarios().flatMap(s=>[id({...s,moves:false}),id({...s,moves:true})]).sort();
  for(const report of [before,after]){
    assert.equal(report.count,200);assert.deepEqual(report.rows.map(id).sort(),expected);
    for(const r of report.rows)assert.equal(r.samples,200);
  }
  for(const r of after.rows){
    assert.ok(r.winRate>0&&r.winRate<100,id(r));assert.equal(r.timeouts,0,id(r));
    if(r.kind==='frontier'||r.encounter?.startsWith('minion:'))assert.ok(r.winRate>=70&&r.winRate<=90,id(r));
    else assert.ok(r.winBossRounds>=4&&r.winBossRounds<=7,id(r));
  }
  for(const [name,hash]of Object.entries(after.runtimeHashes))assert.equal(createHash('sha256').update(readFileSync(new URL(`../src/${name}.js`,import.meta.url))).digest('hex'),hash,name);
  // Re-run the original failing small-team scenario with production commands.
  const scenario={zone:'th',size:3,kind:'boss',moves:true};
  const fresh=Array.from({length:200},(_,i)=>simulate({...scenario,seed:30000+i}));
  const row=after.rows.find(r=>id(r)===id(scenario));
  assert.equal(fresh.filter(r=>r.result==='win').length,row.wins);
});
