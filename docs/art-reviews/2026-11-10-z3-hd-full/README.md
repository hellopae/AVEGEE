# โซน 3 west · HD-FULL ชุด 4/5

วาดครบ 14 ส่วนของ `r3-c3 r3-c4 r3-c5 r4-c1` ด้วย **ImageGen ในตัว 14 ครั้ง** ไม่มีการสร้างซ้ำเพื่อไล่คะแนน ส่งเป็นชุดตรวจงาน ยังไม่ได้รับรองคุณภาพหรือทดสอบในเกม

## ผลวัดสำหรับ Claude ตัดสิน

| chunk | ส่วน | ภาพประกอบ 2× | sharpness เทียบ v1 | SIFT inlier residual สูงสุด (1× px) |
|---|---:|---|---:|---:|
| r3-c3 | 4 | 2048×2048 | ×118.45 | 4.24 |
| r3-c4 | 4 | 2048×2048 | ×89.84 | 3.73 |
| r3-c5 | 4 | 1638×2048 | ×127.50 | 3.37 |
| r4-c1 | 2 | 2048×410 | ×160.49 | 3.62 |

Sharpness = variance ของ grayscale Laplacian บนภาพ 2× เทียบ master v1 ขยายด้วย Lanczos ให้ขนาดเท่ากัน ค่านี้ไวต่อรายละเอียดคลื่น หิมะ และเส้นรอยแตก ไม่ใช่คะแนนความเหมือนหรือหลักฐานว่า geometry ถูกต้อง ไม่ใช้ sharpening filter หลังสร้างภาพ

**structure max จริงยังไม่ได้รับรอง** ค่าในตารางเป็น residual ของจุด SIFT ที่ RANSAC รับไว้เท่านั้น ไม่ใช่การวัดขอบลาน/บันได/หน้าผา/ตลิ่งทุกตำแหน่ง `structure.json` เก็บทั้ง inlier max/P95 และ all-match P95 โดยไม่ซ่อน outlier ส่วน `run-summary.json` ตั้ง `structureMaxPx1x: null` เพื่อไม่อ้างผลเกินหลักฐาน

ข้อสังเกตจากการเปิดดู native และภาพประกอบทั้ง 4 chunk:

- **r3-c3:** q21 มี residual สูงสุด 4.24 px เกิน 4 px; ลายสลักบนลานเข้มและบางเส้นตีความใหม่ สีเสาสะพานฝั่ง q11/q12 ต่างกันระหว่างเงินกับทอง ต้องให้ผู้ตรวจตัดสิน
- **r3-c4:** คลื่นน้ำละเอียดและหนาแน่นขึ้น ให้ตรวจ shoreline/น้ำตกกับ flow mask เดิม โดยเฉพาะขอบบน
- **r3-c5:** **q12 เพิ่มน้ำไหลสั้น ๆ บนตลิ่งด้านบน ต้นฉบับเป็นน้ำแข็งย้อย** จึงยังไม่รับรองเงื่อนไขคงรูปตลิ่ง รายละเอียดกะโหลกและซี่โครงถูกตีความใหม่ด้วย
- **r4-c1:** รายละเอียดใบสน/หิมะออกสมจริงขึ้น ให้ตรวจความเข้ากันกับ chunk รอบข้าง native q12 ครอบคลุม context หลัง affine 99.06%; ส่วนที่อยู่นอก native support ใช้ border reflect ในการ resample มีค่าครบใน registration
- ภาพรวมที่เปิดดูไม่พบเส้นตัดตรงดำหรือช่องว่างภายใน chunk แต่ยังไม่รับรองว่าไม่เห็นรอยที่ซูมเกมทุกตำแหน่ง มี `seam-check.jpg` ทำเครื่องหมายแนวตัด และภาพ `*-compare.jpg` ให้ตรวจต่อ

## แหล่งภาพและวิธี

อ่าน `src/zone-skin.js`: west ใช้ `img/map-zone3/v1/` master 4915×3277, repairs=false จึงไม่มี repair patch มาแปะเพิ่ม ไม่แก้ไฟล์เกม

อ่านใบงานโซน 1 ตามพาธที่ระบุได้ แต่สอง worktree ตัวอย่าง plaza-detail และ hd-full ไม่มีอยู่บนเครื่องนี้ อ้างอิงวิธี min-cost seam จาก `docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py` ที่มีใน repo แล้วเขียน helper สำหรับชุดนี้ จึงไม่ได้อ้างว่าใช้สคริปต์ต้นฉบับที่เปิดไม่ได้แบบ byte-for-byte

1. ต่อ master จาก WebP เดิม ตัด core 2×2 ตามขนาดจริง: 512×512; c5 แบ่ง 410/409×512; r4 ใช้สองส่วน 512×205
2. เพิ่ม context 64 px รอบ core ทุกด้าน ยกเว้นด้านที่ชนขอบแผนที่ เก็บ `layout.json` และ `q*-source.webp` ซึ่งรวม context จาก chunk ข้างเคียงไว้ด้วย
3. ImageGen แก้ภาพ source ทีละส่วน โดยสั่งคงกรอบภาพ สไตล์นรกน้ำแข็ง มุมมอง แสง สี และโครงสร้างเดิม prompt เต็มพร้อม hash และขนาดที่คืนจริงอยู่ใน `generation-prompts.json` (native ขนาดไม่เท่ากันทุกส่วน)
4. native บันทึก WebP lossless ขนาดเดิม ไม่ย่อก่อนเก็บ SIFT บนภาพย่อตาม context ใช้ ratio 0.72 แล้ว affine RANSAC 3 px; warp native โดย affine ด้วย Lanczos4 สู่ canvas 2× ไม่มี local deformation เพื่อบีบตัวเลข
5. ภายใน chunk ใช้ min-cost path จาก squared RGB difference + Gaussian 5, เดิน -1/0/+1, เว้น rim 10 output px, smoothstep feather ±8 output px รวมแนวนอนก่อนแนวตั้ง แล้วครอป core ของ chunk ไม่ตัดต่อขอบ chunk กับเพื่อนบ้าน
6. ภาพ 2× ส่ง WebP lossless; compare JPEG ที่สเกล 2.8 px/world unit (master ≈1.28 px/world unit) ลดเฉพาะคุณภาพ JPEG เหลือ 70 เพื่อให้อยู่ในงบ 80 MB ไม่เปลี่ยน native หรือ 2×

## วัตถุและ walkmask

`objects-inventory.json` เทียบ `src/town-owner-walkmask-west.js`, `src/town-west-trees.js` และ WEST_PROPS ใน `src/town-layout.js` พร้อม `walkmask-overlay.jpg` ต่อ chunk (แดง=เดินได้)

- จุด west-tree-11/12 อยู่นอก context ชุดนี้ ไม่อ้างว่าลบแล้ว
- จุด west-tree-13 และ hell-pillar ที่เกี่ยวข้องเป็นตำแหน่ง runtime; ที่เทียบกับภาพ source ไม่พบวัตถุฝังตรงจุดนั้นให้ลบ พื้นลานและสะพานยังโล่ง
- คงเสาสะพานที่อยู่นอกพื้นเดิน รวมทั้งพื้นสะพาน/ขั้นบันได ต้นไม้ริมหิมะ กะโหลก/ซี่โครงในน้ำ และกระดูกบนทางด้านล่างซึ่งไม่อยู่ใน owner walkmask
- จึงไม่มี baked object ที่ยืนยันว่าต้องลบภายใน core ชุดนี้ `removed.json` ทุก chunk ระบุ `removedIds: []` ตามจริง ของเหลววาดคงเป็นฐาน แต่ข้อคลาดของตลิ่ง q12 ที่กล่าวข้างบนยังต้องตัดสิน

## ไฟล์สำหรับ ASSEMBLE

แต่ละโฟลเดอร์มี `q*-native.webp`, `registration.json` (core/context rect ใน master 1×; affine native→context และ native→master), `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `structure.json`, `removed.json` พร้อม source, ภาพ registration ซ้อน และแนว seam ค่า rect เป็น `[x0,y0,x1,y1]` ไม่รวมปลายขวา/ล่าง

ข้อมูล native/registration ครบสำหรับประกอบทางเทคนิค **ยังต้องมีคำตัดสินด้านภาพก่อนติดตั้ง** ไม่ได้ประกอบรอยต่อข้าม chunk หรือแก้ `src/`, `tests/`, `img/` เดิม

## การตรวจและงานค้าง

คำสั่งจาก repo root:

```sh
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/build.py prepare
# ImageGen สร้าง native แล้ว จึงใช้ finish; finish จะข้าม chunk ที่มีผลเดิม
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/build.py finish
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/build.py package
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/verify.py
```

ตรวจอัตโนมัติเฉพาะความครบ ไฟล์ JSON/ภาพเปิดได้ ขนาดที่บันทึกตรงจริง และชนิด WebP lossless พร้อมงบพื้นที่/จำนวนครั้ง ไม่ตรวจผ่านเกณฑ์คุณภาพอัตโนมัติ ผลอยู่ใน `file-check.json` การประกอบเคยหยุดเพราะ manifest ยังบันทึกไม่สำเร็จ แก้การบันทึกแล้ว resume จาก export เดิม ไม่สร้างภาพหรือ fit ซ้ำเพื่อปรับคะแนน

ผลตรวจรอบส่งงาน: `verify.py` exit 0 ตรวจ native+2× 18 ภาพ พร้อม source/ภาพตรวจ/JSON ที่เกี่ยวข้อง; AST parse สคริปต์ทั้ง 2 ไฟล์สำเร็จ รวมชุดส่งออกประมาณ **79.37 MB** (ฐานสิบ) `git status` แสดงเฉพาะโฟลเดอร์งานนี้เป็นไฟล์ใหม่ ยังไม่มีการ commit/push/merge

Self-check ตามเกณฑ์รับงาน:

1. **ครบส่วนและ sharpness:** 14/14 ส่วน; ทุก chunk วัด sharpness เกิน ×10 แต่ structure ≤4 px **ยังยืนยันไม่ได้** และ r3-c3 มี proxy เกิน 4 px
2. **รอยต่อ/พื้นเดิน:** ประกอบภายในครบพร้อมภาพตรวจ; inventory ไม่พบ baked obstacle ที่ต้องลบใน core; seamless ที่ซูมเกมและคงรูปตลิ่ง **ยังรอ Claude ตัดสิน** โดยเฉพาะน้ำไหลเพิ่ม r3-c5/q12
3. **native+registration:** ครบ 14 native และ affine/core/context สำหรับ ASSEMBLE; งบ ImageGen 14/16 ครั้ง; ไม่มีส่วนวาดค้าง งานค้างคือการตัดสินคุณภาพและประกอบข้าม chunk

ไม่ได้ทำ runtime/gameplay test และไม่ได้อ้าง QA ผ่าน
