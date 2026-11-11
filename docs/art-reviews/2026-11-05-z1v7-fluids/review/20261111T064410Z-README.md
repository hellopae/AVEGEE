# Z1-V7-FLUIDS รับต่อ 11 พฤศจิกายน 2569

**สถานะ incomplete** เก็บงานและหลักฐานสำหรับรับช่วงต่อไว้ครบตามผลตรวจด้านล่าง

## งานรอบนี้

คัดลอกทั้งโฟลเดอร์ส่งออกจากรอบล่าสุด `20261111T062023Z-567a72a5` ก่อนทำงาน มี receipt พร้อม SHA-256 ทุกไฟล์ และเก็บ README/ผลตรวจของรอบนั้นแยกไว้ งานวาดจากรอบแรก `20261110T122730Z-bde65eb4` และรอบถัดมารับต่ออยู่ใน sources/sheets พร้อม provenance และ prompts เดิม

- ตรวจ registration summit ซ้ำ ได้ 528/528 พิกเซลครบ 8 เฟรม ผล mask/sheet ตรงกับรอบล่าสุด
- เพิ่ม ground-only reference ให้ครบน้ำตกฟ้า 10 จุดและลาวาตก 8 จุด เพิ่ม reference ผิวลาวาราบบางส่วนอีก 3 masks รวมมี reference 21/37 masks
- วัดใหม่ได้ **8/37 masks** ที่มีขอบเขตบนพื้นที่นอกของเหลว ≤3% อีก 29 masks ยังยืนยันเกณฑ์นี้ไม่ได้
- เพิ่มหลักฐาน shore band ฟ้า **1,337 พิกเซล** ที่อยู่ในน้ำและห่างฝั่งจริง ≤12 world
- ตรวจ footprints ของ lava-bubble/lava-steam/embers ครบ **12 ชิ้น ชิ้นละ 288 samples** พร้อมจำนวนพิกเซล flat/falling/unknown และภาพขยาย
- เพิ่มการตรวจ hash ของ reference, ground crop และ particle inputs ใน verifier

[Receipt งานรับต่อ](review/continuation-copy-receipt.json) · [ผลเทียบ production assets และ 31 คู่/3 คลิป/3 contacts](review/continuation-preservation.json) · [README รอบล่าสุด](review/20261111T062023Z-README.md) · [ประวัติก่อนหน้า](review/continuation-provenance.json)

## งานวาดและ summit ที่รับต่อ

**0 generations ใหม่ในรอบนี้** ใช้ภาพ ImageGen ในตัวที่รับต่อมา การทำ reference/วัดพิกเซล/registration/ประกอบหลักฐานใช้เรขาคณิตและการคำนวณ เฟรมวาดเดิมยังอยู่ครบทั้งชุด

registration summit ที่แก้ในรอบ `062023Z` เพิ่ม mask 2,360 พิกเซล จาก 62,375 เป็น 64,735 พิกเซล และเปิด alpha ใน sheet ให้ตรงพื้นที่เพิ่ม รันสคริปต์เดิมซ้ำในรอบนี้ได้ hash เดิม ตัวอย่างขั้นล่างมี effective alpha 528/528 พิกเซลในทั้ง 8 เฟรม และมี RGB phases ต่างกันครบ 8 ค่า

ส่วนเพิ่ม summit มี unknown 7/2,360 พิกเซล หรือขอบเขตบน 0.2967% ส่วน summit ทั้งชิ้นมี unknown 31,074/64,735 พิกเซล หรือ 48.0019% การตรวจภาพขยายยังอ่านผิวของยอดสีน้ำเงินบางส่วนได้ไม่แน่ชัด จึงเว้นพื้นที่นั้นเป็น unknown

[ผล registration](review/summit-registration-result.json) · [พื้น/mask/effect](review/boundary/summit-lower-registration-current.webp) · [8 phases](review/boundary/summit-lower-eight-phases.jpg) · [coverage witness](review/coverage-witness-result.json)

## Reference และขอบ mask

Reference อ่านจากพื้น ASSEMBLE v7 ที่ประกอบ native 2× ตรวจรูปทรง หน้าตก ฝั่งและผิวหินด้วยตา แยกจาก annotation สร้าง mask สคริปต์วัดใช้ SHA-256 ผูก reference กับภาพพื้นและ mask ปัจจุบัน การอ่านภาพทำโดย AI ตัวเดียวกัน

พื้นที่ definite-liquid เป็นผิวของเหลวที่อ่านได้ชัด พื้นที่นอก label รวมถึงช่องที่เว้นไว้เป็น unknown ทั้งหมด สูตรขอบเขตบนเท่ากับ `100 × unknown selected pixels / all selected pixels` ค่า % นอกของเหลวจริงยังเป็น null การได้ค่ามากกว่า 3% แสดงว่าหลักฐานยังครอบไม่พอ ทุกผลมีจำนวนพิกเซลและ bounding boxes ของ unknown components ที่ใหญ่ที่สุดเพื่อรับช่วงต่อ

สำหรับ `lava-flat-*` reference ใช้เฉพาะ definite-flat-lava หน้าลาวาตกยังเป็น unknown ในการวัด mask ผิวราบ

| Mask | ขอบเขตบนพื้นที่นอกของเหลว | ผลเกณฑ์ ≤3% |
|---|---:|---|
| icefall-center-bridge | 0.4145% | ≤3% |
| icefall-east-cliff | 12.9245% | ยังยืนยันไม่ได้ |
| icefall-lower-1 | 0.0562% | ≤3% |
| icefall-lower-2 | 0.0666% | ≤3% |
| icefall-lower-3 | 2.1943% | ≤3% |
| icefall-lower-inlet | 3.4372% | ยังยืนยันไม่ได้ |
| icefall-mouth | 0.3109% | ≤3% |
| icefall-summit | 48.0019% | ยังยืนยันไม่ได้ |
| icefall-upper-right | 2.9294% | ≤3% |
| icefall-upper-tree | 5.6886% | ยังยืนยันไม่ได้ |
| lava-flat-middle | 23.2626% | ยังยืนยันไม่ได้ |
| lava-flat-southwest | 84.5833% | ยังยืนยันไม่ได้ |
| lava-flat-west | 90.0229% | ยังยืนยันไม่ได้ |
| lavafall-bridge | 6.8317% | ยังยืนยันไม่ได้ |
| lavafall-lower-step | 3.9171% | ยังยืนยันไม่ได้ |
| lavafall-middle | 2.4995% | ≤3% |
| lavafall-mouth | 15.8753% | ยังยืนยันไม่ได้ |
| lavafall-upper-left | 17.6004% | ยังยืนยันไม่ได้ |
| lavafall-upper-step | 2.7358% | ≤3% |
| lavafall-volcano | 20.1582% | ยังยืนยันไม่ได้ |
| lavafall-west | 6.5960% | ยังยืนยันไม่ได้ |

อีก 16 masks ยังไม่มี reference ในชุดนี้ ผลแยกครบ 37 masks อยู่ในรายงาน การตรวจขั้นสุดท้ายเว้นผิวหินขอบซ้าย lavafall-west เพิ่ม ทำให้ค่าขอบเขตบนเปลี่ยนจาก 2.3027% เป็น 6.5960% จำนวนที่ยืนยัน ≤3% จึงลดจากผลเบื้องต้น 9 เหลือ 8 ชิ้น

[Reference](review/liquid-reference.json) · [ผลทุก mask พร้อม unknown components](review/liquid-reference-result.json) · [ผลสรุป mask](mask-review.json) · [ตรวจ ground/hash](review/reference-ground-check.json)

## Shore band จากฝั่งจริง

อ่านผิวแข็งของฝั่งและผิวน้ำบนภาพ v7 แยกจากเส้นตัด band แล้ววัดระยะถึงพิกเซลผิวแข็งที่ยืนยันแล้วด้วย world scale แยกแกน ระยะนี้เป็นขอบเขตบนของระยะถึงฝั่งใกล้ที่สุดสำหรับพิกเซลที่ยืนยันว่าเป็นน้ำ

| Band | พิกเซลทั้งหมด | ยืนยันในน้ำและ ≤12 world | ยังไม่ยืนยัน |
|---|---:|---:|---:|
| ice | 13,960 | 1,337 | 12,623 |
| spirit | 676,567 | 800 | 675,767 |

ขอบเขตบนระยะสูงสุดของพิกเซลที่ยืนยันได้เป็น 11.9831 world สำหรับ ice และ 11.9569 world สำหรับ spirit หลักฐานเป็นการสำรวจเฉพาะ patches ที่ระบุไว้

[Reference ฝั่งจริง](review/shore-ground-reference.json) · [ผลระยะ](review/shore-ground-result.json) · [ภาพ band ฟ้า](review/boundary/shore-band-ice-actual-bank-proof.webp) · [ภาพ band ม่วง](review/boundary/shore-band-spirit-actual-bank-proof.webp)

## Particles บนผิวลาวาราบ

สคริปต์ใหม่ตรวจทุก lava particle piece ที่เวลา `0/24 … 287/24` วินาที รวม rotation, drift, sheet frame, alpha, opacity และ clipping mask ที่ native 2× เก็บ union footprint และ ground crop พร้อมพิกัด ผลทุกชิ้นยังมี reference ไม่ครบหรือไม่มีพิกเซลมองเห็น

| Piece | Footprint ที่เห็น | ยืนยัน flat | Unknown |
|---|---:|---:|---:|
| lava-bubble--lava-upper | 21,538 | 0 | 21,538 |
| lava-bubble--lava-left | 2,728 | 2,460 | 268 |
| lava-bubble--lava-middle | 25,397 | 19,627 | 5,770 |
| lava-bubble--lava-lower | 34,664 | 0 | 34,664 |
| lava-steam--lava-upper | 10,003 | 0 | 10,003 |
| lava-steam--lava-middle | 5,678 | 5,172 | 506 |
| lava-steam--lava-lower | 22,089 | 0 | 22,089 |
| lava-steam--lava-left-bottom | 0 | 0 | 0 |
| lava-steam--lava-southwest | 2,215 | 1,231 | 984 |
| embers--lava-upper | 25,216 | 0 | 25,216 |
| embers--lava-middle | 31,840 | 25,710 | 6,130 |
| embers--lava-lower | 34,470 | 0 | 34,470 |

ทุกชิ้นมีจำนวนพิกเซลทับ falling-lava witness ที่ทำ label ไว้เป็น 0 ชุด labels ยังเป็นบางส่วน โดยเฉพาะ upper/lower จึงยังยืนยัน flat-only ทั้งชุดไม่ได้ `lava-steam--lava-left-bottom` ไม่ปรากฏหลัง clipping ใน 288 samples ที่ตรวจ ฟองริมแม่น้ำม่วง 30 spots มีค่าตรงกับ layout เกมที่รับต่อ

[ผลครบ 12 ชิ้นและลิงก์ภาพ](review/particle-coverage-result.json) · [Reference flat/falling](review/particle-flat-reference.json) · [สคริปต์ตรวจ](scripts/audit_particle_coverage.py) · [ผล witness 2 จุดจากรอบก่อน](review/particle-footprint-result.json)

## ภาพเทียบ คลิป และ layout

เก็บ **31 คู่ / 3 contact sheets / 3 คลิป** ตรงกับรอบ `062023Z` ทุก hash รอบนี้เพิ่มเฉพาะหลักฐาน reference และการวัด Assets ที่ใช้เรนเดอร์ยังตรงเดิม จึงใช้คลิปและภาพเทียบชุดที่รับต่อมา

คลิปแต่ละมุมยาว 12 วินาที 24 fps 960×776 มี 288 เฟรม และตรวจ decode ครบ มุมเทียบ landmark จากภาพคุณเป้โดยประมาณ ภาพเป็น offline renderer ที่ hold เฟรมวาดตาม fps มี screen blend ที่แก้แล้ว Spots ใช้ alpha-over ขณะที่ runtime ใช้ lighter การตรวจ integration เกมและความลื่นของ loop ทุกจุดยังค้าง

[หน้ารวมหลักฐาน](review/index.html) · [น้ำตกฟ้า](review/contact-icefalls.jpg) · [ลาวาตก](review/contact-lavafalls.jpg) · [ผิวราบ/ลำธาร](review/contact-streams.jpg) · [คลิปมุม 2](review/clips/owner-2-ice-bridge.mp4) · [คลิปมุม 3](review/clips/owner-3-lava.mp4) · [คลิปมุม 4](review/clips/owner-4-central-stream.mp4)

`fx-layout.json` คง schemaVersion 4, 46 pieces, 33 masks ที่อ้างอิง และ 21 sheets น้ำตกฟ้า 10 ชิ้นมี 8 เฟรม 800×800 และ source cell ≥800 ลาวาตก 8 ชิ้นรับต่อ HD เดิม 314×534 การเทียบรูปทรงลาวากับ v7 ทุกจุดยังค้าง ลำธารราบใช้ tile พร้อม flowDir

[รายการแทนชิ้น off เดิม](off-replacements.json) ระบุ upper-bridge → ice-stream-flat-upper, center-step → ice-stream-flat-central, plaza-right คง off, east-cliff → icefall-east-cliff และ mouth → icefall-mouth

## คำสั่งตรวจและผล

ต้องมี Python 3, Pillow, NumPy, SciPy, ffmpeg และ ffprobe คำสั่งต่อไปนี้เป็นส่วนตรวจของงานนี้

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/register_summit.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_references.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_shore.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/audit_particle_coverage.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/verify_delivery.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_pack.py
git diff --check
```

`verify_delivery.py` คืน exit 1 ขณะที่ acceptance ยังไม่ครบ ผลตรวจไฟล์/มิติ/hash/decode แยกอยู่ใน technicalChecks ของรายงาน `check_pack.py` ตรวจโครงสร้างไฟล์ ลิงก์ ขอบเขตและขนาดแพ็ก ข้อจำกัดของการตรวจอยู่ในรายงานแต่ละชุด

[ผลคำสั่งรอบนี้](review/run-validation.json) · [Verifier](review/delivery-verification.json) · [ขอบเขต](review/scope-check.json) · [ขนาดจริง](delivery-size.json)

`build_assets.py` สร้าง masks รุ่นก่อนการแก้ การ rebuild assets ต้องตามด้วย `correct_masks.py` และ `register_summit.py` เพื่อรักษาการแก้ที่รับต่อมา

## ขนาดและการจัดเก็บ

เก็บ source art, native v7 tiles, masks, sheets และ before-registration ครบ ตัดสำเนา crop เก่าที่มี margin และไม่มีผู้ใช้ในสคริปต์ปัจจุบัน 19 PNG รวม 5,283,649 bytes เพื่อคุมแพ็ก ≤80,000,000 bytes มีพิกัดพื้นจริงสำหรับสร้าง crop จาก native tiles และมี hash/path ต้นทางของไฟล์ที่ตัดในรายงาน

[รายการ 19 crop ที่ตัด](review/continuation-pruned-legacy-crops.json) · [รายการไฟล์ส่งออกและ hash](delivery-manifest.json) · [ขนาดแพ็ก](delivery-size.json)

## ตรวจตัวเองเทียบใบงาน

| เกณฑ์ | ผลตรวจ |
|---|---|
| ใช้พื้น ASSEMBLE v7 และ mask 2× | ตรวจมิติครบ 37 masks และเทียบ ground references กับ native v7 |
| ทุก mask บนของเหลวจริง ≤3% และไม่มีพิกเซลบนผิวแข็ง | ยืนยันขอบเขตบน ≤3% ได้ 8/37 ชิ้น อีก 29 ยังไม่ยืนยันทั้งชิ้น |
| ทุกน้ำตกที่วาดจริงขยับ | summit witness ครบ 528/528 ทุกเฟรม การสำรวจ coverage ทั้ง v7 ยังค้าง |
| น้ำตกตามรูปทรงจริง 8 เฟรม ≥800 และละอองฐาน | ตรวจมิติ/8 phases ของน้ำตกฟ้า 10 ชิ้น รูปทรงและละอองทุกจุดยังค้าง |
| ลาวาตก 8 จุดและผิวลาวา | รับต่อ HD เดิม มี ground references แยกทุกลาวาตก การเทียบรูปทรง/ผิวราบทั้งชุดยังค้าง |
| particles อยู่เฉพาะลาวาราบ | ตรวจครบ 12 pieces ×288 samples มี unknown ใน footprint และยังไม่ยืนยันทั้งชุด |
| shore band บนผิวน้ำ ≤12 world จากฝั่งจริง | ยืนยัน ice 1,337 และ spirit 800 พิกเซล การสำรวจทั้ง band ยังค้าง |
| layout เดิมพร้อมระบุแทน off | schema/layout hash และ mapping ตรงที่รับต่อ Integration ยังไม่ตรวจ |
| contact sheets ไม่มีปัญหาแบบภาพวง | เก็บ 31 คู่และภาพขยายครบ การรับรองขอบ/รูปทรงทั้งชุดยังค้าง |
| คลิป 12 วินาที 3 มุม | ตรวจ decode ครบ 288 เฟรมต่อมุม มุมอ้างอิงเป็นการประมาณ |
| README ไทย / loop-review / generation-prompts / queue-check | มีครบ loop-review ระบุข้อจำกัดและ queue เป็น incomplete |
| ขนาด ≤80 MB และขอบเขตไฟล์ | ผลจริงอยู่ใน delivery-size/scope-check เปลี่ยนไฟล์เฉพาะโฟลเดอร์ส่งออก |

งานที่เหลือแยกรายข้อใน [queue-check.json](queue-check.json) และ per-mask reports
