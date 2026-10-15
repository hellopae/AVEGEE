import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// K3 regressions (15 Oct 2026): these two patterns took Zone 1 from 60 fps to ~10 fps on an Intel iGPU at DPR 2.
const scenery = readFileSync(new URL('../src/town-scenery.js', import.meta.url), 'utf8');
const terrain = readFileSync(new URL('../src/town-terrain.js', import.meta.url), 'utf8');

test('per-frame scenery drawing never assigns ctx.filter (tints are baked once per image and biome)', () => {
  const frameCode = scenery.slice(scenery.indexOf('export function addTownSceneryLayers'));
  assert.doesNotMatch(frameCode, /ctx\.filter\s*=/);
  assert.match(scenery, /function tintedArt/);
  assert.match(scenery, /p\.filter=filter/); // the only filter use: once, on the baked canvas
});

test('scenery and its shadows skip props outside the camera rectangle', () => {
  assert.equal((scenery.match(/if\(!onScreen\(ctx,p,art\)\)continue;/g) || []).length, 2);
});

test('terrain chunk cache is never smaller than the visible chunk count and patterns are shared', () => {
  assert.match(terrain, /MAX_CHUNKS=Math\.max\(48,\(right-left\+2\)\*\(bottom-top\+2\)\*2\)/);
  assert.doesNotMatch(terrain, /MAX_CHUNKS=48;/);
  assert.match(terrain, /const patterns=new WeakMap\(\);\nfunction material[\s\S]*?patterns\.has\(image\)/);
});
