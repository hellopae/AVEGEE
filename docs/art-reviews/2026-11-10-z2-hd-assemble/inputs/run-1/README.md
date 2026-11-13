# Z234-HD-FULL — โซน 2 asia ชุด 1/5

ส่งเป็น **ชุด review ที่ยังค้างงานคุณภาพ** ไม่ใช่ชุดอนุมัติสำหรับนำเข้าเกม ใช้ ImageGen ในตัว 16 ครั้ง ไม่มี retry; ส่ง native ครบ 16 ส่วน และภาพประกอบ 2× ครบ 4 chunk แต่พบสิ่งก่อสร้างที่โมเดลเพิ่มเอง และจุดโครงสร้างเกินเกณฑ์ จึงต้องให้ Claude ตัดสินและจัดงานแก้ต่อ รายละเอียดอยู่ใน `visual-review.json` และ `run-summary.json` ไม่ได้อ้าง QA ผ่าน

## ขอบเขตและวิธี

- ต้นฉบับที่เกมโหลดจริง: `img/map-zone2/v2/r*-c*.webp`, master 4915×3277; `src/zone-skin.js` กำหนด `repairs:false` จึงไม่ bake repairs โซน 1 ทับโซนนี้
- ทำเฉพาะ r1-c1, r1-c2, r1-c3, r1-c4; 1 chunk แบ่ง core 512×512 จำนวน 2×2 ส่วน พร้อม context ข้างละ 64 px ตัดที่ขอบ master เท่านั้น รวมถึง context ด้านล่างจาก r2 และด้านขวาจากเพื่อนบ้าน
- อ่านใบงานโซน 1 ตาม path ที่ brief ระบุแล้ว ส่วน worktree ตัวอย่างเก่าหายไป จึงอ่านไฟล์เดียวกันจาก git history แบบ read-only: plaza `bc9dc4dd`, HD-FULL `d54fac28` ใช้ SIFT/partial-affine, broad-light correction และ min-cost seam จากสคริปต์ HD-FULL เดิม ปรับพิกัด Asia และขอบซ้ายของ c1
- เก็บสไตล์นรกจีน/ญี่ปุ่น หินฟ้าเทา เมเปิลแดง สน ซากกระดูกที่เข้าถึงไม่ได้ ลาวา น้ำฟ้า และทะเลหมอกเป็นฐานใน prompt ทั้งหมด ข้อผิดพลาดที่ยังพบระบุแยกด้านล่าง
- `objects-inventory.json` เทียบ owner walkmask 480×320 cell=8 world units กับ `town-layout.js` / `town-asia-trees.js`; รวม runtime props/houses/stations ที่อ่านจากโมดูลจริง และพื้นที่พืชรุกทางเดิน 11 กลุ่ม วัตถุ runtime ไม่ใช่วัตถุที่ต้องลบจากภาพพื้นตาม bounding box ของ sprite
- Native เก็บขนาดที่ ImageGen คืนจริง ไม่มีการ resize ก่อนเก็บ: q11 ของ c1 และส่วนล่างส่วนใหญ่ 1254×1254, ส่วนบนอื่น 1323×1189, c1/q21 1189×1323 ไม่มีการขยายปลอมให้เป็น native 2×
- Warp native ตรงไปพิกัด 2× ด้วย Lanczos4; affine ต่อส่วน, core/context/master พิกัด 1×, ค่า inlier และ coverage อยู่ใน `registration.json` บันทึก low-frequency correction ด้วย ไม่ได้ใช้ sharpening หรือ local shape warp
- Min-cost seam ใน overlap 256 output px, feather ±8 output px; เก็บเส้นทางใน `seams.json` ยังไม่ต่อขอบข้าม chunk
- ภาพ native, inputs และภาพประกอบ 2048×2048 เป็น lossless WebP VP8L ทั้งหมด `*-compare.jpg` คงขนาดเทียบที่ซูมเกม 2.8 device px/world unit; JPEG ลดคุณภาพเพื่อคุมเพดาน 80 MB เท่านั้น ให้ตัดสินรายละเอียดจาก lossless WebP คู่กับ inputs ไม่ใช้ JPEG เป็นแหล่งวัด

## ผลวัดครั้งเดียว — ให้ Claude ตัดสิน

| chunk | Laplacian ratio | structure max ที่เชื่อมโยงได้ (1× px) | จุดเชื่อมโยงได้/ทั้งหมด | สิ่งที่ยังค้าง |
|---|---:|---:|---:|---|
| r1-c1 | ×67.6996 | 0.0000 | 8/12 | ตรวจ contour / จำนวนขั้น และยืนยัน inventory |
| r1-c2 | ×35.5399 | 4.4721 | 10/11 | q11 เพิ่มสะพาน/บันได, q12 เพิ่มราว/บันไดบนลาน ต้องแก้ก่อน ASSEMBLE |
| r1-c3 | ×46.9247 | 1.4142 | 11/12 | q11 เพิ่มขั้นซ้ายบน, q12 ขอบลานหนาขึ้น, q21 เปลี่ยนวัตถุสีซีดเป็นต้นชมพู ต้องแก้ |
| r1-c4 | ×36.5846 | 12.0000 | 10/12 | ตรวจสะพาน/ขั้นทางเชื่อมที่เปลี่ยน และ probe ชนขอบหน้าต่างค้นหา ต้องแก้ |

ความคม: decoded RGB ของ source และ output resize ด้วย Pillow Lanczos ไปซูมเดียวกัน จากนั้น grayscale Laplacian variance ksize=1 เทียบทั้ง chunk; ค่าแยก panorama/terrain อยู่ใน `sharpness.json` texture และ contrast มีผลต่อ ratio ไม่ใช่ตัวคูณ resolution

โครงสร้าง: จุด landmark กำหนดจาก source ก่อนดู alignment ใช้ DoG sigma1.5/6 template 49×49 ค้นหา ±12 px ในภาพประกอบที่ลดกลับ 1×; confidence ≥0.6 และไม่ทับ removal box จึงนับเป็นจุดเชื่อมโยงได้ เก็บจุดไม่แน่นอนทั้งหมดด้วย ค่า 12 px อาจชนขอบ search ไม่ใช่เพดานความคลาดเคลื่อนจริง ค่า affine/SIFT ต่ำและ probe ภายในเกณฑ์ไม่รับรองรูปทรงทุกจุด ตัวอย่างชัดคือ c2 ซึ่งเพิ่มสะพานทั้งที่ SIFT ยัง match ภูเขาเดิมจำนวนมาก **ทุก chunk ยังตั้ง `wholeStructureWithin4pxVerified:false`**

รอยต่อ: ตรวจ `seam-check.jpg` ทั้งสี่และแถบขอบ 2× แล้ว ไม่พบเส้นตรงแข็งชัดใน overview ของ c1/c4 แต่ texture พื้นข้าม quadrant ต่างกันได้ และ c2/c3 มีข้อผิดรูปตามข้างต้น ยังไม่รับรองว่าไร้รอยภายในทุก chunk วัตถุที่เดินทับ: พืชรุกพื้นบางส่วนลดลง แต่พืชขอบพื้นยังเหลือ และ c3 มีต้นชมพูเพิ่ม จึงยังไม่ยืนยันลบครบ `removed.json` เป็นรายการที่สั่งลบพร้อม `removalVerified:false` ไม่ใช่หลักฐานว่าลบสำเร็จครบแล้ว

## ตรวจรับทีละข้อ

1. **ทุกส่วนครบ / sharpness ≥×10 / structure ≤4 px:** ไฟล์ครบ 16 native + 4 output, ratio ทุก chunk เกิน ×10 ตามวิธีข้างต้น แต่ c2/c4 มี probe >4 px และ c2/c3 มีการเปลี่ยนโครงสร้างเชิงความหมาย จึงยังไม่ครบเกณฑ์ข้อ 1
2. **ไม่เห็นรอยภายใน / ลบวัตถุเดินทับ พื้นต่อเนื่อง:** มี min-cost seam และภาพตรวจครบ แต่ยังไม่รับรองความไร้รอยและการลบวัตถุครบ ข้อ 2 ยังต้องตรวจ/แก้
3. **native + registration สำหรับ ASSEMBLE:** ไฟล์และ affine ครบทุกส่วนพร้อม core/context 1× และ original native sizes; ใช้เป็นหลักฐาน/วัตถุดิบตรวจได้ แต่ c2–c4 ยังมีรายการแก้ก่อนนำประกอบ production
4. **ขอบเขต run:** ImageGen 16/16 ครั้ง, 4 chunk, WebP lossless; ไม่แก้ src/tests/img, hooks, status.json หรือ worklog.json ไม่ commit/push/merge/switch branch และไม่ได้ทดสอบในเกม

## ไฟล์และคำสั่ง

แต่ละ chunk มี `q11..q22-native.webp`, `inputs/`, `registration.json`, `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `structure.json`, `structure-check.jpg`, `removed.json`, `sharpness.json`, `seams.json`, `seam-check.jpg` ส่วนกลางมี prompts/provenance/inventory/visual-review/run-summary และผลตรวจ integrity

รันจาก repo root (Python: Pillow, OpenCV, NumPy; prepare ใช้ Node อ่านโมดูล layout):

```sh
python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/prepare.py
# archive.py รับ JSON ที่มี path ผล ImageGen ในเครื่อง; ไม่เรียก API
python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/assemble.py r1-c1 r1-c2 r1-c3 r1-c4
python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/report.py
python3 docs/art-reviews/2026-11-10-z2-hd-full/scripts/verify.py
```

ที่รันจริง: prepare 1 ครั้ง; archive เมื่อผลทยอยเสร็จ (lossless roundtrip เทียบ decoded RGB); assemble แต่ละ chunk ครั้งเดียว; report รวบรวมค่าที่วัดไว้โดยไม่วัดซ้ำ; verify ตรวจไฟล์ครบ/เปิดได้/ขนาด/VP8L/decoded native hash/ขนาดแพ็กเท่านั้น ผลอยู่ `verification.json` ไม่มี automatic quality gate และไม่มี generation retry เพื่อไล่ตัวเลข

ผล integrity ที่รันจริง: ภาพ 49 ไฟล์เปิดได้, JSON 29 ไฟล์อ่านได้, ไม่มีรายการ error; native hash ตรง, output ทั้งสี่ 2048×2048 และ WebP เป็น VP8L ทั้งหมด แพ็กประมาณ 79.96 MB รวมรายงานตรวจ ตรวจ syntax Python ทั้ง 5 สคริปต์ด้วย `ast.parse` แล้ว และ SHA-256 ของ source map ทั้ง 20 chunk ไม่เปลี่ยน `git diff --check` ไม่มี output; `git status --short` แสดงเฉพาะโฟลเดอร์ review ใหม่นี้ ไม่ได้รันเกมหรือ test suite ของเกม

ส่วนที่ต้องทำต่อคือรายการ `pendingParts` ใน run-summary และการตัดสินของ Claude โดยเฉพาะ c2/q11,q12 และ semantic changes ของ c3/c4; run นี้ใช้ครบเพดาน 16 ครั้งแล้ว ยังไม่ได้ส่งเข้าเกมหรือทำขอบเพื่อนบ้าน
