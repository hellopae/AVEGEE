#!/usr/bin/env python3
"""เขียน img/manifest.json — รายชื่อไฟล์ภาพที่หน้าโหลดต้องดึงมาก่อนเปิดเกม

รันเองก็ได้:            python3 scripts/make-manifest.py
หรือปล่อยให้ prep-art.py เรียกให้ตอนท้าย (ดรอปรูปแล้วรัน prep-art ก็อัปเดตตาม)

แบ่งสองกอง:
  critical — ภาพที่เห็นทันทีตอนเปิด (ฉาก พื้น อาคาร ทีมงาน หน้าปก) หน้าโหลดรอกองนี้
  rest     — ภาพที่โผล่ทีหลัง (วิญญาณ เอฟเฟกต์ ไอเทม มอนสเตอร์) โหลดต่อเงียบ ๆ หลังเข้าเกม

ไฟล์หายหรือ manifest เก่า ไม่ทำให้เกมพัง — art.js ยังโหลดเองได้ตามเดิม
"""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
IMG = os.path.join(ROOT, 'img')
EXT = ('.png', '.jpg', '.jpeg', '.webp')

# ภาพที่ต้องมาก่อน — ขึ้นจอตั้งแต่เฟรมแรก (หน้าปก พื้น ฉากโซนแรก ทีมงาน)
# อาคารสถานีไม่อยู่ในนี้เพราะ art.js วาดกล่องหินแทนให้อยู่แล้วถ้าไฟล์ยังไม่มา
CRITICAL = ('cover', 'scene.png', 'tile-', 'hero-', 'crew-')


def main():
    files = sorted(f for f in os.listdir(IMG)
                   if f.lower().endswith(EXT) and not f.startswith('_'))
    crit, rest = [], []
    for f in files:
        (crit if f.startswith(CRITICAL) else rest).append(f)

    def mb(names):
        return sum(os.path.getsize(os.path.join(IMG, n)) for n in names) / 1048576

    out = {'critical': crit, 'rest': rest}
    with open(os.path.join(IMG, 'manifest.json'), 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=0)
    print(f'manifest.json: critical {len(crit)} ไฟล์ ({mb(crit):.1f} MB) · '
          f'rest {len(rest)} ไฟล์ ({mb(rest):.1f} MB)')


if __name__ == '__main__':
    main()
