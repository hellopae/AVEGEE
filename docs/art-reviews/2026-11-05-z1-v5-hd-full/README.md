# Z1-V5-HD-FULL · ชุด 8/8 · r4-c1 ถึง r4-c5

ส่งภาพสำหรับ review ครบ **10/10 ส่วน** ใช้ **ImageGen ในตัว 10 ครั้ง** ตามเพดาน ไม่ใช้ Shado/API/CLI generation ผลยังมีงานแก้และตรวจต่อ **ไม่ประกาศ QA ผ่าน** ดู [run-summary.json](run-summary.json) และ [manual-review.json](manual-review.json)

แต่ละ chunk มี `q11-native.webp`, `q12-native.webp` แบบ lossless, `registration.json`, `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `structure.json`, `removed.json`, `seam.json`, `seam-check.jpg` และ crop ตั้งต้นใน `inputs/` แถว r4 มีเพียง 2 ส่วน จึงไม่มี q21/q22 ขนาดประกอบ c1–c4 = 2048×410, c5 = 1638×410

| Chunk | native q11 / q12 ที่คืนจริง | Laplacian เทียบ v5 | ระยะสูงสุดของจุดจับคู่มั่นใจ |
|---|---|---|---|
| r4-c1 | 1836×857 / 1935×813 | 64.24× | 2.0 px (18/36 จุด) |
| r4-c2 | 1935×813 / 1935×813 | 33.90× | 1.0 px (31/36 จุด) |
| r4-c3 | 1935×813 / 1935×813 | 35.20× | 1.0 px (39/52 จุด) |
| r4-c4 | 1934×813 / 1935×813 | 37.85× | 0.0 px (31/36 จุด) |
| r4-c5 | 1774×887 / 1663×946 | 40.16× | 1.0 px (25/30 จุด) |

วัดทั้ง core ที่ซูม 2.8 device px/engine world unit (2.187589 px/map px), Lanczos เท่ากันทั้งคู่, grayscale Laplacian variance ksize=1 ไม่มี sharpening ค่าอัตราส่วนสะท้อนพลังงานขอบ/ผิวและ contrast ไม่ใช่ความละเอียดรับรู้เพิ่มเป็นจำนวนเท่านั้น จุดโครงสร้างใช้ DoG patch 49×49 ค้นหา ±12 map px, NCC≥0.6; จุดไม่มั่นใจอยู่ใน JSON ครบ **ยังไม่พิสูจน์ทุก contour ≤4 px**

พิกัด core อยู่ y=3072–3277, context y=3008–3277, ขอบซ้อน 64 px เฉพาะด้านที่ไม่ชนขอบโลก c5 แบ่ง core 410+409 px ใช้ master-lossless ของ pilot ซึ่งส่วนนี้ตรงกับไฟล์ v5 ใน repo ทุกพิกเซล repair masks ใน `src/town-terrain-repair.js` ไม่ตัดแถบนี้

ประกอบด้วย SIFT/RANSAC partial affine แล้ว warp native ตรงไป 2× ตามต้นแบบ ไม่ใช้ dense/local warp ปรับสนามสีด้วย Gaussian sigma35 map px และ factor0.8; เนื่องจากไม่มี pilot ที่ลบวัตถุสำหรับแถบนี้ จึงไม่นำสีต้นฉบับภายในกรอบวัตถุมาปรับพื้นใหม่ ใช้ min-cost seam กับ feather ±8 output px เฉพาะภายใน chunk **ไม่ตัดต่อขอบเพื่อนบ้าน** affine ทั้ง native→context และ native→master พร้อม rect/core offset อยู่ใน registration

prompt เต็ม/ลำดับ reference/path ต้นฉบับ/hash อยู่ใน [generation-prompts.json](generation-prompts.json) สองครั้งแรกใช้ภาพลานที่ผ่านแล้วเป็น reference วัสดุ; ส่วนถัดมาใช้ crop และ removal guide โดยย้ำคงป่าเดิม เพราะพบการเปลี่ยนองค์ประกอบใน r4-c1/q12 ภาพวัสดุต้นไม้ตาม path ของต้นแบบหาไม่พบในเครื่องนี้

**งานค้างสำคัญ:** r4-c1/q12 วาดป่าล่างที่ไม่ได้สั่งลบเป็นพื้นดิน ต้องวาดแก้ก่อนรับประกอบรวม และมีสีแดงจากสนามสีต้นฉบับหลงอยู่ กรอบ inventory เป็น survey คร่าว ๆ หลายกรอบคลาดกับวัตถุจริงหรือเป็นพื้นอยู่แล้ว จึงยืนยันการลบทุก ID ไม่ได้ `removedIds` ระบุเฉพาะ south-bed-17 ที่ตรวจบริเวณกรอบแล้วหายจากภาพ; ID อิงกรอบ survey รายการอื่นอยู่ใน `unverifiedIds` ไม่มีหมอกขาวในรายการ 12 จุดตัด r4/context

ตรวจ seam sheet ทั้ง 5 แล้วไม่เห็นเส้นแบ่งตรงชัด แต่ลายละเอียดและ canopy ใกล้ seam ยังต้องตรวจร่วมกับการแก้ข้างต้น ภาพ compare เป็น offline composition ไม่มีการทดสอบในเกม

รันซ้ำโดยไม่เรียก ImageGen:

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
```

`verify.py` ตรวจ decode ทุกภาพ, native lossless/พิกเซลตรงผล ImageGen, rect/core/overlap, affine, ขนาด export, baseline v5, คำนวณความคมซ้ำ, ขอบเขตไฟล์ และเพดาน 60,000,000 bytes ผลอยู่ใน [verification.json](verification.json) ไม่รัน app tests เพราะไม่แก้ runtime ข้อจำกัดเชิงภาพยังไม่ถือว่าปิด

| เกณฑ์รับงาน | Self-check |
|---|---|
| 1. ครบส่วน, คม ≥10×, structure ≤4 px | ครบ 10 ส่วน; คมเกิน 10× ทุก chunk; จุดมั่นใจสูงสุด 2 px แต่ยังไม่ยืนยันทุก contour และมีป่าหายหนึ่งส่วน |
| 2. ไม่เห็น seam, ลบวัตถุและเติมพื้นต่อเนื่อง | ตรวจ sheet แล้วไม่พบเส้นตรงชัด; การลบทุก ID ยังไม่ยืนยัน จึงยังไม่ครบเกณฑ์นี้ |
| 3. native + registration พร้อมประกอบรวม | ไฟล์และพิกัดครบทุกส่วน; r4-c1/q12 ยังต้องแก้ภาพก่อนรับใช้งาน |

เปลี่ยนเฉพาะโฟลเดอร์ review นี้ ไม่แก้ src/tests/img, hooks/status/worklog หรือโฟลเดอร์คุณเป้ ไม่สร้าง/เปลี่ยน worktree/branch และไม่ commit/push/merge/deploy ขนาดรวมจริงดู verification.json
