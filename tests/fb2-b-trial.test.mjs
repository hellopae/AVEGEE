import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {keeperBlockLabel,keeperCaseGuideHtml} from '../src/interrogation-ui.js';
import {PLERNG_WARRANT_FOOD} from '../src/interrogation.js';
import {teamStatus} from '../src/team-hud.js';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('FB2-v3: a keeper the team page calls idle but the warrant picker greys out says WHY (no bare "ไม่ว่าง")',()=>{
  const game={stations:[]},plerng={k:'plerng',name:'เพลิง',morale:100};
  assert.equal(keeperBlockLabel(game,plerng,{role:{available:false,why:'เสบียงไม่พอ · เพลิงใช้เพิ่ม 2 หน่วยต่อหมาย'}}),'เสบียงไม่พอ');
  assert.equal(keeperBlockLabel(game,{k:'boon',name:'บุญ',morale:100},{stationKeeper:{k:'taan',name:'ทัณฑ์'}}),'สถานีนี้ต้องใช้ ทัณฑ์');
  assert.equal(keeperBlockLabel({stations:[{def:{k:'krata',name:'กระทะ'}}]},{k:'taan',name:'ทัณฑ์',morale:100,at:'krata'},{}),'ประจำ กระทะ');
  assert.notEqual(keeperBlockLabel(game,plerng,{why:'บางเหตุผล'}),'ว่าง · รอรับเวร','never shows "idle" for a blocked keeper');
});
test('FB2-v3: team page and warrant picker share the same food rule for Plerng',()=>{
  const plerng={k:'plerng',name:'เพลิง',morale:100,hunger:100,id:'th:plerng'};
  assert.equal(PLERNG_WARRANT_FOOD,2);
  assert.equal(teamStatus({stations:[],food:0},plerng,false).duty,'ว่าง · รอเสบียง');
  assert.equal(teamStatus({stations:[],food:1},plerng,false).duty,'ว่าง · รอเสบียง');
  assert.equal(teamStatus({stations:[],food:2},plerng,false).duty,'ว่าง');
  assert.equal(teamStatus({stations:[],food:0},{k:'boon',name:'บุญ',morale:100,hunger:100},false).duty,'ว่าง','only Plerng has the food rule');
  assert.match(read('src/game.js'),/c\?\.k==='plerng'&&this\.food<PLERNG_WARRANT_FOOD/);
});
test('FB2-10/15: locked powers and the locked clock are not shown at all; keeper guide cards carry a portrait',()=>{
  const ui=read('src/ui.js');
  assert.match(ui,/powerDefs\.filter\(p => !g\.powerLocked\(p\)\)\.map/);
  assert.match(ui,/const clockUnlocked = \(\) => !!\(g\.abilities\?\.cooldownClock \|\| g\.inventory\?\.cooldownClock\)/);
  assert.equal((ui.match(/clockUnlocked\(\) \?/g)||[]).length,2,'both guide places gate the clock card');
  assert.doesNotMatch(ui,/<li>\$\{clockGuide\}<\/li>\n/,'no ungated clock card');
  const html=keeperCaseGuideHtml({keeperTrialInfo:()=>({benefit:'b',cost:'c'})},{},'krata',[{k:'taan',name:'ทัณฑ์',raeng:8,rabiab:5,panya:4,metta:2}],c=>`img/crew-${c.k}-profile.webp`);
  assert.match(html,/keeper-guide-portrait" src="img\/crew-taan-profile\.webp"/);
  assert.match(html,/keeper-guide-grid/);
});
test('FB2-8: a failed head cutscene retries once, then shows the throne sprite at its own ratio (never stretched into the frame)',()=>{
  const ui=read('src/ui.js'),idx=read('index.html');
  assert.match(ui,/retry=\$\{Date\.now\(\)\}/);
  assert.match(ui,/classList\.add\('is-fallback'\)/);
  assert.match(idx,/\.verdict-scene \.intro-comic-frame\.is-fallback>img\{[^}]*object-fit:contain!important/);
  assert.doesNotMatch(ui,/onerror="this\.onerror=null;this\.src='\$\{artUrl\('hero-boss'\)\}'">\s*\n\s*<div class="intro-comic-head"><span>\$\{esc\(sc\.title\)\}/);
});
