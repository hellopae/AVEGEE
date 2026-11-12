// scripts/prep-art.py must write WebP only (12 Nov 2569 conversion rule), so new art cannot come back as a PNG/JPEG the game never asks for.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const py = `
import importlib.util, sys, os
from PIL import Image, ImageDraw
spec = importlib.util.spec_from_file_location('prep_art', 'scripts/prep-art.py'); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
tmp = sys.argv[1]; src = os.path.join(tmp, 'src'); out = os.path.join(tmp, 'out'); os.makedirs(src); os.makedirs(out)
def sprite():
    im = Image.new('RGBA', (300, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.ellipse((60, 40, 240, 360), fill=(200, 40, 30, 255)); return im
def painting(w, h):
    g = Image.linear_gradient('L'); return Image.merge('RGB', [g.resize((w, h)), g.rotate(90).resize((w, h)), g.rotate(45).resize((w, h))])
jobs = {'crew-test': sprite(), 'st-test': sprite(), 'crew-test-walk': sprite().resize((1200, 300)), 'icon-zoom-in': sprite(), 'tile-test': painting(300, 300),
        'scene-test': painting(1800, 900), 'intro-zone9': painting(1400, 700), 'crew-test-profile': painting(500, 700), 'test-cutscene': painting(1500, 800),
        'BG-Test': painting(1400, 800), 'Intro-Boss-Zone9': painting(1500, 800), 'tex-test': painting(300, 300)}
for name, im in jobs.items():
    p = os.path.join(src, name + '.png'); im.save(p); m.prep(p, name, out)
`;
test('prep-art.py writes only .webp for every kind of art; cutscene (painterly opaque) is lossy, sprites stay lossless with their alpha', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prep-art-'));
  const code = py + `
a = Image.open(os.path.join(out, 'crew-test.webp')); assert a.mode == 'RGBA' and a.getchannel('A').getextrema()[0] == 0, 'alpha lost'
print('ok')`;
  const r = spawnSync('python3', ['-I', '-c', code, dir], { cwd: new URL('../', import.meta.url).pathname, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /ok/);
  const files = readdirSync(join(dir, 'out'));
  assert.ok(files.length >= 12, files.join());
  for (const f of files) { assert.match(f, /\.webp$/, `${f} should be webp`); const b = readFileSync(join(dir, 'out', f)); assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP'); }
  assert.deepEqual(files.filter(f => /\.(png|jpe?g)$/i.test(f)), []);
  const fmt = n => readFileSync(join(dir, 'out', n)).toString('ascii', 12, 16);
  assert.equal(fmt('test-cutscene.webp'), 'VP8 ', 'lossy');
  assert.equal(fmt('crew-test.webp'), 'VP8L', 'lossless');
});
