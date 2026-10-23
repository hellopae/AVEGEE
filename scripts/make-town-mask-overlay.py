#!/usr/bin/env python3
"""M2 mask tool, step 1 — make the pictures the owner paints on.

  python3 scripts/make-town-mask-overlay.py --zone asia [--ground FILE] [--out DIR]

Writes into DIR (default /Users/agapae/agapae-work/evidence/m2/mask-tool/<zone>/):
  <zone>-ground.png        the clean ground picture (1536x1024) — the zone's own preview when it exists, else --ground
  <zone>-mask-overlay.png  ground + the CURRENT walk mask as translucent red = NOT walkable (look at this one)
  <zone>-mask-layer.png    ONLY the red (transparent PNG, same size) — paint on / erase from this layer in your app
  HOWTO-mask.txt           5 lines
Step 2 (after painting) is scripts/extract-town-owner-mask.py --zone <zone> --layer <your-layer.png> --write
"""
import argparse, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZONE = {'th': ('map-zone1', 'img/map-zone1/v5/zone1-terrain-v5-preview.webp'), 'asia': ('map-zone2', 'img/map-zone2/v1/zone2-terrain-v1-preview.webp'),
        'west': ('map-zone3', 'img/map-zone3/v1/zone3-terrain-v1-preview.webp'), 'cyberhell': ('map-zone4', 'img/map-zone4/v1/zone4-terrain-v1-preview.webp')}
ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--zone', required=True, choices=sorted(ZONE)); ap.add_argument('--ground'); ap.add_argument('--out')
ap.add_argument('--alpha', type=int, default=150, help='opacity of the red (0-255)')
a = ap.parse_args()
out = a.out or f'/Users/agapae/agapae-work/evidence/m2/mask-tool/{a.zone}'
os.makedirs(out, exist_ok=True)
own = os.path.join(ROOT, ZONE[a.zone][1])
ground = a.ground or (own if os.path.exists(own) else os.path.join(ROOT, ZONE['th'][1]))
note = '' if (a.ground or os.path.exists(own)) else '  (the zone has no ground picture yet: Zone 1 ground is shown instead)'
raw = tempfile.mktemp(suffix='.raw')
print(subprocess.check_output(['node', os.path.join(ROOT, 'scripts/town-floor-dump.mjs'), a.zone, raw], text=True).strip())
walk = np.fromfile(raw, np.uint8).reshape(1024, 1536) > 0
os.remove(raw)
g = Image.open(ground).convert('RGB').resize((1536, 1024), Image.LANCZOS)
layer = np.zeros((1024, 1536, 4), np.uint8); layer[~walk] = (255, 0, 0, a.alpha)
Image.fromarray(layer, 'RGBA').save(f'{out}/{a.zone}-mask-layer.png')
g.save(f'{out}/{a.zone}-ground.png')
ov = g.convert('RGBA'); ov.alpha_composite(Image.fromarray(layer, 'RGBA')); ov.convert('RGB').save(f'{out}/{a.zone}-mask-overlay.png')
open(f'{out}/HOWTO-mask.txt', 'w').write(f"""วิธีวาด mask เดินได้ของ {a.zone}
1. เปิด {a.zone}-ground.png (ภาพพื้นสะอาด) เป็นเลเยอร์ล่าง แล้ววาง {a.zone}-mask-layer.png (สีแดง = เดินไม่ได้) ทับเป็นเลเยอร์บน — {a.zone}-mask-overlay.png คือภาพที่รวมแล้วไว้ดู
2. แก้เฉพาะเลเยอร์แดง: ปาดแดงเพิ่มตรงที่ต้องการให้เดินไม่ได้ · ลบแดงออกตรงที่ต้องการให้เดินได้ (ใช้ยางลบ) — สีแดงสีไหนก็ได้ ขอแค่มีความทึบ
3. ส่งออกเลเยอร์แดงเป็น PNG พื้นหลังโปร่งใส ขนาด 1536x1024 เท่าเดิม (ห้ามย่อ/ขยาย) ตั้งชื่อ {a.zone}-mask-layer-edited.png
4. ส่งไฟล์ให้ Toby · Toby รัน: python3 scripts/extract-town-owner-mask.py --zone {a.zone} --layer {a.zone}-mask-layer-edited.png --write
5. เปิดเกมโซนนั้น เดินลองตามถนน/บันได/สะพาน แล้วบอก Toby จุดที่ยังเดินผิด{note}
""")
print(f'wrote {out}{note}')
