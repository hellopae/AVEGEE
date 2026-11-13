# ไอคอนถังขยะลบเซฟ · 13 พฤศจิกายน 2569

ชุดภาพส่งตรวจตาม brief TRASH-ICON วาดด้วย **ImageGen ในตัว** โดยเปิดดู [`img/ui/icon-close.webp`](../../../img/ui/icon-close.webp) ก่อนสร้างภาพ ใช้ทองไล่เฉด ขอบสว่างสีทองอ่อน และเงาบรอนซ์ของต้นแบบกับเส้นถังขยะมองตรง

## ไฟล์ส่งมอบ

- [`icon-trash.webp`](icon-trash.webp) — 256×256 พิกเซล, RGBA, ภาพนิ่ง 1 เฟรม พื้นและช่องว่างในถังโปร่งใส ไม่มีตัวอักษร ส่งออก WebP ด้วย `lossless=True, exact=True, method=6`
- [`compare.png`](compare.png) — วาง icon-close ด้านซ้ายและถังขยะด้านขวา แถวบนแสดงที่ 26×26 พิกเซลจริง แถวล่างแสดงในกรอบ 256×256 พิกเซล พื้นสี `#1c1219` จากปุ่มลบเซฟใน `index.html` ภาพต้นแบบขนาด 243×257 พิกเซลใช้การย่อแบบ contain เพื่อรักษาสัดส่วน
- `README.md` — ที่มา วิธีส่งออก prompt และผลตรวจ

ไฟล์ถังขยะอยู่ในโฟลเดอร์ review ตามปลายทางที่ระบุ ส่วน `img/ui/icon-trash.webp` ที่เกมอ้างถึงยังเป็นไฟล์เดิม

## วิธีสร้าง

ใช้ ImageGen **1 generation, retry 0 ครั้ง** จากงบไม่เกิน 4 generation และ retry ไม่เกิน 2 ครั้ง โดยส่ง icon-close เป็นภาพอ้างอิงสไตล์ และตั้ง `transparent_background=true`

ย่อผลลัพธ์ RGBA ขนาด 1254×1254 เป็น 256×256 ด้วย Pillow / LANCZOS โดยคงอัลฟา แล้วบันทึก WebP แบบ lossless ภาพเทียบประกอบจากไฟล์ WebP ที่ส่งมอบกับต้นแบบ โดยไม่มีการวาดทับรูปทรงที่ ImageGen สร้าง

### Prompt ที่ใช้จริง

```text
Use case: style-transfer.
Asset type: a single game UI trash/delete-save icon, one static frame, transparent raster.
Input image: icon-close.webp is a STYLE REFERENCE ONLY. Study its warm gold color, pale yellow upper-left bevel highlights, dark bronze lower-right edge shadows, simple chunky geometric contours and restrained flat metallic gold gradients. Transfer that gold line treatment to a new trash can symbol.
Primary request: one upright trash can viewed exactly straight from the front, bilaterally symmetrical, centered on a square transparent canvas. A small rectangular handle on a horizontal lid, a slightly tapered bin body with a strong open outline and two simple vertical gold ribs. Bold coherent gold strokes, enough spacing for the ribs to remain legible when the entire canvas is displayed at 26 by 26 pixels. Use broad clean gold ribbon-like strokes with subtle angular bevels, not wire-thin linework. Warm antique gold, cream-gold highlights, bronze shadows matched to the reference. Keep silhouette within about 80 percent of the square with even transparent margins.
Constraints: actual transparent alpha background, including open spaces inside the bin; no gold square backing plate, no border tile, no ground, no cast shadow outside the icon, no scene, no texture noise, no glow, no sparkles, no perspective or visible side or top face, no tilted lid. No letters, numbers, labels, logos or watermark. Only the trash icon. Target deliverable is 256x256 pixels, lossless with alpha; use a clean square composition suitable for downscaling.
```

## ผลตรวจตามขอบเขต brief

ตรวจด้วย Python / Pillow: ไฟล์ส่งมอบครบ 3 ไฟล์, `icon-trash.webp` ขนาด 256×256 และมีช่องอัลฟาซึ่งมีทั้งพิกเซลโปร่งใสและพิกเซลที่มองเห็นได้ คำสั่งสำหรับตรวจซ้ำจากราก repo:

```sh
python3 - <<'PY'
from pathlib import Path
from PIL import Image

out = Path('docs/art-reviews/2026-11-13-trash-icon')
for name in ('icon-trash.webp', 'compare.png', 'README.md'):
    path = out / name
    assert path.is_file() and path.stat().st_size > 0, name
    print(f'file: {name} ({path.stat().st_size} bytes)')
with Image.open(out / 'icon-trash.webp') as im:
    assert im.size == (256, 256), im.size
    assert 'A' in im.getbands(), im.mode
    lo, hi = im.getchannel('A').getextrema()
    assert lo == 0 and hi > 0, (lo, hi)
    print(f'icon: {im.size}, {im.mode}, alpha={lo}..{hi}')
PY
```

## Self-check เทียบเกณฑ์รับงาน

| เกณฑ์ | หลักฐาน / ข้อสังเกต |
| --- | --- |
| 256×256 พื้นโปร่งใส | ผลตรวจขนาดและอัลฟาของไฟล์ส่งมอบ |
| ถังขยะมองตรง 1 เฟรม ไม่มีตัวอักษร | ภาพนิ่งใน `icon-trash.webp` และภาพเทียบ |
| สไตล์เส้นทองเข้าชุดกับ icon-close และเปิดต้นแบบก่อน | ใช้ต้นแบบเป็นภาพอ้างอิงของ ImageGen; ดูคู่กันใน `compare.png` |
| อ่านออกที่ 26 px | แถวบนของภาพเทียบแสดงขนาดจริง เห็นฝา หูจับ และลำตัว; เป็นการพิจารณาด้วยสายตา |
| WebP lossless | ส่งออกด้วยตัวเลือก `lossless=True` ของ Pillow |
| งบ ImageGen ≤4 และ retry ≤2 | ใช้ 1 generation / retry 0 |
| ปลายทางและไฟล์ครบ พร้อม README ไทย | มีทั้ง 3 ไฟล์ในโฟลเดอร์นี้ |

การตรวจอัตโนมัติจำกัดที่ไฟล์ครบ ขนาด และอัลฟาตาม brief ส่วนภาพเทียบมีไว้ให้พิจารณารูปทรงและความเข้าชุด ไม่ได้ทดสอบในเกม
