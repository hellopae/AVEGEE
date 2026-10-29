# MAP-Z4 — 29 ต.ค. 2569

เพิ่มภาพรายละเอียดโซน 4 และ renderer แบบ tiles โดยคงโลกเดิม 1678×937 และแหล่ง collision เดิม งานนี้ **ยังไม่ยืนยันเกณฑ์รับงานครบ** และไม่มีผล browser/mobile QA

## ไฟล์ที่เปลี่ยน

- `img/map-zone4/v2/`: 20 WebP tiles, preview และ stitch-report.json; ใช้ขนาดชุดเดียวกับโซน 2 (4915×3277, tile 1024, ขอบขวา 819, แถวล่าง 205)
- `src/cyberhell-terrain.js`: โหลดเฉพาะมุมกล้อง, 3 requests พร้อมกัน, เก็บภาพ decoded + กำลังโหลดสูงสุด 12, retry/backoff/timeout, รอครบทั้งมุมกล้องก่อนสลับภาพ
- `src/scene.js`: ใช้ tiles ทั้งพื้นและชั้นสะพานบังเรือ; fallback วาดภาพเดิมแบบ clip ด้วย viewport โดยไม่สร้าง canvas เต็มโลก
- `index.html`: importmap ของ module ใหม่ และ bump เฉพาะ scene.js ที่แก้
- `scripts/build-map-z4.py`: ขั้นตอนจัดแนว/ถ่ายรายละเอียด/stitch/tiles/หลักฐาน ทำซ้ำจากภาพวาดที่เก็บไว้ได้
- `tests/map-z4-terrain.test.mjs`: พิกัด, tile coverage/ขนาด/งบโหลด, timeout/retry, ภาพครบกล้อง, pan/eviction และ hash navigation เดิม
- โฟลเดอร์นี้: ภาพต้นทางวาดใหม่, prompts, baseline hashes, ภาพเปรียบเทียบ, overlay และผลทดสอบ

## ตรวจ source และเหตุผลของ implementation

เกมเลือก `img/theme-v4/map-cyberhell.webp` ก่อน `img/scene-cyberhell-v2.png` ใน scene.render ส่วน buildWalk อ่านภาพ legacy หลังสุดดังกล่าว จึงเก็บภาพทั้งสองและตรรกะ collision เดิมไว้

`ZONE_SKIN.cyberhell.enabled` ยังเป็น false และ `town-owner-walkmask-cyberhell.js` ยังเป็น null ส่วน map-zone4/v1 เป็นแผนที่อีกผังหนึ่งที่ยังไม่เปิดใช้ การเปิด town skin จะย้ายโลกเป็น 3840×2560 พร้อมนำ geometry โซนอื่นมาใช้ จึงใช้ tile renderer สำหรับโลกปัจจุบันแทน ไม่แก้พิกัดอาคาร/NPC/ทางออก ไม่วาดโรงอาหาร ไม่แก้ FOOD-A

## ที่มาภาพ / ทำซ้ำ

ใช้ built-in `image_gen` เท่านั้น ไม่มี Shado หรือ CLI/API fallback ทั้งหมด 5 calls: ภาพเต็มรอบแรก 1 ภาพไม่ถูกใช้ (ความละเอียดไม่พอและผังคลาด) แล้ววาด 4 quadrant ที่มี overlap จากภาพ theme จริง `prompts.json` เป็น prompt สุดท้ายแต่ละส่วน

ภาพวาดใหม่อยู่ใน `repaints/q-{nw,ne,sw,se}.png` ขนาด native 1678×937 (NE 1679×937) ต่อ crop เดิม 944×527 จึงมีรายละเอียด native เพิ่มประมาณ 1.78 เท่าในแต่ละแกน ไม่ใช่เพียงขยายภาพเดิม ภาพ reference crop อยู่ใน `references/`

สคริปต์ใช้ dense registration สำหรับรายละเอียดภาพใหม่, stitch ด้วย geometry/overlap ของ town_terrain_lib, เก็บแสง/สีความถี่ต่ำและแถบรอบขอบโครงสร้างจากต้นฉบับ เพื่อลดการเปลี่ยนผัง แล้วถ่ายรายละเอียดผิวที่วาดใหม่ในพื้นที่ส่วนที่เหลือ (~32.0% ของ canvas) ไม่ได้แทนภาพเก่าทุกพิกเซลด้วยภาพวาดใหม่ทั้งหมด

```sh
python3 scripts/build-map-z4.py --src output/coordination/2026-10-29-map-z4/repaints
```

## หลักฐานและ self-check เกณฑ์รับงาน

1. **ภาพเทียบ 3 จุดและ overlay ≤2px: ยังไม่ยืนยันครบ**
   - `zoom-max-lava-bridge.png`, `zoom-max-throne-stairs.png`, `zoom-max-east-dock.png`: ก่อน/หลังที่ zoom สูงสุดปัจจุบันของโซน 4 (2.5), จำลอง camera 1280×720, DPR1 จาก tile จริง เป็นภาพ terrain-only ออฟไลน์ ไม่ใช่ screenshot ใน browser
   - `layout-edge-overlay.png`: แดง=ขอบต้นฉบับ, cyan=ขอบภาพส่งจริง, ขาว=ตรงกัน
   - วัดขอบโครงสร้างหลัง Gaussian sigma 2 และ Canny 30/60 บนภาพ 1678×937: median 0px, p95 1px, 98.34% ภายใน 2px, สูงสุด 12.21px **จึงไม่อ้างว่าทุกจุดต่าง ≤2px** ตัววัดเป็นระยะขอบใกล้สุด ไม่ใช่การพิสูจน์ semantic landmarks ทั้งหมด
   - `layout-site-overlay.png` และ `anchors.json`: ตำแหน่งอาคาร/crew home/frontier/entry จาก syncSceneZone ปัจจุบัน วางจุดเดิมบนภาพก่อนและหลัง (ไม่มี sprite/actor rendering)
   - ไฟล์ geometry/navigation และภาพ collision เดิมตรงกับ baseline ทุก byte ตาม regression test แต่ข้อมูลนี้อย่างเดียวไม่พิสูจน์ overlay ของภาพใหม่
   - Dale ยังต้องตรวจภาพจริงพร้อมอาคาร/NPC และตำแหน่งทางออกในเกม รวมถึงรอยต่อ tiles/เรือ และตัดสินความละเอียดที่เพิ่มขึ้น
2. **ขนาด/หน่วยความจำใกล้โซน 2 และเทสต์เต็ม 0 fail: ตรวจแยกแต่ละส่วน**
   - 20 tiles 4915×3277: 2,790,216 bytes เทียบโซน 2 ที่ 4,625,162 bytes
   - Decode RGBA ทั้งชุด 64,425,820 bytes เท่ากับโซน 2
   - Loader จำกัด tile images + in-flight 12 ภาพ: upper bound เฉพาะ tile RGBA 50,331,648 bytes (48 MiB), ไม่รวมภาพ legacy, sprite cache, browser overhead; โหลดพร้อมกัน 3 ภาพ ใช้ภาพเดิมเมื่อ overview กินมากกว่า 12 tiles
   - มี unit test งบโหลด/eviction และไม่มี canvas เต็มโลกใหม่สำหรับโซน 4 แต่ยังไม่ได้วัด memory/network/frame timing บนอุปกรณ์มือถือ
   - เทสต์เต็ม 1,619 pass / 0 fail / exit 0 รันครั้งเดียว; ดูท้ายไฟล์และ `tests-full.log`, `tests-full.exit`
   - หลักฐานทั้งหมดอยู่ใน `output/coordination/2026-10-29-map-z4/` ตาม brief

## การตรวจที่รัน

- `node --check src/cyberhell-terrain.js` และ `node --check src/scene.js`: exit 0
- เฉพาะ loader รอบแรก: 4 tests, 4 pass, 0 fail (`tests-loader.log`)
- `node --test tests/map-z4-terrain.test.mjs tests/m1-map-zoom.test.mjs tests/terrain-loading-recovery.test.mjs`: 15 tests, 15 pass, 0 fail (`tests-targeted.log`)
- `node --test tests/*.test.mjs`: รันครั้งเดียว, 1,619 tests / 1,619 pass / 0 fail / 0 skipped, exit 0, 194.597 วินาที (`tests-full.log`, `tests-full.exit`)
- `git diff --check`: exit 0

ไม่เปิด browser ตามข้อจำกัด brief ไม่ commit/push/merge ไม่สร้างหรือสลับ branch/worktree ไม่ deploy และไม่แก้ hooks/status.json/worklog.json
