# R1 — Map UI (28 ต.ค. 2569)

สถานะ: แก้โค้ดและเทสต์แล้ว; หลักฐานภาพจริงยังเก็บไม่ได้ จึงยังไม่ครบเกณฑ์รับงาน และไม่สรุปว่า QA ผ่าน

## สิ่งที่แก้

- เทสต์เก่าที่ผูกชื่อรอบงานใน cache token เปลี่ยนเป็นอ่าน JSON importmap ตรวจพาธและ `?v=` ที่ไม่ว่าง และเทียบ URL ของ entry script กับ importmap โดยคงข้อยืนยันเนื้อหา รูปภาพ ขนาดภาพ และข้อความพลังเวทไว้
- `ui29e` import `SINS` จาก data และส่งให้ VM ที่รันโค้ด destinationChoices จริง
- ลูกศรใน exit-marker ใช้ขนาด/ระยะห่าง 55% ตัดการวาดข้อความทั้งหมด วงพื้นและ exitStep เดิม ส่วนเครื่องหมายบุกเหนือประตูเมืองย่อ 55% และเอาป้ายออก
- ลบ nameplate ของศัตรู/บอสบนชายแดนและบอสบนเมือง ฉากถ้ำแบบ wilderness เดิมไม่มีชื่อหรือเลเวลอยู่แล้ว ส่วนข้อความที่ประตูปลายทางใน renderer legacy ถูกตัดออก
- HUD ชายแดนใช้คีย์ i18n สำหรับชื่อยามา หนังสือคู่มือ และกระเป๋า แทนตัวอักษรอังกฤษที่ใส่ตรง ๆ; เพิ่มคีย์เปิด/ปิดเสียงให้ tooltip HUD ด้วย ค่าเริ่มต้นภาษาเดิมเป็น `th` และคงการจำภาษาที่ผู้เล่นเลือกไว้
- bump token เฉพาะโมดูลที่แก้ พร้อมรักษาคีย์ import alias เดิมและให้ UI entry ตรงกับ importmap
- เทสต์ B5a เปลี่ยนตามข้อกำหนดใหม่ให้ไม่มีชื่อ/เลเวล แต่ยังตรวจจำนวนศัตรูและเส้นทางเปิดศึกเดิม; เพิ่ม regression ตรวจ canvas marker และ template HUD จริงใน VM

## ไฟล์ที่เปลี่ยน

Production:
- `index.html`
- `src/exit-marker.js`
- `src/scene.js`
- `src/frontier.js`
- `src/dungeon-view.js`
- `src/ui.js`
- `src/i18n.js`

Tests:
- `tests/helpers/versioned-imports.mjs`
- `tests/m2-zone-skin.test.mjs`
- `tests/m3-asia-skin.test.mjs`
- `tests/o2-battle-audit.test.mjs`
- `tests/p3-verdict-scene.test.mjs`
- `tests/p5b-art-insert.test.mjs`
- `tests/p6-cauldron-fireball.test.mjs`
- `tests/p8-copy.test.mjs`
- `tests/ui29e.test.mjs`
- `tests/i2b-frontier-boss.test.mjs`
- `tests/r1-map-ui.test.mjs`

Evidence: ไฟล์ในโฟลเดอร์รายงานนี้ (`capture.py`, logs, report)

## การตรวจ

- Targeted tests: 71 tests / 71 pass / 0 fail (`tests-targeted.log`)
- Release tests: `node --test tests/release-20261019.test.mjs` — 8 tests / 8 pass / 0 fail (`tests-release.log`)
- Full suite: กำลังรอผลสุดท้าย (`tests-final.log`)
- `node --check` โมดูล production ที่แก้ทั้ง 6 ไฟล์ และ `git diff --check`: ไม่มีข้อผิดพลาด
- Canvas/VM tests เป็นหลักฐานอัตโนมัติ ไม่ใช่ภาพจาก browser จริง

## Self-check เกณฑ์รับงาน

| เกณฑ์ | ผลที่ตรวจได้ |
|---|---|
| 1. `node --test tests/*.test.mjs` 0 fail พร้อมจำนวน tests/pass | รอ full suite จบ |
| 2. ภาพก่อน/หลังทางออก 4 โซน + ชายแดน desktop และ 390×844 | ยังไม่มีภาพ; โค้ดย่อ 55% และตัดข้อความแล้ว แต่ความชัดที่ zoom ต่ำสุดยังไม่ยืนยันด้วยภาพ |
| 3. ภาพศัตรูชายแดนไม่มีชื่อ/เลเวล | ยังไม่มีภาพ; canvas mock ตรวจไม่มี nameplate ใน 4 โซนที่ DPR 1/2 |
| 4. ภาพเมนูซ้ายล่างไทยและ console ว่าง | ยังไม่มีภาพหรือ console browser; VM รัน template จริงและตรวจคีย์ไทย/อังกฤษแล้ว |
| 5. สรุปไฟล์และหลักฐานในโฟลเดอร์ที่กำหนด | มีรายงาน/log/runner ในโฟลเดอร์นี้; ภาพยังขาด |

## ข้อจำกัดของ browser

Python Playwright เปิด Chromium ไม่ได้: macOS sandbox ปฏิเสธ MachPortRendezvous (`Permission denied (1100)`). เครื่องมือ browser ของเซสชันตอบ `The browser access host is unavailable` (ดู `browser-blockers.log`). ไม่มีการสร้างภาพแทนหรืออ้างว่า console ว่าง

`capture.py` เตรียมเรียก production renderer ด้วย fixture ในหน่วยความจำสำหรับก่อน/หลัง แต่ยังไม่เคยรันสำเร็จใน browser ของสภาพแวดล้อมนี้ จึงไม่ถือเป็นหลักฐานภาพ เมื่อใช้ environment ที่เปิด browser ได้ ให้รันจาก repository root ก่อน wrapper commit:

```sh
python3 output/coordination/2026-10-28-r1-map-ui/capture.py before
python3 output/coordination/2026-10-28-r1-map-ui/capture.py after
```

โหมด before อ่านไฟล์จาก HEAD แบบ read-only; after อ่านไฟล์ปัจจุบัน HTTP hook เปิดเผยตัวเรียกฉากเดิมเฉพาะใน response ของ server ไม่เปลี่ยน source เกม การจัด viewport มี desktop 1440×900 และ mobile 390×844

ไม่มีการเปลี่ยน collision/walk mask/ตำแหน่งทางออก/ระบบต่อสู้/handler ของปุ่ม ไม่มี commit/push/merge/deploy หรือเปลี่ยน branch
