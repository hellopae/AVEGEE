// FB3-T1 (owner, 26 Nov 2026) - battle feel: BT4a (allies grow when hit) · BT4b (menu follows the attacker) · BT5 (heal sound = hit sound)
// The frame-by-frame measurements (sizes over time, menu presence while a move plays) live in scripts/fb3-t1-evidence.py - they need a real browser.
import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
import { CAMERA_TIMING } from '../src/battle-camera.js';
import { powerSfx, SFX_NAMES } from '../src/sfx.js';
import { CREW_POWER, ITEMS } from '../src/data.js';
const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('BT4a: an enemy attack no longer zooms the camera onto our side (it made every ally ~14% bigger for half a second)', () => {
  assert.equal(CAMERA_TIMING.foeAttack.zoom, 1);
  assert.ok(CAMERA_TIMING.foeAttack.impactAt > 0, 'the enemy attack keeps its timing (impact / shake / hit-stop)');
});
test('BT4a: a repaint keeps the fitted ally sizes - they are re-applied the moment the new elements exist, before the async fit finishes', () => {
  const bs = read('src/battle-scale.js');
  assert.match(bs, /function reapplyLastLayout\(/);
  assert.match(bs, /if \(!hero\) return Promise\.resolve\(false\);\s*reapplyLastLayout\(stage, hero, crewImgs, motion\);/, 'runs synchronously at the top of every fit');
  assert.match(bs, /hero\._sizeReference = lastLayout\.ref/, 'the unfitted size reference survives the repaint (else the sizes shrink on every hit)');
  assert.match(read('src/ui.js'), /artUrl\('hero-yama-cry'\); if \(u\) \{ const im = new Image\(\); im\.src = u; warmSpriteBox\(im\); \}/, 'the hurt pose is preloaded and its visible box measured');
});
test('BT4b: the command menu is not drawn while a move is playing (dash out / strike / return, skills, items)', () => {
  assert.match(read('src/ui.js'), /const acts = currentTurn\?\.side==='foe' \|\| phase \|\| dash \|\| b\.commandBusy \|\| !commandMenuOpen \|\|/);
});
test('BT5: every restoring move of ours has a power-up sound that is not the hit sound', () => {
  assert.ok(SFX_NAMES.includes('restore'));
  const heals = [...Object.entries(CREW_POWER).filter(([, p]) => p.kind === 'heal').map(([k]) => 'crew:' + k),
    ...Object.entries(ITEMS).filter(([, d]) => d.consumable).map(([k]) => k), 'food', 'phoenixFeather'];
  assert.ok(heals.includes('crew:boon') && heals.includes('crew:nira') && heals.includes('health') && heals.includes('tea') && heals.includes('holyWater'));
  for (const k of new Set(heals)) { assert.notEqual(powerSfx(k, {}), 'hit', k); assert.equal(powerSfx(k, {}), 'restore', k); }
  for (const k of ['atk', 'strike', 'crew:taan', 'crew:plerng', 'crew:dam', 'guard']) assert.equal(powerSfx(k, {}), 'hit', k + ' stays a hit');
});
test('BT5: healing skills play it too', () => {
  assert.match(read('src/ui.js'), /if \(COMBAT_SKILLS\[action\]\.heal\) sfx\('restore'\)/);
});

// ---- BT8a ----
import { planDash } from '../src/battle-dash.js';
test('BT8a: an enemy attack is measured to the real target (not a fixed 62% of its own width) and stops just short of it', () => {
  const foe = { l:1260, r:1400, t:560, b:700 }, ally = { l:500, r:600, t:540, b:690 };
  const d = planDash(foe, ally, 6);
  assert.equal(foe.l + d.x, ally.r + 6, 'the attacker ends 6 px from the target (not on top of it, not 400 px short)');
  assert.equal(d.y, ally.b - foe.b);
  const ui = read('src/ui.js');
  assert.match(ui, /const aimFoeLungeOnce = \(\) => \{/); assert.match(ui, /const aimFoeLunge = \(tries = 0\) => \{/);
  assert.match(ui, /fitTeam\(\);\s*aimFoeLunge\(\);/, 'inside paint(): every repaint creates fresh elements, so it must be re-applied each time');
  assert.match(ui, /--foe-lunge-x/); assert.match(read('src/battle-turns.css'), /\.foe-aim\{animation:foeLungeAim/);
});
