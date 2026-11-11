# คนงานพ่อครัว — รอบแก้ 20261111T170902Z

สถานะ **incomplete** ตาม `queue-check.json` มีชิ้นงานขั้นต่ำครบ แต่ยังไม่รับรองความต่อเนื่องจาก GIF เล่นจริงและสัดส่วนทั้งตัว จึงยังไม่พร้อมส่งคิวใช้งาน

รับชุดล่าสุดจาก `20261111T165435Z-427eb5ef` เป็นฐาน ไม่วาดใหม่ ไม่เรียก ImageGen เพิ่ม ใช้งบแก้สะสม **16/16 ครั้ง** เก็บ generation log เดิมทั้งหมดและสรุปจำนวนจริงใน `loop-review.json` และ `evidence/repair-neck/generation-log.json`

## สิ่งที่แก้รอบนี้

- ประกอบคอเสื้อและไหล่ส่วนบนจากต้นฉบับ `worker-*-sheet-v2.webp` ในพิกัดเดิม 320×320: TH cook สองทิศ, Cyberhell cook ซ้าย และ TH carry side/side-left รวม 40 ช่อง
- แก้รอยต่อใต้หัว โดยล็อก support ของชิ้นหัวเดิม และป้องกันมือ/ข้าวพร้อมขอบเส้น 3px บริเวณ y182 ลงไป รวมอุปกรณ์ ลำตัวช่วงล่าง และขาเดิน คง RGBA เดิมทุกพิกเซล ไม่เลื่อนหรือยืดเฟรม ไม่ใช้ภาพนิ่งแทนท่าเคลื่อนไหว
- เปลี่ยน 7,133 พิกเซล รวม alpha 5,643 พิกเซล เฉพาะ mask คอเสื้อ; เพิ่มพื้นที่ alpha>40 ที่เชื่อมกับตัว 541 พิกเซล ไม่ลบ silhouette alpha>40 เดิม ขอบและ alpha นอก mask คงเดิม
- คง cook Asia/West ทั้งไฟล์ รวม Cyberhell ขวา และ carry TH down/up แบบ decoded RGBA เดิม ไม่วาดซ้ำ
- สร้าง GIF ใหม่จาก atlas ส่งจริงเฉพาะ 5 แถวที่แก้ และสร้างภาพเทียบ/แผ่นตรวจใหม่ทั้งหมดด้วย audit

สคริปต์ `evidence/repair-neck/repair.py` อ่านฐานล่าสุดโดยตรง รันซ้ำไม่สะสมการแก้ มี mask PNG, foreground protection และ before/after ที่ 4→5 กับ 8→1 เก็บไว้ในโฟลเดอร์เดียวกัน การประกอบนี้แก้เฉพาะคอเสื้อ ไม่ถือเป็นการแก้สัดส่วนทั้งตัวสำเร็จ

## ชิ้นงานและผัง

| ไฟล์ | ข้อมูล |
| --- | --- |
| `worker-{th,asia,west,cyberhell}-cook-v1.webp` | RGBA lossless 2560×640; แถว0 ขวาล่าง แถว1 ซ้ายล่าง; แถวละ8เฟรม |
| `worker-th-carry-v1.webp` | RGBA lossless 2560×1280; แถว0 side แถว1 side-left แถว2 down แถว3 up; แถวละ8เฟรม |
| `worker-cook.json` | zone/anim/dir/file/row, frames=8, frameW/H=320, fps=8, foot=[160,320] |
| `preview/*.gif` | 12ลูป รวม96เฟรม; 120/130ms สลับกัน เฉลี่ย8fps; loop=0 |
| `preview/index.html` | หน้าเปิด GIF จริงขนาด320×320 |
| `compare-<zone>.jpg` | ต้นฉบับ idle/walk ตรงทิศเทียบเฟรมส่งจริง สเกล1ต่อ1 |
| `loop-review.json`, `queue-check.json`, `evidence/` | ผลตรวจ ข้อจำกัด และ log |

อ่านผังจาก `src/workers.js`: idle=แถว0, walk side=1 (กลับด้านตาม face), down=4, up=5 ไม่แก้ไฟล์เกมและไม่ติดตั้งเข้า `img/` อีกสามโซนของ carry เป็นทางเลือก จึงไม่เพิ่มในรอบนี้

## คำสั่งตรวจ

รันจากราก repo:

```sh
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/repair-neck/run_checks.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/check_package.py
```

- `verify.py`: ตรวจ decoded pixels ทั้ง96ช่อง เทียบหัวกับภาพ sheet ต้นฉบับจริงตรงทิศ ตรวจนอกmask, การป้องกันมือ/ข้าว, y182ลงไป, ฐานเท้า และนับ log16รายการ ไม่ใช้จำนวนความต่างภาพตัดสินความลื่น
- `audit_current.py`: ตรวจจำนวน/ผัง/RGBA, 8เฟรมไม่ซ้ำ, ขอบโปร่งใส, alphaหลุด และถอด GIF12ไฟล์เทียบ atlasครบ96เฟรม พร้อมสร้าง compare และแผ่น alpha
- `check_package.py`: ตรวจไฟล์บังคับ ขนาดจริงไม่เกิน30,000,000bytes และ gitเปลี่ยนเฉพาะโฟลเดอร์นี้
- ผล exit code/stdout อยู่ใน `evidence/repair-neck/test-results.json` ผลขนาดและ SHA-256 อยู่ใน `evidence/package-check.json` ทั้งหมดเป็นการตรวจไฟล์/พิกเซล ไม่ใช่การรับรองคุณภาพ animation

รอบตรวจแรกพบ alphaหลุดจากขอบmaskใน4แถว แก้โดยไม่ตัดsilhouetteเดิม และไม่รับส่วนเพิ่มที่ไม่เชื่อมกับตัว เก็บผลครั้งแรกใน `first-test-results.json`, `first-audit.json` และบันทึกลำดับแก้ใน `check-history.json`

`foot=[160,320]` เป็น anchorที่ก้นช่อง ฐานalphaของcookเทียบidleคือ TH/Asia/West y319, Cyberhell y314 เท้าy280ลงไปทุกช่องคงเดิม กึ่งกลางsole bandยังตรงต้นฉบับในค่าคลาดที่วัด การตรวจนี้ไม่ยืนยันสัดส่วนทางกายวิภาคหรือความพอดีของcarryกับrenderer: walk down/upเดิมมีfit scale/dxในโค้ด จึงยังต้องทดสอบจุดเสียบโดยผู้ทำFOOD-SYSTEM

## ตรวจตามเกณฑ์รับงาน

1. **cook8เฟรมครบ4โซน:** จำนวนและผังครบ หัวตรงต้นฉบับและคงเดิมทั้งลูป ฐานเท้าคงเดิม แต่ Cyberhellยังมีช่วงขา/สนับเข่าต่างจากidleและทรงตัวเปลี่ยนที่4→5; กระเป๋าTHซ้ายยังสลับด้านระหว่างเฟรม7กับเฟรมอื่น จึงยังไม่ครบเงื่อนไขตัวเดิมทั้งสัดส่วนและloopต่อเนื่อง
2. **carryTHครบทุกทิศ/alpha:** มีside/side-left/down/upทิศละ8เฟรม การเคลื่อนไหวเดิมยังอยู่ ไม่พบalphaหลุดตามตัวตรวจ ดูภาพแผ่นalphaที่ระบุในvisual-reviewแล้วไม่พบขอบแดง/เหลืองใหม่จากการแก้ แต่สัดส่วนและจังหวะเดินยังไม่รับรองจากplaybackจริง

พยายามเปิดbrowserด้วย `cua.createBrowserTab` ในรอบนี้ ได้ `The browser access host is unavailable` จึง **ยังไม่ได้ดูGIFเล่นจริง** แม้จะถอดทุกเฟรมตรวจได้ ตั้ง `animatedPlaybackReviewed=false`, `smoothLoopAccepted=false` และคิว `incomplete` ไม่สรุปจากภาพนิ่งว่าloopผ่าน

## งบและหลักฐานรับช่วง

รอบนี้ ImageGen0ครั้ง ไม่ใช้ShadoหรือAPIอื่น Logที่นับงบแก้คือ `revision`, `repair-th`, `repair-cyberhell-head`, `repair-identity` ชุดละ4รายการ รวม16 รายงานสะสมในrunอื่นไม่ใช่generationใหม่ จึงไม่บวกซ้ำ การวาดเดิมอีก16ครั้งแยกจากงบแก้ตามlogรับช่วง

ไฟล์ใน `evidence/repair-neck/` เป็นหลักฐานรอบนี้ ชื่อ `input-*` เป็นmetadataฐานก่อนแก้ สคริปต์/รายงานโฟลเดอร์อื่นเป็นประวัติและอาจอ้างพิกัดหรือworktreeเก่า ไม่ใช่ผลตรวจปัจจุบัน อย่ารันสคริปต์ประกอบเก่าเพื่อสร้างแพ็กปัจจุบัน

สิ่งที่ยังค้างระบุใน `queue-check.json` และ `loop-review.json` ต้องตรวจการต่อ4→5, 8→1 รวมท่าตัก/ปั้น/วางและเดินจริง และเก็บสัดส่วน/รายละเอียดประจำด้านก่อนเปลี่ยนสถานะready ไม่ได้แก้ `src/`, `tests/`, `img/`, hooks หรือไฟล์สถานะของระบบ ไม่สร้างหรือสลับbranch ไม่commit/push/merge/deploy
