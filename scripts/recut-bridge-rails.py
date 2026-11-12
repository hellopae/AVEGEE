#!/usr/bin/env python3
"""FB2-5 / ART-INTEGRATE (13 Nov 2026): re-cut the two Zone 1 central-bridge rail sprites at their TRUE proportion.

Why the old ones were thin: the Codex ImageGen sources (art-src/z1-bridge-rails/*-source.png, 724x2172) hold one stray alpha=1 pixel at x=0 and x=703, so
`alpha.getbbox()` in the 5 Nov export was the whole 704 px width and the real rail (about 195 px wide) was squeezed ~3.6x into 130 px.
Here: same vertical crop (rows 31/25 .. 2148, so height 1315 px and the foot stay exactly where they were), the horizontal crop is the real opaque bbox (alpha >= 1), ONE uniform scale
(1315 / crop height) in both axes, LANCZOS.  No redraw, no recolour, no filter.  Writes img/map-zone1/v7r/sprites/river-{back,front}.webp and updates their rectWorld in sprites.json
(footWorld is unchanged in sprites.json; the picture is placed so the visible rail keeps the screen position of the FB2-A render, see CENTER_X).

    python3 scripts/recut-bridge-rails.py
"""
import json, math
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'art-src/z1-bridge-rails'
OUT = ROOT / 'img/map-zone1/v7r'
PX = 2.56      # 2x master px per world unit (9830 / 3840)
H_WORLD = 513.548   # unchanged sprite height in world units (1315 px)
TOP_ROW = {'river-back': 31, 'river-front': 25}   # the pilot's top crop row (same vertical mapping as before)
BOTTOM_ROW = 2148
# Where the rail sat on screen before (FB2-A drew the squeezed 130 px sprite x3.5 wider about a pivot, and the owner saw it aligned with the painted end posts of the stair).
# World X of the centre of the visible rail in that render: old rectWorld x / w, pivot .358 / .594, source content columns 158..350 / 344..497 of 704, k = 3.5.
CENTER_X = {'river-back': 1863.09, 'river-front': 1984.89}

sprites = json.loads((OUT / 'sprites.json').read_text())
for sid in ('river-back', 'river-front'):
    im = Image.open(SRC / f'{sid}-source.png').convert('RGBA')
    a = np.array(im.getchannel('A'))
    ys, xs = np.where(a >= 8)                       # the real rail (ignores the alpha<=1 stray pixels)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = TOP_ROW[sid], BOTTOM_ROW
    crop = im.crop((x0, y0, x1, y1))
    s = 1315 / crop.height
    size = (max(1, round(crop.width * s)), 1315)
    out = crop.resize(size, Image.Resampling.LANCZOS)
    arr = np.array(out.getchannel('A')); yy, xx = np.where(arr >= 128)
    bottom = int(yy.max()); band = xx[yy >= bottom - 2]; u = float(np.median(band))
    entry = next(e for e in sprites if e['id'] == sid)
    fx, fy = entry['footWorld']
    w = size[0] / PX; h = size[1] / PX
    # the foot row inside the sprite: keep the foot at the same world Y as before (old foot row = 1249 px for back / 1310 for front)
    old = Image.open(OUT / 'sprites' / f'{sid}.webp'); oldA = np.array(old.getchannel('A')); oy, ox = np.where(oldA >= 128)
    old_bottom = int(oy.max())
    if abs(old_bottom - bottom) > 3: print(f'  note {sid}: content bottom row old {old_bottom} new {bottom}')
    out.save(OUT / 'sprites' / f'{sid}.webp', quality=95, method=4, exact=True)
    x = CENTER_X[sid] - w / 2; y = entry['rectWorld'][1]
    entry['rectWorld'] = [round(x, 4), round(y, 4), round(w, 4), round(h, 4)]
    entry['v'] = '20261113-rails'    # cache-bust token the sprite loader appends (same file name, new picture)
    print(sid, 'crop', (x0, y0, x1, y1), 'size', size, 'foot px', (round(u, 1), bottom), 'rectWorld', entry['rectWorld'])
(OUT / 'sprites.json').write_text(json.dumps(sprites, ensure_ascii=False, separators=(',', ':')))
