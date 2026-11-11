# คนงานพ่อครัว รอบแก้ 20261111T162400Z

สถานะ **incomplete** ตาม `queue-check.json` มีภาพครบตามจำนวนขั้นต่ำ แต่ยังต้องตรวจ GIF เล่นจริงและเก็บรายละเอียดลำตัวให้ตรงต้นฉบับ

ใช้ atlas ล่าสุดจาก `20261111T121621Z-c330d056` เป็นฐาน อ่านตัวละครใน `img/workers/worker-*-sheet-v2.webp` และผังแถวใน `src/workers.js` ประกอบการเทียบภาพ

## ไฟล์ส่งออก

| ไฟล์ | ผัง |
| --- | --- |
| `worker-{th,asia,west,cyberhell}-cook-v1.webp` | RGBA 2560×640 แถว0 ขวาล่าง แถว1 ซ้ายล่าง แถวละ8เฟรม |
| `worker-th-carry-v1.webp` | RGBA 2560×1280 แถว0 side แถว1 side-left แถว2 down แถว3 up แถวละ8เฟรม |
| `worker-cook.json` | ช่อง320×320 ความเร็ว8fps จุดวาด `foot:[160,320]` พร้อม file/row |
| `preview/*.gif` | 12 loop ถอดจาก atlas ที่ส่งจริง รวม96เฟรม |
| `preview/index.html` | หน้าเปิดดู GIF ขนาดจริง |
| `compare-{th,asia,west,cyberhell}.jpg` | ต้นฉบับตรงทิศเทียบเฟรมใหม่ที่สเกล1ต่อ1 |
| `loop-review.json`, `queue-check.json`, `evidence/` | ผลตรวจและประวัติ generation |

GIF สลับเวลา120/130ms เฉลี่ย8fps และตั้ง loop=0 ผังเดิมยังคงอยู่ carry อีกสามโซนเป็นชิ้นทางเลือกตามใบงาน ชุดนี้มี carry TH สี่ทิศ

## สิ่งที่แก้รอบนี้

- Cyberhell cook ทั้งสองทิศ ใช้ชั้นคอเดิมจาก idle ตรงทิศแก้รอยต่อใต้หัว รวมช่วง4→5และ8→1 ฐานเท้า y314 คงเดิม
- Carry TH ทั้งสี่ทิศ ประกอบเฉพาะคอและคอเสื้อจาก walk ตรงทิศ ลดคอเสื้อซ้อนและช่องโปร่งใต้หัว ป้องกันข้าวและเส้นขอบอาหารจาก mask เก็บพิกเซลคอที่แยกออกจากตัว
- TH cook ซ้ายเฟรม7 ใช้ชิ้นล่าสุดที่แก้ผ้าไว้แล้ว เก็บภาพเฟรมนั้นทั้งภาพไว้ พร้อมเทียบกับ idle และเฟรม6ในหลักฐาน
- สร้าง GIF และภาพ compare ใหม่จาก atlas ที่ส่งจริง ปรับเอกสารให้ตรงกับภาพล่าสุด เพราะเอกสารในชุดรับช่วงยังอ้างรอบก่อนหน้า

สคริปต์ `evidence/repair-current/repair.py` อ่าน input จากชุดล่าสุดตามพาธที่บันทึกไว้โดยตรง จึงรันซ้ำแล้วได้ผลเดิม ใช้ cutout ของชั้นคอที่อยู่นิ่ง ขอบเขต mask และจำนวนพิกเซลที่เปลี่ยนอยู่ใน `repair-report.json`

ภาพตัว มือ อุปกรณ์ และขาตั้งแต่ y192 ลงไปคง RGBA ของ input เดิมครบ96ช่อง พิกเซลหัวและอาหารที่ถูกป้องกันคงเดิมด้วย ผลตรวจส่วนนี้อยู่ใน `preservation-check.json` และ `repair-report.json` การเคลื่อนไหวของแต่ละเฟรมยังมาจากชุดวาดเดิม

WebP ที่แก้บันทึกแบบ lossless พร้อม `exact=True` เพื่อรักษา RGB ในพื้นที่ alpha=0 ด้วย การตรวจครั้งแรกพบค่าบริเวณโปร่งใสเปลี่ยนจากค่า default ของ encoder จึงแก้การส่งออกและตรวจใหม่ เก็บผลครั้งแรกไว้ใน `first-preservation-check.json`

## จำนวน generation

รอบนี้ใช้ ImageGen ใหม่ **0ครั้ง** งบแก้สะสม **16/16ครั้ง** นับ log คนละชุดสี่ชุด ชุดละสี่ครั้ง พร้อม SHA-256 ใน `evidence/repair-current/generation-log.json`

- `evidence/revision/generation-log.json`
- `evidence/repair-th/generation-log.json`
- `evidence/repair-cyberhell-head/generation-log.json`
- `evidence/repair-identity/generation-log.json`

Log ที่รับช่วงระบุงานวาดเดิมอีก16ครั้ง ประวัติที่บันทึกรวม32ครั้ง สะสมงานแก้ตามช่อง `generation.repairTotal` เท่ากับ16

## ผลตรวจไฟล์จริง

คำสั่งรันจากราก repo

```sh
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/repair-current/run_checks.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/check_package.py
```

| การตรวจ | ผล |
| --- | --- |
| `audit_current.py` | 106ข้อ ข้อผิดพลาด0 ตรวจ RGBA ขนาด ผัง จำนวนเฟรม ความต่างของเฟรม alpha พิกเซลหลุด และ decode GIF12ไฟล์ |
| `verify_identity.py` | 28ข้อ ข้อผิดพลาด0 หัว RGB ตรงต้นฉบับใน mask alpha≥250 ทั้ง96เฟรม และแนวฐาน cook ตรง source |
| `repair-current/verify.py` | 302ข้อ ข้อผิดพลาด0 ตรวจ source ตรงทิศ RGBA ของภาพส่วนที่คงไว้ และจำนวน generation จากlog |
| เงื่อนไขการประกอบ | 240เงื่อนไข ข้อผิดพลาด0 เก็บหัว อาหาร และภาพนอกmask |
| แพ็กส่งออก | ขนาดจริง ไฟล์ขาด และขอบเขต git อยู่ใน `evidence/package-check.json` |

`evidence/repair-current/test-results.json` เก็บคำสั่ง exit code และ stdout จริง ผลตรวจชุดนี้ครอบคลุมไฟล์ภาพและ metadata

จุดวาด `[160,320]` เป็น anchor ที่ก้นช่อง แนวพิกเซลรองเท้า cook อยู่ y319 สำหรับTH/Asia/West และ y314 สำหรับCyberhell กึ่งกลางแถบรองเท้าล่าง8แถวคลาดจาก source ไม่เกิน0.5px มีภาพ `evidence/repair-current/feet-*.jpg` และค่าของ source walk ทั้งสี่เฟรมเทียบ carry ใน `preservation-check.json` การวัดนี้ยังต้องประกอบกับการดูจุดสัมผัสเท้าและสัดส่วนระหว่างเล่น

## การดูภาพและสิ่งที่ยังค้าง

ดูภาพนิ่งของรอยต่อ4→5/8→1 ภาพเฟรมทั้งหมด และ carry TH ครบ32เฟรมบนพื้นขาว ดำ เขียวแล้ว ไม่พบขอบแดงหรือเหลืองที่แยกจากสีผิวและลายทอง มีหลักฐานใน `evidence/visual-review.json` และ `evidence/native-alpha-*.jpg`

เครื่องมือ browser ตอบ `The browser access host is unavailable` การดู GIF เล่นจริงจึงยังทำไม่ได้ เก็บผลไว้ที่ `evidence/playback-access.json` ช่อง `animatedPlaybackReviewed` และ `smoothLoopAccepted` จึงเป็น false

งานที่ยังต้องทำ

1. ดู GIF เล่นจริงเพื่อตัดสินจังหวะตัก ปั้น วาง คืนช้อน และช่วงขา carry โดยเฉพาะ4→5และ8→1
2. เก็บรายละเอียดลำตัวกับต้นฉบับ เช่น เข็มขัด แผงอกและสนับเข่าCyberhell รวมถึงด้านและตำแหน่งกระเป๋าTH cook หัวตรง source ใน mask ที่วัดแล้ว แต่รายละเอียดเหล่านี้ยังต่าง
3. ยืนยันจุดสัมผัสเท้าทางกายวิภาค สัดส่วนตลอดloop และรอยต่อคอเสื้อเข้มบางมุมจากการประกอบ

## ตรวจตนเองเทียบเกณฑ์รับงาน

| เกณฑ์ | ผลจริง |
| --- | --- |
| 1. Cookสี่โซน แปดเฟรม loopต่อเนื่อง ตัวเดิม ขนาดและเท้าตรง | มีครบสี่โซน สองทิศ แปดเฟรม หัวและแนวฐานตามค่าที่ตรวจตรง source ยังเหลือรายละเอียดลำตัวและการยืนยัน playback จึง incomplete |
| 2. Carry THครบทุกทิศ ขอบalphaสะอาด | มีครบสี่ทิศ แปดเฟรม ตรวจalphaและดูภาพ32เฟรมบนสามพื้นแล้ว ยังต้องยืนยันสัดส่วนกับความต่อเนื่องขณะเล่น จึง incomplete ตามงานต่อรอบนี้ |
| ส่งออกและงบ | มีatlasห้าไฟล์ manifest GIF12ไฟล์ compareสี่ไฟล์ READMEไทย log และ queue-check ขนาดกับขอบเขตตรวจด้วยpackage-check งบแก้สะสม16 รอบนี้0 |

หลักฐานใน `repair-current/` และรายงานปัจจุบันอ้างไฟล์ที่ส่งรอบนี้ โฟลเดอร์ revision, repair-th, repair-cyberhell-head, repair-identity, repair-static และ repair-final เก็บประวัติรับช่วง ภาพและข้อความเก่าในนั้นระบุสถานะตามรอบของตน
