#!/usr/bin/env python3
"""Z1-V5-FX: the new Thai canteen (owner picture #4, 11_27_46 AM) -> img/food-art/canteen-th.webp

  python3 scripts/build-canteen-th.py "<.../New Pic Map Zone1/ChatGPT Image Nov 4, 2026, 11_27_46 AM.png>"

Only the matte is cleaned; the painted pixels inside the silhouette are untouched:
  * pixels with alpha < 250 (the soft halo that carries the red / yellow fringe) take the colour of the nearest solid pixel
  * alpha is choked a little (below 70 -> 0, 255 stays 255) so no halo line is left
  * cropped to the silhouette (+2 px) and shrunk to 768 px wide (the old canteen-th.webp was 768x640)
The foot of the stone foundation is the bottom row, so canteen-art-layout.js can place it by one number (CANTEEN_ART_FOOT_Y.th).
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / 'img/food-art/canteen-th.webp'
im = np.asarray(Image.open(src).convert('RGBA')).copy()
a = im[..., 3].astype(np.float32)
solid = a >= 250
_, (iy, ix) = distance_transform_edt(~solid, return_indices=True)
edge = ~solid
im[edge, :3] = im[iy[edge], ix[edge], :3]
a = np.clip((a - 70) / (255 - 70), 0, 1) * 255
im[..., 3] = np.round(a).astype(np.uint8)
img = Image.fromarray(im, 'RGBA')
box = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
x0, y0, x1, y1 = box
img = img.crop((max(0, x0 - 2), max(0, y0 - 2), min(img.width, x1 + 2), min(img.height, y1 + 2)))
h = round(img.height * 768 / img.width)
img = img.resize((768, h), Image.LANCZOS)
img.save(out, quality=92, method=6)
print(out, img.size, 'foundation foot at', 1 - 2 / img.height)
