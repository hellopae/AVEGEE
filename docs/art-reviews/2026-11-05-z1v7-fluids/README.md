# Z1-V7-FLUIDS — ผลตรวจรอบ 11 พฤศจิกายน 2569

**สถานะ: incomplete — ยังส่งสลับเข้าเกมเป็นงานที่ผ่านเกณฑ์ไม่ได้**

รอบนี้รับต่องานเดิม ตรวจ mask/เฟรม และทำหลักฐานออฟไลน์ ไม่เรียก ImageGen เพิ่ม (0 generations) และไม่วาดชิ้นเดิมซ้ำ พบข้อผิดเกณฑ์จริงสองข้อ:

1. `icefall-upper-tree`: mask ทับกิ่งหิมะและผิวหน้าผาที่ระบุจากภาพพื้นอย่างน้อย **282 / 6,578 พิกเซล = 4.287017%** เกิน 3% ดู [ภาพหลักฐาน](review/boundary/icefall-upper-tree-independent-proof.webp)
2. `shore-band-ice`: มี **121 พิกเซล** ที่พิสูจน์ได้ว่าอยู่ห่างฝั่งจริงเกิน 12 หน่วย จุดที่มีขอบเขตระยะต่ำสุดสูงสุดได้ **14.452243 หน่วย** ดู [ภาพหลักฐาน](review/boundary/shore-band-ice-independent-proof.webp) และ [ผลคำนวณ](review/shore-witness-result.json)

ไม่ได้แก้ mask หรือเฟรมผลิตในรอบนี้ หลักฐานจึงยังตรงกับชิ้นที่รับต่อมาและชี้ข้อที่ต้องแก้ได้ ตรวจ hash ของ layout, masks, sheets, sources และ input/v7 รวม 125 ไฟล์เทียบรอบล่าสุดไว้ใน [inherited-assets.json](review/inherited-assets.json)

## สิ่งที่รับต่อและสิ่งที่ทำรอบนี้

คัดลอกไฟล์ในโฟลเดอร์งานนี้ตามลำดับ `20261110T122730Z-bde65eb4` (75 ไฟล์, commit อ้างอิง `96a73fcf`) → `20261110T160006Z-a5ae8b24` → `20261110T173314Z-b662f4b4` → **`20261110T234901Z-bb48e869`** โดยฉบับหลังทับฉบับก่อน จากนั้นแตก `avegee-fluids-offline-review-20261111.tar.gz` ตามใบงาน เก็บลำดับและ SHA-256 ของ archive ใน [continuation-provenance.json](review/continuation-provenance.json)

ไฟล์ผลิต `fx-layout.json`, `masks/`, `sheets/`, `sources/` และเฟรม ImageGen มาจากรอบก่อนทั้งหมด พื้นประกอบ v7 อยู่ใน `input/v7/`; ข้อมูล ASSEMBLE อยู่ใน `input/assemble-*` มีคำสั่งสร้างภาพเดิมใน `generation-prompts.json` และ `generation-prompts-continuation.json` ไม่ได้สร้างภาพด้วย Shado หรือบริการสร้างภาพอื่น

รอบนี้เพิ่มการตรวจอิสระจาก annotation ก่อสร้าง, ภาพขยายพื้น/overlay, รายงานตรวจไฟล์, README และ queue-check แล้ว **รัน `render_offline.py` ซ้ำจริง** ด้วยสคริปต์แก้ `screen` blend จาก archive ได้ภาพเทียบ 31 จุดและคลิปสามมุมใหม่จาก layout/เฟรมในโฟลเดอร์นี้ ลบเฉพาะ metadata ของ macOS และภาพสำรวจ/overlay ที่ซ้ำกับหลักฐานใหม่ เพื่อคุมขนาด ≤80,000,000 bytes รายการไฟล์ที่ตัดและ hash อยู่ใน [pruned-derived-files.json](review/pruned-derived-files.json) ไม่ได้ลบ source frames หรือ production masks

## วิธีตรวจขอบ mask และข้อจำกัดของตัวเลข

รายงานเดิม `mask-review.json` วัดการอยู่ใน `mask-annotations.json` ที่ใช้สร้าง mask เอง ค่า `outsideAnnotationPercent = 0` จึง **ไม่ใช่** หลักฐานว่าอยู่นอกของเหลวจริง 0%

ตรวจภาพพื้น v7 เทียบ overlay ครบ 31 จุดใน `review/boundary/` น้ำตก 18 จุดมีภาพ native 2×; ผิวราบและแม่น้ำ 13 จุดมี overview พื้น/overlay คู่กัน ภาพขยายเฉพาะจุดและภาพชี้พิกเซลเสียอยู่ในโฟลเดอร์เดียวกัน

สร้าง [independent-exclusions.json](review/independent-exclusions.json) จากการอ่านรูปร่างบนภาพพื้นโดยตรง ระบุเฉพาะด้านในของกิ่งหิมะ/พื้นผิวแข็งที่เห็นชัด ไม่อ่านหรือคัดลอก polygon จาก annotation ก่อสร้าง และไม่ใช้ polygon ชุดใหม่นี้แก้ production mask จากนั้นนับ intersection ที่ความละเอียด native 2×:

`lowerBoundPercent = 100 × count(maskAlpha > 0 AND labelledSolidInterior) / count(maskAlpha > 0)`

| Mask | พิกเซลทับพื้นผิวแข็งที่ระบุแล้ว | พิกเซล mask ทั้งหมด | ขอบเขตต่ำสุดของ % นอกของเหลว |
|---|---:|---:|---:|
| icefall-upper-tree | 282 | 6,578 | ≥4.287017% — เกินเกณฑ์ |
| icefall-summit | 825 | 64,208 | ≥1.284887% — ยังสรุปว่า ≤3% ไม่ได้ |
| icefall-east-cliff | 11 | 7,582 | ≥0.145080% — ยังสรุปว่า ≤3% ไม่ได้ |

นี่เป็น **ขอบเขตต่ำสุดจากการระบุพื้นที่บางส่วน** ไม่ใช่ segmentation ครบภาพ ส่วนที่ไม่ระบุยังเป็น unknown; ค่า 0 สำหรับ mask อื่นหมายถึงยังไม่มี polygon พื้นผิวแข็งที่นับ ไม่ได้แปลว่าไม่มีการล้น ไม่กรอกเปอร์เซ็นต์รวมที่ยังพิสูจน์ไม่ได้ (`outsideDrawnLiquidPercent: null`) ผลแยกครบ 37 masks รวม aggregate อยู่ใน [independent-mask-review.json](review/independent-mask-review.json) การอ่านภาพเป็นการตรวจรอบใหม่โดย agent เดียว ไม่ใช่การรับรองจากผู้ตรวจคนอื่น

สำหรับ shore band ใช้วงกลมที่ตรวจจากพื้นแล้วว่าอยู่ในน้ำทั้งหมด ศูนย์กลาง map 1× `(3355,1025)` รัศมี native 2× 38 px และกันขอบ 1 px ทุกพิกเซลในวงมีระยะถึงฝั่งอย่างน้อย `37 − distanceFromCenter` px แปลงด้วยสเกล world ที่เล็กกว่าของสองแกน พบ 121 พิกเซลที่ระยะต่ำสุดยังมากกว่า 12 หน่วย เป็นตัวอย่างโต้แย้งข้อกำหนดจริง ไม่ได้อ้างว่าทำแผนที่ฝั่งครบแล้ว สคริปต์เดิมคำนวณระยะจาก flat-mask ที่ผ่าน palette/geometry จึงนับขอบด้านในน้ำบางส่วนเป็นฝั่งได้

## ภาพเทียบและคลิป

เปิด [หน้ารวมหลักฐานออฟไลน์](review/index.html) หรือไฟล์ต่อไปนี้โดยตรง:

- [น้ำตกฟ้า 10 จุด: พื้น | พื้น+effect](review/contact-icefalls.jpg)
- [ลาวาตก 8 จุด: พื้น | พื้น+effect](review/contact-lavafalls.jpg)
- [ผิวลาวา/ลำธาร/แม่น้ำ 13 จุด: พื้น | พื้น+effect](review/contact-streams.jpg)
- [มุมภาพคุณเป้ 2 — สะพานน้ำแข็ง](review/clips/owner-2-ice-bridge.mp4)
- [มุมภาพคุณเป้ 3 — ลาวา](review/clips/owner-3-lava.mp4)
- [มุมภาพคุณเป้ 4 — ลำธารกลาง](review/clips/owner-4-central-stream.mp4)

คลิปทุกไฟล์ **12.000 วินาที, 24 fps, 960×776, decode ครบ 288 เฟรม** ไม่มี decoder error มุมกล้องจับคู่จาก landmark ด้วยตา เป็นมุมประมาณ ไม่ได้กู้ transform กล้องเกมเดิม ภาพคุณเป้ต้นฉบับอ่านอย่างเดียว; สำเนาย่อและ hash อยู่ใน `review/owner-reference/`

ก่อนเข้ารหัส มีภาพต่างกันตามลำดับ **8 / 288 / 8** ภาพ มุมลาวามีการเปลี่ยนจาก timing ของ spots จึงได้ 288 ภาพ ไม่ได้แปลว่ามีเฟรมวาดลาวา 288 เฟรม หลังเข้ารหัส decoder อาจให้ hash ต่างกันทั้ง 288 เฟรมจาก codec variation จึงไม่ใช้จำนวนนี้อ้างจำนวนเฟรมวาด

นี่เป็น Pillow offline renderer ซึ่ง hold เฟรมวาดตาม fps ไม่มี cross-fade ของ runtime, GPU mips หรือ profile throttling และ spots ใช้ alpha-over ต่างจาก runtime lighter accumulation **ไม่ได้ทดสอบการรวมเข้าเกม และไม่ได้รับรองการเล่นวนด้วยตาครบคลิป** ดู [offline-render-report.json](review/offline-render-report.json) และ [delivery-verification.json](review/delivery-verification.json)

## เฟรมและ loop-review

ตรวจ sheet ที่ layout เรียกใช้ 21 แผ่น; น้ำตกฟ้า 10 จุดมีจุดละ 8 เฟรม ขนาดส่งออก **800×800 ต่อเฟรม** และตรวจขนาด cell ของ source ImageGen จริงเทียบ metadata เฟรมอื่นใช้ของ fluids-HD เดิม เช่นลาวาตก **314×534, 8 เฟรม** ไม่ขยายแล้วอ้างว่าเป็น native 800 px

เก็บ `loop-review.json` เดิมไว้เป็นผลวัดก่อน encoding จากรอบก่อน (10 น้ำตก) ตัวอย่างที่ต้องตรวจการกระโดดเพิ่ม: `upper-tree` มี largest/median transition = 2.677 และ wrap/median = 1.582 ตัวเลขเฟรมต่างกันหรือ MAE ไม่ยืนยันว่า loop ลื่น รอบนี้มีการวัด visible RGB และทุก transition รวม 8→1 ซ้ำจาก sheet ส่งออกทั้ง 21 แผ่นใน `delivery-verification.json` และตรวจภาพ sequence ของสามมุม แต่ยังไม่ให้สถานะ visual playback ผ่าน

ไม่ได้สร้างเฟรมด้วยการเลื่อนหรือเฟดภาพนิ่งในรอบนี้ สคริปต์ offline ใช้เฟรมที่มีอยู่ ไม่เพิ่มเฟรมวาด ไม่มี DOF/parallax/bloom; ไม่อ้างว่าการตรวจ hash พิสูจน์ขั้นตอนสร้างภาพของรอบก่อนได้ทั้งหมด

## Layout และห้าจุด off เดิม

`fx-layout.json` เป็น schema เดียวกับไฟล์ที่รับต่อ มี 46 pieces / 33 masks ที่ถูกอ้างอิง / 21 sheets เก็บชิ้นแทนไว้ใน `off-replacements.json`:

| ชิ้น off เดิม | ชิ้นเสนอแทนใน v7 |
|---|---|
| upper-bridge | ice-stream-flat-upper (tile ราบ) |
| center-step | ice-stream-flat-central (tile ราบ) |
| plaza-right | ไม่มีชิ้นแทน; คง off |
| east-cliff | icefall-east-cliff |
| mouth | icefall-mouth |

ตารางนี้เป็น mapping ที่รับต่อ ไม่ใช่การอนุมัติสลับเกม ตรวจแล้วฟองริมฝั่งแม่น้ำม่วง 30 spots ตรงกับต้นฉบับทุกค่า ชิ้น bubble/steam/embers อ้าง mask กลุ่ม `lava-flat-*` เท่านั้น แต่ยังต้องตรวจ semantic classification ของผิวราบจริงอีกครั้ง โดยเฉพาะช่องลาวาลาดชันใน `lava-flat-left-bottom` / `lava-flat-southwest` การไม่อ้าง mask ชื่อ lavafall เพียงอย่างเดียวไม่ยืนยันว่าไม่ทับลาวาตกในภาพ

## คำสั่งที่รันและผลจริง

รันจากราก repo (ต้องมี Pillow, NumPy, SciPy, ffmpeg, ffprobe):

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/render_offline.py
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-05-z1v7-fluids/scripts/verify_delivery.py
git diff --check
```

- renderer: exit 0, ได้ภาพเทียบ 31 จุดและคลิปสามไฟล์
- verifier: **exit 1** เพราะเกณฑ์รับงานยังไม่ครบ; อ่านผลแยกข้อจาก `technicalChecks` และ `acceptanceFailures` ไม่ตีความ exit 1 เป็นงานผ่าน
- ffprobe และ ffmpeg decode ครบทุกเฟรมอยู่ภายใน verifier; รายงานมี SHA-256 ของคลิปและแต่ละเฟรมที่ decode
- ตรวจ schema/มิติ masks 2×, sheets/consumer, visible phases, 30 spots และ hash แหล่งรับต่อภายใน verifier
- ไม่รัน tests ของเกม เพราะไม่แก้เกมและหลักฐานนี้ไม่ใช่ runtime integration

## ตรวจตัวเองเทียบใบงาน

| เกณฑ์ | ผลและหลักฐาน |
|---|---|
| masks 2× บนพื้น v7 | มิติครบ 37 แผ่น; input/v7 + delivery-verification.json |
| ทุก mask นอกของเหลว ≤3% และไม่ทับหิน/ต้นไม้/ฟ้า | **ไม่ครบ**: upper-tree ≥4.287%; mask อื่นยังไม่มีเปอร์เซ็นต์ semantic รวมที่ยืนยันได้ |
| shore-band อยู่ในน้ำและติดฝั่ง ≤12 หน่วย | **ไม่ครบ**: 121 พิกเซลของ ice band อยู่ไกลกว่านั้น |
| ทุกน้ำตกที่วาดในพื้นขยับ; 8 เฟรม ≥800 สำหรับน้ำตกฟ้า | ตรวจเฟรมของ 10 icefalls และ 8 lavafalls ที่ลงทะเบียนแล้ว; **ยังไม่รับรอง coverage ทุกน้ำตกในพื้นทั้งแผนที่** หรือ loop ลื่น |
| ผิวราบใช้ flowDir tile / bubble เฉพาะผิวราบ | ice pieces เป็น tile + flowDir; spots ไม่อ้าง lavafall masks; semantic ผิวราบยังต้องตรวจ |
| layout พร้อมชิ้นแทน off เดิม | ไฟล์และ mapping มีครบ; **ยังไม่ทดสอบสลับเข้าเกม** |
| contact sheet ทุกจุดและไม่มีปัญหาแบบวงเดิม | ภาพเทียบครบ 31 จุดและภาพขยายครบ; **ยังมีปัญหาขอบ mask ตามหลักฐาน** |
| คลิป 12 วินาทีสามมุม | ไฟล์ครบและ decode ครบ 288 เฟรมต่อมุม; มุมประมาณตาม landmark |
| README ไทย / loop-review / generation-prompts / queue-check | มีครบ; queue = incomplete ตามผลจริง |
| ≤80 MB / ไม่แก้เกมเดิม | ดู delivery-size.json; เปลี่ยนเฉพาะโฟลเดอร์ส่งออก ไม่มี commit/push/merge/deploy |

## งานที่ยังค้างก่อนตั้ง ready

1. แก้ upper-tree mask ตัดกิ่งหิมะ/ผิวแข็งและตรวจบริเวณสีฟ้ากำกวมของ summit/east-cliff โดยไม่วาดเฟรมที่ใช้ได้แล้วซ้ำ
2. ทำ reference ขอบของเหลวที่แยกจาก geometry ก่อสร้างให้ครบทุก mask เพื่อรายงานเปอร์เซ็นต์จริงหรือขอบเขตบน ≤3% ห้ามเปลี่ยน lower bound ในรอบนี้เป็นผลผ่าน
3. สร้าง shore band จากแนวฝั่งจริงและตรวจระยะบนภาพพื้น ไม่ใช้ขอบของ texture/palette mask แทนฝั่ง
4. สำรวจ coverage น้ำตกทั้ง v7 และจำแนกลาวาราบ/ลาวาตกใหม่ในช่องลาดชัน จากนั้นตรวจการเล่นวนจริง เมื่อแก้ assets แล้วต้องเรนเดอร์ contact sheet/คลิป/รายงานใหม่ให้ตรงกับไฟล์ผลิต

`queue-check.json` จึงคง `incomplete` พร้อมหลักฐานและรายการค้าง ไม่มีการอ้าง QA ผ่าน
