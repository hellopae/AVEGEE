# Z234-HD-FULL โซน 3 west ชุด 1/5

ส่ง `r1-c1`, `r1-c2`, `r1-c3`, `r1-c4` พร้อม native 16 ส่วน และภาพประกอบ 2× ขนาด 2048×2048 จำนวน 4 ภาพ

รอบนี้คัดลอกไฟล์เดิม 85 ไฟล์จาก worktree `20261113T133949Z-277abfe7` ตามใบงาน แล้วเพิ่ม README, ผลตรวจไฟล์ และข้อมูลการทำต่อใน run-summary ภาพทุกไฟล์คงไฟล์จากรอบก่อน ImageGen รอบก่อน 16 ครั้ง รอบนี้ 0 ครั้ง prompt เต็มและขนาดที่คืนจริงอยู่ใน `generation-prompts.json` ช่อง `nativeFile` และ `referenced_image_paths` เป็นประวัติการวาดในรอบก่อน

## ภาพและข้อมูลสำหรับตรวจ

| chunk | ภาพ 2× | ภาพเทียบที่ซูมเกม | แนวต่อ | วัตถุ |
|---|---|---|---|---|
| r1-c1 | [2×](r1-c1/r1-c1-2x.webp) | [เทียบ](r1-c1/r1-c1-compare.jpg) | [seam](r1-c1/seam-check.jpg) | [crop](r1-c1/object-review.jpg) |
| r1-c2 | [2×](r1-c2/r1-c2-2x.webp) | [เทียบ](r1-c2/r1-c2-compare.jpg) | [seam](r1-c2/seam-check.jpg) | [crop](r1-c2/object-review.jpg) |
| r1-c3 | [2×](r1-c3/r1-c3-2x.webp) | [เทียบ](r1-c3/r1-c3-compare.jpg) | [seam](r1-c3/seam-check.jpg) | [crop](r1-c3/object-review.jpg) |
| r1-c4 | [2×](r1-c4/r1-c4-2x.webp) | [เทียบ](r1-c4/r1-c4-compare.jpg) | [seam](r1-c4/seam-check.jpg) | [crop](r1-c4/object-review.jpg) |

แต่ละ chunk มี `q11..q22-native.webp` แบบ lossless ตามข้อมูลส่งออกรอบก่อน, `registration.json`, `structure.json`, `sharpness.json`, `removed.json`, `seams.json` และภาพตรวจ structure ข้อมูลพิกัด native→master, core และ context อยู่ใน registration สำหรับ ASSEMBLE

## ต้นทางและวิธีประกอบ

`src/zone-skin.js` โหลด west จาก `img/map-zone3/v1/` ขนาด master 4915×3277 และ `repairs:false` แบ่ง core 512×512 แบบ 2×2 ต่อ chunk พร้อม context 64 px ต่อด้านที่มีพื้นที่แผนที่ ขอบบนแถว r1 สิ้นสุดที่ y=0 ขอบซ้อนระหว่างส่วนจึงกว้าง 128 map px

native ที่คืนจริงมี 1254×1254, 1323×1189 และ 1189×1323 ตามสัดส่วน context ลงทะเบียนด้วย SIFT/RANSAC partial affine แล้วประกอบด้วย minimum-cost seam และ feather 8 output px ต่อด้าน ใช้การชดเชยสนามสีความถี่ต่ำตามสคริปต์เดิม รายละเอียดวิธีอยู่ใน `scripts/assemble.py` และ `registration.json`

ไฟล์ต้นแบบโซน 1 สอง worktree ตามใบงานเข้าถึงไม่ได้ในรอบนี้ จึงอ่านสำเนา README, scripts, prompts และ registration ที่รอบก่อนเก็บใน `reference/` ข้อมูล commit ต้นทางของสำเนาอยู่ใน `source-provenance.json`

input crop เก็บเป็นพิกัดและ hash ของ decoded RGB ใน `input-recipes.json` เพื่อลดขนาดแพ็ก สามารถสร้าง crop เดิมด้วย `scripts/cache_inputs.py` ซึ่งเพิ่มแคชประมาณ 14 MB ให้ใช้แคชเฉพาะระหว่างประกอบ และใช้ `scripts/package_review.py` คืนขนาดแพ็กก่อนส่ง สคริปต์ประกอบและวัดผลเป็นหลักฐานวิธีทำเดิม การตรวจรอบนี้ใช้ `scripts/verify.py`

## ผลวัดเดิมให้ Claude ตัดสิน

คัดค่าจาก `measurement-summary.json` ของรอบก่อน วัดคุณภาพ 1 รอบเดิม การทำต่อครั้งนี้วัดคุณภาพเพิ่ม 0 รอบ

| chunk | Laplacian เทียบ master | structure สูงสุดของจุดที่เชื่อถือได้ (px 1×) | จุดที่เชื่อถือได้ / ทั้งหมด | SIFT residual สูงสุด (px 1×) |
|---|---:|---:|---:|---:|
| r1-c1 | ×62.04 | 1.00 | 18/19 | 2.87 |
| r1-c2 | ×48.52 | 1.00 | 17/18 | 3.42 |
| r1-c3 | ×64.92 | 1.00 | 18/18 | 2.96 |
| r1-c4 | ×61.71 | 1.41 | 18/19 | 3.36 |

ความคมใช้ full chunk ตายตัวที่ 2.8 device px/world unit, Lanczos, grayscale Laplacian ksize=1 และ variance ค่าเปรียบเทียบนี้ขึ้นกับ contrast, รายละเอียดผิว น้ำ และพื้นที่ที่ลบพุ่มออกด้วย

structure ใช้ DoG template 49×49 ค้นหา ±16 map px เก็บจุดไม่มั่นใจ 3 จุดไว้ใน JSON ครบ ยังมีการตรวจรูปทรงลาน ขั้นบันได หน้าผา ตลิ่ง และ mask ของเหลวทั้งแนวค้างอยู่ `wholeStructureWithin4pxVerified` คงเป็น `false`

## ผลดูภาพและส่วนค้าง

รอบนี้เปิด seam sheet ทั้ง 4 ภาพและ object crop ของ r1-c2 พบลายพื้น/น้ำแข็งละเอียดและรูปแบบนรกน้ำแข็งเดิม ภาพ sheet ที่ตรวจยังไม่แสดงเส้นแบ่งสี่เหลี่ยมของ 4 ส่วนเด่นชัด การตัดสินแนวต่อภายในทั้งหมดให้ Claude ตรวจ lossless ที่ 100% ต่อ

วัตถุ `west-r1-c2-floor-shrub-01` ยังมีกิ่งที่ขอบหิมะใกล้เชิงบันได ตำแหน่งสำรวจ master `[1477,828,113,102]` คงรายการนี้ใน `pendingObjectIds` และ `removed.json` อีก 5 วัตถุมีผลสังเกตการลบจากรอบก่อนใน `objects-inventory.json` การทำต่อรอบนี้รักษาภาพที่วาดแล้วตามคำสั่งคัดลอกงานเดิม

ส่วนค้างให้ผู้ตรวจตัดสิน ได้แก่พุ่ม r1-c2, แนว structure ทั้งเส้น, จำนวนขั้นบันได, mask ของเหลว/เมฆ และความต่อเนื่องภายใน chunk ภาพ native พร้อม context และ affine ครบสำหรับตรวจและประกอบ ASSEMBLE รับช่วงการต่อขอบระหว่าง chunk

## ทดสอบและ self-check

รันจาก repo root โดยใช้ Python 3 และ Pillow

```sh
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/verify.py
```

ผลอยู่ใน `verification.json` ตรวจไฟล์ที่ต้องมี การ decode ภาพและ JSON ขนาดภาพตรง registration และภาพประกอบ 2048×2048 พร้อมขนาดแพ็ก ≤80,000,000 bytes ขนาดแพ็กประมาณ 79.23 MB

| เกณฑ์รับงาน | self-check |
|---|---|
| 1. ส่วนครบ ความคม ≥×10 และ structure ≤4 px | native 16 ส่วนและภาพ 2× 4 ภาพครบ ค่าความคมเดิม ×48.52–×64.92 จุด structure ที่เชื่อถือได้สูงสุด 1.41 px ยังรอตัดสินโครงสร้างทั้งแนว |
| 2. ภายใน chunk ไม่เห็นรอยต่อ ลบวัตถุที่เดินทับ พื้นต่อเนื่อง | มี seam sheet ครบและผลดูภาพข้างต้น การลบพุ่ม r1-c2 ยังค้างหนึ่งจุด เกณฑ์ข้อนี้ยังค้าง |
| 3. native และ registration ครบสำหรับ ASSEMBLE | มี native lossless ตาม export เดิม พร้อม affine/core/context ครบ 4 ส่วนต่อ chunk |

ไฟล์ที่เพิ่มในรอบนี้อยู่ใต้โฟลเดอร์ review นี้ทั้งหมด ผลตรวจในเกมยังค้างสำหรับขั้นตรวจรับภายหลัง
