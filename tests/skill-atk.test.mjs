import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { assetTier, zoneTiers } from '../src/asset-preload.js';
import { figYouAtkClass, heroPoseFacesRight, POSE_DRAWN_FACING_RIGHT } from '../src/battle-facing.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const manifest = JSON.parse(read('img/manifest.json'));
const catalog = JSON.parse(read('img/preload-catalog.json'));
const poses = {
  th: 'img/hero-yama-atk.png',
  asia: 'img/Asia/hero-yama-asia-atk.png',
  west: 'img/West/hero-yama-west-atk.png',
  cyberhell: 'img/CyberHell/hero-yama-cyberhell-atk.png',
};

test('skill atk: new sprites decode as 512x512 RGBA with transparent corners', () => {
  execFileSync('python3', ['-c', `
from PIL import Image
for path in ${JSON.stringify([poses.west, poses.cyberhell])}:
    im = Image.open(path)
    im.load()
    assert im.format == 'PNG', path
    assert im.size == (512, 512), path
    assert im.mode == 'RGBA', path
    alpha = im.getchannel('A')
    assert alpha.getextrema() == (0, 255), path
    assert all(alpha.getpixel(p) == 0 for p in [(0,0),(511,0),(0,511),(511,511)]), path
    # Match the Thai pose's horizontal padding and foot baseline, within 2px at the top.
    reference = Image.open('img/hero-yama-atk.png').getchannel('A').getbbox()
    box = alpha.getbbox()
    assert box[0] == reference[0] and box[2:] == reference[2:], (path, box)
    assert abs(box[1] - reference[1]) <= 2, (path, box)
`], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
});

test('skill atk: manifest, catalog and preload tier cover all four outfits', () => {
  for (const [style, path] of Object.entries(poses)) {
    if (style !== 'th') assert.ok(manifest.zones[style].includes(path.slice(4)), path);
    assert.ok(catalog.zones[style].includes(path), path);
    assert.deepEqual(assetTier(path), assetTier(poses.th), path);
    assert.ok(zoneTiers(catalog, style).critical.includes(path), path);
  }
});

test('skill atk: real artUrl and heroAtk select the outfit pose and face right during a non-sword skill', async () => {
  const previousFetch = globalThis.fetch, previousImage = globalThis.Image;
  globalThis.fetch = async () => ({ ok: true, json: async () => manifest });
  globalThis.Image = class {};
  try {
    const art = await import('../src/art.js?skillatk-test');
    await new Promise(resolve => setImmediate(resolve));
    const heroAtkSource = read('src/ui.js').match(/const heroAtk = [^\n]+/)[0];
    const heroAtk = runInNewContext(`${heroAtkSource}\nheroAtk;`, {
      artUrl: art.artUrl, heroFace: () => 'standing-fallback',
    });
    for (const [style, path] of Object.entries(poses)) {
      art.bindZone(() => style);
      art.bindHeroStyle(() => null);
      assert.equal(art.artUrl('hero-yama-atk'), path);
      assert.equal(heroAtk(), path);
      const atkClass = figYouAtkClass({ usingAtk: true, sword: false, showRage: false, standing: false });
      assert.equal(atkClass, true);
      assert.ok(POSE_DRAWN_FACING_RIGHT.has(path.split('/').pop().slice(0, -4)));
      assert.equal(heroPoseFacesRight(heroAtk(), { atkClass }), true);
      // Outfit selection must still win over the current map zone.
      art.bindZone(() => 'th');
      art.bindHeroStyle(() => style);
      assert.equal(heroAtk(), path);
    }
    assert.match(read('src/ui.js'), /usingAtk \? \(isYamaSwordAttack\(fx\) \? heroFace\(\) : heroAtk\(\)\)/);
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.Image = previousImage;
  }
});

test('skill atk: cache versions retain their previous tokens and append skillatk', () => {
  assert.match(read('index.html'), /mapfx-westhit-skillatk"/);
  assert.match(read('index.html'), /preload\.js\?v=h1-g5-h4-h5b-cane-trojan-zoom-intro-v3-sword-schools-skillatk"/);
  assert.match(read('src/ui.js'), /battle-facing\.js\?v=i1b-westhit-skillatk/);
  assert.match(read('src/ui.js'), /preload\.js\?v=h1-skillatk/);
  assert.match(read('src/preload.js'), /asset-preload\.js\?v=h1-h5b-skillatk/);
  assert.match(read('src/preload.js'), /zoom-intro-v3-sword-schools-skillatk'/);
  assert.match(read('src/art.js'), /h4-zoom-intro-v3-skillatk'/);
});
