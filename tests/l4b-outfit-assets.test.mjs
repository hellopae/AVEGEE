import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zoneAssets } from '../src/asset-preload.js';
import {imageMeta} from './helpers/image-meta.mjs';

const manifest = JSON.parse(readFileSync('img/manifest.json'));
const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));

for (const zone of ['asia', 'west', 'cyberhell']) {
  test(`L4b: ${zone} outfit is a shipped transparent 512px icon preloaded with its zone`, () => {
    const name = `item-outfit-${zone}-l4b.webp`;
    const path = `img/${name}`;
    const png = readFileSync(path);
    const meta = imageMeta(png);
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 512);
    assert.ok(meta.hasAlpha, 'RGBA');
    assert(manifest.rest.includes(name));
    // The merchant sells only the current zone's outfit, so each icon ships with its own zone.
    assert(catalog.zones[zone].includes(path), 'zone preload');
    assert(zoneAssets(catalog, zone).includes(path));
  });
}
