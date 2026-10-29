# Z4-TOWN-A v2 — งานต่อจาก run ed011074

ทำใน branch/worktree ที่ wrapper ให้เท่านั้น ไม่สร้างหรือเปลี่ยน branch ไม่ commit/push/merge/deploy และไม่แก้ hooks, status.json หรือ worklog.json

## การรวม patch

ใช้ `git apply --reject --whitespace=nowarn` กับ patch ของ run `20261029T191621Z-ed011074` มี reject เดียวใน `tests/map-z4-terrain.test.mjs` รวมด้วยมือโดยใช้ tiles v3 และคงการตรวจ route fixture/B12 ของ main ไว้ ลบ `.rej` แล้ว ใน coordination เดิมมีข้อมูลภาพ/เส้นทาง/ผลเทสต์บางส่วน แต่ยังไม่มี README หรือผลชุดเต็ม; log เก่าที่มี fail ยังคงเก็บไว้

## สิ่งที่เปลี่ยน

- ภาพใหม่ของเจ้าของตรงกับ `source.png` แบบ SHA-256; walkmask ตรงกับ `owner-walkmask.png` แบบ SHA-256 (เทียบกับไฟล์ input ของใบงานแล้ว)
- ใช้ tiles `img/map-zone4/v3/` 20 ไฟล์ ขนาดรวม 4915×3277 และ preview 1536×1024; world 3840×2560 (3:2) ใช้กล้อง town ที่มีอยู่
- ใช้ภาพ built-in image_gen 4 quadrant จาก run เดิม พร้อม references/repaints/prompts.json ไม่ generate เพิ่มใน run นี้ ไม่ใช้ Shado
- ผังแยกที่ `src/town-cyberhell-layout.js`: แท่นตัดสินอยู่ลานกลมกลาง, entry/ชายแดนอยู่ลานกลมล่าง, harbour อยู่ท่าไม้ริมแม่น้ำ; ย้ายสถานี 11 หลังรวม canteen, NPC, คิวและตำแหน่งศึกท้ายเกมตาม mask ใหม่
- ไม่มี trees/palms/houses/props ที่สืบทอดจากโซน 1 ในโซน 4; งานเสาไฟคงเป็น Z4-TOWN-B
- FOOD-A ใช้ plot → building → built ของระบบเดิม โรงอาหารมีพิกัดแยกและไม่ถูก fallback จาก house site ทับ
- marker `z4TownVersion:3` ย้ายตำแหน่งเซฟเก่า active/parked/zoneEntry เพียงครั้งเดียว เก็บเหรียญ/คดี/ความคืบหน้า; โหลด v3 ใหม่ไม่ย้ายซ้ำ ตรวจตำแหน่งที่ผิด mask ก่อน world step และไม่บังคับให้ headless restore ต้องมี Image
- แก้ merchant arrival ให้เริ่มจาก entry ใหม่และยกเลิก path เก่าที่ serialize ไว้; ระบบเงาอ่าน house sites ที่มีจริงแทนการเรียกบ้าน 12 หลังเมื่อผังใหม่ไม่มีบ้าน
- bump `?v=` เฉพาะ module ที่แก้ใน import map

## หลักฐานและข้อจำกัด

- `layout-sites.png`: แผนที่ใหม่ + สไปรท์อาคารจาก runtime stationBox + แท่น + หมายเลขจุดอาคาร/NPC/ทางออก/ท่าเรือ
- `layout-paths.png`: เส้นทางจาก entry ไปทั้ง 48 จุด; `navigation.json` เป็นพิกัด world และ path จากเทสต์จริง
- ทั้งสองภาพเป็น offline composition ไม่ใช่ screenshot จาก browser และไม่อ้างว่า browser QA ผ่าน
- `verification.json`: RLE 480×320 ตรงกับการ sample จุดกลาง cell จาก owner mask ทุกช่อง, เท้าทุกจุดสำคัญอยู่ในพิกเซลขาวต้นฉบับ, ไม่ dilation/ไม่เพิ่ม hand patches
- จุดโครงสร้างที่ระบุ 14 จุด (วงกลม สะพาน บันได ท่าเรือ ทางออก) วัด local correlation ได้ displacement 0 พิกเซล เทียบ source/delivered; การคงขอบเดิมใน build script ไม่ย้าย source geometry
- `stitch-report.json` จาก run เดิมมี nearest-edge distance ภายใน 2 px 98.63%, p95=1 px แต่ max=20 px; metric นี้ไม่ใช่หลักฐาน semantic ทุกขอบ จึงยังไม่รับรองว่า **ทุกตำแหน่งทั้งแผนที่** คลาดเคลื่อนไม่เกิน 2 px
- ช่องกลางลานที่ถูกทาแดง: แถบแท่น bbox [710,356,70,6], ช่องเล็ก [695,399,32,14] และ [761,399,32,14] (source px) ไม่พอใส่ฐานอาคารครบ 11 หลัง ใช้ลานอื่นที่มีช่องเดิมสำหรับสถานี ไม่สมมติอาคารเพิ่มในช่องที่เหลือ และไม่เปิด mask ใต้ช่องเหล่านั้น แท่นตัดสินกว้าง 70 source px แต่ส่วนภาพสูงเกินแถบ 6 px; เก็บตำแหน่งแท่นกลางลานตามใบงานและรายงานความไม่พอดีนี้ให้เจ้าของตรวจ
- Browser ไม่ได้รันตามข้อจำกัด sandbox ในใบงาน จึงยังไม่ตรวจ interaction/การซ้อนภาพ/ประสิทธิภาพบนจอจริง

## การทดสอบ run นี้

1. รอบเริ่มต้นเฉพาะ 4 ไฟล์: 29 tests, 26 pass / 3 fail — จุดกำลังเสริมผิด mask และ reload ย้าย army staging ซ้ำ
2. หลังแก้พิกัด/marker: 30 tests, 30 pass / 0 fail
3. ขยายส่วนที่เกี่ยวข้อง 14 ไฟล์: 184 tests, 177 pass / 7 fail — headless restore เรียก Image และเทสต์ town action ยังถือว่าโซน 4 ปิด
4. หลังแก้ซ้ำ 5 ไฟล์: 41 tests, 41 pass / 0 fail; รวม exact paths, FOOD-A states, v2/v3/v4 legacy saves, fresh v3 staging, invalid current save และ final court/ending
5. ชุดเต็ม **ครั้งเดียว**: `Z4_EVIDENCE=1 node --test --test-concurrency=4 tests/*.test.mjs` ได้ **1732 tests / 1726 pass / 6 fail / 0 skipped**, exit 1, 193.94 วินาที ดู `tests-full.log` / `tests-full.exit` ไม่ลบหรือแก้ log นี้ และไม่รันชุดเต็มซ้ำตามคำสั่งใบงาน
6. หกข้อที่ล้ม: hash ทั้งไฟล์ของ BALANCE-2 (แก้โดย normalize เฉพาะ exact map/save snippets ที่ review ได้ ยัง hash ส่วน combat ทุก byte), assertion legacy tower/actor scale/startup skin (ปรับให้ครอบคลุม skin เปิด และยังเทสต์ legacy ด้วย explicit disable), merchantRun เริ่มจากพิกัดเก่าที่ไกลพื้นใหม่ (แก้ runtime พร้อม discard saved path), shadow signature เรียกบ้าน 12 หลังทั้งที่ผังใหม่ไม่มีบ้าน (แก้ให้ใช้ house sites จริง)
7. รอบซ้ำหกไฟล์ครั้งแรก: 49 tests / 48 pass / 1 fail — หลังแก้ shadow แล้ว assertion ตำแหน่งชื่อ final actors ยังใช้ขนาดตัวแบบ legacy จึงแก้ให้ตรวจ live CHAR_SCALE_MAP; รอบสุดท้าย `tests-full-failures-final.log`: **49 tests / 49 pass / 0 fail / 0 skipped**, exit 0
8. `tests-late-regressions.log`: 26 tests / 26 pass / 0 fail ครอบคลุม Z4, merchant saved path, scenery/shadow roots, depth และ travel handoff
9. `python3 scripts/z4-town-a-evidence.py`: mask/landmark checks สำเร็จ; `git diff --check` ไม่พบ whitespace error

## Self-check ตามเกณฑ์รับงาน

1. มี overlay ผังบนแผนที่ใหม่: `layout-sites.png` และ `layout-paths.png`; เทสต์เดินจาก entry ไปทุกจุด 48 จุด ทั้งอาคารเริ่มต้นและสร้างครบ, ปลาย path ตรงพิกัดจริง และ sample ตลอดเส้นทางยังเดินได้ รวมเทสต์ M2 ที่เดินด้วย stepTo ทีละ 1 world unit จากสอง spawn ไปประตูทุกสถานี
2. เซฟเก่าโซน 4: ทดสอบโหลด v2/v3/v4, parked state/zoneEntry และโหลดซ้ำโดยไม่ย้ายอีก; ผลชุดเต็มเดิมมี 6 fail ซึ่งแก้และเทสต์ซ้ำเฉพาะส่วนแล้ว แต่ **ยังไม่ได้ยืนยันชุดเต็ม 0 fail หลังแก้** เพราะกำหนดให้รันเต็มครั้งเดียว; หลักฐานอยู่โฟลเดอร์ที่กำหนดครบ

ข้อที่ต้องตรวจต่อด้วยมือ: ภาพ/interaction บน browser จริง, ความพอดีของแท่นกับแถบห้ามเดิน, และข้อกำหนด ≤2 px ทุกโครงสร้างนอก 14 จุดที่วัดแล้ว ไม่อ้าง QA ผ่าน
