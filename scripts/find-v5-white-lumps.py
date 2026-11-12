#!/usr/bin/env python3
"""Z1-V5-FX2: list the white / lavender fog lumps painted INTO the v5 ground (owner 5 Nov: delete them when Codex repaints the ground).

Pale (low saturation, bright) + smooth (low local texture) pixels of the v5 master, closed and filtered by area.  Output: JSON (world + v5 master px +
chunk ids + 2x v7 px) and an overlay picture.  Detection is colour / smoothness only: every box was looked at in the overlay (docs/art-reviews/2026-11-05-z1-v5-fx2/white-lumps-overlay.jpg).
  python3 scripts/find-v5-white-lumps.py <out.json> <overlay.jpg>
"""
import json, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
M = Image.new('RGB', (4915, 3277))
for r in range(1, 5):
    for c in range(1, 6):
        M.paste(Image.open(ROOT / f'img/map-zone1/v5/r{r}-c{c}.webp').convert('RGB'), ((c - 1) * 1024, (r - 1) * 1024))
a = np.asarray(M)
SKY_BAND = 440      # master px (y)
hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV).astype(int)
gray = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(np.float32)
mean = cv2.blur(gray, (21, 21)); sq = cv2.blur(gray * gray, (21, 21)); std = np.sqrt(np.maximum(sq - mean * mean, 0))
pale = (hsv[..., 1] < 95) & (hsv[..., 2] > 135) & (std < 26)
pale[:SKY_BAND] = False      # the sky / cloud-sea band above the heaven gate is meant to be white (the painted cloud-sea), not a lump
pale = cv2.morphologyEx(pale.astype(np.uint8) * 255, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
pale = cv2.morphologyEx(pale, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
n, lab, stats, cen = cv2.connectedComponentsWithStats((pale > 0).astype(np.uint8), 8)
K = 3840 / 4915
out, over = [], a.copy()
# looked at in the overlay: the two pale stone plazas of the ice zone are smooth + bright too, but they are floor, not fog
NOT_FOG = {(3321, 409): 'false positive - pale stone plaza of the ice zone (keep)', (3205, 784): 'false positive - grey stone plaza of the ice zone (keep)'}
for i in range(1, n):
    x, y, w, h, area = stats[i]
    if area < 4500:
        continue
    meanv = float(hsv[..., 2][lab == i].mean())
    if meanv < 165:          # grey stone plazas of the ice zone are smooth and low-saturation too, but darker than fog
        continue
    box = dict(id=f'lump-{len(out):02d}', masterPx=[int(x), int(y), int(w), int(h)], worldRect=[round(x * K), round(y * K), round(w * K), round(h * K)],
               areaWorld=round(area * K * K), meanBrightness=round(meanv), v7Px2x=[int(x * 2), int(y * 2), int(w * 2), int(h * 2)],
               chunks=sorted({f'r{r}-c{c}' for r in range(y // 1024 + 1, (y + h - 1) // 1024 + 2) for c in range(x // 1024 + 1, (x + w - 1) // 1024 + 2)}))
    box['review'] = NOT_FOG.get(tuple(box['worldRect'][:2]), 'fog lump - delete when the ground is repainted')
    out.append(box)
    cv2.rectangle(over, (int(x), int(y)), (int(x + w), int(y + h)), (0, 255, 255), 5)
    cv2.putText(over, box['id'], (int(x) + 8, int(y) + 40), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 255, 255), 4)
Path(sys.argv[1]).write_text(json.dumps({'note': 'white / lavender fog lumps painted into v5 (owner: delete). masterPx = 4915x3277 v5 pixels, worldRect = 3840x2560 world units, v7Px2x = same box in 9830x6554.',
                                      'method': 'S<95, V>135, local std<26 (21px), sky band y<440 ignored, open15 close31, area>=4500 master px, mean V>=165 (drops grey stone plazas)', 'count': len(out), 'toDelete': sum(1 for b in out if b['review'].startswith('fog')), 'lumps': out}, ensure_ascii=False, indent=1))
Image.fromarray(over).resize((2457, 1638), Image.LANCZOS).save(sys.argv[2], quality=85)
print(len(out), 'lumps')
