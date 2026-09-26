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

รูปโปรไฟล์สำหรับแผงข้อมูลขวาล่าง: ตั้งชื่อ <key>-profile (เช่น hero-yama-profile,
crew-nira-profile) จะถูกครอปเป็นจัตุรัสให้เอง ไม่ต้องเป็นพื้นใส ไฟล์ jpeg ก็ได้
ไม่มีไฟล์โปรไฟล์ เกมจะถอยไปใช้รูป standee เดิมอัตโนมัติ

โฟลเดอร์โซน (11 ก.ย. 2569) — รูปของโซน 2-3 วางต้นฉบับไว้ในโฟลเดอร์ย่อยของ raw:
    img/raw/Asia/<key>-asia.png   →  img/Asia/<key>-asia.png     (โซนบูรพา · zone k = asia)
    img/raw/West/<key>-west.png   →  img/West/<key>-west.png     (โซนปัจฉิม · zone k = west)
  key ยึดตามคีย์ของโซน 1 เสมอ (st-krata · crew-taan · hero-yama · mob-kasha ...)
  ท่าพิเศษ/โปรไฟล์ ใส่ชื่อโซนก่อนคำท้าย:  hero-yama-asia-profile · crew-taan-asia-work
  ฉากในห้องสถานี BG-<Key>-asia.jpeg → แปลงเป็น img/Asia/BG-<Key>-asia.webp ให้เอง
  ไม่มีไฟล์ของโซนไหน เกมใช้รูปโซน 1 แทนเอง (src/art.js) — ขึ้นต้นด้วย _ = เก็บไว้ ไม่เอาเข้าเกม
  วางต้นฉบับลง img/Asia/ ตรง ๆ ก็ได้ — สคริปต์ย้ายไป img/raw/Asia/ ให้เองก่อนทำ (ingest)

รันเฉย ๆ = ทำเฉพาะไฟล์ที่ต้นฉบับใหม่กว่าผลลัพธ์ (ของที่ทำไว้แล้วไม่ถูกแตะ)
    python3 scripts/prep-art.py --all      ทำใหม่ทุกไฟล์
    python3 scripts/prep-art.py Asia       ทำเฉพาะไฟล์ที่ path มีคำนี้
"""
from PIL import Image
import os, re, sys

SIZE = 512
PAT  = 256         # ขนาดผืน pattern ของพื้น (ต้องตรงกับ PAT ใน src/art.js)
SCENE_W = 2000     # ความกว้างสูงสุดของภาพฉาก
PROFILE = 512      # ด้านของรูปโปรไฟล์ในแผงข้อมูล (<key>-profile)
ROOM_W = 1024      # ฉากในห้องสถานี BG-* — เท่ากับ BG-*.webp ของโซน 1
ROOM_Q = 82        # คุณภาพ webp ที่ได้ขนาดเท่าชุดโซน 1 (BG-Krata 101 KB · BG-Sala 106 KB)
POSES = ('profile', 'work', 'atk', 'side')   # คำท้ายของท่าพิเศษ — ต้องตรงกับ POSE ใน src/art.js
COLORS = 96
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
RAW = os.path.join(ROOT, 'img', 'raw')
OUT = os.path.join(ROOT, 'img')

# แก้รอบ 1 ชุด 13 คุณเป้ 26 ก.ย. 2569 — img/ui/ ไม่ใช่โฟลเดอร์โซน (Asia/West/CyberHell)
# เก็บไอคอนสำเร็จรูป (เช่น Button1.png) ที่ไม่ผ่าน pipeline ครอป/บีบสีของสคริปต์นี้เลย
# ก่อนแก้: ingest()/raw_files() ปฏิบัติกับมันเหมือนโฟลเดอร์โซนทั่วไป ทำให้ ingest() เห็นว่า
# img/ui/Button1.png ซ้ำไบต์ต่อไบต์กับ img/raw/ui/Button1.png แล้ว "ลบสำเนา" ทิ้งเงียบ ๆ
# (เข้าใจผิดว่าเป็นต้นฉบับที่หลงเหลืออยู่ ทั้งที่เป็นไฟล์ใช้งานจริงคนละบทบาทกับโฟลเดอร์โซน)
# กันโฟลเดอร์นี้ไว้ไม่ให้เข้า pipeline เลยทั้งสองจุด — ต้องจัดการ img/ui/ ด้วยมือเหมือนเดิม
NON_ZONE_DIRS = {'ui'}


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
        # เพดานเดิม 215 — ลายตารางของ crew-nira-asia เป็นขาว 255 สลับเทา 213 (11 ก.ย. 2569)
        # ช่องขาวเลยกั้นการลอกไว้ทั้งผืน · ตัวละครมีเส้นขอบเข้มรอบตัว ขาวในตัวจึงไม่โดนกิน
        return abs(r - g) < 16 and abs(g - b) < 16 and abs(r - b) < 16 and 60 <= r

    # ถ้าขอบเป็นลายตารางจริง ให้ลอกเฉพาะ "ช่องเรียบสีเดียว" ของตาราง + ตะเข็บที่ติดกับช่องพวกนั้น
    # เจอ 11 ก.ย. 2569: ผ้าคลุมขนสัตว์สีเทาของ crew-nira-west ติดกับพื้นตารางเทาโดยไม่มีเส้นขอบ
    # กฎ "เทา ๆ" อย่างเดียวกินขนทิ้งไปครึ่งผืน · ขนสัตว์มีลายแต้มสีไม่เรียบ จึงไม่ผ่านเกณฑ์ช่องเรียบ
    # (ลองเดาเส้นตารางทั้งภาพแล้ว ไม่ได้ผล — ตารางที่ Gemini วาดช่องไม่เท่ากันและเส้นคดไปมา)
    ok = checker_mask(im, greyish)
    if ok is not None:
        is_bg = lambda x, y: ok[y * w + x]
    else:
        is_bg = lambda x, y: greyish(px[x, y])

    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y): q.append((x, y)); seen[y * w + x] = 1
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and not seen[y * w + x]: q.append((x, y)); seen[y * w + x] = 1
    if len(q) < (w + h):          # ขอบไม่ได้เป็นพื้นเรียบ — ไม่ใช่เคสนี้ ปล่อยผ่าน
        return im, 0

    n = 0
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0); n += 1
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(nx, ny):
                seen[ny * w + nx] = 1; q.append((nx, ny))
    if ok is not None:
        n += drop_checker_islands(im, greyish)
    return im, n


def drop_checker_islands(im, greyish):
    """เศษพื้นหลังที่ flood fill เข้าไม่ถึง ลอยค้างรอบตัวละคร
    ตารางของ Gemini มีแผ่นสีจาง ๆ ระดับอื่นซ้อนอยู่ด้วย (ไม่ใช่แค่สองระดับ) เกณฑ์ช่องตารางจึงไม่จับ
    ลบก้อนทึบที่ **ไม่ติดกับก้อนใหญ่สุด** และเนื้อเกิน 90% เป็นสีเทา (r≈g≈b)
    ของขาว/เทาในตัวละคร (ถุงเท้าขาว ขนสัตว์) ติดกับก้อนใหญ่อยู่แล้ว จึงไม่โดน
    ใช้เฉพาะภาพที่ขอบเป็นลายตาราง — ภาพพื้นใสจริงไม่ผ่านฟังก์ชันนี้"""
    from collections import deque
    w, h = im.size
    a = im.getchannel('A').tobytes()
    rgb = im.convert('RGB').tobytes()
    ok = bytearray(1 if greyish((rgb[3 * i], rgb[3 * i + 1], rgb[3 * i + 2], 255)) else 0 for i in range(w * h))
    comp = [0] * (w * h)
    sizes, hits = [0], [0]
    cid = 0
    for i in range(w * h):
        if a[i] < 16 or comp[i]: continue
        cid += 1; comp[i] = cid
        q, n, k = deque([i]), 0, 0
        while q:
            j = q.popleft(); n += 1; k += ok[j]
            x = j % w
            for nj in ((j - 1) if x else -1, (j + 1) if x < w - 1 else -1, j - w, j + w):
                if 0 <= nj < w * h and a[nj] >= 16 and not comp[nj]:
                    comp[nj] = cid; q.append(nj)
        sizes.append(n); hits.append(k)
    if cid < 2: return 0
    main = max(range(1, cid + 1), key=lambda c: sizes[c])
    kill = {c for c in range(1, cid + 1) if c != main and hits[c] >= 0.9 * sizes[c]}
    if not kill: return 0
    alpha = bytearray(a)
    for i in range(w * h):
        if comp[i] in kill: alpha[i] = 0
    im.putalpha(Image.frombytes('L', (w, h), bytes(alpha)))
    return sum(sizes[c] for c in kill)


def checker_mask(im, greyish):
    """พื้นลายตารางหมากรุก → bytearray (1 = พิกเซลที่ลอกได้) · ขอบไม่ใช่ลายตาราง → None

    ช่องตาราง = พิกเซลเทาที่ตรงกับหนึ่งในสองระดับสีของตาราง (±10) และรอบตัว 5×5 เป็นระดับเดียวกัน
    เกินครึ่ง · ตะเข็บ = พิกเซลเทาในช่วงระหว่างสองระดับที่อยู่ห่างช่องตารางไม่เกิน 2 พิกเซล
    (ลองขยายเป็น 3 พิกเซล + ช่วงสีกว้างขึ้นแล้ว — ขนสัตว์ของ crew-nira-west แหว่งเป็นรู จึงคงไว้ที่ 2)
    """
    from PIL import ImageChops, ImageFilter
    w, h = im.size
    px = im.load()
    edge = [px[x, y] for x in range(w) for y in (0, 1, h - 2, h - 1)] + \
           [px[x, y] for y in range(h) for x in (0, 1, w - 2, w - 1)]
    vals = sorted(p[0] for p in edge if greyish(p))
    if len(vals) < len(edge) * 0.6: return None
    lo, hi = vals[len(vals) // 4], vals[3 * len(vals) // 4]
    if hi - lo < 20: return None                      # พื้นเรียบสีเดียว ใช้กฎเดิม
    r, g, b = im.convert('RGB').split()
    tight = lambda img: img.point(lambda v: 255 if v < 16 else 0)
    neutral = ImageChops.multiply(ImageChops.multiply(tight(ImageChops.difference(r, g)),
                                                      tight(ImageChops.difference(g, b))),
                                  tight(ImageChops.difference(r, b)))
    strict = Image.new('L', (w, h), 0)
    for lv in (lo, hi):
        m = ImageChops.multiply(r.point(lambda v, lv=lv: 255 if abs(v - lv) <= 10 else 0), neutral)
        flat = m.filter(ImageFilter.BoxBlur(2)).point(lambda v: 255 if v >= 128 else 0)
        strict = ImageChops.lighter(strict, ImageChops.multiply(m, flat))
    near = strict.filter(ImageFilter.MaxFilter(5))
    band = ImageChops.multiply(r.point(lambda v: 255 if lo - 16 <= v <= hi + 16 else 0), neutral)
    cand = ImageChops.lighter(strict, ImageChops.multiply(band, near))
    return bytearray(cand.point(lambda v: 1 if v else 0).tobytes())


def drop_specks(im):
    """ลบจุดโปร่งแสงเล็ก ๆ ที่ลอยอยู่นอกตัวภาพ ก่อนตัดขอบ

    เจอ 11 ก.ย. 2569: hero-yama-asia มีจุด 2-3 พิกเซลลอยอยู่ขวามือห่างตัวละคร ~100 px
    กรอบตัดขอบเลยกว้างเกินจริง ตัวละครเยื้องไปซ้าย และกระโดดข้างตอนหันซ้าย-ขวา
    ลบเฉพาะก้อนที่ "เล็ก" (≤ 1% ของก้อนใหญ่สุด) และ "ห่าง" จากกรอบก้อนใหญ่สุดเกิน 3% ของภาพ
    — จุดหลง ลายน้ำดาวสี่แฉกของ Gemini ที่มุมภาพ · เปลวไฟ/ใบไม้ที่แตกออกมาชิดตัวภาพไม่โดน
    """
    from collections import deque
    N = 256
    a = im.getchannel('A').point(lambda v: 255 if v >= 16 else 0)
    small = a.resize((N, N), Image.BOX).load()      # ช่องไหนมีพิกเซลทึบสักจุด = ค่า > 0
    seen, comps = bytearray(N * N), []
    for y in range(N):
        for x in range(N):
            if small[x, y] and not seen[y * N + x]:
                q, cells = deque([(x, y)]), []
                seen[y * N + x] = 1
                while q:
                    cx, cy = q.popleft(); cells.append((cx, cy))
                    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                        if 0 <= nx < N and 0 <= ny < N and small[nx, ny] and not seen[ny * N + nx]:
                            seen[ny * N + nx] = 1; q.append((nx, ny))
                comps.append(cells)
    if len(comps) < 2:
        return im, 0
    comps.sort(key=len, reverse=True)
    mx1 = min(c[0] for c in comps[0]); mx2 = max(c[0] for c in comps[0])
    my1 = min(c[1] for c in comps[0]); my2 = max(c[1] for c in comps[0])
    sx, sy = im.width / N, im.height / N
    alpha, n = im.getchannel('A'), 0
    small, gap = max(4, len(comps[0]) // 100), N * 0.03
    for cells in comps[1:]:
        if len(cells) > small: continue
        x1 = min(c[0] for c in cells); x2 = max(c[0] for c in cells)
        y1 = min(c[1] for c in cells); y2 = max(c[1] for c in cells)
        if max(mx1 - x2, x1 - mx2, my1 - y2, y1 - my2) <= gap: continue
        for cx, cy in cells:
            alpha.paste(0, (int(cx * sx), int(cy * sy), int((cx + 1) * sx) + 1, int((cy + 1) * sy) + 1))
            n += 1
    im.putalpha(alpha)
    return im, n


#  ต้นฉบับ raw สะกดผิด แต่คุณเป้สั่ง 17 ก.ย. 2569 ห้ามแก้ไฟล์ raw — แก้แค่ชื่อไฟล์ผลลัพธ์ที่จุดเดียวนี้
#  คีย์ = 'sub/ชื่อไฟล์ (ไม่มีนามสกุล)' ตามที่อยู่จริงใน img/raw/ → ค่า = ชื่อที่ถูกก่อนต่อท้ายโซน
RENAME = {
    'Asia/Boos Zone2': 'Boss Zone2',   # img/raw/Asia/Boos Zone2.png → ผลลัพธ์ Boss Zone2-asia.png
    # img/raw/CyberHell/zone-boss-cyber.png (18 ก.ย. 2569) — ชื่อดิบมี "cyber" ติดมาด้วย ทำให้ผลลัพธ์
    # กลายเป็น zone-boss-cyber-cyberhell.png ขณะที่ src/scene.js เรียกคีย์ 'zone-boss' เฉย ๆ (ต่อท้าย
    # -cyberhell เองอัตโนมัติ) เกมจึงหาไฟล์นี้ไม่เจอ เงียบ ๆ ถอยไปใช้บอสโซน 1 แทน — ไม่แก้ไฟล์ raw
    'CyberHell/zone-boss-cyber': 'zone-boss',
}


def out_name(sub, name):
    """ชื่อไฟล์ปลายทางของไฟล์ในโฟลเดอร์โซน — คืน (ชื่อ, คำเตือน)
    บังคับให้ลงท้ายตามแบบ <key>-<zone>[-<ท่า>] เพื่อให้ art.js หาเจอ"""
    if not sub:
        return name, ''
    name = RENAME.get(f'{sub}/{name}', name)
    # ฉากห้องสถานี (BG-<Key>) — art.js สร้างคีย์ค้นหาด้วย k[0].toUpperCase()+k.slice(1) เสมอ
    # (ดู stBg() ใน ui.js) เช่น สถานี 'lokan' → ค้นหา 'BG-Lokan-west' ตัวใหญ่ตัวแรกเป๊ะ
    # ถ้าเจ้าของตั้งชื่อไฟล์ดิบว่า BG-lokan-west.jpeg (ตัวเล็ก) ผลลัพธ์จะได้ BG-lokan-west.webp
    # ซึ่ง artUrl() หาไม่เจอ (case-sensitive) แล้วเงียบ ๆ ถอยไปใช้ฉากโซน 1 แทนโดยไม่มี error ใด ๆ
    # เกิดจริง 17-18 ก.ย. 2569 กับ BG-lokan/ngiw/sala-west.jpeg — บังคับตัวใหญ่ตัวแรกให้ตรงกันเสมอ ณ จุดนี้
    if re.match(r'BG-[a-z]', name):
        name = 'BG-' + name[3].upper() + name[4:]
    z = sub.lower()
    # ภาพคัตซีนและท่าหันซ้าย/ขวาใส่ชื่อโซนไว้กลางชื่ออยู่แล้ว ไม่ใช่ POSE ท้ายชื่อแบบ
    # -profile/-work/-atk/-side ถ้าปล่อยลงทางทั่วไปจะได้ชื่อซ้ำเป็น
    # hero-yama-west-atk-cutscene-west ซึ่ง art.js หาไม่เจอ
    if re.fullmatch(r'.+-' + z + r'-(atk|hyp|mi|ice)-cutscene', name):
        return name, ''
    if re.fullmatch(r'.+-' + z + r'-atk-[LR]', name):
        return name, ''
    m = re.fullmatch(r'(.+)-(' + '|'.join(POSES) + r')-' + z, name)   # crew-taan-work-asia → crew-taan-asia-work
    if m:
        return f'{m.group(1)}-{z}-{m.group(2)}', f'สลับคำท้ายเป็น -{z}-{m.group(2)}'
    m = re.fullmatch(r'(.+)-' + z + r'(-(' + '|'.join(POSES) + r'))?', name)
    if m:
        return name, ''
    m = re.fullmatch(r'(.+)-(' + '|'.join(POSES) + r')', name)          # ลืมใส่ชื่อโซน
    if m:
        return f'{m.group(1)}-{z}-{m.group(2)}', f'ไม่มี -{z} ในชื่อ เติมให้แล้ว'
    return f'{name}-{z}', f'ไม่มี -{z} ในชื่อ เติมให้แล้ว'


def prep(path, name, out_dir=OUT):
    im = Image.open(path)
    stripped = 0
    OUT = out_dir                  # ทุกบรรทัดข้างล่างเซฟลง OUT — โฟลเดอร์โซนก็ใช้ทางเดียวกัน

    # ภาพคัตซีนพลัง — ภาพกว้างเต็มใบ ห้ามลอกพื้น/ครอป/บีบลงผืน 512
    # เก็บเป็น JPEG เพราะ UI เรียกชื่อนี้โดยตรง และต้นฉบับเป็นภาพทึบไม่มี alpha
    if name.endswith('-cutscene'):
        im = im.convert('RGB')
        if im.width > SCENE_W:
            im = im.resize((SCENE_W, round(im.height * SCENE_W / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, name + '.jpeg'), 'JPEG', quality=90, optimize=True)
        return im.size

    # การ์ตูนแนะนำโซนตอนย้ายสาขา — ใช้กรอบ 16:9 แบบฉากเปิด ไม่ใช่ standee
    if re.match(r'intro-zone\d+', name):
        if im.width > SCENE_W:
            im = im.resize((SCENE_W, round(im.height * SCENE_W / im.width)), Image.LANCZOS)
        im.convert('RGB').quantize(colors=256, dither=Image.NONE).save(os.path.join(OUT, name + '.png'))
        return im.size

    # ฉากในห้องสถานี (BG-<Key>) — ภาพเต็มใบ ห้ามลอกพื้น ห้ามครอป
    # โซน 1 แปลงมือไว้เป็น webp ตั้งแต่ 9 ก.ย. (ต้นฉบับ _BG-*.jpeg ไม่ผ่านสคริปต์นี้)
    # ค่าที่ใช้ตรงนี้ให้ขนาดไฟล์เท่าชุดนั้นเป๊ะ — ~100 KB ต่อห้อง
    if name.startswith('BG-'):
        im = im.convert('RGB')
        if im.width > ROOM_W:
            im = im.resize((ROOM_W, round(im.height * ROOM_W / im.width)), Image.LANCZOS)
        im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=ROOM_Q, method=6)
        return im.size

    # รูปโปรไฟล์ (<key>-profile) — ภาพเต็มใบสำหรับแผงข้อมูล ไม่ใช่ standee
    # ห้ามลอกพื้นหลัง ห้ามชิดขอบล่าง แค่ครอปเป็นจัตุรัสตรงกลางแล้วย่อ
    if name.endswith('-profile'):
        im = im.convert('RGB')
        w, h = im.size
        side = min(w, h)
        # ครอปจากกลางแนวนอน แต่ค่อนไปทางบนแนวตั้ง — หน้าคนอยู่ครึ่งบนเสมอ
        left, top = (w - side) // 2, (h - side) // 4
        im = im.crop((left, top, left + side, top + side))
        if im.width > PROFILE:
            im = im.resize((PROFILE, PROFILE), Image.LANCZOS)
        im.quantize(colors=COLORS * 2, dither=Image.NONE).convert('RGB').save(
            os.path.join(OUT, name + '.png'))
        return im.size

    # ฉากมาถึงของบอส (Intro-Boss-Zone<N>[-โซน]) — ภาพฉากกว้างเต็มใบ (~16:9) ไม่ใช่ standee
    # (17 ก.ย. 2569 เจ้าของเจอ: กรอบครึ่งบนว่างดำ หัว/ท้องฟ้าถูกตัด) ต้นเหตุคือชื่อไฟล์ไม่ตรงกติกา
    # 'scene'/'BG-' เลยหลุดไปเข้าทางสไปรท์ตัวละครแทน — ทางนั้นลอกพื้นหลัง + ครอปให้ชิดขอบล่างบนผืน
    # จัตุรัส 512×512 (สำหรับ standee) ภาพกว้างเลยเหลือแค่ครึ่งล่างของผืน ครึ่งบนโปร่งใส
    # พอไปเข้ากรอบ .intro-comic-frame (aspect-ratio:16/9, object-fit:cover) พื้นโปร่งใสนั้นก็ทะลุ
    # เป็นสีมืดของกล่อง และเนื้อภาพ (ซึ่งอยู่ครึ่งล่างของผืนสี่เหลี่ยมจัตุรัสอยู่แล้ว) ถูก cover crop
    # กลางผืนซ้ำอีกชั้น หัว/ท้องฟ้าที่ตั้งใจให้อยู่ครึ่งบนของภาพจริงเลยหายไปทั้งคู่
    # ทางแก้: ห้ามลอกพื้น ห้ามครอปชิดขอบล่าง — ปฏิบัติเหมือนภาพฉาก (scene-) เต็มใบ
    if re.match(r'Intro-Boss-Zone\d+', name):
        if im.width > SCENE_W:
            im = im.resize((SCENE_W, round(im.height * SCENE_W / im.width)), Image.LANCZOS)
        im.convert('RGB').quantize(colors=256, dither=Image.NONE).save(os.path.join(OUT, name + '.png'))
        return im.size

    if name.startswith('tex-'):              # พื้นผิว UI (18 ก.ย. 2569) — ผืนลายทึบ seamless เหมือน tile-*
        # แต่ใช้เป็น background-image ของการ์ด HUD ไม่ใช่พื้นบนแผนที่เกม ตั้งชื่อขึ้นต้นต่างจาก tile-
        # เพื่อไม่ให้สับสนกับพื้นในฉาก — ปฏิบัติเหมือน tile- ทุกอย่าง (ย่อเป็น PAT×PAT ห้ามลอกพื้น/ครอป)
        im = im.resize((PAT, PAT), Image.LANCZOS).convert('RGB')
        im.quantize(colors=COLORS * 2, dither=Image.NONE).convert('RGB').save(os.path.join(OUT, name + '.png'))
        return (PAT, PAT)

    if im.mode != 'RGBA' and not name.startswith('tile-') and not name.startswith('scene'):
        im, stripped = strip_flat_bg(im)      # 0. ไฟล์ที่ไม่มี alpha ลองลอกพื้นหลังทึบออกก่อน
    im = im.convert('RGBA')
    if not name.startswith(('tile', 'scene')):
        im, _ = drop_specks(im)
    # 1. ตัดขอบใส — ต้องใช้ threshold ไม่ใช่ getbbox() ตรง ๆ
    #    generator ทิ้ง alpha จาง ๆ (1-10) กระจายทั่วผืน getbbox() เลยคืนภาพเต็มใบ
    #    ผลคือตัวละครถูกย่อจนเหลือครึ่งเดียวของที่ควรเป็น
    if im.mode == 'RGBA':
        alpha = im.getchannel('A')
        box = alpha.point(lambda v: 255 if v >= 16 else 0).getbbox()
        if box:
            im = im.crop(box)
        im.putalpha(im.getchannel('A').point(lambda v: 0 if v < 16 else v))
    if re.fullmatch(r'Zone\d+', name):        # การ์ดเกาะในกล่องเลือกโซน (17 ก.ย. 2569)
        # พื้นหลังโปร่งใสอยู่แล้วจากต้นฉบับ (alpha ต่ำทั่วมุมภาพ ไม่ใช่ลอกพื้นทึบแบบสไปรท์ตัวละคร)
        # ไม่ใช่ standee — ห้ามชิดขอบล่าง แค่ย่อคง proportion เดิมแล้วแปลง webp ตามใบงาน
        if max(im.size) > SIZE:
            s = SIZE / max(im.size)
            im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=90, method=6)
        return im.size
    if name == 'tileset':                    # atlas ห้ามยืด ปล่อยผ่าน
        im.save(os.path.join(OUT, name + '.png'))
        return im.size

    if name.startswith('scene'):             # ฉากเต็มใบทุกโซน — ย่อพอให้ไฟล์ไม่อ้วน ห้ามตัด ห้ามลอกพื้น
                                             # (เดิมเช็ค name == 'scene' เป๊ะ ๆ ทำให้ scene-asia/west
                                             #  ถูกจับเป็นสไปรท์แล้วบีบเหลือ 512 จัตุรัส — 8 ก.ย. 2569)
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

def raw_files():
    """(โฟลเดอร์ย่อย, ชื่อไฟล์) ทุกไฟล์ที่ต้องทำ — '' = โซน 1 ที่ img/raw/ ตรง ๆ
    ไฟล์/โฟลเดอร์ที่ขึ้นต้นด้วย _ = เก็บไว้อ้างอิง ไม่ต้องเอาเข้าเกม
    รับ jpeg ด้วย — รูปโปรไฟล์ที่ gen มามักเป็น jpeg และไม่ต้องใช้ alpha อยู่แล้ว"""
    ok = lambda f: f.lower().endswith(('.png', '.jpg', '.jpeg')) and not f.startswith(('_', '.'))
    out = [('', f) for f in sorted(os.listdir(RAW)) if os.path.isfile(os.path.join(RAW, f)) and ok(f)]
    for sub in sorted(os.listdir(RAW)):
        if sub in NON_ZONE_DIRS or sub.startswith(('_', '.')) or not os.path.isdir(os.path.join(RAW, sub)):
            continue
        out += [(sub, f) for f in sorted(os.listdir(os.path.join(RAW, sub))) if ok(f)]
    return out


def ingest():
    """ต้นฉบับที่เจ้าของวางไว้ใน img/<Zone>/ ตรง ๆ → ย้ายไป img/raw/<Zone>/ ให้เอง
    (11 ก.ย. 2569 เจ้าของวางรูปใหม่ลง img/Asia/ ระหว่างที่กำลังต่อสายอยู่ — เป็นนิสัยที่ควรรองรับ
     ไม่ใช่ห้าม) · คืนเซตของไฟล์ที่ย้ายมา (ต้องทำใหม่แน่ ๆ ไม่ดูเวลาไฟล์ เพราะ Finder ก๊อปแล้วเวลาเดิมติดมา)

    ผลลัพธ์ของสคริปต์นี้ในโฟลเดอร์โซน = .webp (ฉากในห้อง) · .png 512×512 · scene-*.png
    อย่างอื่นถือว่าเป็นต้นฉบับ (.jpeg ทุกไฟล์ · .png ขนาดอื่น)"""
    import filecmp, shutil
    got = set()
    for sub in sorted(os.listdir(OUT)):
        d = os.path.join(OUT, sub)
        if sub == 'raw' or sub in NON_ZONE_DIRS or sub.startswith(('_', '.')) or not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            p = os.path.join(d, f)
            ext = os.path.splitext(f)[1].lower()
            if f.startswith('.') or ext not in ('.png', '.jpg', '.jpeg', '.webp'):
                continue
            # scene-* และ Intro-Boss-Zone<N>[-โซน] เป็นภาพฉากเต็มใบ ไม่ถูกบีบเหลือ 512×512
            # เหมือนสไปรท์ตัวละคร (ดู prep()) เช็คขนาดอย่างเดียวเลยจับผิดว่าเป็นต้นฉบับ ย้ายมันไป
            # img/raw/ ทั้งที่เป็นผลลัพธ์ที่ถูกต้องแล้ว (เจ้าของเจอ 17 ก.ย. 2569 — Intro-Boss ของ
            # ทุกโซนหายไปจาก img/ หลังรันสคริปต์รอบถัดมา) เช็คชื่อไฟล์กันไว้เหมือน scene-*
            stem = os.path.splitext(f)[0]
            if (ext == '.webp' or f.startswith('scene')
                    or (re.match(r'Intro-Boss-Zone\d+', f) and stem.endswith('-' + sub.lower()))
                    or (ext == '.png' and re.match(r'intro-zone\d+', f))
                    or f.endswith('-cutscene.jpeg')):
                continue
            if ext == '.png':
                with Image.open(p) as im:
                    if im.size == (SIZE, SIZE): continue
            os.makedirs(os.path.join(RAW, sub), exist_ok=True)
            dst = os.path.join(RAW, sub, f)
            if os.path.exists(dst) and filecmp.cmp(p, dst, shallow=False):
                os.remove(p)
                print(f'  ↪ img/{sub}/{f} ซ้ำกับต้นฉบับใน img/raw/{sub}/ — ลบสำเนาออก')
            else:
                shutil.move(p, dst)
                print(f'  ↪ ย้ายต้นฉบับ img/{sub}/{f} → img/raw/{sub}/{f}')
            got.add(os.path.join(sub, f))
    return got


def main():
    if not os.path.isdir(RAW):
        sys.exit('ไม่พบโฟลเดอร์ ' + RAW)
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--all' in sys.argv
    fresh = ingest()
    files = raw_files()
    if not files:
        sys.exit('ยังไม่มีไฟล์ใน img/raw/ — วาง <key>.png ไว้ก่อน')
    done = skipped = 0
    for sub, f in files:
        rel = os.path.join(sub, f) if sub else f
        if args and not any(a in rel for a in args):
            continue
        name, warn = out_name(sub, os.path.splitext(f)[0])
        out_dir = os.path.join(OUT, sub) if sub else OUT
        os.makedirs(out_dir, exist_ok=True)
        # .webp = ฉากห้องสถานี/การ์ดเกาะ · .jpeg = คัตซีนกว้าง · ที่เหลือ .png
        is_webp = name.startswith('BG-') or bool(re.fullmatch(r'Zone\d+', name))
        ext = '.webp' if is_webp else ('.jpeg' if name.endswith('-cutscene') else '.png')
        dst = os.path.join(out_dir, name + ext)
        src = os.path.join(RAW, rel)
        # ทำเฉพาะของใหม่ — ผลลัพธ์ที่มีอยู่แล้วไม่ถูกแตะ ไม่งั้นแก้กติกาทีไร รูปทั้งเกมเปลี่ยนตามหมด
        if not force and rel not in fresh and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            skipped += 1
            continue
        w, h = prep(src, name, out_dir)
        print(f'  ✓ {rel:34s} → {os.path.relpath(dst, ROOT)}  {w}×{h}' + (f'  ⚠️ {warn}' if warn else ''))
        done += 1
    print(f'เสร็จ {done} ไฟล์' + (f' · ข้าม {skipped} ไฟล์ที่ทำไว้แล้ว (--all = ทำใหม่หมด)' if skipped else '')
          + ' — รีเฟรชหน้าเกมได้เลย')
    check_orphans(files)
    check_stations()


def check_orphans(files):
    """ไฟล์ในโฟลเดอร์โซนที่ไม่มีต้นฉบับแล้ว (ถูกลบ หรือเปลี่ยนชื่อขึ้นต้นด้วย _)
    เกมยังโหลดอยู่ — บอกให้รู้ แต่ไม่ลบให้เอง"""
    want = {}
    for sub, f in files:
        if sub:
            n, _ = out_name(sub, os.path.splitext(f)[0])
            want.setdefault(sub, set()).add(n)
    for sub in sorted(os.listdir(OUT)):
        d = os.path.join(OUT, sub)
        if sub == 'raw' or sub in NON_ZONE_DIRS or sub.startswith(('_', '.')) or not os.path.isdir(d):
            continue
        extra = [f for f in sorted(os.listdir(d))
                 if not f.startswith('.') and os.path.splitext(f)[0] not in want.get(sub, set())]
        if extra:
            print(f'\n⚠️  img/{sub}/ มีไฟล์ที่ไม่มีต้นฉบับใน img/raw/{sub}/ แล้ว — เกมยังใช้อยู่ ลบเองถ้าไม่ต้องการ:')
            for f in extra:
                print(f'   · img/{sub}/{f}')


def check_stations():
    """เตือนถ้าสถานีไหนยังไม่มีรูป

    7 ก.ย. 2569: ไฟล์ดงต้นงิ้วชื่อ ngiw.png (ไม่มี st-) เกมเลยหาไม่เจอมาหลายวัน
    ในจอเห็นแต่กรอบเปล่า ไม่มี error ไม่มีอะไรบอกเลย — เช็คให้ตรงนี้ทีเดียวจบ
    """
    try:
        with open(os.path.join(ROOT, 'src', 'data.js'), encoding='utf-8') as f:
            src = f.read()
    except OSError:
        return
    block = src.split('export const STATIONS')[1].split('\n];')[0]
    keys = re.findall(r"\{\s*k:'([a-z]+)'", block)
    missing = [k for k in keys if not os.path.exists(os.path.join(OUT, f'st-{k}.png'))]
    if missing:
        print('\n⚠️  สถานีที่ยังไม่มีรูป (เกมจะวาดกรอบเปล่า):')
        for k in missing:
            stray = [f for f in os.listdir(RAW) if os.path.splitext(f)[0] == k]
            hint = f'  ← เจอ img/raw/{stray[0]} เปลี่ยนชื่อเป็น st-{k}.png' if stray else ''
            print(f'   · img/st-{k}.png{hint}')
        print('   (ชื่อไฟล์สถานีต้องขึ้นต้นด้วย st- เสมอ)')
    # โซนอื่น — ไม่ใช่ข้อผิดพลาด (เกมใช้รูปโซน 1 แทน) แค่บอกว่ายังขาดหลังไหน
    for sub in sorted(os.listdir(OUT)):
        d = os.path.join(OUT, sub)
        if sub == 'raw' or sub in NON_ZONE_DIRS or sub.startswith(('_', '.')) or not os.path.isdir(d):
            continue
        z = sub.lower()
        lack = [k for k in keys if not os.path.exists(os.path.join(d, f'st-{k}-{z}.png'))]
        if lack:
            print(f'\nℹ️  img/{sub}/ ยังไม่มีอาคาร {len(lack)} หลัง (ใช้รูปโซน 1 แทน): ' + ' '.join(lack))

if __name__ == '__main__':
    main()
    # อัปเดตรายชื่อภาพให้หน้าโหลดด้วย ไม่งั้นรูปใหม่จะไม่ถูกโหลดล่วงหน้า
    # (manifest เก่าไม่ทำให้เกมพัง แค่รูปนั้นค่อยมาตอนวาด เหมือนก่อนมีหน้าโหลด)
    import importlib.util
    _mf = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make-manifest.py')
    _spec = importlib.util.spec_from_file_location('make_manifest', _mf)
    _mod = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_mod)
    _mod.main()
