#!/usr/bin/env python3
"""walkmask (src/town-walkmask.js, unchanged) drawn over v7 | v7r at the 7 spots: red = NOT walkable.  Writes walkmask-overlay/<id>.jpg"""
import json, re
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[4]; S = Path.home() / 'agapae-work/.toby-scratch/z1-v7r'
src = (ROOT / 'src/town-walkmask.js').read_text()
runs = [int(x) for x in re.search(r'TOWN_WALK_RUNS=\[([\d,]+)\]', src).group(1).split(',')]
m = np.zeros(480 * 320, np.uint8); i = 0; walk = 0
for r in runs:
    m[i:i+r] = walk; i += r; walk ^= 1          # 1 = walkable, runs start with blocked
m = m.reshape(320, 480)
rep = json.load(open(S / 'seam-report.json')); a7 = np.load(S / 'atlas-v7.npy', mmap_mode='r'); ar = np.load(S / 'atlas-v7r.npy', mmap_mode='r')
out = Path(__file__).parent.parent / 'walkmask-overlay'; out.mkdir(exist_ok=True)
K = 8 / 0.78125 * 2                                   # one walk cell in 2x output px
for sid, d in rep.items():
    if sid.startswith('_'): continue
    x0, y0, x1, y1 = [v*2 for v in d['context1x']]
    ims = []
    for atlas in (a7, ar):
        im = np.array(atlas[y0:y1, x0:x1]).astype(np.float32)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        cx = np.clip((xx / K).astype(int), 0, 479); cy = np.clip((yy / K).astype(int), 0, 319)
        blocked = m[cy, cx] == 0
        im[blocked] = im[blocked] * .55 + np.array([255, 0, 0]) * .45
        # cell outline so the edge is readable
        edge = blocked ^ np.roll(blocked, 1, 0) | blocked ^ np.roll(blocked, 1, 1)
        im[edge] = [255, 255, 0]
        ims.append(im.astype(np.uint8))
    w = ims[0].shape[1]; s = np.zeros((ims[0].shape[0], w * 2 + 8, 3), np.uint8); s[:, :w] = ims[0]; s[:, w+8:] = ims[1]
    Image.fromarray(s).save(out / f'{sid}.jpg', quality=85)
print('ok')
