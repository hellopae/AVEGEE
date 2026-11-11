# คนงานปั้นข้าวปั้น — รอบแก้ 11 พ.ย. 2569

สถานะ **incomplete** ตาม `queue-check.json` — มีชิ้นงานครบจำนวน แต่หัว/ใบหน้า/สัดส่วน รายละเอียดประจำด้าน และ loop ยังไม่ครบเกณฑ์ จึงยังไม่พร้อมเสียบเข้าเกม

รอบนี้นำเข้าชุดล่าสุด `20261111T062023Z-88672152` และแก้ **ภาพจริง TH cook ทั้งสองทิศ รวม 16 เฟรม** ด้วย ImageGen ในตัว 4 ครั้ง ครั้งละ 4 เฟรม ใช้ตัวเดิมตรงทิศและเฟรมก่อนหน้าเป็น reference พร้อมรักษาท่าตักข้าว → ปั้น → วาง → คืนมือ ไม่มีการสร้าง motion ด้วยการเลื่อนหรือเฟดภาพเดียว ดู prompt ทั้งสี่และผลต้นทางที่ [evidence/repair-th/generation-log.json](evidence/repair-th/generation-log.json)

โควตารอบเดิมใช้หมด 16 ครั้งแล้ว รอบแก้ใหม่ก่อน run นี้ใช้ 4 ครั้ง รอบนี้อีก 4/4 ครั้ง รวมรอบแก้ **8/16 ครั้ง** เหลือร่วม 8 ครั้งสำหรับ run ต่อไป ไม่ใช้ Shado หรือ API ภายนอก ไม่มีการวาด carry ทางเลือกเพิ่ม

## ไฟล์และผังเดิม

| ไฟล์ | RGBA | แถวบนลงล่าง |
| --- | --- | --- |
| worker-th-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-asia-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-west-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-cyberhell-cook-v1.webp | 2560×640 | down-right, down-left |
| worker-th-carry-v1.webp | 2560×1280 | side, side-left, down, up |

ทุกแถว 8 เฟรม ช่องละ 320×320, 8 fps, draw anchor `foot:[160,320]` ตาม [worker-cook.json](worker-cook.json) รวม 96 ช่อง GIF ใน `preview/` ครบ 12 แถว แถวละ 8 เฟรม เวลา 120/130 ms สลับกัน รวม 1 วินาทีต่อรอบ วนไม่จำกัด GIF มีพื้นเทา ส่วน WebP โปร่งใสจริง ไม่มีโต๊ะหรือเคาน์เตอร์ใน sprite

อ่าน `src/workers.js` ยืนยันว่าทิศ side ใช้ row1 และ renderer mirror ตาม face; down row4 และ up row5 ภาพ `evidence/renderer-fit-*.jpg` จำลอง inset/fit ของ renderer ออฟไลน์เพื่อดูสัดส่วน ไม่ใช่ภาพทดสอบในเกม ต้นฉบับ TH ทิศซ้ายเป็นภาพกลับด้านตาม renderer; prompt ระบุข้อยกเว้นให้กระเป๋าอยู่ข้างเดิมของร่างกาย แต่ผลบางเฟรมยังไม่ทำตาม

ตำแหน่งที่ Toby จะใช้ภายหลังคือ `img/workers/worker-<zone>-cook-v1.webp` และ `worker-<zone>-carry-v1.webp` รอบนี้ยังไม่มี carry asia/west/cyberhell ซึ่งเป็นทางเลือก ไม่มีไฟล์ใดติดตั้งเข้า `img/`

## ผลแก้และจุดเท้า

- TH cook วาดแยกทั้งสองทิศแล้ว ทิศซ้ายไม่ใช่ byte mirror ของขวา พื้นผิวหน้าและรูปหัวเข้าใกล้ source มากกว่าชุดก่อน แต่ยังไม่ใช่หัว/ใบหน้าเดิมตรงกันทุกเฟรม ดู [ภาพก่อนและหลัง](evidence/repair-th/before-after-th.jpg) และ [compare-th.jpg](compare-th.jpg)
- บรรจุโดยแยก 2×2 ช่องจาก ImageGen แล้วย่อทั้งตัวแบบคงอัตราส่วนให้ใกล้ความสูง source TH 308 px และจัด silhouette แถบเท้าให้อยู่กลางช่อง x160 ฐาน y319 ไม่ยืดส่วนหัวแยก ไม่ตัดหัวต้นฉบับมาแปะ ไม่สร้างเฟรมใหม่จากภาพนิ่ง ผลอ่าน WebP จริงสูง 308–309 px ทั้ง 16 ช่อง ดู [packing.json](evidence/repair-th/packing.json)
- การ resample มีเศษ alpha 1/255 ที่ gutter บน/ซ้าย/ขวา จึงเว้น gutter 1 px โดยตรวจว่าพิกเซลนั้นมี alpha ไม่เกิน 1 และไม่มี solid artwork ถูกตัด ขอบล่างคงไว้ตามฐาน TH เดิม
- cyberhell **คงภาพแก้รอบก่อนครบ 16 เฟรม** ตรวจจากไฟล์ส่งมอบอีกครั้ง alpha>40 ล่างสุด **y314** ตรง source idle y314 จึงรักษาผลแก้ความต่างแนวตั้งเดิม 5 px ไว้ ไม่วาดซ้ำ
- ยังไม่รับรองจุดสัมผัสเท้าทางกายวิภาคหรือแกน X: anchor/ขอบ silhouette ไม่พิสูจน์ความตรงกันของฝ่าเท้า และ source idle เดิมเลื่อนระหว่างคอลัมน์
- WebP อื่น 4 ไฟล์ และ GIF อื่น 10 ไฟล์ SHA-256 ตรงชุดรับเข้า ตรวจใน `evidence/current-audit.json`

## ตรวจภาพจริงและข้อค้าง

| ชุด | ผลที่เห็นจาก source/compare และเฟรมที่ถอดจาก GIF |
| --- | --- |
| TH cook | หัวแคบลงและพื้นผิวใกล้ source ขึ้น แต่หัวสองทิศไม่เท่ากัน รูปตา/ไหล่ยังเปลี่ยนระหว่างชุด 4→5 และ 8→1; ซ้ายเฟรม 7 มีกระเป๋าโผล่ข้างใกล้ต่างจากเฟรมอื่น |
| asia cook | หน้า/ตาและเส้นขอบยังเรียบกว่าต้นฉบับ ช้อนคืนท่าที่ 8→1 และรายละเอียดด้านเดียวถูก mirror |
| west cook | หัวเล็กกว่าต้นฉบับ stance เปลี่ยนช่วง 7–8; กระเป๋าสองทิศ mirror |
| cyberhell cook | ฐาน y314 ครบ แต่หัว/กระเป๋าเปลี่ยนช่วง 4→5 รายละเอียดประจำด้านและคืนมือ 8→1 ยังค้าง |
| TH carry | ครบ side, side-left, down, up อย่างละ 8 เฟรม ขาเปลี่ยนจริง ถาดมีข้าวปั้น 2 ก้อน; หัว/ใบหน้าและสัดส่วนยังต่าง source โดยเฉพาะเมื่อเทียบ fit ของทิศ down/up |

ดูภาพเรียง GIF ปัจจุบันครบ 12 แถว/96 เฟรม (`evidence/decoded-*.jpg`) และภาพเปรียบเทียบทั้งสี่โซนแล้ว ตรวจ alpha TH cook ใหม่ 16 เฟรมและ TH carry 32 เฟรมบนขาว/ดำ/เขียวครบ 12 แผ่น ไม่เห็นขอบแดงหรือเหลืองผิดปกติในภาพที่ดู สีแดงผิว/สีทองชุดเป็นสีตัวละคร ข้อมูลตัวเลขที่นับ candidate สีขอบไม่ใช่ข้อพิสูจน์ว่ามี fringe

**ยังไม่ได้ดู playback ต่อเนื่องหรือทดสอบในเกม จึงไม่รับรอง loop ลื่น** การถอด GIF/ตรวจเวลายืนยันเพียงโครงสร้างและความตรงกับ sheet และภาพเรียงก็แสดงรอยต่อที่ยังไม่รับงาน ค่าเฉลี่ย RGB ของ TH รอยต่อ 8→1 เปลี่ยนจาก 19.3741 เป็น 30.2087 (ขวา) และ 22.7911 (ซ้าย) จึงไม่มีหลักฐานว่ารอบแก้นี้ทำให้ loop ดีขึ้น แม้ลักษณะหัวเข้าใกล้ source แล้ว

## Self-check ตามเกณฑ์

| เกณฑ์ | ผล |
| --- | --- |
| 1. cook 8 เฟรมครบ 4 โซน loop ต่อเนื่องและตัวเดิมทุกเฟรม | จำนวนและสองทิศครบ ฐาน cyberhell ตรงแล้ว แต่ identity/สัดส่วน/รายละเอียดด้านเดียว/ตำแหน่งเท้าทางกายวิภาค/loop ยังไม่ครบ → incomplete |
| 2. carry TH ทุกทิศ ขอบ alpha สะอาด | ครบ 4 ทิศ×8 เฟรม ดูขอบครบไม่เห็น fringe ผิดปกติ แต่การรักษาหน้า/สัดส่วนตามคำสั่งรอบแก้ยังค้าง → incomplete |
| รอบแก้ล่าสุด | แก้ภาพจริง TH โดย ImageGen 4 ครั้ง คง cyberhell ที่แก้ y แล้ว เก็บ reference/prompt/raw output และบันทึกสิ่งที่ยังไม่ตรง |
| ขอบเขตและแพ็กเกจ | เฉพาะโฟลเดอร์ส่งออก มี README ภาษาไทย/manifest/GIF/compare/รายงาน ขนาดและขอบเขตจริงอยู่ `evidence/package-check.json` |

## ตรวจที่รันจริง

จากราก repo ด้วย Python 3, Pillow, NumPy, SciPy:

```sh
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/repair-th/pack_th.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/audit_current.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/review_registration.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/check_package.py
git diff --check
```

ผลโครงสร้าง 121 เงื่อนไขไม่พบข้อผิดพลาด: WebP RGBA/ผัง/เฟรมต่างกันจริง, GIF 8 เฟรม/เวลา/วน, pixel error จาก palette <3/255 ทุกเฟรม และ baseline cyberhell y314 ผลนี้ไม่ใช่การรับรองงานภาพหรือ QA เกม ไม่มีการรัน tests เกมเพราะไม่ได้แก้โค้ดเกม

รายงานปัจจุบันคือ `loop-review.json`, `queue-check.json`, `evidence/current-audit.json`, `evidence/registration-review.json`, `evidence/package-check.json` และ `evidence/repair-th/` ส่วน `evidence/revision/` เป็นประวัติแก้ cyberhell รอบก่อน raw generated/target ของรอบก่อนเก็บที่ worktree รับเข้าเพื่อลดขนาดแพ็กเกจ รายการและตำแหน่งอยู่ `evidence/revision/external-raw-provenance.json` log/prompt/hash เดิมยังอยู่ ส่วน raw output และ reference ของรอบนี้เก็บ WebP lossless พร้อมยืนยัน RGBA เท่าต้นทางใน `evidence/repair-th/storage.json` ไฟล์ prior/input/previous/latest และ inspect_assets.py เป็นประวัติเก่า

ทำงานบน worktree/branch ที่ได้รับเท่านั้น ไม่สร้างหรือสลับ branch/worktree ไม่ commit/push/merge/deploy ไม่แก้ src/, tests/, img/, hooks, status.json, worklog.json หรือโฟลเดอร์คุณเป้ และไม่เรียก agent อื่น
