import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zoneAssets } from '../src/asset-preload.js';

const manifest = JSON.parse(readFileSync('img/manifest.json'));
const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));

for (const zone of ['asia', 'west', 'cyberhell']) {
  test(`L4b: ${zone} outfit is a shipped transparent 512px icon preloaded with its zone`, () => {
    const name = `item-outfit-${zone}-l4b.png`;
    const path = `img/${name}`;
    const png = readFileSync(path);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), 512);
    assert.equal(png.readUInt32BE(20), 512);
    assert.equal(png[25], 6, 'RGBA PNG');
    assert(manifest.rest.includes(name));
    // The merchant sells only the current zone's outfit, so each icon ships with its own zone.
    assert(catalog.zones[zone].includes(path), 'zone preload');
    assert(zoneAssets(catalog, zone).includes(path));
  });
}
