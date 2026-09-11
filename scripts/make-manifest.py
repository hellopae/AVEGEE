#!/usr/bin/env python3
"""เขียน img/manifest.json — รายชื่อไฟล์ภาพที่หน้าโหลดต้องดึงมาก่อนเปิดเกม

รันเองก็ได้:            python3 scripts/make-manifest.py
หรือปล่อยให้ prep-art.py เรียกให้ตอนท้าย (ดรอปรูปแล้วรัน prep-art ก็อัปเดตตาม)

แบ่งสองกอง:
  critical — ภาพที่เห็นทันทีตอนเปิด (ฉาก พื้น อาคาร ทีมงาน หน้าปก) หน้าโหลดรอกองนี้
  rest     — ภาพที่โผล่ทีหลัง (วิญญาณ เอฟเฟกต์ ไอเทม มอนสเตอร์) โหลดต่อเงียบ ๆ หลังเข้าเกม

ไฟล์หายหรือ manifest เก่า ไม่ทำให้เกมพัง — art.js ยังโหลดเองได้ตามเดิม

zones — รูปของโซน 2-3 ในโฟลเดอร์ย่อย (img/Asia/ img/West/) แยกตาม zone k (ชื่อโฟลเดอร์ตัวเล็ก)
  art.js ใช้รายชื่อนี้ตัดสินว่าคีย์ไหนมีรูปของโซนนั้น — ไม่ต้องยิงถามทีละไฟล์จน 404 เต็มคอนโซล
  **ดรอปรูปโซนแล้วต้องรัน prep-art.py (หรือสคริปต์นี้) ไม่งั้นเกมไม่รู้ว่ามีไฟล์ใหม่**
  preload.js โหลดชุดของโซนที่เซฟค้างอยู่ให้ด้วย ส่วนโซนอื่นโหลดตอนย้ายไปถึง

boxes — กรอบเนื้อภาพ (ส่วนที่ทึบ) ของอาคาร st-* ทุกไฟล์ เป็นสัดส่วน 0-1 ของผืนจัตุรัส
  art.js ใช้บีบอาคารของโซนอื่นให้อยู่ในกรอบเนื้อภาพของอาคารโซน 1 หลังเดียวกัน
  (รูปโซน 2 สัดส่วนไม่ตรงโซน 1 หลายหลัง — ถ้าวาดเต็มจัตุรัสจะล้นทับทางเดินกับหลังข้าง ๆ)
"""
import json, os
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
IMG = os.path.join(ROOT, 'img')
EXT = ('.png', '.jpg', '.jpeg', '.webp')

# ภาพที่ต้องมาก่อน — ขึ้นจอตั้งแต่เฟรมแรก (หน้าปก พื้น ฉากโซนแรก ทีมงาน)
# อาคารสถานีไม่อยู่ในนี้เพราะ art.js วาดกล่องหินแทนให้อยู่แล้วถ้าไฟล์ยังไม่มา
CRITICAL = ('cover', 'scene.png', 'tile-', 'hero-', 'crew-')


def main():
    # ชื่อ asset ของเกมขึ้นต้นด้วยตัวเล็กเสมอ (ยกเว้น BG-*) — ไฟล์อื่นที่วางไว้ใน img/ เช่น
    # Zone1.png Zone2.png Zone3.png (ภาพคอนเซปต์ที่เจ้าของใช้เทียบ 11 ก.ย. 2569) ไม่ใช่ของที่เกมโหลด
    # ถ้าหลุดเข้า manifest หน้าโหลดจะดึงไฟล์ละ 1.3 MB มาเปล่า ๆ และ 404 บนเว็บเพราะไม่ได้ commit
    files = sorted(f for f in os.listdir(IMG)
                   if f.lower().endswith(EXT) and not f.startswith('_')
                   and (f[0].islower() or f.startswith('BG-')))
    crit, rest = [], []
    for f in files:
        (crit if f.startswith(CRITICAL) else rest).append(f)

    def mb(names):
        return sum(os.path.getsize(os.path.join(IMG, n)) for n in names) / 1048576

    zones = {}
    for sub in sorted(os.listdir(IMG)):
        d = os.path.join(IMG, sub)
        if sub == 'raw' or sub.startswith(('_', '.')) or not os.path.isdir(d):
            continue
        names = sorted(f for f in os.listdir(d) if f.lower().endswith(EXT) and not f.startswith(('_', '.')))
        if names:
            zones[sub.lower()] = [f'{sub}/{f}' for f in names]

    boxes = {}
    for rel in [f for f in files if f.startswith('st-')] + [p for v in zones.values() for p in v if p.split('/')[-1].startswith('st-')]:
        im = Image.open(os.path.join(IMG, rel))
        if im.mode != 'RGBA' or im.width != im.height:
            continue
        b = im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
        if b:
            boxes[os.path.splitext(rel.split('/')[-1])[0]] = [round(v / im.width, 4) for v in b]

    out = {'critical': crit, 'rest': rest, 'zones': zones, 'boxes': boxes}
    with open(os.path.join(IMG, 'manifest.json'), 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=0)
    print(f'manifest.json: critical {len(crit)} ไฟล์ ({mb(crit):.1f} MB) · '
          f'rest {len(rest)} ไฟล์ ({mb(rest):.1f} MB)'
          + ''.join(f' · {z} {len(v)} ไฟล์ ({mb(v):.1f} MB)' for z, v in zones.items()))


if __name__ == '__main__':
    main()
