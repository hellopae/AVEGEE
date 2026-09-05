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
SCENE_W = 2000     # ความกว้างสูงสุดของภาพฉาก
COLORS = 96
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(ROOT, 'img', 'raw')
OUT = os.path.join(ROOT, 'img')


def strip_flat_bg(im):
    """ลอกพื้นหลังทึบออกให้เป็น alpha

    เจอกับ Gemini บ่อย: มัน **วาดลายตารางหมากรุก** (ลายที่โปรแกรมใช้แทน "พื้นใส")
    ลงไปเป็นพิกเซลจริง ๆ แล้วเซฟเป็น jpeg ไฟล์เลยไม่มี alpha สักนิด
    ถ้าเอาเข้าเกมตรง ๆ ตัวละครจะมีแผ่นตารางเทาติดมาเต็มกรอบ

    วิธีลอก: flood fill จากขอบภาพเข้ามา เก็บเฉพาะพิกเซลที่ "เทา ๆ" (r≈g≈b)
    ตัวละครในเกมนี้สีจัดทุกตัว เลยไม่โดนกินไปด้วย
    """
    from collections import deque
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()

    def greyish(p):
        r, g, b, _ = p
        return abs(r - g) < 16 and abs(g - b) < 16 and abs(r - b) < 16 and 60 <= r <= 215

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if greyish(px[x, y]): q.append((x, y)); seen[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            if greyish(px[x, y]) and not seen[y * w + x]: q.append((x, y)); seen[y * w + x] = 1
    if len(q) < (w + h):          # ขอบไม่ได้เป็นพื้นเรียบ — ไม่ใช่เคสนี้ ปล่อยผ่าน
        return im, 0

    n = 0
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0); n += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and greyish(px[nx, ny]):
                seen[ny * w + nx] = 1; q.append((nx, ny))
    return im, n

def prep(path, name):
    im = Image.open(path)
    stripped = 0
    if im.mode != 'RGBA' and not name.startswith('tile-') and name != 'scene':
        im, stripped = strip_flat_bg(im)      # 0. ไฟล์ที่ไม่มี alpha ลองลอกพื้นหลังทึบออกก่อน
    im = im.convert('RGBA')
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

    if name == 'scene':                      # ฉากเต็มใบ — ย่อพอให้ไฟล์ไม่อ้วน ห้ามตัด ห้ามลอกพื้น
        if im.width > SCENE_W:
            im = im.resize((SCENE_W, round(im.height * SCENE_W / im.width)), Image.LANCZOS)
        im.convert('RGB').quantize(colors=256, dither=Image.NONE).save(os.path.join(OUT, name + '.png'))
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
    # ไฟล์ที่ขึ้นต้นด้วย _ = เก็บไว้อ้างอิง ไม่ต้องเอาเข้าเกม
    files = sorted(f for f in os.listdir(RAW)
                   if f.lower().endswith('.png') and not f.startswith('_'))
    if not files:
        sys.exit('ยังไม่มีไฟล์ใน img/raw/ — วาง <key>.png ไว้ก่อน')
    for f in files:
        name = os.path.splitext(f)[0]
        w, h = prep(os.path.join(RAW, f), name)
        print(f'  ✓ {f:28s} → img/{name}.png  {w}×{h}')
    print(f'เสร็จ {len(files)} ไฟล์ — รีเฟรชหน้าเกมได้เลย')

if __name__ == '__main__':
    main()
