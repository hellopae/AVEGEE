import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {syncSceneZone,INTENSITY_NAME as INTENSITY} from '../src/data.js';
import {queueBossJustice,interrogateBoss,mirrorBoss,bossJusticeCase,bossJusticeAnswer,sentenceBoss,completeBossJusticeStory} from '../src/boss-justice.js';
import {FINAL_BOUND_SPRITE,finalCourtModel,finalCourtMarkup} from '../src/boss-court-view.js';
import {assertModuleRelease,assertStylesheetRelease} from './helpers/release-imports.mjs';
const setup=()=>{const g=createGame();g.zone='cyberhell';syncSceneZone(g.zone);g.save=()=>true;g.onChange=()=>{};
  g.finalEventState().phase='justice';queueBossJustice(g,{kind:'zoneEvent',zone:g.zone,who:'อาร์คอน-ศูนย์',sp:'zone-boss',over:'win'},{final:true});completeBossJusticeStory(g,'ending-capture');interrogateBoss(g);return g;};
const assets={background:'court.webp',hero:'yama.webp',portrait:'portrait.webp',station:k=>`${k}.webp`,crew:k=>`${k}.webp`};
const html=g=>finalCourtMarkup(g,{assets});

test('final docket renders the normal illustrated interrogation arena with bound sprite and four command panels',()=>{
  const g=setup(),state=()=>({docket:bossJusticeCase(g),powers:g.powers,inventory:g.inventory,coin:g.coin,queue:g.queue}),before=structuredClone(state()),s=finalCourtMarkup(g,{assets,prompt:true});
  assert.match(s,/hud trial-hud trial-comment8 final-boss-court/);assert.match(s,/class="cam-world"/);
  assert.match(s,/class="fig foe bound-boss"/);assert.ok(s.includes(FINAL_BOUND_SPRITE));
  assert.match(s,/role="dialog" aria-modal="true" aria-label="เลือกพลังกระจกวิเศษ"/);
  for(const panel of ['power','where','keeper','force'])assert.ok(s.includes(`data-court-panel="${panel}"`));
  assert.doesNotMatch(s,/<select\b/);assert.doesNotMatch(s,/final-bound-v1/);
  assert.deepEqual(state(),before,'rendering does not consume powers or issue a sentence');
});
test('mandatory mirror reveals selectable answers without auto-selecting or spending the ordinary inventory',()=>{
  const g=setup(),c=bossJusticeCase(g),before=structuredClone(g.inventory);
  Object.assign(c.pick,bossJusticeAnswer(g));assert.equal(finalCourtModel(g).ready,false,'even correct choices cannot bypass the mirror');
  c.pick={station:null,crew:null,intensity:null};assert.doesNotMatch(html(g),/data-justice-answer/);
  assert.ok(mirrorBoss(g));const s=html(g);assert.match(s,/data-justice-answer/);
  for(const kind of ['station','crew','intensity'])assert.match(s,new RegExp(`is-revealed[^>]+data-justice-choice="${kind}"`));
  assert.deepEqual(c.pick,{station:null,crew:null,intensity:null});assert.deepEqual(g.inventory,before);
  assert.equal(finalCourtModel(g).ready,false);Object.assign(c.pick,bossJusticeAnswer(g));assert.equal(finalCourtModel(g).ready,true);
  c.pick.intensity=4;assert.equal(finalCourtModel(g).ready,false);assert.equal(sentenceBoss(g,c.pick),false);
  c.pick.intensity=5;assert.ok(html(g).includes(INTENSITY[5]));assert.ok(sentenceBoss(g,c.pick));assert.equal(finalCourtModel(g).ready,false,'an issued warrant cannot be repeated');
});
test('saved partially selected final court resumes its revealed answers without queue or coin changes',()=>{
  const g=setup();mirrorBoss(g);bossJusticeCase(g).pick.station=bossJusticeAnswer(g).station;
  const snapshot=JSON.parse(JSON.stringify(g.snapshot())),h=createGame();assert.ok(h.restore(snapshot));
  assert.equal(h.coin,g.coin);assert.equal(h.queue.length,g.queue.length);assert.equal(finalCourtModel(h).ready,false);
  assert.equal(bossJusticeCase(h).mirror,true);assert.match(html(h),/data-justice-answer/);
  Object.assign(bossJusticeCase(h).pick,bossJusticeAnswer(h));assert.equal(finalCourtModel(h).ready,true);
});
test('docket names are escaped and the final UI does not mount for ordinary court cases',()=>{
  const g=setup();bossJusticeCase(g).name='<img src=x onerror=alert(1)>';assert.doesNotMatch(html(g),/<img src=x/);assert.match(html(g),/&lt;img src=x/);
  bossJusticeCase(g).final=false;assert.equal(finalCourtModel(g),null);assert.equal(html(g),'');
});
test('bound boss asset is shipped and all entry aliases resolve the new court and shared trial styles',()=>{
  assert.ok(existsSync(new URL('../'+FINAL_BOUND_SPRITE,import.meta.url)));
  const catalog=readFileSync(new URL('../img/preload-catalog.json',import.meta.url),'utf8');assert.ok(catalog.includes(FINAL_BOUND_SPRITE));
  assertModuleRelease('src/boss-court-view.js',undefined,'src/ui.js');
  assertModuleRelease('src/ui.js',undefined,null,{entry:true});assertModuleRelease('src/preload.js',undefined,null,{entry:true});
  assertStylesheetRelease('src/trial-comment8.css');
});
