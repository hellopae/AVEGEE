# Z2-CODE — AVEGEE เมืองโซน 2

## สิ่งที่เปลี่ยน

- ใช้ mask คุณเป้จาก `asia-mask-layer-edited.png`, SHA256 `cae690cd67ed29d6105f768e08abaa1077c6a58922bb7f5a9de2bbdc0ade9acf` ตามตัวแปลงเดิม: alpha >= 64 เป็นพื้นที่ห้ามเดิน, cell 8 หน่วย, coverage > 68%, ไม่ dilate (`dilate:0`). `patches:false` ทำงานอัตโนมัติเมื่อโหลดข้อมูล asia
- การย่อภาพเดิมให้ 28,775 ช่อง มีเกาะจิ๋ว 3+2 ช่องที่ขอบภาพ ตัวแปลงตัดเฉพาะ component เล็กกว่า 8 ช่องในโหมด layer เหลือ **28,770 ช่อง ผืนเดียวแบบ 4-neighbor** ไม่เปิดพื้นที่แดงเพิ่ม
- แทนต้นไม้และปาล์มเดิมเฉพาะ asia ด้วยโคน 29 ต้นจาก JSON คุณเป้: green 17, red 9, white 2, teal 1; `x*3840, y*2560` โดยไม่ปัดหรือย้าย ใช้ความกว้างฐาน 160 world units และ `big` ×1.4 = 224 หน่วย (JSON ไม่ระบุขนาดฐาน จึงเลือก 160 ใกล้ต้นไม้กลางเมืองเดิม)
- ทุกต้นใช้ collision วงรี `rx:16, ry:11` เหมือนต้นไม้โซน 1 รวมต้นที่ `on_walk:true` เก็บ flags คุณเป้ไว้ครบ; ทุกต้นเข้าคิววาดที่ `p.y` ซึ่งเป็นโคน
- เฉพาะ asia ใช้ pathfinding cell 8 แทน 16 เพื่อไม่ข้ามช่องแคบบนสะพานของ mask ใหม่ ระยะเผื่อเส้นทาง 3 หน่วยยังเท่าเดิม โซนอื่นคงขนาดกริดเดิม
- อาคาร ศาลตัดสิน บ้าน เสาไฟ/คบ และหิน คงพิกัดโซน 1 ทุกจุด เทสต์เปรียบเทียบก่อน/หลังและการคืนค่าเมื่อออกจาก asia
- Cache-bust `index.html` ครบ mask, ตำแหน่งต้นไม้, zone-skin, town-layout, town-scenery และ walk โดย alias ของ shared module ชี้ URL เดียวกัน

## ตารางสไปรท์ที่สลับชื่อไฟล์ได้ทีละบรรทัด

แก้ filename ของชิ้นนั้นเพียงบรรทัดเดียวใน `ASIA_TOWN_SPRITES` ที่ `src/zone-skin.js` แล้วโหลดหน้าใหม่ (และ bump cache version ตอนส่งงานรอบใหม่) เช่น sala เปลี่ยนเป็น `img/map-v5/st-sala-asia-v3.webp` เมื่อมีไฟล์จริงแล้ว ไม่ต้องแก้ตำแหน่งหรือตัว renderer

| kind | primary | fallback เมื่อยังโหลดไม่ได้/ไม่มีไฟล์ |
|---|---|---|
| green | `town-tree-asia-v1.webp` | — |
| red | `town-tree-b-asia-v1.webp` | — |
| white | `town-tree-sakura-asia-v1.webp` | `town-tree-c-asia-v1.webp` |
| teal | `town-tree-willow-asia-v1.webp` | `town-tree-asia-v1.webp` |

ไฟล์ต้นไม้ทั้งหมดอยู่ใน `img/theme-v4/` ปัจจุบัน sakura/willow ยังไม่มี จึงแสดง fallback ของ asia จริงผ่าน `art.img` เมื่อมี primary และโหลดสำเร็จจะเลือก primary โดยอัตโนมัติ ไม่มีการสร้างหรือแก้ภาพใน `img/`

## ตรวจตำแหน่งกับก้อนแดง — คงตำแหน่ง ไม่ย้ายเอง

**ฐานอาคารทับแดงไม่เต็มหลายชิ้น** ตัวอย่าง sala 96.40%, tea 76.54%, sawan 65.55%, krajok 79.06%, ศาลตัดสิน 12.62%; บ้านหมายเลข 3 และ 10 ทับแดง 0% จึงต้องให้เจ้าของพิจารณาความตรงกับก้อนที่กันไว้ก่อนปรับตำแหน่งใด ๆ

คำว่า “บ้าน 4 หลัง” ในใบงานเทียบกับโค้ดจริงพบ **4 ชนิดสไปรท์ แต่มี 11 ตำแหน่ง** ใน `TOWN_HOUSE_SITES` จึงคงทั้ง 11 ตำแหน่งตามโซน 1 และแสดงครบในตาราง ไม่เลือกตัดบ้านเอง รวมสถานีทั้ง 10 และ frontier เพื่อให้ตรวจรอบข้างได้ด้วย

วิธีวัด: sample จุดกลาง pixel ของ layer 1536×1024 ที่ alpha >= 64 เทียบกับพื้นที่ฐานใน world coordinates; สถานีใช้ `art.footOf()` ที่อ่าน alpha ของสไปรท์จริง, บ้านใช้ `TOWN_HOUSES` (ฐาน collision), ศาลใช้ bounding rectangle ของ alpha แถบล่าง 16% ของภาพเพราะไม่มี collider เฉพาะ, เสาไฟ/คบใช้วงรี collision ของจริง ไม่วัดหลังคาทั้งภาพและไม่ใช้ door pads ของ runtime มาเพิ่มเปอร์เซ็นต์แดง ค่าเป็น coverage ของฐานต่อพื้นที่แดงทั้งหมด ไม่ได้แยกว่าก้อนแดงนั้นเป็นสิ่งปลูกสร้างหรือภูมิประเทศ จึงต้องเทียบภาพร่วมด้วย

| ชิ้น | โคน x,y (world) | ฐานตกในแดง (%) |
|---|---:|---:|
| station:sala | 2252.0, 1382.0 | 96.40 |
| station:krata | 470.0, 565.0 | 59.69 |
| station:dab | 465.0, 1038.0 | 77.25 |
| station:lokan | 3534.0, 507.0 | 85.92 |
| station:ngiw | 551.0, 1496.0 | 61.51 |
| station:lan | 3232.0, 912.0 | 79.87 |
| station:tea | 1527.0, 1398.0 | 76.54 |
| station:tarang | 1651.0, 449.0 | 76.45 |
| station:krajok | 3482.0, 1499.0 | 79.06 |
| station:sawan | 2536.0, 412.0 | 65.55 |
| station:frontier | 1917.0, 2510.0 | 49.81 |
| house-1:front-one | 1551.0, 655.0 | 38.80 |
| house-2:left-two | 1945.0, 699.0 | 1.38 |
| house-3:front-one | 2118.0, 766.0 | 0.00 |
| house-4:left-two | 1536.0, 960.0 | 30.79 |
| house-5:front-one | 1546.0, 1073.0 | 69.84 |
| house-6:right-one | 2239.0, 1014.0 | 77.45 |
| house-7:front-one | 2010.0, 1294.0 | 79.44 |
| house-8:right-two | 1551.0, 1661.0 | 85.53 |
| house-9:right-two | 2283.0, 1588.0 | 90.00 |
| house-10:front-one | 639.0, 751.0 | 0.00 |
| house-11:right-one | 710.0, 1204.0 | 35.22 |
| judgment | 1862.0, 1057.0 | 12.62 |
| hell-pillar-0 | 1710.0, 1080.0 | 0.00 |
| hell-pillar-1 | 2100.0, 1080.0 | 0.00 |
| hell-pillar-2 | 1788.0, 1405.0 | 0.00 |
| hell-pillar-3 | 2050.0, 1405.0 | 0.00 |
| hell-pillar-4 | 1790.0, 1560.0 | 0.00 |
| hell-pillar-5 | 2050.0, 1560.0 | 100.00 |
| hell-pillar-6 | 1770.0, 2080.0 | 0.00 |
| hell-pillar-7 | 2070.0, 2080.0 | 0.00 |
| hell-pillar-8 | 1770.0, 2250.0 | 0.00 |
| hell-pillar-9 | 2070.0, 2250.0 | 0.00 |
| lamp-0 | 2356.0, 397.0 | 0.00 |
| lamp-1 | 2398.0, 349.0 | 0.00 |
| lamp-2 | 2388.0, 474.0 | 100.00 |
| lamp-3 | 2429.0, 509.0 | 100.00 |
| lamp-4 | 2490.0, 497.0 | 0.00 |
| lamp-5 | 2605.0, 522.0 | 0.00 |
| lamp-6 | 2678.0, 518.0 | 0.00 |
| lamp-7 | 2726.0, 490.0 | 0.00 |
| lamp-8 | 2723.0, 409.0 | 0.00 |
| lamp-9 | 2675.0, 365.0 | 0.00 |
| torch-0 | 470.0, 359.0 | 22.22 |
| torch-1 | 557.0, 378.0 | 0.00 |
| torch-2 | 305.0, 403.0 | 0.00 |
| torch-3 | 261.0, 455.0 | 0.00 |
| torch-4 | 300.0, 518.0 | 22.22 |
| torch-5 | 349.0, 566.0 | 18.75 |
| torch-6 | 417.0, 599.0 | 0.00 |
| torch-7 | 492.0, 614.0 | 0.00 |
| torch-8 | 605.0, 422.0 | 0.00 |
| torch-9 | 662.0, 436.0 | 0.00 |
| torch-10 | 712.0, 484.0 | 0.00 |
| torch-11 | 733.0, 541.0 | 33.33 |
| torch-12 | 599.0, 618.0 | 0.00 |
| torch-13 | 664.0, 599.0 | 0.00 |

## จุดเกิด ทางเข้า-ออก NPC และป้าย

`layout.json` บันทึก **26 จุด** จากค่าที่เกมใช้จริง ได้แก่ spawn, entry gate/nira/goal/niraGoal, NPC 6 คน, guard, challenge, merchant, ท่าเรือ, frontier และประตู/ป้ายสถานี 10 จุด ทั้ง 26 จุดมี `floor:true`, `walk:true`, `reachable:true` พร้อมทางเดินถึงพิกัดปลายทางตรง ๆ ไม่ยอมรับผล nearest reachable ของ `findPath` ว่าเดินถึงแล้ว

เทสต์ตั้งอาคารครบและโหลด alpha สไปรท์จริง ตรวจก้าวตลอดเส้นทางทุก 1 หน่วยว่าไม่ข้าม collision และทดสอบเดินอ้อมฐานต้นไม้ที่อยู่บนลานด้วย ป้ายสถานีเป็น label/action ที่ผูกกับจุดสถานี (`def.x,def.y`) ไม่ใช่วัตถุป้ายตั้งแยก จึงตรวจพิกัดพื้นของ action anchors; ไม่ใช้ตำแหน่งตัวอักษรบนจอเป็นจุดยืน

## หลักฐานและการสร้างซ้ำ

- [ภาพพื้น + อาคาร + ต้นไม้](z2-code/town-objects.jpg)
- [ภาพพื้น + owner mask + อาคาร + ต้นไม้](z2-code/town-mask-objects.jpg)
- [ภาพฐานสีเหลืองและจุดนำทางสีฟ้า](z2-code/town-audit.jpg)
- [mask ที่เกมโหลด](z2-code/mask.png), [พื้น runtime รวม pads/pier rules เดิม](z2-code/runtime-floor.png)
- [ค่าจากโมดูลเกมและเส้นทาง](z2-code/layout.json), [ตารางวัดฐาน JSON](z2-code/base-overlap.json), [JSON ต้นไม้ต้นทาง](z2-code/asia-trees-source.json)

ภาพสร้างด้วย PIL จาก preview terrain และไฟล์สไปรท์เดิม พิกัด/กรอบวาด/collision ของสถานีส่งออกจากโมดูลเกม ไม่ใช่ภาพจับหน้าจอเบราว์เซอร์ ไม่มีแสงเงา/อนิเมชันของเกมในภาพนิ่งนี้

```sh
python3 scripts/extract-town-owner-mask.py --zone asia --layer '/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Claudy/zone2-town/asia-mask-layer-edited.png' --write
node scripts/z2-code-audit.mjs
python3 scripts/z2-code-evidence.py --layer '/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Claudy/zone2-town/asia-mask-layer-edited.png'
node --test tests/z2-code.test.mjs
node --test --test-concurrency=4 --test-timeout=180000 tests/*.test.mjs
git diff --check
```

## ผลตรวจ

- เทสต์ใหม่ `node --test tests/z2-code.test.mjs`: 6 tests, pass 6, fail 0, cancelled/skipped 0 (11.34 วินาที)
- ชุดเต็ม: กำลังรอผล จะบันทึกตัวเลขจาก test runner ก่อนส่งงาน
- `git diff --check`: exit 0
- ไม่มีการเปิดเบราว์เซอร์หรือทดสอบ interaction ด้วยมือ ผลนี้เป็นหลักฐานโค้ด/เทสต์และภาพ PIL ไม่ใช่การรับรอง QA

## Self-check ตามเกณฑ์รับงาน

1. **mask ใหม่ใช้งาน** — generated module จาก SHA ต้นทาง; ตรวจได้ผืนเดียว 28,770 ช่องและ patches ปิด
2. **ต้นไม้ 29 ต้นตรงตำแหน่ง มี collision** — เทียบทุกพิกัดและ kind กับ JSON ต้นทาง, big ×1.4, ทดสอบโคนตันและการเดินอ้อม
3. **อาคาร/เสาไฟเท่าโซน 1 + ตารางแดง** — เทสต์พิกัดเท่ากัน มีตารางครบ; ความตรงก้อนแดงยังมีข้อคลาดเคลื่อนตามรายงานและไม่ได้ย้ายเอง
4. **สลับ sprite v3 บรรทัดเดียว** — มีตาราง filename รวมสถานี ศาล บ้าน ต้นไม้ เสาไฟ/คบ; คงไฟล์เดิมในรอบนี้และตรวจ fallback ของภาพที่ยังไม่มี
5. **เทสต์ + README** — เพิ่มเทสต์ใหม่และปรับสมมติฐาน mask ชั่วคราวใน M2/M3; ตัวเลขชุดเต็มรอบสุดท้ายอยู่ในหัวข้อผลตรวจ
