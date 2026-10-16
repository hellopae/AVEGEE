#!/usr/bin/env python3
"""N1 (16 ต.ค. 2569): clip the Zone 1 dock walk mask to the painted pier (img/map-zone1/v4), feet-based.
Before: the mask ran 15-30 units past the stone top (front face, right post, water on the right) so Yama's feet and
gold ring ended up on the water. Only cells inside DOCK_BOX are rewritten (white iff the cell centre is inside DOCK_FEET);
the plaza above y=1698 and everything else keep the traced mask. Idempotent. Then run build-town-walkmask.py."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parent.parent
p = root / 'art-src' / 'zone1-walkmask-v2.png'
im = Image.open(p).convert('L')
C = 8                                   # world units per cell
DOCK_BOX = (2150, 1698, 2350, 1860)     # world x0,y0,x1,y1 (y0 = first row below the dock-top plaza)
# Feet polygon (world units): stairs between their rails, then the pier top. The ring is ~23 units wide, so the
# polygon is inset from the painted rim so the gold ring stays on stone.
DOCK_FEET = [(2192,1698),(2268,1698),(2268,1746),(2290,1752),(2290,1796),(2216,1796),(2208,1764),(2194,1748),(2190,1720)]
x0,y0,x1,y1 = DOCK_BOX
mask = Image.new('L', im.size, 0)
ImageDraw.Draw(mask).polygon([(x/C, y/C) for x,y in DOCK_FEET], fill=255)
px = im.load(); mk = mask.load()
for cy in range(y0//C, y1//C):
    for cx in range(x0//C, x1//C):
        ccx, ccy = cx*C + C/2, cy*C + C/2
        inside = False
        # point-in-polygon on the cell centre (PIL polygon fill is edge-inclusive, so test explicitly)
        pts = DOCK_FEET; j = len(pts)-1
        for i in range(len(pts)):
            ax,ay = pts[i]; bx,by = pts[j]
            if (ay > ccy) != (by > ccy) and ccx < (bx-ax)*(ccy-ay)/(by-ay)+ax: inside = not inside
            j = i
        px[cx, cy] = 255 if inside else 0
im.save(p)
print('clipped dock cells in', DOCK_BOX)
