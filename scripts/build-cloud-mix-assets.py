#!/usr/bin/env python3
"""CLOUDS-MIX (13 Nov 2026): the two extra files the mixed cloud sea needs from Codex's Z1-V7-CLOUDS pack.

  puffs/puff-01..08.png   copied byte for byte (the 8 drifting puffs Codex drew)
  mask-q.png              Codex's cloud-layer-mask.png (9830 x 6554, L8) cut to the rows / columns that hold any cloud and shrunk 4x with a box filter,
                          written as white RGBA whose ALPHA is the mask.  It is only a clip for the puffs (never shown), so a quarter size is enough
                          and the decoded canvas stays small (2048 x 450 px instead of 257 MB).  The rect it covers is in mask-q.json (world units).

usage: python3 scripts/build-cloud-mix-assets.py <path to docs/art-reviews/2026-11-05-z1v7-clouds>
"""
import json, shutil, sys
from pathlib import Path
from PIL import Image
import numpy as np

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / 'img/map-zone1/v7r-clouds'
(out / 'puffs').mkdir(exist_ok=True)
for f in sorted((src / 'puffs').glob('puff-*.png')):
    shutil.copyfile(f, out / 'puffs' / f.name)

FULL = (9830, 6554); WORLD = (3840, 2560); Q = 4
mask = Image.open(src / 'cloud-layer-mask.png').convert('L')
a = np.asarray(mask)
ys, xs = np.nonzero(a > 0)
pad = 64
x0, x1 = max(0, int(xs.min()) - pad) // Q * Q, min(FULL[0], int(xs.max()) + pad)
y0, y1 = max(0, int(ys.min()) - pad) // Q * Q, min(FULL[1], int(ys.max()) + pad)
x1 = x0 + (x1 - x0 + Q - 1) // Q * Q; y1 = y0 + (y1 - y0 + Q - 1) // Q * Q   # whole multiples of Q (the pad past the edge is clipped below)
crop = mask.crop((x0, y0, x1, y1))
small = crop.resize((crop.width // Q, crop.height // Q), Image.BOX)
rgba = Image.new('RGBA', small.size, (255, 255, 255, 0)); rgba.putalpha(small)
rgba.save(out / 'mask-q.png', optimize=True)
ux, uy = WORLD[0] / FULL[0], WORLD[1] / FULL[1]
rect = [x0 * ux, y0 * uy, crop.width * ux, crop.height * uy]
json.dump({'file': 'mask-q.png', 'sizePx': list(small.size), 'worldRect': rect, 'note': 'alpha = cloud-layer-mask.png (box-filtered 4x); clip for the puffs only'},
          open(out / 'mask-q.json', 'w'), indent=1)
print('mask-q', small.size, 'world rect', [round(v, 1) for v in rect])

# clouds-bounds.json: per chunk, the pixel box (inside the chunk file) that holds any cloud in A or B.  Only a speed-up: the game draws and clears just that box
# (the layers are 99.5 % transparent, and drawing the 20 big transparent chunks every frame cost frames).  Nothing in the pictures is changed.
bounds = {}
for r in range(4):
    for c in range(5):
        box = None
        for v in 'AB':
            im = Image.open(out / f'layer-{v}/r{r + 1}-c{c + 1}.webp').convert('RGBA')
            b = im.getchannel('A').point(lambda x: 255 if x > 0 else 0).getbbox()
            if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        bounds[f'r{r + 1}-c{c + 1}'] = None if box is None else [box[0], box[1], box[2] - box[0], box[3] - box[1]]
json.dump({'note': 'per chunk [x, y, w, h] in file pixels = box of any alpha > 0 in layer A or B (null = fully transparent); speed-up only', 'chunks': bounds}, open(out / 'clouds-bounds.json', 'w'), indent=1)
print('bounds', {k: v for k, v in bounds.items() if v})
