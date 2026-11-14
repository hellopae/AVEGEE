# ชุดกระพริบตายามาในห้องสอบสวน

แก้แถว 0 ของ `book-idle.webp` ครบ `th`, `asia`, `west`, `cyberhell` โดยใช้เฟรม 0 เดิมเป็นฐานและคัดลอกไปยังช่อง 1–3 จากนั้นประกอบเฉพาะส่วนตาและเปลือกตา ขนาดแอตลาส 1280×1920 พิกเซล จัด 4 คอลัมน์ × 4 แถว เฟรมละ 320×480 พิกเซล

## ไฟล์ส่งมอบ

แต่ละโซนมีไฟล์ดังนี้

- `img/yama-animation-v1/<โซน>/book-idle.webp` เป็นไฟล์ที่เกมใช้งาน
- `docs/art-reviews/2026-11-13-yama-blink/<โซน>/book-idle.webp` เป็นสำเนาไบต์เดียวกันสำหรับตรวจงาน
- `docs/art-reviews/2026-11-13-yama-blink/<โซน>/book-idle.gif` เป็นตัวอย่างกระพริบตา ขนาด 320×480 พิกเซล
- `docs/art-reviews/2026-11-13-yama-blink/<โซน>/diff-check.json` บันทึกกรอบตรวจตา จำนวนพิกเซลต่าง และ SHA-256

## การประกอบเฟรม

| เฟรมแถว 0 | ภาพ |
| --- | --- |
| 0 | ท่าหลักจากต้นฉบับ |
| 1 | มองข้างไปทางขวาของผู้ดู โดยคงขอบตาจากภาพฐาน |
| 2 | หลับตา |
| 3 | สำเนาเฟรม 0 |

ใช้ ImageGen ในตัว 4 ครั้ง โซนละ 1 ครั้ง ไม่มี retry งบสูงสุดตาม brief 12 ครั้ง ผล ImageGen ใช้เฉพาะส่วนตาและเปลือกตา ย่อกลับสู่ขนาดจริงและจับคู่สี RGB กับพาเลตของเฟรม 0 เดิม เก็บค่า alpha จากฐานเดิมทุกพิกเซล แล้วส่งออก WebP ด้วย `lossless=True, exact=True` เพื่อรักษาค่า RGB ของพิกเซลโปร่งใสด้วย

บริเวณตาใน JSON เป็น polygon พิกัดภายในเฟรม ต้นกำเนิดมุมซ้ายบน เติมขอบ polygon และขยาย 3 พิกเซลด้วย max filter 7×7 เพื่อครอบเส้นเปลือกตาเดิม การนับ diff เปรียบเทียบ RGBA หลังถอดรหัสไฟล์ส่งออกกับเฟรม 0 ของไฟล์เดียวกัน

GIF ใช้ลำดับ 0 → 2 → 0 → 1 และระยะเวลา 1300, 120, 1100, 320 มิลลิวินาที ตามวงจรห้องสอบสวนเดิม GIF ใช้พาเลตร่วมและ alpha แบบโปร่งใสหนึ่งบิต

เลือกทิศมองข้างเป็นขวาของผู้ดู ข้อห้ามตัวอักษรตีความเป็นการเพิ่มตัวอักษรใหม่ โดยอักษรเดิมบนหนังสือโซน Asia คงจากเฟรม 0 เพื่อรักษาเงื่อนไขทุกพิกเซลนอกตาเหมือนฐาน

## ผลตรวจไฟล์และข้อมูลพิกเซล

| โซน | ขนาด WebP | diff นอกตา เฟรม 0–3 | diff เฟรม 0 เทียบต้นฉบับ | diff แถว 1–3 เทียบต้นฉบับ |
| --- | --- | --- | --- | --- |
| th | 1280×1920 | 0, 0, 0, 0 | 0 | 0 |
| asia | 1280×1920 | 0, 0, 0, 0 | 0 | 0 |
| west | 1280×1920 | 0, 0, 0, 0 | 0 | 0 |
| cyberhell | 1280×1920 | 0, 0, 0, 0 | 0 | 0 |

ตรวจไฟล์ครบ ขนาด ชนิด VP8L, alpha, ความตรงกันของสำเนา, ระยะเวลา GIF และ diff ที่ระบุข้างต้นเท่านั้น ผลนี้ครอบคลุมข้อมูลแอสเซ็ต การเล่นเกมและการยอมรับภาพในหน้าสอบสวนยังต้องตรวจโดยผู้ใช้

ต้นฉบับอ้างอิงจาก commit `3bead967c7e3b2d57ec5b6a5eea0a4f64e3a3fe8` ทำงานบน worktree และ branch ที่ได้รับ

### ตรวจซ้ำจากราก repo

ใช้ Python พร้อม Pillow และ NumPy คำสั่งอ่านต้นฉบับด้วย `git show` และอ่านไฟล์ส่งออก

```sh
python3 - <<'PY'
import hashlib
import io
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

review = Path('docs/art-reviews/2026-11-13-yama-blink')
for zone in ('th', 'asia', 'west', 'cyberhell'):
    folder = review / zone
    runtime = Path(f'img/yama-animation-v1/{zone}/book-idle.webp')
    record = json.loads((folder / 'diff-check.json').read_text())
    raw = runtime.read_bytes()
    assert raw == (folder / 'book-idle.webp').read_bytes()
    assert hashlib.sha256(raw).hexdigest() == record['webp_sha256']
    offset = 12
    chunks = []
    while offset + 8 <= len(raw):
        chunks.append(raw[offset:offset + 4])
        size = int.from_bytes(raw[offset + 4:offset + 8], 'little')
        offset += 8 + size + size % 2
    assert b'VP8L' in chunks
    image = Image.open(runtime)
    assert image.size == (1280, 1920) and image.mode == 'RGBA'
    pixels = np.array(image)
    original_raw = subprocess.check_output([
        'git', 'show', f"{record['original_commit']}:{runtime.as_posix()}"
    ])
    original = np.array(Image.open(io.BytesIO(original_raw)).convert('RGBA'))
    assert np.array_equal(pixels[480:], original[480:])
    assert np.array_equal(pixels[:480, :320], original[:480, :320])
    mask = Image.new('1', (320, 480))
    draw = ImageDraw.Draw(mask)
    for polygon in record['eye_mask_polygons']:
        draw.polygon([tuple(point) for point in polygon], fill=1)
    mask = np.array(mask.filter(ImageFilter.MaxFilter(7)), dtype=bool)
    assert int(mask.sum()) == record['eye_mask_pixel_count']
    base = pixels[:480, :320]
    outside, inside = [], []
    palette = set(map(tuple, base[:, :, :3][base[:, :, 3] > 8].tolist()))
    for index in range(4):
        frame = pixels[:480, index * 320:(index + 1) * 320]
        difference = np.any(frame != base, axis=2)
        outside.append(int(np.count_nonzero(difference & ~mask)))
        inside.append(int(np.count_nonzero(difference & mask)))
        assert np.array_equal(frame[:, :, 3], base[:, :, 3])
        assert all(tuple(rgb) in palette for rgb in frame[:, :, :3][frame[:, :, 3] > 8])
    assert outside == record['outside_eye_different_pixels_by_frame'] == [0, 0, 0, 0]
    assert inside == record['inside_eye_different_pixels_by_frame']
    assert inside[1] > 0 and inside[2] > 0 and inside[3] == 0
    gif = Image.open(folder / 'book-idle.gif')
    assert gif.size == (320, 480) and gif.n_frames == 4
    assert gif.info['loop'] == 0 and 'transparency' in gif.info
    durations = []
    for index in range(gif.n_frames):
        gif.seek(index)
        durations.append(gif.info['duration'])
    assert durations == record['gif_durations_ms'] == [1300, 120, 1100, 320]
    print(zone, image.size, 'outside-eye', outside, 'inside-eye', inside, 'GIF', durations)
assert (review / 'README.md').is_file()
print('ตรวจไฟล์และข้อมูลพิกเซลครบ 4 โซน')
PY
```

## Prompt ที่ใช้

ส่งภาพ crop ใบหน้าเฟรม 0 สองสำเนาวางข้างกันเป็น edit target แยกตามโซน ทั้ง 4 งานตั้ง `transparent_background=true` ชื่อ Yama ใน prompt ใช้ Thai, Asia, West และ Cyberhell ตามโซน ข้อกำหนดร่วมมีดังนี้

```text
Use case precise-object-edit. Edit the supplied two-panel cropped face of the [zone] Yama sprite. Maintain the exact two-panel layout, crop, pixel-art medium and original colors. Left panel: keep eye outlines and whites exactly in place, shift only both pupils slightly toward the viewer's right for a sideways glance. Right panel: replace both open eyes with fully closed, thin dark curved eyelids, naturally fill former whites with matching red skin. Eyebrows, nose, cheeks, horns, face position, scale and all surrounding pixels remain identical to the reference. No text, labels, borders or new colors. Produce the same 1344x444 two-panel crop with unchanged geometry, not a full character. Preserve transparency.
```

โซน West เพิ่มคำว่า `helmet` ในรายการส่วนที่ต้องรักษา โซน Thai ระบุสีใบหน้าแดงในข้อกำหนดสี ภาพส่งออกใช้เฉพาะส่วนตาของผลลัพธ์ที่ประกอบกลับลงฐานเดิม
