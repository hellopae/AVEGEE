# โซน 3 west · HD-FULL ชุด 5/5

วาด `r4-c2 r4-c3 r4-c4 r4-c5` ครบ 8/8 ส่วนด้วย **ImageGen ในตัว 8 ครั้ง** ส่ง native และภาพประกอบภายใน chunk ให้ Claude ตรวจคุณภาพและ ASSEMBLE ต่อ

## ผลวัดสำหรับ Claude ตัดสิน

| chunk | native q11 / q12 | ภาพ 2× | sharpness ที่ซูมเกม | sharpness ที่ 2× | SIFT inlier max 1× px |
|---|---|---|---:|---:|---:|
| r4-c2 | 1935×813 / 1935×813 | 2048×410 | ×155.18 | ×184.70 | 2.87 |
| r4-c3 | 1935×813 / 1934×813 | 2048×410 | ×193.71 | ×235.21 | 3.14 |
| r4-c4 | 1935×813 / 1935×813 | 2048×410 | ×133.61 | ×157.39 | 3.07 |
| r4-c5 | 1774×887 / 1663×946 | 1638×410 | ×167.58 | ×208.37 | 3.61 |

Sharpness ใช้ variance ของ grayscale Laplacian, ksize=1 ทั้ง master v1 และภาพใหม่ถูก resize ด้วย Lanczos ไปขนาดเดียวกัน คอลัมน์ซูมเกมใช้ 2.8 screen px/world unit ตามต้นแบบโซน 1 วัดเต็ม chunk ที่ 2240×448 และ 1792×448 สำหรับ c5 คอลัมน์ 2× เก็บผลที่ขนาดส่งออกไว้ด้วย ค่ารอยแตกหิน หิมะ และใบสนส่งผลต่ออัตรานี้ จึงต้องพิจารณาควบคู่ภาพจริง

**structure สูงสุดของขอบจริงยังยืนยันไม่ได้** ตารางบันทึก residual ของจุด SIFT ที่ RANSAC รับเข้า fit เท่านั้น ค่า `structureMaxPx1x` จึงเป็น `null` และ `semanticStructureVerified` เป็น `false` ในไฟล์ส่งงาน แต่ละ `structure.json` เก็บ inlier max/P95, all-match P95 และจำนวนจุดไว้ให้ตรวจ

ข้อสังเกตหลังเปิดดู source ทั้ง 8 ภาพ, native ทั้ง 8 ภาพ, ภาพประกอบ 2× และ compare ทั้ง 4 chunk

- `r4-c2` รอยแตกหินและกรวดในร่องปูนเข้มขึ้น ต้องให้ Claude ตัดสินความเข้ากันกับพื้น west รอบข้าง
- `r4-c3` ทางกลางยังโล่ง ราวสองข้างยังอยู่ แนว min-cost seam ผ่านพื้นทางใกล้ราวขวา ต้องตรวจลายหินและทรงเสาที่ซูมเกม โดยเฉพาะ q11 มี all-match P95 **62.08 px** จากชุดจุดจับคู่ซึ่งรวมจุดที่ RANSAC ตัดออกด้วย ไม่ใช้ inlier residual เพื่อรับรองความตรงทุกขอบ
- `r4-c4` น้ำแข็งย้อยยังมีปลายแหลมและสภาพแข็ง ชั้นหิน กิ่งไม้ และผิวหิมะมีรายละเอียดมากขึ้น
- `r4-c5` ลายช่องหน้าต่าง Gothic และรายละเอียดน้ำแข็ง/ชั้นหินถูกตีความใหม่ ต้องตรวจ silhouette ใกล้ขอบแผนที่ด้านขวา
- จากภาพ 2× ที่เปิดดูไม่พบช่องว่างดำหรือแนวตัดตรงภายใน chunk การตัดสินว่าไร้รอยต่อที่ซูมเกมยังรอ Claude มีภาพ `seam-check.jpg` ทำเครื่องหมายแนวตัดจริง และ `*-compare.jpg` สำหรับดูพื้นเดิมกับพื้นใหม่
- context coverage ของ `r4-c3/q11`, `r4-c3/q12`, `r4-c4/q11` เท่ากับ 99.66%, 99.26%, 99.56% ตามลำดับ ส่วนอื่น 100% การ warp ใช้ `BORDER_REFLECT_101` สำหรับจุดนอก native support บันทึกไว้ใน registration

## แหล่งภาพและวิธีประกอบ

อ่านใบงานโซน 1 ที่ระบุได้ แต่สอง worktree ตัวอย่างตาม path เดิมไม่มีอยู่ในเครื่อง จึงอ่านสคริปต์ต้นแบบจาก Git แบบ read-only ที่ `bc9dc4dd` และ `0c544a3f` และปรับ helper ของโซน 3 ชุดก่อนมาใช้กับแถว r4 แหล่งอ้างอิงและ hash ของไฟล์ตั้งต้นอยู่ใน `source-provenance.json`

`src/zone-skin.js` กำหนด west ให้โหลด `img/map-zone3/v1/` ขนาด master 4915×3277 และ repairs=false

1. ต่อ master จาก WebP เดิม แถว r4 สูง 205 px แบ่งสอง core ต่อ chunk ที่ 512×205 ส่วน c5 แบ่ง 410×205 และ 409×205
2. เพิ่ม context ด้านละ 64 px รวมภาพเพื่อนบ้านใน r3 และ chunk ซ้าย/ขวา ด้านล่างและขวาสุดหยุดที่ขอบแผนที่ `layout.json` เก็บ core/context เป็น `[x0,y0,x1,y1]` หน่วย master 1× โดยปลายขวาและล่างเป็น exclusive
3. ImageGen แก้ source ทีละส่วน เน้นเพิ่มรายละเอียดวัสดุ พร้อมสั่งคงโครงสร้าง กรอบภาพ สี แสง และสไตล์นรกน้ำแข็ง Prompt เต็มทุกครั้งอยู่ใน `generation-prompts.json` พร้อม path, ขนาด native และ SHA-256
4. บันทึก native เป็น WebP lossless ที่ขนาดคืนจริง ใช้ SIFT และ affine RANSAC แบบ helper โซน 3 รอบก่อน fit ครั้งเดียวต่อส่วน แล้ว warp native ตรงสู่ canvas 2× ด้วย Lanczos4
5. ต่อภายใน chunk ด้วย min-cost seam จาก squared RGB difference, Gaussian 5×5, ก้าว -1/0/+1 และ smoothstep feather ±8 output px แล้วครอป core ของ chunk
6. เก็บภาพ 2× เป็น WebP lossless และ compare JPEG ที่ซูมเกม 2.8 px/world unit ส่วน native ยังรวมขอบซ้อนครบสำหรับประกอบข้าม chunk ภายหลัง

ไม่มี sharpening, broad color correction หรือ local deformation ในภาพส่งออก สร้างภาพ 8 ครั้งและ fit 8 ครั้ง ไม่มี generation หรือ fit ซ้ำเพื่อปรับคะแนน

## วัตถุและพื้นเดิน

`objects-inventory.json` อ้างอิง owner walkmask ของ west, `WEST_PROPS` ใน `src/town-layout.js` และ `src/town-west-trees.js` แต่ละ chunk มี `walkmask-overlay.jpg` โดยสีแดงแสดงพื้นเดิน

- `r4-c2`, `r4-c4`, `r4-c5` ไม่มี owner-walk pixel ภายใน core จึงคงป่าสน พุ่มไม้ และหน้าผาหิมะ
- `r4-c3` มีพื้นเดิน 28,905 master pixels ขอบเขต `[2386,3072,2529,3277]` อยู่บนทางกลาง การสำรวจต้นฉบับพบพื้นหินโล่ง คงราว/เสาด้านข้างและพื้นทางทั้งหมด
- ต้นไม้ runtime 28 จุดมี foot Y สูงสุด 2150.76 master px และพร็อพ runtime อื่นมี foot Y สูงสุด 2880.18 master px อยู่เหนือ context ของรอบนี้ซึ่งเริ่ม Y=3008
- กระดูกที่ตัดขอบบนของ `r4-c4/q11` อยู่ใน context เพื่อนบ้านและนอกทางเดินกลาง จึงคงไว้
- ไม่มี baked obstacle ที่ยืนยันว่าต้องลบใน core รอบนี้ `removed.json` ทุก chunk จึงบันทึก `removedIds: []` การตรวจ silhouette/occlusion ขั้นสุดท้ายยังรอผู้ตรวจ
- ส่วนสีน้ำเงินบนหน้าผาในรอบนี้เป็นน้ำแข็งย้อย Prompt กำหนดคงรูปชั้นฐานของของเหลว/เมฆหากพบใน crop

## ไฟล์ส่งต่อและการตรวจ

แต่ละ chunk มี `q11/q12-native.webp`, source crop, `registration.json`, `structure.json`, `removed.json`, `seams.json`, ภาพ 2×, ภาพ compare และภาพตรวจ registration/seam/walkmask ส่วนรวมมี prompt manifest, inventory, provenance และ `run-summary.json` รวมประมาณ **31.6 MB** ภายใต้งบ 80 MB

คำสั่งที่ใช้จาก repo root

```sh
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/build.py prepare
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/build.py finish
python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/verify.py
```

`prepare` เตรียม source/inventory ส่วน `finish` ประกอบ native ที่สร้างไว้และข้ามการ fit ของ chunk ที่มี export แล้ว ตรวจ Python syntax ด้วย `ast.parse` เพิ่มเติม การตรวจอัตโนมัติจำกัดที่ความครบของไฟล์ เปิดภาพ/JSON ได้ ขนาดตรง WebP lossless และงบไฟล์/จำนวนครั้ง ผลอยู่ใน `file-check.json` การรับรองด้านภาพยังรอ Claude

ผล `verify.py` exit 0 ตรวจ native 8 ภาพและภาพ 2× 4 ภาพ พร้อม source, ภาพตรวจ และ JSON ที่เกี่ยวข้อง `ast.parse` อ่านสคริปต์ทั้งสองได้ และการขยายบรรทัดโค้ดให้อ่านง่ายรักษา AST เดิมไว้ ตรวจขอบเขตไฟล์ด้วย Git พบเฉพาะโฟลเดอร์ review นี้เป็นไฟล์ใหม่

## Self-check ตามเกณฑ์รับงาน

1. **ครบส่วนและ sharpness** ครบ 8/8 ส่วน สี่ chunk วัด sharpness ที่ซูมเกมได้ ×133.61–×193.71 ส่วน structure ≤4 px ของขอบจริงยังรอ Claude ตัดสิน มี affine และ residual ที่วัดได้ครบ
2. **รอยต่อและพื้นเดิน** ประกอบภายในครบพร้อมภาพตรวจ ไม่พบ baked obstacle บนทางกลางจากการสำรวจต้นฉบับ การรับรองรอยต่อและโครงสร้างยังค้าง โดยเฉพาะราวทางกลาง r4-c3 และลาย Gothic r4-c5
3. **native และ registration** ครบ 8 native พร้อม affine native→context/master, core/context rect และขอบซ้อนให้ ASSEMBLE ไม่มีส่วนวาดค้าง งานค้างคือคำตัดสินคุณภาพและการประกอบข้าม chunk

งานนี้อยู่บน branch ที่ wrapper เตรียมให้ แก้เฉพาะโฟลเดอร์ review นี้ การทดสอบ runtime/gameplay ยังไม่มีผลในรอบนี้
