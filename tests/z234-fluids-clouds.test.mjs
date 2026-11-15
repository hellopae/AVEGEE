// FLUID-Z234 (15 Nov 2026): lava / water of zones 2-4 flow by the fluid shader; floating clouds + cloud shadows of the three towns are made in code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ZONE_SKIN } from '../src/zone-skin.js';
import { fluidShaderRect } from '../src/fluid-shader.js';
import { ZONE_CLOUD_FX, ZONE_CLOUD_ZONES, zoneCloudAt, zoneCloudsApply, zone234Old, setZone234OldForTest } from '../src/zone-clouds.js';
import { zoneCloudDensity, ZONE_CLOUD_GRID, ZONE_CLOUD_COLS, ZONE_CLOUD_ROWS } from '../src/zone-clouds-density.js';
import { MAP_FX } from '../src/map-ambient.js';

const file = u => fileURLToPath(new URL('../' + u, import.meta.url));
const pngSize = u => { const b = readFileSync(file(u)); assert.equal(b.toString('latin1', 1, 4), 'PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const ZONES = [['asia', 'map-zone2', ['lava', 'water']], ['west', 'map-zone3', ['water']], ['cyberhell', 'map-zone4', ['lava', 'water']]];

for (const [zone, folder, liquids] of ZONES) {
  test(`FLUID-Z234 ${zone}: shader-only fluid layer, fluids.json with flow files of the right size, cores inside their padded rectangles`, () => {
    const cfg = ZONE_SKIN[zone].fluidFx; assert.deepEqual(cfg, { dir: `img/${folder}/fx/`, shaderOnly: true });
    const layout = JSON.parse(readFileSync(file(cfg.dir + 'shader/fluids.json'), 'utf8'));
    assert.deepEqual(layout.masterSize, [4915, 3277]); assert.deepEqual(layout.worldSize, [3840, 2560]);
    assert.ok(layout.pieces.length >= 20, 'pieces: ' + layout.pieces.length);
    const seen = new Set(), kinds = new Set();
    for (const p of layout.pieces) {
      assert.ok(!seen.has(p.id)); seen.add(p.id); kinds.add(p.liquid);
      assert.ok(liquids.includes(p.liquid) && p.group === 'flats' && p.kind === 'flat', p.id);
      const url = cfg.dir + 'shader/' + p.flow; assert.ok(existsSync(file(url)), p.id);
      const [w, h] = pngSize(url); assert.equal(w, Math.round(p.rectPx[2] * p.res)); assert.equal(h, Math.round(p.rectPx[3] * p.res));
      const r = fluidShaderRect(p.rectPx, layout), c = fluidShaderRect(p.corePx, layout);
      assert.ok(c[0] >= r[0] - 1e-9 && c[1] >= r[1] - 1e-9 && c[0] + c[2] <= r[0] + r[2] + 1e-9 && c[1] + c[3] <= r[1] + r[3] + 1e-9, p.id + ' core inside rect');
      assert.ok((p.corePx[0] - p.rectPx[0]) * 3840 / 4915 >= p.cycle * .68 || p.rectPx[0] === 0, p.id + ' padding covers the slide');
      assert.ok(p.speed > 0 && p.speed < 2 && p.cycle > 4 && p.cycle < 40 && p.warp >= 0 && p.warp <= 1 && p.pulse >= 0 && p.pulse <= .5 && p.shimmer >= 0 && p.shimmer <= .3 && p.hot[0] < p.hot[1], p.id + ' params');
    }
    assert.deepEqual([...kinds].sort(), [...liquids].sort(), 'every liquid of the zone has pieces');
    assert.equal(readdirSync(file(cfg.dir + 'shader')).filter(f => f.endsWith('.flow.png')).length, layout.pieces.length, 'no stray flow files');
  });
}
test('FLUID-Z234: zone 1 is unchanged (drawn-frame layer + shader, not shader-only); zone 4 keeps no old flow file', () => {
  assert.equal(ZONE_SKIN.th.fluidFx.shaderOnly, undefined); assert.equal(ZONE_SKIN.th.fluidFx.dir, 'img/map-zone1/v5-fx/');
  assert.equal(ZONE_SKIN.cyberhell.flowUrl, null);
});
test('FLUID-Z234: the clouds apply to zones 2-4 only, and ?z234=old can be switched on for A/B captures', () => {
  assert.deepEqual([...ZONE_CLOUD_ZONES], ['asia', 'west', 'cyberhell']);
  assert.equal(zoneCloudsApply('th'), false); assert.equal(zoneCloudsApply('west'), true);
  assert.equal(zone234Old(), false); setZone234OldForTest(true); assert.equal(zone234Old(), true); setZone234OldForTest(null);
});
test('FLUID-Z234: cloud shadows of the three towns have the strength of zone 1 (.32) and the same lattice', () => {
  assert.equal(MAP_FX.cloud.town.peak, MAP_FX.cloud.peakByZone.th); assert.equal(MAP_FX.cloud.town.peak, MAP_FX.cloud.th.peak === undefined ? .32 : MAP_FX.cloud.th.peak);
  for (const k of ['cell', 'fit', 'spread', 'jitter', 'oddFill', 'tallness']) assert.deepEqual(MAP_FX.cloud.town[k], MAP_FX.cloud.th[k], k);
  assert.equal(MAP_FX.cloud.peakByZone.asia, .20, 'other maps of zone 2 keep their old blob strength');
});
test('FLUID-Z234: the cloud density grids are 48 x 32 hex digits, thin over most of the map and never all-clear', () => {
  assert.deepEqual([ZONE_CLOUD_COLS, ZONE_CLOUD_ROWS], [48, 32]);
  for (const z of ZONE_CLOUD_ZONES) {
    const g = ZONE_CLOUD_GRID[z]; assert.equal(g.length, 32);
    let sum = 0; for (const row of g) { assert.match(row, /^[0-9a-f]{48}$/); for (const ch of row) sum += parseInt(ch, 16) / 15; }
    const mean = sum / (48 * 32); assert.ok(mean > .04 && mean < .3, z + ' mean ' + mean);
    assert.ok(zoneCloudDensity(z, .5, .02) > 0 && zoneCloudDensity(z, 0, 0) >= 0 && zoneCloudDensity(z, 1, 1) <= 1);
  }
  assert.equal(zoneCloudDensity('th', .5, .5), 0);
});
test('FLUID-Z234: clouds drift east, wrap around the map and only show where the ground has mist', () => {
  for (const z of ZONE_CLOUD_ZONES) {
    const fx = ZONE_CLOUD_FX[z]; assert.ok(fx.peak <= .55, z + ' thin: the screen must not go paler');
    let shown = 0, moved = 0;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 12; i++) {
      const a = zoneCloudAt(z, i, j, 100), b = zoneCloudAt(z, i, j, 110);
      if (a) { shown++; assert.ok(a.alpha >= 0 && a.alpha <= fx.peak + 1e-9 && a.w >= fx.width[0] - 1e-9 && a.w <= fx.width[1] + 1e-9); }
      if (a && b && b.x > a.x) moved++;
    }
    assert.ok(shown >= 4, z + ' clouds in the slots: ' + shown); assert.ok(moved >= 1);
    assert.equal(zoneCloudAt('th', 1, 1, 5), null);
  }
});
test('FLUID-Z234: the new modules are wired into the scene, the weather pass and the fluid layer', () => {
  const scene = readFileSync(file('src/scene.js'), 'utf8'), amb = readFileSync(file('src/map-ambient.js'), 'utf8'), fx = readFileSync(file('src/town-fluid-fx.js'), 'utf8');
  assert.match(scene, /drawZoneClouds\(ctx,cloudMs,g\.zone/); assert.match(scene, /townShadows:town&&g\.zone!=='th'/);
  assert.match(amb, /zoneShadowSprites\(townZone\)/); assert.match(fx, /shaderOnly/);
});
