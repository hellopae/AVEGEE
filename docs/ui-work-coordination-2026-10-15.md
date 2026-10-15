# AVEGEE — แบ่งงาน Claude ↔ Codex 15 ตุลาคม 2026

คุณเป้แบ่งงานให้ทำคู่ขนานโดยไม่ชนกัน: **Codex app ทำ animation ของยมบาทน้อย** · **Claude ทำแผนที่ Zone1 ใหม่ (ชุด K)**
อ่านไฟล์นี้ก่อนเริ่ม และ `git pull` ก่อน push ทุกครั้ง (ทั้งสองฝั่ง push `main` ได้)

## สถานะล่าสุดบน main (`7cafbdb`)

- K2 เมนูต่อสู้/สอบสวนเอียงแบบ Battle9/Comment8 + แก้คลิกไม่ติด — merge แล้ว (`6d36dcb`)
- K3 แก้เกมช้า 10→60 fps (ต้นไม้ ctx.filter ทุกเฟรม, LRU chunk เล็กเกิน) — merge แล้ว (`7cafbdb`) cache-bust ปัจจุบัน `-k3m`

## Claude ถือ (Codex อย่าแก้)

| งาน | ไฟล์ |
|---|---|
| K1 แผนที่ Zone1 ภาพวาดใหม่ (แทนพื้น tile) + วางอาคาร/ต้นไม้/โคม/หินแยกชั้นหน้า-กลาง-หลัง ตามที่คุณเป้วาง | `src/town-layout.js`, `src/town-terrain.js`, `src/town-scenery.js`, `src/town-map.js`, `src/town-map.css`, ส่วนวาดแผนที่เมืองใน `src/scene.js`, `img/map-zone1/**`, `output/zone1-2d/` |
| K4 ตัดปุ่ม "ดูแผนที่ทั้งหมด" มุมขวาล่าง (ซ้ำกับ minimap) | HUD แผนที่ใน `index.html` / `src/ui.js` (เฉพาะปุ่มนี้) |

## Codex app ถือ (Claude อย่าแก้)

| งาน | ไฟล์ |
|---|---|
| ANIM animation ยมบาทน้อย | ภาพ sprite/เฟรมของยม (`img/**/hero-yama*`), ข้อมูลเฟรม/ท่าทาง (`src/crew-walk-assets.js` ส่วนยม หรือไฟล์ใหม่ของ animation), ฟังก์ชันวาดตัวละคร (`drawStandee` และที่เกี่ยวข้องใน `src/scene.js`) |

## ไฟล์ที่ใช้ร่วม — แก้ได้ทั้งสองฝั่ง แต่แก้เฉพาะบรรทัดของตัวเอง

- `index.html`, `output/game-review/index.html`: query `?v=` ของไฟล์ที่ตัวเองแก้เท่านั้น · preload URL กับ import ใน `src/ui.js` ต้องตรงกันเสมอ
- `img/preload-catalog.json`, `img/manifest.json`: เพิ่มรายการของตัวเอง ห้ามลบของอีกฝั่ง
- `tests/skill-atk.test.mjs`, `tests/west-hit-facing.test.mjs`: regex cache suffix — ถ้าชน ให้รับได้ทั้งสอง suffix
- `src/scene.js`: Claude แตะเฉพาะส่วนวาดแผนที่เมือง · Codex แตะเฉพาะการวาดตัวละคร ถ้าต้องแก้ส่วนของอีกฝั่ง บันทึกในโน้ตก่อน

## ส่งต่อ

- Codex: สรุปงานใน `docs/claude-update-<วันที่>.md` ตามเดิม
- Claude: สรุปใน commit message + รายงานฝั่ง AGAPAE (`Output/Claudy/briefs/2026-10-15-avegee-k*.md`)
- เทสต์ก่อน push: `node --test tests/*.test.mjs` ต้องผ่านหมด
