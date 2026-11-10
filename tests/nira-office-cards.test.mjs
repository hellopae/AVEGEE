import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {workersPanelHtml,workerSuppliesHtml,bindWorkersPanel} from '../src/worker-ui.js';
import {teamReportsHtml} from '../src/interrogation-ui.js';
globalThis.Image??=class {};
function game(){const g=createGame();g.save=()=>{};g.onChange=()=>{};g.coin=1000;g.food=0;g.inventory.food=2;return g;}
function controls(g){const handlers={};let changes=0;bindWorkersPanel({querySelector:s=>({addEventListener:(_,f)=>handlers[s]=f}),querySelectorAll:()=>[]},g,()=>changes++);return {click:s=>handlers[s](),changes:()=>changes};}
test('office hires after frontier victory and has no food purchase/distribution bindings',()=>{
 const g=game(),b=controls(g);b.click('[data-hire-worker]');assert.equal(g.workers().length,0);assert.equal(g.coin,1000);
 (g.zoneEvents.th||={}).frontierBreach='cleared';b.click('[data-hire-worker]');assert.equal(g.workers().length,1);assert.equal(g.coin,820);assert.equal(b.changes(),1);
 assert.equal(g.food,0);assert.equal(g.inventory.food,2);
});
test('hire availability follows funds and unlock; all office views omit food actions',()=>{
 const g=game();g.coin=0;const html=workersPanelHtml(g);assert.match(html,/data-hire-worker[^>]*disabled/);assert.match(html,/ชนะปีศาจที่บุกจากชายแดนก่อน/);
 for(const panel of [html,workerSuppliesHtml(g),workersPanelHtml(g,{allowHire:false})])assert.doesNotMatch(panel,/data-worker-buy-food|data-worker-share-food|data-feed-worker/);
 assert.doesNotMatch(workerSuppliesHtml(g),/data-hire-worker/);assert.doesNotMatch(workersPanelHtml(g,{allowHire:false}),/data-hire-worker/);
});
test('office hides accounting details without clearing the ledger or the report in other views',()=>{
 const g=game();g.workerState.ledger.income=987;g.workerState.ledger.escortsDone=23;g.teamReports=[{id:1,zone:'th',keeperName:'ทัณฑ์',soulName:'งานเสร็จ',summary:'คุมครบ',benefits:[],seen:false}];
 const before=JSON.stringify([g.workerState.ledger,g.teamReports]);assert.doesNotMatch(workersPanelHtml(g),/รายได้จากวัสดุ|ส่งวิญญาณ 23/);assert.match(teamReportsHtml(g),/งานเสร็จ/);assert.equal(JSON.stringify([g.workerState.ledger,g.teamReports]),before);
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),start=ui.indexOf('function openNiraOffice()'),office=ui.slice(start,ui.indexOf('\nfunction ',start+1));assert.doesNotMatch(office,/\$\{teamReportsHtml\(g\)\}/);assert.match(ui,/box.innerHTML = teamReportsHtml\(g\)/);
});
