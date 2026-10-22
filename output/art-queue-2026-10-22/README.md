# ART-boss3-handover — pre-flight 22 ต.ค. 2569

ทำเฉพาะชิ้นที่ 1 ใน working directory ที่ได้รับ ไม่แก้โค้ด ไม่สลับ branch ไม่สร้าง worktree และไม่ commit/push

เอกสารชิ้นงาน: [boss3-handover.md](boss3-handover.md)

รันสคริปต์วัดของ §8 ด้วย PIL ใน working directory ปัจจุบันแล้ว ผลเต็มรวม SHA-256 และ alpha bbox 16 ช่อง: [preflight.json](boss3-handover/preflight.json)

- ภาพแก้และภาพท่ามอบอ้างอิง: 1375×768 RGB; ไอคอนอาวุธ: 512×512 RGBA
- ภาพ feedback `9.jpeg` ตรงกับภาพต้นทางทุกพิกเซลหลัง decode
- ค่าประมาณ business-th 1199×1311 ในสเปก วัดจริงได้ **1199×1312 RGBA**; จดไว้เท่านั้น ไม่มีการแก้ภาพนอกชิ้นงาน
- ชีตคนงานทั้ง 4 โซนวัดได้ 1280×1280 RGBA; alpha bbox แถว idle มีความสูง 308, 309, 300, 309 px และขอบล่าง y=320 (threshold alpha >16) เป็นค่าของภาพรวมต่อช่องซึ่งบางช่องมีเศษจากช่องข้าง ไม่ตีความแทนความสูงตัวละครล้วน งานนี้ไม่ได้แก้ชีต
- r3-c3: 1024×1024 RGB; head-asia-punish: 1672×941 RGB; hero-boss-cutscene: 1375×768 RGB

ไม่มีการทดลองเสียบเกมหรือรับรอง QA; Toby ตรวจตอนเสียบและ Chris ตรวจวัฒนธรรม
