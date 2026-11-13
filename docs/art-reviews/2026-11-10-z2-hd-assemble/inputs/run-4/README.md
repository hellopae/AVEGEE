# Z234-HD-FULL — โซน 2 asia ชุด 4/5

คัดลอก native r3-c3/q11 และ q12 จากรอบ 20261113T050903Z-19483646 แบบเดิมทุกไบต์; วาดเฉพาะส่วนที่เหลือด้วย ImageGen ในตัว ไม่ใช้ Shado
ImageGen เพิ่มรอบนี้ 12 ครั้ง (มีเดิม 2; รวม 14 ภาพ) ไม่มีวาดซ้ำเพื่อไล่ตัวเลข

## ผลวัดเพื่อให้ Claude ตัดสิน

| chunk | native ครบ | output 2× | Laplacian เทียบ master | structure max เฉพาะ probe เชื่อถือได้ | probe เชื่อถือได้/ทั้งหมด |
|---|---:|---|---:|---:|---:|
| r3-c3 | 4/4 | [2048, 2048] | 81.488× | 1.000 px 1× | 8/18 |
| r3-c4 | 4/4 | [2048, 2048] | 71.344× | 0.000 px 1× | 16/18 |
| r3-c5 | 4/4 | [1638, 2048] | 91.458× | 1.000 px 1× | 16/16 |
| r4-c1 | 2/2 | [2048, 410] | 114.338× | 1.000 px 1× | 8/8 |

เกณฑ์ใบงาน: sharpness ≥10×, structure ≤4 px 1× และไม่มีรอยต่อภายใน chunk; ตารางเป็นผลวัด ไม่ใช่ผลอนุมัติคุณภาพ ไม่อ้าง QA ผ่าน
Laplacian วัดภาพเต็มและ ROI คงที่ ที่ซูมเกม 2.8 device px/world unit ด้วย Lanczos; ไม่เพิ่ม sharpening/noise เพื่อเร่งค่า
structure ใช้จุดต้นฉบับที่เลือกก่อนประกอบ เทียบ DoG 49×49 ค้นหา ±12 px; เก็บผลทุกจุด รวมจุดไม่แน่ใจ/ชนขอบค้นหา/ทับบริเวณที่ลบไว้ใน structure.json; SIFT residual ไม่ใช่หลักฐานว่ารูปทรงทั้งหมดถูกต้อง

## วิธีและไฟล์

- master ที่เกมโหลด: img/map-zone2/v2/*.webp, 4915×3277; repairs:false จาก src/zone-skin.js; source-hashes.json ตรวจว่าไม่เปลี่ยน
- crop-plan.json ใช้พิกัด global 1× [left,top,right,bottom], core 512×512 + context ข้างละ 64 px; c5 แบ่ง 410/409 px, r4 สูงจริง 205 px ใช้สองส่วน
- q*-native.webp เป็น lossless ขนาดจริงที่ ImageGen คืน เก็บโดยไม่ resize; generation-results.json มี hash และ lossless round-trip
- registration.json เก็บ affine native→context1× และ native→master1×, core/context ครบ; warp native ตรงสู่ 2× ไม่มี local warp
- min-cost seam ใน overlap 256 px 2×, feather ข้างละ 8 px; ชดเชยแสงระดับกว้าง sigma35 map px gain .8 โดยยกเว้นบริเวณวัตถุที่ลบ
- ขอบกับ chunk เพื่อนบ้านยังไม่ blend; ให้ ASSEMBLE ใช้ native + registration ที่แนบ
- objects-inventory.json และ walkmask-overlay.jpg คือหลักฐานสำรวจ; removed.json คือรายการขอลบ ส่วนผลสังเกตดู visual-review.json
- generation-prompts.json คือ prompt จริงต่อภาพ; continuation.json ระบุสิ่งที่คัดลอกและอ้างอิงสคริปต์โซน 1

## การตรวจ

รัน scripts/assemble.py ครั้งเดียวต่อ chunk เพื่อประกอบและบันทึกผลวัด; scripts/verify.py ตรวจเฉพาะความครบ เปิดไฟล์ได้ ขนาด lossless/hash และงบ 80 MB ไม่ใช้คุณภาพเป็น gate
ไม่ได้เปิดทดสอบในเกม และไม่เปลี่ยน src/, tests/, img/ หรือ deploy

## Self-check ตามเกณฑ์รับงาน

| เกณฑ์ | หลักฐานและขอบเขตที่ยังไม่ยืนยัน |
|---|---|
| 1. ครบทุกส่วน; sharpness ≥10×; structure ≤4 px | native ครบ 14/14; Laplacian ทุก chunk ≥10× ตามตาราง; probe ที่เชื่อถือได้ 48/60 จุดเลื่อนสูงสุด 1 px แต่ยังไม่ยืนยันทุก contour/ขั้นบันได จึงไม่ปิดเกณฑ์คุณภาพทั้งหมด |
| 2. ไม่เห็นรอยต่อ; ลบวัตถุที่เดินทับ | ตรวจ seam-check ทั้ง 4 chunk ไม่เห็นเส้นแบ่ง tile เด่นในภาพที่ตรวจ; ราว/เสาเป้าหมายหายไปในภาพที่ตรวจ คงลายพื้น/ของเหลว/ป่าที่เดินไม่ถึง; ผลเป็นข้อสังเกต รอ Claude ตัดสิน โดยเฉพาะมุมฐานท่าเรือที่เดิมถูกเสาบัง |
| 3. native + registration ครบสำหรับ ASSEMBLE | ครบ 14 native พร้อม affine สู่พิกัด master/core/context และ output 2× ทั้ง 4; ยังไม่ blend ขอบกับเพื่อนบ้าน |

## ส่วนค้าง

[]
การตัดสินคุณภาพและรอยต่อเป็นหน้าที่ review ของ Claude ตามใบงาน; ดูข้อสังเกตใน visual-review.json
