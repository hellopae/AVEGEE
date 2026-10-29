# R3 — สัดส่วนตัวละคร / เส้นทาง / การบังฉาก

สถานะ: แก้โค้ดและตรวจด้วย Node ได้ แต่ยังไม่ครบเกณฑ์รับงานด้านภาพจริงและ console ไม่สรุปว่าผ่าน QA

ทำงานใน worktree และ branch ที่ได้รับเท่านั้น: `codex/20261029T090612Z-4bf3c8dd` โดย HEAD เริ่มต้นคือ `fe62d3f0ac757eaf65c7be5e090400da3b22a0c0` และตรวจด้วย `git merge-base --is-ancestor a957f83 HEAD` ได้ exit 0 ไม่มีการสร้าง worktree/branch, checkout, commit, push, merge หรือ deploy

## การแก้

- `src/character-scale.js`: แหล่งสัดส่วนกลาง ยามา .80, ผู้ใหญ่/คนงาน 1.00, นิรา .95, ยักษ์ 1.25 รองรับ id ต่างโซนของทีมสุดท้าย
- ฉากต่อสู้ใช้ alpha bounds เดิมเพื่อกำหนดความสูงจริงตามชนิดตัวละคร เก็บ reference ก่อน fit เพื่อไม่ให้เรียก fit ซ้ำแล้วย่อสะสม จุดเท้าและช่องยืนมาจาก `planBattleFormation` เดิม กล่องเลือกและตัวแปรตำแหน่งชื่อ/เงาใช้กล่องใหม่ ส่วน combat atlas อ่านขนาดจากภาพที่ fit แล้วตามระบบเดิม
- ใช้ common fit ให้ยักษ์ไม่ขยายเกินกรอบผู้ร่วมทีมเดิม (.96 ของ reference ยามาเดิม) และจำกัดขอบฉาก วิธีบังคับไม่ให้ bounding rectangles ซ้อนในแนวนอนถูกถอดออกหลังคำนวณพบว่าทีม 8 คนบนมือถือเล็กเกินไป ยังต้องตรวจการซ้อนของเงาร่างในแถวแนวลึกด้วยภาพจริง ไม่อ้างว่าตรวจครบแล้ว
- แผนที่เมืองทั้งสี่โซน ด่านชายแดน ห้อง และช่วงเดินขึ้นเรืออ่านสัดส่วนเดียวกัน คนงานเมืองเพิ่มจากตัวคูณ .85 เป็นฐานผู้ใหญ่ ให้ตัวตรงสูงกว่ายามา ท่าก้ม/นั่งยังเตี้ยตามท่าจริง
- ค่า route อยู่ใน config เดียว: `th:asia=.80`, `asia:west=.80`, `west:cyberhell=.75` คูณทั้งฝ่ายเรา ศัตรู บอส และผู้ตรวจการบนเส้นทาง อิสระจาก camera zoom เส้นทางเก่าก็อ่านค่า fallback .80
- ขนาดบอสในเมืองและศัตรูในฉากต่อสู้คงเดิม แยกค่าที่เคยผูกกับความสูงยามาออกเพื่อไม่ให้ย่อตามโดยไม่ตั้งใจ
- คงความเร็วเดินเดิมของห้องและด่านชายแดน แม้ค่าความสูงสำหรับวาดเปลี่ยน
- `src/route-occlusion.js`: เพิ่ม foreground polygon จากพิกเซลภาพเดิมเฉพาะคริสตัลหน้าลานล่างชายแดน 3–4 เรียงร่วมกับตัวละครที่ระดับพื้น y=790/941 ไม่สร้างภาพใหม่ ไม่เปลี่ยนพื้นที่เดิน ยังต้องตรวจในเกมจริง
- bump import-map `?v=` เฉพาะ module ที่แก้และ module ใหม่

## ตารางขนาด

[height-table.md](height-table.md) มี 36 แถวแผนที่ (9 ตัว × 4 โซน) และ 64 แถว battle diagnostic (8 ตัว × 4 โซน × 2 ขนาดจำลอง) พร้อมพิกัดเท้าก่อน/หลัง และข้อมูลดิบใน [source-measurements.json](source-measurements.json)

**ตารางนี้วัด alpha จากไฟล์แล้วคำนวณผ่านตัววางขนาด ไม่ใช่ px บนจอจริงตามเกณฑ์ข้อ 1** ตารางเมืองเป็น world units ที่ zoom=1 และ CHAR_SCALE_MAP=.6 เหมือนกันทุกโซน ตารางต่อสู้เป็น stage จำลอง 1440×900 และ 390×844 โดยใช้ reference ยามา 215/79 จากกรณีทดสอบเดิม ไม่ใช่ขนาด arena ภายใน viewport ที่ยืนยันแล้ว Walking วัดเฟรม 0 เท่านั้น นิรา animated idle และท่าคนงานทุกแถวยังต้องยืนยันภาพจริง

ผลจากไฟล์: ยามาเมือง 55.20 → 39.36; นิราราว 49 → 46.6; ผู้ใหญ่ราว 49; คนงานตัวตรงราว 40 → 46.6–47.4; ยักษ์ราว 61–62 → 60–61.5 ลำดับจากชุดภาพตัวตรงที่วัดเป็น ยักษ์ > ผู้ใหญ่/นิรา/คนงาน > ยามา

## ตรวจ depth และ mask

เมืองใช้ลำดับชั้นอาคาร/ต้นไม้เดิม ห้องและเส้นทางเรียง actors ด้วยจุดเท้า เดิมต้นไม้ sprite เส้นทางมี depth sort อยู่แล้ว แต่คริสตัลที่ติดอยู่ในภาพพื้นหลังจะอยู่หลังตัวละครเสมอ จึงเพิ่มชั้นพิกเซล foreground เฉพาะจุดข้างต้น ยังไม่ยืนยันว่าจุดบังทุกอาคาร/หิน/ต้นไม้ทุกโซนถูกต้อง

หลักฐานตรวจภาพพื้นหลังกับ owner mask (เป็น overlay ตรวจข้อมูล ไม่ใช่ภาพเกมก่อน/หลัง):

- [mask-overlay-border34.png](mask-overlay-border34.png): สีเขียวคือพื้นที่เดินจาก owner PNG เดิม
- [mask-probes-border34.png](mask-probes-border34.png): จุดพิกัดบนภาพ 1672×941
- [mask-lower-plaza.png](mask-lower-plaza.png): ขยายหน้าลานล่าง

เรียก `dungeonNavigation('west:cyberhell').walkable([x/1672,y/941])` โดยตรง:

| จุด px | เดินได้ | สิ่งที่เห็นจากภาพ |
|---|---|---|
| 730,735 | false | ขอบผา/ฐานด้านหน้าลาน |
| 750,742 | false | คริสตัลและหินหน้าลาน |
| 768,746 | false | คริสตัลหน้าลาน |
| 800,748 | false | ราว/ส่วนหน้าฐานลาน |
| 850,750 | false | ผนังและราวด้านหน้าลาน |
| 700,704 | false | แนวรั้วฝั่งซ้าย |
| 1000,721 | true | ถนนต่อจากลาน |
| 1020,733 | true | ริมถนนติดราวทอง ควรตรวจจุดเท้าและการบังเพิ่มในเกม |

ยังไม่มีจุดที่ยืนยันได้ว่า mask เปิดให้ยืนบนหน้าผาในตัวอย่างเหล่านี้ จุด 1020,733 เป็นผู้สมัครตรวจขอบเพิ่มเติม ไม่ใช่ข้อสรุปว่า mask ผิด การตรวจนี้ไม่ครอบคลุมทุกช่องหรือทุก route ไม่แก้ไฟล์ mask, collision, gameplay hitbox, ดาเมจ หรือ stat ใด

## ผลทดสอบ

- `node --test tests/r3-character-scale.test.mjs tests/frontier-view-metrics.test.mjs tests/battle-scale29c.test.mjs`: 12 tests, 0 fail ([log](targeted-tests.log))
- `node --test tests/r3-character-scale.test.mjs tests/map-travel-handoff.test.mjs tests/yama-size-a7.test.mjs tests/p5c-worker-scale.test.mjs tests/p9-art-insert.test.mjs tests/l2-battle-trial-pause.test.mjs`: 47 tests, 0 fail ([log](affected-tests.log))
- `node --test tests/*.test.mjs`: รอบสุดท้าย exit 0 — 1,617 tests, 1,617 pass, 0 fail, 0 skipped ([log](full-tests-final.log)) ใช้เวลา 149.44 วินาที
- รอบก่อนแก้ anchor มี 2 fail: N1 source assertion ยังผูกบอสกับ HERO_H และ Python ของ workers ถูก timeout ที่ 30 วินาที ([log](full-tests-before-anchor-fix.log)) แก้เฉพาะ assertion ให้ตรวจขนาดบอสเดิมแยกจากยามา แล้วรันสองไฟล์แยกได้ 27 tests, 0 fail ใน 7.11 วินาที ([log](retest-failures.log)) ไม่แก้ timeout หรือภาพคนงาน
- `node --check` ของ module ที่แก้ และ `git diff --check`: exit 0
- Browser: Chromium ถูก sandbox ปฏิเสธ MachPortRendezvousServer; in-app browser host unavailable ดู [browser-blocker.md](browser-blocker.md) ไม่มีผล console หรือภาพ screenshot ที่ใช้รับงานได้

## Self-check ตามเกณฑ์รับงาน

| เกณฑ์ | สถานะ / หลักฐาน |
|---|---|
| 1 ตารางความสูงก่อน/หลังทุกตัวทุกโซน ต่อสู้+แผนที่ | บางส่วน: มีตาราง source-pixel diagnostics; ยังขาดการวัด px จริงบน viewport/zoom เดียวกัน |
| 2 ภาพต่อสู้ก่อน/หลัง 4 โซน ทีมยามา+ยักษ์+คนอื่น เท้าเดิม | ค้าง: ไม่มี browser screenshot; unit test ตรวจ hierarchy, fit ซ้ำ และพิกัดเท้าได้ แต่การซ้อนตัว/อ่านภาพยังไม่ยืนยัน |
| 3 ภาพแผนที่ก่อน/หลัง 4 โซน ยามาคู่นิรา/ยมทูต | ค้าง: ไม่มี browser screenshot หรือการเดินคู่จริง |
| 4 desktop + 390×844, console ว่าง, full Node tests 0 fail | บางส่วน: full Node 1,617 tests / 0 fail; browser/console และความคมหลังย่อยังไม่ตรวจ |
| 5 หลักฐานอยู่ output/coordination/2026-10-28-r3-scale/ | มีโค้ดเก็บภาพสำหรับ runner ที่เปิด browser ได้ ตาราง raw data, mask overlays, logs และรายงานนี้; ภาพรับงานยังขาด |

ไฟล์แก้: `index.html`; `src/{character-scale,battle-scale,scene,frontier-view-metrics,frontier,dungeon-view,route-occlusion,room,map-travel}.js`; `tests/{r3-character-scale,battle-scale29c,frontier-view-metrics,n1-harbour-krajok}.test.mjs`; และหลักฐานในโฟลเดอร์นี้

ไม่อ้างว่างาน R3 ผ่านเกณฑ์รับครบ: ต้องเปิด capture บน runner ที่ browser ใช้งานได้ ตรวจภาพต่อสู้/แผนที่สี่โซนและมือถือ วัด px จริง ตรวจ console, การซ้อนในทีมสุดท้าย, foreground polygon และขอบ mask ที่ระบุ แล้วเพิ่มหลักฐานก่อนรับงาน
