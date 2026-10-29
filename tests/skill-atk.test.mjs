import {readReleaseFile,assertModuleRelease} from './helpers/release-imports.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { assetTier, zoneTiers } from '../src/asset-preload.js';
import {powerVisual} from '../src/battle-fx-map.js';
import { figYouAtkClass, heroPoseFacesRight, POSE_DRAWN_FACING_RIGHT, spriteKey } from '../src/battle-facing.js';

const read = readReleaseFile;
const manifest = JSON.parse(read('img/manifest.json'));
const catalog = JSON.parse(read('img/preload-catalog.json'));
const poses = {
  th: 'img/hero-yama-atk.png',
  asia: 'img/Asia/hero-yama-asia-atk-v2.png',
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

test('ART-ATK2: Asia revision preserves canvas, character height and foot baseline', () => {
  execFileSync('python3', ['-c', `
from PIL import Image
old = Image.open('img/Asia/hero-yama-asia-atk.png').convert('RGBA')
new = Image.open('${poses.asia}')
assert new.size == old.size == (512, 512)
assert new.mode == 'RGBA'
alpha = new.getchannel('A')
# The fire occupied y=0; the unchanged hat starts at y=60 in the left part.
hat_top = old.getchannel('A').crop((0, 0, 220, 512)).getbbox()[1]
assert hat_top == 60
assert alpha.getbbox()[1] == hat_top
assert alpha.getbbox()[3] == old.getchannel('A').getbbox()[3] == 512
assert alpha.getextrema() == (0, 255)
assert all(alpha.getpixel(p) == 0 for p in [(0,0),(511,0),(0,511),(511,511)])
assert alpha.crop((0, 0, 512, hat_top)).getbbox() is None
`], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
});

test('skill atk: real artUrl and heroAtk select the outfit pose and face right during a fire skill', async () => {
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
      assert.ok(POSE_DRAWN_FACING_RIGHT.has(spriteKey(path)));
      assert.equal(heroPoseFacesRight(heroAtk(), { atkClass }), true);
      // Outfit selection must still win over the current map zone.
      art.bindZone(() => 'th');
      art.bindHeroStyle(() => style);
      assert.equal(heroAtk(), path);
    }
    const selector = read('src/ui.js').match(/  const neutralCast = [^\n]+;\n  const youImg =[\s\S]*?;/)[0];
    for (const action of ['fire','flameCharge','ice','hypno','windFan','valkyrieSpear','cooldownClock','mirror']) {
      const selected = runInNewContext(selector+'\nyouImg;', {
        powerVisual, fx:{action,key:'atk'}, usingAtk:true, hurtNow:false,
        isYamaSwordAttack:()=>false, heroFace:()=> 'standing', heroAtk:()=> 'fire-pose',
      });
      assert.equal(selected, ['fire','flameCharge'].includes(action) ? 'fire-pose' : 'standing',action);
    }
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.Image = previousImage;
  }
});

test('skill atk: release imports share the preload owner and use a versioned image catalog', () => {
  const html=read('index.html'),preload=read('src/preload.js');
  assertModuleRelease('src/ui.js',html,null,{entry:true});
  assertModuleRelease('src/preload.js',html,'src/ui.js',{entry:true});
  assertModuleRelease('src/battle-facing.js',html,'src/ui.js');
  assertModuleRelease('src/asset-preload.js',html,'src/preload.js');
  const catalogVersion=preload.match(/const CATALOG_VERSION = '([^']+)'/)?.[1];
  assert.ok(catalogVersion?.trim(),'image catalog has a nonempty cache version');
  assert.match(preload,/useImageCacheVersion\(CATALOG_VERSION\)/,'decoded images share the catalog invalidation version');
  assert.ok(preload.includes('img/preload-catalog.json?v=${CATALOG_VERSION}'),'catalog fetch uses the same version');
  assertModuleRelease('src/art.js',html,'src/ui.js');
});
