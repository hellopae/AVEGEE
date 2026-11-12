#!/usr/bin/env python3
"""Z1-V5-FX: cloud SHADOW textures for the ground, cut from the alpha of Kittanate's painted clouds.

  python3 scripts/build-cloud-shadows.py <owner-cloud.png> <dir with cloud-01..04.webp>

Each painted cloud (the owner's #27 cloud, plus the first frame of cloud-01..04 of the FX-ART-Z1 sheets, 296x160 per frame)
is reduced to its silhouette: black RGB, alpha = the cloud's own alpha, cropped to the silhouette, widened to 512 px and blurred so the
edge is soft and a little fatter than the cloud. Only the alpha is used; the painted colours are never read.
The game multiplies by MAP_FX.cloud.peakByZone.th (.32), so the darkness stays as it was.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

owner = Path(sys.argv[1]); sheets = Path(sys.argv[2])
out = Path(__file__).resolve().parent.parent / 'img/map-zone1/v5-fx'
out.mkdir(parents=True, exist_ok=True)
sources = [Image.open(owner).convert('RGBA')]
for n in range(1, 5):
    sheet = Image.open(sheets / f'cloud-0{n}.webp').convert('RGBA')
    fw = sheet.width // 6
    sources.append(sheet.crop((0, 0, fw, sheet.height)))
W = 512
for i, im in enumerate(sources, 1):
    a = im.getchannel('A')
    box = a.point(lambda v: 255 if v > 24 else 0).getbbox()
    a = a.crop(box)
    pad = 72
    a = a.resize((W - 2 * pad, round(a.height * (W - 2 * pad) / a.width)), Image.LANCZOS)
    canvas = Image.new('L', (W, a.height + 2 * pad), 0)
    canvas.paste(a, (pad, pad))
    soft = canvas.filter(ImageFilter.GaussianBlur(24))
    v = np.asarray(soft, np.float32) / 255
    v = np.clip(v / .5, 0, 1)                 # fatten: the blurred skirt reaches full strength inside the silhouette
    v = v * v * (3 - 2 * v)                    # smoothstep: flat core, soft shoulder
    rgba = np.zeros(v.shape + (4,), np.uint8)
    rgba[..., 3] = np.round(v * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(out / f'cloud-shadow-{i}.webp', lossless=True, method=6)
    print(i, rgba.shape[1], rgba.shape[0], 'aspect %.2f' % (rgba.shape[1] / rgba.shape[0]))
