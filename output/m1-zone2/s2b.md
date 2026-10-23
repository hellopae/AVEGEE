ART-m1-zone2-s2b — AVEGEE บ้านโซน 2 · 23 ต.ค. 2569 · ส่งภาพให้ผู้ตรวจพิจารณา ยังไม่ได้รับรอง QA หรือการเสียบในเกม

อ้างอิงสเปก Mind `2026-10-23-avegee-m1-zone2-art-spec.md` §2, §4.1, §4.3 และ M3 `output/m3/README.md` หัวข้อ “คำขอ Q5 / วาดแก้” จาก worktree `20261023T054046Z-d88c803d` ตามใบงาน ใช้บ้านทั้ง 4 จาก `output/m3/review/s2/rejected/` เป็นภาพก่อนแก้ ไม่ใช้บ้านโซน 1 แทนภาพต้นทางปัญหา

ทำงานบน branch ที่ได้รับ `codex/20261023T060219Z-abcf9bb4` ไม่สร้าง/เปลี่ยน branch หรือ worktree ไม่ commit/push/merge/deploy ไม่เรียก agent และไม่แก้โค้ดเกม

ไฟล์ปลายทางชื่อเดิมตาม §4.3 อยู่ใน `img/town-district/` ทั้ง 4 ไฟล์ มีสำเนา WebP ชื่อเดียวกันและ PNG RGBA ที่ถอดรหัสตรงกันใน [s2b/](s2b/) เพื่อให้ตรวจชุดเดียวกันได้โดยไม่เสียบเกม

| บ้าน / ชื่อไฟล์ | ขนาด canvas | alpha bbox ก่อน = หลัง = โครงโซน 1 | พิกเซล RGBA ที่เปลี่ยน | พิกเซล alpha ที่เปลี่ยน |
|---|---|---|---:|---:|
| `house-front-one-asia-v1.webp` | 1402×1122 | (0,17,1399,1122) | 121 | 0 |
| `house-right-one-asia-v1.webp` | 1438×1094 | (0,0,1438,1078) | 2948 | 2703 |
| `house-left-two-asia-v1.webp` | 1036×1518 | (0,0,1036,1518) | 127 | 0 |
| `house-right-two-asia-v1.webp` | 1036×1518 | (0,0,1036,1500) | 0 | 0 |

bbox ใช้ alpha>0 และขอบขวา/ล่างเป็น exclusive ขนาดหมายถึงจำนวนพิกเซล ไม่ใช่จำนวนไบต์ที่บีบอัด ขนาดไบต์และ SHA-256 ของต้นทาง/ปลายทางบันทึกใน [verification.json](s2b/verification.json) ไม่มีการย่อ ขยาย ย้ายฐาน ตัด canvas หรือบีบ bbox

right-one: ใช้ built-in ImageGen วาดเก็บขอบปลายทอง แล้วประกอบเฉพาะ canvas x980–1049/y150–229 กลับบนต้นฉบับ โดย blend 5 แถวสุดท้ายให้ต่อกับส่วนเดิม เลือกพื้นที่ถึง y229 เพื่อให้ปลายส่วนซ่อมต่อเนื่องกับทองด้านล่าง ไม่ใช้ภาพที่ generate ทั้งหลังแทนต้นฉบับ ส่วนอื่นของภาพ generate ไม่ถูกนำมาใช้ เก็บ RGB ที่ปน key ตาม contour และเอาปุ่ม matte ขาว 12 พิกเซลใกล้ (275,108), (114,267) ออกด้วย รายการพิกเซลที่เอาออกอยู่ใน JSON

ที่ (1014,187) ก่อนแก้ RGBA=(248,198,252,255) หลังแก้=(127,42,42,6) เป็น antialias โปร่งเกือบหมด เมื่อ composite บน #202020 ได้ RGB=(34,32,32) และบน #E0E0E0 ได้ (222,220,220) ภาพก่อน/หลังบริเวณ x980–1050/y150–220 อยู่ใน [right-one-suspect-edge-before-after-400.png](s2b/right-one-suspect-edge-before-after-400.png) ขอบชมพู/ขาวทึบที่ M3 ชี้ไม่ปรากฏในภาพนี้หลังแก้

front-one/left-two/right-one: เก็บสี key ตกค้างบน contour โดยใช้ `min(R,B)-G>20` ร่วมกับบริเวณที่มี alpha<64 ในระยะ 3 พิกเซลเป็นตัวช่วยเลือก จากนั้นอ้างสีวัสดุข้างเคียงที่ opaque และไม่ติด key เพื่อเก็บ RGB ของขอบ ไม่ erosion alpha ทั้งภาพ ไม่ใช้ตัวกรองเป็นหลักฐานว่า halo ทุกชนิดถูกลบหมด และไม่แตะเนื้อวัสดุภายในด้วยตัวกรองกว้าง ๆ

right-two คงพิกเซลและไบต์ตรงต้นทาง: จุด (959,586) อยู่ภายในลายทอง ไม่ติด contour โปร่งใส จึงไม่ลบเพราะตัวกรองสีอย่างเดียว ส่วน left-two เหลือ filter hit ที่ (83,968) RGBA=(225,52,99,255) อยู่บนส่วนแดงภายใน ไม่ใช่ปุ่ม matte นอกขอบ ผลกรอง threshold>45 หลังแก้จึงเป็น front-one=0, right-one=0, left-two=1, right-two=1 ตัวเลขนี้ไม่ใช่ผลรับรองขอบภาพ

หลักฐานภาพใน `s2b/`:

- [contact-sheet.png](s2b/contact-sheet.png): บ้านทั้ง 4 บน #202020 และ #E0E0E0 สำหรับเทียบภาพรวม พาเลตต์ และฐาน
- `house-*-asia-v1-before-after-400.png`: crop จุดเสี่ยงของทุกหลัง ลำดับซ้ายไปขวา ก่อนพื้นเข้ม / ก่อนพื้นอ่อน / หลังพื้นเข้ม / หลังพื้นอ่อน พร้อมพิกัด canvas
- `house-*-asia-v1-contour-{dark,light}-pageNN.png`: ขอบรอบนอกและช่องโปร่งภายในทั้งหมดที่แบ่งเป็น tile 96×96 แล้วขยาย nearest-neighbour 4 เท่า ไม่ smooth; เปิดภาพต้นฉบับ 100% เพื่อดู 400% ของ sprite จริง
- front-one 62 tiles / 6 หน้าแต่ละพื้น, right-one 63 / 6, left-two 53 / 5, right-two 57 / 5 รวม 235 tiles ต่อพื้นและ 44 หน้า เปิดดูครบทั้งสองพื้นแล้ว เป็นการตรวจภาพของผู้ทำงาน ไม่ใช่การอนุมัติจากผู้รับงาน
- WebP lossless RGBA และ PNG RGBA ทั้ง 4 เป็นไฟล์ส่งออกจริง ไม่ใช่ภาพมีพื้น composite

ImageGen ใช้โหมด built-in edit, `transparent_background=true`, reference คือไฟล์ rejected ของ right-one ข้างต้น ไม่ใช้ CLI/API fallback คำสั่งที่ส่งจริง:

> Edit this existing sprite ONLY to remove the pale pink / white magenta-key fringe OUTSIDE the gold roof-end ornament at canvas x980–1050 y150–220, especially (1014,187), original canvas 1438x1094. Preserve all building artwork, framing, scale, placement, gold ornament silhouette, crisp dark outline and genuine warm gold highlights. Transparent background. Do not shrink the object or alpha bbox; no redesign, no new detail. Clean transparent contour outside the gold, no pink or white matte. Save output inside /Users/agapae/agapae-work/.codex-worktrees/20261023T060219Z-abcf9bb4/output/m1-zone2/s2b/ if destination control is available.

เครื่องมือเก็บภาพ generate ใน cache ของตัวเองอัตโนมัติ ไม่มีตัวเลือกกำหนดปลายทางใน API ที่ใช้ ไฟล์ส่งมอบและหลักฐานทั้งหมดอยู่ใน working directory นี้ ใช้ Pillow/NumPy สำหรับประกอบส่วนซ่อม เก็บสีขอบ ส่งออก และวัดค่าจริง ไม่ได้สร้างไฟล์สคริปต์หรือเปลี่ยน source code

การตรวจที่รันจริง: Python/Pillow/NumPy assertions ตรวจครบ 4 ไฟล์เรื่องขนาดตรงสเปก, RGBA, chunk VP8L, bbox เท่าต้นทางและโครงโซน 1 ทุกค่า, สำเนา WebP ตรงกันทุกไบต์, PNG ตรง decoded WebP ทุกพิกเซล, alpha ของอีก 3 หลังตรงต้นทาง, alpha ที่เปลี่ยนของ right-one อยู่เฉพาะ patch และ matte 12 พิกเซลที่ระบุ, right-two ตรงต้นทางทุกไบต์ และโหลด PNG หลักฐานทุกไฟล์ได้ รอบสุดท้ายไม่มี assertion error; `git diff --check` ไม่มีข้อความผิดพลาด ไม่มีการรันเทสต์เกมหรือ browser integration เพราะเป็นงานภาพเท่านั้น

เก็บประวัติตรวจที่ผิดสมมติฐานไว้ใน JSON: รอบแรกบังคับ alpha จุดเป้าหมายเป็น 0 จึงเกิด AssertionError เพราะ antialias จริงเป็น 6 รอบถัดมาบังคับค่าสีเบี่ยงจากพื้นไม่เกิน 3 ระดับ จึงเกิด AssertionError บนพื้นอ่อนซึ่งเบี่ยง 4 ระดับ ปรับการตรวจให้ตรวจ coverage≤8/255 และส่วนต่างช่องสี≤3 บนทั้งสองพื้น พร้อมดูภาพจริง ไม่มีการแก้ภาพเพื่อบังคับให้ตรงสมมติฐานเทสต์

Self-check ตามใบงาน:

1. right-one: ส่งส่วนซ่อมพร้อม crop ก่อน/หลังตรงบริเวณ M3 และจุด (1014,187); bbox ตรงเดิมทุกค่า ไม่บีบกรอบ
2. บ้านทั้ง 4: เปิดตรวจ contour 400% บนพื้นทั้งสองสี เก็บสีขอบของ 3 หลัง ส่วน right-two ไม่มีการเปลี่ยนพิกเซล ขนาด/โหมด/การบีบอัด/bbox มีหลักฐานวัดซ้ำ ผลการยอมรับเรื่อง halo ให้ผู้ตรวจพิจารณาจากภาพ
3. ส่งออกชื่อเดิม 4 ไฟล์ใน `img/town-district/` และสำเนาใน `output/m1-zone2/s2b/` พร้อม contact sheet, crop 400% ก่อน/หลัง, PNG, รายงานตัวเลข และ README นี้
4. ขอบเขต: ไม่มีการแก้ `src/`, `index.html`, `tests/`, hooks, `status.json`, `worklog.json`; ไม่ commit/push/merge/deploy และไม่รับรอง QA หรือการทำงานในเกม
