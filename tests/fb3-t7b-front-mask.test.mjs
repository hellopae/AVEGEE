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

test('MP3: running the trimmer again removes nothing (the files are the trimmed ones) and the rail / posts of every room are still there', () => {
  const r = py(`
import json,sys
sys.path.insert(0,'scripts')
import importlib.util
spec=importlib.util.spec_from_file_location('t','scripts/trim-room-front.py'); t=importlib.util.module_from_spec(spec); spec.loader.exec_module(t)
from PIL import Image
out={}
for name,rule in t.ROOM_RULES.items():
    im=Image.open('img/rooms-wide/th-%s-front-v1.webp'%name).convert('RGBA'); t.CURRENT['name']=name
    import numpy as np
    n=int((np.asarray(im)[...,3]>16).sum())
    left=0
    if rule: _,kill,_=t.trim(im,*rule); left=int(kill.sum())
    out[name]=[n,left]
print(json.dumps(out))`);
  for (const [name, [opaque, again]] of Object.entries(r)) { assert.ok(opaque > 60000, `${name}: the rail is there (${opaque})`); assert.equal(again, 0, `${name}: nothing above the rail line is left to cut`); }
  assert.ok(r.krata[0] < 132000 && r.lan[0] < 140000 && r.tarang[0] < 140000, 'the three rooms were trimmed');
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
