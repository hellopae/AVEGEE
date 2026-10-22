# ART-boss3-handover — บอสโซน 3 ยื่นอาวุธทั้งฝัก

สร้างด้วย image generation ในตัว แบบ edit โดยแนบ 3 ภาพตาม §2: cane (ฐาน), icon-cane (อาวุธ), fang (ท่ามอบ) แล้ว composite เฉพาะส่วนด้วย PIL ตามขั้นหลังวาดในสเปก ไม่ใช้ CLI/API สร้างภาพสำรอง

## ไฟล์ส่งมอบและขนาดจริง (PIL)

- `img/weapons/weapon-cutscene-cane-v2.jpeg`: **1375×768, JPEG, RGB, ไม่มี alpha**, ฝัง sRGB ICC, บันทึก quality=92, subsampling=0
- [ก่อน/หลัง](boss3-handover/before-after.png): 1375×1568 RGB
- [ภาพก่อน](boss3-handover/before.png), [ภาพหลัง](boss3-handover/after.png), [ภาพ composite lossless](boss3-handover/composite-lossless.png): 1375×768 RGB
- [ภาพจากโมเดล](boss3-handover/generated.png): 1678×937 RGB; [ภาพ normalize](boss3-handover/generated-normalized.png): 1375×768 RGB ใช้ Lanczos ไม่ครอป
- [มาสก์](boss3-handover/edit-mask.png): 1375×768 L, ขอบ Gaussian 2 px ครอบแขนเก่า/ใหม่ อาวุธเก่า/ใหม่ และมือผู้รับ
- [diff](boss3-handover/diff.png), [diff ขยายค่า 6 เท่า](boss3-handover/diff-amplified-x6.png), [diff ก่อนบีบอัด](boss3-handover/composite-diff.png), [diff ตาม path ในสเปก](cane-v2-diff.png): 1375×768 RGB
- [ผลวัด](boss3-handover/verification.json), [pre-flight](boss3-handover/preflight.json), [prompt จริง](boss3-handover/prompt.txt), [สคริปต์สร้างหลักฐาน](boss3-handover/build-evidence.py)

## การตรวจและข้อจำกัด

- PIL เปิดไฟล์ JPEG กลับมาตรวจ size/format/mode/ICC/alpha และยืนยันด้วย assert ขนาด 1375×768 RGB
- ต้นทาง SHA-256: `6018acf5dff3cbac896a7c7fc53ff92a8abf424f20d19759d65898325a4dc431` คงเดิม
- ก่อนบีบอัด: พิกเซลนอกมาสก์เปลี่ยน **0** จาก 912470 จุด
- JPEG หลังบีบอัด: นอกมาสก์มีพิกเซลค่าเปลี่ยน 697180 จุด; mean absolute channel error 1.015838/255, max 24/255 นี่คือความคลาดเคลื่อน encoding ไม่อ้างว่าภาพ JPEG ตรงต้นทางทุกพิกเซล ดู lossless composite ประกอบ
- ตรวจภาพปลายทางด้วยตา: ไม่เห็นใบดาบเปลือย ปากฝักติดการ์ด ด้ามพันแดง/การ์ดปีกค้างคาวชี้ขวา มือเคานต์รองใต้ฝักสองข้าง มือยมน้อยหงายสองข้าง ไม่มีมือจับด้าม ไม่พบสัญลักษณ์ศาสนาใหม่ ข้อความ หรือลายน้ำจากการดูภาพ
- แนวแกนฝักเกือบขนานพื้น: จุดอ้างอิงอ่านด้วยตาโดยประมาณ (250,298)→(680,312) คิดเป็นประมาณ 1.9°; ไม่ใช่การวัดด้วยตัวตรวจวัตถุอัตโนมัติ
- ใบหน้า/ผม/หมวก/ขาและฉากนอกมาสก์ใช้ต้นฉบับ รายละเอียดเสื้อแขนและผ้าบริเวณที่เคยถูกแขนหรืออาวุธบังถูกสร้างใหม่เฉพาะเพื่อรองรับท่าใหม่

## จุดที่ต่างจากสเปกพร้อมเหตุผล

1. เก็บศีรษะและสีหน้าเดิม ไม่ก้มศีรษะเพิ่ม เพราะ brief ล็อกใบหน้าและอนุญาตแก้เฉพาะแขน/อาวุธ/มือ; prompt เพิ่มคำสั่งให้ความสำคัญกับล็อกใบหน้า
2. โมเดลให้ภาพ 1678×937 จึง normalize เป็น 1375×768 ด้วย Lanczos โดยไม่ครอป (0%) อัตราส่วนต่างเล็กน้อยประมาณ 0.03%
3. โมเดลเปลี่ยนภาพนอกจุดแก้ จึงใช้ composite และมาสก์ตาม §2 เพื่อคืนต้นฉบับนอกบริเวณแก้ การเซฟ JPEG ทำให้ค่าพิกเซลมี encoding noise ตามผลวัดข้างต้น
4. มาสก์รวมส่วนเสื้อแขน/ลำตัวที่อาวุธหรือมือเดิมบังไว้ เพื่อเอามือจับด้ามและอาวุธเฉียงเดิมออกครบ ไม่ได้ออกแบบชุดใหม่
5. ข้อแตกต่าง pre-flight ของ asset อื่นจดที่ [README](README.md) โดยไม่ขยายงานไปแก้ asset เหล่านั้น

## Self-check เกณฑ์รับงาน

| เกณฑ์ | หลักฐาน/สถานะที่ตรวจเอง |
|---|---|
| ปลายทางครบและขนาดตรง | มี JPEG 1375×768 RGB sRGB ตาม PIL |
| README ชิ้นนี้ครบ | ระบุไฟล์ ขนาด prompt วิธีทำ ข้อแตกต่าง และภาพก่อน/หลัง |
| เปลี่ยนเฉพาะ img ปลายทางและ output ที่กำหนด | ตรวจ git status กับรายชื่อไฟล์ท้ายงาน ไม่มีโค้ด/catalog/manifest/ไฟล์เดิมเปลี่ยน |
| §2.1 ไม่มีใบดาบเปลือย | ตรวจภาพปลายทางด้วยตา ฝักดำปิดถึงการ์ด |
| §2.2 แนวนอนสองฝ่ามือ ด้ามหาผู้รับ | ตรวจภาพด้วยตา แกนประมาณ 1.9° |
| §2.3 ยมน้อยรับสองมือ | ตรวจภาพด้วยตา มือแดงสองข้างหงาย |
| §2.4 ฉาก/หน้า/ชุดเดิม | นอกมาสก์ lossless เปลี่ยน 0; JPEG มี encoding noise; เสื้อในส่วนแก้มีรายละเอียดสร้างใหม่ |
| §2.5 ขนาดและรูปลักษณ์อาวุธ | PIL และภาพไอคอนเทียบ ด้ามแดง การ์ดปีกค้างคาว |
| §2.6 ไม่มีสัญลักษณ์ศาสนาใหม่ | ตรวจภาพด้วยตา ไม่พบ; ส่งให้ Chris ตรวจต่อ |

ไม่รันชุดทดสอบโค้ดหรือเกม เพราะงานนี้เพิ่มภาพและหลักฐานเท่านั้น ไม่มีการเสียบ asset หรือแก้โค้ด ไม่รับรอง QA หรือการรับงานแทน Toby/Chris

## Prompt ที่ใช้จริง

```text
Edit the attached image. It is a 16:9 pixel-art game cutscene. Keep the ENTIRE background, lighting,
palette, camera, art style, the count's face, hair, moustache, coat and cape, and the red imp's
face, helmet, cloak and clothes EXACTLY as they are, pixel for pixel wherever possible.
Change ONLY the two arms and hands of the old vampire count, the weapon he holds, and the two hands
of the small red imp.

New pose, a respectful offering: the count kneels on one knee as before. The weapon is a long
curved-sabre-style blade that stays FULLY SHEATHED inside a long black lacquered scabbard
(black scabbard with a small silver tip fitting). He holds the sheathed weapon perfectly
horizontal at chest height, resting across both of his open upturned palms like a tray, left palm
under the mouth of the scabbard, right palm under the middle. The grip end points to the RIGHT of
the image, toward the imp: a red leather-wrapped grip, a dark iron winged-bat crossguard, a small
bat-head pommel with a red gem eye. The scabbard tip points LEFT. The blade is NOT drawn: NO bare
steel visible anywhere, NO hand touching the grip, the scabbard mouth is closed against the guard.
The count's head is bowed slightly and his eyes are lowered; his expression is stern, calm and
courteous, not threatening, no smile, no fangs shown.
The imp stands in the same place and reaches out with BOTH hands, palms up and cupped, to receive
the weapon, fingers slightly spread, with a wary but earnest expression as in the original.

Style: same detailed modern pixel art as the original, crisp dark pixel outlines, soft dithered
shading, cool moonlit blue palette with deep red accents. No new characters, no new props, no
text, no logos, no cross or religious symbols, no glow around the weapon, no blood.
Output: 16:9 landscape, as close to 1375x768 as the tool allows.

Input roles: Image 1 is the edit target and composition lock; Image 2 is the weapon design reference ONLY (do not show its bare blade); Image 3 is the respectful offering gesture reference ONLY. Keep image 1 framing and positions. Preserve the existing faces exactly, with no head redesign; prioritize the locked faces over changing head angle. Only redraw arm/weapon/receiving-hand areas. The new complete weapon must fit between the characters: scabbard tip at left, closed guard and red grip at right, two separated open count palms below the scabbard and two separated small red receiving hands below the right end. No fingers touching the grip. Do not add ANY religious symbols absent from the original.
```
