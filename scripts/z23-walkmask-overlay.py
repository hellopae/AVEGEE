#!/usr/bin/env python3
"""Z23-GROUND: owner walkmask (src/town-owner-walkmask-<zone>.js, 480 x 320 cells of 8 world units) drawn as a yellow outline + red tint over the OLD 1x | NEW 2x ground at the evidence spots.
  python3 scripts/z23-walkmask-overlay.py <outdir>      -> <outdir>/<zone>-<spot>-walkmask.jpg  (1000 x 1000 world-crop 2x, old enlarged 2x to the same pixel size)
Edges of the walkable area that do not follow the painted stairs / bridges / water in the NEW panel are structure drift."""
import re, sys, os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parent.parent
SPOTS = {'asia': ('map-zone2', 'v2', {'main-plaza': (1941, 1070), 'central-bridge': (1926, 1750), 'lava-bank': (1051, 1200), 'heaven-gate': (2540, 380)}),
         'west': ('map-zone3', 'v1', {'main-plaza': (1941, 1043), 'central-bridge': (1926, 1720), 'west-cliffs': (1051, 1200), 'north-stairs': (430, 480)})}
def canvas(folder, ver, tile, full):
    W, H = full; c = np.zeros((H, W, 3), np.uint8)
    for r in range(1, -(-H // tile) + 1):
        for k in range(1, -(-W // tile) + 1):
            im = np.asarray(Image.open(ROOT / f'img/{folder}/{ver}/r{r}-c{k}.webp').convert('RGB')); y, x = (r-1)*tile, (k-1)*tile; c[y:y+im.shape[0], x:x+im.shape[1]] = im
    return c
def mask(zone):
    runs = [int(v) for v in re.search(r'TOWN_OWNER_WALK_RUNS=\[([\d,]+)\]', (ROOT / f'src/town-owner-walkmask-{zone}.js').read_text()).group(1).split(',')]
    m = np.zeros(480 * 320, np.uint8); i = 0; walk = 0
    for r in runs: m[i:i+r] = walk; i += r; walk ^= 1
    return m.reshape(320, 480)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
for zone, (folder, old, spots) in SPOTS.items():
    m = mask(zone); new = canvas(folder, 'v7', 1024, (9830, 6554)); oldc = canvas(folder, old, 1024, (4915, 3277))
    for name, (wx, wy) in spots.items():
        panels = []
        for img, k in ((oldc, 4915 / 3840), (new, 9830 / 3840)):
            half = 250 * k; x0, y0 = int(wx * k - half), int(wy * k - half); x1, y1 = int(wx * k + half), int(wy * k + half)
            x0, y0 = max(0, min(x0, img.shape[1] - (x1 - x0))), max(0, min(y0, img.shape[0] - (y1 - y0)))
            crop = img[y0:y0 + (y1 - y0), x0:x0 + (x1 - x0)].astype(np.float32)
            yy, xx = np.mgrid[y0:y0 + crop.shape[0], x0:x0 + crop.shape[1]]
            cx = np.clip((xx / k / 8).astype(int), 0, 479); cy = np.clip((yy / k / 8).astype(int), 0, 319); blocked = m[cy, cx] == 0
            crop[blocked] = crop[blocked] * .6 + np.array([255, 0, 0]) * .4
            edge = (blocked ^ np.roll(blocked, 1, 0)) | (blocked ^ np.roll(blocked, 1, 1)); crop[edge] = [255, 255, 0]
            panels.append(Image.fromarray(crop.astype(np.uint8)).resize((1000, 1000), Image.Resampling.LANCZOS))
        c = Image.new('RGB', (2012, 1000), (20, 20, 20)); c.paste(panels[0], (0, 0)); c.paste(panels[1], (1012, 0))
        ImageDraw.Draw(c).text((8, 8), f'{zone}/{name}  OLD 1x | NEW 2x (red = not walkable, yellow = edge)', fill='white')
        q = 80
        while True:
            c.save(out / f'{zone}-{name}-walkmask.jpg', quality=q)
            if os.path.getsize(out / f'{zone}-{name}-walkmask.jpg') <= 750000 or q < 45: break
            q -= 6
        print(zone, name, os.path.getsize(out / f'{zone}-{name}-walkmask.jpg') // 1024, 'KB')
