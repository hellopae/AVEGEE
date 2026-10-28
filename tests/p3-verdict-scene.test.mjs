import { assertVersionedImports } from './helpers/versioned-imports.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {VERDICT_LINES,DAD,starsOf,ZONES} from '../src/data.js';
import {buildVerdictScene,verdictSceneImage,VERDICT_ART} from '../src/verdict-scene.js';

// P3 — the zone head praises five stars and rebukes every red verdict (score < 50, the same rule that counts DAD.redsToCome).
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.has=()=>true;return g;};
const verdict=(g,score,over={})=>{
  const soul=g.queue[0]||{id:1,who:'แม่ค้าตลาดนัด',said:[]};
  g.pendingVerdictScene=null;g.pendingWarn=null;
  g.applyVerdict({score,stars:starsOf(score),tham:50,ked:50,karma:0,right:true,...over},soul,'กระทะทองแดง');
  return g.pendingVerdictScene;
};

test('five stars keep special praise; ordinary grades now receive an A5 review',()=>{
  const g=game();
  assert.equal(verdict(g,95)?.kind,'praise');
  assert.equal(verdict(game(),90)?.kind,'praise','90 is the five-star line');
  assert.equal(verdict(game(),89).step,0,'four stars: ordinary head review');
  assert.equal(verdict(game(),60).step,0);
  assert.equal(verdict(game(),50).step,0,'50 has a review without red escalation');
});

test('rebuke exactly where DAD.redsToCome counts red (score < 50), not by star count',()=>{
  assert.equal(starsOf(45),2,'two stars still counts as red');
  assert.equal(verdict(game(),49)?.kind,'blame');
  assert.equal(verdict(game(),45)?.kind,'blame');
  assert.equal(verdict(game(),10)?.kind,'blame');
  assert.equal(verdict(game(),50).step,0);
  const g=game();g.reds=0;verdict(g,45);assert.equal(g.reds,1,'the same verdict is the one counted red');
});

test('rebuke tier follows the red streak 1 -> 2 -> 3, and a green verdict resets it',()=>{
  const g=game();
  const tiers=[1,2,3].map(()=>verdict(g,30));
  assert.deepEqual(tiers.map(s=>s.step),[1,2,3]);
  assert.equal(tiers[0].title,VERDICT_LINES.th.title.blame[0]);
  assert.equal(tiers[1].title,VERDICT_LINES.th.title.blame[1]);
  assert.equal(tiers[2].title,VERDICT_LINES.th.title.blame[2]);
  tiers.forEach((s,i)=>assert.ok(!s.line.includes('{')&&s.line.startsWith('"'),`tier ${i+1} line is a filled quote`));
  assert.ok(g.dadFight,'third red still goes to the Yama fight');
  const h=game();verdict(h,30);verdict(h,30);verdict(h,90);
  assert.equal(h.reds,0);assert.equal(verdict(h,30).step,1,'streak restarted');
});

test('tier 1 drops the silent-look line that would contradict the rebuke; tiers 2 and 3 keep the original warning',()=>{
  const g=game();verdict(g,30);assert.equal(g.pendingWarn.text,'');assert.equal(g.pendingWarn.n,1);
  verdict(g,30);assert.equal(g.pendingWarn.text.length>0,true);assert.equal(g.pendingWarn.fireball,true,'fireball tier unchanged');
  verdict(g,30);assert.ok(g.pendingWarn.text.length>0);
  const ui=read('src/ui.js');assert.match(ui,/w\.text \? `\$\{w\.text\}\\n\\n` : ''/,'warning dialog tolerates the empty text');
});

test('rebuke scene shows the same stars the verdict got (30 points = 1 star, not 0)',()=>{
  assert.equal(verdict(game(),30).stars,1);assert.equal(verdict(game(),45).stars,2);assert.equal(verdict(game(),10).stars,0);
});

test('a middle verdict without a soul id still builds a review without throwing',()=>{
  const g=game();g.pendingVerdictScene=null;
  g.applyVerdict({score:60,stars:3,tham:60,ked:50,karma:0,right:true},{who:'x'},'y');
  assert.equal(g.pendingVerdictScene.step,0);assert.equal(g.pendingVerdictScene.score,60);
});

test('praise reports the reward the game already granted and changes no numbers',()=>{
  const g=game();g.karma=40;g.hp=g.hpMax-20;const coin=g.coin,star5=g.star5,karma=g.karma;
  const sc=verdict(g,95);
  assert.equal(g.coin,coin+60,'same 60 coins as before P3');assert.equal(g.star5,star5+1);
  assert.match(sc.reward,/^ได้รับ .*เบี้ยกรรม \+60/);
  assert.ok(g.karma<karma,'five-star karma relief unchanged');
  const high=game();high.karma=100;high.hp=high.hpMax-20;
  const s2=verdict(high,95);assert.doesNotMatch(s2.reward,/บารมี \+/,'no heal claimed when karma is too high to be healed');
});

test('reward line is hidden when there is no reward text',()=>{
  const s=buildVerdictScene({kind:'praise',zone:'th',who:'x',station:'y',reward:'',stars:5,score:95});
  assert.equal(s.reward,null);
});

test('save then load while the scene is pending: same scene, nothing granted again',()=>{
  const g=game();const sc=verdict(g,95);const coin=g.coin;
  const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
  assert.deepEqual(h.pendingVerdictScene,sc);assert.equal(h.coin,coin,'reloading grants nothing');
  assert.equal(h.star5,g.star5);
  const ui=read('src/ui.js'),i=ui.indexOf('function openVerdictScene'),body=ui.slice(i,ui.indexOf('function openDadPunish',i));
  assert.match(body,/g\.pendingVerdictScene = null; g\.save\(\)/,'consumed and saved when opened, so it cannot replay');
  assert.doesNotMatch(body,/g\.coin|g\.hp\b|g\.karma/,'the scene itself pays nothing');
  const blame=game();verdict(blame,20);const r=game();r.restore(JSON.parse(JSON.stringify(blame.snapshot())));
  assert.equal(r.pendingVerdictScene.kind,'blame');assert.equal(r.reds,blame.reds);
});

test('queued: scene opens before the red warning / Yama fight and never over another dialog; skippable',()=>{
  const ui=read('src/ui.js');
  const oc=ui.slice(ui.indexOf('g.onChange = () =>'));
  assert.ok(oc.indexOf('openVerdictScene()')>0&&oc.indexOf('openVerdictScene()')<oc.indexOf('openAuthorityWarning()'),'scene before warning');
  assert.match(oc,/g\.pendingVerdictScene && !g\.battle && !dlg\.open/);
  assert.match(ui,/g\.dadFight && !g\.pendingWarn && !g\.pendingVerdictScene/,'Yama fight waits for the scene');
  assert.match(ui,/data-verdict-scene-done/);
});

test('lines: variables are filled, never leak braces, and unmet variables fall back to a plain line',()=>{
  for(const zone of Object.keys(VERDICT_LINES)){
    for(const kind of ['praise','blame'])for(let step=1;step<=3;step++)for(const vars of [{},{who:'แม่ค้าตลาดนัด',station:'กระทะทองแดง',reward:'เบี้ยกรรม +60'}]){
      const s=buildVerdictScene({kind,zone,step,...vars,rng:()=>0.999});
      assert.ok(s.line.length>2,`${zone}/${kind}/${step} has a line`);
      assert.doesNotMatch(s.line,/[{}]/);assert.ok(s.title&&s.speaker);
    }
  }
  const noVars=buildVerdictScene({kind:'praise',zone:'th',rng:()=>0.2});
  assert.doesNotMatch(noVars.line,/{|}/);
  assert.equal(buildVerdictScene({kind:'blame',zone:'th',step:9}).step,3,'step is clamped');
  assert.equal(VERDICT_LINES.th.blame.length,DAD.redsToCome,'one blame pool per red tier');
});

test('art slots exist for every zone and kind (P9: all four zones have their own Codex praise/scold pair)',()=>{
  for(const z of Object.keys(ZONES)){
    for(const k of ['praise','blame']){const p=verdictSceneImage(z,k);assert.ok(p,`${z}/${k}`);assert.ok(existsSync(new URL('../'+p,import.meta.url)),p+' exists on disk');}
  }
  assert.equal(VERDICT_ART.th.praise,'img/head-th-praise-cutscene-v1.png');
  const m=JSON.stringify(JSON.parse(read('img/manifest.json')));
  assert.ok(m.includes('head-th-praise-cutscene-v1.png')&&m.includes('head-th-scold-cutscene-v1.png'));
});

test('star badge is anchored: the .score badge scales around its own anchor and quiet verdicts skip it',()=>{
  const css=read('src/town-map.css');
  assert.match(css,/\.town-view #ov > \.score\{transform-origin:0 0\}/);
  assert.match(read('src/ui.js'),/if \(fx && !fx\.quiet\)/);
  assert.match(read('src/ui.js'),/quiet: !!g\.pendingVerdictScene/);
});

test('small items: kan clue text says พลังเวท, not MP; cache-bust suffixes',()=>{
  const gs=read('src/game.js');
  assert.doesNotMatch(gs,/ต้องใช้ MP|`MP −/);
  const html=read('index.html');
  assertVersionedImports(html, ['ui.js']);
  assert.match(html, /town-map\.css\?v=[^"]+"/);
});
