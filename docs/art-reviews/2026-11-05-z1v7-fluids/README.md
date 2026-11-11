# Z1-V7-FLUIDS — ส่งต่อรอบ 20261111T115315Z

**สถานะ: incomplete** ยืนยันขอบเขตบนของพิกเซล mask ที่อาจอยู่นอกของเหลว ≤3% ได้ **14/37 masks** เพิ่มจากชุดล่าสุด 12/37 อีก **23 masks** ยังมี unknown เกินเกณฑ์ งานนี้ยังไม่ครบเกณฑ์รับงานและยังไม่ยืนยัน QA หรือความลื่นของ playback

## ฐานที่รับต่อและขอบเขต

คัดลอกทั้ง 507 ไฟล์จาก worktree `20261111T112241Z-d8cb32ab` ตรวจ hash ทุกไฟล์ก่อนแก้ หลักฐานและเฟรม ImageGen ของรอบก่อนอยู่ในแพ็กนี้ ไม่มีการวาดเฟรมซ้ำและไม่มี generation ใหม่ในรอบนี้ พื้น ASSEMBLE v7 native 2×, sources, sheets, layout และ off replacements คงเดิม

แก้ production เฉพาะ `masks/lavafall-bridge.webp` และ `masks/lavafall-west.webp` ไฟล์เกมเดิม `src/`, `tests/`, `img/` และโฟลเดอร์คุณเป้ไม่ได้แก้ ใช้ working directory/branch ที่ได้รับ ไม่สร้าง worktree/branch ไม่ commit/push/merge/deploy และไม่เรียก agent อื่น

[ใบรับคัดลอก](review/20261111T115315Z-copy-receipt.json) · [ตรวจสิ่งที่คงเดิม](review/current-preservation.json) · [README รุ่นก่อน](review/20261111T112241Z-README.md)

## Reference จาก ground-only และผลก่อน–หลัง

แยกการติดป้ายจาก native v7 ground ออกจาก production alpha และ annotation ที่ใช้สร้าง mask ไม่ใช้สีอย่างเดียว เพิ่ม 5 กลุ่ม: แม่น้ำม่วงช่วงล่าง 4 crops ต่อกัน และ ribbon ลาวาจริงข้างผนังหินด้านซ้ายของ west ใช้เส้นขอบที่มองเห็นในภาพ ground-only รวม references ที่ใช้พื้นที่ร่วมกันด้วย union; unknown ของแต่ละ observation ไม่ลบหลักฐานจากอีก observation

เทียบ ground กับ label ก่อนวัดแล้วพบ fine contour ชุดแรกแตะยอดหิน/ใบไม้ จึงถอยขอบเป็น envelope ของผิวน้ำที่เห็นชัด พื้นที่ระหว่าง envelope กับฝั่งยังเป็น unknown ไม่เติมเพื่อให้ตัวเลขถึงเป้า การติดป้ายและการตรวจทั้งหมดเป็น AI ผู้ตรวจคนเดียว ไม่ใช่การรับรองจากมนุษย์

| Mask | ขอบเขตบนก่อน (%) | หลัง (%) | ผล |
|---|---:|---:|---|
| lavafall-bridge | 6.831717 | 0.000000 | ≤3% |
| lavafall-west | 6.596046 | 1.279341 | ≤3% |
| spirit-river-west | 44.185296 | 7.342783 | ค้าง |
| spirit-river-east | 45.475183 | 17.074688 | ค้าง |
| spirit-river aggregate | 44.858454 | 12.421610 | ค้าง |
| shore-band-spirit | 63.407320 | 41.541488 | ค้าง |
| shore-band aggregate | 62.865029 | 41.441247 | ค้าง |

ตัวเลขเป็น **conservative upper bound**: นับ selected pixels ทุกพิกเซลที่ยังไม่มี definite-liquid label เป็น potentially outside ค่านี้ไม่ใช่เปอร์เซ็นต์ที่พิสูจน์แล้วว่าอยู่นอกน้ำ ค่า outsideDrawnLiquidPercent จึงคง null ไม่มี reference-missing ในรุ่นที่รับต่อ แต่ยังมี reference-incomplete อีก 23 ชิ้น ห้ามรวมจำนวน pixels ของ aggregate กับ component เป็นพื้นที่ก้าวหน้าแบบไม่ซ้ำ

[Ground labels](review/ground-reference-groups.json) · [สคริปต์ contours ใหม่](scripts/continue_ground_references.py) · [ผลวัด baseline ซ้ำ](review/run-start-rechecked-liquid-reference-result.json) · [ผลปัจจุบัน](review/liquid-reference-result.json) · [ก่อน–หลังทุก mask](review/reference-progress.json) · [งานต่อราย mask](review/per-mask-handoff.json)

## ตัด mask บนผิวหิน

Bridge ตัดผนังหินแตกร้าวด้านซ้ายบน รวมเส้นสะท้อนลาวา หินสองก้อนหน้าม่าน และหน้าผาด้านซ้ายล่าง West ตัดหน้าผาซ้ายและหินด้านหน้าช่วงล่าง ใช้ silhouette จากภาพ ground-only; เส้น bridge ส่วนหนึ่งรับต่อจาก contour พื้นเดิม ระบุแหล่งไว้ใน specification ไม่มีการลบ unknown ทั้งก้อนเพื่อบังคับผลวัด

| Mask | พิกเซลตัด | พิกเซลเพิ่ม | witness บนหิน ก่อน → หลัง |
|---|---:|---:|---:|
| lavafall-bridge | 2,284 | 0 | 702 → 0 |
| lavafall-west | 1,052 | 0 | 135 → 0 |

Alpha นอกส่วนที่ตัดคงเดิม witness หลังซ่อมเป็น regression evidence ส่วนผล containment ใช้ definite-liquid ground labels แยกต่างหาก ภาพก่อน/หลังเป็น diagnostic tint ไม่ใช่เฟรม animation

[Specification](review/solid-repairs-current.json) · [ผลซ่อม](review/solid-repair-result.json) · [Bridge ขยาย](review/boundary/lavafall-bridge-solid-repair.webp) · [West ขยาย](review/boundary/lavafall-west-solid-repair.webp)

12 masks ที่ยืนยันได้ก่อนเริ่มรอบนี้มี mask hash, reference-support hash และผลวัดเท่าเดิมทั้งหมด Summit ขั้นล่างเก็บ mask/sheet/sources เดิมพร้อมหลักฐาน **528/528 pixels ครบ 8 phases** ไม่วาดและไม่ register ซ้ำ ส่วนบนของ summit ยังมี reference ไม่ครบ

## Shore, particles และ loop

วัด shore จากผิวน้ำและผิวแข็งที่ติดป้ายบนภาพจริง ใช้ระยะ world แบบ anisotropic และนับ union ของ patches ที่ซ้อน/เกินขอบ ไม่ใช้ระยะจากขอบ production mask เป็นหลักฐานฝั่งจริง ยืนยัน ice **2,367/13,960** และ spirit **8,257/676,567** pixels เท่าชุดล่าสุด ยังเหลือ **11,593 / 668,310** pixels ที่ยืนยันระยะ ≤12 world ไม่ได้

ตรวจ lava bubbles/steam/embers 12 pieces ชิ้นละ 288 samples รวม phase, drift, rotation, alpha, opacity และ clipping ยังมี unknown จึงยืนยัน flat-only ทั้งชุดไม่ได้ left-bottom มี 0 visible pixels ในชุด samples นี้ พิกัด river foam 30 spots คงเดิม

ตรวจ loop metrics ทั้ง 18 falls มี 8 effective phases แต่ยังไม่ยืนยัน smooth playback โดยเฉพาะ upper-tree มี largest/median **3.121828** และ wrap/median **1.909270** อัปเดตตัวเลขตาม masks bridge/west ที่เปลี่ยน เฟรมวาดทุกชิ้นคงเดิม ไม่สร้างเฟรมจากการเลื่อน/เฟดภาพนิ่ง ไม่เพิ่ม DOF/parallax/bloom

[Shore จริง](review/shore-ground-result.json) · [Shore regression](review/shore-regression-check.json) · [Particles 12×288](review/particle-coverage-result.json) · [Loop review](loop-review.json) · [Loop check](review/current-loop-check.json) · [Prompts เดิม](generation-prompts.json) · [Prompts/บันทึกรับต่อ](generation-prompts-continuation.json)

## หลักฐานภาพและคลิป

คำนวณ dependencies จาก **พิกเซล alpha ที่เปลี่ยนจริง** อัปเดต 4 pairs: lavafall-west, lavafall-bridge, lava-flat-west, lava-flat-middle พร้อม contact-lavafalls, contact-streams และ owner-3 clip เก็บ 27 pairs, 1 contact และ 2 clips ที่ไม่กระทบด้วย hash เดิม รวมแพ็กยังมี 31 pairs / 3 contacts / 3 clips

คลิป 12 วินาที 24 fps 960×776 มุมละ 288 เฟรม มุมเทียบ landmark ภาพคุณเป้โดยประมาณ Offline renderer hold เฟรมวาดตาม fps; screen blend รับรุ่นแก้แล้ว Spots ใช้ alpha-over ขณะที่ runtime ใช้ lighter จึงเป็นหลักฐาน offline art review ไม่ใช่ผลทดสอบ integration เกม การมี distinct frames และ decode ครบไม่ยืนยันความลื่นหรือ coverage น้ำตกทั่วภาพ

แตก archive `avegee-fluids-offline-review-20261111.tar.gz` ภายในโฟลเดอร์ส่งออกหลังคัดลอกชุดล่าสุด ตรวจ 42 ไฟล์แล้วลบสำเนาซ้ำ ไม่ทับหลักฐานที่รอบก่อน refresh ตาม mask ใหม่แล้ว

[Render dependencies/hash](review/current-render-dependencies.json) · [Render report](review/offline-render-report.json) · [Archive check](review/run2-offline-archive-check.json) · [หน้ารวม](review/index.html) · [น้ำตกฟ้า](review/contact-icefalls.jpg) · [ลาวาตก](review/contact-lavafalls.jpg) · [ผิวราบ](review/contact-streams.jpg)

[คลิปมุม 2](review/clips/owner-2-ice-bridge.mp4) · [คลิปมุม 3](review/clips/owner-3-lava.mp4) · [คลิปมุม 4](review/clips/owner-4-central-stream.mp4)

## ตรวจซ้ำ

ใช้ Python 3, Pillow, NumPy, SciPy, ffmpeg/ffprobe จาก working directory ที่ได้รับ ผล exit code จริงอยู่ใน run-validation.json ตัว verifier คืน 1 เมื่อ acceptance ยังไม่ครบ ต้องอ่าน technicalChecks และ acceptanceFailures แยกกัน ไม่ใช้ exit 0 ของ metadata checks เป็นการรับรอง QA

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/continue_ground_references.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/repair_solid_overlap.py --masks lavafall-bridge lavafall-west
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_references.py --proof-mask lavafall-bridge --proof-mask lavafall-west --proof-mask spirit-river-west --proof-mask spirit-river-east --proof-mask spirit-river --proof-mask shore-band-spirit --proof-mask shore-band
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_reference_union.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_shore_regression.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/audit_current_continuation.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/verify_delivery.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_pack.py
```

สคริปต์ build_assets/correct_masks/add_ground_references/extend_ground_references และ summarize_reference_progress เป็นขั้นตอนหรือ checkpoint ของรอบก่อน ไม่ใช้ทับแพ็กปัจจุบันโดยลำพัง การ rebuild ต้องรักษาลำดับ corrections, summit registration และ solid repairs ทั้งชุด จากนั้นคืน frozen references ของรอบล่าสุดตาม script นี้

หากมี production pixels เปลี่ยนเพิ่ม ให้สร้าง dependency plan ใหม่ก่อน render ด้วย audit_current_continuation.py --prepare-render และปรับขอบเขต CHANGED ตามงานจริง ไม่รัน prepare ทับแผนเดิมเพียงเพื่ออ่านผลหลัง render

[ผลคำสั่ง](review/run-validation.json) · [Verifier](review/delivery-verification.json) · [Scope](review/scope-check.json)

## ตรวจตัวเองตามเกณฑ์

| เกณฑ์ใบงาน | ผลจริง |
|---|---|
| ASSEMBLE v7 / mask 2× | มี native tiles, decoded-ground/hash และมิติ 37 masks |
| ทุก mask บนของเหลวจริง ≤3% | 14/37 ยืนยันขอบเขตบนได้; 23 ยังไม่ครบ |
| น้ำตกทุกจุดที่วาดจริงขยับ | 18 ชิ้นที่มี layout มี 8 phases; การสำรวจทุกน้ำตกทั่ว v7 ยังค้าง |
| น้ำตกฟ้า 8 เฟรม ≥800 ตามรูปทรง / ละอองฐาน | 10 ชิ้นมี 8×800×800 และ native source ≥800; ยังต้องตรวจรูปทรง/ละอองฐานทุกจุด |
| ลาวาตก 8 จุดและผิวลาวา | มี HD รับต่อ 314×534 ต่อเฟรม; แก้ mask bridge/west; การเทียบรูปทรง HD กับ v7 ครบ 8 จุดยังค้าง |
| ลำธารราบใช้ tile / flowDir | Layout คงรูปแบบ tile พร้อม flowDir |
| Particles เฉพาะผิวลาวาราบ / foam ม่วง 30 spots | ตรวจ 12×288 แต่ flat-only ยังไม่ยืนยัน; 30 spots คงเดิม |
| Shore band ≤12 world | ยืนยัน ice 2,367 และ spirit 8,257 pixels; ส่วนที่เหลือค้าง |
| fx-layout และระบุแทนชิ้น off | schemaVersion 4 / 46 pieces / 21 sheets และ mapping รับต่อคงเดิม |
| Contact sheets ไม่มีปัญหาแบบภาพวง | มี 31 คู่/3 sheets และภาพซ่อมขยายสองจุด; การตรวจทั้งชุดยังค้าง |
| คลิป 12 วินาที 3 มุม | Decode ครบ 288 เฟรมต่อมุม, decoder exit 0 ทั้ง 3 คลิป; มุมเทียบโดยประมาณ |
| README ไทย / loop-review / prompts / queue | มีครบ; queue เป็น incomplete ตามผลจริง |
| ≤80 MB / ขอบเขต / ข้อห้าม | ดูจำนวน bytes จริงใน delivery-size และ scope-check; ไม่มีเฟรมใหม่หรือการแก้เกมเดิม |

แพ็กเก็บ native ground, source art, masks และ sheets ครบ บีบอัดเฉพาะภาพ diagnostic รุ่นเก่าบางส่วนเพื่อรักษา byte budget การวัดอาศัย native ground และ contours ไม่ใช้สีของ preview ที่บีบอัด ภาพปัจจุบันของ liquid-reference และ solid-repair รวมหลักฐาน summit คงความละเอียดเดิม

[Preview budget](review/run2-preview-budget.json) · [Manifest](delivery-manifest.json) · [ขนาดจริง](delivery-size.json) · [คิวงานค้าง](queue-check.json)
