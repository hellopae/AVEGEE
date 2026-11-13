# Z234-HD-FULL — โซน 2 Asia ชุด 2/5

ส่ง **3 chunk เต็ม + 3/4 ส่วนของ r2-c3**: ค้าง `r2-c3/q22` และการประกอบ/วัด chunk นี้ ใช้ **ImageGen ในตัวสำเร็จ 16 ครั้ง ได้ 15 ส่วนที่ไม่ซ้ำ** ไม่มี Shado/API/CLI generation ไม่ผูกเข้าเกม และไม่ประกาศ QA ผ่าน

**เหตุที่ค้าง:** ครั้งที่ 9 (`r2-c2/q11`) สร้างภาพสำเร็จ แต่สคริปต์ orchestration อ่านสถานะการบันทึกไฟล์ที่ยังรันอยู่ผิดเป็น failure จึงวาดซ้ำครั้งที่ 10 และใช้ผลครั้งที่ 10 เป็นภาพที่เลือก ทั้งสอง prompt/path/hash อยู่ใน `generation-prompts.json`; ภาพซ้ำที่ไม่เลือกไม่รวมในแพ็ก ไม่มี ImageGen service failure และไม่เรียกครั้งที่ 17

| chunk | export lossless | Laplacian เทียบ Asia v2 | จุด structure ที่เชื่อถือได้ | เลื่อนสูงสุด 1× |
|---|---|---:|---:|---:|
| r1-c5 | 1638×2048 | ×77.44 | 9/12 | 1.41 px |
| r2-c1 | 2048×2048 | ×66.64 | 8/12 | 1.41 px |
| r2-c2 | 2048×2048 | ×55.28 | 6/12 | 1.41 px |
| r2-c3 | ยังไม่ประกอบ; q11/q12/q21 มี native+registration | ยังไม่วัด | ยังไม่วัด | ยังไม่วัด |

## Self-check ตามเกณฑ์รับงาน

1. **ยังไม่ครบ**: ได้ 15/16 ส่วน ความคมของ 3 chunk เต็มสูงกว่า ×10 และจุด structure ที่จับคู่มั่นใจอยู่ใน 4 px แต่ยังไม่ยืนยันทุกขอบลาน/บันได/หน้าผา/ตลิ่ง (`wholeStructureWithin4pxVerified:false`)
2. ตรวจ seam sheet ของ 3 chunk เต็มแล้วไม่พบเส้นแบ่งสี่เหลี่ยมชัดในการดูรอบนี้ แต่ยังมีพืชล้ำพื้น/ต้องตรวจต่อ จึงไม่ปิดข้อนี้ทั้งหมด: `asia-r1-c5-paving-foliage-02/04`, `asia-r2-c1-paving-foliage-01/07`, `asia-r2-c2-paving-foliage-03` ดู `removed.json` และ `removal-check.jpg` ของแต่ละ chunk; r2-c3 ยังไม่ตรวจบนผลประกอบเต็ม
3. **มี native lossless + affine/core/context ครบสำหรับ 15 ส่วนที่เลือก** รวมขอบซ้อนให้ ASSEMBLE; ยังขาด q22 ของ r2-c3 ไม่เติมภาพเก่าขยายแทน `r2-c3-partial-review.jpg` แสดงช่องว่างชัดและไม่ใช่ผลเบลนด์สุดท้าย

## ต้นทางและวิธี

- เกมโหลด `img/map-zone2/v2/` ตาม `src/zone-skin.js`, `repairs:false` จึงไม่ใช้ repairs โซน 1 ขนาด master 4915×3277; source SHA-256 อยู่ใน `inputs-provenance.json`
- อ่านใบงานโซน 1 ตาม path ที่ brief ระบุแล้ว worktree อ้างอิงเก่าไม่มีอยู่ จึงอ่านต้นแบบแบบ read-only จาก git: plaza-detail `bc9dc4dd`, HD-FULL `d54fac28` สคริปต์ประกอบดัดแปลงจากต้นแบบหลัง
- 2×2 ต่อ chunk, core 512×512; c5 กว้าง 819 แบ่ง 410+409; context 64 map px/ด้านที่ไม่ชนขอบแผนที่ (overlap 128 px) native จริง: r1-c5 q11 **1212×1298**, q12 **1136×1385**, q21 **1149×1368**, q22 **1078×1460**; r2-c1 ซ้าย **1189×1323**, ขวา **1254×1254**; ส่วนที่เลือกของ r2-c2/r2-c3 **1254×1254** ขนาด export ไม่ใช่จำนวนพิกเซลวาดจริง
- SIFT/RANSAC partial affine → warp native ตรงไป 2× → สนามสี Gaussian sigma35 map px, weight .8 กันกล่องลบพุ่มออก → min-cost seam + feather8 output px/ด้าน ไม่มี local deformation/sharpen/DOF/parallax **ขอบระหว่าง chunk ยังไม่เบลนด์**
- `objects-inventory.json` เทียบภาพ/owner walkmask กับ `src/town-layout.js` และ snapshot `runtime-objects.json`; overlay เขียว = walkmask, เหลือง = กล่องค้นหา ลบเฉพาะพืชบนพื้น ไม่ลบหน้าผาทั้งกล่อง ป่าไกล ของเหลว น้ำตก หมอก/เมฆฐานคงไว้ในภาพ พบเส้น stitching เดิมใน master บริเวณหมอก r2-c1 และลาวา r2-c2 จึงเก็บ input เป็นหลักฐาน

Laplacian grayscale ksize1 วัดภาพ decode lossless ที่ 2.8 device px/world unit (=2.187589 device px/map px) ด้วย Lanczos เท่ากัน เก็บ full/ครึ่งบน/ครึ่งล่างใน `sharpness.json`; texture/contrast/การลบพุ่มมีผลต่อค่า ไม่ใช่ความละเอียดการมองเห็นเพิ่มกี่เท่า Structure ใช้ DoG sigma1.5/6, template49×49 ค้นหา±12 map px, correlation≥.6 และไม่ชนกล่องลบพุ่ม; เก็บทุกจุดรวมจุดไม่มั่นใจ แยกจาก SIFT residual จุดวัดไม่พิสูจน์ทุก semantic contour

## ไฟล์และการตรวจ

แต่ละ chunk เต็มมี `q11..q22-native.webp`, `<chunk>-2x.webp`, `<chunk>-compare.jpg` ที่ซูม 2.8 px/world unit, `registration.json`, `structure.json`, `sharpness.json`, `removed.json`, `seams.json`, `seam-check.jpg`, `structure-check.jpg`, `removal-check.jpg` ส่วน r2-c3 มี native 3 ส่วน, registration 3 ส่วน และ JSON ระบุว่ายังไม่วัด ไม่มี final export แทนภาพที่ขาด

รันแล้ว: `prepare.py`; `assemble.py` แยก r1-c5/r2-c1/r2-c2; `partial.py`; `review-removals.py`; `pack.py`; `python3 -m py_compile .../scripts/*.py`; `verify.py`; `git diff --check` (รายละเอียด exit/check อยู่ใน `verification.json`)

- `baseline-reconstruction-check.json`: crop core ประกอบกลับตรงทุกพิกเซลทั้ง 4 chunk
- ตรวจไฟล์อัตโนมัติเฉพาะความครบ/decode/ขนาด/affine schema/hash/จำนวนครั้ง/งบ **ไม่ใช้ threshold คุณภาพเป็น gate** `verify.py` จะ exit1 เพราะ q22/final export/ภาพ seam/registration ส่วนที่ 4 ของ r2-c3 ขาดตามที่ระบุ; native ที่ส่งและภาพที่มีตรวจ decode/ขนาด/hash ไม่มีปัญหาที่พบ
- `packing.json`: ลดเฉพาะ JPEG review เป็น quality70, 4:2:0 เพื่ออยู่ในเพดาน **80,000,000 bytes** ไม่แก้พิกเซล native หรือ final WebP เปิด lossless export ประกอบการตัดสินรายละเอียด JPEG
- ไม่รัน app/in-game test เพราะไม่แก้ runtime ไม่มี QA claim ไม่แก้ `src/`, `tests/`, `img/`, hooks, status/worklog ไม่สร้าง/สลับ branch/worktree และไม่ commit/push/merge/deploy

ทำซ้ำจาก repo root ด้วย Python3 + Pillow/numpy/OpenCV: `python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/assemble.py r1-c5 r2-c1 r2-c2` แล้ว `partial.py`, `review-removals.py`, `pack.py`, `verify.py` ในโฟลเดอร์ scripts เดียวกัน `prepare.py` ใช้สร้าง input ใหม่และสร้าง inventory ตั้งต้น (จึงไม่ควรรันทับผล manual review โดยไม่เก็บสำเนา) ไม่มีสคริปต์ใดเรียก ImageGen
