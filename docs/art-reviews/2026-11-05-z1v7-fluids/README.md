# Z1-V7-FLUIDS — ส่งต่อรอบ 20261111T162400Z

**สถานะ incomplete — ยืนยันขอบเขตบน ≤3% ได้ 16/37 masks; อีก 21 ชิ้นยังไม่ครบ** งานยังไม่ครบเกณฑ์รับงาน ไม่มีการรับรอง QA หรือความลื่นของ playback

## ฐานและขอบเขตที่แก้

คัดลอกทั้ง 568 ไฟล์จาก worktree ล่าสุด `20261111T121657Z-35a18a5c` ตรวจ SHA-256 ตรงกันทุกไฟล์ก่อนแก้ ชุดนี้มีงาน ImageGen, native v7 ASSEMBLE, sheets และ prompts จากรอบก่อนครบ รอบนี้ **ไม่มี generation ใหม่และไม่วาดเฟรมซ้ำ**

Handoff เดิมรายงาน 14/37 แต่ reference ล่าสุดมี contours จากรอบก่อนเพิ่มแล้ว ขณะรายงานบางส่วนยังไม่อัปเดต วัดฐานซ้ำได้ **15/37**: east มี 2.720192% อยู่แล้ว จึงไม่นับเป็นงานเพิ่มรอบนี้ ส่วนแถววัด lavafall-upper-left และ mouth เดิมยังใช้ label support เก่า ผลเปรียบเทียบรอบนี้ใช้ baseline ที่คำนวณซ้ำจาก snapshot เดียวกัน ได้เพิ่มจริง **15 → 16/37** คือ `ice-stream-flat-central`

แก้ production เฉพาะ 4 component masks และ aggregate ของ ice/lava รวม 6 ไฟล์ รักษา mask และ label-support hash ของทั้ง 15 ชิ้นที่ยืนยันได้ตอนเริ่มไว้ทั้งหมด Summit mask/sheet/sources และหลักฐานขั้นล่าง **528/528 pixels ครบ 8 phases** คงเดิม Sources, sheets, terrain, layout, flowDir และ off replacements ไม่เปลี่ยน

[ใบรับคัดลอก](review/run4-copy-receipt.json) · [ฐานที่วัดซ้ำ](review/run4-rechecked-baseline.json) · [สิ่งที่คงเดิม](review/current-preservation.json) · [README ที่รับต่อ](review/run4-start-README.md)

## Ground-only references และผลจริง

เพิ่ม 11 observation groups จากภาพ v7 ground-only: ริ้วและฐานลาวาตก upper-left/mouth/volcano, ช่องน้ำด้านขวาของ central, receiving pools ของ upper/lower และผิวลาวาราบ middle/west ใช้ silhouette หิน เส้นฝั่งจริง และผิวน้ำที่เห็นชัด ไม่ติดป้ายด้วยสีอย่างเดียว ไม่เปิด production alpha หรือ construction annotations ในขั้น freeze contours

รวมกลุ่มที่ใช้ ground ร่วมกันด้วย union; unknown ของ observation หนึ่งไม่ลบหลักฐานของอีก observation เมื่อ ground ใหม่ยืนยันว่าเป็นหิน จะถอน positive labels ที่ทับผิวแข็งนั้นจากแต่ละ contributing leaf การถอนนี้ลดพื้นที่ยืนยัน ไม่มีการเติม liquid ตาม unknown ของ mask เพื่อบังคับคะแนน

เทียบ label กับ ground ก่อนวัดแล้วถอย contour west bend ที่แตะหิน/ใบไม้ และยกเลิกแนวริ้วซ้าย volcano ที่ยังแยกชนิดไม่ได้ เก็บเฉพาะ receiving toe ที่เห็นชัด ดังนั้นบาง observation ใหม่ไม่เพิ่ม selected pixels ที่ยืนยันได้ นับพื้นที่นอก label ทุกพิกเซลเป็น potentially outside ค่าในตารางเป็น **conservative upper bound** ไม่ใช่เปอร์เซ็นต์ที่พิสูจน์ว่าอยู่นอกน้ำแล้ว `outsideDrawnLiquidPercent` ยังคง null

| Mask | ฐานวัดซ้ำ (%) | ปัจจุบัน (%) | ผล |
|---|---:|---:|---|
| ice-stream-flat-central | 9.060460 | 2.984928 | ≤3% |
| ice-stream-flat-upper | 11.592525 | 6.409199 | ค้าง |
| ice-stream-flat-lower | 26.624716 | 13.312358 | ค้าง |
| ice-stream-flat | 14.337200 | 6.924171 | ค้าง |
| lava-flat-middle | 23.262586 | 12.950856 | ค้าง |
| lava-flat-west | 85.940801 | 44.219804 | ค้าง |
| lava-flat | 50.513060 | 43.443887 | ค้าง |
| lavafall-upper-left | 8.627328 | 5.469316 | ค้าง |
| lavafall-mouth | 8.111928 | 6.970535 | ค้าง |
| shore-band-ice | 35.723496 | 25.315186 | ค้าง |

การติดป้าย/ตรวจภาพเป็น AI ผู้ตรวจคนเดียว ไม่มี human QA ตัวเลข component และ aggregate ซ้อนกัน ห้ามนำจำนวน pixels มาบวกเป็นพื้นที่ก้าวหน้าแบบไม่ซ้ำ

[Contours ที่เพิ่ม](review/run4-ground-contours.json) · [กลุ่ม reference ทั้งชุด](review/ground-reference-groups.json) · [ผลปัจจุบัน](review/liquid-reference-result.json) · [ก่อน–หลังทุก mask](review/reference-progress.json) · [Handoff ราย mask](review/per-mask-handoff.json)

## ตัด mask ที่ทับหิน

ใช้ contours ผิวแข็งจาก ground-only แยกจาก positive-liquid observations ไม่ใช้การลบ unknown ทั้งก้อน ตัวอย่างที่ตัดคือผนังเรืองส้มและ rim หินของลาวาตก, หินเล็กใน receiving pool และผนังหินข้างแม่น้ำลาวา Alpha นอกพิกเซลที่ตัดคงเดิม

| Component mask | pixels ตัด | pixels เพิ่ม |
|---|---:|---:|
| lavafall-upper-left | 294 | 0 |
| lavafall-mouth | 254 | 0 |
| ice-stream-flat-upper | 179 | 0 |
| lava-flat-middle | 2,558 | 0 |

รวม 3,285 component pixels; aggregate ice ตัดเพิ่ม 179 และ aggregate lava ตัดเพิ่ม 2,558 จากฐานรอบนี้ เป็น union ของ component masks ตรงกันจริง ไม่บวก aggregate ซ้ำเป็นพื้นที่แก้ การตัดช่วยลดข้อผิดพลาด แต่ทั้ง 4 ชิ้นนี้ยังมี unknown เกิน 3% จึงยังไม่รับรอง containment ทั้งชิ้น

[ผลและ hashes](review/solid-repair-result.json) · [upper-left ขยาย](review/boundary/lavafall-upper-left-solid-repair.webp) · [mouth ขยาย](review/boundary/lavafall-mouth-solid-repair.webp) · [ice upper ขยาย](review/boundary/ice-stream-flat-upper-solid-repair.webp) · [lava middle ขยาย](review/boundary/lava-flat-middle-solid-repair.webp)

## Shore, particles และ loop

คำสั่งวัด shore ครั้งแรกหยุดที่ assertion เพราะ liquid/solid labels ของ east ทับกัน 129 pixels ตรวจ ground ขยายแล้วพบเส้นฝั่งตรงที่รับต่อพาดผ่านเว้าน้ำและฟอง ไม่ใช่ silhouette ฝั่งจริง จึง **ถอน bank strip นั้นเป็น unknown** เก็บ rock interiors อีกสองชิ้น และรักษา reference น้ำที่ผ่านแล้ว จุดขัดแย้งทั้ง 129 pixels ไม่มีพิกเซลใดถูกเลือกโดย production east mask ไม่ปิด assertion และไม่เปลี่ยนเกณฑ์เพื่อให้ตรวจผ่าน

เพิ่ม bank observations ของหินใน upper pool และฝั่ง central-right วัดระยะจากผิวแข็งที่เห็นจริงด้วย anisotropic world scale ไม่วัดจากขอบ production mask ยืนยัน shore ice **2,687/13,960** pixels (ฐาน 2,367) และ spirit **8,257/676,567** pixels เหลือ 11,273 และ 668,310 pixels ที่ยังยืนยัน ≤12 world ไม่ได้

ตรวจ lava particles ทั้ง 12 pieces × 288 samples รวม timing, drift, rotation, alpha, opacity และ mask clipping `lava-bubble--lava-left` ยืนยันบนผิวลาวาราบได้ **2,728/2,728 unique sampled pixels** (unknown 268 → 0) อีก 10 pieces ยัง reference-incomplete ส่วน left-bottom ยังมี 0 visible pixels จึงไม่ใช่หลักฐานว่า placement ถูกต้อง ไม่พบ overlap กับ falling labels ที่มีอยู่ แต่ labels ยังไม่ครบจึงยืนยัน flat-only ทั้งชุดไม่ได้ พิกัด foam ม่วง 30 spots คงเดิม

ตรวจ metrics 18 falls มี 8 effective phases ครบ อัปเดตตาม masks upper-left/mouth ที่เปลี่ยน ตรวจ contact ของ upper-tree 8 phases แล้ว แต่ยังไม่ตรวจ playback ครบทุกจุด Upper-tree มี largest/median 3.121828 (6→7) และ wrap/median 1.909270 ต้องตรวจการกระโดดต่อ ตัวเลข distinct frames หรือ MAE ไม่ยืนยันความลื่น ไม่เรียงเฟรมใหม่ ไม่เลื่อนหรือเฟดภาพนิ่งเพื่อสร้างเฟรม ไม่เพิ่ม DOF/parallax/bloom

[ข้อขัดแย้งของฝั่ง](review/run4-east-reference-conflict.webp) · [ผล/วิธีถอน](review/run4-east-reference-conflict.json) · [คำสั่งครั้งแรกที่หยุด](review/run4-measurements-first-attempt.json) · [Shore ปัจจุบัน](review/shore-ground-result.json) · [Particles](review/particle-coverage-result.json) · [Loop metrics](review/current-loop-check.json) · [Upper-tree phases](review/run4-upper-tree-loop-phases.webp) · [Loop review](loop-review.json)

## หลักฐานภาพและคลิป

คำนวณ dependency จากพิกเซล alpha ที่เปลี่ยนจริง รีเฟรช **8 pairs, 3 contacts และ 3 clips/sequence montages** เก็บอีก 23 pairs ที่ไม่กระทบด้วย hash เดิม ครบ 31 pairs / 3 contacts / 3 clips ไม่เรนเดอร์ชิ้นที่เปลี่ยนเฉพาะ reference และไม่มี production pixel เปลี่ยน เช่น central ที่ยืนยันเพิ่ม

คลิป 12 วินาที 24 fps 960×776 ทั้ง 3 มุม decode ครบ **288 frames/มุม, decoder exit 0** มุมตรง landmark ภาพคุณเป้โดยประมาณ ไม่ใช่ game camera registration ที่ยืนยันแล้ว Offline renderer hold เฟรมวาดตาม fps และใช้ screen blend รุ่นแก้แล้ว Spots ใช้ alpha-over แต่ runtime ใช้ lighter จึงเป็นหลักฐาน offline art review ไม่มีการทดสอบ integration เกม

แตก archive ที่ผู้ใช้ระบุภายในโฟลเดอร์ส่งออกหลังรับต่อ ตรวจ regular entries 86 ไฟล์รวม metadata แล้วลบสำเนาชุดแตก ไม่ทับหลักฐานที่รีเฟรชตาม production ล่าสุด

[Render dependency และ hashes](review/current-render-dependencies.json) · [ผลคำสั่ง render](review/run4-render-command.json) · [Render report](review/offline-render-report.json) · [Archive check](review/run4-offline-archive-check.json) · [หน้ารวม](review/index.html)

[Contact น้ำตกฟ้า](review/contact-icefalls.jpg) · [Contact ลาวาตก](review/contact-lavafalls.jpg) · [Contact ผิวราบ](review/contact-streams.jpg)

[คลิปมุม 2](review/clips/owner-2-ice-bridge.mp4) · [คลิปมุม 3](review/clips/owner-3-lava.mp4) · [คลิปมุม 4](review/clips/owner-4-central-stream.mp4)

## คำสั่งและผลตรวจ

Python 3, Pillow, NumPy, SciPy และ ffmpeg/ffprobe ผล exit จริงอยู่ในรายงาน ไม่ใช้ exit 0 ของ metadata เป็นการรับรอง QA `verify_delivery.py` คืน **1 ตาม acceptance ที่ยังไม่ครบ** ขณะ technicalChecks ทุกข้อเป็น true

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/continue_run4_references.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/repair_solid_overlap.py --masks lavafall-upper-left lavafall-mouth ice-stream-flat-upper lava-flat-middle
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/measure_references.py --proof-mask ice-stream-flat-central --proof-mask ice-stream-flat-upper --proof-mask ice-stream-flat-lower --proof-mask ice-stream-flat --proof-mask lava-flat-middle --proof-mask lava-flat-west --proof-mask lava-flat --proof-mask lavafall-upper-left --proof-mask lavafall-mouth --proof-mask lavafall-volcano --proof-mask shore-band-ice --proof-mask shore-band
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/validate_run4.py --stage measurements
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/validate_run4.py --stage delivery
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/check_pack.py
```

เมื่อ production เปลี่ยน ต้องเตรียมแผน `audit_run4.py --prepare-render` ก่อน render แล้วใช้ pairIds/clipIds จากแผน เก็บ outputsBeforeRefresh ไว้ตรวจสิ่งที่ไม่กระทบ อย่า prepare ทับหลัง render เพื่ออ่านผล หากรับงานรอบใหม่ให้ตั้ง baseline/EXPECTED ตามการแก้จริง สคริปต์เก่า build_assets/correct_masks/add_ground_references/continue_ground_references/audit_current_continuation เป็นลำดับเก่า ห้ามรันทับแพ็กปัจจุบันโดยลำพัง

ภาพ diagnostic บางส่วนถูกบีบอัดเพื่อคุมขนาดแพ็ก Native ground, source art, sheets, masks, native particle-support PNG และ summit evidence คงเดิม การวัดใช้ native ground/contours ไม่ใช่สีของ preview ที่บีบอัด หากสร้างภาพ preview ใหม่ต้องตรวจ byte budget อีกครั้ง

[คำสั่ง measurements](review/run4-measurements-commands.json) · [คำสั่ง delivery](review/run4-delivery-commands.json) · [Verifier](review/delivery-verification.json) · [Preview budget](review/run4-preview-budget.json) · [Manifest](delivery-manifest.json) · [ขนาดจริง](delivery-size.json) · [Scope](review/scope-check.json)

## ตรวจตัวเองตามเกณฑ์

| เกณฑ์ | ผลจริง |
|---|---|
| พื้น ASSEMBLE v7 / mask 2× | Native terrain/hash และ 37 masks มีมิติตรง layout |
| ทุก mask บนของเหลวจริง ≤3% | ยืนยัน conservative upper bound 16/37; 21 ค้าง |
| น้ำตกทุกจุดในพื้นขยับ | 18 falls ใน layout มี 8 effective phases; global survey/coverage ยังไม่ครบ |
| น้ำตกฟ้า 8 เฟรม ≥800 px / รูปทรงและละอองฐาน | 10 ชิ้นมี 8×800×800 และ native source ≥800; ตรวจรูปทรง/ละอองครบทุกจุดยังค้าง |
| ลาวาตก 8 จุดและผิวลาวา | HD รับต่อ 314×534 ต่อเฟรม; ซ่อม upper-left/mouth และ flat middle; containment/ความเข้ากับ v7 ทั้งชุดยังค้าง |
| ลำธารราบใช้ tile / flowDir | คง layout แบบ tile พร้อม flowDir |
| Particles เฉพาะลาวาราบ / foam ม่วง 30 spots | 1/12 pieces ยืนยัน sampled-flat, 10 unknown, 1 ไม่ปรากฏ; 30 spots คงเดิม |
| Shore ≤12 world | Ice ยืนยัน 2,687 และ spirit 8,257 pixels; ส่วนที่เหลือค้าง |
| fx-layout และ mapping แทนชิ้น off | schemaVersion 4 / 46 pieces / 21 sheets และ off-replacements คงเดิม |
| Contact ไม่มีปัญหาแบบภาพวง | มี 31 pairs/3 contacts และภาพซ่อม 4 ชิ้น; ยังไม่รับรองไม่มีปัญหาทั้งชุด |
| คลิป 12 วินาที 3 มุม | Decode ครบ 3×288 frames; offline มุมประมาณ ไม่มี game integration |
| README ไทย / loop-review / prompts / queue | ครบ; queue เป็น incomplete ตามผลจริง |
| ≤80 MB / ขอบเขต / ข้อห้าม | ตรวจ bytes ใน delivery-size และ scope-check; แก้เฉพาะโฟลเดอร์ส่งออก ไม่แก้เกม/โฟลเดอร์คุณเป้ ไม่สร้างหรือสลับ branch/worktree ไม่ commit/push/merge/deploy และไม่เรียก agent |

งานต่อเริ่มจาก [per-mask-handoff](review/per-mask-handoff.json) และ [queue-check](queue-check.json) รักษา summit ขั้นล่างและ 16 masks ที่ยืนยันแล้วไว้ ไม่วาดซ้ำ
