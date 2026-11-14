# ไอคอนหิว — HUNGRY-ICON

ส่งมอบตามบรีฟวันที่ 13 พ.ย. 2569 · ทำใน worktree ที่ได้รับวันที่ 14 พ.ย. 2569

## ไฟล์ส่งมอบ

| ไฟล์ | ขนาด | หน้าที่ |
| --- | --- | --- |
| [icon-hungry.webp](../../../img/ui/icon-hungry.webp) | 48×48 | ไฟล์สำหรับเกม |
| [icon-hungry-48.webp](icon-hungry-48.webp) | 48×48 | สำเนาสำหรับตรวจงาน |
| [icon-hungry-192.webp](icon-hungry-192.webp) | 192×192 | ภาพขนาดใหญ่พื้นใส |
| [compare.webp](compare.webp) | 576×256 | เทียบ 11/16/48 px บนพื้นแผนที่จริง |
| [checks.txt](checks.txt) | ข้อความ | ผลตรวจไฟล์ครบและขนาด |

ภาพไอคอนเป็นข้าวปั้นที่ขาดไปครึ่งบนด้านขวา มีสาหร่ายและเส้นหิวเล็กสองเส้น ขอบน้ำตาลเข้ม เนื้อข้าวสีงาช้าง อ้างอิงรูปทรงและสีจาก `img/item-food.webp` และโทนไอคอนจาก `img/ui/icon-close.webp` ไม่มีตัวอักษรในภาพไอคอนและภาพเทียบ

ส่งออกด้วย Pillow เป็น WebP โดยตั้ง `lossless=True, exact=True, method=6` เก็บ RGBA จาก ImageGen ไม่เติมพื้นหลัง ไม่ตัดเส้นหิว ทุกรูปย่อใช้ Lanczos: ต้นฉบับ 1254×1254 → 192×192 → 48×48 ส่วน 11/16 px ย่อจากไฟล์ 48×48

## วิธีอ่านภาพเทียบ

เปิด `compare.webp` ที่ 100%: ซ้ายไปขวาเป็นไอคอน 11, 16, 48 px ตามลำดับ แถวบนพื้นมืด แถวล่างพื้นสว่าง แต่ละช่อง 192×128 px ไม่มีป้ายข้อความในภาพ

พื้นหลังมาจากแผนที่ที่ใช้งานอยู่ `img/map-zone1/v7r/zone1-terrain-v7-preview.webp` ขนาด 1536×1024 โดย crop แถวบน `(60,655,252,783)` และแถวล่าง `(1250,110,1442,238)` แบบพิกเซลเดิม ไม่ปรับความสว่าง ไอคอนอยู่กลางแต่ละช่อง ภาพนี้เป็นภาพประกอบสำหรับพิจารณาความอ่านออก ไม่ใช่ screenshot จากการเล่นเกม

## การสร้างและขอบเขตตรวจ

ใช้ ImageGen ในตัว 1 ครั้ง จากงบไม่เกิน 4 ครั้ง · retry 0 ครั้ง จากเพดาน 2 ครั้ง ไม่ใช้ Shado ตามข้อกำหนด ImageGen ในบรีฟนี้

ไม่พบ `Output/Toby/2026-11-13-avegee-fb2-a-map.md` ใน worktree นี้ จึงใช้สเปกข้อ 6 ที่คัดมาในบรีฟเป็นหลัก เพิ่มเฉพาะ asset และเอกสารส่งมอบ ยังไม่ได้เปลี่ยนจุดวาด emoji ใน `src/scene.js`

การตรวจที่รันจำกัดเฉพาะไฟล์ครบและขนาดถูกตามบรีฟ ผลอยู่ใน `checks.txt` ไม่ได้ทดสอบการเล่นเกมหรือรับรองความอ่านออกที่ 11–16 px และไม่อ้างว่า QA ผ่าน ให้พิจารณาภาพเทียบก่อนนำไปผูกเข้าจุดวาดจริง

## Prompt ที่ใช้จริง

```text
Use case: stylized-concept
Asset type: a single small in-game hunger status icon, displayed above characters at 11 to 16 pixels, with a 48x48 production asset and a 192x192 master.
Primary request: half of a partially eaten Japanese onigiri rice ball, visibly missing a large upper-right section, a simple dark seaweed band below, and two short small curved hunger pang strokes at its upper left.
Style/medium: polished hand-painted fantasy RPG inventory icon. Match an ivory rice onigiri with deep brown/charcoal green nori, restrained warm golden beige highlights, broad simple shading, softly faceted surfaces. A dark brown near-black solid contour surrounds the entire food silhouette. The hunger strokes have a warm cream center and dark contour.
Composition/framing: square canvas, one large centered readable silhouette occupying about 85 percent of the canvas, generous safe margin; low detail, exaggerated missing half for recognition at tiny sizes. Large rice mass and seaweed shapes, minimal grain texture.
Scene/backdrop: genuinely transparent alpha background. No scene, no panel, no badge, no cast shadow outside the silhouette.
Constraints: only one icon. No text, no letters, no numbers, no symbols resembling writing, no watermark, no plate, no chopsticks, no decorative elements. Do not draw a full intact rice ball or a face. Thick clean dark outlines and light cream rice must remain distinct against both dark and bright map terrain.
```
