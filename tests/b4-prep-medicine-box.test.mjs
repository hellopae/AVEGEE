// Both preparation surfaces retain every consumable tier in the I2-C icon layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createGame } from '../src/game.js';
import { ITEMS } from '../src/data.js';
import { medicineResult } from '../src/progression.js';

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const helpers = ui.slice(ui.indexOf('function prepItemKeys()'), ui.indexOf('/** กล่องบน:'));
function fixture(g, context) {
  let repaints = 0;
  const buttons = Object.fromEntries(['tea','health','holyWater','healthLarge'].map(k => [k, {dataset:{prepUse:k}}]));
  const fill = {addEventListener:(_, fn) => { fill.click = fn; }};
  const root = {querySelectorAll:() => Object.values(buttons), querySelector:() => fill};
  const scope = vm.createContext({g, ITEMS, medicineResult, esc:String,
    itemName:k => k, itemText:k => k, itemImg:k => `<img src="${ITEMS[k].img}.png">`,
    t:() => 'เติมบารมีให้เต็ม ก่อนเข้าไปต่อสู้', sfx:() => {}});
  vm.runInContext(helpers, scope);
  scope.bindPrepItems(root, context, () => { repaints++; });
  return {scope, buttons, fill, repaints:() => repaints};
}

test('I2-C: both surfaces share icon markup; empty base items and owned higher tiers remain visible', () => {
  const g = createGame(); g.inventory = {healthLarge:2}; g.hp = 1;
  const {scope} = fixture(g, 'bag');
  const html = scope.prepItemsHtml('bag');
  for (const k of ['tea','health','holyWater','healthLarge']) assert.match(html, new RegExp(`data-prep-use="${k}"`));
  assert.match(html, /data-prep-use="health" disabled/);
  assert.match(html, /data-prep-use="healthLarge"\s+aria-label="healthLarge x 2"/);
  assert.match(html, /prep-item-count">x 2/);
  assert.doesNotMatch(html, /event-prep-speech|<b>|prep-chips/);
  assert.match(ui, /prepItemsHtml\('bag'\)/); assert.match(ui, /prepItemsHtml\('prep'\)/);
});

for (const context of ['bag','prep']) test(`I2-C: ${context} clicks consume once, fill caps HP using existing item rates, and exhausted/full actions do nothing`, () => {
  const g = createGame();
  if (context === 'prep') {
    g.zone = 'asia'; g.zoneCases.asia = 10;
    g.zoneEvents.asia = {asiaPrisonFire:'cleared',asiaDevaTest:'cleared',asiaRageBreach:'cleared'};
    assert.ok(g.startZoneBoss()); g.battle.youHp = 1;
  } else g.hp = 1;
  g.mp = 0; g.inventory = {tea:1,health:3,holyWater:1};
  const {scope, buttons, fill, repaints} = fixture(g, context);
  buttons.tea.onclick(); assert.equal(g.inventory.tea, undefined); assert.ok(g.mp > 0);
  buttons.holyWater.onclick(); assert.equal(g.inventory.holyWater, undefined);
  const hp = () => context === 'prep' ? g.battle.youHp : g.hp;
  const max = context === 'prep' ? g.battle.youMax : g.hpMax;
  buttons.health.onclick(); assert.equal(hp(), Math.min(max, 1 + Math.round(max * ITEMS.health.hpRatio)));
  assert.equal(g.inventory.health, 2);
  fill.click(); assert.equal(hp(), max); assert.equal(g.inventory.health, 1);
  const n = repaints(); buttons.health.onclick(); fill.click();
  assert.equal(repaints(), n); assert.equal(g.inventory.health, 1);
  assert.equal(scope.prepItemReady('health', context), false);
  assert.equal(scope.prepItemReady('tea', context), false);
});

test('I2-C: fill stops when HP supplies run out; higher-tier HP supplies still work', () => {
  const g = createGame(); g.hp = 1; g.inventory = {health:1};
  const {fill} = fixture(g, 'bag'); fill.click(); assert.ok(g.hp < g.hpMax); assert.equal(g.inventory.health, undefined);
  g.inventory = {healthLarge:1}; fill.click(); assert.equal(g.hp, g.hpMax); assert.equal(g.inventory.healthLarge, undefined);
});

test('I2-C: frontier rest uses the same handlers; entering the next wave prevents further preparation use', () => {
  const g = createGame(); g.zoneEvents.th = {frontierBreach:'cleared'};
  assert.ok(g.startChallenge());
  g.battle.wave = 5; g.battle.pendingWave = 6; g.battle.foes.forEach(f => f.hp = 0);
  g.battle.youHp = 1; g.inventory = {health:3};
  assert.equal(g.zoneEventRestReady(), true);
  const {buttons, fill} = fixture(g, 'prep');
  buttons.health.onclick(); assert.equal(g.inventory.health, 2);
  fill.click(); assert.equal(g.battle.youHp, g.battle.youMax); assert.equal(g.inventory.health, 1);
  assert.equal(g.advanceZoneEventWave(true), true);
  g.battle.youHp = 1;
  buttons.health.onclick(); fill.click(); assert.equal(g.inventory.health, 1); assert.equal(g.battle.youHp, 1);
});

test('I2-C: no inventory disables all three icons and the fill action', () => {
  const g = createGame(); g.inventory = {}; g.hp = 1; g.mp = 0;
  const {scope, fill, repaints} = fixture(g, 'bag');
  const html = scope.prepItemsHtml('bag');
  assert.equal((html.match(/data-prep-use="[^"]+" disabled/g) || []).length, 3);
  assert.match(html, /data-prep-fill disabled/);
  fill.click(); assert.equal(g.hp, 1); assert.equal(repaints(), 0);
});
