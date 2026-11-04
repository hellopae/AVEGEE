# ชายแดนโซน 1 — ชุดเลเยอร์สำหรับตรวจภาพ

สถานะ: **วาดและส่งออกแล้ว / ตรวจภาพย่อและ overlay แล้ว / ยังไม่ประกอบในเกม**
ยังไม่รับรองว่าผ่านครบทุกเกณฑ์: ขอบหน้าผาบางส่วนยังซ้อนเหลื่อมจากผังเจ้าของ และยังตรวจ viewer ในเบราว์เซอร์จริงไม่ได้

- Atlas RGBA **2300×2524 px** สัดส่วนตาม artboard 1935.4×2123.95 pt
- ImageGen ในตัว **3 ครั้งใน run นี้**: terrain-only 1 + รายละเอียดบน/ล่าง 2; ภาพร่างจาก run ก่อน 1 ครั้งไม่นับรวม run นี้ ไม่ใช้ Shado
- ใช้ภาพร่าง run `27bb6f4e` ต่อ มีสำเนาใน `input/terrain-concept-draft.png`
- รายละเอียด register กับฐานร่วม: **307 / 421 inliers**; alpha ล็อกจากฐาน ไม่ใช้ alpha ของภาพรายละเอียด
- **20 tiles**: PNG เซลล์ 512 px และ WebP lossless มี gutter 2 px แบบต้นแบบ; ประกอบคืนต่างจาก atlas **0 pixels** ทั้งสองชนิด
- Sky และภูเขาใช้โซน 1 เดิม; ภูเขาวางตาม rect ของผังเจ้าของ แม่น้ำม่วงแยกชั้นใต้ตลิ่ง ไม่มีการสร้างของเหลวใหม่
- แม่น้ำ **12 เฟรม / 4 วินาที** และ `flows/river-3-cycles.webp` **36 เฟรม / 3 รอบ**; ขยายผืนด้วยการซ้อนต่อ texture เดิมและ fade ขอบบน ไม่วาดหินหรือวัตถุเพิ่มในของเหลว
- ประตูไทยใช้ sprite ต้นฉบับที่เจ้าของใช้จริง ทั้ง 2 บานแยก front/back; วัตถุรวม **10 ชิ้น** (ประตู 4 ชิ้น + ตกแต่ง 6 ชิ้น) พร้อม foot
- ชุดไฟล์ประมาณ **59 MB**; ขนาด byte ที่ตรวจล่าสุดอยู่ใน `verification.json` (เพดานใช้แบบเข้มงวด 80,000,000 bytes)

## ผลตรวจตนเองตามเกณฑ์รับงาน

| ข้อ | สถานะ | หลักฐานและข้อจำกัด |
| --- | --- | --- |
| 1 ภาพรวมตรงผังและเข้ากับโซน 1 | **ยังไม่ผ่านเต็มข้อ** | `composite-preview.jpg` กว้าง 1600 และ `owner-overlay.jpg` ซ้อน 50% มีองค์ประกอบและประตูตามผัง; rect ประตูคลาดไม่เกิน 0.474 px; SIFT เทียบผังมี 94 inliers, median residual 2.835 atlas px แต่ยังเห็นขอบหน้าผาบางส่วนเหลื่อม โดยเฉพาะซ้ายล่าง ตัวเลข feature ไม่พิสูจน์ silhouette ทุกจุด ดู `owner-registration-review.json` และ `visual-review.json` |
| 2 แยก terrain / ของเหลว / วัตถุ มี foot | **ผ่านการตรวจชั้นภาพและพิกัด** | ฐานและภาพรายละเอียดไม่มีประตู/ต้นไม้ติด; ของเหลวใช้ river-only; วัตถุทั้ง 10 ชิ้นมี foot และ alpha ของพื้นในพื้นที่ 7×7 รอบ foot ต่ำสุด 255; ชิ้นประตู front/back ไม่ทับกันและรวมคืน sprite ได้ตรงทุกพิกเซล ดู `layout.json`, `object-review.json` |
| 3 tile / เส้นทาง / ขนาด | **ผ่านการตรวจไฟล์** | `tile-review.json`: PNG/WebP ตรงทุกพิกเซล; `connection-review.json`: ทั้ง 6 ช่วง รวม 114,406 จุดตัวอย่างใน corridor กว้าง 64 px มี alpha ต่ำสุด 255; `verification.json`: ต่ำกว่า 80 MB เป็นการตรวจ alpha ไม่ใช่ walkmask หรือ collision ในเกม |
| 4 README / จำนวนครั้ง / ข้อไม่แน่ใจ / สถานะ | **ผ่านการจัดทำเอกสาร** | prompt เต็มใน `generation-prompts.json`, ledger ใน `generation-ledger.jsonl`; ระบุสิ่งที่ยังไม่ยืนยันและสถานะการประกอบแยกไว้ชัดเจน |

## ไฟล์หลัก

- `manifest.json`: พิกัดร่วม, tiles, layers, liquids, layerOrder
- `terrain-atlas.png`, `terrain-alpha-preview.png`, `terrain-png/`, `terrain-webp/`
- `layers/sky.png`, `layers/mountains.png`, `layers/river.png`, `flows/`
- `layout.json`, `objects/`: `foot` เป็นสัดส่วนใน sprite; world foot = `[x+foot[0]*w, y+foot[1]*h]`
- ประตูล่างคง rect ตามเจ้าของและถูกตัดที่ขอบ artboard; foot ยึด threshold ที่เห็นในภาพ (`y=.83` ของ sprite) ไม่ใช่ฐานกำแพงส่วนที่อยู่นอก artboard
- `composite-preview.jpg`, `owner-overlay.jpg`, `connection-preview.png`
- `index.html`, `viewer-cache.js`: ดัดแปลง viewer terrain-seamless; โหลด tiles/วัตถุรอบกล้อง ซูม 2 ระดับ สลับ 5 ชั้น และเล่น/หยุดแม่น้ำ
- `source-provenance.json`, `detail-registration.json`, `flow-review.json`, `viewer-review.json`

## วิธีเปิดและตรวจซ้ำ

จากราก worktree รัน `python3 -m http.server 8765 --bind 127.0.0.1` แล้วเปิด
`http://127.0.0.1:8765/docs/art-reviews/2026-11-05-frontier1-redraw/`
ต้องเปิดผ่าน HTTP เพื่อให้ fetch และ ES module ทำงาน

สคริปต์ใน `scripts/`:

1. `python3 scripts/prepare-frontier1-base.py` — ตัด chroma key แบบ int16, เลื่อน landing บนและบีบ apron ล่างตามผัง
2. `python3 scripts/export-frontier1-terrain.py` — สำเนาดัดแปลง `export-seamless-terrain.py`; register รายละเอียด ล็อก alpha และส่งออก tiles
3. `python3 scripts/build-frontier1-review.py` — ประกอบไฟล์ส่งมอบ (ขั้นนี้อ่านคลังอ้างอิงเดิมแบบ read-only)
4. `python3 scripts/verify-frontier1-review.py` — ตรวจพิกเซล/gutter/alpha/foot/loop/ขนาดจากไฟล์จริง
5. `node --experimental-vm-modules scripts/check-frontier1-viewer-logic.mjs` — ตรวจ logic ของ module จริงด้วย DOM/canvas/image-decoder จำลอง
6. `python3 scripts/check-frontier1-viewer.py` — ทดสอบ browser จริงเมื่อสภาพแวดล้อมอนุญาต

## สิ่งที่ตรวจแล้วและยังไม่ยืนยัน

- ตรวจภาพย่อ terrain, ชิ้นที่ใช้ซ้ำ, composite และ overlay ทีละภาพ ไม่เปิดภาพใหญ่พร้อมกัน
- ตรวจ logic viewer: 4 ตำแหน่ง × 2 ซูม, สลับ 5 ชั้น, น้ำ 13.76 วินาที, pause, overview; 950 เฟรมจำลอง ไม่มี cache error, decode พร้อมกันไม่เกิน 2 ภาพ, peak 27,344,288 bytes ภายใต้เพดาน 40 MiB
- **ยังไม่มีผลทดสอบในเบราว์เซอร์จริง**: Chromium headless ถูก sandbox ปฏิเสธ MachPort ก่อนโหลดหน้า; browser access host ที่เชื่อมเครื่องใช้งานไม่ได้ การจำลองไม่พิสูจน์ responsive layout, สี, compositing หรือ browser decoding
- **ยังต้องแก้/ยืนยันภาพตามเกณฑ์ 1**: ขอบหน้าผาที่เหลื่อมใน overlay; โทนแสงและขนาดวัตถุเป็นการตรวจตนเองจากภาพอ้างอิง ไม่ใช่การรับรองจากเจ้าของ
- **ยังไม่ประกอบในเกม**: ไม่ได้แก้ `src/`, `tests/`, index ของเกม, walkmask/collision หรือทดสอบตัวละครเดินผ่านประตู การเรียง front/back ขณะมีตัวละครต้องทดสอบตอนประกอบ
- ไม่มี commit/push/merge/deploy และไม่ได้เปลี่ยน branch
