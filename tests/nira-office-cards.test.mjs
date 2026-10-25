import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {workersPanelHtml,workerSuppliesHtml,bindWorkersPanel} from '../src/worker-ui.js';
import {teamReportsHtml} from '../src/interrogation-ui.js';
globalThis.Image??=class {};
function game(){const g=createGame();g.save=()=>{};g.onChange=()=>{};g.coin=1000;g.food=0;g.inventory.food=2;return g;}
function controls(g){const handlers={};let changes=0;bindWorkersPanel({querySelector:s=>({addEventListener:(_,f)=>handlers[s]=f}),querySelectorAll:()=>[]},g,()=>changes++);return {click:s=>handlers[s](),changes:()=>changes};}
test('office service bindings pay the actual supply and inventory cost once and preserve hire unlock',()=>{
 const g=game(),b=controls(g);b.click('[data-hire-worker]');assert.equal(g.workers().length,0);assert.equal(g.coin,1000);
 b.click('[data-worker-buy-food]');assert.equal(g.coin,990);assert.equal(g.food,10);
 b.click('[data-worker-share-food]');assert.equal(g.inventory.food,1);assert.equal(g.food,22);
 (g.zoneEvents.th||={}).frontierBreach='cleared';b.click('[data-hire-worker]');assert.equal(g.workers().length,1);assert.equal(g.coin,810);assert.equal(b.changes(),3);
 g.coin=0;g.inventory.food=0;b.click('[data-worker-buy-food]');b.click('[data-worker-share-food]');b.click('[data-hire-worker]');assert.equal(g.food,22);assert.equal(g.workers().length,1);assert.equal(b.changes(),3);
});
test('service availability follows funds, inventory and office-only hiring',()=>{
 const g=game();g.coin=0;g.inventory.food=0;const html=workersPanelHtml(g);
 for(const key of ['worker-buy-food','worker-share-food','hire-worker'])assert.match(html,new RegExp('data-'+key+'[^>]*disabled'));
 assert.match(html,/ชนะปีศาจที่บุกจากชายแดนก่อน/);assert.doesNotMatch(workerSuppliesHtml(g),/data-hire-worker/);assert.doesNotMatch(workersPanelHtml(g,{allowHire:false}),/data-hire-worker/);
});
test('office hides accounting details without clearing the ledger or the report in other views',()=>{
 const g=game();g.workerState.ledger.income=987;g.workerState.ledger.escortsDone=23;g.teamReports=[{id:1,zone:'th',keeperName:'ทัณฑ์',soulName:'งานเสร็จ',summary:'คุมครบ',benefits:[],seen:false}];
 const before=JSON.stringify([g.workerState.ledger,g.teamReports]);assert.doesNotMatch(workersPanelHtml(g),/รายได้จากวัสดุ|ส่งวิญญาณ 23/);assert.match(teamReportsHtml(g),/งานเสร็จ/);assert.equal(JSON.stringify([g.workerState.ledger,g.teamReports]),before);
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8'),start=ui.indexOf('function openNiraOffice()'),office=ui.slice(start,ui.indexOf('\nfunction ',start+1));assert.doesNotMatch(office,/\$\{teamReportsHtml\(g\)\}/);assert.match(ui,/box.innerHTML = teamReportsHtml\(g\)/);
});
