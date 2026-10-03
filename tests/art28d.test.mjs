import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { STORY } from '../src/story.js';
import { ITEMS } from '../src/data.js';

const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));

test('28D revisions and MP icon exist and are preloaded by their consumers', () => {
  for (const [story, path] of [
    ['cyber-control', 'img/story-cyberhell-02-v3.png'],
    ['cyber-duel', 'img/story-cyberhell-03-v4.png'],
  ]) {
    assert.equal(STORY[story].pages[0].image, path);
    assert.ok(existsSync(new URL('../' + path, import.meta.url)));
    assert.ok(manifest.rest.includes(path.slice(4)));
  }
  assert.ok(Object.values(ITEMS).some(i => i.img === 'item-holywater'));
  assert.ok(manifest.rest.includes('item-holywater.png'));
});

test('ruler lookup selects v2 in both zones, with an old-manifest fallback', async () => {
  const previousFetch = globalThis.fetch, previousImage = globalThis.Image;
  globalThis.Image = class {};
  try {
    for (const revised of [true, false]) {
      const zones = structuredClone(manifest.zones);
      if (!revised) for (const z of ['west', 'cyberhell']) {
        zones[z] = zones[z].filter(p => !p.endsWith(`hero-boss-${z}-v2.png`));
      }
      globalThis.fetch = async () => ({ ok:true, json:async () => ({ ...manifest, zones }) });
      const art = await import(`../src/art.js?28d=${revised}`);
      await new Promise(resolve => setImmediate(resolve));
      for (const [z, folder] of [['west', 'West'], ['cyberhell', 'CyberHell']]) {
        art.bindZone(() => z);
        const path = `img/${folder}/hero-boss-${z}${revised ? '-v2' : ''}.png`;
        assert.equal(art.artUrl('hero-boss'), path);
        assert.ok(existsSync(new URL('../' + path, import.meta.url)));
      }
      for (const [z, path] of [
        ['th','img/crew-guard-v2.png'],
        ['asia','img/Asia/crew-guard-asia-v2.png'],
        ['west','img/West/crew-guard-west.png'],
        ['cyberhell','img/CyberHell/crew-guard-cyberhell-v2.png'],
      ]) {
        art.bindZone(() => z);
        assert.equal(art.artUrl('crew-guard'), path, `Guard must match ${z}`);
        assert.ok(existsSync(new URL('../' + path, import.meta.url)));
      }
    }
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.Image = previousImage;
  }
});

test('prep-art preserves story letterboxing, revision names and real asset formats', () => {
  execFileSync('python3', ['-c', `
import importlib.util, pathlib, tempfile
from PIL import Image
root = pathlib.Path.cwd()
spec = importlib.util.spec_from_file_location('prep', root/'scripts/prep-art.py')
p = importlib.util.module_from_spec(spec); spec.loader.exec_module(p)
for zone, name in [('West','hero-boss-west-v2'), ('CyberHell','hero-boss-cyberhell-v2')]:
    assert p.out_name(zone, name) == (name, '')
with tempfile.TemporaryDirectory() as tmp:
    src = pathlib.Path(tmp)/'input.png'
    im = Image.new('RGB', (1200,700), 'black')
    im.paste((10,80,120), (0,90,1200,610)); im.save(src)
    assert p.prep(str(src), 'story-fixture-v3', tmp) == (1200,700)
    out = Image.open(pathlib.Path(tmp)/'story-fixture-v3.png').convert('RGB')
    assert out.getpixel((600,0)) == (0,0,0)
    assert out.getpixel((600,699)) == (0,0,0)
    assert out.getpixel((600,350)) == (10,80,120)
for rel in ['item-holywater.png','West/hero-boss-west-v2.png','CyberHell/hero-boss-cyberhell-v2.png']:
    im = Image.open(root/'img'/rel)
    assert im.size == (512,512), rel
    assert im.mode == 'RGBA', rel
    alpha = im.getchannel('A')
    assert alpha.getextrema() == (0,255), rel
    assert all(alpha.getpixel(pt) == 0 for pt in [(0,0),(511,0),(0,511),(511,511)]), rel
assert Image.open(root/'img/BG-Tea.webp').size == (1024,576)
for rel in ['story-cyberhell-02-v3.png','story-cyberhell-03-v4.png']:
    im = Image.open(root/'img'/rel).convert('RGB')
    assert im.width == 1280 and im.width/im.height > 1.7, rel
    assert max(im.getpixel((im.width//2,0))) <= 8, rel
    assert max(im.getpixel((im.width//2,im.height-1))) <= 8, rel
`], { cwd: new URL('..', import.meta.url), stdio:'pipe' });
});
