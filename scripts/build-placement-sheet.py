#!/usr/bin/env python3
"""FX5: the whole zone-1 ground (v7r tiles) as ONE picture with a world grid, for the owner to mark where trees / bushes / lamp posts go.
  python3 scripts/build-placement-sheet.py <out.jpg>
Scale: 0.625 sheet px per world unit (world 3840x2560 -> 2400x1600). Thin line every 100 world units, bold line + number every 500, small labels every 200 on both edges
so a mark can be read back as world = (px - 40) / 0.625.  A 40 px margin on every side carries the numbers. Pure measuring aid: nothing is drawn on the map itself."""
import sys, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]); K = .625; M = 40
W, H = 3840, 2560
G = Image.new('RGB', (W, H))
for r in range(1, 8):
    for c in range(1, 11):
        t = Image.open(ROOT / f'img/map-zone1/v7r/r{r}-c{c}.webp').convert('RGB')
        x0, y0 = round((c - 1) * 1024 * W / 9830), round((r - 1) * 1024 * H / 6554)
        w, h = round(t.width * W / 9830), round(t.height * H / 6554)
        G.paste(t.resize((w, h), Image.LANCZOS), (x0, y0))
G = G.resize((round(W * K), round(H * K)), Image.LANCZOS)
sheet = Image.new('RGB', (G.width + 2 * M, G.height + 2 * M), (24, 18, 28)); sheet.paste(G, (M, M))
d = ImageDraw.Draw(sheet, 'RGBA')
try: f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 15); fb = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 19)
except Exception: f = fb = ImageFont.load_default()
for v in range(0, W + 1, 100):
    x = M + v * K; big = v % 500 == 0
    d.line([(x, M), (x, M + H * K)], fill=(255, 255, 255, 120 if big else 48), width=2 if big else 1)
    if v % 200 == 0 or big:
        for y in (6, M + H * K + 8): d.text((x - 12, y), str(v), fill=(255, 235, 150) if big else (230, 230, 230), font=fb if big else f)
for v in range(0, H + 1, 100):
    y = M + v * K; big = v % 500 == 0
    d.line([(M, y), (M + W * K, y)], fill=(255, 255, 255, 120 if big else 48), width=2 if big else 1)
    if v % 200 == 0 or big:
        for x in (2, M + W * K + 6): d.text((x, y - 8), str(v), fill=(255, 235, 150) if big else (230, 230, 230), font=fb if big else f)
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT, quality=84)
print(sheet.size, OUT.stat().st_size // 1024, 'KB')
