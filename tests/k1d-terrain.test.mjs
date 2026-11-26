import './helpers/zone1-ground-v5.mjs';   // this file tests the v5 ground set (see the helper)
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TOWN_SIZE } from '../src/town-layout.js?v=k1d';
import { townChunkRect, townChunkUrl, TOWN_TERRAIN_COLS, TOWN_TERRAIN_ROWS, TOWN_TERRAIN_PREVIEW } from '../src/town-terrain.js';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));

test('the 20 painted chunks (v5 geometry; the v5 files themselves were removed in FB3-CLEAN2, git 6e752785) tile the whole 3840x2560 world without gaps', () => {
  let area = 0;
  for (let r = 1; r <= TOWN_TERRAIN_ROWS; r++) for (let c = 1; c <= TOWN_TERRAIN_COLS; c++) {
    const rect = townChunkRect(r,c);
    area += rect.w * rect.h;
    if (c < TOWN_TERRAIN_COLS) assert.ok(Math.abs(townChunkRect(r,c+1).x - (rect.x + rect.w)) < 1e-6, 'no horizontal gap');
    if (r < TOWN_TERRAIN_ROWS) assert.ok(Math.abs(townChunkRect(r+1,c).y - (rect.y + rect.h)) < 1e-6, 'no vertical gap');
  }
  assert.ok(Math.abs(area - TOWN_SIZE.w * TOWN_SIZE.h) < 1, 'chunks cover the world exactly');
  const last = townChunkRect(TOWN_TERRAIN_ROWS, TOWN_TERRAIN_COLS);
  assert.ok(Math.abs(last.x + last.w - TOWN_SIZE.w) < 1e-6 && Math.abs(last.y + last.h - TOWN_SIZE.h) < 1e-6);
});

// FB3-CLEAN2 (26 Nov 2026): the test of the v5 tile files (pixel sizes, 6 MB budget) went with img/map-zone1/v5 (git 6e752785).

test('old tile terrain and removed scenery art are no longer preloaded; the preview is', async () => {
  const catalog = JSON.parse(readFileSync(file('img/preload-catalog.json'), 'utf8'));
  const th = catalog.zones.th.join('\n');
  assert.doesNotMatch(th, /map-zone1\/terrain-/);
  assert.doesNotMatch(th, /map-zone1\/prop-(bush|ice-ridge|mountain-ridge|volcano|waterfall)/);
  assert.match(th, /map-zone1\/v7r\/zone1-terrain-v7-preview\.webp/, 'the active ground set (v7r) preview is preloaded');
  assert.doesNotMatch(th, /zone1-terrain-v5-preview/, 'the v5 preview (0.96 MB) is not used by the game any more');
  const { assetTier } = await import('../src/asset-preload.js');
  assert.equal(assetTier('img/map-zone1/v7r/zone1-terrain-v7-preview.webp').tier, 0, 'the v7r preview is a critical (tier 0) asset like the v5 one was');
  assert.doesNotMatch(th, /map-zone1\/v5\/r\d-c\d\.webp/, 'sharp chunks stream lazily, never preloaded');
});

test('the heavy 4915x3277 master is not committed', () => {
  assert.equal(existsSync(file('img/map-zone1/v2/zone1-terrain-v2-full.png')), false);
});
