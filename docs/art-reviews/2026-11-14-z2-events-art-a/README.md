# Z2-ART-A — ชุด A1/A2 · 14 พฤศจิกายน 2569

ส่งภาพครบ **11 ไฟล์**: A1 จำนวน 3 ภาพ และ A2 จำนวน 8 ภาพ รวม P2 แล้ว ภาพที่ค้างในขอบเขตชุดนี้: **ไม่มี**

ทำงานใน worktree และ branch ที่ได้รับ `codex/20261114T134635Z-65952d02` โดยไม่สร้างหรือสลับ branch ไม่ commit/push/merge และไม่แก้โค้ดเกม

## ไฟล์ส่งออกและผลตรวจจริง

ทุกแถวตรวจด้วย Pillow: มีไฟล์, `verify()`, เปิด decode จริง, รูปแบบ WEBP, ขนาดและโหมดสีตรงสเปก ผลรายไฟล์และ SHA-256 อยู่ใน [checks.json](checks.json)

| ชุด | ไฟล์ในเกม | ขนาด | โหมด | ผลตรวจไฟล์ |
|---|---|---|---|---|
| A1 | [cut-sita-phantom-ledger-th.webp](../../../img/z1-events/cut-sita-phantom-ledger-th.webp) | 1375×768 | RGB | OK · แทน placeholder |
| A1 | [cut-hanuman-yields-th.webp](../../../img/z1-events/cut-hanuman-yields-th.webp) | 1375×768 | RGB | OK |
| A1 | [cut-sita-return-th.webp](../../../img/z1-events/cut-sita-return-th.webp) | 1375×768 | RGB | OK |
| A2 P1 | [soul-ape-elder-asia.webp](../../../img/z2-events/soul-ape-elder-asia.webp) | 1254×1254 | RGBA | OK |
| A2 P1 | [soul-ape-elder-asia-profile.webp](../../../img/z2-events/soul-ape-elder-asia-profile.webp) | 1254×1254 | RGBA | OK |
| A2 P1 | [boss-wukong-asia.webp](../../../img/z2-events/boss-wukong-asia.webp) | 512×512 | RGBA | OK · แปลง W4 เดิม |
| A2 P1 | [boss-wukong-asia-profile.webp](../../../img/z2-events/boss-wukong-asia-profile.webp) | 512×512 | RGB | OK |
| A2 P1 | [cut-wukong-arrives-asia.webp](../../../img/z2-events/cut-wukong-arrives-asia.webp) | 1672×941 | RGB | OK |
| A2 P1 | [cut-ape-phantom-ledger-asia.webp](../../../img/z2-events/cut-ape-phantom-ledger-asia.webp) | 1672×941 | RGB | OK |
| A2 P1 | [cut-wukong-returns-asia.webp](../../../img/z2-events/cut-wukong-returns-asia.webp) | 1672×941 | RGB | OK |
| A2 P2 | [cut-wukong-yields-asia.webp](../../../img/z2-events/cut-wukong-yields-asia.webp) | 1672×941 | RGB | OK · ทำท้ายสุด |

## ภาพรวมสำหรับตรวจ

- [Contact sheet A1](contact-sheet-a1.jpg)
- [Contact sheet ตัวละคร A2](contact-sheet-a2-characters.jpg)
- [Contact sheet คัตซีน A2](contact-sheet-a2-cutscenes.jpg)

ทั้งสามแผ่นเปิด decode ได้จริง เป็น JPEG 1400×880 RGB ป้ายชื่อและตารางหมากรุกมีเฉพาะ contact sheet; ไม่ได้ฝังลงในภาพเกม

ตรวจภาพต้นฉบับและ contact sheet ด้วยสายตาแล้ว: A1 มีฉากตรวจหมึกใหม่/หนุมานลดมือโค้งศีรษะ/ประตูสวรรค์และนิราประทับตรา ส่วน A2 มีลิงเฒ่ากอดห่อผลท้อแห้ง, โปรไฟล์, หงอคงลงจากหลังคาบนเมฆทอง, ตรวจแฟ้มขณะหงอคงกอดอก, กลับบนเมฆคู่ลิงเฒ่า และหยุดฟังนิราพร้อมปักกระบอง ไม่มีข้อความที่อ่านเป็นภาษาในภาพเกม ตราเบาะแสเป็นวงกลมขาดกับเส้นตัดสีแดง ใช้รูปทรงเดียวกันในสองคดี

## แหล่งอ้างอิงและวิธีส่งออก

- อ่านบท Rae หัวข้อ 9 และตารางภาพ Claudy ตาม path ใน brief ใช้ขนาดจากตาราง Claudy โดยเฉพาะ `cut-wukong-yields-asia.webp` เป็น **1672×941**
- หนุมาน/สีดายึด `img/z1-events/cut-hanuman-descends-th.webp`, `boss-hanuman-th.webp` และ `soul-sita-th-profile.webp` ของเกม ไม่ใช้ W4
- ยามายึด `img/hero-yama-asia-mirror-cutscene-v3.webp`: ผิวแดง เขาคู่ หมวกดำคาดทอง ชุดลายดอกแดง/ครามขอบทอง
- นิรา A1 ยึด `img/crew-nira-profile.webp`; A2 ยึด `img/Asia/crew-nira-asia-profile.webp`: คนเดิม ผิวม่วง เขาคู่ มวยผมม่วง และชุดกิโมโนลายดอกคราม/ทอง อ่านชื่อตัวละครจาก `CREW` ใน `src/data.js` แล้ว ไม่เพิ่มตัวละครทีมอื่น
- หงอคงยึด W4 `w4-sun-wukong-v1.png` ทุกภาพ: หน้าขนสีน้ำตาลทอง เกราะดำ/ทองกับผ้าแดง ห่วงทอง กระบองแกนแดงปลายทอง ไม่มีหมวกขนหงส์ตามข้อแก้ล่าสุดของ brief
- ลิงเฒ่าต่อยอด W4 `w4-huaguoshan-monkey-spirit-v2.png`: เพิ่มวัย ขนหงอก คิ้วและเคราขาว หลังโกง ผ้าสีเสจและห่อผลท้อแห้ง ใช้สัดส่วน/โทนวิญญาณบูรพาจาก `img/Asia/spirit-woman-asia-v2.webp` ตัวเต็มนั่งยองเห็นครบทั้งตัวตามตาราง ส่วนโปรไฟล์เป็นครึ่งตัว
- วาดด้วย **ImageGen ในตัว** ทีละภาพ ไม่ใช้ API/CLI หรือ Shado generation โดยยึดเครื่องมือที่ brief ระบุ เก็บ prompt และรายการภาพอ้างอิงใน [prompts.json](prompts.json)
- ภาพวาดส่งออก WebP **quality=86, method=6** ภาพ RGBA ใช้สี q86 และตรวจ alpha หลัง encode เทียบภาพต้นฉบับที่ปรับขนาดแล้วได้ตรงทุกพิกเซล มุมภาพโปร่งใสจริง ค่า alpha ครอบคลุม 0–255
- `boss-wukong-asia.webp` ใช้ Pillow แปลง W4 เดิมโดย **lossless=True, exact=True** ไม่ resize และไม่วาดใหม่ ตรวจ RGBA ทั้งหมดเท่าต้นฉบับทุกพิกเซล
- การปรับขนาดใช้ LANCZOS โดยไม่ตัดองค์ประกอบออก บันทึกขนาดต้นฉบับ ตัวเลือก encode และ hash ก่อน/หลังใน [exports.json](exports.json)

## งบและ retry

เรียก ImageGen **12 ครั้งจากงบ 16** ได้ภาพผลลัพธ์ 11 ครั้ง เลือกใช้เป็นภาพเกม 10 ภาพ และแปลง W4 เดิมเพิ่ม 1 ไฟล์

1. โปรไฟล์ลิงเฒ่ามีคำขอแรกถูกปฏิเสธก่อนสร้างภาพ เพราะอ่าน WebP ขณะการเข้ารหัสยังไม่จบ แก้ให้รอไฟล์เสร็จและใช้ PNG ต้นฉบับเป็นอ้างอิง ขอใหม่ 1 ครั้ง
2. ฉากกลับขึ้นเมฆมีการแก้ภาพ 1 ครั้ง เพื่อลบตราสี่เหลี่ยมในสมุดที่ดูคล้ายอักษร เหลือกระดาษว่างกับรอยขีดฆ่าแดงเรียบ ๆ

ไม่มีภาพใด retry เกิน 1 ครั้ง ทำ A1 ครบก่อน A2 และทำ P2 หลัง P1 ครบ

## การตรวจที่รัน

```sh
python3 docs/art-reviews/2026-11-14-z2-events-art-a/check_art.py
git diff --check
```

- `check_art.py` จบ exit 0: **11/11** ตรวจไฟล์และ SHA-256 รวม hash alpha เทียบต้นฉบับ และ hash RGBA เทียบ W4 สำหรับหงอคง
- ตรวจเทียบภาพต้นฉบับก่อน encode ด้วย Pillow: alpha ตรงกันทั้ง 3 ไฟล์ RGBA; หงอคง W4 มี RGBA ตรงกันทั้งไฟล์ บันทึก hash หลักฐานใน `exports.json`
- เปิด `verify()` และ decode contact sheet ทั้ง 3 แผ่น: JPEG/RGB 1400×880
- `git diff --check` จบ exit 0

ผลเหล่านี้เป็นการตรวจไฟล์ภาพ ไม่ใช่ผล QA หรือการเล่นทดสอบเกม

## ตรวจตนเองตามเกณฑ์รับงาน

| เกณฑ์ | หลักฐาน/สถานะ |
|---|---|
| A1 ครบ 3 ภาพก่อนเริ่ม A2 | ครบ ชื่อและ path ตาม brief |
| A2 ตารางข้อ 1–6 รวม P2 | ครบ 8 ไฟล์ ทำ yields ท้ายสุด |
| ขนาดและ RGB/RGBA ถูกต้อง เปิดได้ | `checks.json` 11/11 |
| WebP q86 และ alpha lossless | ตัวเลือก export และ hash alpha ตรงต้นฉบับ; W4 lossless ทั้ง RGBA |
| หงอคงเดิมไม่วาดใหม่ | ตัวบอสแปลง W4 512² ตรงทุกพิกเซล; โปรไฟล์/คัตซีนใช้ W4 เป็นอ้างอิง |
| หนุมาน/สีดา/ยามา/นิราคงหน้าและชุดอ้างอิง | ตรวจต้นฉบับและ contact sheet ด้วยสายตา แยกชุดนิรา A1/A2 ตามไฟล์อ้างอิง |
| ไม่มีตัวอักษรในภาพ | ตรวจด้วยสายตา และแก้ตราที่คล้ายอักษรใน returns ก่อนส่ง |
| งบ ≤16 และ retry ≤2 ต่อภาพ | 12 คำขอ; retry สูงสุด 1 ต่อภาพ |
| Contact sheet JPG + README ไทย + รายการค้าง | ครบ 3 แผ่น; ไม่มีภาพค้างในชุดนี้ |
| จำกัดขอบเขตและ git | เปลี่ยนเฉพาะ 11 ภาพกับโฟลเดอร์ review นี้ ไม่แก้ hooks/status.json/worklog.json ไม่ deploy ไม่เรียก agent ไม่ commit/push/merge |

## จุดที่ยังต้องผูกเข้าฉากเกม

ใน worktree ที่ได้รับ `src/z1-events.js` บรรทัด 76 และ 78 ยังให้ `SITA.art.yield` และ `SITA.art.return` ใช้ `cut-hanuman-descends-th.webp` ต้องเปลี่ยนตัวอ้างอิงเป็นภาพใหม่ในงาน integration ต่อไป ส่วน `SITA.art.phantom` อ้างชื่อไฟล์ที่แทน placeholder แล้วโดยตรง

ยังไม่มี `src/z2-events.js` หรือการอ้างชื่อ asset หงอคง/ลิงเฒ่าใน `src/` ของ worktree นี้ ภาพ A2 พร้อมตาม path ที่ brief กำหนด แต่ยังไม่ได้ยืนยันการแสดงในฉากเกม งานนี้คงขอบเขตการผลิตภาพตามตารางที่ระบุว่าไม่ต้องแก้โค้ด
