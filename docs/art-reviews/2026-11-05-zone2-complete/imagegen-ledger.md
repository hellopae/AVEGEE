# ImageGen ledger — Z2-COMPLETE

ใช้ built-in ImageGen เท่านั้น **12 ครั้ง** ภาพอ้างอิงสไตล์ `New-Map-Zone1-ok.jpg` ฉบับย่อ `style-reference.jpg` แนบทุกครั้ง ทุกภาพตรวจแยกก่อนภาพถัดไป; แผ่นรวมตรวจการตัดอีกครั้งใน contact sheet ไม่มีการสร้างด้วย Shado/CLI/API ภายนอก

| ครั้ง | ภาพ | การใช้ |
|---:|---|---|
| 1 | mountains | ภูเขาเอเชีย/หมอก RGBA |
| 2 | tea | ศาลาน้ำชา |
| 3 | sala | หอทะเบียนกรรม |
| 4 | tarang | ตะราง |
| 5 | krajok | กระจกส่องกรรม |
| 6 | sawan | ประตูสวรรค์ |
| 7 | station-props | ตัด 6 ชิ้น: krata / ngiw / dab / lokan / lan / canteen |
| 8 | judgment | แท่นตัดสิน |
| 9 | houses | ตัดบ้านพัก 4 หลัง |
| 10 | gates | ตัดประตู 2 แบบ |
| 11 | bridge-props | ตัดราวหน้า/หลัง เสาไฟ เสาสะพานหน้า/หลัง หลังคาท่าเรือ |
| 12 | sky | ท้องฟ้า sunset และเมฆ |

คำสั่งเต็ม + ไฟล์ต้นฉบับจากเครื่องมือ + ภาพอ้างอิงแต่ละครั้ง: `generation-prompts.json` ต้นไม้/พุ่ม/หิน 9 ชนิดใช้ซ้ำจากคลังโซน 1 พร้อม provenance ใน `object-catalog.json` ไม่คิดเป็น generation ใหม่ บันทึก ledger ภายใน output งานนี้ ไม่เขียน ledger หรือไฟล์ควบคุมนอก worktree
