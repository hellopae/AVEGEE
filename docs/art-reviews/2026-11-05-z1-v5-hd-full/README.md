# Z1-V5-HD-FULL · ชุด 4/8 · r1-c4 / r3-c4

วาดครบ 8 ส่วน ประกอบภายในสอง chunk แล้ว แต่ **ยังไม่ครบเกณฑ์รับงานด้านโครงสร้าง รอยต่อ และการลบวัตถุ** ไม่ประกาศ QA ผ่าน ไม่ได้ทดสอบในเกม และยังไม่ควรนำภาพประกอบนี้เข้าเกมโดยถือว่าตรง mask แล้ว

ใช้ **ImageGen ในตัว 10 ครั้ง** (วาด 8 + แก้ลบวัตถุ q22 อีก 2; chunk ละ 5) ไม่มี Shado/API/CLI generation หรือการ sharpen ภาพเก่า Prompt ทุกครั้งและ path ผลเดิมอยู่ใน [generation-prompts.json](generation-prompts.json) เก็บ native ที่เลือก 8 ไฟล์แบบ lossless พิกเซลเดิมตรงกับผลเครื่องมือ; สอง draft ที่ถูกแทนเก็บเฉพาะ provenance/ขนาดจริงเพื่อลดขนาดชุดส่ง

| Chunk | ภาพประกอบ | Laplacian เทียบ v5 | โครงสร้าง: max เฉพาะจุดมั่นใจ |
|---|---|---:|---|
| r1-c4 | [2048×2048](r1-c4/r1-c4-2x.webp) · [เทียบ](r1-c4/r1-c4-compare.jpg) | ×22.06 | 12.00 px, 13/26 จุดมั่นใจ; เกิน 4 px |
| r3-c4 | [2048×2048](r3-c4/r3-c4-2x.webp) · [เทียบ](r3-c4/r3-c4-compare.jpg) | ×24.99 | 3.16 px, 16/24 จุดมั่นใจ; ไม่ยืนยันจุดที่เหลือ/ทุก contour |

ความคมวัดทั้ง chunk ที่ 2.8 device px/engine world unit (2.187589 px/map px), grayscale Laplacian variance ksize=1 หลัง Lanczos สเกลเดียวกัน มีผลแยก 4 quadrant ใน `sharpness.json` ด้วย ตัวเลขเป็นพลังงานขอบ/ผิว ไม่ใช่ความละเอียดเพิ่ม 22–25 เท่าหรือคะแนนความงาม การลบวัตถุและ contrast มีผล

ไฟล์ `q11..q22-native.webp`, `registration.json`, `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `structure.json`, `removed.json` ครบในแต่ละโฟลเดอร์ พร้อม `seam-check.jpg`, `structure-check.jpg`, `seams.json`, `sharpness.json` และ input crop สำหรับประกอบซ้ำ [run-summary.json](run-summary.json) สรุปตัวเลขและงานค้าง; [verification.json](verification.json) ตรวจความครบของไฟล์; [visual-review.json](visual-review.json) บันทึกการดูภาพ

Native r1-c4 q11 = **1322×1190**, q12 = **1323×1189**; อีก 6 ส่วน = **1254×1254** ตามขนาดที่คืนจริง ไม่ย่อ native ให้ตรงตัวอย่าง r1-c4 บนสุดมี context 640×576 เพราะไม่เพิ่มขอบนอกแผนที่; ส่วนอื่น 640×640 มี core 512×512 และขอบ 64 px ต่อด้าน

ใช้ master v5 + repairs ของ pilot ตาม provenance ที่ระบุและอ่าน `src/town-terrain-repair.js` แล้ว ไม่ได้แก้ source ใด SIFT/RANSAC partial affine, warp จาก native ตรงไป 2×, แก้สนามสี Gaussian sigma35 map px strength0.8, min-cost seam พร้อม feather 8 output px ต่อด้านตามต้นแบบ ไม่ใช้ local deformation/optical flow การลงทะเบียน q22 ของ r1-c4 ต้องแก้สเกลประมาณ 3.7%; จึงขยาย guard determinant จาก .94–1.06 ของต้นแบบเป็น .90–1.10 และเก็บข้อผิดพลาดไว้ ไม่ตีความ SIFT residual เป็นผลตรวจ contour

`registration.json` ระบุ rect ทั้ง chunk-local และ master 1×, affine หลัง resize และ **nativeToMasterPx1x** ที่คูณสเกล native แล้ว ใช้ตัวหลังกับไฟล์ native โดยตรงสำหรับ run ประกอบรวม แก้สนามสี/เลือก seam ซ้ำได้จาก input ที่เก็บไว้ ขอบกับ chunk เพื่อนบ้านยังไม่ได้เบลนด์

งานค้างที่เห็น: r1-c4 ส่วนรองรับสะพาน/ยอดเกาะหินคลาดเกิน 4 px, กลุ่มเมฆเหนือหัวสะพานต่างจาก v5 และยังมีต้นเขียวมุมล่างซ้ายให้เทียบ inventory; r3-c4 ยังมีพุ่มแดง/รูปคล้ายรากไม้ตามแนวต่อริมแม่น้ำ และจุดภูเขาด้านล่างที่จับคู่ไม่มั่นใจต้องตรวจรูปร่างจริง อย่าใช้ max ของเฉพาะจุดมั่นใจเพื่อรับรองส่วนที่เหลือ การลบหมอก lump-04/05/12 เห็นผล แต่ lump-02 และราย id บางส่วนยังรอตรวจครบ รายละเอียดใน `removed.json` ไม่ปัดสถานะไม่แน่ใจเป็นลบสำเร็จ ทะเลเมฆใหญ่/น้ำฟ้า/แม่น้ำม่วงคงเป็นฐาน แต่ยังไม่รับรอง alignment ของ animation mask

รันทดสอบออฟไลน์จาก repo root (Python 3, Pillow, numpy, OpenCV):

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
```

ตรวจ decode ภาพ, native pixels, ขนาด export, จำนวน generation, เพดาน decimal 60 MB และวัดความคม/โครงสร้างแล้ว การ assert ใน verify ตรวจความครบ/ความถูกต้องไฟล์เท่านั้น ไม่ใช่การผ่าน QA ศิลป์/รูปทรง ไม่รัน tests แอปเพราะไม่แก้ runtime

| เกณฑ์รับงาน | Self-check |
|---|---|
| 1. ทุกส่วนครบ, คม ≥×10, structure ≤4 px | ครบ 8/8 และคมเกิน ×10 ทั้งคู่; r1-c4 พบเกิน 4 px; r3-c4 ยังยืนยันไม่ครบ contour จึงยังไม่ปิดเกณฑ์ |
| 2. ไม่มีรอยต่อ, ลบวัตถุครบ, พื้นต่อเนื่อง | ประกอบ min-cost seam แล้ว แต่ยังมีประเด็นเมฆ/พุ่มและรายการลบไม่แน่ใจ จึงยังไม่ผ่านครบ |
| 3. native + registration ครบสำหรับประกอบรวม | ครบทั้ง 8 ส่วนพร้อม context/affine; run ประกอบรวมต้องถือข้อจำกัดด้านรูปทรงและรายการค้างเป็น blocker คุณภาพ |

เพิ่มเฉพาะโฟลเดอร์ review นี้ ไม่แก้ `src/`, `tests/`, `img/`, hooks, status.json, worklog.json หรือโฟลเดอร์คุณเป้ ไม่สร้าง/สลับ branch/worktree, ไม่เรียก agent, ไม่ commit/push/merge/deploy ขนาดจริงทั้งหมดดู `verification.json` (ประมาณ 59.2 MB)
