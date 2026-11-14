# โซน 4 cyberhell — HD FULL ชุด 4/5

ส่งเฉพาะ r3-c3, r3-c4, r3-c5, r4-c1 ในโฟลเดอร์นี้ ไม่ได้ติดตั้งเข้าเกมหรือแก้ src/tests/img เดิม
ใช้ built-in ImageGen เท่านั้น ไม่มี Shado ไม่มีการวาดซ้ำเพื่อไล่ตัวเลข; มีแก้ข้อผิดพลาดภาพ r4-c1 สองส่วนเพื่อลบร่องน้ำ/แสงฟ้าที่วาดเพิ่มผิดจากต้นฉบับ

## วิธีและไฟล์

อ่าน master WebP v3 ที่เกมโหลดจริง (4915×3277); repairs=false ตาม src/zone-skin.js
แบ่ง core 2×2; c5 แบ่ง 410/409 px; r4 แบ่ง 2 ส่วน 512×205 px; ขยาย context 64 px แต่ละด้านและตัดที่ขอบแผนที่
ภาพ input และ walkmask overlay อยู่ในแต่ละ chunk/inputs; generation-prompts.json เก็บ prompt จริงทุกครั้ง
native เป็นภาพที่ ImageGen คืนโดยไม่ย่อ/ขยาย แปลงเป็น WebP lossless และเทียบ decoded pixels กับ PNG แล้วตรงกัน
registration.json เก็บ affine native→local context 1×, native size/hash และ core/context rect ในพิกัด master [x0,y0,x1,y1]
SIFT + Lowe ratio .78 + affine RANSAC 2.5 px; warp ไป 2× ด้วย Lanczos4, ริมที่ affine เผยออกใช้ reflect101
ต่อเฉพาะภายใน chunk ด้วย min-cost seam (Gaussian5 RGB squared error, step -1/0/+1, เว้นริม overlap 10 output px, smoothstep feather ±8 output px)
ไม่มีการทับพื้นเก่าเพื่อซ่อน geometry drift หรือ sharpen ภาพหลังวาด ขอบกับ chunk เพื่อนบ้านยังไม่ตัดต่อ ให้ ASSEMBLE ใช้ native+context

พาธต้นแบบโซน 1 สองแห่งที่ใบงานระบุไม่มีอยู่ในเครื่อง จึงไม่ได้อ้างว่าใช้สคริปต์ต้นแบบนั้นโดยตรง
ใช้วิธีในใบงาน และ solver ที่อธิบายไว้ใน docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py เป็นหลักฐานวิธี min-cost
สคริปต์ทั้งหมดที่ใช้กับงานนี้เก็บใน scripts/ เพื่อทำซ้ำได้ใน worktree นี้

## ผลวัดเพื่อให้ Claude ตัดสิน

| chunk | ImageGen | output 2× | sharpness ratio | SIFT residual max (1× px) | nearest-edge p95 / max (1× px) |
|---|---:|---|---:|---:|---:|
| r3-c3 | 4 | 2048×2048 | 428.73× | 2.81 | 1.41 / 5.66 |
| r3-c4 | 4 | 2048×2048 | 280.32× | 3.41 | 1.41 / 6.71 |
| r3-c5 | 4 | 1638×2048 | 358.95× | 3.21 | 1.41 / 5.39 |
| r4-c1 | 4 | 2048×410 | 443.51× | 3.64 | 1.41 / 7.21 |

ImageGen 16/16 ครั้ง, native ที่ส่ง 14/14 ส่วน; ขนาดไฟล์ ณ summary 76.66 MB จากเพดาน 80 MB

Sharpness = grayscale Laplacian variance ของภาพประกอบ 2× / master เดิมขยาย Lanczos 2× ที่ขนาดเดียวกัน ค่าแสดงรายละเอียด/contrast ร่วมกัน ไม่ใช่คะแนนความสวย
SIFT residual วัดเฉพาะจุดที่ RANSAC จัดเป็น inlier จึง **ไม่ใช่** structure max ของขอบลาน/บันได/หน้าผา/ตลิ่งทั้งหมด
Nearest-edge เป็น Canny 60/130 จาก source ไปหาขอบใหม่ที่ใกล้ที่สุด มีขอบ texture ปน จึง **ไม่ใช่** semantic displacement เช่นกัน; บาง max เกิน 4 px และไม่ได้รันซ้ำให้ตัวเลขผ่าน
structureMaxPx1x ของ semantic geometry จึงบันทึก null อย่างตรงไปตรงมา: **เกณฑ์ ≤4 px ยังไม่ยืนยัน**
ดูแต่ละ chunk/structure-overlay.jpg (สีเขียวคือขอบ source), structure-points.json และ inputs/walkmask-overlay.jpg ประกอบการตัดสิน
walkmask-evidence.json ถอด RLE ที่ runtime ใช้จริง: พื้น walkable ใน r3-c3/r3-c4/r3-c5 = 45.96%/1.60%/3.09%; r4-c1 = 0% ยืนยันว่าแถวล่าง chunk นี้ไม่มีทางเดิน

## Self-check ตามเกณฑ์รับงาน

1. ครบทุกส่วน: ดู run-summary.json และ file-checks.json; sharpness รายงานในตาราง ส่วน structure ≤4 px ยังรอ reviewer ไม่สรุปว่าผ่าน
2. ต่อภายใน chunk ด้วย min-cost แล้ว มี seam-check.jpg ภาพรวมและ seam-strips.jpg ที่ pixel output จริงให้ตรวจรอยต่อ; ผลมองด้วยตาราย chunk อยู่ใน visual-review.json ไม่ใช้สคริปต์ตัดสินความไร้รอย
   ไม่พบ baked obstacle ที่ต้องลบบนพื้น walkable จากภาพต้นฉบับทั้งสี่ chunk เทียบ walkmask จึง removedIds=[]; objects-inventory.json ระบุเหตุผลคงราว/เสา/คริสตัลริมทางไว้
   คงพื้นสะพาน บันได ของเหลว และหมอกในบริเวณเดิม; ของเหลว/หมอกเป็นฐานภาพนิ่ง
3. ส่ง native lossless และ registration พร้อม core/context ทุกส่วนสำหรับ ASSEMBLE; ไม่มีส่วน generation/assembly ค้างเมื่อ pendingGenerationOrAssembly=[]

## การตรวจที่รัน

- python3 -m py_compile scripts/prepare.py scripts/assemble.py scripts/ingest.py scripts/review.py scripts/verify.py scripts/summarize.py (ใช้ path เต็มจาก repo)
- prepare.py ตัด input จาก master; ingest.py ตรวจ pixel-exact lossless conversion ของ native แต่ละภาพ
- assemble.py register/ต่อภาพ/บันทึก metric; r4-c1 ประกอบใหม่หลังแก้ข้อผิดพลาดภาพ ส่วนอีกสาม chunk ประกอบครั้งเดียว
- review.py สร้างภาพตรวจรอยต่อและ nearest-edge proxy; ไม่ตั้ง quality gate
- verify.py ตรวจเฉพาะไฟล์ครบ เปิดได้ ขนาด 2×/native ถูก JSON/affine อ่านได้ WebP เป็น VP8L และขนาดรวม ≤80 MB; ผลจริงใน file-checks.json
- ตรวจ source-hashes.json: master และข้อมูล src/walkmask เดิม 25 ไฟล์ SHA256 คงเดิม; git diff --check ไม่รายงานข้อผิดพลาด (ไฟล์ที่เพิ่มอยู่ในโฟลเดอร์งานนี้เท่านั้น)
- ไม่รัน game test suite เพราะไม่ได้เปลี่ยนโค้ดหรือภาพที่เกมโหลด และไม่ได้อ้าง QA ผ่าน

## ส่วนค้างและข้อจำกัด

รอ Claude ตัดสิน geometry ≤4 px และรอยต่อภายใน chunk จากหลักฐาน; ASSEMBLE ยังต้องต่อขอบกับเพื่อนบ้าน
จุดตรวจเพิ่ม: เสา/ขอบทองและรายละเอียดขั้นเล็ก ๆ ใน r3-c4/q22 และ r3-c5/q21–q22 เด่นกว่าต้นฉบับ ให้เทียบกับ walkmask และรูปทรงเดิม ไม่รับรองว่าเป็น texture อย่างเดียวทั้งหมด
สอง native รุ่นแรกของ r4-c1 ไม่ส่งเพราะเพิ่มแสงฟ้าคล้ายร่องน้ำที่ไม่มีใน source; generations.json เก็บขนาด/hash ของรุ่นที่ถูกแทนไว้ และส่งเฉพาะ native ที่เลือก
ภาพ compare เป็น centre crop ที่ 2.8 display px/world (master 1.28 px/world), ไม่ใช่ screenshot จาก runtime
ยังไม่ได้ทดสอบในเกมหรือ browser และไม่ได้ commit/push/merge/deploy
