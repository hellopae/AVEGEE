#!/usr/bin/env python3
"""เตรียมรูปที่ gen มาให้พร้อมใช้ในเกม

วางไฟล์ดิบไว้ที่  img/raw/<key>.png   แล้วรัน:
    python3 scripts/prep-art.py

ทำให้ 4 อย่าง (ต่อยอดจาก AGAPAE Agent/scripts/make-sprites.py):
  1. ตัดขอบโปร่งทิ้ง  — generator ชอบทิ้งขอบใสไว้เยอะ ทำให้ของดูลอยและเล็กกว่าตัวอื่น
  2. วางลงผืนจัตุรัส 512×512 ชิดขอบล่าง — ทุกชิ้นจะยืนบนพื้นระดับเดียวกันในเกม
  3. ลด palette เหลือ 96 สี ไม่ dither — ภาพ pixel/cel-shade อยู่แล้ว แทบไม่เสียรายละเอียด ไฟล์เล็กลงครึ่งหนึ่ง
  4. เซฟไปที่ img/<key>.png ซึ่งเป็นชื่อที่ art.js มองหาอยู่ — ดรอปแล้วเกมเปลี่ยนหน้าตาทันที

key ที่เกมมองหา:
  tileset · st-krata st-ngiw st-raeng st-lin st-lohak st-lan st-tea st-sala
  crew-taan crew-nira crew-plerng crew-kan crew-boon crew-dam
"""
from PIL import Image
import os, sys

SIZE = 512
PAT  = 256         # ขนาดผืน pattern ของพื้น (ต้องตรงกับ PAT ใน src/art.js)
COLORS = 96
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(ROOT, 'img', 'raw')
OUT = os.path.join(ROOT, 'img')

def prep(path, name):
    im = Image.open(path).convert('RGBA')
    # 1. ตัดขอบใส — ต้องใช้ threshold ไม่ใช่ getbbox() ตรง ๆ
    #    generator ทิ้ง alpha จาง ๆ (1-10) กระจายทั่วผืน getbbox() เลยคืนภาพเต็มใบ
    #    ผลคือตัวละครถูกย่อจนเหลือครึ่งเดียวของที่ควรเป็น
    if im.mode == 'RGBA':
        alpha = im.getchannel('A')
        box = alpha.point(lambda v: 255 if v >= 16 else 0).getbbox()
        if box:
            im = im.crop(box)
        im.putalpha(im.getchannel('A').point(lambda v: 0 if v < 16 else v))
    if name == 'tileset':                    # atlas ห้ามยืด ปล่อยผ่าน
        im.save(os.path.join(OUT, name + '.png'))
        return im.size

    if name.startswith('tile-'):             # พื้น: ย่อเป็นผืน pattern ขนาด PAT
        # ห้ามย่อลงเหลือ 32px — ลายก้อนหินจะเละเป็นสีเดียว
        # เกมเอาไปใช้เป็น repeating pattern ทับทั้งแผนที่ ไม่ได้ยัดลงช่องละใบ
        im = im.resize((PAT, PAT), Image.LANCZOS).convert('RGB')
        im.quantize(colors=COLORS * 2, dither=Image.NONE).convert('RGB').save(os.path.join(OUT, name + '.png'))
        return (PAT, PAT)

    scale = min(SIZE / im.width, SIZE / im.height)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)

    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))   # 2. ชิดขอบล่าง กึ่งกลางแนวนอน
    canvas.paste(im, ((SIZE - im.width) // 2, SIZE - im.height), im)

    alpha = canvas.getchannel('A')                            # 3. ลด palette
    flat = canvas.convert('RGB').quantize(colors=COLORS, dither=Image.NONE).convert('RGBA')
    flat.putalpha(alpha)
    flat.save(os.path.join(OUT, name + '.png'))
    return flat.size

def main():
    if not os.path.isdir(RAW):
        sys.exit('ไม่พบโฟลเดอร์ ' + RAW)
    files = sorted(f for f in os.listdir(RAW) if f.lower().endswith('.png'))
    if not files:
        sys.exit('ยังไม่มีไฟล์ใน img/raw/ — วาง <key>.png ไว้ก่อน')
    for f in files:
        name = os.path.splitext(f)[0]
        w, h = prep(os.path.join(RAW, f), name)
        print(f'  ✓ {f:28s} → img/{name}.png  {w}×{h}')
    print(f'เสร็จ {len(files)} ไฟล์ — รีเฟรชหน้าเกมได้เลย')

if __name__ == '__main__':
    main()
