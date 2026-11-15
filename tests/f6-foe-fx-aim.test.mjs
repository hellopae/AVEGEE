import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = f => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

// F6 (owner 15 Nov 2026, "atk missed"): the enemy's effect was aimed at the rectangle read when the move was scheduled (Yama's hurt-pose picture before the team
// was fitted = 100+ px off him).  The fix re-reads every target + the attacker when the effect starts.
test('F6: battle-fx re-reads live target / attacker rects when an effect starts', () => {
  const fx = read('battle-fx.js');
  assert.match(fx, /const go = \(\) => \{\s*\/\/ F6[\s\S]*?t\.live && t\.live\(\)[\s\S]*?Object\.assign\(tg\[i\], body\(r\)\)[\s\S]*?spec\.srcLive && spec\.srcLive\(\)[\s\S]*?X\.dir = /);
  assert.ok(!/__fxlog|TMPLOG/.test(fx), 'no temporary logs left');
});
test('F6: ui.js gives every enemy-turn target and the attacker a live() / srcLive()', () => {
  const ui = read('ui.js');
  assert.match(ui, /live:\(\) => fxRectSync\(allyImg\(keyOfActor\(h\.id\)\)\)/);
  assert.match(ui, /srcLive:\(\) => fxRectSync\(foeImg\(d\.counterFoeId\)\)/);
  assert.match(ui, /import \{[^}]*spriteRectSync[^}]*\} from '\.\/battle-scale\.js/);
  assert.ok(!/__fxlog|TMPLOG/.test(ui), 'no temporary logs left');
});
test('F6: spriteRectSync only answers from already-measured alpha boxes', () => {
  const sc = read('battle-scale.js');
  assert.match(sc, /export function spriteRectSync\(img, mode = 'layout'\) \{[\s\S]*?if \(!boxes\.has\(src\) \|\| !img\.naturalWidth\) return null;/);
});
