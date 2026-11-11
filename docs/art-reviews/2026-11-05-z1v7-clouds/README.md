# Z1-V7-CLOUDS

**สถานะส่งต่อ: incomplete** — export และหลักฐานเชิงไฟล์อยู่ในชุดนี้ แต่ยังไม่รับรองว่า mask ครอบเมฆจริงทั้งหมด และมุมขอบซ้ายไม่มีเมฆเคลื่อนไหวให้ตรวจหลังกันบริเวณสั่งลบ ดู [queue-check.json](queue-check.json) และ [ผลตรวจภาพพร้อมจุดค้าง](visual-review.json) ไม่อ้างว่า QA ผ่าน

รอบนี้คัดลอกจากงาน `20261110T163205Z-62071b39` ใน path ที่ใบงานระบุ ใช้ภาพต้นทางเดิม 23 ชิ้นต่อ วาดเพิ่มด้วย ImageGen ในตัวเฉพาะ quarter ที่ขาด 5 ชิ้นและ puff 8 ก้อน รวมต้นทาง 36 ชิ้น ไม่วาดซ้ำชิ้นเดิม [หลักฐานคัดลอก](input/prior-run-copy-check.json) แสดงการเทียบ byte ของไฟล์ที่รับมา; record ของต้นฉบับรอบก่อนเป็นหลักฐานที่สืบทอดมา ไม่ใช่การเรียก ImageGen ใหม่ในรอบนี้

ชั้นเมฆแยกจากพื้น v7 สำหรับ world 3840×2560, ภาพเต็ม 9830×6554 (nominal 2.56 px/หน่วย) ใช้ grid 2048 เดียวกับ v7 มี layer A/B อย่างละ 20 chunk รวม chunk โปร่งใสเปล่าในตำแหน่งที่ไม่มีเมฆ คอลัมน์ท้าย 1638 px แถวท้าย 410 px

ส่ง asset และหลักฐาน offline เท่านั้น ยังไม่เชื่อม runtime และไม่รับรองว่า QA ผ่าน ขอบเขต semantic ของ mask ต้องพิจารณาภาพตรวจ โดยเฉพาะเศษหมอกใกล้บริเวณที่เจ้าของสั่งลบและขอบภูเขา

## เปิดตรวจ

- [mask ทั้งแผนที่](previews/mask-review.jpg) — สีชมพูเป็นขอบเขต ไม่ใช่สีเมฆ
- [เทียบพื้น | A | B ที่หุบกลาง](previews/pilot-A-B.jpg)
- [ประตูสวรรค์ 12 วินาที](previews/heaven-12s.mp4)
- [ขอบซ้าย 12 วินาที](previews/left-edge-12s.mp4)
- [หุบกลาง 12 วินาที](previews/central-valley-12s.mp4)
- [ภาพที่ decode จากคลิปจริง](previews/decoded-clips.jpg)
- [puff ทั้ง 8 ก้อน](previews/puffs-contact.jpg)
- [mask เทียบ v7 ทุก quarter รวมเศษที่ตัดออกแล้ว](previews/regions-contact.jpg)
- [ภาพรอยต่อ](previews/seams.jpg), [ตัวเลขตรวจทั้งสองแกน](seams.json)
- [การตัด support ที่ผิดบริเวณออก](mask-refinement.json)
- [ผลตรวจเชิงไฟล์](verification.json), [ขนาดและเวลาคลิป](clip-check.json), [การเปลี่ยนภาพจากคลิปที่ decode](decoded-clip-check.json)
- [คำสั่งและผลรันจริง](checks-run.json), [รายการไฟล์พร้อม hash](delivery-inventory.json)

ผลตรวจล่าสุด: file checks19ข้อเป็น OK; mask9830×6554, alpha นอก mask0พิกเซล, delete12ไม่มี support, สแกนรอยต่อ30ขอบทั้งสองแกน (8ขอบมี support คู่มากกว่า64; แนวนอนไม่มี support ที่ขอบให้วัด) puff8ก้อนมี4.27–5.12 px/หน่วย และ MP4ทั้ง3ยาว12วินาที/144เฟรม/12fps มี3727พิกเซลที่ mask>128 แต่ A หรือ B อย่างน้อยหนึ่งแบบมี alpha0 (รวมช่องโปร่งใสในภาพวาด) จึงต้องพิจารณาความครอบคลุมจากภาพด้วย ตัวเลขเหล่านี้ไม่ปิดข้อค้างด้าน mask และมุมขอบซ้าย

ภาพพื้นในคลิปเป็น crop จาก v7 ที่ map2× เช่นเดียวกับ overlay ไม่ขยายภาพ overview มาใช้ คลิปเป็น offline raster compositor กล้องคงที่ 1280×720, 12 fps, 144 เฟรมต่อมุม ไม่ใช่การอัดการเล่นเกมหรือการทดสอบ browser

## การวาดและประกอบ

ใช้ **ImageGen ในตัวเท่านั้น** ขอภาพแยกต่อ quarter ต่อ variant และ puff แยกต่อก้อน ไม่ใช้ API/CLI, Shado หรือ agent อื่น [prompt ทุกครั้ง](generation-prompts.json), [ขนาด native และ hash ต้นฉบับ](generation-records.json) และ [registration](registration.json) เก็บไว้ให้ตรวจ ไม่มีการใช้ A เลื่อนตำแหน่งหรือเฟดเพื่อสร้าง B ภาพ A/B เป็นภาพวาดคนละ generation

แบ่ง chunk เป็น 2×2 quarter (core 1024) ต้นทางเดิมเลือก 14 quarter ที่มี support ตั้งแต่ 100 px ขึ้นไป อ้างอิงภาพ crop context32 แล้วรอบนี้ re-register ภาพเมฆทั่วไปด้วย context96 map2× px เพื่อลดรอยเปลี่ยนลายที่ตรวจพบ ประกอบด้วย spatial feather บน overlap เท่านั้น ไม่สร้าง B จากภาพ A เครื่องมือส่วนใหญ่ส่ง native1254×1254; บางภาพส่ง1536×1024 เมื่อแกนใดมี native ไม่พอ context จะตัด context แกนนั้นเหลือ core1024 แทนการ upscale รายละเอียดต่อภาพอยู่ใน registration ไม่มี sharpen หรือการอ้างรายละเอียด HD จากการขยาย ภาพต้นทางและ registration ทั้ง14quarter คงไว้ แม้บาง quarter ไม่มี support แล้วหลังตัดเศษ mask ที่ผิดบริเวณ

ไฟล์ `sources/*.webp` เป็นสำเนา native แบบ WebP quality92; native alpha คงไว้ การส่งออก layer ใช้ WebP RGBA quality94 (alpha lossless) ประกอบแบบ premultiplied และตัดด้วย mask ส่วน puff crop ขอบโปร่งใสแล้วลดขนาดเท่านั้นเป็น PNG RGBA ความกว้างสูงสุด512 px ขนาดโลกและอัตรา px/หน่วยอยู่ใน `clouds.json`

mask เริ่มจาก `cloud-sea` fluids-HD + `fog` รอบแรก แล้วเพิ่มบริเวณเมฆที่ขีดจาก v7 ด้วย color/texture gate และ feather เข้าด้านใน รอบนี้ตรวจเทียบภาพพบเศษ support ทับหิน/ลานน้ำแข็ง/ริมแม่น้ำ จึงตัดให้เหลือใน polygon สี่บริเวณบน และตัด component เล็กกว่า1200 map2× px ออก เพิ่ม feather48px เข้าด้านในที่ขอบ polygon ใหม่เพื่อไม่ให้ตัดแข็ง ไม่เพิ่ม support ใหม่ เก็บ mask ก่อนแก้ไว้ที่ `input/inherited-cloud-layer-mask.png` และขั้นตอนที่ `scripts/refine-mask.py` รายการ polygon และ quarter อยู่ใน [regions.json](regions.json) การตัดแบบอนุรักษ์นี้ยังไม่พิสูจน์ว่าครอบเมฆทั้งหมดหรือแยกขอบภูเขาได้ครบ

ตัดกรอบของ **12 รายการที่ review ระบุ delete** ใน `input/white-lumps.json` พร้อม guard8 master px (16 map2× px) ลานน้ำแข็ง false positive สองจุดไม่ได้ถูกตีความว่าเป็นเมฆ ไม่มีการทาสีพื้นใหม่ หลังตัดเศษ mask มุมขอบซ้ายไม่มี support จึงไม่มีเมฆเคลื่อนไหว คลิปมุมนั้นแสดงพื้นที่ที่กันออก และไม่ถือเป็นหลักฐานว่าเมฆขอบซ้ายเห็นชัดครบโจทย์

## เวลาและการนำไปใช้

`clouds.json` ระบุทุก chunk ด้วย `[x,y,w,h]` ใน map2×; scale จริงคือ `[9830/3840,6554/2560]` อย่าปัดพิกัดสองแกนให้เท่ากันก่อนวาง chunk ตัว schema นี้เป็นข้อมูลส่งต่อ ไม่ใช่ `fx-layout.json` ที่เสียบเข้า loader ปัจจุบันได้ทันที

น้ำหนัก B = `0.5 - 0.5*cos(2*pi*t/24)`; A = 1−B ผสม premultiplied RGBA เชิงตัวเลขใน sRGB ก่อน source-over ไม่มีการแปลง linear-light คลิป12วินาทีแสดง A→B ครึ่งรอบของ cycle24วินาที เมฆขยับช้าแบบ sine amplitude1.5×0.3 world units รอบ48วินาที โดย sample ในพิกัดโลกต่อเนื่องแล้ว clip mask คงที่อีกครั้ง ห้ามขยับทีละ chunk จนเกิดร่องขอบ puff เคลื่อน .8–1.3 หน่วย/วินาทีและ clip ด้วย mask เดียวกัน ไม่มี camera parallax

ไฟล์ส่งออกมี alpha ที่ตัด mask แล้ว เพื่อทำ drift ต้องคง mask โลกปลายทางเสมอ และอ่าน chunk เพื่อนบ้านที่ขอบ ไม่สร้างภาพนิ่ง A หลายเฟรมแล้วแทน B ตำแหน่ง puff มาจากจุดด้านใน mask ที่หาไว้ก่อนดูรูปร่างของ puff เพื่อไม่ให้วางล้ำลาน/หิมะ

ตรวจโค้ดเกมปัจจุบันแบบอ่านอย่างเดียว: `src/town-fluid-fx.js` กำหนด `FLUID_MAX_SCALE=2.56`, loader อ่าน layout เดิม และ `townFluidOwnsClouds()` ควบคุมการหลบของเมฆเก่า รอบบูรณาการต้องเลือกชั้นนี้และหลบเมฆเก่าที่ซ้ำเอง งานนี้ไม่แก้ renderer หรือ `src/` ใด ๆ

## พื้นใต้เมฆ

[terrain-handoff.json](terrain-handoff.json) ให้ polygon/กรอบ map2× ของบริเวณที่ควรตรวจ baked cloud ในพื้น ถ้าต้องการให้เมฆที่ขยับเผยพื้นได้จริง ให้ run พื้นวาด substrate หุบสีม่วงเทาหม่นเฉพาะใต้ mask โดยรักษาต้นไม้ หิน ทางเดิน บันได หิมะ และ skyline ปัจจุบันพื้นยังมีเมฆนิ่งอยู่ จึงทำให้ความเคลื่อนไหวบางช่วงเบาและอาจเห็นเมฆซ้อน ไม่แก้พื้นเอง และไม่ได้ส่งข้อความหรือเรียก run อื่น

## ตรวจซ้ำ

ต้องมี Python3, Pillow, NumPy, OpenCV, ffmpeg/ffprobe:

```sh
python3 -m py_compile docs/art-reviews/2026-11-05-z1v7-clouds/scripts/*.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/refine-mask.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/build.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/render.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/review-assets.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/review-clips.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/verify.py
```

คำสั่งเหล่านี้อ่านเฉพาะ input/sources ที่ส่งมาด้วยและไม่เรียก ImageGen เพิ่ม `prepare.py` เป็นขั้นเตรียมข้อมูลของรอบก่อน ซึ่งอ่าน v7 จาก worktree ต้นทาง; ไม่ต้องรันเพื่อประกอบส่งออกซ้ำ เพราะจะย้อน mask ไปก่อนแก้ `ingest.py` รับภาพที่ ImageGen วาดเสร็จแล้ว ไม่ใช่เครื่องมือเรียก API `review-seams.py` เป็นสคริปต์เดิมตรวจแนวตั้งเท่านั้น รอบนี้ใช้ `review-assets.py` สแกนทุกขอบ1024ทั้งสองแกนและแยกขอบที่ไม่มี support ออกจากขอบที่วัดได้

## Self-check ตามใบงาน

1. **mask 2× + รายการบริเวณ:** มี 9830×6554 และ regions; ตัดกรอบ delete12 เชิงพิกเซล ยังไม่ยืนยัน semantic completeness ทั้งแผนที่หรือขอบก้อนทุกจุด
2. **A/B วาดจริงแยก quarter, RGBA, grid2048:** มี generation แยกและ registration; ตรวจความต่าง/alpha/ขนาดด้วย verify รอยต่อและความนุ่มต้องดูภาพประกอบ ไม่ถือว่าตัวเลขความต่างคือการอนุมัติภาพ
3. **puff6–10 ก้อน ความละเอียด≥2.56:** ส่ง8ก้อน RGBA พร้อมขนาดโลก, native crop และอัตรา px/หน่วย
4. **พื้นใต้เมฆ:** ส่ง handoff6บริเวณ โดย4บริเวณ active และ2บริเวณ inactive หลังตัดเศษ mask; คำขอใช้เฉพาะพิกเซล mask ที่มี support ไม่แก้พื้น
5. **preview + คลิป12วินาที3มุม + README:** ส่งไฟล์และ decode ตรวจจริง มุมขอบซ้ายมีข้อจำกัดข้างต้น ไม่มี in-game playback verification
6. **≤60MB และข้อห้าม:** ขนาดจริงรายงานใน verification; แก้เฉพาะโฟลเดอร์นี้ ไม่แก้ src/tests/img เดิม, hooks, status.json, worklog.json ไม่สร้างหรือเปลี่ยน worktree/branch ไม่ commit/push/merge/deploy
