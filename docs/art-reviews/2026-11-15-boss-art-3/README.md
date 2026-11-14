# BOSS-ART-3 · การ์ดท่าบอสระดับ B · 15 พ.ย. 2569

ส่งครบ 8 ใบหลักและภาพเสริม 1 ใบตามใบงาน ไม่มีภาพค้างในรายการนี้ ใช้ built-in ImageGen 9 ครั้งจากเพดาน 12 ครั้ง ไม่มีการ generate ซ้ำหรือใช้ CLI generation ทำงานบน branch/worktree ที่ได้รับ โดยไม่สร้างหรือสลับ branch/worktree และไม่ commit/push/deploy

## ไฟล์ส่ง

ทุกไฟล์เป็น **1672×941 · RGB · WebP · ภาพนิ่ง 1 frame**

| ลำดับ | ไฟล์ใหม่ใน repo | หลักฐานเทียบต้นแบบ | จุดจำที่ตรวจด้วยตา |
|---|---|---|---|
| 1 | `img/z1-events/cut-arunadet-mirror-th.webp` | [compare-01.webp](compare-01.webp) | ใบหน้ามนุษย์ มงกุฎยอดไทย ปีกขาวปลายฟ้า เกราะขาวทองอัญมณีฟ้า กระจกกลมขอบทอง |
| 2 | `img/z2-events/cut-kuroha-gale-asia.webp` | [compare-02.webp](compare-02.webp) | หน้าอีกาดำ คิ้วขาว ปีกคราม เสื้อคลุมลายคลื่นทอง กางเกงขาว พัดขนนก |
| 3 | `img/z3-events/cut-eirlin-spearrain-west.webp` | [compare-03.webp](compare-03.webp) | ผมเปียขาว หมวกเหล็กสันกลาง เกราะเงิน ผ้าคลุมเขียว โล่ไม้ หอกและฝนหอกฟ้าขาว |
| 4 | `img/z4-events/cut-lumen-scan-cyberhell.webp` | [compare-04.webp](compare-04.webp) | หุ่นสองตน หน้ากากดำ ตาฟ้า เกราะม่วงเทา วงกลไกหลังศีรษะ แท็บเล็ตและเส้นสแกนหน้าคุกกระจก |
| 5 | `img/z4-events/cut-yama-ledger-tide-th.webp` | [compare-05.webp](compare-05.webp) | ผิวม่วงแดงเข้ม มงกุฎไทย เครื่องทอง ผ้านุ่งดำทอง คทา นั่งบัลลังก์ คลื่นกระดาษ แสงเขียวพาดตา |
| 6 | `img/z4-events/cut-zhaowen-seal-asia.webp` | [compare-06.webp](compare-06.webp) | ผิวแดง เคราดำ หมวกขุนนางดำทอง ชุดแดงทอง คทาหัวสองหน้า ตราหยกใหญ่ แสงเขียวพาดตา |
| 7 | `img/z4-events/cut-halvar-lantern-west.webp` | [compare-07.webp](compare-07.webp) | ผิวแดงม่วง เคราขาว หมวกสองเขา เกราะเงิน ผ้าคลุมขนดำขอบขาว อีกาบนไหล่ โคมเหล็ก แสงเขียวพาดตา |
| 8 | `img/z4-events/cut-nexar-logsweep-cyberhell.webp` | [compare-08.webp](compare-08.webp) | ผิวแดง สองเขา ผมและเคราขาว ชุดดำม่วงลายวงจรฟ้า อัญมณีฟ้า แท็บเล็ต คลื่นแถบข้อมูล แสงเขียวพาดตา |
| เสริม | `img/z2-events/cut-ash-bird-feather-asia.webp` | [contact-sheet.webp](contact-sheet.webp) ช่อง 9 | นกควันธูปทองและเถ้าขาว หางควัน ขนหนึ่งเส้นลงหาฝ่ามือยามา บ่อเถ้าและโคมแดง ไม่มีวงรัศมีหรือเปลวไฟ |

## หลักฐานและต้นแบบ

- [contact-sheet.webp](contact-sheet.webp): ภาพรวมไฟล์ปลายทางทั้ง 9 ใบ เรียงตามใบงาน
- `compare-01.webp` ถึง `compare-08.webp`: ต้นแบบทางซ้ายและการ์ดส่งทางขวา ไม่ย้อมสีต้นแบบ
- [style-comparison.webp](style-comparison.webp): การ์ดหงอคงจริง 2 ใบเทียบกับภาพใหม่
- [prompts.md](prompts.md): prompt เต็มทั้ง 9 ครั้ง
- [generation-log.json](generation-log.json): ลำดับการสร้าง ไฟล์อ้างอิง และที่มาของภาพ
- [file-validation.json](file-validation.json): ผล decode ขนาด โหมด ชนิด จำนวน frame ขนาดไฟล์ และ SHA-256 ของทุกใบ
- [verify_assets.py](verify_assets.py): ตรวจไฟล์และ hash ซ้ำจาก repo root ด้วย `python3 docs/art-reviews/2026-11-15-boss-art-3/verify_assets.py`

อ่านคำบรรยาย “การ์ด:” หัวข้อ 2.1, 2.6, 2.11, 2.17, 2.5, 2.10, 2.16 และ 2.22 พร้อมข้อกำหนดหัวข้อ 4 จาก `2026-11-14-avegee-boss-skills.md` ของ Rae ส่วนภาพเสริมใช้หัวข้อ 4 แถว 4 ใน `2026-11-14-avegee-merchant-quest.md`

ใช้ `cut-wukong-arrives-asia.webp` และ `cut-wukong-sweep-asia.webp` จาก worktree อ่านอย่างเดียว `/Users/agapae/agapae-work/.codex-worktrees/20261114T174152Z-4dfd205d` เป็นมาตรฐานภาพจริง เพราะไฟล์ sweep ใน worktree งานนี้ยังเป็น placeholder ไม่ได้แทนที่ภาพเดิมนั้น

## การตรวจตามเกณฑ์รับงาน

1. **ไฟล์ครบและรูปแบบตรง:** เปิด decode ไฟล์ส่งทั้ง 9 ใบด้วย Pillow และตรวจด้วย assertion ว่าขนาด 1672×941, โหมด RGB, ชนิด WEBP, 1 frame รวมทั้งเปิดอ่านหลักฐานภาพทั้ง 10 ไฟล์ได้
2. **ตัวละครตรงต้นแบบ:** เปิดเทียบต้นแบบและไฟล์ส่งทั้ง 8 คู่ ตรวจจุดจำตามตารางด้านบน บอสหันหน้าเข้ากล้องหรือสามส่วนเข้ากล้อง ยามาและนิราอยู่มุมล่างซ้ายและเล็กกว่าบอส การ์ดหัวหน้าถูกสิงมีแสงเขียวพาดตาตามคำบรรยาย
3. **ไม่มีตัวอักษร:** ตรวจภาพที่สร้างขนาดเต็มและหลักฐานจากไฟล์ WebP ไม่พบตัวอักษรที่อ่านออก กระดาษ/สมุดใช้เส้นบรรทัด จอใช้ช่องว่าง เส้นกริด และแถบสี ตราหยกเป็นลายเรขาคณิต ไม่มีข้อความชื่อท่าหรือ watermark ในภาพส่ง ข้อความกำกับอยู่เฉพาะภาพหลักฐาน
4. **สไตล์เข้ากับหงอคง:** เทียบลายเส้น anime เกม ใบหน้าแบบ chibi สีสด รายละเอียดเครื่องทอง โคมแดง แสงเวทและฉากนรกกับภาพอ้างอิงทั้งสองใบโดยตรง ภาพเอียร์ลินใช้แสงหิมะ/แสงเหนือตามสเปกแต่คงวิธีวาดและแสงโคมร่วมกัน

ทั้งหมดนี้เป็นการตรวจไฟล์และการตรวจภาพโดยผู้ทำงาน ยังไม่มีผลตรวจรับจากผู้ตรวจศิลป์หรือผลทดสอบการแสดงผลในเกม

## วิธีจัดไฟล์และข้อจำกัดการตรวจ

ใช้ภาพจาก ImageGen โดยตรง แปลงเป็น RGB และบันทึก WebP ด้วย Pillow `quality=95, method=6` ไม่มีการย้อมสี แต่งแสง วาดทับ หรือเปลี่ยนสีด้วยโค้ด ภาพต้นทางทั้ง 9 ใบมีขนาด 1672×941 อยู่แล้ว การทำหลักฐานใช้เพียงการย่อภาพและจัดวางบนพื้นพร้อมคำกำกับ

พยายามตรวจ OCR เพิ่มเติมสองทาง แต่ไม่สำเร็จ: Swift compiler แจ้ง `redefinition of module SwiftBridging`; Objective-C Vision ทั้ง WebP และ PNG บน CPU แจ้ง `Failed to create CVPixelBuffer Width = 1672, Height = 942, Format = '420f'` จึงไม่มีผล OCR รองรับเกณฑ์ข้อ 3 และใช้การตรวจด้วยตาตามที่ระบุ ไม่ได้แก้ environment เพื่อฝืนรัน

Shado `status` ถูกระบบปฏิเสธด้วย `MCP tool call requires approval, but approval policy is never` จึงใช้ built-in ImageGen ตามงบที่ใบงานระบุ

ไม่มีการแก้ `src/`, `tests/`, hooks, `status.json`, `worklog.json` หรือภาพเดิม ไม่มีการเพิ่มท่าหรือแก้กลไกเกม งานนี้ส่งเฉพาะภาพและหลักฐาน

คำสั่งตรวจที่รัน: `python3 docs/art-reviews/2026-11-15-boss-art-3/verify_assets.py` คืน exit 0 (9 assets และ 10 evidence images); `git diff --check` และ `git diff --exit-code` คืน exit 0 ไฟล์ที่มีอยู่ใน git เดิมจึงไม่มี diff ตรวจขอบเขตไฟล์ใหม่เพิ่มเติมใน [scope-validation.json](scope-validation.json) ไม่ได้รันชุดทดสอบเกมเพราะไม่มีการแก้โค้ดเกม
