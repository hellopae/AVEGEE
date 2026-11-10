# Z1-V5-HD-FULL · ชุด 7/8 · r2-c5, r3-c5

เพิ่มเฉพาะชุดภาพ review นี้บน worktree/branch ที่ได้รับ ใช้ **ImageGen ในตัว 9 ครั้ง**: 8 ส่วน + วาดแก้ `r2-c5/q12` 1 ครั้ง (ครั้งแรกเปลี่ยนหินเป็นไม้จึงไม่เลือก) ไม่ใช้ Shado หรือ API/CLI generation ไม่แก้ runtime และไม่ได้ผูกภาพเข้าเกม

## ไฟล์ส่ง

- [r2-c5 เทียบ v5 | ใหม่](r2-c5/r2-c5-compare.jpg) · [พื้น 2×](r2-c5/r2-c5-2x.webp)
- [r3-c5 เทียบ v5 | ใหม่](r3-c5/r3-c5-compare.jpg) · [พื้น 2×](r3-c5/r3-c5-2x.webp)
- แต่ละ chunk มี `q11..q22-native.webp`, `registration.json`, `structure.json`, `removed.json`, `sharpness.json`, `seam-check.jpg`, `structure-check.jpg` และ input สำหรับประกอบซ้ำ
- [run-summary.json](run-summary.json), [verification.json](verification.json), [prompt เต็มทุกครั้ง](generation-prompts.json), [แหล่งข้อมูลและ hash](source-provenance.json)

core แบ่ง 410/409×512 ตามความกว้างจริง 819 px มี context 64 px ต่อด้าน ยกเว้นขอบขวาของแผนที่: ส่วนซ้าย context 538×640, ส่วนขวา 473×640 พิกัด global master `[x,y,width,height]` และ affine จาก native ไป master อยู่ใน registration; เก็บขอบซ้อนครบและ **ยังไม่เบลนด์กับ chunk เพื่อนบ้าน**

ImageGen คืนจริง **1149×1368** สำหรับ q11/q21 และ **1078×1460** สำหรับ q12/q22 ทั้งสอง chunk (ไม่ใช่ 1254 px ตามที่คาดในใบงาน) native เก็บ lossless และตรวจพิกเซลเท่ากับ PNG เดิมทุกส่วน ผลประกอบแต่ละ chunk **1638×2048**

## วิธีและผลตรวจ

ดัดแปลงวิธีจากต้นแบบ plaza: SIFT/RANSAC partial affine → warp จาก native ตรงสู่กริด 2× → ปรับสนามสี sigma35 map px → min-cost color seam และ feather 8 output px ต่อด้าน ไม่มี local deformation หรือ sharpening ขยายพื้นที่ยกเว้นการปรับสีรอบวัตถุที่ลบ เพื่อไม่ให้เงาเดิมกลับมา ฐานมาจาก master v5 + repairs; repairs ไม่ตัดกับ context สอง chunk นี้

| chunk | Laplacian ใหม่/v5 ที่ซูมเกม | จุดโครงสร้างมั่นใจ | ระยะสูงสุด 1× |
|---|---:|---:|---:|
| r2-c5 | 49.00× | 15/16 | 1.414 px |
| r3-c5 | 40.58× | 13/14 | 1.000 px |

วัดทั้ง chunk ด้วย crop ตายตัว ซูม 2.8 device px/world unit เหมือนกัน แยกอัตราแกน x/y มีผลราย core ใน sharpness.json ตัวเลขเป็นพลังงานขอบ/texture ไม่ใช่ความละเอียดการมองเห็นเพิ่ม 49 เท่า โครงสร้างตรวจด้วย patch DoG 49×49 ค้นหา ±16 px แยกจาก SIFT; เก็บจุดไม่มั่นใจครบ ไม่รับรองทุก contour จากจุดตัวอย่าง

ตรวจ seam sheet หลังประกอบรอบสุดท้ายแล้วไม่พบเส้นแบ่งสี่เหลี่ยมเด่น ลายรอยแตก/คลื่น/ใบไม้จากคนละ generation อาจต่างใกล้แนวต่อ ไม่มีภาพทดสอบในเกม

## วัตถุและข้อที่ยังค้าง

ลบราว/เสาสะพานโดยคง deck และบันได ลบต้นไม้ดอกชมพูข้างทางใน r2-c5 และพุ่ม/ก้อนหินหน้าทางใน r3-c5 บางรายการ ป่าไกลและหน้าผาต่อเนื่องคงไว้ **ยังไม่ยืนยันการลบครบทุก ID**: inventory เป็น bbox สำรวจ overview บางกรอบไม่ตรงต้นไม้/หินที่ระบุในภาพ v5 รายการที่ยืนยันได้และที่ยังต้องตรวจอยู่ใน removed.json และ pendingObjectIds ของ run-summary

หมอก `lump-09/10` ถูกวาดเป็นหุบ/หน้าผาต่อเนื่อง; `lump-07/08` อยู่บนพื้นหินที่ไม่เห็นหมอกใน source จึงคงพื้นไว้ `lump-06` เป็นลานหินที่ต้องเก็บ ไม่ลบ ของเหลวฟ้า/ม่วงยังเป็นฐาน แต่พื้นที่เดิมถูกหมอกบังต้องตรวจ mask กับภาพประกอบรวมอีกครั้ง

## ทดสอบและ self-check

รันจาก repo root ด้วย Python3 + Pillow/numpy/OpenCV:

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
```

ตรวจ decode ภาพทุกไฟล์, core coverage ครบไม่ซ้ำ, native เท่าพิกเซลเดิม, affine/ขนาดผลส่ง, Laplacian ≥10×, จุดโครงสร้างมั่นใจ ≤4 px, จำนวน generation ≤10 และขนาดรวม ≤60,000,000 bytes ผลจริงอยู่ใน run-summary ไม่รัน app tests เพราะไม่มีการแก้ runtime **ไม่ได้ประกาศ QA ผ่าน**

| เกณฑ์ | self-check |
|---|---|
| 1. ครบทุกส่วน ความคม ≥10× โครงสร้าง ≤4 px | ครบ 8 ส่วนและถึงเกณฑ์ความคม; จุดมั่นใจอยู่ใน 4 px แต่ยังไม่ยืนยันทุก contour |
| 2. ไม่มีรอยต่อ ลบวัตถุครบ พื้นต่อเนื่อง | ไม่เห็น seam สี่เหลี่ยมเด่นในภาพที่ตรวจ; การลบทุก ID ยังไม่ปิดเพราะ survey ไม่ตรงภาพบางจุด |
| 3. native + registration สำหรับประกอบรวม | ครบทั้ง 8 ส่วน มี core/context และ native→master affine; ขอบเพื่อนบ้านยังไม่ประกอบ |

`prepare.py`/`prompts.py` เป็นบันทึก preprocessing ที่รันก่อน generation เท่านั้น ไม่ต้องรันซ้ำบนชุดส่งเพราะจะตั้ง manifest ใหม่ `archive.py` ใช้กู้ native ที่ขาดจาก path ImageGen เดิมเท่านั้น งานประกอบซ้ำใช้ native/input ภายในชุดนี้
