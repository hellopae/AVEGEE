import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { themeArt } from '../src/theme-assets.js';
import { TOWN_PROP_SITES } from '../src/town-layout.js';
import { townPropArtKey, addTownSceneryLayers } from '../src/town-scenery.js';

const expected = [
  ['town-prop-palm', 'palm', 1],
  ['town-prop-lamp-gold', 'lamp-gold', 10],
  ['town-tree-red-th', 'tree-red', 8],
  ['town-tree-snow-th', 'tree-snow', 2],
];

test('K1e: all placed replacement sprites resolve to shipped and preloaded art', () => {
  const catalog = JSON.parse(readFileSync(new URL('../img/preload-catalog.json', import.meta.url)));
  const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
  for (const [key, name, count] of expected) {
    const path = `img/theme-v4/town-${name}-th-v1.webp`;
    assert.equal(themeArt(key, 'th'), path);
    assert.ok(existsSync(new URL('../' + path, import.meta.url)), path);
    assert.ok(catalog.zones.th.includes(path), path + ' preload');
    assert.ok([...manifest.critical, ...manifest.rest].includes(path.slice(4)), path + ' manifest');
    assert.equal(TOWN_PROP_SITES.filter(p => townPropArtKey(p) === key).length, count);
  }
});

test('K1e: depth queue draws new sprites directly, without a tint canvas or layout changes', () => {
  const drawn = [], layers = [];
  const ctx = { save() {}, restore() {}, drawImage(...args) { drawn.push(args); } };
  const images = new Map();
  const resolve = key => {
    if (!images.has(key)) images.set(key, { key, naturalWidth:512, naturalHeight:1024 });
    return images.get(key);
  };
  addTownSceneryLayers((depth, draw) => layers.push({ depth, draw }), ctx, null, null, null,
    { player:{ x:-10000, y:-10000 } }, 0, null, true, resolve);
  assert.deepEqual(layers.map(l => l.depth), TOWN_PROP_SITES.map(p => p.y));
  // Green trees are tinted on a canvas and torches use the fire pillar + light; neither exists in Node.
  const own = TOWN_PROP_SITES.map((p, i) => [p, layers[i]])
    .filter(([p]) => p.kind !== 'torch' && townPropArtKey(p) !== 'town-tree-th');
  own.forEach(([, l]) => l.draw());
  assert.equal(drawn.length, own.length);
  for (const [i, [p]] of own.entries()) {
    const [image, x, y, w, h] = drawn[i];
    assert.equal(image.key, townPropArtKey(p), p.id);
    assert.deepEqual([x, y, w, h], [p.x-p.w/2, p.y-p.w*2, p.w, p.w*2], p.id);
  }
});

test('K1e: torches keep the shared fire pillar, not a K1e sprite', () => {
  assert.ok(TOWN_PROP_SITES.some(p => p.kind === 'torch'));
  for (const p of TOWN_PROP_SITES.filter(p => p.kind === 'torch')) assert.equal(townPropArtKey(p), p.key);
});
