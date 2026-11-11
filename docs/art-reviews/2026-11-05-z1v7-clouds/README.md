# Z1-V7-CLOUDS — ชั้นเมฆ/ทะเลหมอกแยกจากพื้น

ชุดส่งออกสำหรับตรวจภาพและส่งต่อการประกอบเกม อยู่ในโฟลเดอร์นี้ทั้งหมด ดูสถานะสุดท้ายที่ [queue-check.json](queue-check.json) งานนี้ไม่ได้ทดสอบในเกมและไม่ใช่การรับรอง QA

รอบ `20261111T024557Z-ac27b779` รับงานล่าสุดจาก `20261111T022059Z-93a53985` ใช้ต้นทางเดิม 36 ภาพต่อโดยไม่เปลี่ยน byte และวาดเพิ่มเฉพาะ quarter ขอบซ้าย `r1-c1-q3` แบบ A/B อีก 2 ภาพด้วย **ImageGen ในตัว** รวมต้นทาง 38 ภาพ ไม่มี API/CLI, Shado หรือ agent อื่น [หลักฐานรับช่วง](input/current-run-inheritance.json), [generation records](generation-records.json), [prompt ทั้งชุด](generation-prompts.json), [prompt ใหม่ที่ใช้จริง](scripts/west-edge-prompts.json)

## ไฟล์ส่งออก

- `layer-A/`, `layer-B/`: อย่างละ 20 ไฟล์ WebP RGBA บน grid 2048 เดียวกับ v7 รวม chunk โปร่งใสในจุดที่ไม่มีเมฆ ขนาดภาพเต็ม **9830×6554** สำหรับโลก 3840×2560 หรือ nominal 2.56 px/หน่วย คอลัมน์ท้าย 1638 px แถวท้าย 410 px
- [cloud-layer-mask.png](cloud-layer-mask.png): mask เต็มแผนที่ 2×, L8 ไม่เพิ่มขนาดภาพต้นทางเดิมมาอ้างเป็นรายละเอียด HD
- [clouds.json](clouds.json): พิกัด `[x,y,w,h]` ของ chunk, hash/ขนาดไฟล์, puff และสูตร animation
- `puffs/`: PNG RGBA 8 ก้อน วาดแยกคนละภาพ ความกว้าง 512 px ใช้ 4.27–5.12 px/หน่วย ตามขนาดโลกที่ระบุใน clouds.json
- [regions.json](regions.json), [coverage-review.json](coverage-review.json): รายการบริเวณที่คงไว้ เหตุผลที่เว้นบริเวณเดิม และผลนับ mask ในกรอบสั่งลบทั้ง 12 จุด
- [terrain-handoff.json](terrain-handoff.json): รายการ 5 บริเวณให้ run พื้นพิจารณา substrate ใต้เมฆ ส่งเป็นไฟล์เท่านั้น ไม่ได้แก้พื้นหรือส่งข้อความไป run อื่น

## เปิดตรวจภาพและคลิป

- ภาพทั้งแผนที่: [A](previews/overview-A.jpg), [B](previews/overview-B.jpg), [mask สีชมพู](previews/mask-review.jpg)
- [mask ทุก quarter เทียบพื้น v7](previews/regions-contact.jpg), [พื้นที่กันหิมะ/ยอดเขาสีฟ้าเทียบกับ mask สีชมพู](previews/protected-review.jpg)
- [เทียบพื้น | A | B ที่หุบกลาง](previews/pilot-A-B.jpg), [puff ทั้ง 8 ก้อน](previews/puffs-contact.jpg)
- [รอยต่อทั้งสองแกน](previews/seams.jpg), [ตัวเลขรอยต่อ](seams.json)
- [ประตูสวรรค์ 12 วินาที](previews/heaven-12s.mp4)
- [ขอบซ้ายช่วงบน 12 วินาที](previews/left-edge-12s.mp4)
- [หุบกลาง 12 วินาที](previews/central-valley-12s.mp4)
- [เฟรมที่ decode จาก MP4 จริง](previews/decoded-clips.jpg), [ผล probe คลิป](clip-check.json), [ผลวัดภาพเคลื่อนไหวและพื้นคงที่](decoded-clip-check.json)
- [ผลตรวจไฟล์จริง](verification.json), [คำสั่งและผลรัน](checks-run.json), [การตรวจภาพด้วยตา](visual-review.json), [รายการไฟล์และ SHA256](delivery-inventory.json)

คลิปทั้งสามเป็น **offline raster composite** จากพื้น v7 และชั้นเมฆที่ส่งออกจริง กล้องคงที่ 1280×720, 12 fps, 144 เฟรม, 12 วินาทีต่อมุม ภาพพื้นเป็น crop ที่ map2× เท่ากับเมฆ ไม่ขยาย overview มาใช้ ไม่ใช่การอัดเกม เฟรมหลักฐานดึงกลับจาก MP4 ที่เข้ารหัสแล้วที่ 0, 6 และ 11.916667 วินาที ตรวจการเปลี่ยนภาพโดยตัด HUD ออก และวัดพื้นที่พื้นนิ่งที่ห่าง mask อย่างน้อย 12 px เพื่อจับการขยับกล้องหรือภาพรั่ว

## ขอบเขตและ mask

คงทะเลหมอกด้านหลังสันเขาตะวันตก ทะเลเมฆกลางบน หุบด้านตะวันตกของประตูสวรรค์ ทะเลเมฆด้านตะวันออกของประตู และหมอกขอบซ้ายช่วงบน รวม 5 บริเวณ โดยรักษาผังพื้น v7 เดิม รายละเอียดเส้นขอบอยู่ใน [mask-traces.json](scripts/mask-traces.json)

mask รอบก่อนมีทั้งเศษ support บนหินและช่องว่างจากการเลือกสี รอบนี้ตรวจเทียบ v7 แบบ native แล้วปรับ envelope และเกณฑ์สีให้รวมขาวงาช้างที่รับแสงทองด้วย ใช้การปิดช่องระดับ texture เล็ก ๆ และ feather แบบ smoothstep เข้าด้านใน 26 map2× px ไม่ทำขอบนอกฟุ้งเข้าเขตห้าม สคริปต์นี้ประมวลผล mask และประกอบ asset เท่านั้น ไม่วาดเมฆแทน ImageGen

กันหิมะ/หินบนยอดทองและภูเขาน้ำแข็งด้วย [protected-terrain-mask.png](protected-terrain-mask.png) แล้วตัด `delete` ทั้ง 12 รายการจาก `input/white-lumps.json` พร้อม guard 16 map2× px เป็นขั้นสุดท้าย จึงไม่ทำ feather กลับเข้าเขตสั่งลบ ลานหินน้ำแข็งสองรายการที่เป็น false positive ไม่ได้ถือเป็นเมฆ

ขอบซ้ายเดิมจับที่ y=2600 ซึ่งอยู่ต่ำกว่าหมอกที่ยังคงไว้ รอบนี้ใช้ `[0,1540,1280,720]` เหนือ delete11 โดยตรวจภาพเทียบ v7 แล้ว ไม่คืนก้อนที่สั่งลบ ขอบขวาส่วนล่างและหุบด้านล่างที่เคยอยู่ใน legacy fog เป็นหิน น้ำ หรือทับ delete07–13 จึงไม่เติมเมฆกลับเพื่อให้ครบจำนวนตำแหน่ง รายการเทียบ legacy bank ทั้ง 7 อยู่ใน coverage-review

เมฆบนท้องฟ้าเหนือแนวภูเขาที่เป็นฉากหลังไกลไม่ได้รวมใน sea-mist overlay ส่วนเมฆบนพื้นซึ่งถูกสั่งลบแล้วจะไม่ถูกสร้างกลับ

## ภาพต้นทางและรอยต่อ

A/B วาดแยกจริงต่อ quarter ไม่สร้าง B โดยเลื่อนหรือเฟด A มีต้นทางเมฆ 15 quarter × 2 variant และ puff 8 ภาพ บาง quarter เก็บต้นทางไว้แต่ไม่มี support หลังกันเขตห้าม ไม่วาดซ้ำชิ้นเดิม

ใช้ quarter core 1024 (2×2 ต่อ chunk) และ overlap 96 map2× px ประกอบแบบ premultiplied RGBA พร้อม spatial feather ระหว่างภาพข้างกัน หากแกน native ของภาพไม่พอสำหรับ context จะตัด context แกนนั้นเหลือ core แทนการ upscale [registration.json](registration.json) ระบุ nativeSize, mappedSize และ scale ของทุกภาพ สำหรับ quarter ขอบซ้าย ตัดขอบโปร่งใสต้นทางออกที่ `[96,16,w,h]` ก่อนวาง เพื่อให้ส่วนที่ติดขอบโลกใช้เนื้อเมฆจริง ขนาดหลัง crop ยังไม่น้อยกว่าขนาดที่นำไปวาง รายละเอียด nativeCrop และ sampledSize อยู่ใน registration ส่วน `sources/*.webp` เป็นสำเนา native quality92 ที่เก็บ alpha; layer ส่งออก quality94 และ lossless alpha ไม่มี sharpen หรือการขยายเพื่ออ้างรายละเอียดใหม่

สแกนรอยต่อทุกขอบ 1024 ทั้งแนวตั้งและแนวนอน วัด premultiplied pixel delta ข้ามเส้นเทียบกับบริเวณข้างเคียง และเก็บ crop จากไฟล์ export ให้ดูด้วยตา ตัวเลขเป็น diagnostic ไม่ใช่การอนุมัติงานภาพ ช่องโปร่งใสเล็ก ๆ ในภาพวาดอาจอยู่ภายใน mask ได้ ค่า `maskCorePixelsWithoutEitherVariant` ใน verification รายงานจำนวนจริง ไม่ทาสีปิดด้วยโค้ด

## การนำไปใช้และพื้นใต้เมฆ

พิกัดใช้ scale จริง `[9830/3840,6554/2560]` แยกสองแกน อย่าปัดเป็นค่าเดียวก่อนวาง chunk `clouds.json` เป็นข้อมูลส่งต่อ ยังไม่ใช่ fx-layout ที่เสียบ loader ปัจจุบันโดยตรง

สูตรน้ำหนัก B คือ `0.5 - 0.5*cos(2*pi*t/24)`; A คือ 1−B ผสม premultiplied RGBA เชิงตัวเลขใน sRGB ก่อน source-over คลิป 12 วินาทีแสดงครึ่งรอบ A→B ของ cycle 24 วินาที drift เป็น sine รอบ 48 วินาที amplitude `[1.5,0.3]` หน่วยโลก ต้อง sample เป็นชั้นโลกต่อเนื่องและ clip ด้วย mask คงที่อีกครั้ง ห้ามขยับแยกทีละ chunk puff เคลื่อนช้า .8–1.3 หน่วย/วินาทีและ clip ด้วย mask เดียวกัน กล้องไม่มี parallax

พื้น v7 ยังมีเมฆนิ่งที่วาดติดอยู่ การขยับจึงเผยเมฆเดิมแทนหุบมืดในบางจุด หากต้องให้พื้นเผยได้จริง ให้ run พื้นพิจารณา terrain-handoff เฉพาะใต้ mask และรักษาหิน ต้นไม้ หิมะ ทางเดิน บันได และ skyline งานนี้ไม่แก้พื้น ไม่เชื่อม runtime และไม่รับรองผลการเล่นเกม

## ตรวจซ้ำ

ต้องมี Python3, Pillow, NumPy, OpenCV, ffmpeg/ffprobe ใช้ input และ sources ในชุดนี้ได้โดยไม่เรียก ImageGen เพิ่ม:

```sh
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/refine-mask.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/build.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/review-assets.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/review-map.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/render.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/review-clips.py
python3 docs/art-reviews/2026-11-05-z1v7-clouds/scripts/verify.py
```

`prepare.py` และ `review-seams.py` เป็นสคริปต์สืบทอด ไม่ใช้ในขั้นตอนส่งออกนี้: ตัวแรกสร้าง mask รุ่นเก่าจาก path ภายนอก ตัวหลังตรวจเฉพาะแนวตั้ง ใช้ refine-mask และ review-assets ตามลำดับด้านบน

## Self-check ตามเกณฑ์รับงาน

| เกณฑ์ | ชิ้นส่งและวิธีตรวจ |
|---|---|
| mask เต็มแผนที่ 2× + รายการบริเวณ | cloud-layer-mask 9830×6554, regions 5 บริเวณ, coverage-review เทียบ legacy 7 bank และ delete12; ตรวจภาพทั้งแผนที่และทุก quarter |
| A/B RGBA วาดจริง แบ่ง quarter บน grid2048 ขอบนุ่ม | generation records 38 ต้นทาง, registration 30 ภาพเมฆ, export 40 chunk; decode ขนาด/alpha/hash, ไม่ upscale, สแกนรอยต่อสองแกนและดู crop |
| puff 6–10 ก้อน ≥2.56 px/หน่วย | 8 PNG RGBA, ตรวจขนาดและ alpha จากไฟล์จริง ทั้งสองแกน 4.27–5.12 px/หน่วย |
| รายการพื้นใต้เมฆ ไม่แก้พื้นเอง | terrain-handoff 5 บริเวณพร้อมกรอบและ polygonโลก จำกัดด้วย mask |
| preview + คลิปจริง 12 วินาที 3 มุม + README ไทย | 3 MP4, ffprobe และ full decode, sample เฟรมจาก MP4 และวัด motion ใน mask/พื้นนิ่งนอก mask |
| ≤60 MB และข้อห้าม | verification และ delivery-inventory วัดทั้งโฟลเดอร์; git status ใช้ตรวจว่ามีเฉพาะโฟลเดอร์ส่งออก ไม่มีการแก้ src/tests/img, hooks, status.json, worklog.json หรือ git metadata ไม่เปลี่ยน branch/worktree ไม่ commit/push/merge/deploy |

ผลตรวจไฟล์สุดท้าย 24/24 ข้อได้ OK: alpha นอก mask 0 พิกเซล, พื้นที่กันหิมะ/ยอดเขา 0 พิกเซล, delete12 ไม่มี support, ratio รอยต่อสูงสุด 1.2792, core ที่ A หรือ B โปร่งใส 3819 พิกเซลตาม texture ภาพวาด ไม่ทาสีปิดด้วยโค้ด เมฆใน MP4 เปลี่ยนภาพครบทั้ง 3 มุม และพื้นนอก mask พร้อม guard 12 px มี RGB MAE ไม่เกิน 0.00983 บนสเกล 0–255

สถานะ ready ใน queue-check หมายถึงชิ้นส่งและหลักฐานของงาน asset ครบตามการตรวจรอบนี้ ไม่ได้หมายถึง QA เกมผ่านหรือเจ้าของอนุมัติภาพแล้ว
