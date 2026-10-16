// M2: battle effect system — every move maps to a recipe, every recipe is implemented, no per-frame filter/shadow, pool cap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RECIPE_IDS, recipeFor, ALL_ACTIONS, fireTier, foeTier, FIRE_TIER_MEDIUM, FIRE_TIER_LARGE, slashColorOf, WEAPON_SLASH, RECIPE_META, cueKindFor, cueImpactAt, DEFAULT_CUE_TIMING, poseContactMs, swordContactMs, leadInMs, MELEE_RECIPES } from '../src/battle-fx-map.js';
import { TEX, TEX_KEYS, blendOf, cellsOf } from '../src/battle-fx-tex.js';
import { IMPLEMENTED_RECIPES, MAX_PARTICLES } from '../src/battle-fx.js';
import { CREW_POWER, BATTLE, ITEMS, WEAPONS } from '../src/data.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const fxSrc = read('src/battle-fx.js'), texSrc = read('src/battle-fx-tex.js'), mapSrc = read('src/battle-fx-map.js'), ui = read('src/ui.js');

test('every move the battle can issue maps to a known recipe (defend/flee are not effects)', () => {
  for (const a of ALL_ACTIONS) { const r = recipeFor(a, { dmg:40 }); assert.ok(RECIPE_IDS.includes(r), `${a} -> ${r}`); }
  assert.equal(recipeFor('defend'), null); assert.equal(recipeFor('flee'), null);
});

test('moves derived from the game data are all covered (crew specials, battle items, yama powers, weapons)', () => {
  for (const k of Object.keys(CREW_POWER)) {
    const action = k === 'guard' ? 'guard' : `crew:${k}`;
    assert.ok(RECIPE_IDS.includes(recipeFor(action, { dmg:CREW_POWER[k].dmg || 0 })), action);
  }
  for (const it of BATTLE.items) assert.ok(RECIPE_IDS.includes(recipeFor(it.k)), `item ${it.k}`);
  for (const k of ['atk', 'strike', 'fire', 'flameCharge', 'windFan', 'rage', 'valkyrieSpear', 'cooldownClock', 'hypno', 'ice', 'mirror']) assert.ok(RECIPE_IDS.includes(recipeFor(k, { dmg:40 })), k);
  for (const k of Object.keys(ITEMS)) if (ITEMS[k].consumable) assert.equal(recipeFor(k), 'heal', `${k} heals`);
  for (const w of Object.keys(WEAPONS)) assert.ok(TEX_KEYS.includes(`fx-slash-arc-${slashColorOf(w)}`), `weapon ${w} has a slash colour texture`);
  assert.deepEqual(Object.keys(WEAPON_SLASH).sort(), Object.keys(WEAPONS).sort());
});

test('the player-visible spec: slash (h/diagonal/cross/multi), fire x3 tiers, ice, wind, hypno, spear, club, heal recipes exist', () => {
  for (const r of ['slash', 'slash_cross', 'slash_multi', 'fire_s', 'fire_m', 'fire_l', 'ice', 'wind', 'hypno', 'spear', 'club', 'heal']) assert.ok(RECIPE_IDS.includes(r), r);
});

test('every recipe id has an implementation in the engine and vice versa', () => {
  assert.deepEqual([...IMPLEMENTED_RECIPES].sort(), [...RECIPE_IDS].sort());
});

test('fire gets three tiers by the damage the game already computed; enemy hits get three tiers', () => {
  assert.equal(fireTier(40), 'fire_s'); assert.equal(fireTier(FIRE_TIER_MEDIUM), 'fire_m'); assert.equal(fireTier(60), 'fire_m');
  assert.equal(fireTier(FIRE_TIER_LARGE), 'fire_l'); assert.equal(fireTier(74), 'fire_l');
  assert.equal(foeTier(8), 'foe_claw_s'); assert.equal(foeTier(16), 'foe_claw_m'); assert.equal(foeTier(40), 'foe_claw_l');
  assert.equal(recipeFor('atk', { crit:true }), 'slash_cross'); assert.equal(recipeFor('atk', { replay:3 }), 'slash_multi'); assert.equal(recipeFor('atk'), 'slash');
});

test('no ctx.filter / shadowBlur / CSS filter anywhere in the effect code', () => {
  for (const [name, src] of [['battle-fx.js', fxSrc], ['battle-fx-tex.js', texSrc], ['battle-fx-map.js', mapSrc]]) {
    const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/\.filter\s*=/.test(code) && !/shadowBlur|shadowColor|filter\s*:/.test(code), `${name} has no per-frame filter/shadow`);
  }
});

test('particle pool is capped at 300 and uses a pre-allocated array', () => {
  assert.ok(MAX_PARTICLES <= 300);
  assert.match(fxSrc, /Array\.from\(\{ length:MAX_PARTICLES \}/);
  assert.match(fxSrc, /if \(pLive >= MAX_PARTICLES\) return false/);
});

test('every texture key used by a recipe is declared, with a valid blend and atlas cell count', () => {
  const used = new Set([...fxSrc.matchAll(/'(fx-[a-z0-9-]+)'/g)].map(m => m[1]).filter(k => k.split('-').length >= 3 && k !== 'fx-layer'));
  for (const c of ['white', 'ember', 'crimson', 'cyan']) used.add(`fx-slash-arc-${c}`);
  for (const k of used) assert.ok(TEX[k], `${k} is in the texture table`);
  assert.equal(TEX_KEYS.length, new Set(TEX_KEYS).size);
  for (const k of TEX_KEYS) {
    assert.match(k, /^fx-[a-z0-9]+(-[a-z0-9]+)+$/); assert.ok(['lighter', 'source-over'].includes(blendOf(k)));
    assert.ok(Number.isInteger(cellsOf(k)) && TEX[k].w % cellsOf(k) === 0, `${k} cells divide width`);
  }
  assert.equal(TEX_KEYS.length, 62, 'matches the 62-file art spec');
});

test('every texture has a stand-in generator so the game looks right before real art arrives', () => {
  for (const k of TEX_KEYS) assert.ok(texSrc.includes(`GEN['${k}']`), `${k} has GEN`);
});

test('ui.js attaches the canvas, starts the move effect at all three phase starts, stops on finish, and bumps cache tokens', () => {
  assert.match(ui, /from '\.\/battle-fx\.js\?v=m2'/);
  assert.equal((ui.match(/startMoveFx\('(you|foe)'/g) || []).length, 3);
  assert.match(ui, /attachBattleFx\(stage\)/); assert.match(ui, /stopBattleFx\(\)/); assert.match(ui, /playHealBattleFx\(gains, delayMs\)/);
  for (const f of ['index.html', 'output/game-review/index.html']) assert.ok(/src\/ui\.js\?v=[^"']*-m2/.test(read(f)), `${f} ui.js token ends -m2`);
});

test('crit flag is display-only and exposed for the CRITICAL label', () => {
  const game = read('src/game.js');
  assert.match(game, /B\.dmg\.crit = !!\(swing && what === 'atk' && swing\.crit\)/);
});

test('every recipe carries camera metadata (power 1-3, single|all, dim, flash) and a hit time', () => {
  assert.deepEqual(Object.keys(RECIPE_META).sort(), [...RECIPE_IDS].sort());
  for (const [id, m] of Object.entries(RECIPE_META)) {
    assert.ok(Number.isFinite(m.hit) && m.hit >= 0, `${id} hit`);
    assert.ok([1, 2, 3].includes(m.camera.power) && ['single', 'all'].includes(m.camera.scope), id);
    assert.equal(typeof m.camera.dim, 'boolean'); assert.equal(typeof m.camera.flash, 'boolean');
  }
  assert.equal(RECIPE_META.fire_s.camera.power, 1); assert.equal(RECIPE_META.fire_l.camera.power, 3);
  for (const k of ['ice', 'wind', 'hypno']) assert.equal(RECIPE_META[k].camera.scope, 'all', `${k} hits every foe`);
});

test('camera cue mapping mirrors docs/battle-camera-api.md: attack 360, skill 520 (cutscene+60), foe 340, heal 300', () => {
  assert.equal(cueKindFor('you', 'atk'), 'attack'); assert.equal(cueKindFor('you', 'strike'), 'attack');
  assert.equal(cueKindFor('you', 'fire'), 'skill'); assert.equal(cueKindFor('you', 'crew:kan'), 'skill'); assert.equal(cueKindFor('you', 'tea'), 'heal'); assert.equal(cueKindFor('foe', null), 'foe-attack');
  assert.equal(cueImpactAt('attack'), 360); assert.equal(cueImpactAt('skill'), 520); assert.equal(cueImpactAt('skill', 1300), 1360);
  assert.equal(cueImpactAt('foe-attack'), 340); assert.equal(cueImpactAt('heal'), 300);
  assert.equal(cueImpactAt('attack', 0, { ...DEFAULT_CUE_TIMING, attack:400 }), 400);
});

test('camera adapter: the engine hands shake/dim/flash to the M1 camera when present and never moves .cam-* itself', () => {
  assert.match(fxSrc, /if \(E\.camera \|\| E\.reduce[^)]*\) return;/);
  assert.match(fxSrc, /if \(E\.camera \|\| !FX_TUNE\.dim\) return;/);
  assert.match(fxSrc, /E\.camera\.layer\('fx'\)/);
  assert.match(fxSrc, /export function setBattleCamera/);
  assert.ok(!/\.cam-world|cam-world/.test(fxSrc.replace(/\/\/.*$/gm, '')), 'engine does not touch .cam-world');
});

test('melee effects line up with the attacker animation (Codex pose atlas / sword frames); projectiles launch at half contact', () => {
  assert.equal(poseContactMs([100, 90, 100, 120, 100, 140]), 290);
  assert.equal(poseContactMs([100, 110, 100, 130, 100, 140]), 310);
  assert.equal(poseContactMs([]), 0); assert.equal(poseContactMs(undefined), 0);
  assert.equal(swordContactMs([85, 80, 60, 35, 40, 80, 100, 100]), 260);
  assert.equal(leadInMs('slash', 290), 290 - RECIPE_META.slash.hit);
  assert.equal(leadInMs('club', 50), 0, 'never negative');
  assert.equal(leadInMs('slash', 0), 110, 'unknown contact -> small fixed lead-in');
  assert.equal(leadInMs('fire_m', 290), 145); assert.equal(leadInMs('ice', 0), 0);
  for (const r of MELEE_RECIPES) assert.ok(RECIPE_IDS.includes(r));
  assert.match(ui, /poseDurations\(/); assert.match(ui, /SWORD_FRAME_MS/);
});

test('M2 does not modify Codex files (combat-sprites.js, the combat manifest)', () => {
  const sprites = read('src/combat-sprites.js');
  assert.ok(!/battle-fx|fxStats|playBattleFx/.test(sprites));
});
