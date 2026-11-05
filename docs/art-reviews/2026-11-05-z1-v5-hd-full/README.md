# Z1-V5-HD-FULL · ชุด 1/8 · 5 พฤศจิกายน 2569

เพิ่มเฉพาะงานวาด `r2-c2` และ `r3-c3` ในโฟลเดอร์นี้ ใช้ ImageGen ในตัว **10 ครั้ง**: วาด 8 ส่วน + แก้การลบต้นไม้ 2 ครั้ง ไม่เรียก Shado/API/CLI generation และไม่แก้ไฟล์เกมเดิม

| chunk | ภาพประกอบ 2× | ภาพเทียบซูมเกม | Laplacian เทียบ v5 | structure จุดที่มั่นใจ |
|---|---|---|---|---|
| r2-c2 | [2048×2048](r2-c2/r2-c2-2x.webp) | [v5 / ใหม่](r2-c2/r2-c2-compare.jpg) | ×22.06 | 19/26 จุด, สูงสุด 1.41 px |
| r3-c3 | [2048×2048](r3-c3/r3-c3-2x.webp) | [v5 / ใหม่](r3-c3/r3-c3-compare.jpg) | ×15.88 | 29/33 จุด, สูงสุด 2.24 px |

ทุกส่วน core 512×512 + ขอบ 64 ต่อด้าน = input 640×640 หน่วย master 1×; ImageGen คืนจริง **1254×1254 ทุกครั้ง** เก็บ `q11..q22-native.webp` แบบ lossless เท่าพิกเซล RGB ต้นฉบับที่เครื่องมือคืน มี 4 ส่วนต่อ chunk ครบ ขอบกับ chunk เพื่อนบ้านยังไม่ได้ประกอบ

`registration.json` แยก core/context ทั้ง global และ chunk-local (rect = x,y,width,height) และระบุ affine จาก native ไป context/global สำหรับประกอบรวม พิกัดเป็น pixel convention ของ OpenCV; core เริ่มที่ context +64 พิกเซล native มีรายละเอียดจริงประมาณ 1.959 px/map px การส่งออก 2048 ไม่ได้หมายถึงวาด native 2048

ใช้สคริปต์ต้นแบบ plaza-detail เป็นฐาน: SIFT + RANSAC, warp จาก native ตรงสู่ 2×, แก้สนามสี Gaussian sigma 35 map px ด้วย cleared pilot และ min-cost seam ใน overlap 128 map px, feather ±8 output px ไม่มี sharpen, DOF, parallax หรือ local warp ใช้ full affine เมื่อมี SIFT inlier มากกว่า partial affine เพื่อแก้การยืดแกนจาก ImageGen (`r2-c2/q11,q21`, `r3-c3/q21`); อีกส่วนใช้ partial ตามต้นแบบ มีเมทริกซ์และ residual จริงทุกส่วน

ดู `seam-check.jpg` ในแต่ละ chunk: ภาพเต็ม, แนวตัดจริงสีฟ้า และแถบรอยต่อที่ export 2× ไม่มี sprite ปิดแนวต่อ ภาพที่ตรวจไม่พบเส้นแบ่งสี่เหลี่ยมชัด แต่ลายรอยแตกเล็กเป็นคนละการวาด และยังต้องประเมินภาพเต็มโดยเจ้าของงาน

ลบราว/เสาสะพาน เสาท่าเรือ เสาข้างบันได และกลุ่มต้นไม้/พุ่มบนทางเดิน เติมพื้นต่อเนื่อง เก็บพื้นสะพาน ขั้นบันได ลาวาและแม่น้ำม่วงเป็นชั้นฐาน รักษาป่าหน้าผาไกล รายการ id กับสถานะอยู่ใน `removed.json` **ยังยืนยันรายตัวไม่ได้** สำหรับ `r2-c2`: `pilot-red-tree-00/01` และ `r3-c3`: `south-rock-05` เพราะกรอบสำรวจคลาดเคลื่อนและทับกลุ่มฉาก พุ่มต่ำริมตลิ่งด้านขวาใน `r3-c3/q12` ยังอยู่ จึงยังไม่ปิดเกณฑ์ลบวัตถุครบทั้งหมด

โครงสร้างตรวจด้วย fixed landmark template 49×49, DoG sigma 1.5/6, ค้นหา ±12 px, correlation ≥0.6 แยกจาก SIFT เก็บจุดไม่มั่นใจไว้ครบใน `structure.json` และ `structure-check.jpg` **ผลนี้ไม่พิสูจน์ทุก contour, จำนวนขั้นบันได หรือความตรงกับ mask animation ทุกพิกเซล** ตั้ง `wholeStructureWithin4pxVerified=false` จึงไม่รับรอง QA หรือเกณฑ์โครงสร้างทั้งหมด

ความคมวัดภาพ decode ที่ 2.8 device px/engine world unit = 2.187589 device px/master map px ด้วย Lanczos แล้วหา grayscale Laplacian variance ksize=1 ใช้ทั้ง chunk และทั้ง 4 core ที่กำหนดไว้ใน `sharpness.json` อัตรานี้คือพลังขอบ/texture ไม่ใช่ความละเอียดการมองเห็นเพิ่ม 22 เท่า การลบวัตถุและ contrast มีผลต่อค่า

รันทดสอบอาร์ติแฟกต์จาก repo root:

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
```

ใช้ Python 3, Pillow, numpy, OpenCV ไม่เรียก generation ซ้ำ ตรวจ decode, native SHA256/พิกเซลเทียบ ImageGen, 8 ส่วน, registration, export 2048, จำนวน generation ≤10, ความคม ≥10 และขนาดรวม ≤60,000,000 bytes ผลอยู่ใน `verification.json` / `run-summary.json` ไม่รัน tests แอปหรือเกม เพราะไม่มี runtime เปลี่ยน ไม่ทดสอบในเกม

Self-check ตามเกณฑ์รับงาน:

1. ครบ 8/8 ส่วน และตัวเลขความคม ≥10 ทั้งสอง chunk; จุดโครงสร้างที่มั่นใจ ≤4 px แต่ทุก contour ยังไม่ยืนยัน
2. ตรวจภาพรอยต่อแล้วไม่เห็นเส้นแบ่งสี่เหลี่ยมชัด พื้นกลุ่มวัตถุที่ลบต่อเนื่อง; ยังมีรายการ id/พุ่มริมตลิ่งที่ต้องตรวจต่อ จึงยังไม่ปิดข้อนี้ทั้งหมด
3. Native lossless และ registration + ขอบซ้อนครบทั้งสอง chunk พร้อมส่ง run ประกอบรวม

`generation-prompts.json` เก็บ prompt เต็มและไฟล์ผลจริง 10 ครั้ง ภาพ revision ที่ไม่ได้เลือกไม่รวมในชุดเพื่อลดขนาด แต่มี path เดิม/ขนาด/SHA256 บันทึกไว้ `source-provenance.json` ระบุ repaired master, inventory, repair source และ cleared pilot ที่อ่านจากรอบต้นแบบ คง input crop ที่ใช้วาดและ color reference เพื่อประกอบซ้ำภายในชุดนี้

ไม่สร้าง/สลับ worktree หรือ branch ไม่ commit/push/merge/deploy ไม่แก้ src/tests/img/hooks/status/worklog หรือโฟลเดอร์คุณเป้ ขนาดรวมจริงดู `run-summary.json`
