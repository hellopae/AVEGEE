import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripNeighbourLeaks} from '../src/nira-combat.js';
import {canvasScale} from '../src/yama-sword.js';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

// 2x1 cells of 8x8 px: cell 0 has a figure whose beam reaches its right edge, cell 1 starts with the beam's tip on its left edge
const sheet=(leak=true,tipRows=[3,4])=>{
  const W=16,H=8,d=new Uint8ClampedArray(W*H*4);
  const put=(x,y)=>{d[(y*W+x)*4+3]=255;};
  for(let y=2;y<6;y++)for(let x=11;x<15;x++)put(x,y);       // main figure of cell 1
  for(let y=2;y<6;y++)for(let x=1;x<4;x++)put(x,y);         // figure of cell 0
  for(const y of tipRows)put(7,y);                           // beam reaches cell 0 right edge
  if(leak)for(const y of tipRows)put(8,y);                   // tip leaks into cell 1 left edge
  return {d,W,H};
};
test('O2 I: a piece on a cell left edge that continues the previous cell right edge is erased',()=>{
  const {d,W,H}=sheet(true,[3,4]);
  const left=(y)=>d[(y*W+8)*4+3];
  assert.equal(left(3),255);
  const n=stripNeighbourLeaks(d,W,H,2,1);
  assert.equal(n,1);assert.equal(left(3),0);assert.equal(left(4),0);
  assert.equal(d[(3*W+7)*4+3],255,'the previous cell keeps its own pixels');
  assert.equal(d[(3*W+12)*4+3],255,'the main figure is untouched');
});
test('O2 I: pieces that do not continue the neighbour, and clean sheets, are left alone',()=>{
  const {d,W,H}=sheet(false);
  for(let y=0;y<H;y++)d[(y*W+7)*4+3]=0;                      // nothing reaches the seam
  d[(1*W+8)*4+3]=255;                                       // a left-edge speck, but the previous cell does not continue it
  d[(1*W+12)*4+3]=255;
  assert.equal(stripNeighbourLeaks(d,W,H,2,1),0);
  assert.equal(d[(1*W+8)*4+3],255);
});
test('O2 B: Nira attack/heal rows opt out of the ally mirror; on a v1 sheet idle/hurt rows keep it (drawn facing left) — P9: v2 sheets face right in every row',()=>{
  const s=read('src/nira-combat.js');
  assert.match(s,/classList\.toggle\('face-native', niraPoseFacesRight\(zone,pose\)\)/);
  assert.match(s,/niraSheetIsV2\(zone\) \|\| pose === 'attack' \|\| pose === 'heal'/);
  assert.doesNotMatch(s,/image\.classList\.remove\('face-native'\)/);
});
test('O2 B: Yama own slash / flame charge sets the formation attack key (forward lunge)',()=>{
  const s=read('src/ui.js');
  assert.match(s,/\['atk','flameCharge'\]\.includes\(fxNow\?\.action\) \? 'you' : null/);
});
test('O2 A/E: hurt poses wait for a covering cutscene card; Nira hurt row takes the same hold',()=>{
  const ui=read('src/ui.js'),cs=read('src/combat-sprites.js'),nira=read('src/nira-combat.js');
  assert.match(ui,/const hurtStart=\(\)=>hurtHold>0\?Date\.now\(\)\+hurtHold:phaseAt/);
  assert.match(ui,/mountNiraCombatSprite\(stage,g\.zone,b,phase,fitTeam,\(\)=>/);
  assert.match(cs,/a\.mode==='hurt'&&now<\(a\.startedAt\|\|0\)\)continue/);
  assert.match(nira,/holdUntil/);
});
test('O2 D: on a narrow stage the command column may sit under the squad at the left edge',()=>{
  const s=read('src/ui.js');
  assert.match(s,/const narrowStage=area\.width<=520/);
  assert.match(s,/if\(narrowStage&&!lefts\.includes\(8\)\)lefts\.push\(8\)/);
});
test('O2 J: cutscene card is a clean rectangle and the push-in never scales below 1',()=>{
  const html=read('index.html');
  const rule=html.match(/\.action-cutscene\{[^}]*\}/)[0];
  assert.doesNotMatch(rule,/clip-path/);
  const anims=html.match(/@keyframes actionRush\{[\s\S]*?(?=@keyframes speedLines)/)[0];
  for(const [,n] of anims.matchAll(/scale\(([.\d]+)\)/g))assert.ok(Number(n)>=1&&Number(n)<=1.04);
  assert.doesNotMatch(anims,/translateX/);
  assert.match(read('src/battle-scale.js'),/planCutsceneCover\(dims, nat, box\) \|\| planCutscene\(dims, nat, box\)/);
});
test('O2 K: Yama overlay canvases use a device-resolution backing store',()=>{
  assert.equal(canvasScale(),1);
  globalThis.devicePixelRatio=2;assert.equal(canvasScale(),2);
  globalThis.devicePixelRatio=5;assert.equal(canvasScale(),3);
  delete globalThis.devicePixelRatio;
  const s=read('src/yama-sword.js');
  assert.equal((s.match(/canvasScale\(\)/g)||[]).length,2);
  assert.equal((s.match(/imageSmoothingQuality = 'high'|imageSmoothingQuality='high'/g)||[]).length,2);
});
test('O2: touched modules carry the -o2 cache-bust suffix',()=>{
  const h=read('index.html');
  for(const f of ['ui.js','nira-combat.js','combat-sprites.js','yama-sword.js','battle-scale.js'])assert.match(h,new RegExp(`src/${f.replace('.','\\.')}\\?v=[^"]*-o2(?:-p9)?"`));
});
