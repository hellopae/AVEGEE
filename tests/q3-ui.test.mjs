// Q3 UI round — ultimate move placement, canteen form, map worker height, team HUD rows, vampire spelling.
// Layout itself was verified in a real browser (output/coordination/2026-10-31-q3/); these pin the contracts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mapActorHeight,mapWorkerHeight,WORKER_MAP_FILL,CHARACTER_SCALE} from '../src/character-scale.js';
import {teamHudHtml,teamHudRows} from '../src/team-hud.js';

const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const data=readFileSync(new URL('../src/data.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/team-hud.css',import.meta.url),'utf8');

test('Q3 ultimate sits last in the power list, no ready caption, no native tooltip', () => {
  const at=ui.indexOf("const powerChoices = battleChoice('fire'"),list=ui.slice(at,ui.indexOf('const currentTurn',at));
  assert.ok(list.trim().endsWith('+ teamJudgmentChoice;'),'teamJudgment is appended after hypno');
  assert.ok(list.indexOf("itemChoice('hypno'")<list.indexOf('teamJudgmentChoice'));
  assert.doesNotMatch(ui,/ประสานพิพากษา · พร้อม/);
  assert.match(ui,/skill\?\.chipParts \? `aria-label=/,'combat skills use aria-label instead of title');
});

test('Q3 canteen form lives in the card, not in the full-stage #st-actions layer', () => {
  const i=ui.indexOf("if(k==='canteen'){\n      // Q3"),j=ui.indexOf('if(Rg)Rg.hidden=true;return;',i);
  const block=ui.slice(i,j);
  assert.match(block,/canteen-panel/);
  assert.match(block,/put\(L,/);
  assert.doesNotMatch(block,/put\(A, `<div class="st-pane">/);
  assert.match(block,/keepCook/,'chosen cook/count survive a redraw');
});

test('Q3 map workers are as tall as Yama; the crew-hierarchy scale is untouched', () => {
  const yama=mapActorHeight('yama');
  assert.ok(Math.abs(mapWorkerHeight()*WORKER_MAP_FILL-yama)<1e-9);
  assert.ok(mapWorkerHeight()<mapActorHeight('worker'),'smaller than the old 82px worker');
  assert.equal(CHARACTER_SCALE.worker,1);
});

test('Q3 team HUD: one row of workers, one row of yamatoot + guard, every member rendered', () => {
  const member=(id,name)=>({id,name,morale:100,hunger:100,homeZone:'th'});
  const g={food:5,stations:[],workers:()=>[1,2,3,4,5,6].map(n=>member('w'+n,'w'+n)),
    crew:['a','b','c','d','e'].map(k=>({...member(k,k),k,self:false})).concat([{...member('me','me'),k:'you',self:true}]),
    guard:{id:'guard',name:'guard',morale:100,hunger:100}};
  const [workers,crew]=teamHudRows(g);
  assert.equal(workers.length,6);assert.ok(workers.every(m=>m.worker));
  assert.equal(crew.length,6,'5 crew + guard, Yama himself excluded');assert.ok(crew.every(m=>!m.worker));
  const html=teamHudHtml(g,()=>'/p.png');
  assert.equal((html.match(/class="team-hud-row"/g)||[]).length,2);
  assert.equal((html.match(/data-team-actor=/g)||[]).length,12);
  assert.match(html,/--cols:6;--cols-sm:6/);
  assert.match(css,/\.team-hud-roster\{[^}]*overflow:visible/,'the roster no longer clips or scrolls');
});

test('Q3 vampire is spelled with the thanthakhat in the frontier event copy', () => {
  assert.match(data,/th:'แวมไพร์ที่ชายแดน'/);
  assert.match(data,/เทวดามาปราบแวมไพร์ แต่/);
  assert.doesNotMatch(data,/แวมไพร(?![์])/);
});
