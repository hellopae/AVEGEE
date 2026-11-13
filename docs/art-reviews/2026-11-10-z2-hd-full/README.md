# โซน 2 asia · HD-FULL ชุด 5/5

ส่ง `r4-c2 r4-c3 r4-c4 r4-c5` ครบ **8 native + 4 ภาพประกอบ 2×** แบบ WebP lossless ใช้ **ImageGen ในตัวเพิ่ม 5 ครั้ง** และคัดลอก native เดิม 3 ส่วนจาก run `20261113T050923Z-2099857a` แบบ byte-identical ไม่วาดซ้ำ ไม่มี generation ค้าง ผลนี้เป็นชุดส่งตรวจสำหรับ ASSEMBLE ยังไม่ได้ติดตั้งในเกมหรือรับรอง QA

| chunk | native q11 / q12 จริง | export 2× | Laplacian/master | โครงสร้างสูงสุด 1× เฉพาะจุดมั่นใจ | จุดมั่นใจ/ทั้งหมด |
|---|---|---|---:|---:|---:|
| r4-c2 | 1934×813 / 1935×813 (คัดลอกทั้งคู่) | 2048×410 | 137.79× | 0 px | 10/10 |
| r4-c3 | 1935×813 / 1935×813 (คัดลอก q11) | 2048×410 | 235.72× | 1 px | 16/16 |
| r4-c4 | 1935×813 / 1935×813 | 2048×410 | 161.57× | 1 px | 10/10 |
| r4-c5 | 1774×887 / 1663×946 | 1638×410 | 131.92× | 0 px | 9/9 |

**ไฟล์ที่เปลี่ยน:** เพิ่มเฉพาะโฟลเดอร์รายงานนี้ แต่ละ chunk มี `q11/q12-native.webp`, `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `registration.json`, `structure.json`, `sharpness.json`, `seams.json`, `removed.json`, `seam-check.jpg`, `structure-check.jpg` และ input เดิม 2 ส่วน ระดับ run มี prompt เต็ม, inventory, source hashes/provenance, หลักฐานคัดลอก, ผลวัด, summary และสคริปต์ 4 ไฟล์

## วิธีและพิกัดสำหรับ ASSEMBLE

master เป็น `img/map-zone2/v2/r*-c*.webp` ตาม `src/zone-skin.js`, `repairs:false` ไม่มี repair โซน 2 เพิ่ม แถว r4 สูงจริง205 px จึงแบ่ง **สองส่วน** core512×205; c5 แบ่ง410/409×205 พร้อม context64 px ต่อด้าน ยกเว้นขอบล่าง/ขวาของแผนที่ `parts.json` เก็บพิกัดครบ

พาธตัวอย่างโซน 1 ในใบงานไม่มีแล้ว จึงอ่านสคริปต์/README ต้นฉบับจาก git `bc9dc4dd` และ `0c544a3f` ใช้ SIFT/RANSAC partial affine, warp native ตรงไปกริด2×, ปรับสนามสี sigma35 map px/gain0.8 และ min-cost seam ใน overlap128 map px พร้อม feather8 output px ต่อด้าน ไม่มี sharpening หรือ local deformation

`registration.json` ระบุ **RectPx1x = [x0,y0,x1,y1] พิกัด master1× ปลายไม่รวม** มี affine native→context-local และ native→master, ขนาด native และ residual ทุกส่วน (สูงสุด2.992 px แต่ residual นี้ไม่ใช่การรับรองโครงสร้าง) `BORDER_REFLECT` เติมริม context เล็กน้อยหลัง affine ตามวิธีต้นแบบ และบันทึกสัดส่วนไว้ ขอบภายนอกระหว่าง chunk ยังไม่เบลนด์ ให้ ASSEMBLE ใช้ native+context ต่อเอง

## ผลตรวจเพื่อให้ Claude ตัดสิน

วัดครั้งเดียวต่อ chunk ตามนโยบายกันวนซ้ำ ความคมใช้ทั้ง chunk และสอง core ตายตัว: Lanczos ที่ซูมเดียวกัน **2.8 device px/world unit**, แปลงแกนด้วย4915/3840 และ3277/2560, grayscale Laplacian variance ksize1 ทุก chunk สูงกว่าเกณฑ์ตัวเลข10× แต่ค่าพลังงานขอบ/texture ไม่ใช่ความละเอียดที่มองเห็นเพิ่มตามจำนวนเท่านั้น

โครงสร้างใช้ source landmarks ตายตัว45จุด แยกจาก SIFT: DoG sigma1.5/6, patch49×49 ค้น±12 map px, confidence≥0.6 พบ45/45จุดมั่นใจ ระยะสูงสุด1 px เก็บผลทุกจุดใน `structure.json` **ยังไม่ยืนยันทุกเส้นขอบ จำนวนขั้น หรือทุก silhouette ว่า≤4 px** เพราะบันไดและพื้นหินมีลายซ้ำ

เปิดดู seam-check ทั้ง4 chunk และ compare บันได/ขอบขวาแล้ว ไม่พบเส้นแบ่งสี่เหลี่ยมเด่นในรอบนี้ แต่รอยแตก ใบไม้ และกลีบดอกวาดใหม่ต่างกันใกล้แนวต่อ ต้องให้ Claude ดู lossless เต็มขนาดเพื่อตัดสิน “ไม่เห็นรอยต่อ” โดยเฉพาะรอยต่อชิดราวทอง r4-c3 และต้นซากุระ r4-c5

`objects-inventory.json` เทียบ owner walkmask กับ `town-layout.js`/`town-asia-trees.js` และภาพจริง: r4-c2/c4/c5 ไม่มี owner-walk pixels ใน core; r4-c3 มี30,955px บนบันได (bounds global x2376–2539,y3072–3277) ไม่พบต้นไม้/กระดูก/หินขวางพื้นนี้ จึงไม่มีรายการลบ (`removedIds:[]`) คงป่า ภูเขา กระดูก และราวทองนอกพื้นเดินไว้ จุดเท้า runtime trees29จุดและของตกแต่งอื่นอยู่นอก context รอบนี้ ไม่แก้ sprite/collider ของเกม หมอกซ้าย r4-c2 คงเป็นฐานวาด **ยังไม่รับรอง audit silhouette ทุกใบครบ**

ข้อสังเกตต้องตัดสิน: รายละเอียด/ขอบกระดูกใน r4-c4/q11 และดอกไม้/พืชเล็กบางจุดต่างจาก master ที่เบลอ ผิวหิน รอยแตก ใบไม้ และดอกซากุระละเอียดขึ้นแต่เป็นการวาดใหม่ ต้องตัดสินว่าคงรูปทรงและเพิ่มเฉพาะรายละเอียดได้เพียงพอหรือไม่ ไม่วาดซ้ำเพื่อไล่ตัวเลข

## การตรวจที่รัน

- ตรวจ byte identity nativeเดิม3ไฟล์/inputเดิม8ไฟล์ และ hash masterเดิม4ไฟล์ตรงกัน (`reuse-verification.json`)
- `python3 -m py_compile` สคริปต์ทั้ง4ไฟล์ และ `python3 …/scripts/inventory.py`
- `python3 …/scripts/assemble.py r4-c2 r4-c3 r4-c4` แล้ว `python3 …/scripts/assemble.py r4-c5` — แต่ละ chunk ประกอบ/วัดครั้งเดียว
- `python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/verify.py` — ตรวจเฉพาะไฟล์ครบ, JSON/ภาพเปิดได้, ขนาดตรง ผลอยู่ใน `verification.json`; ไม่มี assertion คะแนนหรือคุณภาพ

ชุดส่งประมาณ **36.2 MB จากงบ80 MB** จำนวน byte ใน `verification.json` ไม่รวมตัวรายงานนั้น ไม่รันทดสอบเกมเพราะไม่ได้แก้ runtime ไม่มี Shado, CLI generation, agent อื่น, deploy หรือ git commit/push/merge และใช้ worktree/branch ที่ได้รับเท่านั้น

## Self-check เกณฑ์รับงาน

1. **ครบส่วน/ความคม/โครงสร้าง:** ครบ8ส่วน, ความคม131.92–235.72×; จุดตรวจ45จุดสูงสุด1 px แต่ทุกเส้นขอบยังรอ Claude ตัดสิน
2. **รอยต่อ/ลบวัตถุ:** มี min-cost seam และภาพตรวจครบ4 chunk; ไม่พบวัตถุบน owner stair floor จึงไม่ลบป่านอกทางเดิน ยังรอ Claude ตัดสินรอยต่อและ audit silhouette
3. **native+registration:** ครบ8 lossless native และ affine/core/context พร้อมผล2×ครบ4 chunk ไม่มีส่วนวาดค้าง งานต่อคือ review และ ASSEMBLE ขอบภายนอก
