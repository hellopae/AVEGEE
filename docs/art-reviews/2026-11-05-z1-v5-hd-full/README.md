# Z1-V5-HD-FULL — ชุด 3/8

เพิ่มเฉพาะ r1-c2 และ r1-c3 จากฐาน `812152d2` ใช้ **ImageGen ในตัว 10 ครั้ง**: วาด 8 ส่วน และแก้ q22 ของทั้งสอง chunk อีก 2 ครั้ง ไม่มี Shado/API generation ไม่ผูกเข้าเกม ไม่รับรอง QA

| chunk | ความคม Laplacian เทียบ v5 | จุดตรวจ structure ที่เชื่อถือได้ | ระยะสูงสุด 1× |
|---|---:|---:|---:|
| r1-c2 | ×31.03 | 14/17 | 2.00 px |
| r1-c3 | ×23.93 | 8/17 | 3.61 px |

**Self-check:** (1) วาดครบ 8/8 ส่วน ความคม ≥×10 และจุดตรวจที่เชื่อถือได้ ≤4 px แต่ยังไม่ยืนยันทุก contour (2) ตรวจ seam sheet แล้วไม่พบเส้นแบ่งสี่เหลี่ยมชัด ลบ lump-00/01 แล้ว แต่ r1-c3 ยังยืนยันการลบ `city-bed-01`, `ice-tree-00`, `ice-tree-01` หมดไม่ได้—มีพืชซ้อนขอบล่าง/ใบไม้หิมะใกล้กล่องเดิม (3) native + registration ครบ พร้อมขอบซ้อนสำหรับประกอบรวม ขอบระหว่าง chunk ยังไม่ตัดต่อ

ไฟล์แต่ละ chunk: `q11..q22-native.webp` lossless ไม่ resize, `<chunk>-2x.webp` lossless 2048×2048, `<chunk>-compare.jpg` เก่า|ใหม่ที่ 2.8 device px/world unit, `registration.json`, `structure.json`, `removed.json`, `sharpness.json`, `seam-check.jpg`, `seams.json` และหลักฐานรอบแก้ใน `retry-history.json` เปิด JPEG ที่ 100%; ภาพนี้เป็น offline composition ไม่มี sprite ปิดรอยต่อ

ขนาดคืนจริง: แถวบน **1323×1189**, แถวล่าง **1254×1254**; core 512×512 + context ข้างละ64 map px (ขอบบนแผนที่ไม่มี context นอกภาพ) จึงได้ context 640×576 / 640×640 ไม่ตีความขนาด export เป็นจำนวนพิกเซลวาดจริง

วิธีตามต้นแบบ plaza-detail: v5 + runtime repairs → SIFT/RANSAC partial affine → warp native ตรงไป2× → ปรับสนามสี Gaussian sigma35 map px (กันกล่องลบออกจาก reference) → min-cost seam + feather8 output px ต่อด้าน ไม่มี local deformation/sharpen/DOF/parallax. จุดตรวจใช้ DoG49×49 ค้นหา±12 px แยกจาก SIFT; 3 จุดของ c2 ถูกป้อนเป็น feedback ในรอบแก้ จึงไม่ใช่หลักฐานอิสระทั้งหมด ค่า Laplacian มีผลจาก texture/contrast/การลบวัตถุ ไม่ใช่ความละเอียดการมองเห็นเพิ่มกี่เท่า

`generation-prompts.json` เก็บ prompt และขนาดจริงทุกครั้ง/hash ของ native ที่เลือก; `inputs-provenance.json` เก็บต้นทางและ hash ส่วน `inputs/` เก็บ crop ตั้งต้นและ input รอบแก้ ประกอบ baseline จาก core แบบตรงพิกเซลได้เหมือนต้นฉบับ (ตรวจ equality แล้วใน `baseline-reconstruction-check.json`) เพื่อลดไฟล์ซ้ำ งบรวมดู `verification.json` (≤60,000,000 bytes)

รันจาก repo root (Python3 + Pillow/numpy/OpenCV):

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
```

verify ตรวจ decode ทุกภาพ, core/context/affine, native decoded hash เท่าต้น ImageGen, export size, source hash, จำนวนครั้งและงบ; **exit2 เพราะยังมี acceptance ที่ยืนยันไม่ได้** ดู `run-summary.json` ไม่รันทดสอบแอป/ในเกมเพราะไม่แก้ runtime. ไม่แก้ `src/`, `tests/`, `img/` เดิม, hooks, status/worklog หรือโฟลเดอร์คุณเป้ ไม่สร้าง/สลับ branch/worktree และไม่ commit/push/merge/deploy
