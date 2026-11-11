# คนงานปั้นข้าวปั้น — รอบตรวจ 11 พ.ย. 2569

**สถานะ `incomplete` — ยังไม่ได้วาดแก้หน้า/สัดส่วนในรอบนี้ และยังใช้แทนภาพในเกมตามเกณฑ์ไม่ได้**

นำเข้าชุดล่าสุดจาก `20261111T022930Z-b006be7f` เก็บ WebP 5 ไฟล์และ GIF 12 ไฟล์ตรง SHA-256 ทุกไฟล์ เพิ่มหลักฐานเทียบที่รวม inset/fit ตาม renderer จริง 8 แผ่น พร้อมค่าพิกเซลและสคริปต์ตรวจซ้ำ ไม่มีการเปลี่ยน sprite เดิมด้วยการเลื่อน เฟด หรือดัดสัดส่วน

## โควตาและงานวาดที่ยังค้าง

ใบงานระบุ **ImageGen ≤16 ครั้ง** และ log การสร้างเดิมใน [prior-loop-review.json](evidence/prior-loop-review.json) ใช้ครบ 16 แล้ว รอบนี้ส่งคำถามว่ามีโควตาแก้ใหม่หรือให้นับรวมเดิม ยังไม่มีคำตอบ ณ เวลารายงาน จึงใช้ ImageGen ใหม่ **0 ครั้ง** ไม่มี prompt สร้างใหม่ ไม่ใช้ Shado หรือ API ภายนอก และไม่อ้างว่าคัดลอกภาพเดิมเท่ากับวาดแก้แล้ว ข้อจำกัดนี้มาจากเพดานในใบงาน ไม่ใช่ข้อบังคับขออนุมัติของ skill

## ไฟล์ส่งมอบที่รักษาไว้

| ไฟล์ | ขนาด RGBA | แถวบนลงล่าง |
| --- | --- | --- |
| `worker-th-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-asia-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-west-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-cyberhell-cook-v1.webp` | 2560×640 | down-right, down-left |
| `worker-th-carry-v1.webp` | 2560×1280 | side, side-left, down, up |

ทุกแถวมี 8 เฟรม ช่องละ 320×320, 8 fps, `foot:[160,320]` ตาม [worker-cook.json](worker-cook.json) รวม 96 ช่อง GIF แยกทุกแถวอยู่ใน `preview/` รวม 12 ไฟล์ เวลาเฟรมสลับ 120/130 ms รวมรอบละ 1 วินาที วนไม่จำกัด carry ของ asia/west/cyberhell ยังไม่มี เป็นส่วนตามงบของใบงาน

ลำดับ cook เดิมมีตักข้าว ส่งลงมือ ปั้น กด ยื่นลงวาง แล้วคืนท่าเริ่ม ไม่มีโต๊ะใน sprite ข้าวปั้นเป็นสามเหลี่ยมห่อสาหร่าย ตำแหน่งเสียบที่ Toby จะใช้ยังเป็น `img/workers/worker-<zone>-cook-v1.webp` และ `worker-<zone>-carry-v1.webp` งานนี้ส่งออกเฉพาะโฟลเดอร์ review

## ตรวจตัวละคร ขนาด และจุดเท้า

[compare-th.jpg](compare-th.jpg), [compare-asia.jpg](compare-asia.jpg), [compare-west.jpg](compare-west.jpg), [compare-cyberhell.jpg](compare-cyberhell.jpg) แสดงช่องต้นฉบับจริงและภาพส่งมอบขนาด 320×320 ใช้ inset ตัดเศษช่องข้างเคียง แต่ภาพชุดนี้ไม่รวม fit

หลักฐานเพิ่มรอบนี้คือ `evidence/renderer-fit-*.jpg` รวม 8 แผ่น: cook ทั้ง 4 โซนและ carry TH ทั้ง 4 ทิศ ใช้สูตรเดียวกับ `drawWorker` สำหรับ inset, scale, dx และ face ที่ความสูงวาด 320px มีพื้นที่รอบนอกเพื่อไม่ตัดส่วนที่ขยาย จุด anchor ของภาพตรวจคือ `[192,352]` หลังเผื่อพื้นที่ ไม่ใช่การเปลี่ยน anchor ของ asset เส้นแนวนอนสีน้ำเงินแสดงฐานวาด ภาพเป็นการจำลองแบบออฟไลน์ด้วย Pillow จึงมีการกรองพิกเซลต่างจาก browser canvas และไม่ใช่ผลทดสอบในเกม

| โซน/ท่า | สิ่งที่เห็นจากภาพเทียบและเฟรมเรียง |
| --- | --- |
| th cook | หัวกว้างกว่า source ลำตัวสั้นกว่า และหน้า/มุมหมวกเปลี่ยนช่วง 4→5 |
| asia cook | หน้า/ตาและเส้นขอบเรียบกว่าต้นฉบับ ยังรับรองว่าเป็นตัวเดิมทุกเฟรมไม่ได้ |
| west cook | หัวเล็กกว่า ช่วงตัว/ขาเด่นกว่า source; ท่ายืนช่วง 7–8 เปลี่ยน |
| cyberhell cook | หัวเล็กและลำตัว/ขายาวกว่า source; จุดเท้ามีความต่างเชิงพิกเซลตามด้านล่าง |
| th carry | ครบ side, side-left, down, up อย่างละ 8 เฟรม; หน้า/สัดส่วนยังต่าง แม้เทียบกับ source down/up ที่รวม fit แล้ว |

ผลวัดใหม่ใน [registration-review.json](evidence/registration-review.json) ครอบคลุม source 64 ช่องและภาพส่งมอบ 96 ช่อง ที่ alpha>40: **cyberhell idle เดิมมีพิกเซลทึบล่างสุด y=314 แต่ cook ใหม่มี y=319** ในระบบช่อง 320px จึงต่างกัน 5px การกำหนด manifest anchor เดียวกันไม่ทำให้ฝ่าเท้าตรงกันอัตโนมัติ ค่าขอบและกึ่งกลาง silhouette แถบล่างเป็นเพียงข้อมูลวินิจฉัย ไม่ใช่การตรวจฝ่าเท้าทางกายวิภาค และไม่ได้ใช้ปรับภาพส่งมอบ

อ่าน `src/workers.js` ยืนยัน side=แถว 1, down=4, up=5; เกมกลับด้านด้วย `face` ภาพเทียบใหม่ใช้ TH down `scale=1.063, dx=27` และ up `scale=1.122, dx=13` ตรวจ RGBA ยืนยัน cook down-left ทั้ง 4 โซนและ carry side-left เป็น mirror จริง จึงสลับด้านกระเป๋า/เครื่องมือ/สัญลักษณ์ เงื่อนไข mirror ของ cook ที่อนุญาตเฉพาะไม่มีรายละเอียดข้างเดียวยังไม่ครบ

## GIF, alpha และขอบเขตการตรวจ

ถอด GIF ทั้ง 12 ไฟล์ใหม่ ตรวจจำนวน/เวลาเฟรม การวน และความตรงกับ atlas ภายในค่าคลาดเคลื่อน palette เฉลี่ย <3/255 ต่อช่องสี/พิกเซลทุกเฟรม เฟรมในแต่ละแถวไม่ซ้ำกัน ตรวจภาพเรียงเฟรมรวมถึงทิศซ้ายและแผ่น renderer-fit แล้ว ค่าความต่างเฟรมไม่พิสูจน์ความลื่นของ loop

**ยังไม่ได้ดู playback ต่อเนื่องจริง**: ตรวจ CUA ในรอบนี้แล้วได้ `browsers=[]` และ `Browsers: Error: The browser access host is unavailable` หลักฐานอยู่ใน [playback-access.json](evidence/playback-access.json) จึงไม่อ้างว่าตรวจ loop เคลื่อนไหวผ่านแล้ว

ตรวจ alpha เชิงโครงสร้างครบ 96 ช่อง: ขอบบน/ซ้าย/ขวาโปร่งใส ไม่มีเศษแยกที่ alpha>40 ภาพตรวจขาว/ดำ/เขียวครบ 24 แผ่นถูกสร้างซ้ำและคงไว้ ผลดูขอบครบทุกแผ่นจากรอบก่อนอยู่ใน [previous-round-loop-review.json](evidence/previous-round-loop-review.json) รอบก่อนรายงานไม่เห็นขอบแดง/เหลืองผิดปกติ รอบนี้ไม่ได้ตรวจทุกแผ่นซ้ำหรือทดสอบบนฉากเกม จึงแยกผลเดิมออกจากผลตรวจโครงสร้างใหม่

## Self-check ตามเกณฑ์รับงาน

| เกณฑ์ | ผลจริง | สถานะ |
| --- | --- | --- |
| 1. cook 8 เฟรมครบ 4 โซน loop ต่อเนื่อง ตัวเดิม หน้า สี ขนาด จุดเท้าตรง | จำนวนและผังครบ แต่หน้า/สัดส่วนยังต่าง, mirror สลับรายละเอียดด้านเดียว, baseline cyberhell ต่าง 5px และยังไม่ตรวจ playback ต่อเนื่อง | incomplete |
| 2. carry TH ครบทุกทิศและ alpha สะอาด | คงครบ 4 แถว × 8 เฟรม ตรวจโครงสร้าง alpha ใหม่ไม่พบข้อผิดพลาด; หลักฐานดูขอบจากรอบก่อนคงไว้ แต่หน้า/สัดส่วนและจุดเท้ายังค้าง | incomplete |
| รอบต่อ: แก้หน้า/สัดส่วนทั้ง 4 โซน รักษา carry TH และผังเดิม | รักษาภาพเดิมครบและเพิ่มหลักฐาน fit แล้ว แต่ยังไม่วาดแก้เพราะรอโควตา | incomplete |
| ส่งออกเฉพาะโฟลเดอร์นี้ พร้อม README/JSON/หลักฐาน และ ≤30MB | ตรวจด้วย `check_package.py`; ผลขนาดจริงและรายการไฟล์อยู่ใน package-check.json | ดูผลโครงสร้างในรายงาน |

## คำสั่งตรวจซ้ำที่รัน

จากราก repo ใช้ Python 3, Pillow, NumPy และ SciPy:

```sh
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/audit_current.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/review_registration.py
python3 docs/art-reviews/2026-11-10-worker-cook/evidence/check_package.py
```

`audit_current.py` ตรวจ **119 เงื่อนไข ไม่พบข้อผิดพลาด** ครบ 96 ช่อง / 12 GIF; `review_registration.py` สร้างค่าจาก 64 source และ 96 delivered frames พร้อมภาพเทียบ 8 แผ่น โดยไม่รับรอง anatomical registration; `check_package.py` ตรวจไฟล์บังคับ ขอบเขตการเปลี่ยน และขนาด ≤30,000,000 bytes ผลอยู่ใน [package-check.json](evidence/package-check.json) การตรวจเหล่านี้เป็นการตรวจ asset แบบออฟไลน์ ไม่ใช่การรับรอง QA และไม่ได้รันชุดทดสอบเกม

รายงานรอบปัจจุบันคือ `loop-review.json`, `queue-check.json`, `evidence/current-audit.json`, `evidence/registration-review.json` และ `evidence/package-check.json` ส่วน `previous-round-*`, `input-*`, `prior-*` และ `technical-audit.json` เป็นประวัติเก่า

งานค้าง: ทำข้อจำกัดโควตารอบแก้ให้ชัดเจน, วาดแก้ด้วย ImageGen ในตัวครั้งละ 2–4 เฟรมอ้างอิงเฟรมก่อนหน้า, รักษารายละเอียดทั้งสองด้าน, แก้ carry TH ครบทุกทิศ แล้วตรวจฝ่าเท้าและ playback ก่อนตั้ง ready ไม่แก้ `src/`, `tests/`, `img/`, hooks, `status.json`, `worklog.json` หรือโฟลเดอร์คุณเป้ ไม่สร้างหรือเปลี่ยน worktree/branch ไม่ commit/push/merge/deploy และไม่เรียก agent อื่น
