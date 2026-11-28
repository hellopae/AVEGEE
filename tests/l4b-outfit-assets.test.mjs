import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zoneAssets } from '../src/asset-preload.js';
import {imageMeta} from './helpers/image-meta.mjs';

const manifest = JSON.parse(readFileSync('img/manifest.json'));
const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));

const outfitIcons = {
  th: 'item-outfit-th-v1.webp',
  asia: 'item-outfit-asia-l4b.webp',
  west: 'item-outfit-west-l4b.webp',
  cyberhell: 'item-outfit-cyberhell-v3.webp'
};
const ui = readFileSync('src/ui.js', 'utf8');

for (const [zone, name] of Object.entries(outfitIcons)) {
  test(`${zone} outfit card uses a shipped transparent 512px icon preloaded with its zone`, () => {
    const path = `img/${name}`;
    const meta = imageMeta(path);
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 512);
    assert.ok(meta.hasAlpha, 'RGBA');
    assert(manifest.rest.includes(name));
    assert.ok(ui.includes(`${zone}:'${path}'`), "bag icon");
    assert(catalog.zones[zone].includes(path), 'zone preload');
    assert(zoneAssets(catalog, zone).includes(path));
  });
}
