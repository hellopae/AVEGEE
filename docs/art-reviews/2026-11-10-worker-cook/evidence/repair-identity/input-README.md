# คนงานปั้นข้าวปั้น — รอบแก้ 11 พ.ย. 2569

สถานะ **incomplete** ตาม [queue-check.json](queue-check.json) มีไฟล์ครบจำนวนขั้นต่ำ แต่หัว/ใบหน้า รายละเอียดประจำด้าน และความต่อเนื่องของ loop ยังไม่ครบเกณฑ์ จึงยังไม่พร้อมรับรองส่งเสียบเกม

รอบ `20261111T065049Z-44a264e5` นำเข้าชุดล่าสุดจาก `20261111T063649Z-a40c6428` แล้วแก้ **ภาพจริง cyberhell cook 16 เฟรม** ด้วย ImageGen ในตัว 4 ครั้ง ครั้งละ 4 เฟรม โดยแนบภาพเดิมและ source ตรงทิศ พร้อมภาพผลก่อนหน้าเพื่อรักษาความต่อเนื่อง ใช้คำสั่งแก้หัว/ใบหน้าและคงลำดับท่าตัก → ปั้น → วาง → คืนมือ ไม่สร้าง animation ด้วยการเลื่อนหรือเฟดภาพนิ่ง

งบรอบเดิมใช้หมด 16 ครั้งแล้ว รอบแก้ก่อน run นี้ 8 ครั้ง รอบนี้ 4/4 ครั้ง รวมรอบแก้ **12/16 ครั้ง** เหลือร่วม 4 ครั้ง รอบนี้ไม่ใช้ Shado หรือ API ภายนอก ดู prompt ทั้งสี่ ภาพตั้งต้น ผลดิบ และ provenance ที่ [generation-log.json](evidence/repair-cyberhell-head/generation-log.json)

## ไฟล์และผัง

| ไฟล์ | ขนาด RGBA | แถวบนลงล่าง |
| --- | --- | --- |
| worker-th-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-asia-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-west-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-cyberhell-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-th-carry-v1.webp | 2560×1280 | side, side-left, down, up |

ทุกแถว 8 เฟรม ช่องละ 320×320, 8 fps, draw anchor `foot:[160,320]` ตาม [worker-cook.json](worker-cook.json) รวม 96 ช่อง มี GIF ใน `preview/` ครบ 12 แถว เวลา 120/130 ms สลับกัน รวม 1 วินาทีต่อรอบ วนไม่จำกัด GIF ใช้พื้นเทา ส่วน WebP มี alpha จริง ไม่มีโต๊ะ/เคาน์เตอร์ใน sprite

อ่าน `src/workers.js` ยืนยันต้นฉบับ 12 แถว × 4 คอลัมน์: idle row0, side row1 (renderer mirror ตาม face), down row4, up row5 โค้ดยังใช้ cell-bottom เป็นจุดวาดและมี inset/fit บางแถว รอบนี้ไม่ได้แก้หรือติดตั้งไฟล์เข้าเกม ตำแหน่งที่ Toby จะใช้ภายหลังคือ `img/workers/worker-<zone>-cook-v1.webp` และ `worker-<zone>-carry-v1.webp` ไม่มี carry asia/west/cyberhell ซึ่งเป็นทางเลือก

## ผลแก้ cyberhell และจุดเท้า

ชุดนำเข้าจัดฐานจาก y319 เป็น y314 ไว้แล้ว รอบนี้รักษาฐาน y314 ทุกช่องหลังวาดแก้ใหม่ โดยเทียบ source idle row0 column1 (นับจากศูนย์) ที่มี silhouette สูง 305 px ย่อ/ขยายทั้งช่องแบบคงอัตราส่วนแล้วจัดตำแหน่ง ได้ความสูง 305–306 px และกึ่งกลางกรอบแถบรองเท้า 32 px ล่าง ขวา x190 ซ้าย x129 คลาดไม่เกิน 0.5 px ดู [packing.json](evidence/repair-cyberhell-head/packing.json) และ [ก่อน–หลัง](evidence/repair-cyberhell-head/before-after.jpg)

การจัดช่องใช้ภาพวาดคนละท่าจริงทั้ง16เฟรม ไม่ใช่สร้าง motion ใหม่ด้วยการเลื่อนภาพเดียว ไม่มีการแยกหัวมาแปะหรือวาดทับด้วยสคริปต์ ไม่มี alpha>40 ถูกตัด การตรวจรอบแรกพบ alpha=1 จากการ resample ที่ขอบช่อง จึงตัดเฉพาะ gutter กว้าง1px ซึ่งยืนยันว่ามี alpha สูงสุด1 เก็บผลตรวจเดิมไว้ที่ [audit-before-gutter-clean.json](evidence/repair-cyberhell-head/audit-before-gutter-clean.json) แล้วตรวจซ้ำ

ค่าข้างต้นเป็นการจัดกรอบ silhouette และรองเท้า **ยังไม่ใช่การรับรองจุดสัมผัสเท้าทางกายวิภาค** ค่า `foot` ใน manifest เป็นจุดวาด ไม่ใช่ผลวัดเท้า Reference ซ้ายเป็นภาพ idle ต้นฉบับกลับด้านตาม renderer ไม่ใช่ภาพ canonical ซ้ายที่วาดแยก จึงยังตัดสินรายละเอียดประจำด้านทั้งหมดไม่ได้

ใบหน้าผลแก้เหลี่ยม/ปากนิ่งขึ้น แต่หัวยังแคบและไม่ตรงต้นฉบับ โดยเฉพาะทิศซ้าย ช่วงซ้าย4→5 สัญลักษณ์ไหล่กลับมาและกระเป๋าหาย ต่างจากเฟรมก่อนหน้า จึงยังไม่รับรองว่ารักษาตัวละครเดิมสำเร็จ

## การตรวจที่ทำจริง

รันจาก repo root:

```sh
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/repair-cyberhell-head/pack.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/audit_current.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/check_package.py
```

ใช้ Pillow, NumPy, SciPy ผล [current-audit.json](evidence/current-audit.json) ตรวจ 123 เงื่อนไข ไม่พบข้อผิดพลาดโครงสร้างล่าสุด: RGBA/ผัง/manifest, 8 เฟรมต่างกันต่อแถว, ขอบช่องโปร่งใส, ไม่มี alpha>40 หลุดจากตัว, GIF 12 ไฟล์ถอดได้ครบ96เฟรม ขนาด320×320 เวลาและloop flagถูกต้อง ความคลาดเคลื่อน palette เทียบ atlas ต่ำกว่า3 ส่วน SHA256 ยืนยัน atlas อื่น4ไฟล์และ GIF อื่น10ไฟล์ตรงชุดนำเข้า

ดู compare ทั้ง4โซน, ภาพก่อน–หลัง cyberhell, decoded GIF contact sheets ทั้ง12แถว รวม96เฟรม และ native alpha plates 12ภาพ รวม48เฟรม (cyberhell16 + carryTH32) บนพื้นขาว/ดำ/เขียว ไม่เห็นขอบแดงหรือเหลืองส่วนเกินชัดเจนในภาพที่ตรวจ สีผิวแดงและขอบทองของ TH เป็นรายละเอียดตัวละคร ไม่ใช่หลักฐานว่ามี fringe ดู [visual-review.json](evidence/visual-review.json)

ตรวจ frame-by-frame แล้ว **ยังไม่ได้ดู playback ต่อเนื่องหรือทดสอบในเกม** ค่าความต่างภาพ8→1ใน [loop-review.json](loop-review.json) เป็นตัวชี้วัดเท่านั้น ไม่พิสูจน์ว่า loop ลื่น จึงไม่อ้างว่า QA ผ่าน

[package-check.json](evidence/package-check.json) เก็บจำนวนไบต์จริงรวมรายงาน รายการไฟล์พร้อมSHA256 และผลตรวจขอบเขต git ต้องไม่เกิน30,000,000ไบต์ ไม่มีไฟล์นอกโฟลเดอร์ส่งออก ไฟล์ภาพเดิม/โค้ดเกมไม่ถูกแก้

## ตรวจตนเองเทียบเกณฑ์รับงาน

| เกณฑ์ | ผลจริง |
| --- | --- |
| 1. cook 8 เฟรมครบ4โซน loopต่อเนื่อง ตัวละครเดิม/ขนาด/จุดเท้าตรง | มีครบ4โซน×2ทิศ×8เฟรม และฐานcyberhell y314ครบ16 แต่หัว/ใบหน้า/รายละเอียด/รอยต่อยังค้าง จึง incomplete |
| 2. carry TH ทุกทิศ ขอบalphaสะอาด | มีside/side-left/down/up อย่างละ8เฟรม ดูalphaครบ32 ไม่เห็นขอบแดง/เหลืองส่วนเกินชัดเจน แต่หน้า/สัดส่วนยังต่างsource และside-leftกลับด้านกระเป๋า จึงยังไม่รับรองครบใบงาน |
| ข้อจำกัดรอบแก้และส่งออก | ImageGen4ครั้ง รวมรอบแก้12/16; ส่งออกเฉพาะโฟลเดอร์นี้; ไม่แก้src/tests/img; ไม่commit/push/merge/deploy; ไม่ใช้agents |

งานค้างที่วัด/เห็นจริง: TH cook หัวและตาเปลี่ยน4→5/8→1 และซ้ายเฟรม7กระเป๋าผิดข้าง; asiaหน้าเรียบ/กลมกว่าต้นฉบับและยังmirror; westหัวเล็ก/ขาเด่นและstanceเปลี่ยนปลายแถว; cyberhellหัว/รายละเอียดและรอยต่อดังกล่าว; carryTHหน้า/สัดส่วนยังต่างsource ต้องแก้ก่อนรับรองตัวละครเดิมและloop ไม่วาด carry ทางเลือกเพิ่มในรอบนี้

## ไฟล์ที่เปลี่ยนจากชุดนำเข้าและหลักฐาน

ภาพที่แก้จริงคือ `worker-cyberhell-cook-v1.webp` กับ GIF cyberhell2ทิศ ส่วน atlas4ไฟล์และGIF10ไฟล์คัดลอกตรงชุดล่าสุด อัปเดต `worker-cook.json`, `loop-review.json`, `queue-check.json`, README, compare/decoded/alpha และหลักฐานตรวจปัจจุบัน เพิ่ม `evidence/repair-cyberhell-head/` สำหรับ prompt/ผลดิบ/input/packing/ก่อน–หลัง และ `evidence/visual-review.json`

ไฟล์ inherited ใน `evidence/revision/`, `evidence/repair-th/`, `input-*`, `prior-*`, `previous-*`, `latest-input-*`, `technical-audit.json`, `registration-review.json` และสคริปต์เก่าเป็นประวัติจากรอบก่อน ไม่ใช่ผลตรวจรอบนี้ เก็บ log/ผลวาดเดิมไว้ ตัดเฉพาะ diagnostic plates ซ้ำหรือถูกแทนที่เพื่อจำกัดขนาด ตาม `removed-inherited-diagnostics.json` และ `omitted-inherited-plates.json` ในโฟลเดอร์รอบแก้ปัจจุบัน ใช้ current-audit, visual-review และ queue-check สำหรับสถานะล่าสุด
