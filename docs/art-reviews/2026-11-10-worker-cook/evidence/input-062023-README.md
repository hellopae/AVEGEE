# คนงานปั้นข้าวปั้น — รอบแก้ 11 พ.ย. 2569

**สถานะ `incomplete` — แก้ภาพ cyberhell จริงแล้ว แต่หน้า สัดส่วน รายละเอียดประจำด้าน และ loop ยังไม่ครบเกณฑ์รับงาน**

นำเข้าชุดล่าสุดจาก `20261111T023956Z-6e08c441` แล้ววาดแก้ cyberhell cook ทั้งสองทิศ รวม 16 ช่องด้วย **ImageGen ในตัว 4 ครั้ง ครั้งละ 4 เฟรม** คงท่าตักข้าว ปั้น กด วาง และคืนมือจากชุดเดิม ใช้ต้นฉบับตรงทิศเป็น reference หัว/ใบหน้า และแนบชุดที่เพิ่งสร้างเพื่อรักษาความต่อเนื่อง ไม่ใช้ Shado หรือ API ภายนอก ไม่ตัดหัวต้นฉบับมาแปะ และไม่ใช้การเลื่อนหรือเฟดภาพนิ่งเพื่อสร้าง animation

โควตารอบเดิม 16 ครั้งสิ้นสุดแล้ว ตามคำสั่งล่าสุดรอบแก้ใหม่นี้ใช้ได้ไม่เกิน 4 ครั้งต่อ run และรวมไม่เกิน 16 ครั้ง: ประวัติชุดที่รับเข้าระบุรอบแก้ก่อนหน้านี้ 0 ครั้ง รอบนี้ใช้ 4/4 ครั้ง รวมรอบแก้ใหม่ 4/16 ครั้ง เหลือร่วมสำหรับ run ต่อไป 12 ครั้ง ไม่ใช่โควตาที่ใช้เพิ่มได้ใน run นี้ หลักฐานและ prompt ทั้งชุดอยู่ใน [generation-log.json](evidence/revision/generation-log.json) และ `evidence/revision/prompt-01.txt` ถึง `prompt-04.txt`

## สิ่งที่เปลี่ยนจากชุดล่าสุด

- `worker-cyberhell-cook-v1.webp` วาดใหม่ทั้งสองแถว ทิศซ้ายวาดแยก ไม่ใช่การ mirror แถวขวา หน้าเหลี่ยม ตาปรือ หมวก และขนาดหัวใกล้ source ขึ้น แต่ยังไม่ตรงทุกเฟรม
- GIF cyberhell สองไฟล์สร้างจาก sheet ส่งมอบใหม่, `worker-cook.json` ระบุทิศซ้าย cyberhell ว่าวาดแยกแล้ว
- เปรียบเทียบ source/ก่อนแก้/หลังแก้ที่ [baseline-before-after.jpg](evidence/revision/baseline-before-after.jpg) และภาพเทียบทั้งสี่โซนที่ `compare-<zone>.jpg`
- WebP อีก 4 ไฟล์และ GIF อีก 10 ไฟล์คง SHA-256 ตรงกับชุดล่าสุด ตรวจใน [current-audit.json](evidence/current-audit.json) ไม่วาดซ้ำโซนเหล่านี้

ไฟล์ส่งมอบทั้งหมดอยู่ในโฟลเดอร์นี้ ไม่ได้ติดตั้งเข้า `img/` และไม่ได้แก้ `src/`, `tests/` หรือเกมเดิม

## ผังไฟล์ที่คงไว้

| ไฟล์ | ขนาด RGBA | แถวบนลงล่าง |
| --- | --- | --- |
| `worker-th-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-asia-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-west-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-cyberhell-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-th-carry-v1.webp` | 2560×1280 | side, side-left, down, up |

ทุกแถวมี 8 เฟรม ช่องละ 320×320, 8 fps, draw anchor `foot:[160,320]` ตาม [worker-cook.json](worker-cook.json) รวม 96 ช่อง GIF แยกทุกแถวใน `preview/` มี 12 ไฟล์ เวลาเฟรม 120/130 ms สลับกัน รวมรอบละ 1 วินาที วนไม่จำกัด GIF ใช้พื้นเทาเพื่อดูภาพ ส่วน WebP เป็น RGBA โปร่งใส

ตำแหน่งที่ Toby จะเสียบภายหลังคือ `img/workers/worker-<zone>-cook-v1.webp` และ `worker-<zone>-carry-v1.webp` carry asia/west/cyberhell เป็นส่วนทางเลือกตามใบงาน จึงยังไม่มี ไม่ได้วาดโต๊ะหรือเคาน์เตอร์ลงใน sprite

อ่าน `src/workers.js` ยืนยันว่า side ใช้แถว 1, down แถว 4, up แถว 5 และ renderer กลับด้านตาม `face` ภาพตรวจใน `evidence/renderer-fit-*.jpg` ใช้ inset/fit ของโค้ดเดิมด้วย โดย TH down ใช้ scale=1.063, dx=27 และ up ใช้ scale=1.122, dx=13 เป็นการจำลองออฟไลน์ด้วย Pillow ไม่ใช่ผลในเกม

## จุดเท้าและการบรรจุเฟรม

ตรวจจาก **WebP ที่บันทึกส่งมอบแล้ว** ที่ alpha>40: cyberhell idle ต้นฉบับมีพิกเซลล่างสุด y=314, cook ก่อนแก้ y=319 และ cook หลังแก้ **y=314 ครบ 16 ช่อง** จึงแก้ความต่างแนวตั้ง 5 px ที่พบในรอบก่อนแล้ว ดูค่าทีละช่องใน [delivered-registration.json](evidence/revision/delivered-registration.json)

ImageGen ส่งกลับภาพ 1254×1254 แบบ 2×2 ช่อง จึงแยกช่อง 627×627 และลดทั้งช่องอย่างสม่ำเสมอเป็น 320×320 จากนั้นจัดฐานรองเท้า: ขวาไม่ต้องเลื่อน, ซ้ายเฟรม 1–4 ขยับลง 4 px, เฟรม 5–8 ลง 7 px การจัดตำแหน่งนี้ทำกับเฟรมที่วาดต่างกันจริง ไม่ได้ใช้สร้างท่าเดิน/ทำงานจากภาพเดียว

สคริปต์บรรจุเก็บ alpha ภายในตัว sprite และตัด gutter ขอบบน/ซ้าย/ขวา 1 px ซึ่งตรวจแล้วมี alpha สูงสุดเพียง 1/255 บันทึกเศษ alpha จางที่ตกนอกขอบล่างจากการจัดฐานไว้ด้วย ไม่ตัดพิกเซล alpha>40 รายละเอียดอยู่ใน [packing.json](evidence/revision/packing.json) และทำซ้ำได้ด้วย `pack_revision.py` ภาพ generated ต้นทางทั้งสี่ชุดยังอยู่ใน `evidence/revision/generated-*.webp` ส่วน target PNG ที่ส่งเข้าเครื่องมือเก็บเป็น WebP lossless ซึ่งตรวจ RGBA ตรงกันใน `input-storage.json`

**ยังไม่รับรองจุดเท้าทางกายวิภาคและแกน X**: source idle เดิมมีตำแหน่งแนวนอนต่างกันระหว่างคอลัมน์ การตรงกันของขอบ alpha ล่างและ manifest anchor ไม่พิสูจน์ว่าฝ่าเท้าและขนาดหัวตรง source ทุกจุด

## ผลดูภาพจริงและสิ่งค้าง

| โซน/ท่า | ผลที่เห็นจาก source, ภาพเทียบ และเฟรมที่ถอดจาก GIF |
| --- | --- |
| TH cook | หัวกว้างและลำตัวสั้นกว่า source มุมหัว/หมวกเปลี่ยนช่วง 4→5; ทิศซ้ายยัง mirror เครื่องมือ |
| asia cook | หน้า/ตาและเส้นขอบเรียบกว่าต้นฉบับ ช้อนคืนท่าช่วง 8→1; ทิศซ้ายยัง mirror รายละเอียดด้านเดียว |
| west cook | หัวเล็ก ช่วงขาเด่นกว่าต้นฉบับ stance เปลี่ยนช่วง 7–8; ทิศซ้ายยัง mirror กระเป๋า |
| cyberhell cook | วาดแก้หัวและใบหน้าใกล้ source ขึ้น และฐานแนวตั้งตรงแล้ว แต่หัวสองทิศยังขนาดต่างกัน/เปลี่ยนช่วง 4→5, กระเป๋า/สัญลักษณ์ซ้ายยังอยู่ด้านใกล้ผิดจาก prompt และคืนมือช่วง 8→1 ยังต่าง |
| TH carry | ครบ side, side-left, down, up อย่างละ 8 เฟรม ท่าขาเปลี่ยนจริง ถือถาดข้าวปั้นสองก้อน แต่หน้า/สัดส่วนยังต่างจาก source แม้เทียบด้วย fit แล้ว |

ถอด GIF จริงทั้ง 12 ไฟล์และดูภาพเรียงครบ 96 เฟรมที่ `evidence/decoded-*.jpg` ตรวจจำนวนเฟรม เวลา การวน และความตรงกับ sheet ภายในค่า palette เฉลี่ย <3/255 ต่อช่องสีทุกเฟรมแล้ว **ยังไม่ได้ดู playback ต่อเนื่องจริงหรือทดสอบในเกม จึงไม่รับรองความลื่นของ loop** ค่าความต่างเฟรมและเฟรมไม่ซ้ำกันเป็นเพียงผลเชิงโครงสร้าง

ดูขอบบนพื้นขาว/ดำ/เขียวใหม่ครบ cyberhell cook 16 เฟรมและ TH carry 32 เฟรม รวม 12 แผ่นที่ `evidence/native-alpha-*.jpg` ไม่เห็นขอบแดงหรือเหลืองผิดปกติในภาพที่ตรวจ สีแดงผิว TH และทองของเครื่องแต่งกายเป็นส่วนของตัวละคร การตรวจเป็นภาพ composite ออฟไลน์ ส่วน cook อีกสามโซนตรวจโครงสร้าง alpha ใหม่และคงหลักฐานภาพจากชุดก่อน

## Self-check ตามเกณฑ์รับงาน

| เกณฑ์ | ผลจริง |
| --- | --- |
| 1. cook 8 เฟรมครบ 4 โซน ตัวเดิม หน้า สี ขนาด เท้า และ loop ต่อเนื่อง | จำนวน/ผังครบ และแก้ฐาน cyberhell แนวตั้งแล้ว แต่หน้า/สัดส่วน รายละเอียดประจำด้าน จุดเท้าแกน X และ loop ยังไม่ครบ → `incomplete` |
| 2. carry TH ทุกทิศ ขอบ alpha สะอาด | ครบ 4 ทิศ × 8 เฟรม ดูขอบครบ 32 เฟรมไม่เห็น fringe ผิดปกติ; หน้า/สัดส่วนตามคำสั่งรอบแก้ยังค้าง |
| คำสั่งรอบแก้: แก้ภาพจริง รักษาหัวเดิมและท่าที่วาดแล้ว | ใช้ ImageGen 4 ครั้งแก้ cyberhell จริงและคง choreography แต่ความเหมือนหัว/หน้าทั้งชุดยังไม่ครบ |
| เฉพาะโฟลเดอร์ส่งออก พร้อม README/JSON/GIF/ภาพเทียบ ≤30MB | ดูจำนวนไบต์จริง ขอบเขตเปลี่ยน และไฟล์บังคับใน `evidence/package-check.json` |

## คำสั่งตรวจที่รัน

จากราก repo ใช้ Python 3, Pillow, NumPy และ SciPy:

```sh
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/revision/pack_revision.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/audit_current.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/review_registration.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/check_package.py
git diff --check
```

`audit_current.py` ตรวจ 121 เงื่อนไข ไม่พบข้อผิดพลาด ครบ 96 ช่อง / 12 GIF; `review_registration.py` วัด source 64 ช่องและภาพส่งมอบ 96 ช่องพร้อมภาพเทียบ fit 8 แผ่น ผลเหล่านี้ไม่ใช่การรับรองงานภาพหรือ QA เกม ไม่ได้รันชุดทดสอบเกมเพราะไม่ได้แก้โค้ดเกม

รายงานปัจจุบันคือ `loop-review.json`, `queue-check.json`, `evidence/current-audit.json`, `evidence/registration-review.json`, `evidence/package-check.json` และ `evidence/revision/` ไฟล์ `latest-input-*`, `previous-round-*`, `input-*`, `prior-*`, `technical-audit.json`, `playback-access.json` และ `inspect_assets.py` เป็นประวัติเก่า ไม่ใช่ผลรอบนี้ ภาพย่อ/ภาพถอด GIF รุ่นเก่าที่ซ้ำกับชุดตรวจใหม่ถูกตัดออกจากสำเนาส่งมอบเพื่อคุมขนาด; ต้นฉบับยังอยู่ใน worktree ก่อนหน้า

ยังต้องแก้ประเด็นในตารางและดู playback ก่อนเปลี่ยน `queue-check.json` เป็น `ready` รอบนี้ไม่สร้าง/เปลี่ยน worktree หรือ branch ไม่ commit/push/merge/deploy ไม่แก้ hooks, `status.json`, `worklog.json` ไม่แตะโฟลเดอร์คุณเป้ และไม่เรียก agent อื่น
