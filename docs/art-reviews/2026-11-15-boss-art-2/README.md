# BOSS-ART-2 · 15 พฤศจิกายน 2569

ส่ง 12 WebP: บอส 3 ตัวรวม 10 ไฟล์ และลูกน้อง 2 ไฟล์ ครบตามตารางใบงานที่รวม **PHANTOM-404 = AI Scammer Robot** เป็นตัวเดียวกัน

## ไฟล์ส่ง

| ตัวละคร | สไปรท์ 512×512 RGBA พื้นโปร่ง | Profile 512×512 RGB | การ์ด 1672×941 RGB |
|---|---|---|---|
| Cerberus | [boss-cerberus-west.webp](../../../img/z3-events/boss-cerberus-west.webp) | [boss-cerberus-west-profile.webp](../../../img/z3-events/boss-cerberus-west-profile.webp) | [cut-cerberus-howl-west.webp](../../../img/z3-events/cut-cerberus-howl-west.webp) |
| Jörmungandr | [boss-jormungandr-west.webp](../../../img/z3-events/boss-jormungandr-west.webp) | [boss-jormungandr-west-profile.webp](../../../img/z3-events/boss-jormungandr-west-profile.webp) | [cut-jormungandr-tide-west.webp](../../../img/z3-events/cut-jormungandr-tide-west.webp) |
| PHANTOM-404 | [boss-phantom404-cyberhell.webp](../../../img/z4-events/boss-phantom404-cyberhell.webp) | [boss-phantom404-cyberhell-profile.webp](../../../img/z4-events/boss-phantom404-cyberhell-profile.webp) | [cut-scammer-phishing-cyberhell.webp](../../../img/z4-events/cut-scammer-phishing-cyberhell.webp), [cut-phantom404-delete-cyberhell.webp](../../../img/z4-events/cut-phantom404-delete-cyberhell.webp) |
| บรรทัดปลอม (ลูกน้อง) | [phantom404-entry-cyberhell.webp](../../../img/z4-events/phantom404-entry-cyberhell.webp) | [phantom404-entry-cyberhell-profile.webp](../../../img/z4-events/phantom404-entry-cyberhell-profile.webp) | — |

ไม่มีไฟล์ภาพค้างในใบงานนี้ ไม่ได้ต่อ asset เข้าระบบเกม เพราะใบงานห้ามแก้ `src/` และ `tests/`

## หลักฐานสำหรับตรวจภาพ

- [Contact sheet ครบ 12 ไฟล์](contact-sheet.webp)
- [ภาพเทียบ W4 → สไปรท์ → profile → การ์ด](character-comparison.webp)
- [ภาพเทียบสไตล์กับการ์ดหงอคง 2 ใบ](style-comparison.webp)
- [Prompt ทั้ง 10 ครั้งและตำแหน่งผล ImageGen](prompts.json)
- [ขนาด โหมด alpha SHA-256 และขนาดไฟล์](asset-checks.json)
- [ตำแหน่งและ SHA-256 ของแหล่งอ้างอิงที่อ่าน](references.json)

ตัวอักษรที่ใช้ติดป้ายใน contact sheet/ภาพเปรียบเทียบเป็นส่วนของหลักฐาน ไม่ได้อยู่ในไฟล์เกมทั้ง 12 ไฟล์

## วิธีทำและงบ

ใช้ built-in ImageGen **10/14 ครั้ง** ไม่มี batch หรือการสร้างซ้ำ ไม่ใช้ CLI/API สำรอง ทำทีละชุด Cerberus → Jörmungandr → PHANTOM-404 → ลูกน้อง ภายในเวลาประมาณ 15 นาทีของ session นี้

สไปรท์ Jörmungandr และ PHANTOM-404 ใช้ภาพ W4 ต้นแบบแปลงเป็น WebP โดยตรง พร้อมย่อให้มีขอบโปร่งใส จึงไม่เสียการสร้างภาพเพิ่มและคงรายละเอียดตัวละครเดิม ส่วน Cerberus ใช้ ImageGen รักษารูปร่างเดิมแล้วเปลี่ยนตาเป็นเขียวจางตามใบงาน

ขั้นตอนส่งไฟล์ใช้ Pillow เฉพาะปรับขนาด/จัด canvas โปร่งใส แปลงโหมดและเข้ารหัส lossless WebP ไม่มีการย้อมสีด้วยโค้ด ภาพ PNG ทำงานชั่วคราวใน `art-src/boss-art-2/` ถูกนำออกหลังส่งออกแล้ว ต้นแบบภายนอกและภาพเดิมใน repo ไม่ถูกแก้

Shado `status` ถูกระบบอนุมัติอัตโนมัติปฏิเสธด้วยข้อความ `MCP tool call requires approval, but approval policy is never` จึงใช้ ImageGen ตามงบที่ใบงานระบุ ไม่มีการเปลี่ยนการตั้งค่าหรือขอ API key

## ตรวจรับด้วยตัวเองตามเกณฑ์

| เกณฑ์ | สิ่งที่ตรวจและผลที่เห็น | ขอบเขตหลักฐาน |
|---|---|---|
| 1. ไฟล์ครบ ขนาด/โหมดตรง | สคริปต์เปิดอ่าน WebP ทั้ง 12 ไฟล์ ตรวจชื่อ ขนาด และโหมดตรงสเปก สไปรท์ทั้ง 4 มี alpha ช่วง 0–255 และขอบโปร่งใส | `asset-checks.json` เป็นผลตรวจไฟล์ ไม่ใช่ผลเล่นเกม |
| 2. ตัวละครตรงต้นแบบ | เปิดดูต้นแบบ W4 และเทียบภาพส่ง: Cerberus มีสามหัว ขนเทาม่วง ปลอกคอหนาม/จี้ทอง ตาเขียวจาง; Jörmungandr คงเกล็ดน้ำเงินเทา ท้องเงิน ครีบและตาส้ม; หุ่นทั้งสองการ์ดเป็นตัวเดียวกัน หน้าจอดำ เกราะม่วงทอง แสงฟ้า ไม่ใช้ร่างเงาหรือหุ่นขาว | `character-comparison.webp`; เป็นการประเมินด้วยสายตา |
| 3. ไม่มีตัวอักษร | เปิดดูภาพที่สร้างและภาพส่ง ไม่พบคำ ตัวเลข ชื่อท่า หรือลิงก์ หน้าต่างใช้สีและไอคอน บัญชีใช้แถบสี่เหลี่ยม สมุดนิราใช้เส้น/แถบ | ไม่ได้รัน OCR; การดูภาพไม่ใช่ข้อพิสูจน์อัตโนมัติว่าไม่มีอักขระทุกพิกเซล |
| 4. สไตล์เข้ากับการ์ดหงอคง | เทียบกับ arrives/sweep จาก worktree ที่ใบงานระบุ: เส้น anime สีสด วัสดุละเอียด แสงทองตัดสีเย็น ฉากมีความลึก บอสเด่นกลาง/ขวา ทีมยามา–นิราเล็กอยู่ล่างซ้าย | `style-comparison.webp`; เป็นการประเมินด้วยสายตา |

การ์ดเฉพาะท่า: Cerberus หอนพร้อมคลื่นเสียงหน้าประตูหิมะ; Jörmungandr ยกหางฟาดน้ำเกิดคลื่น; phishing เป็นพายุแจ้งเตือนแถบสี/ไอคอน; delete เป็นหุ่นยกมือลากเส้นให้แถวบัญชีแตกเป็นแสง โดยยังเห็นแถวที่เหลือและพื้นที่ที่ลบแล้ว ลูกน้องเป็นแถบบัญชีเขียวมีตาเรียว

## การตรวจที่รัน

```sh
python3 docs/art-reviews/2026-11-15-boss-art-2/verify_assets.py
git diff --exit-code
```

ผลสคริปต์: `Checked 12 WebP files: dimensions, modes, decode and sprite alpha assertions satisfied.`

`git diff --exit-code` ไม่พบการเปลี่ยนไฟล์ที่ติดตามอยู่เดิม รายการเพิ่มใหม่จำกัดอยู่ที่ภาพเกม 12 ไฟล์และโฟลเดอร์หลักฐานนี้ ไม่ได้รันทดสอบ logic หรือเปิดเล่นเกม จึงไม่มีผลยืนยันพฤติกรรมในเกมหรือการอนุมัติจากผู้ตรวจงานศิลป์
