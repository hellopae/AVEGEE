"""FB2-A item 2 (owner 13 Nov 2569): the bank-foam of the ice water (img/map-zone1/v5-fx/masks/foam-ice-edge.webp, drawn by the 'bank-foam-ice--edge' piece of
fx-layout.json: horizontal white foam streaks, 'screen' .6) spilled onto the rock face to the right of the east icefall (master px about 4651-4739 x 1068-1167).
This script CUTS the mask (data, not art): inside the listed windows an alpha pixel is kept only when the v7r ground under it is water-coloured (blue / cyan) or foam-white,
plus a 3 px border; everything else in the window goes to alpha 0.  Nothing outside the windows changes (verified: 0 px), no art pixel is touched.
  python3 -I scripts/cut-foam-mask-z1.py [--dry]      (reads / rewrites img/map-zone1/v5-fx/masks/foam-ice-edge.webp, lossless; keeps the original once in art-src/z1-foam-mask/foam-ice-edge.orig.webp (not deployed))
Master space = 4915 x 3277 (the v7r ground is 2x of it)."""
import sys, shutil
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT = Path(__file__).resolve().parent.parent
MASK = ROOT / 'img/map-zone1/v5-fx/masks/foam-ice-edge.webp'
ORIG = ROOT / 'art-src/z1-foam-mask/foam-ice-edge.orig.webp'
TILES = ROOT / 'img/map-zone1/v7r'
RX, RY = 2985, 488                      # maskRectPx origin of the piece (fx-layout.json)
WINDOWS = [(4600, 1020, 220, 240)]      # master px [x, y, w, h]: the east icefall corner
T = 1024
def ground(x0, y0, x1, y1):
    out = np.zeros((y1 - y0, x1 - x0, 3), np.uint8)
    for r in range(y0 // T, (y1 - 1) // T + 1):
        for c in range(x0 // T, (x1 - 1) // T + 1):
            t = np.array(Image.open(TILES / f'r{r + 1}-c{c + 1}.webp').convert('RGB'))
            gx, gy = c * T, r * T
            sx0, sx1, sy0, sy1 = max(x0, gx), min(x1, gx + t.shape[1]), max(y0, gy), min(y1, gy + t.shape[0])
            out[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = t[sy0 - gy:sy1 - gy, sx0 - gx:sx1 - gx]
    return out
def waterish(g):
    """water / spray: red far below blue (waterfall 3,167,243 / 15,106,177) or foam-white (175,201,234); the rock here is 72,96,140 / 51,71,103 (red ~0.5 x blue)."""
    f = g.astype(float); r, b = f[..., 0], f[..., 2]
    return ((r < .32 * b) & (b > 100)) | (f.min(2) > 150)
def main(dry=False):
    if not ORIG.exists() and not dry: shutil.copy(MASK, ORIG)
    src = ORIG if ORIG.exists() else MASK
    m = np.array(Image.open(src).convert('RGBA')); out = m.copy(); changed = 0
    for (x, y, w, h) in WINDOWS:
        g = ground(x * 2, y * 2, (x + w) * 2, (y + h) * 2)
        keep = ndi.binary_dilation(waterish(g), iterations=6)         # 6 ground px = 3 master px
        keep = keep.reshape(h, 2, w, 2).mean((1, 3)) > .4              # to master px
        ys, xs = y - RY, x - RX
        win = out[ys:ys + h, xs:xs + w, 3]
        cut = (win > 0) & ~keep
        changed += int(cut.sum()); win[cut] = 0
        lab, n = ndi.label(win > 0)                                    # white snow tips on the rock pass the colour test: drop the small islands left behind
        if n:
            sizes = ndi.sum(win > 0, lab, range(1, n + 1))
            for i, a in enumerate(sizes, 1):
                if a < 120: changed += int(a); win[lab == i] = 0
    diff = (out != m).any(2); outside = diff.copy()
    for (x, y, w, h) in WINDOWS: outside[y - RY:y - RY + h, x - RX:x - RX + w] = False
    print('alpha px cut:', changed, ' changed outside the windows:', int(outside.sum()), ' foam px', int((m[..., 3] > 0).sum()), '->', int((out[..., 3] > 0).sum()))
    assert outside.sum() == 0
    if not dry: Image.fromarray(out).save(MASK, lossless=True, exact=True)
if __name__ == '__main__': main('--dry' in sys.argv)
