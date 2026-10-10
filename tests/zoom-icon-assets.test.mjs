import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { assetTier, zoneTiers } from '../src/asset-preload.js';

const paths = ['img/ui/icon-zoom-in.png', 'img/ui/icon-zoom-out.png'];

test('zoom icons are registered and critical in every zone', () => {
  const manifest = JSON.parse(readFileSync('img/manifest.json'));
  const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));
  for (const path of paths) {
    assert(manifest.zones.ui.includes(path.slice(4)));
    assert.equal(catalog.shared.filter(p => p === path).length, 1);
    assert.equal(assetTier(path).tier, 0);
    for (const zone of ['th', 'asia', 'west', 'cyberhell']) {
      assert(zoneTiers(catalog, zone).critical.includes(path), zone);
    }
  }
});

test('zoom PNGs and prep preserve transparent padding and centre nonsquare input', () => {
  const result = spawnSync('python3', ['-c', `
import importlib.util, tempfile
from pathlib import Path
from PIL import Image
spec = importlib.util.spec_from_file_location('prep_art', 'scripts/prep-art.py')
prep_art = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prep_art)
for name in ('icon-zoom-in', 'icon-zoom-out'):
    icon = Image.open(f'img/ui/{name}.png')
    assert icon.format == 'PNG' and icon.mode == 'RGBA' and icon.size == (96, 96)
    alpha = icon.getchannel('A')
    assert alpha.getextrema() == (0, 255)
    x0, y0, x1, y1 = alpha.getbbox()
    assert min(x0, y0, 96-x1, 96-y1) >= 4
    assert abs(x0-(96-x1)) <= 1 and abs(y0-(96-y1)) <= 1
with tempfile.TemporaryDirectory() as tmp:
    source = Path(tmp) / 'source.png'
    im = Image.new('RGBA', (200, 160))
    im.paste((150, 90, 30, 128), (20, 40, 180, 120))
    im.save(source)
    for name in ('icon-zoom-in', 'icon-zoom-out'):
        assert prep_art.prep(source, name, out_dir=tmp) == (96, 96)
        icon = Image.open(Path(tmp) / (name + '.png'))
        assert icon.getchannel('A').getbbox() == (4, 26, 92, 70)
        assert icon.getpixel((48, 48))[3] == 128
    Image.new('RGBA', (96, 96)).save(source)
    try:
        prep_art.prep(source, 'icon-zoom-in', out_dir=tmp)
    except ValueError:
        pass
    else:
        raise AssertionError('empty icon accepted')
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
