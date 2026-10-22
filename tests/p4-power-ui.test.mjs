import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {powerBadgeHtml,powerSheetHtml,POWER_KEYS} from '../src/crew-power-ui.js';
import {CREW_POWER,BATTLE,GUARD} from '../src/data.js';
import {crewAbility} from '../src/command-wheel.js';

const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};g.coin=99999;return g;};
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');

test('badge: one per fighter, role=button with data-power, keyboard reachable, image comes from CREW_POWER only',()=>{
  assert.deepEqual([...POWER_KEYS].sort(),['boon','dam','guard','kan','nira','plerng','taan']);
  for(const k of POWER_KEYS){
    const html=powerBadgeHtml(k);
    assert.match(html,new RegExp(`data-power="${k}"`));assert.match(html,/role="button" tabindex="0"/);
    assert.ok(html.includes(CREW_POWER[k].icon),k);
    assert.equal(/job-badge/.test(html),!!CREW_POWER[k].jobIcon,'job badge only for keepers');
  }
  assert.doesNotMatch(powerBadgeHtml('taan',{job:false}),/job-badge/);
  assert.equal(powerBadgeHtml('nope'),'');
});

test('badges are wired into the five places (office cards, hero profile crew, crew tab, frontier card, side panel)',()=>{
  const n=(ui.match(/powerBadgeHtml\(/g)||[]).length;
  assert.ok(n>=9,`found ${n} badge call sites`);
  assert.match(ui,/document\.addEventListener\('click', e => \{\s*const b = e\.target\.closest\?\.\('\[data-power\]'\)/);
});

test('sheet: numbers come from the same functions as the office card; hire / team buttons follow state',()=>{
  const g=game();
  let html=powerSheetHtml(g,'kan');
  assert.ok(html.includes(crewAbility('kan',g.zone)));assert.ok(html.includes(`${BATTLE.crewCd}`));assert.ok(html.includes(`${BATTLE.crewMorale}`));
  assert.match(html,/data-power-hire="kan"/);assert.doesNotMatch(html,/data-power-party/);
  g.hire('kan');html=powerSheetHtml(g,'kan');
  assert.doesNotMatch(html,/data-power-hire/);assert.match(html,/data-power-party="kan"/);
  assert.match(html,/job-reveal\.webp/);
  html=powerSheetHtml(g,'guard');
  assert.ok(html.includes(`${GUARD.battleCd}`));assert.match(html,/data-power-hire="guard"/);assert.doesNotMatch(html,/job-/);
  html=powerSheetHtml(g,'nira');assert.doesNotMatch(html,/data-power-hire|data-power-party/,'nira is staff, not hirable or teamable');
  g.coin=0;assert.match(powerSheetHtml(g,'boon'),/data-power-hire="boon"[^>]*disabled/);
});
