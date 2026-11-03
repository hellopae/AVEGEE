# AVEGEE — แผนที่แยกเลเยอร์ · 3 พฤศจิกายน 2569

ฐาน `812152d2`, สำเนางาน `AVEGEE/layered-map-work`, branch `codex/2026-11-03-layered-map-pilot`.
เป็นต้นแบบภาพและหน้าตรวจแยกต่างหาก ยังไม่ติดตั้งในเกม ไม่ merge/push และไม่แก้ไฟล์ค้างใน checkout เก่าหรือ worktree อื่น.

## ข้อกำหนดและสิทธิ์ล่าสุด

- เจ้าของเลือก ImageGen ในตัวแทน Shado (AI link port busy และผลภาพไม่ตรงที่ต้องการ). ใช้ built-in เท่านั้น ไม่มี API key/CLI fallback.
- หลังสิทธิ์เดิม3+24=27ครั้ง เจ้าของตอบ “ขยายเพดาน ไปตามความเหมาะสมเลยครับ”. รอบนี้ใช้รวม40ครั้ง: เพิ่มเสา/ราว6ฉาก, B34 local repair2ภาพ และ liquid-only5ฉาก. ไม่มีงาน generation ค้าง. บันทึกต้นทางทุกภาพใน `generation-ledger.json`.
- สร้างและตรวจทีละภาพ; ตรวจ metadata ก่อนเปิด และใช้ภาพย่อสำหรับตรวจภาพรวม ไม่โหลดภาพทั้งหมดพร้อมกัน.
- ไม่ลบภาพเก่า ไม่ย้อน commit. ภาพร่าง/รุ่นก่อน/diagnostic เก็บไว้เพื่อเทียบ.
- ทุกเมืองและชายแดนใช้การแยกพื้น, ธรรมชาติคงที่, เสา/ราว และของเหลว. ของเหลวใช้ sprite animation ภายในขอบเดิม ไม่เลื่อนตลิ่ง/ต้นไม้/หินตามน้ำ.
- เสา/ราวมีชั้นบังตัวละครและฐานกั้นการเดินแยกกัน. ไม่ขยาย owner walk mask ตามภาพที่ AI วาด.

## ไฟล์และหน้าตรวจ

| แผนที่ | พื้น / ธรรมชาติ / เสา-ราว / ของเหลว | ขนาดต้นแบบ |
| --- | --- | --- |
| ชายแดน1–2 | `floor-study.png`, `nature-study.png`, `rails-study.png`, `liquid-study.png` | 1672×941 โดยประมาณ |
| โซน1/2/3/4 | `zoneN-{floor,nature,rails,liquid}-study.png` | 1536×1024 |
| ชายแดน2–3 | `border23-{floor,nature,rails,liquid}-study.png` | 1672×941 โดยประมาณ |
| ชายแดน3–4 | `border34-floor-v2-study.png`, `border34-{nature,rails,liquid}-study.png`, patches/infill | ประกอบ1672×941 |

บางภาพที่สกัดต่างจากต้นฉบับ1px; viewer ใช้พิกัด normalized. ขนาดจริง/alpha/hash อยู่ `asset-manifest.json`.
`water-loop-sheet.png` และ `lava-loop-sheet.png` อย่างละ8เฟรม4×2, 1774×887; renderer ตัด inset2px, water8fps/lava6fps. ยังต้องเก็บทิศทางน้ำตกและรอยต่อของ loop แต่ละบริเวณ.

เปิด server จาก root สำเนางาน:

```sh
python3 -m http.server 8873 --bind 127.0.0.1
```

- `/docs/art-reviews/2026-11-03-layered-map/index.html`: ชายแดน1–2 และต้นไม้ฉากหน้าจากf2.
- `/docs/art-reviews/2026-11-03-layered-map/maps.html`: อีก6ฉาก เลือกโหลดทีละฉาก คลิกหรือใช้WASD/ลูกศรทดลอง Yama.
- ค่าเริ่มต้นไม่รองภาพแผนที่รวมแล้ว: วาดท้องฟ้า → liquid base + sprite → พื้น → nature → ราว/actor ตามเท้า → สภาพอากาศ. เปิดภาพเดิมเพื่อเทียบได้.
- เมฆ/เงาเมฆ/หมอก/หิมะ/ฝนใช้ renderer เดิมแยกจากภาพ; checkboxสภาพอากาศแยกจากการไหล. Pause หยุดทั้งสองส่วน. ยังไม่มี camera-parallax ในหน้าตรวจนี้.
- `generation-prompt-specs.json` เก็บข้อกำหนด prompt ของชุด liquid ล่าสุด; ledger เก็บ provenance รวม40ภาพ. ไม่ใช้ภาพรวมธรรมชาติมาเดาสีเป็นหน้ากากน้ำ.

## เสา/ราวและการเดิน

`src/map-structures.js` ใช้ silhouette สำหรับบังภาพ, footprint ช่วงฐานสำหรับกั้นเดิน. รวมช่องว่างแนวตั้งในราวโปร่งก่อนหาเท้า เพื่อไม่เปลี่ยนขอบหน้าต่างเป็นฐานเสา. สุ่ม footprint ให้ตรง grid ของ owner mask แล้วลบเฉพาะเซลล์ใน mask สำเนา.

- โซน3: ย้ายเสา2กลุ่มให้ตรงฐานจริงบนบันไดตาม `object-registration.json`; เดิมเสาที่วางผิดกั้นทางไปชานพัก. ไม่เปิดเซลล์ owner เพิ่ม.
- ชายแดน3–4: ตัดราวสีทองที่สกัดผิดจากซากตกแต่งนอกทางออกจาก rail plate เฉพาะตอนประกอบ; ซากจริงยังอยู่ใน nature. ไม่แก้ PNG ต้นฉบับ.
- เมืองทั้ง4: จุดหมาย12จุดต่อเมืองยังเข้าถึงได้โดยไม่ต้องเลื่อนจุดหมาย (shift0). ชายแดน2–3และ3–4: checkpoints3+exit ตำแหน่งเดิมผ่านครบ; ทดสอบคลิกฐานเสาแล้ว Yama ไม่เดินเข้า.
- ชายแดน1–2: checkpoints3+exit ผ่านครบ; ปัจจุบัน footprint21453pixels. หลักฐาน `navigation-review.json` และ `rail-navigation-registered-zone1-zone2-zone3-zone4-border23-border34.json`.

## B34 local floor repair

พื้นรุ่น2ยังมีช่อง alpha ที่ทางโค้งบน/ล่าง. ใช้ `b34-upper-patch.png` และ `b34-lower-patch.png` วาดแก้เฉพาะพื้นที่ แล้วประกอบด้วย `src/map-floor-repair.js`:

- ทาส่วนแก้เฉพาะ cellพื้นเดิมที่ alpha<180; ไม่ทับภาพทึบเดิมและไม่ขยายทางเดิน.
- alpha coverage ที่162033เซลล์พื้น: ก่อน96.786% → หลัง2patches99.434% → หลังเติมเศษช่องเล็ก100%.
- เศษ917pixelsใช้ตัวอย่างพื้นทึบจาก patch เดิม (`floor-infill.json`), จำกัดไม่เกิน1024pixels; guard ปฏิเสธการใช้ texture กลบ mismatch ขนาดใหญ่.
- `b34-composed-floor-report.json` คือผลประกอบ; ค่า96.785%ใน manifest ดิบเป็นค่า PNG ก่อนประกอบ ไม่ใช่ผลซ่อมสุดท้าย.
- **100%เป็นเพียงความทึบ ไม่รับรองความตรงของผัง ลวดลายพื้น รอยต่อ หรือการตรวจรับเชิงภาพ.** SIFT diagnostic ใน `b34-affine-diagnostic.json` ล้มเหลวและไม่ได้ใช้ transform นั้น.

## ผลตรวจปัจจุบัน

- Focused tests33/33ผ่าน: layer contract, surface masks/sprite frame, grouped rail feet/grid, immutable owner mask, bounded local repair และ regressionของB12/B23/B34.
- Chromium desktop1280และmobile viewport390: ทั้ง7ฉากไม่มีpageerror/overflow, ปุ่มpauseตอบสนอง. ไม่มีข้อสรุป physical-phone FPS หรือ overheadไม่เกิน2ms.
- ตรวจของเหลวโดยปิดสภาพอากาศ: opaque nature ของทั้ง7ฉากไม่มีpixelเปลี่ยนเกิน2ระดับ, maxdelta1 ขณะที่pixelในฉากเปลี่ยนจริง. Gallery6ฉากยังทดสอบpauseพร้อมสภาพอากาศแล้วภาพคงเดิมทุกpixel.
- หลักฐาน `browser-review.json`, `gallery-browser-review.json`, `motion-static-nature.json`, `gallery-motion-static-nature.json`, `tests-focused.log`; scriptsทำซ้ำอยู่ `verification/`.
- ไม่ได้รัน fullsuite1906ข้อซ้ำ และไม่ใช้ผลเกมออนไลน์เดิมมาอ้างเป็นผลต้นแบบนี้.

## งานที่ยังต้องทำก่อนใช้จริง

1. ตรวจขอบalphaและ registration ทุกชิ้นกับพื้น/บันได/ประตู/ถ้ำ โดยเฉพาะช่องว่างที่เปิดให้เห็นท้องฟ้าแทนหมอกเดิม; อย่าเปิดภาพรวมเพื่อซ่อนข้อบกพร่องแล้วถือว่าผ่าน.
2. แบ่ง nature plate เป็นวัตถุหรือกลุ่มที่มีbaselineจริงสำหรับเรียงกับactor. Viewerใช้ชั้นnatureรวมและforegroundเดิมบางส่วน; ยังไม่ได้แก้การบังตัวละครของต้นไม้/อาคารทุกต้นในเกม.
3. เก็บผิวของเหลว/ฟอง/ทิศทางน้ำตกเป็นหลายpatchหรือหลายspriteตามความเหมาะสม. อย่าขยับแสงเครื่องจักรสีฟ้าในB34ตามน้ำ; เก็บไว้ชั้นคงที่.
4. ทำ native-detail tilesครบ80ตำแหน่งหลังผังนิ่ง; ต้นแบบเมือง1536×1024ยังไม่ปิดปัญหาแตกเมื่อซูมสูงสุด.
5. ทดสอบเกมจริง การเดิน/occlusion/seams และประสิทธิภาพอุปกรณ์จริง ก่อนติดตั้ง runtime.

ไฟล์Desktop f1/f2/m1/m2ไม่พบในfilesystemรอบนี้. จุดต้นไม้21จุดใน `foreground-anchors.json` ถอดด้วยตาจากภาพแนบ จึงยังต้องตรวจราก/ขนาดและไม่อ้างว่าพิกัดแม่นยำจากไฟล์ต้นฉบับ. คิวGrace/ภารกิจ/เนื้อเรื่องและงานอื่นไม่ได้ปิดจากงานชุดนี้.
