# Z234-HD-ASSEMBLE · โซน 3 west ความละเอียด 2×

ประกอบ native 70 ส่วนจาก worktree ทั้ง 5 ชุดเป็น master 9830×6554 แล้วตัดชุด `v7/` ครบ 20 chunk มี fallback ซ่อมหัวสะพานกลาง 1 บริเวณ ผลตรวจไฟล์ครบตามเกณฑ์ 1 ส่วนเกณฑ์ 2 ยังมีจุดโครงสร้างและรอยต่างความคมให้ตรวจต่อ

## ชุดส่งมอบ

- `v7/` มี 20 chunk WebP quality 90, chunk 2048 px คอลัมน์ท้ายกว้าง 1638 px แถวท้ายสูง 410 px พร้อม `zone3-terrain-v7-preview.webp` ขนาด 1536×1024 และ `manifest.json` ซึ่งบันทึกพิกัด ขนาดไฟล์ และ SHA256 ของภาพทั้ง 21 ไฟล์
- ขนาด `v7/` รวม manifest **31,352,899 bytes หรือ 31.352899 MB ฐานสิบ** เพดานตามใบงานเท่ากับ 40,000,000 bytes
- `sources/` เก็บสำเนา native 70 ภาพแบบ lossless, registration 20 ชุด และหลักฐานต้นทาง รวม 169 ไฟล์ ประมาณ 191.83 MB ข้อมูลใน `inventory.json` เชื่อมไฟล์สำเนากับต้นทางและ SHA256 เพดาน 40 MB ใช้กับชุด `v7/`
- `seam-check/` มีภาพเต็มแนวตั้ง 4 เส้นและแนวนอน 3 เส้นที่ raster 2× กับภาพ `*-game.jpg` อีก 7 ภาพ แบ่งช่วงต่อเนื่องที่ 2.8 device px/world unit ใช้ดูที่ 100% แถบกว้าง 320 output px ครอบคลุมขอบซ้อนและ feather ทั้งหมด
- `overview.jpg`, `structure-check.jpg`, `structure.json`, `sharpness.json`, `seams.json` และ `coverage.json` เป็นหลักฐานจากไฟล์ส่งออกที่ decode กลับมา
- `compare-zoom/` มี 6 มุมของโซน west ได้แก่ลานหลัก สะพานกลาง หน้าผาตะวันตก ตลิ่งตะวันออก บันไดเหนือ และลานใต้ เทียบ v1 | v7 ที่ 2.8 device px/world unit พิกัดอยู่ใน `rois.json`
- `structure-detail/central-bridge-head-before.jpg` แสดงก่อนซ่อม และ `fallback-check/central-bridge-head.jpg` แสดงผลสุดท้ายรวมวงแหวนรอยต่อ

manifest กำหนด `fullPx={w:9830,h:6554}`, `chunk=2048`, `repairs=false`, `zone=west` สำหรับ loader ที่เลือกชุดนี้ ผลทดสอบใน runtime ยังไม่มีใน run นี้

## ต้นทางและวิธีประกอบ

| ชุด | worktree | chunk |
|---|---|---|
| Z3-HD-1 | `20261113T141012Z-41d14972` | r1-c1 ถึง r1-c4 |
| Z3-HD-2 | `20261113T141038Z-9feab6b8` | r1-c5, r2-c1 ถึง r2-c3 |
| Z3-HD-3 | `20261114T014100Z-71f476be` | r2-c4, r2-c5, r3-c1, r3-c2 |
| Z3-HD-4 | `20261113T141806Z-4c0979f5` | r3-c3 ถึง r3-c5, r4-c1 |
| Z3-HD-5 | `20261114T034436Z-e914d4a6` | r4-c2 ถึง r4-c5 |

อ่านใบงานโซน 1 ตาม path ที่ brief ให้แล้ว โฟลเดอร์ผลเดิมใน worktree `20261110T115811Z-6ad6e037` ไม่มีอยู่ จึงอ่าน README และสคริปต์ผลจริงจาก Git commit **8c8f339f** แบบ read-only ใช้ seam solver, การประกอบ context, perimeter fallback และวิธีวัดจากชุดนั้นเป็นต้นแบบ

1. คัดลอก native และ registration โดยรักษา bytes เดิม แปลง registration ทั้งแบบ `tiles`, `parts` dictionary และ `parts` list ให้เป็น rect `[x0,y0,x1,y1]` แบบ exclusive end หน่วย master 1× ตรวจ matrix global เทียบ matrix context บวก origin ตรวจขนาด native/hash และตรวจทุก core ครอบคลุม chunk ครั้งเดียว
2. ตรวจ master v1 ทั้ง 20 ชิ้นและ owner walkmask ของทั้ง 5 worktree เทียบ worktree นี้ รวม 105 รายการ hash ตรงกัน ใช้ `src/zone-skin.js` ยืนยันฐาน west เป็น `img/map-zone3/v1/` ขนาด 4915×3277, repairs=false
3. warp native ตรงสู่ context 2× ด้วย affine ที่ต้นทางให้และ Lanczos4 ใช้ `BORDER_REFLECT_101` ที่อยู่นอก native support ตามแนวทางต้นทาง จำนวน input ที่สะท้อนรวม context 71,620 output pixels และรวม core 6,231 pixels ตัวเลขนี้วัดก่อนเลือก seam จึงใช้ดูพื้นที่เสี่ยงของ input ได้
4. ประกอบส่วนย่อยพร้อม context 64 map px ต่อด้าน แล้วต่อข้าม chunk และข้าม run ใน overlap 128 map px หรือ 256 output px ใช้ squared RGB difference, Gaussian 5×5, DP ก้าว −1/0/+1 และ smoothstep feather ±8 output px
5. ชดเชยสี/ความสว่างเฉพาะ overlap แบบสมมาตร Gaussian 16 output px จำกัดด้านละ 8 ระดับ RGB และ taper เป็นศูนย์ที่ปลาย overlap ใช้สี native เดิมใน core นอก overlap
6. ประกอบจาก master เดียวในหน่วยความจำก่อนตัดไฟล์ส่งออก มี seam ภายใน 50 เส้น ข้ามคอลัมน์ 16 เส้น ข้ามแถว 3 เส้น และ perimeter ของ fallback 4 เส้น รวม **73 เส้น** เก็บ path จริงครบใน `seams.json`

การเปลี่ยนสีจำกัดอยู่ที่แถบรอยต่อ การลงทะเบียนใช้ affine เดิมจากต้นทาง ส่วนซ่อมโครงสร้างใช้ต้นฉบับตามพิกัดด้านล่าง ImageGen ใน run ประกอบนี้ **0 ครั้ง**

## Fallback ที่ใช้จริง

ใช้ fallback ซ่อม `central-bridge-head` เพียง 1 บริเวณ พิกัด master 1× แบบ `[x0,y0,x1,y1]`

- core `[2350,1855,2575,2120]`
- context `[2302,1807,2623,2168]` รวมวงแหวนด้านละ 48 map px
- พิกเซลที่รับสีต้นฉบับบางส่วนหรือทั้งหมด 353,453 output pixels ประมาณ 0.55% ของ master

ก่อนซ่อม native r2-c3 ลบเสาข้างบันไดบน แต่ native r3-c3 เก็บเสาล่าง การประกอบทำให้เห็นก้านเสาขาดตรงหัวสะพาน จึงใช้ **west v1 ขยาย 2× Lanczos** ใน core รักษาทรงบันไดและเสา แล้วหา min-cost perimeter 4 ด้านกับ feather ±8 output px ในวงแหวน ใช้สีต้นฉบับในขั้นผสม fallback

ภาพหลังซ่อมมีหัวเสาครบขึ้น แต่ **ความต่างความคมระหว่าง fallback กับ native ยังเห็นได้** โดยเฉพาะทางก่อนลงบันไดและปลายเสาล่าง พื้นที่นี้มีรายละเอียดจากภาพ 1× ขยาย และมีเสา/พุ่มเดิมกลับมา รายการนี้อยู่ใน `manifest.json` และ `inventory.json` ภาพก่อน/หลังซ่อมอยู่ในชุดส่งมอบ

## ผลตรวจโครงสร้างและรอยต่อ

วัดจาก WebP quality 90 ที่ decode กลับมา ใช้ DoG sigma 1.5/6, template 49×49, NCC search ±12 map px และ correlation ≥0.6 ตรวจ landmark คงที่จากต้นทางร่วมกับจุดทุก 80 px ตาม contour ของ owner walkmask สำหรับ west เก็บจุดทั้งหมดรวมจุดกำกวมไว้

ผลล่าสุด **1,883 จุด จับคู่ได้ 1,375 จุด กำกวม 508 จุด จับคู่แล้วเกิน 4 px จำนวน 33 จุด ค่าสูงสุด 15 px** ตัวอย่าง landmark ที่เกินเกณฑ์ยังมีดังนี้

| จุด | พิกัด master 1× | delta px 1× |
|---|---|---|
| r1-c5/stair-centre | `[4495,812]` | `[-12,0]` |
| r2-c1/lower-stair-centre | `[744,1653]` | `[-12,1]` |
| r2-c2/diagonal-stair-top | `[1766,1304]` | `[9,5]` |
| r2-c3/top-right-stair | `[2884,1069]` | `[-5,-12]` |

หลายจุดอยู่บนขั้นบันไดลายซ้ำ มีจุดชนขอบ search และบริเวณที่ native ลบวัตถุ การจับคู่เหล่านี้จึงยังต้องตรวจขอบจริงและจำนวนขั้นเพิ่มเติม จุดเกินเกณฑ์คงอยู่ใน JSON ครบ การซ่อมหัวสะพานเลือกจากภาพและผลวัดก่อนซ่อม ผลวัดหลังซ่อมจึงมีส่วนที่เกี่ยวข้องกับการเลือกตำแหน่งซ่อม

`src/town-owner-walkmask-west.js` เป็น mask ที่ใช้จริงของโซน west มี 27,328 walkable cells ขนาดเซลล์ 8 world units หรือประมาณ 10.24 map px ใช้พิกัดจากไฟล์นี้ประกอบการตรวจเส้นทาง เกณฑ์ขอบละเอียด 4 px ยังต้องพิจารณาภาพทั้งแนว ค่า `wholeStructureWithin4pxVerified` และ `inGameTested` ยังคงเป็น `false`

เปิดดู preview, structure overlay, ภาพรอยต่อ game scale ทั้ง 7 ภาพ และภาพเปรียบเทียบทั้ง 6 มุมแล้ว ในภาพที่เปิดตรวจไม่เห็นเส้นตาราง chunk ตรงเด่นชัด ลาน น้ำ หน้าผา และทางหลักยังต่อเนื่องกัน จุดที่เห็นรอยต่างความคมชัดคือ fallback หัวสะพานข้างต้น รายละเอียดลายหิน/น้ำตาม cut path ยังต้องพิจารณาที่ 100% รวมการเคลื่อนกล้องในเกม

ค่า adjacent RGB difference ตรงขอบ chunk เทียบแนวใกล้เคียงอยู่ใน `seam-check/metrics.json` ค่านี้เป็น diagnostic ของ raster boundary การตัดต่อ adaptive อาจอยู่ด้านใน overlap จึงมีภาพเต็มแถบและ path ให้ตรวจร่วมกัน

ความคมต่อ chunk อยู่ใน `sharpness.json` เทียบ v1 ที่สเกลเดียวกัน ผล grayscale Laplacian variance อยู่ประมาณ **×48.18–×187.19** มี high-pass mean square และ Hann FFT เพิ่มเติม ค่าเหล่านี้ขึ้นกับ contrast ลายหิน หิมะ น้ำ และการลบวัตถุด้วย

## ข้อค้างที่รับจากต้นทาง

รายงานต้นทางที่คัดลอกใน `sources/` ยังระบุพุ่ม r1-c2 ใกล้ master `[1477,828,113,102]`, ปื้นไฮไลต์ r2-c2/q22, เส้นขาวคล้ายน้ำไหลบนหน้าผา r2-c5/q22 และ r3-c5/q12, กะโหลกที่ถูกขยาย/เลื่อน r3-c2/q22 รวมถึงรายละเอียดราว r4-c3 และ Gothic silhouette r4-c5 งานประกอบนี้เก็บส่วน native เหล่านี้ไว้ ข้อค้างด้านรูปร่าง การลบวัตถุ และ mask ของเหลวต้องใช้ภาพจริงตัดสินต่อ

## คำสั่งและผลทดสอบ

ต้องมี Python 3, Pillow, NumPy และ OpenCV รันจาก repo root

```sh
python3 docs/art-reviews/2026-11-10-z3-hd-assemble/scripts/check-composition.py
python3 docs/art-reviews/2026-11-10-z3-hd-assemble/scripts/assemble.py
python3 docs/art-reviews/2026-11-10-z3-hd-assemble/scripts/verify.py
python3 docs/art-reviews/2026-11-10-z3-hd-assemble/scripts/verify.py --acceptance
```

- `check-composition.py` exit 0 ตรวจ 8 กลุ่มด้วยภาพรู้คำตอบ ได้แก่ต่อแนวนอน แนวตั้ง ขอบเขต/ความเปลี่ยนเฉพาะ overlap และ path จุดตัด 4 ทาง แถวท้ายแบบ 2 ส่วน การอ่าน schema การปฏิเสธ matrix/core ที่ผิด และการรักษา core กับพื้นที่นอก context ของ fallback
- `assemble.py` exit 0 คัดลอก native ครบและสร้างชุดส่งออก 20 chunk พร้อม fallback 1 บริเวณ
- `verify.py` exit 0 ตรวจขนาด/grid/format/hash งบ v7, native 70 ส่วน, registration 3 รูปแบบ, baseline ของ 5 worktree, seam paths และเปิดภาพ 115 ไฟล์ ผลอยู่ใน `verification.json`
- `verify.py --acceptance` exit **2** ข้อ 2 ยังมีโครงสร้างและภาพที่ต้องตรวจรับต่อ ผลตรวจไฟล์ใน `verification.json` ยังคงครบ
- ตรวจ syntax ทั้ง 3 สคริปต์ด้วย `ast.parse` และตรวจ whitespace ด้วย `git diff --no-index --check /dev/null <script>`

## Self-check ตามเกณฑ์รับงาน

| เกณฑ์ | ผลตรวจตนเอง |
|---|---|
| 1. v7 ครบ 20 ชิ้น + preview + manifest และ ≤40 MB | ตรวจครบ ขนาดรวม 31.352899 MB |
| 2. ไม่เห็นรอยต่อที่ซูมเกม และ structure ≤4 px | **ยังค้าง** มีแถบรอยต่อและภาพ game scale ครบ แต่ยังมี NCC เกินเกณฑ์ 33 จุด กำกวม 508 จุด และรอยต่างความคมที่ fallback |
| 3. ระบุ fallback และข้อค้างตามจริง | ระบุ fallback หัวสะพาน 1 บริเวณ, input reflected border, ข้อค้างจาก native ต้นทาง และ ImageGen 0 ครั้งครบ |

ไฟล์ที่เพิ่มอยู่ใต้ `docs/art-reviews/2026-11-10-z3-hd-assemble/` ทั้งหมด ผลตรวจ Git แสดงการเปลี่ยนแปลงเฉพาะโฟลเดอร์นี้
