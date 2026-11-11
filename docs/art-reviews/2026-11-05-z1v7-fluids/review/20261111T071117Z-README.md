# Z1-V7-FLUIDS รับต่อ 11 พฤศจิกายน 2569

**สถานะ incomplete** งานรอบ `20261111T071117Z-519bba7d` ยืนยันเกณฑ์ขอบเขตบน ≤3% ได้ **9/37 masks** อีก 28 masks ยังต้องตรวจต่อ การตรวจรวมเข้าเกมและ playback ทุก loop ยังค้าง

## งานที่รับต่อและสิ่งที่แก้

คัดลอก 400 ไฟล์จากรอบล่าสุด `20261111T064410Z-b0d6eae2` ก่อนทำงาน พร้อม receipt รายไฟล์ งานวาดรอบแรก `20261110T122730Z-bde65eb4` และรอบถัดมารับต่อใน sources/sheets พร้อม provenance และ prompts เดิม แตก archive offline review ลงโฟลเดอร์ชั่วคราวภายในงาน เทียบ hash แล้วเก็บผลแก้รุ่นล่าสุดไว้ในตำแหน่งส่งออก

[Receipt](review/20261111T064410Z-copy-receipt.json) · [ผลเทียบกับรอบล่าสุด](review/current-preservation.json) · [README รอบล่าสุด](review/20261111T064410Z-README.md) · [ผลเทียบ archive](review/current-offline-archive-check.json)

**0 generations ใหม่** ใช้เฟรมวาด ImageGen ในตัวที่รับต่อมา ปรับ geometry ของ alpha และวัดหลักฐานจากพื้น v7

| Mask ที่แก้รอบนี้ | พิกเซลก่อน → หลัง | พิกเซลที่ตัด |
|---|---:|---:|
| icefall-east-cliff | 6,507 → 5,175 | 1,332 |
| lava-flat-lower | 117,761 → 113,301 | 4,460 |
| lava-flat รวมทั้งแผนที่ | 336,390 → 331,930 | 4,460 |

ภาพขยายพบ mask ทับหินฟ้าข้างม่านน้ำ east-cliff และหินที่มีแสงลาวาสะท้อนช่วงล่าง จึงตัด contour ผิวแข็งสองบริเวณ เก็บ mask ก่อนแก้ไว้ รัน repair ซ้ำได้จากไฟล์ก่อนแก้ ทุกพิกเซลนอกส่วนที่ตัดมี alpha เดิม ตัวอย่างผิวแข็ง 75 และ 257 พิกเซลเหลือการทับ 0 ทั้งสองจุด mask ลาวารวมสร้างจาก union ของ 6 components

[ผล repair และ hash](review/solid-repair-result.json) · [contours สำหรับแก้](review/solid-repairs-current.json) · [solid witnesses](review/solid-witnesses-current.json) · [ภาพ east-cliff](review/boundary/icefall-east-cliff-solid-repair.webp) · [ภาพลาวาช่วงล่าง](review/boundary/lava-flat-lower-solid-repair.webp)

## Summit ขั้นล่าง

registration summit ที่รอบ `062023Z` แก้ไว้ตรวจซ้ำแล้วได้ **528/528 effective pixels ครบทั้ง 8 เฟรม** RGB มี 8 phases และ mask/sheet hash ตรงกับรอบล่าสุด การสำรวจ coverage น้ำตกทั้งหมดในภาพ v7 ยังค้าง

[ผล registration](review/summit-registration-result.json) · [ภาพพื้น/mask/effect](review/boundary/summit-lower-registration-current.webp) · [8 phases](review/boundary/summit-lower-eight-phases.jpg)

## Reference และผลแยกทุก mask

เพิ่ม reference ผิวลาวาราบ upper/lower และลำธารราบ 5 masks รวมมี reference **28/37** ใช้ภาพพื้น ASSEMBLE v7 ที่ native 2× และกริด ground-only แยกจาก annotation สร้าง mask เก็บ geometry ก่อนคำนวณ intersection รูปร่างฝั่ง ผิวหิน หน้าตก และ occluders เป็นข้อมูลประกอบการอ่านภาพ ผู้ตรวจเป็น AI ตัวเดียวกัน

Reference ระบุ definite-liquid interiors และเว้นส่วนที่อ่านไม่ชัดเป็น unknown ช่อง unlabelledPolygons คงเป็น unknown ผลขอบเขตบนคำนวณ `100 × unknown selected pixels / all selected pixels` ค่า outsideDrawnLiquidPercent ยังคง null พื้นที่ unknown ต้องตรวจจากพื้นจริงต่อ สัดส่วน 9/37 ระบุเฉพาะเกณฑ์ขอบเขตบน ≤3%

Reference สำหรับวัด east-cliff แยกจาก hard-surface contour สำหรับแก้ หลังแก้มีขอบเขตบน **0.5024%** ผิวลาวาราบใช้ labels เฉพาะ terrace ราบ การตรวจครั้งนี้เว้นหิน/พืชที่แตะขอบ trace เพิ่มก่อนใช้ผล สคริปต์วัดอ่าน labels ที่เก็บไว้และผูกผลกับ mask/ground SHA-256

[Reference ทั้งชุด](review/liquid-reference.json) · [ชุด ground-only ที่เพิ่ม](review/ground-reference-additions.json) · [ผลทุก mask และ unknown component boxes](review/liquid-reference-result.json) · [งานรับช่วงราย mask](review/per-mask-handoff.json) · [ตรวจ hash พื้นจริง](review/reference-ground-check.json)

| Mask | ขอบเขตบนพื้นที่นอกของเหลว | ผลตรวจ |
|---|---:|---|
| ice-stream-flat-central | 16.4408% | ขยาย reference |
| ice-stream-flat-east | 18.3828% | ขยาย reference |
| ice-stream-flat-lower | 86.6798% | ขยาย reference |
| ice-stream-flat-mouth | 59.6486% | ขยาย reference |
| ice-stream-flat-upper | 23.8521% | ขยาย reference |
| ice-stream-flat | — | ยังไม่มี reference |
| icefall-center-bridge | 0.4145% | ≤3% |
| icefall-east-cliff | 0.5024% | ≤3% |
| icefall-lower-1 | 0.0562% | ≤3% |
| icefall-lower-2 | 0.0666% | ≤3% |
| icefall-lower-3 | 2.1943% | ≤3% |
| icefall-lower-inlet | 3.4372% | ขยาย reference |
| icefall-mouth | 0.3109% | ≤3% |
| icefall-summit | 48.0019% | ขยาย reference |
| icefall-upper-right | 2.9294% | ≤3% |
| icefall-upper-tree | 3.7425% | ขยาย reference |
| lava-flat-left-bottom | — | ยังไม่มี reference |
| lava-flat-lower | 25.1560% | ขยาย reference |
| lava-flat-middle | 23.2626% | ขยาย reference |
| lava-flat-southwest | 84.5833% | ขยาย reference |
| lava-flat-upper | 73.6754% | ขยาย reference |
| lava-flat-west | 90.0229% | ขยาย reference |
| lava-flat | — | ยังไม่มี reference |
| lavafall-bridge | 6.8317% | ขยาย reference |
| lavafall-lower-step | 3.9171% | ขยาย reference |
| lavafall-middle | 2.4995% | ≤3% |
| lavafall-mouth | 15.8753% | ขยาย reference |
| lavafall-upper-left | 17.6004% | ขยาย reference |
| lavafall-upper-step | 2.7358% | ≤3% |
| lavafall-volcano | 20.1582% | ขยาย reference |
| lavafall-west | 6.5960% | ขยาย reference |
| shore-band-ice | — | ยังไม่มี reference |
| shore-band-spirit | — | ยังไม่มี reference |
| shore-band | — | ยังไม่มี reference |
| spirit-river-east | — | ยังไม่มี reference |
| spirit-river-west | — | ยังไม่มี reference |
| spirit-river | — | ยังไม่มี reference |

## Shore band จากฝั่งจริง

เพิ่ม patch ลำธารกลางและ labels ผิวแข็งของฝั่งจริง วัดระยะแบบ world scale แยกแกนถึงพิกเซลผิวแข็งที่ยืนยันแล้ว ระยะนี้เป็นขอบเขตบนสำหรับพิกเซลที่ยืนยันว่าอยู่ในน้ำ

| Band | selected pixels | ยืนยันในน้ำและ ≤12 world | ยังไม่ยืนยัน |
|---|---:|---:|---:|
| ice | 13,960 | 1,595 | 12,365 |
| spirit | 676,567 | 800 | 675,767 |

patch ใหม่ให้ 798 certified pixels มี 540 พิกเซลซ้อนกับ patch เดิม จำนวนเพิ่มสุทธิเป็น 258 พิกเซล แก้การรวมผลเป็น union บนพิกัด mask และ clip patches ที่เกินขอบ mask เก็บภาพ proof แยกชื่อ การทดสอบผ่าน entry point ใช้ patches ซ้ำที่มีจุดเริ่มติดลบ ได้ 50 unique pixels จากผลรวม 100 pixels พร้อม assertion 4 ข้อ

[Reference ฝั่ง](review/shore-ground-reference.json) · [ผลระยะ](review/shore-ground-result.json) · [ภาพ patch ใหม่](review/boundary/shore-ice-central-current-actual-bank-proof.webp) · [ผล regression fixture](review/shore-regression-check.json)

## Particles บนลาวาราบ

ตรวจ 12 pieces ชิ้นละ 288 samples ที่เวลา `0/24 … 287/24` วินาที รวม rotation, drift, sheet phase, alpha, opacity และ clipping mask ที่ native 2× หลังตัด mask ลาวาช่วงล่าง footprint ของ embers--lava-lower ลดจาก 34,470 เป็น 34,206 พิกเซล รูปวาดและค่าตำแหน่ง spots เดิมยังอยู่ครบ

| Piece | footprint ที่เห็น | ยืนยัน flat | unknown |
|---|---:|---:|---:|
| lava-bubble--lava-upper | 21,538 | 13,024 | 8,514 |
| lava-bubble--lava-left | 2,728 | 2,460 | 268 |
| lava-bubble--lava-middle | 25,397 | 19,627 | 5,770 |
| lava-bubble--lava-lower | 34,664 | 29,424 | 5,240 |
| lava-steam--lava-upper | 10,003 | 6,400 | 3,603 |
| lava-steam--lava-middle | 5,678 | 5,172 | 506 |
| lava-steam--lava-lower | 22,089 | 14,972 | 7,117 |
| lava-steam--lava-left-bottom | 0 | 0 | 0 |
| lava-steam--lava-southwest | 2,215 | 1,231 | 984 |
| embers--lava-upper | 25,216 | 12,991 | 12,225 |
| embers--lava-middle | 31,840 | 25,710 | 6,130 |
| embers--lava-lower | 34,206 | 30,447 | 3,759 |

ทุกชิ้นมีการทับ falling-lava labels ที่สำรวจไว้เป็น 0 พื้นที่ reference ยังครอบไม่ครบ จึงยังยืนยัน flat-only ทั้งชุดไม่ได้ lava-steam--lava-left-bottom มี 0 visible pixels ใน 288 samples ฟองริมแม่น้ำม่วง 30 spots มีค่าเท่ากับ layout เกมที่รับต่อ

[ผลครบ 12 ชิ้น](review/particle-coverage-result.json) · [Reference flat/falling](review/particle-flat-reference.json)

## Contact sheets คลิป และ layout

มี 31 คู่ / 3 contact sheets / 3 คลิป คำนวณพื้นที่พิกเซลที่แก้แล้วเทียบกับทุก pair/view อัปเดต icefall-east-cliff, ice-stream-flat-east, lava-flat-lower พร้อม 2 contacts และคลิป owner-2 อีก 28 pairs / 1 contact / 2 clips มี hash เดิม

คลิปแต่ละมุมยาว 12 วินาที 24 fps 960×776 ตรวจ decode ครบ 288 เฟรมต่อมุม การจัดมุมเทียบ landmark จากภาพคุณเป้โดยประมาณ Offline renderer hold เฟรมวาดตาม fps และใช้ screen blend ที่แก้แล้ว Spots ใช้ alpha-over ขณะที่ runtime ใช้ lighter การรวมเข้าเกมและความลื่นของ playback ทุกจุดยังต้องตรวจต่อ

[Dependency rectangles](review/current-render-dependencies.json) · [หน้ารวมหลักฐาน](review/index.html) · [น้ำตกฟ้า](review/contact-icefalls.jpg) · [ลาวาตก](review/contact-lavafalls.jpg) · [ผิวราบ/ลำธาร](review/contact-streams.jpg) · [คลิปมุม 2](review/clips/owner-2-ice-bridge.mp4) · [คลิปมุม 3](review/clips/owner-3-lava.mp4) · [คลิปมุม 4](review/clips/owner-4-central-stream.mp4)

fx-layout คง schemaVersion 4 มี 46 pieces, 33 masks ที่อ้างอิง และ 21 sheets น้ำตกฟ้า 10 ชิ้นมี 8 เฟรม 800×800 และ native source cell ≥800 ลาวาตก 8 ชิ้นรับต่อ HD 314×534 การเทียบรูปทรง HD กับ v7 ทุกจุดยังค้าง ลำธารราบเป็น tile พร้อม flowDir รายการแทนชิ้น off เดิมยังอยู่ครบ

[Layout](fx-layout.json) · [Off replacements](off-replacements.json) · [Loop measurements](loop-review.json) · [Prompts เดิม](generation-prompts.json) · [Prompts รับต่อ](generation-prompts-continuation.json)

## คำสั่งตรวจ

ต้องมี Python 3, Pillow, NumPy, SciPy, ffmpeg และ ffprobe คำสั่งทำงานจาก working directory นี้

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/register_summit.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/add_ground_references.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/repair_solid_overlap.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_references.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_shore.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_shore_regression.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/audit_particle_coverage.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/review_repairs.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/verify_delivery.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_pack.py
git diff --check
```

Verifier คืน exit 1 ขณะที่ acceptance ยังมีงานค้าง ผลไฟล์/มิติ/hash/decode แยกอยู่ใน technicalChecks ข้อผิดพลาดระหว่างเพิ่ม shore patch ทำให้ตรวจพบ labels แตะกันและ patch เริ่มนอกกรอบ mask ปรับ labels ตาม ground และแก้การ clip ก่อนรันผลชุดสุดท้าย รายงานคำสั่งเก็บ exit code จริง

[คำสั่งและผล](review/run-validation.json) · [Verifier](review/delivery-verification.json) · [ขอบเขต](review/scope-check.json)

การ rebuild masks จากต้นทางต้องเรียง build_assets → correct_masks → register_summit → repair_solid_overlap เพื่อรักษา masks ที่แก้รับต่อ เมื่อ production pixels เปลี่ยนให้คำนวณ render dependencies และอัปเดตหลักฐานที่ได้รับผลกระทบ

## ขนาดแพ็ก

เก็บ native v7 tiles, source art, masks, sheets, 31 pairs และ 3 clips ลดขนาดภาพ preview สำหรับ flat references/particle diagnostics และบีบอัดกริดเก่าบางภาพพร้อม JSON ประวัติ การวัดใช้ native 2× ค่าขนาดไฟล์จริงรวม manifest/report อยู่ใน delivery-size.json กริดต้นฉบับที่บีบอัดยังอ่านได้จาก source worktree ตามรายงาน

[รายละเอียด preview budget](review/current-preview-budget.json) · [รายการไฟล์และ hash](delivery-manifest.json) · [จำนวน bytes จริง](delivery-size.json)

## ตรวจตัวเองตามเกณฑ์รับงาน

| เกณฑ์ | ผลตามหลักฐาน |
|---|---|
| พื้น ASSEMBLE v7 และ masks 2× | ตรวจครบ 37 masks และเทียบ decoded ground/hash |
| ทุก mask บนของเหลวจริง ≤3% | ยืนยันขอบเขตบน 9/37 อีก 28 ยังต้องตรวจ |
| น้ำตกทุกจุดที่วาดจริงขยับ | summit witness 528/528 ทุกเฟรม สำรวจ coverage ทั้งภาพยังค้าง |
| 8 เฟรม ≥800 ตามรูปทรงและละอองฐาน | มิติ/8 phases น้ำตกฟ้า 10 จุดครบ รูปทรงและละอองทุกจุดยังค้าง |
| ลาวาตก 8 จุดและผิวลาวา | รับต่อ HD ตัดผิวหินช่วงล่างเพิ่ม การเทียบรูปทรงทุกจุดยังค้าง |
| Particles เฉพาะลาวาราบ | ตรวจครบ 12×288 samples flat-only ทั้งชุดยังไม่ยืนยัน |
| Shore band ≤12 world จากฝั่งจริง | ยืนยัน ice 1,595 และ spirit 800 pixels ส่วนที่เหลือยังค้าง |
| Layout เดิมและ off replacements | hash layout/mapping ตรงรุ่นรับต่อ Integration ยังไม่ตรวจ |
| Contact sheets ไม่มีปัญหาแบบภาพวง | อัปเดต 3 pairs ที่กระทบ มีภาพขยายสองจุดที่แก้ การตรวจทั้งชุดยังค้าง |
| คลิป 12 วินาที 3 มุม | Decode ครบ 288 เฟรมต่อมุม จัดมุมโดยประมาณ |
| README ไทย / loop-review / prompts / queue | มีครบ queue เป็น incomplete |
| ≤80 MB และขอบเขต | ใช้ผล byte budget/scope-check หลังตรวจรอบสุดท้าย |

รายการค้างแยกรายข้อและราย mask เก็บใน queue-check และ per-mask-handoff

[คิวงาน](queue-check.json) · [ราย mask](review/per-mask-handoff.json)
