# AKURA-NOCHAIN — อากุระไม่มีโซ่ (14 พฤศจิกายน 2569)

แก้ภาพเดิมด้วย **ImageGen ในตัว** ให้ข้อมือทั้งสองข้างเปลือย ไม่มีตรวน โซ่ หรือกำไลเหล็ก เหลือรอยด้าน/แผลเป็นเก่าจาง ๆ ใช้ต้นฉบับจาก worktree นี้เป็นภาพตั้งต้นทุกครั้ง

ไม่พบไฟล์ `Output/Rae/2026-11-14-avegee-z2-events.md` ใน worktree จึงยึดเนื้อเรื่องและคำยืนยันที่แนบอยู่ใน brief โดยตรง ไม่ได้ตรวจเนื้อหาไฟล์ดังกล่าว

## ไฟล์ที่เขียนทับ

| ไฟล์ใน repo | ขนาด / โหมด | การเข้ารหัส | ผลที่เลือก |
| --- | --- | --- | --- |
| `img/Asia/boss-frontier-asia.webp` | 512×512 RGBA | WebP lossless, method 6 | ครั้งที่ 2 |
| `img/Asia/boss-frontier-asia-cutscene-asia.webp` | 512×512 RGBA | WebP lossless, method 6 | ครั้งที่ 2 |
| `img/frontier-asia-intro-v1.webp` | 1672×941 RGB | WebP q86, method 6 | ครั้งที่ 1 |

สร้างภาพทั้งหมด 6 ครั้ง: ภาพละ 2 ครั้ง (แก้ซ้ำภาพละ 1 ครั้ง) อยู่ในงบไม่เกิน 8 ครั้ง และไม่เกินแก้ซ้ำ 2 ครั้งต่อภาพ ภาพสำรองที่ไม่ได้เลือกไม่รวมในชุดส่งมอบ

ภาพโปร่งใสจาก ImageGen ขนาด 1254×1254 ย่อกลับเป็น 512×512 ด้วย Lanczos โดยไม่ครอป เปลี่ยนอัลฟาต่ำกว่า 8 เป็นศูนย์ เก็บเฉพาะองค์ประกอบหลักของภาพยืนเพื่อลบฝุ่นนอกขอบ 27 พิกเซล สำหรับภาพท่าฟาดลบเฉพาะกลุ่มไม่เกิน 4 พิกเซลที่มีอัลฟาสูงสุดต่ำกว่า 32 รวม 93 พิกเซล และเก็บสะเก็ด/เศษกระเด็นที่สว่างกว่าไว้ เปรียบเทียบอัลฟาก่อนและหลังเข้ารหัส WebP แล้วตรงกันทั้งหมด

## ภาพเทียบ ซ้ายเดิม | ขวาใหม่

ป้าย BEFORE/AFTER อยู่ในภาพเอกสารเทียบเท่านั้น ไม่ได้ใส่ในไฟล์ภาพเกม พื้นตารางใช้แสดงความโปร่งใส

- [ภาพยืน](boss-frontier-asia-before-after.jpg)
- [ภาพท่าฟาด](boss-frontier-asia-cutscene-asia-before-after.jpg)
- [ฉากชายแดน](frontier-asia-intro-v1-before-after.jpg)

## ตรวจตัวเองตามเกณฑ์รับงาน

| เกณฑ์ | ผลตรวจและข้อจำกัด |
| --- | --- |
| 1. ภาพยืนไม่มีตรวน/โซ่ ข้อมือเปลือย มีรอยเก่า | ตรวจภาพส่งออกแล้วไม่เห็นโลหะหรือโซ่ที่ข้อมือทั้งสอง มีรอยเก่าบนผิว คงกระบอง เขา ผม ผ้าเสือ เชือก รองเท้าและท่ายืนในองค์ประกอบเดิม แต่เส้น/พื้นผิวมีความต่างเล็กน้อยจากการสร้างภาพ |
| 2. ภาพท่าฟาดไม่มีตรวน/โซ่ คงท่าและเอฟเฟกต์ | ตรวจภาพส่งออกแล้วไม่เห็นตรวนหรือโซ่ทั้งสองข้อมือ คงท่าจับกระบองและแนวฟาดหลัก มีการวาดเส้น/สะเก็ดบางส่วนต่างจากเดิม เปลี่ยนพื้นดำทึบเดิมรอบภาพให้โปร่งใส |
| 3. ฉากชายแดนไม่มีตรวน/โซ่ และฉากหลังคงเดิมทุกอย่าง | ไม่เห็นตรวนหรือโซ่ที่ข้อมือแล้ว องค์ประกอบฉากและสิ่งของหลักอยู่ตำแหน่งเดิม แต่ **เกณฑ์ฉากหลังคงเดิมทุกอย่างยังไม่ครบถ้วน**: ImageGen เปลี่ยนรายละเอียดพื้นผิวบางจุด จึงไม่อ้างว่าพิกเซลฉากหลังเหมือนต้นฉบับ |
| ไฟล์ครบ เปิดได้ ขนาด/โหมดสีเดิม | ตรวจทั้งสามด้วย Pillow verify/load และ assertions ตรงตามตาราง ดูค่าจริงและ SHA-256 ใน checks.json |
| อัลฟาขอบสะอาดสำหรับข้อ 1–2 | ตรวจบนพื้นสว่าง/มืดและพื้นตาราง ไม่มีกรอบดำ พิกเซลอัลฟา 1–7 เป็นศูนย์ มุมทั้งสี่โปร่งใส ภาพยืนเหลือองค์ประกอบเชื่อมต่อเดียว ภาพท่าฟาดไม่มีฝุ่นกลุ่มเล็กตามเกณฑ์ข้างต้น ตรวจอัลฟาเข้ารหัสแบบ lossless ด้วยการเทียบก่อน/หลัง |
| WebP ภาพวาด q86 / อัลฟา lossless | ฉาก RGB บันทึก q86; ภาพ RGBA ทั้งภาพเป็น lossless ตรวจ RIFF ว่าใช้ VP8 และ VP8L ตามลำดับ |
| ไม่มีตัวอักษรในภาพ | ตรวจภาพส่งออกด้วยตา ไม่พบข้อความหรือ watermark เพิ่ม สัญลักษณ์ตกแต่งธง/ประตูในฉากเดิมยังอยู่เพื่อรักษาองค์ประกอบฉาก ไม่ได้ตรวจด้วย OCR |
| งบและการแก้ซ้ำ | 6/8 ครั้ง แก้ซ้ำ 1/2 ครั้งต่อภาพ |
| เอกสารภาพเทียบ JPG และ README ไทย | มี JPG ครบสามคู่และ README นี้ พร้อม checks.json |
| ขอบเขต git และงาน | ใช้ worktree/branch ที่ได้รับ ไม่สร้างหรือสลับ branch ไม่ commit/push/merge ไม่ deploy ไม่แก้ hooks, status.json, worklog.json หรือโค้ดเกม |

## การตรวจที่รัน

```sh
node --test tests/30a.test.mjs tests/i2b-frontier-boss.test.mjs tests/asset-paths-runtime.test.mjs
```

ผล **24 tests, 24 pass, 0 fail** มี ExperimentalWarning เรื่อง localStorage ของ Node แต่คำสั่งจบด้วย exit code 0 ชุดนี้ตรวจทางเลือกภาพฉาก การอ้างไฟล์ และพฤติกรรมบอสที่มีอยู่แล้ว ไม่ได้ตรวจว่าไม่มีโซ่ด้วยระบบอัตโนมัติ และไม่ได้รันเกมเพื่อทดสอบภาพจริง

ตรวจไฟล์ด้วย Python/Pillow: เปิด/ถอดรหัส ขนาด โหมด ช่องอัลฟา RIFF chunks อัลฟา lossless round-trip และเปิด JPG ทั้งสามสำเร็จ บันทึกผลใน [checks.json](checks.json) ผลเหล่านี้เป็นการตรวจเฉพาะส่วน **ไม่ใช่การรับรอง QA ของเกม**

ตรวจไฟล์ส่งมอบซ้ำจากราก repo ได้ด้วยคำสั่งต่อไปนี้ (ต้องมี Pillow):

```sh
python3 - <<'PY'
import hashlib, json
from pathlib import Path
from PIL import Image
review = Path("docs/art-reviews/2026-11-14-akura-nochain")
report = json.loads((review / "checks.json").read_text())
for row in report["assets"]:
    p = Path(row["path"])
    assert hashlib.sha256(p.read_bytes()).hexdigest() == row["sha256"], p
    with Image.open(p) as im:
        im.verify()
    with Image.open(p) as im:
        im.load()
        assert im.format == "WEBP"
        assert list(im.size) == row["size"] and im.mode == row["mode"]
        if im.mode == "RGBA":
            a = im.getchannel("A")
            hist = a.histogram()
            assert sum(hist[1:8]) == 0 and hist[0] > 0 and hist[255] > 0
            assert [a.getpixel(xy) for xy in
                    [(0, 0), (511, 0), (0, 511), (511, 511)]] == [0] * 4
for name in report["comparisons"]:
    with Image.open(review / name) as im:
        assert im.format == "JPEG"
        im.verify()
print("verified: 3 WebP assets and 3 JPEG comparisons")
PY
```

## Prompt ของภาพที่เลือก

โหมด built-in ImageGen edit ใช้ภาพต้นฉบับแยกทีละไฟล์ ภาพยืน/ท่าฟาดตั้ง transparent_background=true และฉากชายแดนตั้ง false

### ภาพยืน — ครั้งที่ 2

```text
Surgical local image edit, precise-object-edit. Edit ONLY the ORIGINAL attached image. It is the finished illustration, NOT a style reference: do NOT redraw/re-render the whole image. Remove both iron wrist cuffs and all their attached chain links at left image wrist at (90,178) and dangling links down to (50,250); right image wrist at (403,300) and dangling links down to (441,375). Reconstruct bare red skin wrists with faint old calluses/scars and the originally occluded areas, matching the immediately adjacent original pixels. No wrist jewelry, metal bands, shackles or chains remain. Keep the original colors, shading, crisp brushwork and line outlines. Keep the EXACT original grinning face, muscular proportions, leg stance, club angle, tiger stripes, rope knot and sandals. Keep the character exactly in its original 512x512 canvas position. All unrelated pixels, character face, horns, white hair, spiked club, tiger pelt, rope and shoes must stay EXACTLY as input. Preserve composition and pose. No added text or watermark. Return only the edited original image.
```

### ภาพท่าฟาด — ครั้งที่ 2

```text
Surgical local image edit, precise-object-edit. Edit ONLY the ORIGINAL attached image. It is the finished illustration, NOT a style reference: do NOT redraw/re-render the whole image. Remove both iron wrist cuffs and all their attached chain links at horizontal wrist near (347,377) and bent raised wrist near (410,316), including the short dangling links to their right. Reconstruct bare red skin wrists with faint old calluses/scars and the originally occluded areas, matching the immediately adjacent original pixels. No wrist jewelry, metal bands, shackles or chains remain. Keep the original colors, shading, crisp brushwork and line outlines. Keep the EXACT original club and motion-trail shape, debris, face, hair strands, torso, tiger stripes, rope knot and 512x512 canvas position, with the top 226px empty. Replace the black empty background around subject/effects with real transparency without altering the effects. All unrelated pixels, character face, horns, white hair, spiked club, tiger pelt, rope and shoes must stay EXACTLY as input. Preserve composition and pose. No added text or watermark. Return only the edited original image.
```

### ฉากชายแดน — ครั้งที่ 1

```text
Use case: precise-object-edit. Edit target: the attached wide border fortress scene of red oni Akura. Remove ONLY both riveted iron wrist manacles and all dangling chain links attached to them. Left side of image: around the hand holding the club over his shoulder. Right side: around the foreshortened reaching hand and hanging chain below it. Replace the wrist cuffs with anatomically natural bare red wrists with faint old callus/scar marks in the skin (NOT metal, NOT bracelets, NOT rope bands). Fill former chain areas with the exactly corresponding fortress wall/background or body. Preserve the entire original scene, exact composition, camera, pose, face, horns, hair, club, tiger pelt, waist rope, sandals, pixel-art brushwork, lighting and palette. Keep ALL background architecture, banners, gates, braziers, smoke, clouds, moon, trees and ground unchanged. No framing changes, cropping or added objects. Maintain original wide 1672x941 aspect ratio. Do not add any text, lettering or watermark; retain existing background visual details. Output only the edited scene, not a comparison.
```

