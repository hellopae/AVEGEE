# ชุด C — west: ท่านอนสลบ F8

ส่งครบ 8 ตัว: `yama taan kan dam boon plerng guard nira` ไม่มีตัวที่ขาด ใช้ ImageGen ในตัว 8 ครั้ง แนบเฟรม sprite เดิมของตัวนั้นทุกครั้ง ไม่ใช้ Shado

ไฟล์พร้อมคัดลอกอยู่ที่ `img/ko-pose-v1/west/<key>.webp` ภายในโฟลเดอร์นี้ ทั้งหมดเป็นภาพเดียว 640×320, WebP lossless, RGBA โปร่งใสจริง ไม่มี manifest เพิ่ม

ต้นแบบ: Yama ใช้เฟรมแรก 640×640 ของ `img/yama-animation-v1/west/sword-idle.webp`; ลูกทีม 6 ตัวใช้เซลล์แรก 384×512 ของ `img/crew-combat-v1/west/<key>.webp`; Nira ใช้เฟรมแรก 256×512 ของ `img/nira-idle-v1/west.webp` อ้างอิงจากราก repo

## การตรวจไฟล์และภาพ

- เปิดเทียบต้นแบบกับภาพส่งออกครบ 8 คู่ใน `contact-sheet.jpg`: ท่านอนใหม่ ตาปิด หัวซ้าย เท้าขวา ไม่มีเลือด บาดแผล หรือตัวอักษรใน sprite
- ตรวจจุดจำแนก: Yama หมวกเขา/เสื้อขนสัตว์/ดาบ; Taan เกราะสายฟ้า/ดาบ; Kan แว่นตาข้างเดียว/หนังสือ; Dam หูค้างคาว/ค้อน/ถังถ่าน; Boon ผ้ากันเปื้อน/ตะเกียง; Plerng ผมไฟ/ตรีศูล; Guard หัวนก/เกราะ/ขวานด้ามยาว; Nira มวยผม/เสื้อคลุมขนสัตว์/สมุดพับ
- ตรวจด้วย Python/Pillow: ชื่อครบ, 640×320, RGBA, alpha 0–255, ขอบโปร่งใสทุกด้าน ≥12 px, กึ่งกลาง alpha bbox อยู่ที่ x=319.5–320, ขอบล่างสุดอยู่ y=307 (เหลือโปร่งใส 12 แถว)
- อ่าน WebP กลับแล้วเทียบทุกไบต์ RGBA กับภาพก่อนบันทึก ตรงกันทั้ง 8 ไฟล์ ตรวจ contact sheet ว่าเปิดเป็น JPEG ได้
- การจัดไฟล์ใช้เพียงลบ alpha จางมากระดับ ≤8 ที่เป็นจุดหลงนอกตัว, crop, ลดขนาดแบบรักษาสัดส่วน และวางบนผืนโปร่งใส ไม่มีการหมุนภาพยืนมาทำท่านอน

## ความยาวที่ใช้จัดสเกล

วัดระยะเส้นตรงระหว่างจุดหัว–ปลายเท้าที่เลือกด้วยสายตาในภาพจริง รวมส่วนหัว/เขา/ผม แต่ไม่รวมอาวุธที่วางข้างตัว พิกัดด้านล่างอยู่ในไฟล์ส่งออก 640×320 และใช้คำนวณด้วยระยะ Euclidean เป็นค่าประมาณของท่า 3/4 ที่มีขางอ ไม่ใช่การวัดความกว้างผืนหรือรวมอาวุธ

| ตัว | ช่วงใบงาน (px) | ระยะวัด (px) | จุดหัว → เท้า (x,y) |
|---|---:|---:|---|
| `yama` | 295–328 | 311.0 | (170.3, 164.7) → (468.4, 253.2) |
| `taan` | 324–360 | 342.0 | (163.0, 155.2) → (498.1, 223.7) |
| `kan` | 377–419 | 398.3 | (127.3, 168.5) → (511.7, 272.8) |
| `dam` | 338–376 | 357.2 | (142.0, 188.0) → (497.0, 227.9) |
| `boon` | 370–411 | 390.7 | (126.3, 182.2) → (513.0, 238.1) |
| `plerng` | 344–382 | 362.9 | (141.5, 148.6) → (495.4, 229.0) |
| `guard` | 385–428 | 406.6 | (147.0, 101.5) → (539.1, 209.2) |
| `nira` | 339–377 | 357.9 | (145.0, 166.1) → (494.0, 245.3) |

## Prompt ที่ใช้ (สาระร่วมของทั้ง 8 คำขอ)

“Use the attached original west combat sprite as the authority for the same character, face, horns, hair, costume, equipment, palette and rendering. Redraw unconscious but alive, eyes closed, relaxed limbs, supine or slightly on the side; head left, feet right; equipment beside the body or held loosely. Newly drawn reclining anatomy, not rotated standing art. Slightly elevated three-quarter view, one full-body character, true transparent RGBA background, generous margins. No text, blood, wounds, ground, scenery or detached cast shadow.” แต่ละคำขอระบุรายละเอียดตัวละครตามจุดจำแนกข้างต้นและแนบเฟรมต้นฉบับของตัวนั้น

## งานต่อสำหรับผู้เสียบเกม

ยังไม่ได้รัน `scripts/add-ko-poses.py` หรือเปิดตรวจในเกมจริง ให้ผู้เสียบคัดลอกภาพไป `img/ko-pose-v1/west/` แล้วทำขั้นตอน manifest/query version ตามใบงาน การตรวจข้างต้นเป็นการตรวจไฟล์และภาพเท่านั้น การรับรองหน้าตา/สเกลเมื่อใช้ในเกมยังเป็นของผู้ตรวจรับ
