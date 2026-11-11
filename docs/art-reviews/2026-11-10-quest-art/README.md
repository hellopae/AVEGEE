# QUEST-ART — ชุดส่งออกฉากต่อสู้ภารกิจ

ตรวจและส่งออกวันที่ 11 พฤศจิกายน 2569 ตามใบงานวันที่ 10 พฤศจิกายน 2569 รอบนี้เพิ่มไฟล์เฉพาะโฟลเดอร์นี้ ไม่มีการแก้ `src/`, `img/` หรือเทสต์เดิม และยังไม่ต่อภาพเข้าเกม

พบชุดเดิมครบและใช้ได้ทั้ง 18 ภาพ จึงคัดลอกโดยรักษาไบต์เดิมและผังเดิม ไม่วาดซ้ำ รอบนี้เรียก ImageGen **0 ครั้ง** ที่มาของงานเดิมระบุว่าใช้ ImageGen ในตัว เก็บ prompt เดิมครบใน [prompts.json](prompts.json) และบันทึกที่มาใน [provenance.json](provenance.json)

## ไฟล์ที่ส่งออก

ศัตรู PNG RGBA พื้นใส 512×512 ท่ายืนหรือลอยหนึ่งภาพต่อตัว:

| ศัตรู | ไฟล์ |
|---|---|
| เงาเจ้าหนี้ | [mob-q-debtor.png](mob-q-debtor.png) |
| เงาลูกทวงหนี้ | [mob-q-collector.png](mob-q-collector.png) |
| เงาผ้าก๊อซผืนใหญ่ | [mob-q-gauze-big.png](mob-q-gauze-big.png) |
| เงาผ้าก๊อซ | [mob-q-gauze.png](mob-q-gauze.png) |
| เงาแค้นเล่าเรื่อง | [mob-q-tale-big.png](mob-q-tale-big.png) |
| เงาแค้น | [mob-q-tale.png](mob-q-tale.png) |

ท่าไม้ตายครบสามชุด แต่ละชุดมีไอคอนวงกลม 256×256 RGBA, cutscene 1375×768 สองเฟรม และ effect RGBA หนึ่งไฟล์:

| ท่า | ไอคอนใน `skills-v1/icons/` | เฟรมใน `skills-v1/th/` | Effect ใน `skills-v1/fx/` |
|---|---|---|---|
| เนตรรอคำอนุญาต | `eyeAwaitingPermission.webp` | `kan-eyeAwaitingPermission-cut-01.webp`, `kan-eyeAwaitingPermission-cut-02.webp` | `kan-eye-reflect-512.webp` 512×512 |
| คำฝากถึงมือ | `letterDelivered.webp` | `boon-letterDelivered-cut-01.webp`, `boon-letterDelivered-cut-02.webp` | `boon-letter-glow-512.webp` 512×512 |
| ทวารบาลยืนรับแค้น | `gatekeeperStand.webp` | `guard-gatekeeperStand-cut-01.webp`, `guard-gatekeeperStand-cut-02.webp` | `guard-gate-wave-768.webp` 768×768 |

ดู [contact-sheet.jpg](contact-sheet.jpg) ซึ่งรักษาผังเดิมและมีตัวอย่างไอคอน 40 px กับ [alpha-contact-sheet.jpg](alpha-contact-sheet.jpg) ที่แสดงศัตรูบนพื้นตารางเพื่อตรวจความโปร่ง ตัวอักษรชื่อไฟล์อยู่เฉพาะแผ่นตรวจ ไม่อยู่ในภาพใช้งาน

## หลักฐานและเกณฑ์รับงาน

1. **ศัตรูหกตัว:** ตรวจครบ 512×512 RGBA มี alpha 0–255 และขอบโปร่งทุกด้านอย่างน้อย 16 px ภาพผ้าก๊อซเป็นม่าน/แถบผ้าตาข่ายไม่มีร่างผู้ป่วย ศพ หรือจีวร เงาแค้นไม่มีใบหน้าคน สีและเงารูปทรงเข้ากลุ่มปีศาจเดิม รายละเอียดภาพละเอียดกว่า sprite เก่าบางตัว ดู [ผลตรวจภาพ](visual-review.md)
2. **ท่าใหม่สามท่า:** ครบไอคอน 3 ภาพ cutscene 6 เฟรม effect 3 ภาพ ตรวจใบหน้าและเครื่องแต่งกายเทียบไฟล์จริงที่ `src/zone-introductions.js` และ `src/art.js` เลือกใช้ ซาโตริหมวกม่วง เกรซผิวฟ้าเขาม้วนผมขาวชุดคลุมแดงรุ่น `-f` และยักษ์ผิวเขียวเขี้ยวเกราะดำทองยังคงเอกลักษณ์เดิม ไม่พบข้อความที่อ่านได้จากการเปิดตรวจภาพทั้ง 18 ไฟล์
3. **เทสต์เมื่อต่อเกม:** ไม่ใช้เกณฑ์นี้ในรอบนี้ เพราะเป็นงานส่งออกอย่างเดียวและยังคง placeholder เดิม ผลเทสต์ที่รันเพิ่มเติมบันทึกใน [test-summary.json](test-summary.json) ชุดที่เจาะจงภารกิจและอาร์ต 4 ไฟล์จบด้วย 56 tests, pass 56, fail 0, exit 0 ส่วนชุดเต็มถูกหยุดก่อนสรุป จึงไม่อ้างว่าผ่านทั้งหมด

[technical-checks.json](technical-checks.json) เก็บขนาด รูปแบบ alpha ขอบโปร่ง SHA-256 รายไฟล์ และ hash ภาพอ้างอิง ยืนยันสำเนาภาพเดิมตรงกัน 18/18 และ prompt ทั้ง 18 รายการนำหน้าด้วยบล็อกสไตล์จาก `ASSET-PROMPTS.md` ขนาดโฟลเดอร์รวมหลักฐานต่ำกว่า 40,000,000 bytes

รันตรวจไฟล์ซ้ำจากราก repository ได้ด้วย `python3 docs/art-reviews/2026-11-10-quest-art/verify-export.py` ต้องมี Pillow และอ่านโฟลเดอร์ต้นทางเดิมได้ สคริปต์เขียนเฉพาะ `technical-checks.json` ในโฟลเดอร์นี้

[queue-check.json](queue-check.json) ใช้ `ready` สำหรับชุดส่งออกที่ครบและตรวจแล้ว สถานะนี้ไม่ใช่ผลทดสอบการเล่นจริงหรือคำอนุมัติ ship งานต่อเกมและการตรวจวัฒนธรรมก่อน ship เป็นขั้นรับช่วงภายหลังตามสเปกเดิม
