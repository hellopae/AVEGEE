// FB3-T7b (owner map4-zoom): the front layers of the Zone 1 rooms must not carry floor wedges above the rail (they hid Yama's body when he stood above the rail).
// The pixel-equals-background check of T7 could not see this: a wedge of floor IS identical to the background - the shape of the alpha is what matters.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url).pathname;
const py = code => JSON.parse(execFileSync('python3', ['-I', '-c', code], { cwd:root, encoding:'utf8', maxBuffer:1 << 26 }));
const alphaProbe = (name, boxes) => py(`
import json
from PIL import Image
import numpy as np
a=np.asarray(Image.open('img/rooms-wide/th-${name}-front-v1.webp').convert('RGBA'))[...,3]
print(json.dumps([int((a[y0:y1,x0:x1]>16).sum()) for x0,y0,x1,y1 in ${JSON.stringify(boxes)}]+[int((a>16).sum())]))`);

test('MP3: the floor wedge that hid Yama (krata, x 520-568 / y 668-728) and the wedges above the rail of the three trimmed rooms are transparent', () => {
  const [wedge, finial1, finialR, flameR, total] = alphaProbe('krata', [[520, 668, 568, 728], [1100, 690, 1125, 715], [1440, 685, 1480, 705], [1280, 650, 1340, 690]]);
  assert.equal(wedge, 0, 'the cone beside the post is gone'); assert.equal(finial1, 0); assert.equal(finialR, 0); assert.equal(flameR, 0); assert.ok(total > 60000, `the rail itself stays (${total} opaque px)`);
});

test('MP3: against the file as Codex / T7 had it (git c65fdc22): alpha only went down, every remaining pixel has the SAME colour, canteen / tea are byte-identical, the three rooms lost the wedges but kept the rail', () => {
  const r = py(`
import json,subprocess,io
from PIL import Image
import numpy as np
out={}
for n in ['krata','lan','tarang','canteen','tea']:
    path='img/rooms-wide/th-%s-front-v1.webp'%n
    old=subprocess.run(['git','show','c65fdc22:'+path],capture_output=True,check=True).stdout
    O=np.asarray(Image.open(io.BytesIO(old)).convert('RGBA')).astype(int); N=np.asarray(Image.open(path).convert('RGBA')).astype(int)
    same=bool((O==N).all())
    up=int(((N[...,3]>O[...,3]+1)).sum())
    keep=N[...,3]>16
    colour=int((np.abs(O[...,:3]-N[...,:3]).max(2)[keep]>1).sum())
    out[n]=[same,up,colour,int((O[...,3]>16).sum()),int(keep.sum())]
print(json.dumps(out))`);
  for (const n of ['canteen', 'tea']) assert.equal(r[n][0], true, `${n} untouched`);
  for (const n of ['krata', 'lan', 'tarang']) {
    const [same, up, colour, before, after] = r[n];
    assert.equal(same, false); assert.equal(up, 0, `${n}: no pixel became more opaque`); assert.equal(colour, 0, `${n}: no recolouring`);
    assert.ok(after < before && after > before * .55, `${n}: wedges gone (${before} -> ${after}) but the rail stays`);
  }
});

test('MP3: only alpha changed - the trimmed layers still composite onto their background with no recolouring (every opaque pixel is the background pixel)', () => {
  const r = py(`
import json
from PIL import Image
import numpy as np
bg={'krata':'img/rooms-wide/th-krata-v2.webp','lan':'img/rooms-wide/th-lan-v2.webp','tarang':'img/rooms-wide/th-tarang-v2.webp'}
out={}
for n,b in bg.items():
    B=np.asarray(Image.open(b).convert('RGB')).astype(int); F=np.asarray(Image.open('img/rooms-wide/th-%s-front-v1.webp'%n).convert('RGBA')).astype(int)
    m=F[...,3]>230; out[n]=float(np.abs(F[...,:3]-B)[m].mean())
print(json.dumps(out))`);
  for (const [n, d] of Object.entries(r)) assert.ok(d < 5, `${n}: mean difference to the painting ${d}`);
});

test('MP3: the trimmer script, the cache query on the layers and the checked-in sheet exist', () => {
  assert.ok(existsSync(root + 'scripts/trim-room-front.py'));
  const room = readFileSync(root + 'src/room.js', 'utf8'); assert.match(room, /FRONT_CACHE = '\?v=fb3t7b'/); assert.match(room, /bgOf\(foregroundSrc \+ FRONT_CACHE\)/);
});
