#!/usr/bin/env python3
"""before (v7) | after (v7r) crops of the 7 spots, context + margin, output px (2x map)."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
S = Path.home() / 'agapae-work/.toby-scratch/z1-v7r'
spots = json.load(open(S / 'seam-report.json'))
a7 = np.load(S / 'atlas-v7.npy', mmap_mode='r'); ar = np.load(S / 'atlas-v7r.npy', mmap_mode='r')
out = Path(sys.argv[1]) if len(sys.argv) > 1 else S / 'compare'; out.mkdir(parents=True, exist_ok=True)
M = 40
for sid, d in spots.items():
    if sid.startswith('_'): continue
    x0, y0, x1, y1 = [v * 2 for v in d['context1x']]
    X0, Y0, X1, Y1 = max(0, x0-M), max(0, y0-M), min(9830, x1+M), min(6554, y1+M)
    A = Image.fromarray(np.array(a7[Y0:Y1, X0:X1])); B = Image.fromarray(np.array(ar[Y0:Y1, X0:X1]))
    for im in (A, B):
        dr = ImageDraw.Draw(im); dr.rectangle([x0-X0, y0-Y0, x1-X0-1, y1-Y0-1], outline=(0, 255, 255))
        k = [v*2 for v in d['core1x']]; dr.rectangle([k[0]-X0, k[1]-Y0, k[2]-X0-1, k[3]-Y0-1], outline=(255, 0, 255))
    w, h = A.size; sheet = Image.new('RGB', (w*2+8, h), (20, 20, 20)); sheet.paste(A, (0, 0)); sheet.paste(B, (w+8, 0))
    sheet.save(out / f'{sid}-v7-vs-v7r.jpg', quality=88)
    # clean (no outlines) after crop for zoom judgement
    A = Image.fromarray(np.array(a7[Y0:Y1, X0:X1])); B = Image.fromarray(np.array(ar[Y0:Y1, X0:X1]))
    sheet = Image.new('RGB', (w*2+8, h), (20, 20, 20)); sheet.paste(A, (0, 0)); sheet.paste(B, (w+8, 0)); sheet.save(out / f'{sid}-clean.jpg', quality=90)
    print(sid, sheet.size)
