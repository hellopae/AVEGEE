# Z1-V7-FLUIDS — รับต่อและตรวจซ้ำ 11 พฤศจิกายน 2569

**สถานะ `incomplete` — ยังไม่ครบเกณฑ์รับงาน ไม่ใช่งานที่รับรอง QA หรือพร้อมสลับเข้าเกม**

รับต่องานเดิมโดยคัดลอก 75 ไฟล์ของโฟลเดอร์งานนี้จาก `20261110T122730Z-bde65eb4` (commit อ้างอิง `96a73fcf`) ก่อน แล้วทับด้วยผลงานล่าสุด `20261111T014532Z-dfacde20` จำนวน 277 ไฟล์ จากนั้นแตก archive ออฟไลน์ตามใบงาน การอ่านต้นทางทั้งหมดเป็นแบบอ่านอย่างเดียว ลำดับรับต่อและ hash อยู่ใน [continuation-provenance.json](review/continuation-provenance.json)

รอบนี้แก้ alpha ของน้ำตกฟ้า 3 จุดและแถบฝั่งน้ำแข็ง รวมสร้าง aggregate ใหม่ ตรวจภาพพื้น/เฟรมที่มีอยู่ และเรนเดอร์ภาพเทียบกับคลิปใหม่ **0 generations** ไม่วาดชิ้นเดิมซ้ำ ไม่เรียกบริการสร้างภาพอื่น เฟรมวาด ImageGen, sheets, layout และพื้น v7 มาจากรอบก่อนทั้งหมดและตรวจ hash ว่าไม่เปลี่ยน ส่วนที่แก้เป็นการตัด mask ทางเรขาคณิตจากภาพพื้น ไม่สร้างเฟรมวาดใหม่

## สิ่งที่แก้และหลักฐานก่อน/หลัง

| Mask | พิกเซลก่อน → หลัง (native 2×) | สิ่งที่แก้ |
|---|---:|---|
| `icefall-upper-tree` | 6,578 → 668 | เหลือส่วนที่เห็นน้ำตกหลังต้นไม้ ตัดกิ่งหิมะ หินสีฟ้า และแอ่งราบที่เดิมรับภาพน้ำตก |
| `icefall-summit` | 64,208 → 62,375 | ตัดผิวแข็งของยอดหินเบื้องหน้า เพิ่มระยะกันขอบ 3 พิกเซล |
| `icefall-east-cliff` | 7,582 → 6,507 | ตัดยอดหินสีฟ้าที่อยู่หน้าน้ำตก |
| `shore-band-ice` | 209,521 → 13,960 | เก็บเฉพาะพิกเซลเดิมใกล้แนวฝั่งที่อ่านจากภาพพื้นโดยตรง ไม่ใช้ขอบลวดลายกลางน้ำเป็นฝั่ง |
| `shore-band` | คำนวณใหม่ | union ของ ice/spirit ที่แก้แล้ว ตรวจตรงกับ component ทั้งสอง |

ดู [ผลคำนวณพร้อม SHA-256](review/mask-correction-result.json), [geometry สำหรับแก้](review/mask-corrections.json) และภาพ [upper-tree](review/boundary/icefall-upper-tree-repair.webp), [summit](review/boundary/icefall-summit-repair.webp), [east-cliff](review/boundary/icefall-east-cliff-repair.webp), [แถบฝั่งลำธารกลาง](review/boundary/ice-stream-flat-central-shore-repair.webp) แต่ละภาพเป็น **พื้น | mask ก่อน | mask หลัง** เก็บ before masks สำหรับตรวจซ้ำใน `review/before-masks/`

การตัดลดพื้นที่อย่างตั้งใจ โดยเฉพาะ upper-tree และ shore band จึงไม่อ้างว่าครอบคลุมขอบน้ำหรือผิวน้ำทุกส่วน แถบฝั่งน้ำแข็งเป็นแนวฝั่งบางช่วงที่ตรวจแล้วเท่านั้น ใช้รัศมี 12 native pixels ≈4.69 world จากเส้นที่ trace; ระยะนี้วัดถึงเส้น trace ไม่ใช่หลักฐานสำรวจระยะถึงฝั่งจริงครบทั้งแผนที่ `shore-band-spirit` ยังใช้ของเดิม

## ผลตรวจขอบ: แยก regression ออกจากเกณฑ์ ≤3%

รอบก่อนระบุพื้นที่ผิวแข็งจากภาพพื้นโดยไม่อ่าน annotation สร้าง mask ได้อย่างน้อย:

- upper-tree: 282 / 6,578 = **4.287017%**
- summit: 825 / 64,208 = **1.284887%**
- east-cliff: 11 / 7,582 = **0.145080%**

ผลก่อนแก้อยู่ใน [before-mask-review.json](review/before-mask-review.json) หลังแก้ รันนับ intersection กับพื้นที่ผิวแข็งชุดเดิมซ้ำ ได้ **0 พิกเซลทั้งสามจุด** และตัวอย่าง shore-band-ice ที่เคยมี 121 พิกเซลไกลฝั่งเกิน 12 world เหลือ 0 ที่ตัวอย่างเดิม ดู [ผล regression](review/independent-mask-review.json) และ [shore-witness-result.json](review/shore-witness-result.json)

**ค่า 0 เหล่านี้ไม่ใช่ % นอกของเหลวรวมและใช้ยืนยันว่า ≤3% ไม่ได้** เป็น regression ของข้อบกพร่องที่แก้ไปแล้ว พื้นที่ที่ไม่ติด label ยังเป็น unknown ต้องมี semantic reference บนภาพพื้นครบขอบเพื่อหาค่าจริงหรือขอบเขตบน รายงานปัจจุบันจึงคง `outsideDrawnLiquidPercent: null` ครบ 37 masks และไม่ใช้ค่า 0% จาก annotation ก่อสร้างยืนยันตัวเอง ภาพ overlay ของ 3 masks ที่แก้ถูกสร้างใหม่; จุดอื่นไม่เปลี่ยน

## ช่องว่าง coverage ที่ยืนยันได้

พบน้ำตกขั้นเล็กด้านล่างแอ่ง summit ในพื้น v7 ซึ่งไม่มี effect ครอบเลย ระบุพื้นที่ตัวอย่างบนภาพพื้นต้นฉบับ **528 พิกเซล** แล้วเทียบ union ของ masks ที่ layout ใช้ทั้งหมด ได้ **0 / 528 พิกเซล** ดู [ภาพหลักฐาน](review/boundary/summit-lower-drop-coverage.webp) และ [coverage-witness-result.json](review/coverage-witness-result.json)

นี่เป็นตัวอย่างโต้แย้งเกณฑ์ “ทุกน้ำตกที่วาดในพื้นขยับ” ไม่ใช่การสำรวจจำนวนทุกน้ำตกครบแผนที่ ตรวจ source เฟรม summit ที่มีแล้วด้วย แต่ยังไม่ขยาย alpha ไปใช้ส่วนนี้โดยไม่มีหลักฐานว่าภาพเคลื่อนไหวตรงกับขั้นน้ำตกจริง ต้องทำ coverage/registration ให้ครบและตรวจรูปทรงก่อนเพิ่มหรือวาดเฟรมส่วนที่ขาด

ช่องลาวา `lava-flat-left-bottom` / `lava-flat-southwest` ยังต้องจำแนกหน้าลาวาตกกับผิวราบจากภาพโดยตรง การตรวจว่าชื่อ mask ขึ้นต้น `lava-flat-` เพียงอย่างเดียวไม่ยืนยันตำแหน่ง bubble/steam/embers บนผิวราบจริง ไม่มีการอ้างว่าไอทุกจุดทับลาวาตกโดยไม่ได้ตรวจ footprint ของ sprite

## ภาพเทียบและคลิปปัจจุบัน

เปิด [หน้าหลักฐาน](review/index.html) หรือไฟล์ต่อไปนี้:

- [น้ำตกฟ้า 10 จุด](review/contact-icefalls.jpg), [ลาวาตก 8 จุด](review/contact-lavafalls.jpg), [ผิวราบ/ลำธาร/แม่น้ำ 13 จุด](review/contact-streams.jpg): **พื้น | พื้น+effect** รวม 31 จุด
- [มุมคุณเป้ 2](review/clips/owner-2-ice-bridge.mp4), [มุมคุณเป้ 3](review/clips/owner-3-lava.mp4), [มุมคุณเป้ 4](review/clips/owner-4-central-stream.mp4)

คลิปทั้งสามเรนเดอร์ซ้ำจาก mask ปัจจุบัน **12.000 วินาที / 24 fps / 960×776 / decode ครบ 288 เฟรมต่อไฟล์** ไม่มี decoder error ก่อน encoding มีภาพต่างกัน 8 / 288 / 8 ภาพตามลำดับ จำนวน 288 ของมุมลาวาเกิดจาก timing ของ spots ไม่ใช่เฟรมวาดใหม่ 288 เฟรม

`offline-render-report.json` เก็บ SHA-256 ของ layout, renderer, พื้น, masks, sheets และไฟล์ผลลัพธ์ ตรวจซ้ำว่า inputs/outputs ยังตรงกับรายงาน มุมกล้องเป็นการจับคู่ landmark โดยประมาณตามสำเนาภาพคุณเป้ใน `review/owner-reference/` ไม่ได้กู้ transform กล้องเกมเดิมหรือแก้โฟลเดอร์คุณเป้

เป็น Pillow offline renderer ที่ใช้ blend screen จากสคริปต์ใน archive; hold เฟรมวาดตาม fps ไม่มี runtime cross-fade/GPU mips/profile throttling และ spots ใช้ alpha-over ต่างจาก runtime lighter accumulation **ไม่ได้ทดสอบสลับเข้าเกมหรือรับรองการเล่นวนด้วยตาครบคลิป** `review.html` เป็น preview ที่รับต่อมา ไม่ใช่หลักฐานว่า runtime ผ่าน

## เฟรมและ loop-review

ตรวจ sheet ที่ layout ใช้ 21 แผ่น น้ำตกฟ้า 10 จุดมีจุดละ **8 เฟรม 800×800** และตรวจขนาด cell ของ source จริง ≥800 ทั้งสองด้าน ลาวาตก 8 จุดใช้ sheet fluids-HD เดิม **8 เฟรม 314×534** ไม่ขยายแล้วอ้างว่าเป็นภาพ native 800

คำนวณ [loop-review.json](loop-review.json) ใหม่สำหรับน้ำตก/ลาวาตกทั้ง 18 จุด โดยนับ RGB เฉพาะพื้นที่ที่ยังมองเห็นผ่าน **mask ปัจจุบันและ alpha ของ sheet** รวมรอยต่อ 8→1 ทุกจุดยังมี 8 phases ที่ต่างกัน upper-tree มี wrap/median ≈1.909 และ largest/median ≈3.122 จึงยังต้องตรวจการกระโดดของ loop ด้วยตา ตัวเลขเหล่านี้ไม่ใช่การยืนยันความลื่น ไม่ได้สร้างเฟรมด้วยการเลื่อน/เฟดภาพนิ่ง ไม่มี DOF/parallax/bloom เพิ่มในรอบนี้

คำสั่งวาดและ provenance รอบก่อนอยู่ใน [generation-prompts.json](generation-prompts.json), [generation-prompts-continuation.json](generation-prompts-continuation.json) และ `input/fluids-hd-generation-prompts.json` ไม่มี prompt หรือ generation ใหม่ในรอบนี้

## Layout และจุด off เดิม

`fx-layout.json` ไม่เปลี่ยนจากรอบล่าสุด: schemaVersion 4, 46 pieces / 33 masks ที่อ้างอิง / 21 sheets ฟองริมฝั่งแม่น้ำม่วง 30 spots ตรงกับต้นฉบับทุกค่า ลำธารราบยังใช้ tile พร้อม flowDir ไม่ได้เปลี่ยนเป็นภาพน้ำตก

[off-replacements.json](off-replacements.json) ระบุ upper-bridge → `ice-stream-flat-upper`, center-step → `ice-stream-flat-central`, plaza-right → คง off, east-cliff → `icefall-east-cliff`, mouth → `icefall-mouth` เป็น mapping ของแพ็ก ไม่ใช่ผลทดสอบการสลับเข้าเกม

## คำสั่งตรวจและผลจริง

จากราก repo ต้องมี Python 3, Pillow, NumPy, SciPy, ffmpeg และ ffprobe:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/correct_masks.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/review_repairs.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/render_offline.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/verify_delivery.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_pack.py
git diff --check
```

- correction / repair review / renderer: exit 0; การรัน correction ซ้ำไม่เพิ่ม pixel และให้ไฟล์ masks เดิม ดู [idempotence-check.json](review/idempotence-check.json)
- verifier: **exit 1** เพราะเกณฑ์รับงานยังไม่ครบ ตรวจค่ารายข้อใน [delivery-verification.json](review/delivery-verification.json); ไม่ตีความเป็นงานผ่าน
- ตรวจ decode, hash, มิติ masks/sheets/source cells, phases, 30 spots, aggregate union และหลักฐาน 31 จุดจริง
- check_pack: exit 0 เป็นการตรวจไฟล์เท่านั้น ตรวจ syntax Python/JSON, ลิงก์หน้าหลักฐาน และขอบเขตไฟล์ใน `review/scope-check.json`; ไม่รัน tests เกมเพราะไม่แก้เกม

`build_assets.py` เป็น builder ที่รับต่อมา ถ้ารันใหม่จะสร้าง masks รูปแบบเดิม ต้องรัน `correct_masks.py` ต่อ แล้วสร้างหลักฐานและตรวจใหม่ตามลำดับข้างบน ห้ามใช้รายงานเก่าแทนผลหลังเปลี่ยน assets

## ตรวจตัวเองเทียบเกณฑ์รับงาน

| เกณฑ์ | ผลตรวจ |
|---|---|
| พื้น ASSEMBLE v7 และ masks 2× | มี tiles/manifest ครบ; 37 masks มีมิติ 2× และไม่ว่าง; crop น้ำตกฟ้า 10 จุดตรงกับการประกอบ v7 แบบ decoded RGB ทุกพิกเซล |
| ทุก mask อยู่บนของเหลวจริง ≤3%; ไม่ทับหิน/ต้นไม้/ฟ้า | **ยังไม่ครบ**: ตัดจุดเสียที่พบแล้ว แต่ยังไม่มี semantic totals/upper bounds ครบทุก mask |
| shore-band อยู่ในน้ำใกล้ฝั่ง ≤12 world | **ยังไม่ครบ**: ice band ตัดตามแนวฝั่งบางช่วง ตัวอย่างผิดเดิมถูกเอาออก; ยังไม่ตรวจขอบจริงครบทั้ง ice/spirit |
| น้ำตกทุกจุดที่มีในพื้นขยับ | **ไม่ครบ**: ยืนยันช่องว่าง summit ล่าง 528 พิกเซล; coverage ทั่วแผนที่ยังต้องสำรวจ |
| น้ำตกฟ้า 8 เฟรม ≥800; ละอองฐาน; loop | ตรวจมิติและ 8 phases ของ 10 จุดที่มีในแพ็ก; ภาพเทียบมีฐานให้ตรวจ แต่ยังไม่รับรองรูปทรง/ละอองครบทุกจุดหรือ loop ลื่น |
| ลาวาตก 8 จุด / ผิวราบและ flowDir / particles เฉพาะผิวราบ | มี 8 lavafalls ใช้ HD เดิม; ice flat เป็น tile + flowDir; ตำแหน่ง particles เทียบ semantic ผิวราบยังไม่ครบ |
| layout schema เดิมและระบุชิ้นแทน off | มีไฟล์ครบและไม่เปลี่ยน layout; ยังไม่ทดสอบการสลับเข้าเกม |
| contact sheet และไม่มีปัญหาแบบวงเดิม | มี 31 คู่และภาพขยาย masks ปัจจุบัน; **ยังรับรองว่าไม่มีปัญหาทุกบริเวณไม่ได้** |
| คลิป 12 วินาที 3 มุม | มีครบ เรนเดอร์จาก assets ปัจจุบันและ decode ครบ 288 เฟรมต่อมุม; มุมประมาณ |
| README ไทย / loop-review / generation-prompts / queue-check | มีครบ; queue = incomplete ตามผลจริง |
| ≤80 MB และขอบเขตงาน | ดู delivery-size.json / scope-check.json; เปลี่ยนเฉพาะโฟลเดอร์ส่งออก ไม่มี commit/push/merge/deploy/แก้เกม/เรียก agent |

เก็บ source frames และพื้น v7 เดิมครบ ลดเฉพาะ diagnostic ที่ซ้ำหรือบีบอัดภาพ review เพื่อคุมขนาด โดยมีรายการใน `review/current-pruned-files.json` และ `review/proof-compression.json` ไฟล์ก่อน/หลังและ hash แยกชัดเจน รายการที่ยังขาดก่อนตั้ง ready อยู่ใน [queue-check.json](queue-check.json)
