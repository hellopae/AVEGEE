# คนงานพ่อครัว — รอบแก้ 20261111T165435Z

สถานะ **incomplete** ตาม `queue-check.json` มีชิ้นงานขั้นต่ำครบ แต่ยังไม่รับรองสัดส่วนทั้งตัวและความต่อเนื่องของ loop เล่นจริง

ใช้ผลงานล่าสุดจาก `20261111T162400Z-6a49dc9c` เป็นฐาน อ่านภาพต้นฉบับจาก `img/workers/worker-*-sheet-v2.webp` และผังแถวจาก `src/workers.js` โดยไม่ได้แก้เกมเดิม งานทั้งหมดอยู่ในโฟลเดอร์ส่งออกนี้

## ชิ้นงานและผังเดิม

| ไฟล์ | ผัง |
| --- | --- |
| `worker-{th,asia,west,cyberhell}-cook-v1.webp` | RGBA 2560×640 แถว0 ขวาล่าง แถว1 ซ้ายล่าง แถวละ8เฟรม |
| `worker-th-carry-v1.webp` | RGBA 2560×1280 แถว0 side แถว1 side-left แถว2 down แถว3 up แถวละ8เฟรม |
| `worker-cook.json` | frameW/H=320, frames=8, fps=8, foot=[160,320] พร้อม zone/anim/dir/file/row |
| `preview/*.gif` | 12 loops จาก atlas ส่งจริง รวม96เฟรม; 120/130ms สลับกัน เฉลี่ย8fps, loop=0 |
| `preview/index.html` | หน้าเปิด GIF ขนาด320×320 |
| `compare-<zone>.jpg` | idle/walk ตรงทิศเทียบภาพส่งจริงสเกล1ต่อ1 |
| `loop-review.json`, `queue-check.json`, `evidence/` | ข้อจำกัด ผลตรวจ และ generation log |

carry อีกสามโซนเป็นทางเลือก จึงเก็บเฉพาะ TH ตามขั้นต่ำ ไม่คัดลอกไฟล์ไปติดตั้งใน `img/`

## การแก้ครั้งนี้

- Cyberhell cook ซ้ายทั้ง8เฟรม: ใช้ RGB แผงเสื้อ/เข็มขัดจาก idle แถว0 คอลัมน์1 ตรงตำแหน่งเดิมแล้วกลับด้านตาม renderer เฉพาะพื้นที่ภายในเสื้อที่เปิดให้เห็น ป้องกันกรอบมือ แขน ช้อน และอาหารแยกแต่ละเฟรม
- TH cook ซ้ายเฟรม7: คืนรายละเอียดกระเป๋าด้านใกล้จากต้นฉบับใต้ข้อมือ ป้องกันสีผิวมือ ข้าวปั้น และขอบเส้นไว้ด้านหน้า
- คง RGBA ของ cook Asia/West และ carry TH จากชุดล่าสุดทั้งไฟล์ ไม่วาดซ้ำชิ้นที่รับช่วงมา
- เก็บหัวเดิมทุกเฟรม ไม่เลื่อนภาพนิ่ง ไม่สลับเฟรม ไม่ resample ภาพเพื่อสร้างท่าใหม่ การเคลื่อนไหวยังมาจากเฟรมที่วาดไว้เดิม

สคริปต์ `evidence/repair-sourcebody/repair.py` อ่านชุดรับช่วงโดยตรง รันซ้ำไม่สะสมการแก้ มี mask PNG ทุกจุด และ before/after ในโฟลเดอร์เดียวกัน การแก้9จุดเปลี่ยนเฉพาะ RGB ภายในชิ้นเสื้อผ้า รวม11,946พิกเซล; alpha ทุกพิกเซลของทั้ง96ช่องคงเดิม บันทึก WebP แบบ lossless และ `exact=True`

## ผลตรวจที่รันจริง

รันจากราก repo:

```sh
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/repair-sourcebody/run_checks.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/check_package.py
```

| การตรวจ | ผลและขอบเขต |
| --- | --- |
| `repair-sourcebody/verify.py` | 403 checks ไม่พบข้อผิดพลาด ตรวจนอกmask, alpha, เท้า y280ลงไปคงเดิม, RGBหัวเทียบ sheet ต้นฉบับจริงตรงทิศทั้ง96ช่อง และนับ generation |
| `audit_current.py` | 106 checks ไม่พบข้อผิดพลาด ตรวจ RGBA/ผัง/8เฟรมไม่ซ้ำ/ขอบโปร่งใส/พิกเซลหลุด และ decode GIF12ไฟล์เทียบ atlas รวม96เฟรม |
| เงื่อนไขระหว่างประกอบ | 52เงื่อนไข ไม่พบข้อผิดพลาด ใน `repair-report.json` ตรวจ source RGB และบริเวณการเคลื่อนไหวที่ป้องกัน |
| `check_package.py` | ขนาดจริง ไฟล์บังคับ และขอบเขต git อยู่ใน `evidence/package-check.json` |

คำสั่ง exit code และ stdout อยู่ใน `evidence/repair-sourcebody/test-results.json` ผลเหล่านี้เป็นการตรวจไฟล์/พิกเซล ไม่ใช่การรับรองคุณภาพ animation

การตรวจครั้งแรกนับgenerationได้8เพราะอ่านเฉพาะ key `calls` พลาดสองlogที่ใช้ `entries` แก้ตัวอ่านแล้วนับใหม่ได้16 เก็บผลครั้งแรกไว้ใน `first-verification.json` และอธิบายใน `check-history.json` ไม่ได้เรียกสร้างภาพเพิ่มระหว่างแก้ตัวตรวจ

จุด `[160,320]` คือ anchor ที่ก้นช่อง ฐาน alpha ของ cook เทียบ idle ได้ y319 สำหรับ TH/Asia/West และ y314 สำหรับ Cyberhell กึ่งกลางแถบรองเท้าล่าง8แถวคลาดไม่เกิน0.5px ดูค่ารายเฟรมใน `verification.json` การวัดนี้ยังไม่ยืนยันจุดสัมผัสเท้าทางกายวิภาคหรือสัดส่วนทั้งตัว

## ตรวจตามเกณฑ์รับงาน

1. **cook8เฟรมครบ4โซน:** จำนวน/ผังครบ หัวตรงต้นฉบับทุกเฟรมและฐานเท้าตรงค่าที่วัด แต่สัดส่วนลำตัว ขา สนับเข่า Cyberhell และกระเป๋า TH ยังต่างบางเฟรม จึงยังไม่ครบเงื่อนไขเป็นคนงานตัวเดิมทั้งตัวและ loop ต่อเนื่อง
2. **carryTHครบทุกทิศและalphaสะอาด:** มีside/side-left/down/up ทิศละ8เฟรม ดูทั้ง32เฟรมบนพื้นขาว/ดำ/เขียวแล้ว ไม่พบขอบแดงหรือเหลืองที่แยกจากสีผิวและลายทอง แต่รายละเอียดคอเสื้อ/ไหล่และสัดส่วนยังต้องเทียบต้นฉบับพร้อมตรวจ playback

ลองเปิด browser ผ่าน `cua.createBrowserTab` แล้วได้รับ `The browser access host is unavailable` จึงยังไม่ได้ดู GIF เล่นจริง ดูได้เฉพาะภาพนิ่งที่ถอดจาก GIF และภาพก่อน/หลัง ความต่างเชิงตัวเลขไม่ใช้ตัดสินความลื่น ตั้ง `animatedPlaybackReviewed=false`, `smoothLoopAccepted=false` และคิวเป็น `incomplete`

จุดที่ค้างคือ cyberhellซ้าย4→5, รอยต่อ8→1, กระเป๋าTHซ้ายเฟรม7เทียบข้างเคียง, และจังหวะเดินcarryTH รายละเอียดครบใน `queue-check.json` และ `evidence/repair-sourcebody/visual-review.json`

## งบสร้างภาพและประวัติ

รอบนี้ ImageGen **0ครั้ง** งบแก้สะสม **16/16ครั้ง** เก็บlogสี่ชุด ชุดละ4รายการ พร้อม SHA-256 ใน `evidence/repair-sourcebody/generation-log.json`:

- `evidence/revision/generation-log.json`
- `evidence/repair-th/generation-log.json`
- `evidence/repair-cyberhell-head/generation-log.json`
- `evidence/repair-identity/generation-log.json`

logรับช่วงระบุการวาดเดิมอีก16ครั้ง แยกจากงบแก้16ครั้ง ไม่บวกยอดสะสมของแต่ละrunซ้ำ ไม่ใช้ShadoหรือAPIอื่น

ไฟล์ใน `evidence/repair-sourcebody/` เป็นหลักฐานรอบนี้ รวมmetadataรับช่วงชื่อ `input-*` ส่วนสคริปต์และรายงานรอบก่อนเก็บเป็นประวัติ ไม่ใช่ผลตรวจปัจจุบัน ภาพวินิจฉัยเก่าที่ซ้ำถูกละออกจากแพ็กเพื่อรักษาขนาด30MB มีรายชื่อ/ขนาด/แฮชใน `omitted-historical-plates.json` generation log ยังคงอยู่
