import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TOWN_SIZE } from '../src/town-layout.js?v=k1d';
import { townChunkRect, townChunkUrl, TOWN_TERRAIN_COLS, TOWN_TERRAIN_ROWS, TOWN_TERRAIN_PREVIEW } from '../src/town-terrain.js';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));

test('the 20 painted chunks exist and tile the whole 3840x2560 world without gaps', () => {
  let area = 0;
  for (let r = 1; r <= TOWN_TERRAIN_ROWS; r++) for (let c = 1; c <= TOWN_TERRAIN_COLS; c++) {
    assert.ok(existsSync(file(townChunkUrl(r,c))), townChunkUrl(r,c));
    const rect = townChunkRect(r,c);
    area += rect.w * rect.h;
    if (c < TOWN_TERRAIN_COLS) assert.ok(Math.abs(townChunkRect(r,c+1).x - (rect.x + rect.w)) < 1e-6, 'no horizontal gap');
    if (r < TOWN_TERRAIN_ROWS) assert.ok(Math.abs(townChunkRect(r+1,c).y - (rect.y + rect.h)) < 1e-6, 'no vertical gap');
  }
  assert.ok(Math.abs(area - TOWN_SIZE.w * TOWN_SIZE.h) < 1, 'chunks cover the world exactly');
  const last = townChunkRect(TOWN_TERRAIN_ROWS, TOWN_TERRAIN_COLS);
  assert.ok(Math.abs(last.x + last.w - TOWN_SIZE.w) < 1e-6 && Math.abs(last.y + last.h - TOWN_SIZE.h) < 1e-6);
});

test('chunk pixel sizes match the world scale (1.28 painted px per unit) and the preview is the whole map', () => {
  const size = u => JSON.parse(execFileSync('python3', ['-c',
    'from PIL import Image; import json,sys; print(json.dumps(Image.open(sys.argv[1]).size))', file(u)], { encoding:'utf8' }));
  assert.deepEqual(size('img/map-zone1/v2/r1-c1.webp'), [1024,1024]);
  assert.deepEqual(size('img/map-zone1/v2/r4-c5.webp'), [819,205]);
  const [pw, ph] = size(TOWN_TERRAIN_PREVIEW);
  assert.ok(Math.abs(pw / ph - TOWN_SIZE.w / TOWN_SIZE.h) < .01, 'preview keeps the world aspect');
  const bytes = (() => { let n = 0; for (let r = 1; r <= 4; r++) for (let c = 1; c <= 5; c++) n += statSync(file(townChunkUrl(r,c))).size; return n; })();
  assert.ok(bytes < 6 * 1048576, 'all chunks together stay under 6 MB');
});

test('old tile terrain and removed scenery art are no longer preloaded; the preview is', () => {
  const catalog = JSON.parse(readFileSync(file('img/preload-catalog.json'), 'utf8'));
  const th = catalog.zones.th.join('\n');
  assert.doesNotMatch(th, /map-zone1\/terrain-/);
  assert.doesNotMatch(th, /map-zone1\/prop-(bush|ice-ridge|mountain-ridge|volcano|waterfall)/);
  assert.match(th, /map-zone1\/v2\/zone1-terrain-v2-preview\.webp/);
  assert.doesNotMatch(th, /map-zone1\/v2\/r\d-c\d\.webp/, 'sharp chunks stream lazily, never preloaded');
});

test('the heavy 4915x3277 master is not committed', () => {
  assert.equal(existsSync(file('img/map-zone1/v2/zone1-terrain-v2-full.png')), false);
});
