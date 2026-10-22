#!/usr/bin/env python3
"""P5c: measure a worker v2 sheet (4 columns x N rows of 320 px cells) and print the fit table for src/workers.js.

  python3 -I scripts/measure-worker-sheet.py img/workers/worker-th-sheet-v2.webp [first_row=3] [target_h=308] [band=35]

height = alpha bounding-box height per frame (alpha > 40), row mean. 308 px = standing height of the v1 sheet.
foot x = centroid of red skin pixels in the bottom `band` px (feet only, props ignored), row mean.
scale = target_h / mean height. dx = 160 - foot x (source px the art moves right so the feet sit on the cell centre).
Never edits the image; rows before first_row (v1 copies) are not listed.
"""
import sys
import numpy as np
from PIL import Image

def main():
    path = sys.argv[1]
    first = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    target = float(sys.argv[3]) if len(sys.argv) > 3 else 308.0
    band = int(sys.argv[4]) if len(sys.argv) > 4 else 35
    im = np.array(Image.open(path).convert('RGBA'))
    rows = im.shape[0] // 320
    fit = []
    print('row  heights(4 frames)        mean_h  scale   foot x(4 frames)         mean_f  dx')
    for r in range(first, rows):
        hs, fs = [], []
        for c in range(4):
            a = im[r*320:(r+1)*320, c*320:(c+1)*320]
            al = a[:, :, 3] > 40
            ys, _ = np.where(al)
            top, bot = ys.min(), ys.max()
            R, G, B = [a[:, :, i].astype(int) for i in range(3)]
            skin = al & (R > 140) & (G < 90) & (B < 80) & (R - G > 80)
            skin[:bot - band, :] = False
            _, xs = np.where(skin)
            hs.append(int(bot - top + 1)); fs.append(float(xs.mean()))
        mh, mf = float(np.mean(hs)), float(np.mean(fs))
        scale, dx = round(target / mh, 3), int(round(160 - mf))
        fit.append((r, scale, dx))
        print(f"{r:>3}  {str(hs):<24} {mh:6.1f}  {scale:.3f}  {' '.join(f'{f:5.0f}' for f in fs):<24} {mf:6.1f}  {dx:+d}")
    print('\nJS: ' + ','.join(f"{r}:{{scale:{s},dx:{d}}}" for r, s, d in fit))

main()
