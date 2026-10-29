# MAP-B12-v3 — 30 ต.ค. 2569

แก้เฉพาะชายแดน 1–2 จาก patch run `20261029T130504Z-7e44a153` บน worktree/branch ที่ได้รับ ไม่สร้าง/สลับ branch ไม่ commit/push/merge/deploy ไม่เรียก agent อื่น ไม่ใช้ browser หรือ Shado และไม่แก้ hooks/status.json/worklog.json

## การนำฐานเดิมมาใช้

ใช้ `git apply --reject` กับ patch ที่ระบุ (ยกเว้น baseline ของงาน map-z4 ที่ไม่เกี่ยวข้อง) ได้ reject ใน index.html และ frontier-ambient.js เนื่องจาก main เพิ่ม weather และเปลี่ยน cache version จึงรวมเฉพาะ import/mask/tree/waterfall ของ B12 โดยคง weather ของ main ไว้ ลบ .rej หลังรวมแล้ว เก็บ v5 และ baseline mask/overlay ไว้เทียบ แต่ไม่ยกผลทดสอบเก่ามานับเป็นผลรอบนี้

## ภาพและโค้ด

- `img/frontier-route/zone1-2-v6.webp`: PIL ยืนยัน **3344×1882** เทียบ v5 1672×941 ใช้ built-in image_gen วาดขยายทางทั้งฉาก 1 ครั้ง แล้ววาดรายละเอียด 4 tiles มี overlap 80 world px; register ด้วย SIFT/RANSAC แล้ว blend ขอบ รายละเอียดการประกอบและ hash ใน `stitch-report.json`; prompt ทั้งชุดใน `imagegen-prompts.txt`
- เครื่องมือคืน full edit เพียง 1672×941 จึงไม่ได้ใช้การขยาย full edit อย่างเดียว ภาพ tiles มี native 1640–1641×959 หรือประมาณ 1.87–1.88 เท่าต่อส่วน ก่อนปรับลง canvas 2 เท่า **ไม่อ้างว่าเป็น native generation 2 เท่าทุกพิกเซล**; fallback ของพื้นที่ขอบนอกที่ register แล้วขาดประมาณ 0.0253%
- `src/frontier-walkmask-th-asia-b12.js`: mask จาก polygons ที่ trace ภายในพื้นภาพใหม่ ใช้ world raster 1672×941 และ inset 2px; ไม่เพิ่มความละเอียด navigation ตามรูปเพื่อรักษาพิกัด 0–1/การควบคุมและค่าใช้จ่าย BFS เดิม
- `src/route-geometry.js`: เลือก v6 และปรับ vertices ที่ไม่ใช่ด่านให้ตามถนนใหม่ เก็บ entry/exit/ด่าน 7,15,23 เดิม; boss cave และเงื่อนไขด่านเดิม geometryVersion 2 จาก patch ยังคงเดิม
- renderer มี destination rectangle ตามโลก 1672×941 อยู่แล้ว ไม่ผูกกับ naturalWidth ของภาพ เทสต์เพิ่มใน `tests/f12-input.test.mjs` ใช้ภาพ mock 3344×1882 ตรวจ drawImage rectangle และคลิกพิกัดเดิมไปถ้ำ
- ต้นไม้ 80 รากยังอยู่นอก mask ทั้งหมด รากที่ทับทางใหม่ย้ายไปนอกพื้นที่ floor อย่างน้อย 12px ตาม `tree-relocations.json`; frontier-ambient ใช้ข้อมูลเดียวกับ route
- index.html bump cache เฉพาะโมดูลที่เปลี่ยน; route อื่นและ owner mask เดิมไม่แก้

## ตารางวัดความกว้าง (world scale 1672×941)

วัด `2 × scipy.ndimage.distance_transform_edt` บนสันกลางของหน้าตัดตั้งฉาก: สุ่มแนวทางทุกประมาณ 1 px แล้วหาค่าสูงสุดของ distance transform ภายในช่วงพื้นต่อเนื่องของหน้าตัดนั้น ไม่ข้ามพื้นที่ดำไปถนนอีกสาย ไม่ตัดหัวท้ายทิ้ง ค่านี้วัด **mask ที่ trace จากภาพ** ไม่ใช่การจำแนกพื้นอัตโนมัติจากสีภาพ รายงาน clearance ของแนวเดินจริงแยกไว้ด้วย เพราะจุดด่านเดิมบางจุดอยู่ชิดขอบทาง

| บริเวณ | ก่อน p10 | ก่อน median | หลัง p10 | หลัง median | เกณฑ์หลัง p10≥40 / median≥48 |
|---|---:|---:|---:|---:|---|
| เส้นหลัก | 18.87 | 34.00 | 41.76 | 67.14 | ถึงเกณฑ์ตัวเลข |
| ทางตะวันตก | 11.66 | 15.23 | 48.18 | 69.66 | ถึงเกณฑ์ตัวเลข |

ตัวเลขก่อน/หลังได้จากวิธีเดียวกัน แต่ใช้แนวทางของภาพแต่ละรุ่นในเส้นหลัก ทางตะวันตกใช้ polyline เดียวกันทั้งคู่ โดยฐานเก่ามี 3 samples หลุดขอบพื้น จึงห้ามใช้ตารางนี้อ้างว่าทุกพิกเซลกว้างขึ้นในอัตราเดียวกัน ทุกถนนหลัก/แขนงถูกวาดขยายในภาพใหม่

ข้อจำกัด: ค่าต่ำสุดของเส้นหลักยังเป็น **26.83px** และตะวันตก **46.82px**; p10/median ถึงเกณฑ์ไม่ได้หมายความว่าทุกจุดกว้าง≥40px ระยะว่าง p10 ตามแนวเดินจริง (รวม story anchors เดิม) เป็น **29.53px** จึงยังมีจุดชิดขอบ การดูในเกม/ที่ซูมสูงสุดของ owner ยังจำเป็น ไม่อ้างว่า QA ผ่าน

## หลักฐานและทำซ้ำ

- `overlay-after.png`: 3344×1882 สีเขียวคือ mask; เส้นม่วงคือ gameplay centerline จุดขาวคือ entry/checkpoints/exit
- `baseline-overlay-after.png`, `before-after.webp`: ฐานรอบก่อนเทียบภาพใหม่
- `zoom-native-{bridge,cave,west}.png`: crop 1:1 จากไฟล์สุดท้าย
- `walkmask-after.png`, `baseline-walkmask-after.png`: mask สำหรับวัด/เปรียบเทียบ
- `width-before.json`, `width-after.json`, `art-metrics.json`, `stitch-report.json`: ตัวเลขและวิธีวัด

คำสั่ง (จาก repo root; Python ต้องมี Pillow/numpy/scipy/opencv):

```sh
python3 scripts/stitch-border12-v3.py
python3 scripts/build-border12-pilot.py
python3 scripts/measure-border12-width.py output/coordination/2026-10-30-map-b12-v3/baseline-walkmask-after.png output/coordination/2026-10-30-map-b12-v3/width-before.json --corridor output/coordination/2026-10-30-map-b12-v3/baseline-centerline.json
python3 scripts/measure-border12-width.py output/coordination/2026-10-30-map-b12-v3/walkmask-after.png output/coordination/2026-10-30-map-b12-v3/width-after.json
node --test tests/b12-border-pilot.test.mjs tests/f12-mask.test.mjs tests/f12-input.test.mjs tests/m2-route-geometry.test.mjs tests/border-owner-flow.test.mjs
node --test tests/*.test.mjs
```

## Self-check เกณฑ์รับงาน

1. **ภาพ 3344×1882 + ตารางความกว้าง**: ตรวจขนาดจริงแล้ว; 4 tiles ที่วาดใหม่ประกอบเป็นภาพ 2 เท่า; p10/median ของเส้นหลักและตะวันตกถึงเกณฑ์ มีข้อจำกัด native detail/ค่าต่ำสุดระบุด้านบน ไม่อ้างว่าทุกจุดกว้าง≥40
2. **overlay + route/3 ด่าน/ถ้ำบอส + เทสต์เต็ม 0 fail + โฟลเดอร์หลักฐาน**: มี overlay บนภาพสุดท้ายและไฟล์หลักฐานครบตาม path ที่กำหนด; ชุดเฉพาะล่าสุด 28 tests / 0 fail รวม B12 เดิม (4 tests) และภาพ 2 เท่า ผลชุดเต็มบันทึกด้านล่างหลังจบ ไม่มีการทดสอบภาพใน browser

## ผลชุดเต็มรอบแรกและการแก้หลังตรวจ

`node --test tests/*.test.mjs` รอบแรก: **1687 tests / 1683 pass / 4 fail**, exit 1, 365.25 วินาที เก็บ log/exit เดิมที่ `tests-full-initial.*` ไม่ลบหลักฐานความล้มเหลว

- `dungeonCompanionPoint`: แนวทางใหม่ทำให้ lane ตามหลังที่เลื่อนซ้ายคงที่ซ้อนผู้นำบน switchback บางจุด เพิ่ม fallback ให้แยกจากตำแหน่งผู้นำอย่างน้อย .03 ใน helper เดิม; เพิ่ม cache version dungeon-view ใน index ตามไฟล์ที่แก้
- เทสต์ projection เดิมบังคับให้การคลิก exit จบที่ตำแหน่ง progress .262 เสมอ แต่สำหรับรูปแนวทางใหม่ vertex ก่อนถึงด่านอยู่ใกล้ exit มากกว่าจุดด่าน ไม่มีการหลุดข้อจำกัดด่าน จึงแก้ assertion ให้ตรวจจุดที่อยู่บนแนวทางก่อนด่านและใกล้ไม่แพ้จุดด่าน ใช้ epsilon 1e-12 สำหรับการคำนวณทศนิยม เทสต์ B12 เดิมที่ตรวจ route/lock/cave ไม่เปลี่ยน
- MAP-Z4 hash เดิมล็อกไฟล์ route-geometry ทั้งไฟล์ จึงเพิ่ม fixture ก่อน B12 ที่ยืนยัน hash กับ baseline เดิม แล้วอนุญาตเฉพาะ B12 import/corridor/trees/falls/reference row และ comments เท่านั้น ส่วน runtime ของ route อื่น/fallback ยังคงเทียบทุก byte; ไม่แก้ baseline.json ของงาน Z4
- atlas worker timeout 30 วินาทีขณะแย่ง CPU ในชุดเต็ม: ไม่แก้ atlas/test timeout รัน recovery แล้วใช้ 15.79 วินาที ไม่ล้ม ชุด recovery ครั้งนั้น 32 tests / 31 pass / 1 fail จากการเปรียบเทียบทศนิยมแบบ exact ในเทสต์ projection ก่อนแก้ epsilon; หลังแก้ `tests-projection.*` ได้ 5 tests / 0 fail

ด้วยความล้มเหลวรอบแรกจึงรันชุดเต็มซ้ำหลังแก้ โดยจำกัดพร้อมกัน 4 ไฟล์:

```sh
node --test --test-concurrency=4 tests/*.test.mjs
```

ผลรอบสุดท้ายจะบันทึกใน `tests-full.log` / `tests-full.exit` และสรุปต่อท้าย


ผลชุดเต็มรอบสุดท้าย: **1687 tests / 1687 pass / 0 fail / 0 skipped**, exit 0, **414.35 วินาที** ด้วย `--test-concurrency=4` รวม B12 เดิม, projection/companion, fixture hash และ worker atlas ไม่ล้ม เก็บทั้งรอบแรกที่ล้มและรอบสุดท้ายไว้ตรวจย้อนกลับ

`python3 -m py_compile` ของสคริปต์ทั้งสามและ `git diff --check`: exit 0; ตรวจ PIL ขนาดภาพ/overlay และ assert ค่า p10/median ใน verification.json แล้ว ไม่มี browser/owner QA ไม่มี commit/push/merge/deploy

Self-check สุดท้ายข้อ 2: overlay/route/checkpoint/cave และชุดเต็ม 0 fail มีหลักฐานในโฟลเดอร์ที่กำหนด ส่วนข้อ 1 ถึงเกณฑ์ขนาดไฟล์และ p10/median ตามวิธีวัดที่รายงาน โดยคงข้อจำกัด native tile detail/ค่าต่ำสุด/clearance ตามที่ระบุไว้ ไม่อ้างว่าทุกพิกเซลเป็น native 2x หรือทุกจุดกว้าง≥40px
