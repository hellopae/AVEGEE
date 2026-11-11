# Z1-V7-FLUIDS — รับต่อ 11 พฤศจิกายน 2569

**สถานะ `incomplete` — ยังไม่ครบเกณฑ์รับงาน และไม่อ้าง QA ผ่าน**

รอบนี้แก้ registration น้ำตกขั้นล่าง summit โดยใช้ภาพวาด ImageGen เดิมทั้ง 8 เฟรม เพิ่ม reference จากภาพพื้นแยกจาก annotation สร้าง mask และวัดฝั่งจริง/footprint ไอลาวาบางจุด เก็บผลแยกทุก mask เพื่อรับช่วงต่อ ไม่แก้เกมเดิม ไม่มี generation ใหม่ ไม่เรียกผู้ให้บริการภาพอื่น

## งานรับต่อและขอบเขต

คัดลอกงานแรกจาก `20261110T122730Z-bde65eb4` (อ้างอิง commit `96a73fcf`) เข้าโฟลเดอร์นี้ก่อน รับ archive `avegee-fluids-offline-review-20261111.tar.gz` แล้วทับด้วยผลงานล่าสุด `20261111T020211Z-edcef0f8` เพื่อรักษา masks ที่แก้แล้วและภาพ/คลิปที่สอดคล้องกัน ลำดับก่อนหน้านั้นอยู่ใน [continuation-provenance.json](review/continuation-provenance.json) รายงานรอบก่อนเก็บเป็น [previous-run-README.md](review/previous-run-README.md) สำหรับประวัติ ไม่ใช้แทนผลปัจจุบัน

ตรวจเทียบ baseline ล่าสุดใน [run-baseline.json](review/run-baseline.json): production assets ที่เปลี่ยนรอบนี้มีเฉพาะ `masks/icefall-summit.webp` และ `sheets/icefall-summit.webp` ส่วน masks อื่น, sources, พื้น native v7 และ layout คงเดิม ดูผล hash ใน [run-validation.json](review/run-validation.json)

คำสั่งวาดเดิมเก็บใน [generation-prompts.json](generation-prompts.json), [generation-prompts-continuation.json](generation-prompts-continuation.json) และ `input/fluids-hd-generation-prompts.json` ทุกชิ้นวาดมาจากรอบก่อน **0 generations ในรอบนี้** การตัด alpha, registration และการประกอบหลักฐานเป็นงานเรขาคณิต/คำนวณ ไม่สร้างเฟรมเคลื่อนไหวเพิ่ม

## Summit ขั้นล่าง

เฟรมต้นฉบับ `sources/icefall-summit-{12,34,56,78}.webp` มีน้ำตกขั้นล่างอยู่แล้ว แต่ mask ภายนอกและ alpha ที่ฝังใน sheet ไม่ครอบส่วนนี้ จึงใช้ registration กรอบเดิมเปิดเฉพาะหน้าตกและฟองฐาน ไม่ต้องวาดซ้ำ

- Mask summit จาก **62,375 → 64,735 พิกเซล** เพิ่ม 2,360 พิกเซล native 2× เก็บ before mask/sheet ใน `review/before-registration/`
- ตัวอย่างน้ำตกที่รอบก่อนพบ 528 พิกเซล จาก **0/528 → 528/528** และ effective alpha หลังคูณ mask/opacity ครบ 528 พิกเซลในทั้ง 8 เฟรม ไม่ใช้เพียง union mask ยืนยัน animation
- RGB บริเวณตัวอย่างมี 8 phases ต่างกัน; เก็บค่า transition รวม 8→1 ใน [summit-registration-result.json](review/summit-registration-result.json) ยังไม่รับรอง loop ลื่น
- พิกเซลที่มองเห็นและ alpha นอกบริเวณเพิ่มตรงกับ sheet เดิมทุกพิกเซล บันทึกแบบ lossless WebP; RGB ที่ alpha=0 อาจถูก encoder ทิ้ง ซึ่งไม่กระทบภาพที่เห็น
- รัน registration ซ้ำได้ mask/sheet hash เดิม ดู [registration-idempotence.json](review/registration-idempotence.json)

ดู [พื้น | mask | effect](review/boundary/summit-lower-registration-current.webp), [8 เฟรม](review/boundary/summit-lower-eight-phases.jpg) และ [coverage witness](review/coverage-witness-result.json) ข้อนี้แก้ตัวอย่างที่ยืนยันแล้ว ไม่ใช่การสำรวจน้ำตกทุกแห่งทั่วแผนที่

## Reference ของของเหลวแยกจากการสร้าง mask

[liquid-reference.json](review/liquid-reference.json) เป็นการ trace ผิวของเหลวที่แน่ชัดจากภาพพื้น v7 โดยไม่ import polygons สร้าง/แก้ mask หรือใช้ palette จำแนกอย่างเดียว เป็นการตรวจโดย AI ตัวเดียวกัน ไม่ใช่ human QA พื้นที่ที่ไม่ระบุ label ถือเป็น **unknown** ทั้งหมด

วัด intersection ของ mask กับ definite-liquid reference แล้วนับ unknown ทั้งหมดเสมือนอาจอยู่นอกน้ำ จึงได้ **ขอบเขตบน** ของ % นอกของเหลว ไม่ใช่ค่า % นอกจริงแบบ segmentation ครบภาพ ผลทุก mask และ hash อยู่ใน [liquid-reference-result.json](review/liquid-reference-result.json) และ [mask-review.json](mask-review.json)

| Mask | ขอบเขตบนพื้นที่นอกของเหลว | ผลเฉพาะเกณฑ์ ≤3% |
|---|---:|---|
| icefall-lower-1 | 0.0563% | มีหลักฐานขอบเขตบน ≤3% |
| icefall-lower-2 | 0.0666% | มีหลักฐานขอบเขตบน ≤3% |
| icefall-center-bridge | 0.4145% | มีหลักฐานขอบเขตบน ≤3% |
| icefall-lower-3 | 2.1944% | มีหลักฐานขอบเขตบน ≤3% |
| icefall-upper-right | 2.9294% | มีหลักฐานขอบเขตบน ≤3% |
| icefall-lower-inlet | 3.4372% | ยังไม่ชี้ขาด: unknown เกิน 3% |
| icefall-upper-tree | 5.6887% | ยังไม่ชี้ขาด: unknown เกิน 3% |
| icefall-east-cliff | 12.9246% | ยังไม่ชี้ขาด: unknown เกิน 3% |
| icefall-summit | 96.3652% | reference มีเฉพาะขั้นล่าง ยังไม่ครอบ summit ทั้งชิ้น |
| อีก 28 masks | null | ยังไม่มี reference ชุดนี้ |

เฉพาะ **พื้นที่ summit ที่เพิ่ม 2,360 พิกเซล** มี unknown 7 พิกเซล จึงได้ขอบเขตบน **0.2967%** ส่วน summit ที่รับต่อมายังต้องตรวจ ห้ามใช้ผลเฉพาะส่วนนี้แทนผลทั้ง mask ค่า unknown เกิน 3% เป็นเหตุให้ยังยืนยันไม่ได้ ไม่ใช่หลักฐานว่าของเหลวรั่วตามตัวเลขนั้นจริง

ผล regression ของผิวแข็งที่ตัดรอบก่อนยังอยู่ใน [independent-mask-review.json](review/independent-mask-review.json) ตัวอย่างเดิมเหลือ 0 พิกเซลทั้ง 3 จุด แต่ค่า 0 นี้ไม่ใช้รับรองทั้ง mask

## Shore band จากฝั่งจริง

[shore-ground-reference.json](review/shore-ground-reference.json) ระบุผิวแข็งของฝั่งจริงและพื้นที่น้ำที่อ่านจากภาพ v7 แยกจากเส้นที่ใช้ตัด band วัดระยะถึง **พิกเซลผิวแข็งที่ยืนยันแล้ว** ซึ่งเป็นขอบเขตบนของระยะถึงฝั่งใกล้ที่สุดเมื่อพิกเซลต้นทางยืนยันว่าเป็นน้ำ ใช้สเกล world แบบแยกแกน

[ผลวัด](review/shore-ground-result.json): spirit band ยืนยันได้ **800 พิกเซล** ในตัวอย่างว่าอยู่ในน้ำและห่างฝั่งไม่เกิน 12 world; ค่าสูงสุดของขอบเขตบน 11.95695 world ยังเหลือ 675,767 พิกเซลไม่ยืนยัน ส่วน ice patch ที่เลือกไม่ทับ definite-liquid label จึงยืนยันเพิ่ม **0 พิกเซล** และยังเหลือ ice band ทั้ง 13,960 พิกเซลต้องตรวจ

วงน้ำล้วน 2 จุดกลางแม่น้ำม่วงไม่พบ selected pixels ที่พิสูจน์ว่าเกิน 12 world แต่ไม่ใช่ผลสำรวจฝั่งครบ ไม่แก้ band เพิ่มในรอบนี้ ไม่ใช้ระยะถึงเส้น production trace หรือขอบ mask เป็นระยะถึงฝั่งจริง

## Particles และผิวลาวา

ภาพพื้นยืนยันว่า `lava-flat-left-bottom` และ `lava-flat-southwest` มีหน้าลาวาตก/ช่วงลาดอยู่ด้วย ชื่อ mask จึงไม่พิสูจน์ว่าผิวราบทั้งชิ้น แต่การดูชื่อหรือตำแหน่งศูนย์ sprite ก็ไม่พิสูจน์ว่าอนุภาคที่เห็นทับลาวาตกเช่นกัน

[audit_particles.py](scripts/audit_particles.py) ตรวจ alpha ของ sprite หลัง registration, drift, rotation, mask และ opacity จำนวน 288 ช่วงเวลาใน 12 วินาที เทียบหน้าลาวาตกที่ trace บนพื้นแยกใน [particle-ground-reference.json](review/particle-ground-reference.json)

- `lava-steam--lava-left-bottom`: ไม่มีพิกเซลมองเห็นหลัง clipping ตลอด 288 samples จึงไม่พบการทับ witness การไม่ปรากฏไม่ใช่หลักฐานเชิงบวกว่าจัดวางอนุภาคบนผิวราบครบ
- `lava-steam--lava-southwest`: มี footprint มองเห็นรวม 2,215 พิกเซลใน 285 samples ไม่ทับ witness หน้าตกที่ทำเครื่องหมายไว้ แต่ยังไม่ label ผิวราบครอบ footprint ทั้งหมด

ดู [ผลพร้อมภาพหลักฐาน](review/particle-footprint-result.json) อีก 10 particle pieces ยังต้องตรวจ ไม่ปิดหรือย้ายชิ้นจากการคาดเดา ฟองแม่น้ำม่วง 30 spots คงเดิมทุกค่า

## ภาพเทียบ คลิป และ layout

เปิด [หน้าหลักฐาน](review/index.html) มี [น้ำตกฟ้า](review/contact-icefalls.jpg), [ลาวาตก](review/contact-lavafalls.jpg), [ผิวราบ/ลำธาร](review/contact-streams.jpg) รวม **31 คู่** และคลิป **12 วินาที / 24 fps / 288 เฟรม / 960×776** จำนวน 3 มุม

เรนเดอร์ใหม่เฉพาะ pair summit, contact น้ำตกฟ้า และคลิป [owner-2](review/clips/owner-2-ice-bridge.mp4) ซึ่งครอบตำแหน่งแก้ อีก 30 pairs, 2 contacts และคลิป [owner-3](review/clips/owner-3-lava.mp4), [owner-4](review/clips/owner-4-central-stream.mp4) เก็บของล่าสุดและตรวจ hash ว่าไม่เปลี่ยน รายงาน input/output ปัจจุบันอยู่ใน [offline-render-report.json](review/offline-render-report.json)

มุมเป็นการเทียบ landmark กับสำเนาภาพคุณเป้โดยประมาณ ไม่ได้แก้โฟลเดอร์คุณเป้ เป็น renderer ออฟไลน์: hold เฟรมวาดตาม fps, screen blend ที่แก้แล้ว, ไม่มี runtime cross-fade/GPU mips/profile throttling และ spots ใช้ alpha-over ต่างจาก lighter ใน runtime ไม่ได้ทดสอบสลับเข้าเกม

`fx-layout.json` คง schemaVersion 4, 46 pieces, 33 masks ที่อ้างอิง และ 21 sheets รูปแบบเดิม; [off-replacements.json](off-replacements.json) ระบุ upper-bridge → ice-stream-flat-upper, center-step → ice-stream-flat-central, plaza-right คง off, east-cliff → icefall-east-cliff และ mouth → icefall-mouth

น้ำตกฟ้า 10 จุดมี 8 เฟรม 800×800 (source cell เดิม ≥800) ลาวาตก 8 จุดใช้ HD เดิม 8 เฟรม 314×534 ไม่ขยายแล้วอ้างเป็น native 800 ลำธารราบยังเป็น tile + flowDir ไม่มีการเลื่อน/เฟดภาพนิ่งสร้างเฟรมหรือเพิ่ม DOF/parallax/bloom

## คำสั่งตรวจซ้ำ

ต้องมี Python 3, Pillow, NumPy, SciPy, ffmpeg และ ffprobe รันตามลำดับ ห้ามรันการเขียน assets พร้อม renderer:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/register_summit.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/review_repairs.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_references.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_shore.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/audit_particles.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/render_offline.py --pairs icefall-summit --clips owner-2-ice-bridge
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/verify_delivery.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_pack.py
git diff --check
```

ผลจริงและข้อผิดพลาดที่แก้ระหว่างทำงานอยู่ใน [run-validation.json](review/run-validation.json) verifier ตั้งใจคืน exit 1 ขณะเกณฑ์ยังไม่ครบ ส่วน exit 0 ของคำสั่งวัด/ตรวจไฟล์ไม่ได้หมายถึง art acceptance ผ่าน ไม่รัน tests เกมเพราะไม่แก้เกม

`build_assets.py` สร้าง masks รุ่นก่อนการแก้ ถ้าสร้าง assets ทั้งชุดใหม่ ต้องรัน `correct_masks.py` ตามด้วย `register_summit.py` ก่อนวัดและเรนเดอร์หลักฐานใหม่ การรัน `correct_masks.py` อย่างเดียวจะลบ registration summit ของรอบนี้

## ตรวจตัวเองเทียบเกณฑ์รับงาน

| เกณฑ์ | ผลตรวจ/ข้อจำกัด |
|---|---|
| พื้น ASSEMBLE v7 และ mask 2× | ตรวจ 37 masks และ crop 10 จุดเทียบการประกอบ native v7; ดู delivery-verification |
| ทุก mask อยู่บนของเหลวจริง ≤3%; ไม่ทับหิน/ลาน/ต้นไม้/ฟ้า/เมฆ | **ยังไม่ครบ**: 5/37 มีขอบเขตบน ≤3%; ส่วนเพิ่ม summit ≤0.297%; อีก 32 masks ยังไม่ยืนยันทั้งชิ้น |
| ทุกน้ำตกจริงขยับ | แก้ summit witness แล้ว 528/528 ในทั้ง 8 เฟรม; **ยังไม่ครบการสำรวจทั้ง v7** |
| น้ำตก 8 เฟรม ≥800 ตามรูปทรงและละอองฐาน | ตรวจมิติ/8 phases ของ 10 น้ำตก; ละอองและรูปทรงทุกจุดยังต้องตรวจด้วยตาครบ |
| 8 ลาวาตก / ผิวราบ / particles เฉพาะผิวราบ | เก็บ HD เดิมและ flowDir; footprint ตรวจบางจุด; **ยังไม่ยืนยันทั้งชุด** |
| shore band ≤12 world บนผิวน้ำติดฝั่ง | ยืนยัน spirit 800 พิกเซลจากฝั่งจริง; **ยังไม่ครบทั้ง ice/spirit** |
| layout เดิมและระบุแทน off | ไฟล์เดิมคง hash, mapping ครบ; ไม่ได้ทดสอบ integration |
| contact sheets ไม่มีปัญหาแบบวงเดิม | มี 31 คู่และหลักฐานขยาย; **ยังไม่รับรองทุกบริเวณ** |
| คลิป 12 วินาที 3 มุม | decode ตรวจครบทุกไฟล์; มุมประมาณและเป็น offline renderer |
| README ไทย / loop-review / generation-prompts / queue-check | มีครบ; loop-review ยังไม่รับรองความลื่น; queue=incomplete |
| ≤80 MB / ขอบเขตงาน | ดู delivery-size และ scope-check; เปลี่ยนเฉพาะโฟลเดอร์ส่งออก ไม่มี commit/push/merge/deploy/agent หรือแก้ src/tests/img เดิม |

ตัดเฉพาะ diagnostic ซ้ำและ overview ที่ไม่ถูกใช้เพื่อคุมขนาด รายการและ hash อยู่ใน [continuation-pruned-files.json](review/continuation-pruned-files.json) พื้น native v7, source art, masks และ before-registration คงไว้ครบ เกณฑ์ค้างแยกรายข้ออยู่ใน [queue-check.json](queue-check.json)
