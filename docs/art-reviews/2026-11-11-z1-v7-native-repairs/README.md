# โซน 1 — native repairs v7 รอบบันไดสามจุด

ชุดส่งออกสำหรับ lava-low-stair, south-plaza-stair และ pier-stair ตามลำดับงานล่าสุด สถานะใน `queue-check.json` ใช้กับ native และการลงทะเบียนพิกัดสามจุดของรอบนี้

ใช้ native จาก ImageGen ในตัวที่วาดไว้ในผลงานเดิมของรอบ `20261111T174550Z-17a006a5` จำนวน 3 ภาพ เก็บ WebP เดิมทุก byte และตรวจพิกเซลเทียบ PNG ต้นทางครบทั้งสามภาพ รอบนี้เรียกวาดเพิ่ม 0 ครั้งตามข้อกำหนดให้เก็บชิ้นที่ใช้ได้ การตรวจรูปทรง ลงทะเบียนซ้ำ และเอกสารส่งมอบทำใน worktree ปัจจุบัน

## ไฟล์ส่งมอบ

แต่ละโฟลเดอร์ชื่อจุดมีไฟล์หลักดังนี้

- `native.webp` ภาพวาด native แบบ lossless พร้อม context
- `registration.json` พิกัด core/context, affine จาก native ไป context/master/fullPx, ขนาด, SHA256 และทางเชื่อมหลักฐานรูปทรง
- `review.jpg` ภาพ reference พร้อม repairs | v7 ก่อนซ่อม | native ที่ลงทะเบียนแล้ว ที่ 2 output px ต่อ map px
- `generation.json` prompt เต็ม เครื่องมือ เส้นทางและ hash PNG ต้นทาง พร้อมผลเทียบพิกเซล
- `reference-1x.png`, `assembled-before.webp`, `input.json` และคู่เทียบ `fallback-*-comparison.jpg` จากชุดประกอบเดิม
- `structure.json` ผล NCC ของจุดเดิมทุกจุดใน context
- `geometry.json`, `geometry-resolutions.json`, `geometry-review.jpg`, `geometry-resolved-review.jpg` ผลวัดรูปทรงและภาพระบุตำแหน่ง รวมการวัดที่จับขอบผิดครั้งแรก
- `registered-2x.webp`, `alignment-overlay.jpg`, `valid-coverage.png` ภาพตรวจตำแหน่งและพื้นที่ที่ native ครอบคลุม
- `fx-overlay.jpg`, `fx-coverage.png`, `fx-overlap.json` หลักฐานทับซ้อนกับน้ำ/เมฆ

ที่รากมี `manifest.json` สำหรับขนาดและ SHA256 ของไฟล์ส่งออก, `provenance.json` สำหรับแหล่งอ้างอิงและ hash, `verification.json` สำหรับผลตรวจซ้ำ, `visual-review.json` สำหรับการตรวจภาพ และสคริปต์ตรวจซ้ำใน `scripts/`

## พิกัดและขนาด

พิกัดตารางเป็น `[x0,y0,x1,y1]` แบบ half-open หน่วย master map 1× ขนาด 4915×3277

| จุด | native จริง | core | context |
| --- | --- | --- | --- |
| lava-low-stair | 1367×1150 | [700,1960,825,2050] | [652,1912,873,2098] |
| south-plaza-stair | 1375×1144 | [2420,2910,2620,3060] | [2372,2862,2668,3108] |
| pier-stair | 1444×1089 | [2770,2120,2960,2240] | [2722,2072,3008,2288] |

ทุก context มี overlap 48 map px รอบ core ลงทะเบียนจาก SIFT บนวงแหวนอ้างอิงด้วย affine RANSAC แล้ว warp native ตรงไปภาพตรวจ 2× พิกเซล native มีความละเอียดมากกว่าภาพตรวจ 2× ทั้งสามจุด ตรวจพิกเซล PNG ต้นทางตรงกับ WebP ที่ส่งออก ภาพขยาย reference ใช้สำหรับการจับคู่และดูตำแหน่ง

`nativeToContextPx1x` ใช้กับ origin ของแต่ละ crop ส่วน `nativeToMasterPx1x` รวม origin แล้ว `nativeToFullPx2x` เป็น matrix master คูณ 2 ขนาดเป้าหมายสำหรับขั้นประกอบคือ fullPx 9830×6554 และ chunk 2048 ค่า worldSize อ้างอิงเดิมเป็น 3840×2560

## ผลตรวจรูปทรงจากไฟล์ export

ตรวจจาก WebP ที่ decode กลับมาแล้ว โดยเลือก cross-section บนขอบชานหน้า บันไดทั้ง 5 ขั้น ร่องด้านข้าง เสา/ราว และขอบน้ำท่าเรือ เกณฑ์ 4 px ใช้หน่วย map 1× เช่นเดียวกับ `structure.json` ของชุดประกอบเดิม ตำแหน่งวัดละเอียด 0.5 map px

| จุด | จำนวนตัวอย่างรูปทรง | คลาดสูงสุด map px | core ที่ native ครอบคลุม 2× | NCC เดิม จับคู่ได้ / ชิดขอบ |
| --- | --- | --- | --- | --- |
| lava-low-stair | 38 | 1.0 | 45,000 / 45,000 | 1 / 1 |
| south-plaza-stair | 41 | 2.0 | 120,000 / 120,000 | 10 / 6 |
| pier-stair | 50 | 3.5 | 91,200 / 91,200 | 12 / 4 |

ผลวัดรูปทรงหลังตรวจคู่เทียบอยู่ในเกณฑ์ครบ 129 ตัวอย่าง การวัดดิบยังเก็บผลเกิน 4 px จำนวน 2 จุดและผลกำกวม 4 จุดไว้ทั้งหมด รายละเอียดการวินิจฉัยและพิกัดวัดซ้ำของทั้ง 6 จุดอยู่ใน `geometry-resolutions.json`

- south-plaza-stair มี 3 ตัวอย่างที่ตัวจับ gradient เลือกแถบทองข้างร่องบันได จึงวัดร่องโครงสร้างด้วย minimum luminance ที่ตำแหน่งเดียวกันในภาพทั้งคู่ อีก 1 ตัวอย่างจับไฮไลต์ภายในหัวเสาแทนเส้นบนของเสา เก็บภาพขยายใน `ambiguous-edge-pair.png` และวัดขอบเข้าผิวหัวเสาซ้ำได้ตำแหน่ง 92.0 ทั้งคู่
- pier-stair มี 1 ตัวอย่างจับคอเสาแทนร่องติดบันได จึงวัดร่องซ้ำได้ 76.5 เทียบ 76.0 อีก 1 ตัวอย่างจับระลอกน้ำใต้ขอบฝั่ง จึงวัด first crossing ของ blue-minus-green ที่ 40 ได้ขอบน้ำ 162.0 เทียบ 162.5 เก็บภาพคู่เทียบขยายไว้

การตรวจ NCC เดิมเก็บครบ 34 จุดใน context จับคู่ได้ 23 จุด คลาดสูงสุดประมาณ 1.4142 map px อีก 11 จุดมีหน้าต่าง 49×49 พร้อมช่วงค้นหา ±12 ล้น context ทุกจุดดังกล่าวอยู่นอก core และยังอยู่ใน `structure.json` การวัดรูปทรงเฉพาะขอบอาคารแยกหลักฐานอยู่ในไฟล์ geometry

ตรวจภาพ native เต็มขนาด ภาพคู่ที่ 2× และภาพระบุขอบที่ 4× แล้ว รูปแบบหินสีอุ่น ราวทอง หินดำ พุ่มส้ม และน้ำม่วงอิงภาพอ้างอิงเดิม รายละเอียดผิวหินและใบไม้เป็นงานวาดเพิ่ม ผลวัดเป็นตัวอย่างตามขอบที่ระบุ ส่วนรอยต่อหลังประกอบและการเดินในเกมอยู่ในขั้นรวมแพ็กและทดสอบของ Toby

จุดเกิน 4 px เดิมทั้ง 7 จุดของแผนที่ยังเก็บใน `verification.json` ช่อง `upstreamOver4px` พร้อมพิกัดและผลเดิม ทั้ง 7 จุดอยู่นอก context สามจุดรอบนี้ งานประกอบทั้งแผนที่และตรวจจุดเหล่านี้อยู่ในลำดับถัดไปของใบงานหลัก

## Overlay น้ำและเมฆ

`fx-overlay.jpg` ใช้สีฟ้าแสดง union ของ coverage mask ที่เปิดใช้งาน และสีชมพูแสดง core อ้างตำแหน่งจาก `img/map-zone1/v5-fx/fx-layout.json` พร้อม hash ของ layout, masks และ `src/town-fluid-fx.js`

- lava-low-stair และ south-plaza-stair มี coverage ที่ทับพื้นที่แก้เป็น 0 px
- pier-stair มี river coverage ทับ core 24 output px และ foam coverage 1,544 output px พื้นที่ union ใน context 25,896 output px และใน core 1,544 output px
- ตรวจกรอบเมฆที่เปิดใช้งานทั้ง 5 รายการแล้ว จำนวนที่ตัดกับ context ของแต่ละจุดเป็น 0

overlay เป็นหลักฐานตำแหน่ง coverage สำหรับตรวจตอนรวมเกม ส่วน spot animation ใช้พื้นที่ย่อยของ mask ตาม runtime เดิม

## จุดเชื่อมสำหรับขั้นประกอบและ Toby

ใช้ `native.webp` กับ affine ใน `registration.json` เป็นแหล่งวาดของสามบริเวณ อ้าง core/context เดิมในการเลือกแถบรอยต่อ ภาพ `registered-2x.webp` เป็นตัวตรวจตำแหน่งและรูปทรง ขอบบันไดและเสาบางส่วนอยู่ใน context จึงต้องดูทั้ง crop ขณะเลือกเส้นตัดต่อ ใช้ `valid-coverage.png` ตรวจขอบที่ affine ครอบคลุมก่อนนำเข้ารอยต่อ

รักษา native ชุดประกอบเดิมนอกพื้นที่ซ่อมโดยวางการตัดต่อภายใน overlap ของจุดเหล่านี้ ใช้ map scale เดิมและ walkmask จาก provenance เดิม hash ของ baseline 25 รายการรวม runtime repairs และ walkmask ตรวจตรงกับต้นทางครบ

ชุดนี้พร้อมส่งต่อเป็น native repair input สามจุด สำหรับการประกอบแพ็ก v7 และเชื่อมใน worktree ของ Toby จากนั้น Dale รีวิวภาพและผลทดสอบก่อนขั้น merge ตามใบงาน

## คำสั่งตรวจซ้ำ

ใช้ Python 3, Pillow, numpy และ OpenCV ตามเวอร์ชันที่บันทึกใน `provenance.json` รันจาก repo root

```sh
python3 -B docs/art-reviews/2026-11-11-z1-v7-native-repairs/scripts/register.py
python3 -B docs/art-reviews/2026-11-11-z1-v7-native-repairs/scripts/measure-geometry.py
python3 -B docs/art-reviews/2026-11-11-z1-v7-native-repairs/scripts/verify.py --check-manifest
```

`verify.py` สร้าง baseline พร้อม runtime repairs ตามสคริปต์เดิมเพื่อเทียบ reference ทุกพิกเซล ตรวจ hash ต้นทาง, native PNG/WebP identity, affine, ผล warp จากไฟล์ export, coverage, จุด NCC เดิมครบทุกจุด, ผลวัด geometry และ FX masks ภาพส่งออกทุกภาพถูก decode ซ้ำ มี oracle 3 วิธีที่ขยับขอบรู้คำตอบ 5 map px แล้ววัดได้ 5 px ครบ เพื่อทดสอบว่าตัววัดตรวจความคลาดเกินเกณฑ์ได้

หากมีการสร้างหลักฐานใหม่ ใช้ `verify.py --write-manifest` หลังตรวจเอกสารและผลวัด แล้วใช้ `verify.py --check-manifest` เพื่อตรวจแพ็กสุดท้าย การตรวจรอบนี้เป็นหลักฐาน offline สำหรับ asset ตามขอบเขตสามจุด
