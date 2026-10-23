# F12-CODE — AVEGEE ชายแดน 1–2

สถานะ: ลงโค้ดและตรวจด้วย Node แล้ว; ยังไม่ครบเกณฑ์ส่งมอบ เพราะไม่มีหลักฐานภาพเบราว์เซอร์ 1280/390 และ construction-arrival.test.mjs หมดเวลา 240 วินาที จึงยังไม่ยืนยันชุดเทสต์เดิมทั้งหมด ไม่ใช่การรับรอง QA

## สิ่งที่เปลี่ยน

- `scripts/build-frontier-walkmask.py` อ่าน PNG ขาว/ดำของเจ้าของงาน 1672×941 แบบ 1 pixel/1 cell ไม่ลดความละเอียด แล้วเขียน RLE เริ่มจาก blocked ตามรูปแบบ town mask ลง `src/frontier-walkmask-th-asia.js` พร้อม SHA256 และต้นไม้ 80 ต้น (เก็บเฉพาะ x/y/kind/big ไม่แก้พิกัด)
- `ROUTE_GEOMETRY.walkMask` เป็นข้อมูลราย route; 1–2 ใช้ mask เจ้าของงาน ส่วน 2–3/3–4 มี fallback mask ที่สร้างจาก corridor ±.026 และ PADS เดิม ไม่มีการเปิด route เหล่านี้หรือเปลี่ยน vertical legacy view
- `src/dungeon-navigation.js` ถอด RLE, multi-source BFS จาก sample ทุกครึ่งพิกเซลของเส้นหลักเพื่อเติม cellProgress แบบระยะทางบนผืนถนน, BFS หาเส้นทางคลิก และตรวจทุกเซลล์ที่ segment ตัดผ่าน (รวมมุมทแยง) การเดินแบ่งก้าวย่อยและไถลตามแกนเมื่อชนขอบ
- คีย์/จอยลากเป็นเวกเตอร์ 2 มิติ; แตะ/คลิกปล่อยเพื่อเดินตาม path จุดบนพื้นที่แดงไม่รับเป็นเป้าหมาย ไม่มีการ snap คลิกข้ามเหว
- limit ของด่าน = checkpointProgress − .018 เหมือน legacy; ทั้ง movement/path/snap ตัดเซลล์ที่ cellProgress เกิน limit เซฟยังเป็น {x,y}; เซฟที่ใช้ไม่ได้ย้ายไปศูนย์เซลล์ที่เดินได้ใกล้ที่สุดในพิกัดพิกเซลภาพและไม่ข้าม limit
- patrol/chase อ่าน cellProgress; checkpoint/cave/EXIT ยังคงใช้ระยะจริงถึงตำแหน่งเดิมของสถานีบนถนนหลัก ไม่เปลี่ยนศัตรู เนื้อเรื่อง หรือกติกาชนะด่าน
- ทิศและ walkDistance ของยามา/นิรา/ไกด์มาจาก displacement จริงของแต่ละคน นิรา/ไกด์ตามประวัติตำแหน่งจริงระยะ .025/.055 โดยเคลื่อนบน mask ประวัติเก็บตามระยะทางแทนจำนวนเฟรม
- ต้นไม้ red → town-tree-red-th-v1, green → town-tree-asia-v1, lightgreen → town-tree-c-asia-v1 หลังตรวจภาพ: c เป็นไผ่สีเขียวอมเหลือง ส่วน b เป็นไม้ใบแดง ขนาด .052 ของความสูงพื้นหลัง, big ×1.4 ใส่ต้นไม้กับตัวละครในรายการเดียวแล้ว sort ตามโคน y โคนทั้ง 80 ต้นอยู่นอก mask
- minimap วาดผืน mask จาก canvas ที่เตรียมครั้งเดียว; import map เพิ่มโมดูลใหม่และ bump โมดูลที่แก้ด้วย token m2-f12-20261023 คง background zone1-2-v3.webp
- ไม่แก้ไฟล์ img/, town-*, hooks, status.json หรือ worklog.json ไม่ commit/push/deploy และไม่สร้างหรือสลับ worktree/branch

## Vertex ที่ขยับ

ตรวจเดิมพบ vertex 12/13/14 อยู่นอก mask และ segment 3/5/7/12/13/14/20/27/28 ตัดขอบถนน จึง fit 31 vertex โดยลดผลรวมระยะขยับกำลังสองในพิกัดพิกเซล ภายใต้เงื่อนไข sample บน segment ห่างขอบอย่างน้อยประมาณ 1.5 px แล้วตรวจ segment ใหม่ด้วยการเดินตรวจเซลล์ทั้งหมดจริง ไม่ใช่ตรวจแค่ปลายเส้น เป็นผลจาก numerical constrained fit ไม่ได้อ้าง global optimum จุดที่ไม่จำเป็นคงเดิม รวม START, EXIT และ cave vertex 23

CHECKPOINT_VERTEX ยังเป็น 7/15/23; checkpoint 7 ขยับ 2.347 px และ 15 ขยับ 5.419 px บนถนนหลัก Route 2–3/3–4 ยังใช้ corridor ชุดเดิมและ progress เดิมของตัวเอง

| Vertex (0-based) | เดิม | ใหม่ | ระยะขยับ (px) |
|---|---|---|---|
| 3 | [0.2, 0.31] | [0.1995997, 0.3138409] | 3.676 |
| 4 | [0.26, 0.33] | [0.259462, 0.3352336] | 5.006 |
| 5 | [0.32, 0.38] | [0.3209046, 0.3770783] | 3.138 |
| 6 | [0.37, 0.43] | [0.3706797, 0.4278192] | 2.346 |
| 7 | [0.42, 0.43] | [0.4204958, 0.4323339] | 2.347 |
| 8 | [0.47, 0.4] | [0.4704112, 0.4019354] | 1.947 |
| 11 | [0.59, 0.34] | [0.5921537, 0.3354136] | 5.621 |
| 12 | [0.63, 0.39] | [0.6324162, 0.3816239] | 8.857 |
| 13 | [0.69, 0.43] | [0.691737, 0.4223149] | 7.793 |
| 14 | [0.74, 0.47] | [0.7412542, 0.4652813] | 4.911 |
| 15 | [0.79, 0.51] | [0.791388, 0.5047959] | 5.419 |
| 16 | [0.77, 0.55] | [0.7700559, 0.5502091] | 0.218 |
| 17 | [0.74, 0.58] | [0.7400217, 0.5800813] | 0.085 |
| 20 | [0.63, 0.64] | [0.6314375, 0.6443486] | 4.746 |
| 21 | [0.6, 0.68] | [0.6017651, 0.6853705] | 5.852 |
| 28 | [0.84, 0.85] | [0.8460416, 0.8568359] | 11.976 |
| 29 | [0.88, 0.8] | [0.8870761, 0.8079557] | 14.001 |

## เทสต์เดิมที่ปรับ

- `tests/m2-route-geometry.test.mjs`: เปลี่ยนจำนวนต้นไม้ 13 → 80 ตาม brief, ค่า checkpoint บนแผนที่ 1–2 ตามเส้นที่ fit และเลิกยืนยันว่า route 2–3 ต้องมี arc-length/progress เท่ากับ 1–2 โดยตรึงค่าชุดเดิมของ 2–3 แทน และ export `FALLBACK_CORRIDOR` แยกจาก `DUNGEON_CORRIDOR` ชุดที่ fit ไม่เปลี่ยนทดสอบกติกาชนะ/บอส/การเปิด route
- `tests/frontier-cave-progression.test.mjs`: assertion ที่ large step ต้องคืนจุดเริ่มเดิม เปลี่ยนเป็นตรวจว่าผลยังอยู่บนถนน เพราะงานนี้กำหนดให้ไถลขอบได้; F12 เพิ่มการตรวจ path/segment และก้าวย่อยไม่ข้ามเหว
- `tests/frontier-view-metrics.test.mjs`: ส่ง [x,y] จากต้นไม้ object เข้า walkable แทน array เดิม เพื่อให้การตรวจโคนต้นไม้ยังตรวจตำแหน่งจริง ไม่ได้ยกเว้นต้นไม้จากการทดสอบ

## ผลทดสอบ

- `node --test tests/f12-mask.test.mjs`: 8 tests, fail 0 (tests-mask.txt)
- `node --test tests/f12-input.test.mjs`: 5 tests, fail 0 (tests-input.txt) เป็น canvas/DOM mocks ไม่ใช่ screenshot หรือ browser evidence
- ชุดที่เกี่ยวข้องหลังแก้ล่าสุด: `node --test tests/f12-mask.test.mjs tests/f12-input.test.mjs tests/m2-route-geometry.test.mjs tests/m2-zone-skin.test.mjs tests/frontier-view-metrics.test.mjs tests/frontier-cave-progression.test.mjs tests/l5-auto-encounter.test.mjs tests/o1-frontier-fullscreen.test.mjs tests/p5-map-exits.test.mjs`: 66 tests, fail 0 (tests-focused-final.txt)
- เรียกชุดเต็มด้วย `node --test --test-concurrency=4 --test-timeout=60000 tests/*.test.mjs` แต่ติดไฟล์ที่ทำงาน synchronous นาน จึงรันทุกไฟล์แยกด้วย `node --test <file>` และกำหนด wall-clock timeout ภายนอก (run-suite.py) แล้วรันไฟล์ที่หมดเวลาซ้ำด้วย 240 วินาที: จาก 208 ไฟล์ จบ exit 0 จำนวน 207 ไฟล์ รวม 1,397 tests / fail 0 / skipped 0; `tests/construction-arrival.test.mjs` ยังหมดเวลาที่ 240 วินาทีหลังรายงาน Arrival matrix: 160 walked, 0 recovered at timeout จึงไม่ได้นับไฟล์นี้ว่าไม่มีข้อผิดพลาด และไม่ยืนยัน 1,390/0 ของชุดเดิมทั้งหมด ไม่ได้เปลี่ยนเทสต์เมืองหรือข้ามเทสต์เพื่อทำให้ยอดดูครบ ดู suite-summary.json, suite-results.json, suite-full.txt และ suite-retries.txt
- ชุด 66 ข้อข้างต้นรันหลังแก้โค้ดครั้งสุดท้าย ส่วนเทสต์ของไฟล์ที่ไม่เกี่ยวกับการแก้ไม่รันซ้ำโดยไม่มีเหตุผล
- `git diff --check`: exit 0

## Browser evidence และข้อจำกัด

เตรียม `output/f12-code/browser-harness.html` และ `browser-evidence.mjs` สำหรับเส้นทางจริง 1280/390, การเดินไปแอ่งน้ำซ้าย/เหนือ/บันไดใต้ลานถ้ำ, input และภาพหลังต้นไม้ โดยใช้เกมทดสอบในหน่วยความจำ ไม่อ่านหรือเขียนเซฟผู้เล่น

ความพยายามเปิด headless Chromium ผ่าน Playwright ถูก sandbox ปฏิเสธ MachPort (`KERN_SUCCESS ... Permission denied (1100)`, browser-log.txt) และไม่มี built-in browser ที่พร้อมใช้งาน ต่อมาพบ Brave ที่เชื่อมผ่านส่วนขยาย แต่ origin approval gate แจ้งว่าผู้ใช้ปฏิเสธการเข้าถึง http://127.0.0.1:8765 จึงหยุดทันที ไม่ใช้ช่องทางอื่นเลี่ยงการปฏิเสธ

ยังไม่มี screenshot และยังไม่ได้วัด pageerror ในเบราว์เซอร์ จึงไม่อ้างว่าไม่มี pageerror หรือครบเกณฑ์ภาพ 2 ขนาดจอ

วิธีรันเมื่อมีเครื่องที่อนุญาต: serve repository root ที่ 127.0.0.1:8765 แล้ว `node output/f12-code/browser-evidence.mjs` (ต้องมี Playwright; ระบุ PLAYWRIGHT_MODULE/PLAYWRIGHT_EXECUTABLE หากแพ็กเกจหรือ Chromium ไม่ได้อยู่ตำแหน่งมาตรฐาน) สคริปต์เตรียมสำหรับรันต่อ แต่ยังไม่ได้ตรวจจนครบในเบราว์เซอร์

## Self-check เกณฑ์รับงาน

1. เดินทุกที่ใน mask/ไม่ออกนอก mask: ตรวจ connectivity ทุกเซลล์, finite progress, vertices/segments, จุดพื้นที่แดง, path/g้าวย่อยทั้ง 6 สาย; ยังขาดตรวจด้วยตาในเบราว์เซอร์
2. ทุกทางแยกด้วยคีย์/แตะ: path และ movement ก้าวย่อยครบ 6; handler คลิกครบ 6 ที่ mock viewport สองขนาด; held key handler เดินตาม path จนครบ 6 ใน mock; ยังขาดการตรวจในเบราว์เซอร์
3. ล็อก/checkpoint/patrol/boss cave/EXIT: ทดสอบด่านล็อกทั้งพื้นที่/path/movement, save migration และเทสต์ progression/chase/EXIT เดิมในชุด 66 ข้อ ไม่มีการแก้กติกาเรื่อง
4. ต้นไม้ 80/ความลึก: ตรวจโคนและขนาดทุกชนิด, คำสั่งวาดต้นไม้อยู่หลังคำสั่งวาดยามาเมื่อยามาอยู่หลังโคน; ยังขาดภาพจริง
5. เทสต์ครบ+หลักฐานสองจอ: ยังไม่ครบ หลักฐานเบราว์เซอร์ถูกบล็อก; ยังมี construction-arrival.test.mjs timeout 240s ดูผลตัวเลขข้างต้น
6. README: ไฟล์นี้บันทึกสิ่งที่เปลี่ยน vertex ทั้งหมด เทสต์ที่แก้ เหตุผล และข้อจำกัด
