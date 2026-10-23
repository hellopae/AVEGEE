#!/usr/bin/env python3
"""P9: zone-agnostic height fit of a worker v2 sheet (4 columns x N rows of 320 px cells) against the SAME zone's v1 standing height.

  python3 -I scripts/measure-worker-fit.py <zone>            # reads img/workers/worker-<zone>-sheet-{v1,v2}.webp

height = alpha (>40) bounding-box height per frame, row mean. target = mean height of v1 row 0 (the standing pose of this zone).
Upright rows (3 escort, 4 down, 5 up, 9 supervise, 10/11 carry) get scale = target / mean only when they miss the target by more than 2 %.
Crouch / lean rows (6 chop, 7 collect, 8 repair) are NOT scaled: they are shorter because the body is lower, the head is drawn at the same size
(scaling them to the standing height blows the head up ~10 % — see P5c note 1). Never edits an image. Prints the JS to paste into src/workers.js.
"""
import sys
import numpy as np
from PIL import Image

UPRIGHT = (3, 4, 5, 9, 10, 11)

def mean_h(im, row):
    hs = []
    for c in range(4):
        a = im[row*320:(row+1)*320, c*320:(c+1)*320, 3] > 40
        ys, _ = np.where(a)
        hs.append(ys.max() - ys.min() + 1)
    return float(np.mean(hs))

def main():
    zone = sys.argv[1]
    v1 = np.array(Image.open(f'img/workers/worker-{zone}-sheet-v1.webp').convert('RGBA'))
    v2 = np.array(Image.open(f'img/workers/worker-{zone}-sheet-v2.webp').convert('RGBA'))
    target = mean_h(v1, 0)
    print(f'{zone}: v1 standing height {target:.2f} px')
    fit = []
    for r in range(3, v2.shape[0] // 320):
        h = mean_h(v2, r); dev = h / target - 1
        act = r in UPRIGHT and abs(dev) > 0.02
        scale = round(target / h, 3)
        print(f' row {r:>2}  mean_h {h:6.1f}  {dev*100:+5.1f}%  {"upright" if r in UPRIGHT else "crouch/lean (not scaled)"}  {"-> scale "+str(scale) if act else ""}')
        if act: fit.append((r, scale))
    print('\nJS: ' + ','.join(f'{r}:{{scale:{s}}}' for r, s in fit))

main()
