# STORY-ART-B — สีดา · หนุมาน · ยามาพุ่งชนไฟ

วันที่ 13 พฤศจิกายน 2569 · ชุดภาพส่งตรวจใน worktree ของ run นี้

สร้างด้วย **ImageGen ในตัว 8 ครั้ง / งบไม่เกิน 16 ครั้ง**, retry **0 ครั้ง** (เพดาน 2) แต่ละภาพสร้างแยก ใช้ sprite ที่ได้เป็น reference สำหรับ portrait และ cutscene เพื่อคงใบหน้าและชุด ไม่มีภาพจากสื่อภายนอก

## ไฟล์ส่งมอบ

| ไฟล์ | ขนาด (พิกเซล) | การใช้งาน / พื้นหลัง |
| --- | --- | --- |
| `soul-sita-th.webp` | 1254×1254 | วิญญาณสีดายืน ลำตัวลงท้ายเป็นหางวิญญาณ / โปร่งใส |
| `soul-sita-th-profile.webp` | 1254×1254 | Portrait สีดา ใบหน้าและชุดเดียวกับ sprite / โปร่งใส |
| `boss-hanuman-th.webp` | 512×512 | Sprite หนุมานศึก ขนขาว หางขาว เครื่องทรงไทย / โปร่งใส |
| `boss-hanuman-th-profile.webp` | 512×512 | Portrait หนุมาน เครื่องทรงเดียวกับ sprite / ฉากวัดนรก |
| `cut-hanuman-descends-th.webp` | 1375×768 | หนุมานลงจากฟ้ามาช่วยสีดา / ภาพเต็มฉาก |
| `skill-yama-fire-charge-cut-01.webp` | 1375×768 | ยามาตั้งหลัก รวบไฟรอบตัว ถือดาบ / ภาพเต็มฉาก |
| `skill-yama-fire-charge-cut-02.webp` | 1375×768 | ยามาพุ่งทั้งตัวเข้าชนยมทัต ถือดาบถอยข้างตัว / ภาพเต็มฉาก |
| `skill-yama-fire-charge-icon.webp` | 256×256 | ไอคอนวงกลมท่าพุ่งชนไฟ เห็นหน้า ชุด และดาบ / นอกวงกลมโปร่งใส |

ภาพรวม: [contact-sheet.webp](contact-sheet.webp) (1680×760; ชื่อไฟล์และขนาดอยู่ใต้ภาพสำหรับตรวจงานเท่านั้น)

## หลักฐานอ้างอิงและการเลือกขนาด

- อ่านสเปกเจ้าของงาน `2026-11-13-avegee-z1-events-owner-spec.md`: เหตุสีดา/หนุมานหลังคดี 12 และท่าพุ่งชนไฟในบททดสอบยมทัตหลังคดี 15 ใช้เป็นบริบทภาพ ไม่มีการแก้ event หรือระบบเกมในงานนี้
- ตรวจภาพเกม `img/zone-boss-cutscene.webp`, `img/story-th-01.webp` ถึง `05`, `img/Intro-Boss-Zone1.webp`, `img/boss-frontier-th.webp`, `img/boss-frontier-th-cutscene.webp` และ `img/deva-intro/deva-intro-th-beggar-v2.webp`
- Sprite สีดาอ้างอิง `img/Thai/spirit-woman-th-v2.webp` ขนาด 1254×1254 ทั้งสัดส่วนหัว ลำตัว และหางวิญญาณ ใช้สีฟ้าเทาอ่อน เครื่องทรงสีงาช้างทอง สีหน้าสงบเศร้าและสง่างาม
- Portrait สีดาเลือก 1254×1254 ตามไฟล์วิญญาณหญิงที่ห้องสอบสวนใช้อยู่: `src/soul-portraits.js` คืนคีย์ `spirit-woman`, `src/regional-spirits.js` map สู่ไฟล์ดังกล่าว และ `src/ui.js` ใช้ภาพวิญญาณในห้องสอบสวน ไม่มี portrait สีดาเดิมหรือขนาด portrait วิญญาณแยกให้คัดลอก จึงคง canvas เดียวกัน แต่จัดภาพครึ่งตัวสำหรับไฟล์ `-profile`
- Sprite หนุมานใช้ canvas 512×512 ตาม `img/boss-frontier-th.webp`; portrait ใช้ 512×512 ตาม `img/hero-boss-profile.webp` หนุมานเป็นลิงเผือกผู้กล้าหาญและภักดี ภาพศึกแสดงเขี้ยวตามท่ารบ ส่วน portrait ปิดปากสงบและฉากลงจากฟ้าแสดงการยื่นมือช่วยสีดา
- ยามายึดหน้าแดง เขาสั้น หูแหลม มงกุฎทอง ชุดดำขลิบทอง ด้านในแดงจาก `story-th-03/04` และดาบจาก `img/yama-sword-v3/hero-yama-th-sword.webp` เฟรม 02 และไอคอนใช้ภาพที่สร้างก่อนหน้าเป็น reference ต่อเนื่อง
- ชุด prompt เต็มและ reference รายภาพ: [prompts.json](prompts.json)

## การส่งออกและการตรวจไฟล์

ภาพทุกไฟล์ส่งออก WebP: RGB แบบ lossy **q86**, alpha **lossless** (`cwebp -q 86 -m 6 -alpha_q 100 -alpha_method 1 -alpha_filter best -exact -metadata none`) ปรับ canvas ด้วย center-fit LANCZOS เท่าที่จำเป็น ไม่มีการวาดแก้ด้วยโค้ด ไม่มีตัวอักษรที่ตั้งใจใส่ในภาพหลักทั้ง 8 ภาพ

ระหว่าง export เปรียบเทียบ alpha ก่อนเข้ารหัสกับ WebP ที่ถอดรหัสกลับทุกพิกเซล ผลต่างสูงสุดเป็น **0 ทั้ง 8 ไฟล์** เก็บขนาดต้นฉบับ ขนาดส่งออก ตัวเลือก encoder, SHA-256 และผล alpha ไว้ใน [export-checks.json](export-checks.json) ค่า q ไม่สามารถอ่านย้อนจาก WebP เป็นค่าต้นฉบับได้ จึงเก็บคำสั่ง encoder ที่ใช้จริงไว้เป็นหลักฐาน

รันซ้ำได้จาก root ของ repo (ต้องมี Python และ Pillow):

```sh
python3 docs/art-reviews/2026-11-13-story-art-b/verify-assets.py
git diff --check
```

ตัวตรวจเช็กไฟล์หลักครบ 8 ชื่อ ขนาดจริง รูปแบบ WebP, RGB lossy, alpha channel และ alpha chunk แบบไม่ลดระดับความละเอียด, มุมโปร่งใส, hash ตรงบันทึกส่งออก, contact sheet, README และงบ ImageGen ตัวตรวจใช้บันทึกการเปรียบเทียบ alpha ตอน export; ไม่ได้บรรจุ PNG ต้นทางไว้ในชุดส่งมอบ

ผลรันจริง: `verify-assets.py` จบด้วย exit 0 (ตรวจภาพหลัก 8 ไฟล์และไฟล์ประกอบครบ) และ `git diff --check` จบด้วย exit 0 ตรวจ whitespace ของไฟล์ข้อความใหม่แยกด้วย `git diff --no-index --check /dev/null <file>` เนื่องจากไฟล์ชุดนี้ยังเป็น untracked รอ wrapper จัดการ Git ต่อ

ตรวจภาพด้วยตาระหว่าง generation และตรวจ contact sheet หลังส่งออก เพื่อดูหน้า ชุด ท่าทาง ดาบ และองค์ประกอบภาพ การตรวจนี้เป็นการตรวจไฟล์และภาพส่งมอบตาม brief **ยังไม่ได้ทดสอบภาพในเกมหรือรับรอง QA** ไม่มีการเปลี่ยน manifest, alias, เนื้อเรื่อง หรือโค้ด runtime ผู้รับงาน integration ต้องผูกไฟล์ในชุดนี้กับเกมต่อ

## Self-check ตามเกณฑ์

- [x] สีดา: sprite ยืนวิญญาณและ portrait ครบ ใบหน้า/ชุดสัมพันธ์กัน ขนาดตามวิญญาณหญิงต้นแบบ
- [x] หนุมาน: sprite ศึก 512×512, portrait 512×512 และ cutscene ลงจากฟ้า 1375×768 ครบ ขนขาว เครื่องทรงไทย บทผู้มาช่วยสีดา
- [x] ยามา: รวบไฟ/พุ่งชน 2 เฟรม 1375×768 และไอคอนวงกลม 256×256 ครบ ใช้หน้าและชุดเดิม ถือดาบ
- [x] WebP ครบชื่อที่ระบุ RGB q86 และ alpha lossless พร้อมผลเทียบ alpha
- [x] ภาพหลักไม่มีข้อความที่ตั้งใจใส่ ใช้ต้นแบบใน repo และสร้างสีดา/หนุมานอย่างเคารพ
- [x] งบ 8/16 generations, retry 0/2; ส่งมอบในโฟลเดอร์นี้ พร้อม contact sheet, README ไทย, prompts และตัวตรวจไฟล์
- [x] ทำใน worktree/branch ที่ได้รับ ไม่สร้างหรือเปลี่ยน branch ไม่แก้ hooks, `status.json`, `worklog.json` ไม่เรียก agent อื่น และไม่ commit/push/merge/deploy

ข้อจำกัด: การไม่มีอักขระหลงจากโมเดล การประเมินความเหมือนใบหน้า และความเหมาะสมเชิงวัฒนธรรมเป็นผลตรวจภาพด้วยตา ไม่ใช่ข้อพิสูจน์จากตัวตรวจขนาดไฟล์ ต้องให้เจ้าของงานพิจารณาภาพก่อน integration
