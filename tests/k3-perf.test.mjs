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

test('K1d terrain: painted chunks are lazy, culled to the camera, and nothing is repainted per frame', () => {
  assert.doesNotMatch(terrain, /createPattern|paintTerrain|getContext\(/, 'no per-chunk vector repainting any more');
  assert.match(terrain, /MAX_LOADING\s*=\s*3/, 'bounded concurrent chunk loads');
  assert.match(terrain, /if \(r\.x > vx1 \|\| r\.x \+ r\.w < vx0/, 'chunks outside the camera are skipped');
  assert.match(terrain, /DETAIL_FROM/, 'overview and minimap use the 1536px preview alone');
});
