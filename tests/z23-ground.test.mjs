// Z23-GROUND (14 Nov 2026): Codex's 2x ground for zone 2 (Asia), zone 3 (West) and zone 4 (Cyberhell) is the default; the old 1x ground is one constant away.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { ZONE_SKIN, ZONE2_GROUND, ZONE2_GROUND_SET, ZONE3_GROUND, ZONE3_GROUND_SET, ZONE4_GROUND, ZONE4_GROUND_SET } from '../src/zone-skin.js';
import { townTerrainGrid, townChunkUrl, townChunkRect } from '../src/town-terrain.js';

const webpSize = file => { const b = readFileSync(file), k = b.toString('latin1', 12, 16);
  if (k === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (k === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (k === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  throw Error('unexpected WebP ' + k); };

for (const [zone, folder, sets, active, old, prev] of [['asia', 'map-zone2', ZONE2_GROUND, ZONE2_GROUND_SET, 'v2', 'zone2'], ['west', 'map-zone3', ZONE3_GROUND, ZONE3_GROUND_SET, 'v1', 'zone3'], ['cyberhell', 'map-zone4', ZONE4_GROUND, ZONE4_GROUND_SET, 'v3', 'zone4']]) {
  test(`Z23-GROUND ${zone}: the 2x ground v7 is the default, the old 1x ground stays registered and on disk`, () => {
    assert.equal(active, 'v7');
    assert.strictEqual(ZONE_SKIN[zone].terrain, sets.v7);
    assert.deepEqual(Object.keys(sets), [old, 'v7']);
    const g = sets.v7;
    assert.deepEqual({ dir: g.dir, chunk: g.chunk, repairs: g.repairs, fullPx: { ...g.fullPx } }, { dir: `img/${folder}/v7/`, chunk: 1024, repairs: false, fullPx: { w: 9830, h: 6554 } });
    assert.equal(g.sprites, undefined, 'no ground sprites in this zone');
    assert.deepEqual(sets[old].fullPx, { w: 4915, h: 3277 });
    for (let r = 1; r <= 4; r++) for (let c = 1; c <= 5; c++) assert.ok(existsSync(`img/${folder}/${old}/r${r}-c${c}.webp`), 'old set intact');
  });
  test(`Z23-GROUND ${zone}: 70 tiles of 1024 px (last column 646, last row 410), preview 1536x1024, WebP only, no gaps in the world`, () => {
    const G = townTerrainGrid(zone);
    assert.deepEqual([G.cols, G.rows, G.chunk], [10, 7, 1024]);
    const dir = `img/${folder}/v7/`, files = readdirSync(dir);
    assert.ok(files.every(f => /\.(webp|json)$/.test(f) || f === 'sprites'), 'no PNG / JPEG in img/: ' + files.join());
    for (let r = 1; r <= G.rows; r++) for (let c = 1; c <= G.cols; c++) {
      const url = townChunkUrl(r, c, zone); assert.equal(url, `${dir}r${r}-c${c}.webp`);
      assert.deepEqual(webpSize(url), [c === 10 ? 9830 - 9 * 1024 : 1024, r === 7 ? 6554 - 6 * 1024 : 1024], url);
    }
    assert.deepEqual(webpSize(`${dir}${prev}-terrain-v7-preview.webp`), [1536, 1024]);
    assert.equal(sets.v7.preview, `${dir}${prev}-terrain-v7-preview.webp`);
    const last = townChunkRect(7, 10, zone); assert.ok(Math.abs(last.x + last.w - 3840) < 1e-6 && Math.abs(last.y + last.h - 2560) < 1e-6, 'tiles cover the 3840 x 2560 world exactly');
    const m = JSON.parse(readFileSync(dir + 'manifest.json', 'utf8'));
    assert.deepEqual([m.tiles, m.tilePx, m.quality, m.fullPx.w, m.fullPx.h], [70, 1024, 88, 9830, 6554]);
    assert.ok(m.totalTileBytes < 40e6, 'deploy budget: ' + m.totalTileBytes);
  });
}
test('Z23-GROUND: the install script is zone aware and the Z1 name still works', () => {
  const s = readFileSync('scripts/install-ground.py', 'utf8');
  assert.match(s, /--zone/); assert.match(s, /ZONE\{Z\}_GROUND_SET/);
  assert.match(readFileSync('scripts/install-z1-ground.py', 'utf8'), /install-ground\.py/);
  const zs = readFileSync('src/zone-skin.js', 'utf8');
  for (const n of [1, 2, 3, 4]) assert.equal([...zs.matchAll(new RegExp(`export const ZONE${n}_GROUND_SET = '([^']+)';`, 'g'))].length, 1);
});
