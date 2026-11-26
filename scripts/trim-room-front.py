#!/usr/bin/env python3
"""FB3-T7b (owner map4-zoom): the "front" layers of the Zone 1 rooms (img/rooms-wide/th-<room>-front-v1.webp, drawn OVER the actors) carried wedges of FLOOR above the rail
(triangles of tiles where the cut-out was sloppy). They match the background pixel for pixel, so they were invisible - but they hid Yama's body when he stood above the rail.
This keeps only what is really in front: the opaque shape is opened with a disc (thin spikes go), and inside what the opening removed every FLOOR-coloured pixel (grey-brown, low saturation)
is made transparent; saturated pixels (flames, gold, lacquer) and everything that belongs to the rail / posts / statues stay.  Only the alpha channel changes - no pixel is recoloured.
  NOT idempotent (the top line is read from the silhouette it is given): run it on the ORIGINAL layers (git show c65fdc22:img/rooms-wide/th-<room>-front-v1.webp), never on its own output.
  python3 scripts/trim-room-front.py [--sheet DIR] [--dry]   (writes the files in place; --sheet also saves before/after sheets on pink + the removed pixels in cyan)"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = Path(__file__).resolve().parent.parent
ROOMS = ('krata', 'lan', 'tarang', 'canteen', 'tea')
MARGIN = 3
# per room: (window px, [x ranges that keep their tall objects])
ROOM_RULES = {'krata':(110,[(245,345)]), 'lan':(110,[(600,800),(945,1140)]), 'tarang':(110,[(530,730),(990,1190)]), 'canteen':None, 'tea':None}   # canteen / tea: diagonal rails, no wedges found
SAT_MAX = .30     # floor = low saturation ...
VAL_LO, VAL_HI = .30, .78   # ... and mid brightness
BG = {'krata':'img/rooms-wide/th-krata-v2.webp','lan':'img/rooms-wide/th-lan-v2.webp','tarang':'img/rooms-wide/th-tarang-v2.webp','canteen':'img/food-art/interior-th.webp','tea':'img/tea-th-recovery-v2.webp'}
CURRENT = {}
def disc(r): y, x = np.ogrid[-r:r + 1, -r:r + 1]; return x * x + y * y <= r * r
def trim(im, window, keep):
    """Everything of the layer that stands higher than the rail's own top line is cut away, EXCEPT the boxes in `keep` (real tall objects: a pedestal, a gate pillar, a statue).
    The top line B(x) is the lowest top the silhouette has inside a window of `window` px around x: a spike / wedge / finial narrower than the window never lifts it, a long rail lifts it only by its own height."""
    a = np.asarray(im).copy(); alpha = a[..., 3] > 16; H, W = alpha.shape
    top = np.where(alpha.any(0), alpha.argmax(0), H)                     # first opaque row of each column
    base = ndi.maximum_filter1d(top.astype(float), size=window, mode='nearest')   # the lowest top within the window = the rail's own top line
    base = ndi.uniform_filter1d(base, size=max(5, window // 6), mode='nearest')
    rows = np.arange(H)[:, None]
    kill = alpha & (rows < base[None, :] - MARGIN)
    for x0, x1 in keep: kill[:, x0:x1 + 1] = False
    a[kill, 3] = 0
    return Image.fromarray(a, 'RGBA'), kill, base
def pink(im):
    bg = Image.new('RGBA', im.size, (255, 0, 255, 255)); bg.alpha_composite(im); return bg.convert('RGB')
if __name__ == '__main__':
    sheet = Path(sys.argv[sys.argv.index('--sheet') + 1]) if '--sheet' in sys.argv else None
    for name in ROOMS:
        p = ROOT / f'img/rooms-wide/th-{name}-front-v1.webp'; im = Image.open(p).convert('RGBA'); CURRENT['name'] = name; rule = ROOM_RULES[name]
        if not rule: print(name, 'left as it is'); continue
        out, kill, base = trim(im, *rule)
        print(name, im.size, 'made transparent:', int(kill.sum()), 'px of', int((np.asarray(im)[..., 3] > 16).sum()))
        if sheet:
            sheet.mkdir(parents=True, exist_ok=True)
            b = np.asarray(pink(im)).copy(); b[kill] = (0, 255, 255)
            Image.fromarray(b).resize((im.width // 2, im.height // 2)).save(sheet / f'front-{name}-removed-cyan.png')
        if '--dry' not in sys.argv: out.save(p, lossless=True, quality=100, method=6)
