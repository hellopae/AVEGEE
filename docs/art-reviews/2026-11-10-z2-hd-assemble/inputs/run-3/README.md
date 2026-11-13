# โซน 2 asia · HD-FULL ชุด 3/5

วาดด้วย **ImageGen ในตัว 16 ครั้ง** ครบ `r2-c4 r2-c5 r3-c1 r3-c2` จำนวน 16 ส่วน ไม่มี generation ค้าง ผลนี้เป็นชุดส่งตรวจและเตรียม ASSEMBLE ยังไม่ได้ติดตั้งในเกม และยังไม่ใช่การรับรองคุณภาพ

แก้เฉพาะโฟลเดอร์นี้ ใช้ branch/worktree ที่ได้รับ ไม่มีการเปลี่ยน `src/`, `tests/`, `img/` หรือ commit/push/merge/deploy

| chunk | native q11 / q12 / q21 / q22 | export 2× | Laplacian เทียบ master | โครงสร้างสูงสุด 1× เฉพาะจุดมั่นใจ | จุดมั่นใจ/ทั้งหมด |
|---|---|---|---:|---:|---:|
| r2-c4 | 1254² ทุกส่วน | 2048×2048 | 86.21× | 1 px | 13/20 |
| r2-c5 | 1149×1368 / 1078×1460 / 1149×1368 / 1078×1460 | 1638×2048 | 116.85× | 1 px | 15/16 |
| r3-c1 | 1189×1323 / 1254² / 1189×1323 / 1254² | 2048×2048 | 69.32× | 1 px | 15/16 |
| r3-c2 | 1254² ทุกส่วน | 2048×2048 | 84.28× | 2 px | 16/16 |

ตัวเลขวัดครั้งเดียวต่อ chunk ไม่วาดซ้ำหรือเปลี่ยนเกณฑ์เพื่อไล่ตัวเลข ผลรายจุดรวมจุดที่ไม่มั่นใจอยู่ใน `structure.json`; ผลความคมทั้ง chunk และสี่ quadrant อยู่ใน `sharpness.json`

## ไฟล์และวิธีประกอบ

แต่ละ chunk มี `q11..q22-native.webp` และ `<chunk>-2x.webp` แบบ **lossless**, `registration.json`, `structure.json`, `removed.json`, `sharpness.json`, `seams.json`, `<chunk>-compare.jpg`, `seam-check.jpg`, `structure-check.jpg`, `walkmask-inventory.jpg` และ `inputs/tiles.json`

อ่าน master 1× จาก `img/map-zone2/v2/r*-c*.webp` ตาม `src/zone-skin.js`; `repairs:false` และไม่มี repair โซน 2 เพิ่ม ภาพน้ำ/ลาวา/น้ำตก/หมอกคงเป็นฐานวาด ไม่ทำภาพโปร่งใส

core 512×512; c5 แบ่ง 410/409×512 แต่ละส่วนมี context 64 px ต่อด้าน ยกเว้นด้านนอกขอบแผนที่ จึงไม่บังคับ native ให้สี่เหลี่ยมจัตุรัส รายละเอียดไม่เท่ากับ native 2048 ต่อ core: สัดส่วนจริงคำนวณจาก native/context ใน registration ได้

อ้างวิธีโซน 1 จาก git `bc9dc4dd` และ `0c544a3f` เพราะพาธ worktree ตัวอย่างในใบงานไม่มีอยู่แล้ว ใช้ SIFT + RANSAC partial affine, warp native ไปกริด 2× โดยตรง, ปรับสนามสีความถี่ต่ำ sigma35/gain0.8 โดยกันบริเวณลบวัตถุ, min-cost seam ใน overlap128 map px และ feather8 output px ไม่มี sharpening, DOF, dense flow หรือ local deformation

`registration.json` ระบุ rect เป็น **[x,y,width,height] พิกัด master 1×** และ affine **native pixels → context/master 1×** จึงใช้ต่อขอบภายนอกได้ ไม่ได้เบลนด์กับ chunk เพื่อนบ้านใน run นี้ `seams.json` เก็บเส้นต่อจริงก่อน crop พร้อม offset; ภาพสีฟ้าใน seam-check เป็นตำแหน่งเดียวกัน

## การวัดและข้อที่ต้องตัดสิน

ความคม: grayscale Laplacian variance ksize1 หลัง Lanczos ที่ซูมเท่ากัน **2.8 device px/world unit** ใช้ 4915/3840 และ 3277/2560 แยกแกน ค่า primary ใช้ทั้ง chunk ไม่เลือกเฉพาะ crop ที่ดีที่สุด เกิน 10× ทุก chunk แต่ edge energy ไม่ใช่คะแนนความงาม/ความละเอียดเพิ่มตามอัตรานั้น

โครงสร้าง: เลือกจุดตลิ่ง หิน หน้าผา พื้นสะพาน และบันไดจาก baseline ล่วงหน้า ใช้ template49×49 แบบ DoG sigma1.5/6 ค้น ±12 map px, confidence≥0.6 แยกจาก SIFT ผล 59/68 จุดมั่นใจ สูงสุด2 px อีก9จุดไม่มั่นใจ เก็บไว้ครบ **ยังไม่ยืนยันทุกเส้นขอบ จำนวนขั้น หรือรูปร่างทั้งหมดว่า ≤4 px**

ตรวจภาพรวมและแถบแนวต่อของทั้งสี่ chunk แล้ว ไม่พบเส้นแบ่งสี่เหลี่ยมเด่นในรอบดูนี้ แต่ลายใบไม้/รอยแตก/คลื่นใกล้แนวต่ออาจต่างกัน ต้องให้ Claude ดู lossless เต็มขนาดเพื่อตัดสินเกณฑ์ “ไม่เห็นรอยต่อ” รอยต่อภายนอกเป็นงาน ASSEMBLE

`objects-inventory.json` เทียบ `town-layout`, `town-asia-trees` และ owner walkmask จริง (แดงใน walkmask-inventory; เหลืองคือ survey บริเวณลบ) แยก runtime sprite ออกจากวัตถุฝังในภาพ ไม่ลบป่าตามกรอบ sprite อัตโนมัติ r2-c4/r2-c5 สั่งลบเฉพาะพุ่มที่ยื่นบนพื้นเดิน ภาพประกอบมีพื้นภายในต่อเนื่อง แต่คงใบไม้ชิดหน้าผา จึง **ยังไม่รับรองลบวัตถุครบทุก silhouette** และไม่เติม `removedIdsVerified` เป็นการรับรอง r3-c1/r3-c2 ส่วนป่าด้านล่างอยู่นอก owner walkmask จึงคงต้นไม้และกระดูกเดิมไว้

ข้อสังเกตเพิ่ม: ImageGen วาดลายคลื่นใหม่และเพิ่มใบไม้เล็กบนผิวน้ำ `r3-c2/q11`; รายละเอียดพืช/ดอกเล็กและผิวเสาบางส่วนต่างจาก master แม้จุดตรวจหลักใกล้ตำแหน่งเดิม ต้องให้ Claude ตัดสินว่ารับได้ตามข้อ “เพิ่มแค่รายละเอียด” หรือไม่ ไม่วาดซ้ำใน run นี้

## ตรวจไฟล์และทำซ้ำ

คำสั่งแต่ละขั้น (รันจาก repo root เมื่อต้องสร้างข้อมูลกลับ ไม่ต้องรันการวัดซ้ำเพื่อรับงาน):

```sh
python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/prepare.py
python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/verify.py
```

`prepare.py` ใช้สร้าง input ที่ตัดออกจากชุดส่งเพื่อคุมขนาดกลับจาก master ตาม hash ใน `source-provenance.json` และพิกัด `inputs/tiles.json` โดยเก็บ generation manifest เดิมเมื่อมีอยู่แล้ว หลังสร้างข้อมูลกลับ input WebP จะเพิ่มขนาดชั่วคราว ต้องนำไฟล์ที่สร้างกลับ `*/inputs/*-master.webp` และ `*/inputs/master.webp` ออกก่อนตรวจงบชุดส่ง 80 MB เช่นเดียวกับชุดที่ส่งนี้ โดยคง `inputs/tiles.json` ไว้ ไม่มีการเรียก ImageGen ในสคริปต์ใด `archive.py` ใช้แปลง output ของเครื่องมือเป็น lossless native เท่านั้น

การตรวจอัตโนมัติ `verify.py` จำกัดที่ไฟล์ครบ เปิดได้ และขนาดตรงเท่านั้น ไม่มี assertion เรื่องคะแนนความคม โครงสร้าง หรือความงาม ไม่ต้องรันการวัดซ้ำเพื่อให้ผ่านตัวเลข ภาพ compare เป็นสาม crop คงที่ที่ซูมเกม; JPEG อื่นบีบอัดเพื่อคุมงบ ข้อมูลภาพหลักทั้งหมดอยู่ใน lossless

ผลรันและรายการภาพอยู่ใน `verification.json`; ผลวัด/งานค้างอยู่ใน `run-summary.json` การตรวจนี้เป็น offline artifact check ไม่มีการทดสอบเดินในเกมหรือรับรอง QA

## Self-check เกณฑ์รับงาน

1. **ครบส่วน/ความคม/โครงสร้าง:** วาดครบ16ส่วน, ความคม69.32–116.85×; โครงสร้างจุดมั่นใจ≤2 px แต่มี9จุดไม่มั่นใจและยังไม่รับรองทุกเส้น — รอ Claude ตัดสิน
2. **รอยต่อ/ลบวัตถุ:** มี min-cost seam และภาพตรวจครบ; ลบเฉพาะพุ่มบน owner floor คงพืชขอบหน้าผา/ป่าที่เดินไม่ถึง — ยังรอการตัดสินรอยต่อและการลบครบจาก Claude
3. **native+registration สำหรับ ASSEMBLE:** ครบ16 lossless native, affine, core/context และผล2×ครบ4 chunk; ไม่ประกอบขอบภายนอกใน run นี้

ขอบเขตเพิ่มเติม: ImageGen16/16ครั้ง, ขนาดชุดส่งต่ำกว่า80 MB (ดูผลจำนวน byte จริงใน verification), ไม่มีการแก้ไฟล์เกมหรือส่งขึ้น main
