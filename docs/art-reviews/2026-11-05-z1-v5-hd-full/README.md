# Z1-V5-HD-FULL · ชุด 6/8

เพิ่มเฉพาะงาน review ของ **r3-c1 และ r1-c5** ใน worktree/branch ที่ได้รับ ไม่แก้ runtime หรือภาพเดิม และยังไม่ผูกเข้าเกม ใช้ **ImageGen ในตัว 10 ครั้ง**: 8 ส่วนแรก + แก้ r3-c1/q21 อีก 2 ครั้ง ไม่มี Shado หรือ API/CLI generation

| chunk | ผลประกอบ | Laplacian เทียบ v5 | จุดโครงสร้างที่มั่นใจ | เลื่อนสูงสุด |
|---|---|---:|---:|---:|
| r3-c1 | [2048×2048](r3-c1/r3-c1-2x.webp) | 17.14× | 17/18 | 1 px (1×) |
| r1-c5 | [1638×2048](r1-c5/r1-c5-2x.webp) | 31.26× | 20/20 | 1 px (1×) |

## เปิดตรวจ

- ภาพก่อน–หลังที่ **2.8 device px/world unit**: [r3-c1](r3-c1/r3-c1-compare.jpg), [r1-c5](r1-c5/r1-c5-compare.jpg) เปิด 100% เพื่อเทียบสเกลเกม
- รอยต่อพร้อมแนว seam สีฟ้าในภาพแยก: [r3-c1](r3-c1/seam-check.jpg), [r1-c5](r1-c5/seam-check.jpg)
- [crop หมอก/ต้นไม้/รูปคล้ายตอไม้](review-closeups.jpg), [บันทึกตรวจภาพ](visual-review.json), [สรุป run](run-summary.json), [ผลตรวจไฟล์](verification.json)
- ทุก chunk มี `q11..q22-native.webp`, `registration.json`, `structure.json`, `removed.json`, `sharpness.json`, `structure-check.jpg` และ `removed-check.jpg`

## วิธีและขนาดจริง

ใช้ crop จาก master lossless ของรอบนำร่อง ซึ่งรวม repairs แล้ว ไม่มี repair ตาม `src/town-terrain-repair.js` ตัดกับสอง chunk หรือขอบซ้อนนี้ แบ่ง core 512×512; c5 แบ่งกว้าง **410 + 409** รวม 819 px ขยายขอบ 64 px ต่อด้าน ตัดเฉพาะที่ชนขอบแผนที่ ดังนั้นส่วนที่มีขนาดต่างกันเป็นภาพสี่เหลี่ยมผืนผ้าจริง ไม่มี padding

ImageGen คืนจริง r3-c1: q11/q21 **1189×1323**, q12/q22 **1254×1254**; r1-c5: **1212×1298, 1136×1385, 1149×1368, 1078×1460** ตามลำดับ q11,q12,q21,q22 เก็บพิกเซล native ด้วย WebP lossless ไม่ resample ตัว native ขนาด 2× เป็นกริดประกอบ ไม่ได้อ้างว่าเป็นขนาดวาดจริงทุกส่วน

ใช้ SIFT + RANSAC partial affine แบบต้นแบบ แล้ว warp จาก native ตรงไปกริด 2× ปรับสนามสี Gaussian sigma 35 map px และ min-cost seam ใน overlap 128 map px พร้อม feather 8 output px ต่อด้าน ต่างจากต้นแบบเฉพาะไม่นำบริเวณวัตถุ/หมอกที่ลบมาใช้คำนวณสนามสี เพื่อไม่ให้สีใบไม้แดงหรือหมอกเดิมย้อนกลับ ไม่มี sharpening, optical flow, local deformation, DOF หรือ parallax

`registration.json` เก็บ core/context เป็นพิกัด **global map 1× [x,y,width,height]** และ `nativeToContextPx1x` ใช้กับ native โดยตรง ก่อนบวก origin ของ context ส่วน `affine` ใช้กับ native ที่ resize เป็นขนาด context แล้ว เก็บ native พร้อมขอบซ้อนครบสำหรับ Z1-V5-HD-ASSEMBLE; ยังไม่เชื่อมขอบ chunk กับเพื่อนบ้าน

## ข้อค้นพบและสิ่งที่ยังไม่ยืนยัน

ลบ `lump-13` และเติมหน้าผาแล้ว; คงลานหินซีด `lump-03`/`lump-06` และฐานแม่น้ำม่วง น้ำฟ้า น้ำตก ทะเลเมฆและฉากไกลไว้ ลบต้นไม้ `west-tree-16` สำเร็จในครั้งที่ 10 พร้อมพื้นต่อเนื่อง ต้นฉบับและผลสุดท้ายอยู่ใน crop เทียบ

`removed.json` แยก ID ที่เห็นการลบจริงกับกรอบสำรวจที่ไม่มีวัตถุให้ระบุชัด: `west-bed-10` อยู่บนแม่น้ำ ส่วน `ice-tree-06/07` ครอบทางเดิน/หน้าผาช่วงล่าง จึงไม่อ้างว่าได้ลบต้นไม้ตาม ID เหล่านี้แล้ว `south-rock-00` ตัดเพียงขอบซ้อนนอก core และยังไม่ยืนยัน รูปคล้ายตอไม้สองรูปที่ขอบลานน้ำแข็งมีใน v5 เดิมและคงไว้ ไม่ใช่วัตถุเพิ่มจากการวาดครั้งนี้ ยังต้องทวน mapping ของ inventory

ตรวจภาพ seam sheet แล้วไม่พบเส้นแบ่งสี่เหลี่ยมชัดในภาพที่ดู แต่รอยแตกย่อยอาจต่างใกล้ seam ค่า structure ใช้ fixed landmark template 49×49, DoG sigma 1.5/6, ค้นหา ±12 px และ correlation ≥0.6 แยกจาก SIFT residual จุดที่มั่นใจอยู่ใน 1 px; จุดไม่มั่นใจยังเก็บใน JSON ผลนี้ **ไม่ยืนยันทุก contour/จำนวนขั้นบันได/ขอบ mask animation**

Laplacian วัดทั้ง chunk หลัง Lanczos ที่ซูมเกมเท่ากัน เกินเกณฑ์ ×10 ทั้งคู่ ตัวเลขสะท้อน texture/contrast energy ไม่ใช่ความละเอียดหรือคุณภาพเพิ่มตามจำนวนเท่า ไม่ประกาศ QA ผ่าน และไม่มีผลทดสอบในเกม

## การตรวจซ้ำและ self-check

รันจาก repo root ด้วย Python 3 + Pillow/numpy/OpenCV โดยไม่เรียก ImageGen:

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/review_sheet.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
```

`prepare.py` ใช้เตรียมก่อนวาดเท่านั้นและป้องกันการเขียนทับประวัติ generation; prompt/reference/ผลแต่ละครั้งอยู่ใน `generation-prompts.json` ไฟล์ native ที่เลือกและ reference ของการแก้ครั้งสุดท้ายเก็บในชุดนี้

1. **ครบ 8 ส่วนและความคม ≥×10:** ตรวจครบ; structure จุดที่มั่นใจ ≤4 px แต่ยังไม่ปิดการยืนยันโครงสร้างทุกเส้น
2. **รอยต่อและการลบวัตถุ:** ตรวจ seam ด้วยตาและลบหมอก/ต้นไม้ที่ระบุข้างต้นแล้ว; mapping inventory บาง ID ยังต้องทวน จึงไม่ปิดข้อนี้ทั้งหมด
3. **native + registration สำหรับประกอบ:** ครบ 8 ไฟล์และ affine/core/context; ตรวจ pixel-exact lossless กับ PNG ที่เครื่องมือคืน และบันทึกขนาดจริงครบ

สคริปต์ตรวจ decode ภาพทุกไฟล์, dimensions, ขอบซ้อน, affine, generation ≤10, sharpness, structure diagnostics, ขนาดรวม ≤60,000,000 bytes และขอบเขตการแก้ไฟล์ ไม่รันชุดทดสอบแอปเพราะไม่มีการแก้ runtime ไม่สร้าง/สลับ branch หรือ worktree และไม่ commit/push/merge/deploy
