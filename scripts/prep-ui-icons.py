#!/usr/bin/env python3
"""เตรียมไอคอน/ปุ่ม UI ของคุณเป้ (ชุด 15) จาก img/raw/ ไปใช้งานจริงที่ img/ui/

ไม่ทับ img/raw/ เด็ดขาด — อ่านอย่างเดียว เขียนผลลัพธ์ไป img/ui/ เท่านั้น
ตั้งชื่อ kebab-case คงที่ (icon-<name>.png) ให้ Kittanate/Dale วาดจริงมาทับได้
โดยไม่ต้องแก้โค้ด

สามกลุ่ม:
  1. AUTOCROP  — ตัดขอบโปร่งส่วนเกินออก (ภาพมีระยะขอบเยอะ ขนาดแสดงผลจะเล็กกว่าที่ควร)
  2. COPY_ASIS — ปุ่ม/ป้ายที่ครอปมาพอดีอยู่แล้ว (สี่เหลี่ยม/แคปซูลทึบ) ก็อปตรง ๆ
  3. BG_REMOVE — ไอคอนพิกเซลอาร์ตพื้นหลังไล่สี (ม่วงเข้ม) ใช้ flood-fill ตัดพื้นหลังออก
"""
from PIL import Image
import os
import argparse
from collections import deque

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(ROOT, 'img', 'raw')
OUT = os.path.join(ROOT, 'img', 'ui')
os.makedirs(OUT, exist_ok=True)

ALPHA_THRESH = 12   # ต่ำกว่านี้ถือว่าโปร่งใส (กันพิกเซลจางๆ ที่ทำให้ bbox เต็มผืนทั้งที่ตาเห็นว่าง)
PAD_PCT = 0.03      # เผื่อขอบหลัง crop กันภาพชิดเกิน

AUTOCROP = {
    'icon_coin.png':        'icon-coin.png',
    'icon_justice.png':     'icon-justice.png',
    'icon_skull.png':       'icon-skull.png',
    'icon_pause.png':       'icon-pause.png',
    'icon_book.png':        'icon-book.png',
    'icon_bag.png':         'icon-bag.png',
    'icon_door.png':        'icon-door.png',
    'icon_setting2.png':    'icon-setting2.png',
    'icon_18+.png':         'icon-18plus.png',
    'logo-th.png':          'logo-th.png',
    'logo-eng.png':         'logo-eng.png',
    'icon_resume.png':      'icon-resume.png',
    'icon_new-game.png':    'icon-new-game.png',
    'icon_play.png':        'icon-play.png',
}

COPY_ASIS = {
    'icon_close.png':          'icon-close.png',
    'icon_home.png':            'icon-home.png',
    'icon_restart.png':         'icon-restart.png',
    'icon_music.png':           'icon-music.png',
    'icon_sound.png':           'icon-sound.png',
    'icon_change-th.png':       'icon-change-th.png',
    'icon_change-eng.png':      'icon-change-eng.png',
    'icon-save-th.png':         'icon-save-th.png',
    'icon-save-eng.png':        'icon-save-eng.png',
    'icon_open_court-th.png':   'icon-open-court-th.png',
    'icon_oepn_court.png':      'icon-open-court-eng.png',
    # ลอง flood-fill ตัดพื้นม่วงไล่สีออกแล้วกินไอคอนไปด้วย (เส้นขอบสีใกล้เคียงพื้นเกินไป) —
    # ใช้เป็นป้ายสี่เหลี่ยมทึบตรงๆ แบบเดียวกับ icon_close/icon_home แทน ไม่ฝืนตัดพื้นหลัง
    'icon lock.png': 'icon-lock.png',
    'icon skip.png': 'icon-skip.png',
}

BG_REMOVE = {}

# ปุ่ม resume/new-game ต้นฉบับเป็นภาพเดียวรวม "ไอคอน + คำอังกฤษ" ติดกัน (RESUME / NEW GAME)
# ฝั่งไทยไม่มีภาพตัวหนังสือไทยชุดนี้ (ข้อ A.2 ของใบงาน) — ตัดเอาเฉพาะไอคอน (สามเหลี่ยม/ดาว)
# ออกมาต่างหาก แล้วโค้ดจะวางคำไทยเป็นตัวอักษรจริงข้างๆ (สีทอง เงาดำ สไตล์เดียวกับภาพ)
# พิกัดคอลัมน์ตัดมาจากการสแกนช่องว่างระหว่างไอคอนกับตัวหนังสือด้วยมือ (ดูรายงาน Toby)
GLYPH_CROP = {
    'icon_resume.png':    ((0, 0, 160, 300), 'icon-resume-glyph.png'),
    'icon_new-game.png':  ((0, 0, 150, 300), 'icon-new-game-glyph.png'),
}


def autocrop(im):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    alpha = im.getchannel('A')
    mask = alpha.point(lambda a: 255 if a > ALPHA_THRESH else 0)
    bbox = mask.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    pw, ph = int((r - l) * PAD_PCT), int((b - t) * PAD_PCT)
    l = max(0, l - pw); t = max(0, t - ph); r = min(w, r + pw); b = min(h, b + ph)
    return im.crop((l, t, r, b))


def prepare_bell(src):
    """ตัดพื้นขาว (ถ้ามี) และขอบโปร่งของกระดิ่ง โดยไม่แก้ต้นฉบับ"""
    im = Image.open(src).convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and min(r, g, b) >= 250:
                px[x, y] = (r, g, b, 0)
    out = autocrop(im)
    out.save(os.path.join(OUT, 'icon-bell.png'))
    print(f'bell     {src} {im.size} -> {out.size} => img/ui/icon-bell.png')


def prepare_door(src):
    """เตรียมไอคอนประตูจากภาพต้นฉบับโดยไม่แก้ภาพใน raw"""
    im = Image.open(src)
    out = autocrop(im)
    out.save(os.path.join(OUT, 'icon-door.png'))
    print(f'door     {src} {im.size} -> {out.size} => img/ui/icon-door.png')


def prepare_gold_background(src):
    """ย่อปุ่มทองเปล่าและตัดพิกเซลพื้นขาวออก โดยไม่แตะไฟล์ต้นฉบับ"""
    im = Image.open(src).convert('RGBA')
    pixels = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pixels[x, y]
            if a and min(r, g, b) >= 250:
                pixels[x, y] = (r, g, b, 0)
    im.thumbnail((400, 150), Image.Resampling.LANCZOS)
    im.save(os.path.join(OUT, 'icon-bg.png'))
    print(f'gold     {src} -> {im.size} => img/ui/icon-bg.png')


def flood_bg_remove(im, tol=26):
    """ตัดพื้นหลังไล่สีออกด้วย flood-fill จากขอบ — พิกเซลติดกันที่สีใกล้เคียงกันเรื่อยๆ (เผื่อไล่สี)"""
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()

    def close(a, b):
        return abs(a[0]-b[0]) <= tol and abs(a[1]-b[1]) <= tol and abs(a[2]-b[2]) <= tol

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            idx = y * w + x
            if not seen[idx]:
                q.append((x, y)); seen[idx] = 1
    for y in range(h):
        for x in (0, w - 1):
            idx = y * w + x
            if not seen[idx]:
                q.append((x, y)); seen[idx] = 1

    removed = 0
    while q:
        x, y = q.popleft()
        p = px[x, y]
        px[x, y] = (p[0], p[1], p[2], 0)
        removed += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                nidx = ny * w + nx
                if not seen[nidx]:
                    np_ = px[nx, ny]
                    if close(np_, p):
                        seen[nidx] = 1
                        q.append((nx, ny))
    return im, removed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bell-source', default=os.path.join(RAW, 'icon_bell.png'))
    parser.add_argument('--bell-only', action='store_true')
    parser.add_argument('--gold-source', default=os.path.join(RAW, 'icon_bg.png'))
    parser.add_argument('--gold-only', action='store_true')
    parser.add_argument('--door-source', default=os.path.join(RAW, 'icon_door.png'))
    parser.add_argument('--door-only', action='store_true')
    args = parser.parse_args()
    if args.door_only:
        prepare_door(args.door_source)
        return
    if args.gold_only:
        prepare_gold_background(args.gold_source)
        return
    if args.bell_only:
        prepare_bell(args.bell_source)
        return
    for src, dst in AUTOCROP.items():
        sp = os.path.join(RAW, src)
        if not os.path.exists(sp):
            print('MISSING', src); continue
        im = Image.open(sp)
        before = im.size
        cropped = autocrop(im)
        cropped.save(os.path.join(OUT, dst))
        print(f'autocrop {src} {before} -> {cropped.size}  => img/ui/{dst}')

    for src, dst in COPY_ASIS.items():
        sp = os.path.join(RAW, src)
        if not os.path.exists(sp):
            print('MISSING', src); continue
        im = Image.open(sp).convert('RGBA')
        im.save(os.path.join(OUT, dst))
        print(f'copy     {src} {im.size}  => img/ui/{dst}')

    for src, dst in BG_REMOVE.items():
        sp = os.path.join(RAW, src)
        if not os.path.exists(sp):
            print('MISSING', src); continue
        im = Image.open(sp)
        cleaned, n = flood_bg_remove(im)
        cleaned = autocrop(cleaned)
        cleaned.save(os.path.join(OUT, dst))
        print(f'bg-remove {src} removed {n}px => img/ui/{dst} {cleaned.size}')

    for src, (box, dst) in GLYPH_CROP.items():
        sp = os.path.join(RAW, src)
        if not os.path.exists(sp):
            print('MISSING', src); continue
        im = Image.open(sp).convert('RGBA').crop(box)
        cropped = autocrop(im)
        cropped.save(os.path.join(OUT, dst))
        print(f'glyph-crop {src} {box} => img/ui/{dst} {cropped.size}')
    if os.path.exists(args.bell_source):
        prepare_bell(args.bell_source)
    if os.path.exists(args.gold_source):
        prepare_gold_background(args.gold_source)


if __name__ == '__main__':
    main()
