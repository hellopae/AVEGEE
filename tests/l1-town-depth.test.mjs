// L1: Zone 1 map depth - actor scale is town-only, the shadow module passes draws through when nothing is baked,
// and the shadow direction is one shared constant (lower right).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMapCharScale, mapCharK, TOWN_CHAR_K } from '../src/scene.js?v=l1';
import { SUN, withTownShade, townShadeAt } from '../src/town-shade.js?v=l1';

test('L1: actors shrink on the Zone 1 town map only, and come back elsewhere', () => {
  setMapCharScale('th');
  assert.ok(Math.abs(mapCharK() - TOWN_CHAR_K) < 1e-9);
  assert.ok(TOWN_CHAR_K >= .7 && TOWN_CHAR_K <= .8, 'a 20-30% reduction');
  setMapCharScale('asia');
  assert.ok(Math.abs(mapCharK() - 1) < 1e-9);
});

test('L1: one sun - shadows fall to the lower right for every caster', () => {
  assert.ok(SUN.kx > 0 && SUN.ky > 0);
});

test('L1: withTownShade is a plain pass-through while no shadow field is baked (no DOM, battle/rooms untouched)', () => {
  let seen = null;
  const ctx = { tag:'ctx' };
  const r = withTownShade(ctx, 100, 100, 50, c => { seen = c; return 'drawn'; });
  assert.equal(seen, ctx); assert.equal(r, 'drawn');
  assert.equal(townShadeAt(100, 100, 50), 0);
});

test('L1: scene.js keeps drawStandee untouched and shades actors via callbacks (no ctx.filter / shadowBlur per frame)', () => {
  const src = f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
  for (const f of ['town-shade.js'])
    assert.doesNotMatch(src(f).replace(/\/\/.*$/gm, ''), /shadowBlur|\.filter\s*=/, f);
  assert.match(src('scene.js'), /withTownShade/);
});
