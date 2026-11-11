# Z1 v7 native repairs รอบ 4 จุด

ส่งมอบ native และพิกัดของ `forest-r4-c1-q12`, `heaven-bridge`, `lava-north-stair`, `lava-mid-stairs` ตามลำดับงานล่าสุด ณ 12 พฤศจิกายน 2569 ชุดนี้ใช้เป็น input สำหรับงานประกอบและส่งต่อ Toby กับ Dale

นำ native จาก built-in ImageGen ในผลงานล่าสุด `20261111T174550Z-ddecd613` มาตรวจและลงทะเบียนต่อ ภาพต้นฉบับทั้ง 4 ชิ้นเก็บไบต์เดิม ตรวจ SHA256 และเทียบพิกเซลกับ PNG ที่ ImageGen สร้างจริงครบ 4 ชิ้น รอบนี้เรียก ImageGen เพิ่ม 0 ครั้ง Prompts ฉบับเต็มอยู่ใน `generation.json` และ `registration.json` ของแต่ละจุด

## ไฟล์ส่งมอบ

แต่ละโฟลเดอร์ชื่อจุดมีไฟล์ต่อไปนี้

- `native.webp` ภาพวาด native lossless ที่ขนาด ImageGen ส่งกลับ
- `registration.json` ขอบเขต core/context, affine สู่ context/master, ขนาด, hash, prompt และจุดเชื่อม
- `reference.png` ภาพ v5 ขนาด 1× พร้อม runtime repairs เดิมที่ฝังแล้ว
- `registered-2x.webp` ส่งออกจาก native ตรงไปพิกัด 2× ด้วย Lanczos4 และเข้ารหัส lossless
- `review.jpg` คู่เทียบ reference กับ registered ที่ map 2× และ `review-game-zoom.jpg` ที่ 2.8 device px/world unit
- `shape-metrics.json`, `landmark-walkmask.jpg` และ `sharpness.json` เก็บผลวัดจาก export ที่ decode กลับมา
- `overlap-review.jpg` และ `local-seam-preview.webp` แสดงการลองต่อเฉพาะ crop เข้ากับ native รอบนอก ใช้ feather ภายใน context 16 map px
- `fx-overlay.jpg`, `fx-overlap.json`, `fx-*-coverage.png` แสดงตำแหน่ง mask น้ำ เมฆ และลาวาจาก layout ที่เกมใช้อยู่
- `generation.json`, `registration-candidate.json` เก็บข้อมูลต้นทาง และ `source-*.jpg` เก็บคู่เทียบ fallback-check ที่รับช่วงมา

ไฟล์ระดับบนมี `inputs.json`, `provenance.json`, `landmarks.json`, `visual-review.json`, `verification.json`, `test-results.json`, `manifest.json`, `original-structure-open-points.json`, `verify.py` และ `queue-check.json`

## พิกัดและผลวัด

พิกัดทั้งหมดในตารางเป็น `[x,y,w,h]` บน master 1× ขนาด 4915×3277

| จุด | native px | core 1× | context 1× | จุด semantic | คลาดสูงสุดหลังตรวจคู่เทียบ |
|---|---|---|---|---|---|
| forest-r4-c1-q12 | 1935×812 | [512,3072,512,205] | [448,3008,640,269] | 14 | 1.414 px |
| heaven-bridge | 1579×996 | [3620,545,445,200] | [3572,497,541,296] | 19 | 1.414 px |
| lava-north-stair | 1356×1159 | [570,800,180,140] | [522,752,276,236] | 10 | 1.000 px |
| lava-mid-stairs | 1254×1254 | [620,1420,200,200] | [572,1372,296,296] | 11 | 1.414 px |

ตรวจจุด semantic 54 จุด และนำจุดเดิมทุกจุดจาก `structure.json` ที่อยู่ใน context มาตรวจซ้ำครบ 124 จุด ใช้ภาพ v5 พร้อม repairs เป็น reference เทียบ export ที่ decode แล้ว หน้าต่างหลัก 21×21, DoG sigma .8/3, NCC ค้นหา ±12 map px, confidence ≥ .6 พิกัดจุดและผลรายจุดอยู่ใน `shape-metrics.json` ค่า residual ของ SIFT เก็บเป็นข้อมูลประกอบการลงทะเบียน

เก็บผลผิดปกติไว้ครบ 2 จุด พร้อมการตรวจเพิ่มเติม

1. `lava-mid-stairs` จุดชื่อ `lower-left-rail-mid` ที่ [757,1630] อยู่บนลูกนอนซ้ำใกล้ราว ชื่อเดิมระบุตำแหน่งคลาดไป ผล 21×21 ได้ [11,-1], ระยะ 11.045 px, NCC ประมาณ .975 ส่วนตำแหน่ง [0,0] ได้ NCC ประมาณ .970 ภาพ `tread-alias-review.jpg` แสดงแนวลูกนอนและราวในกรอบเดียวกัน หน้าต่าง 49×49 ที่ครอบราวได้ [0,0], NCC .960 เก็บผลทั้งสองขนาดและใช้ผลรูปทรงที่ครอบราวประกอบการตัดสิน
2. `lava-north-stair` จุดเดิม `walkmask-8-67` ที่ [666,978] ได้ [8,10], NCC .467 ในกรอบ 21×21 บริเวณผิวพื้นและเสาติดขอบ crop ภาพ `inherited-probe-review.jpg` แสดง v5, v7 เดิม และ local preview หน้าต่าง 49×49 ที่เห็นมุมพื้นกับหัวเสาได้ [0,0], NCC .635 ผล raw ยังอยู่ในรายงาน

แนวลูกตั้งภายในบันไดตรวจด้วย profile แยกจาก landmark พบจำนวน 7 จุดที่บันไดเหนือ, 6 จุดที่ช่วงบนลาวากลาง และ 5 จุดที่ช่วงล่างลาวากลางตรงกันก่อน/หลัง คลาดสูงสุด 0.502 map px ช่วงที่วัดระบุไว้ใน JSON และครอบคลุมลูกตั้งภายในตามพิกัดนั้น

รูปทรงตรวจเสริมด้วยคู่ภาพที่ map 2× และ 2.8 device px/world unit รายละเอียดใบไม้ หิน และพื้นยังแยกชัดในทั้งสี่ส่วน `sharpness.json` แสดงค่า Laplacian แยกสี่ quadrant เพื่อช่วยตรวจความสม่ำเสมอ ค่าดังกล่าวขึ้นกับ texture และ contrast

## การลงทะเบียนและขอบ overlap

ใช้ affine จาก candidate ที่รับช่วงมา เก็บ matrix เดิมพร้อม SHA256 ของ candidate และตรวจ core ว่าครอบคลุมด้วยพิกเซล native จริงทุกจุด แปลงสู่ master ด้วยการบวก origin ของ context ที่คอลัมน์ translation และคูณทั้งสองแถวด้วย 2 เมื่อส่งออก map 2× ภาพต้นฉบับของสะพานสูงเกิน context จึงใช้เฉพาะส่วนที่ affine ลงใน context ได้

native ต้นฉบับคงขนาดและพิกเซลตาม ImageGen ไฟล์ registered ถูกสร้างโดย warp ตรงจาก native ส่วน `review-game-zoom.jpg` สร้างตรงจาก native เช่นกัน ใช้ border reflect101 เฉพาะขอบ context และตรวจ core ให้อยู่ภายในภาพต้นทาง

`local-seam-preview.webp` เป็นภาพลองต่อรายจุด ใช้ native จากแพ็กเดิมเป็นรอบนอกและ feather เฉพาะใน context ตรวจพิกเซลนอก context ตรงกับภาพเดิมทุกพิกเซลในทั้ง 4 ภาพ การลองต่อนี้แสดงความต่างของเนื้อใบไม้ในป่าและเนื้อหิน/พุ่มไม้ที่ overlap ของบันได โดยเฉพาะขอบบนของป่าและขอบล่างของลาวากลาง แนวต่อ min-cost ตามสคริปต์ประกอบเดิมยังเป็นขั้นตอนของรอบประกอบถัดไป `visual-review.json` บันทึก `finalSeamAccepted=false` ไว้ทุกจุด

## น้ำ เมฆ และ walkmask

อ่าน `img/map-zone1/v5-fx/fx-layout.json` จากค่า `fluidFx` ของโซน 1 เก็บ hash ของ layout และ mask ที่เกี่ยวข้อง สีฟ้าแสดง coverage น้ำ/น้ำตก/foam สีชมพูแสดงเมฆ สีทองแสดงลาวา กรอบขาวเป็น core ภาพ overlay ใช้ alpha ของ mask จริง ณ พิกัด master

- สะพานทับ coverage `ice-upper`, น้ำตกด้านขวา และ `foam-ice-edge` ตรวจจำนวนพิกเซลซ้อนราย piece ใน `fx-overlap.json` บริเวณ foam เดิมมี coverage แตะหินด้านล่าง crop ให้ Toby ตรวจในเกมเมื่อเปิด FX
- กรอบ cloud-sea และพื้นที่ drift ของ cloud puff คร่อม context สะพาน แต่ alpha ในบริเวณซ้อนเป็นศูนย์
- กรอบ lava-upper แตะ context บันไดเหนือ แต่ alpha ในบริเวณซ้อนเป็นศูนย์ ป่าและลาวากลางมี coverage ซ้อนเป็นศูนย์เช่นกัน
- เส้นฟ้าใน `landmark-walkmask.jpg` มาจาก RLE เดิม เซลล์ประมาณ 10.24 map px ใช้ดูบริบทแนวเดินร่วมกับภาพ

## จุดเชื่อมสำหรับรอบถัดไป

ให้ตัวประกอบอ่าน `nativeFile`, `nativeToMasterPx1x`, `corePx1x`, `contextPx1x` ของแต่ละ `registration.json` และใช้บริเวณ overlap เลือกแนวต่อเข้ากับ native ของแพ็กเดิม รักษาพิกเซลภายนอก context ตามเดิม

ค่าของแพ็กปลายทางตามใบงานคือ `fullPx={w:9830,h:6554}`, `chunk=2048`, world 3840×2560, `repairs=false` ฐานอ้างอิงมี repairs เดิมฝังแล้ว อัตรา master 1× สู่ world คือ x×3840/4915 และ y×2560/3277 เก็บ SHA256 ของ walkmask และ repair definitions ใน metadata

Toby รับชุด crop นี้ไปประกอบและทดสอบใน worktree ของเขา จากนั้น Dale รีวิวการประกอบและการรวมเข้าเกม รอบนี้ส่งออกเฉพาะสี่ crop ตามงานต่อท้าย แพ็กเต็ม 20 ชิ้นยังเป็นแพ็กต้นทางที่อ่านและตรวจ hash เท่านั้น

## เกณฑ์ตรวจตนเองรอบนี้

| เกณฑ์ | หลักฐานและผล |
|---|---|
| ครบ 4 จุด พร้อม native/registration/review แยกโฟลเดอร์ | ครบทุกจุด ขนาดและ SHA256 อยู่ใน manifest |
| ใช้ native จาก built-in ImageGen ตาม reference | ตรวจ original PNG hash และพิกเซลตรง native ครบ 4 ชิ้น Prompts ครบ |
| core/context, affine, hash และผลวัดรูปทรง | เก็บครบ 54 semantic และ 124 จุดเดิม พร้อมผล raw และคู่เทียบ 2 จุดกำกวม |
| คงป่า เสา ราว บันได และแนวเดิน | คู่ภาพ 2×/ซูมเกม, landmark และ profile ลูกตั้งครอบคลุมส่วนที่ระบุ |
| หลักฐานรอยต่อ ความคม และ FX overlay | มีภาพลองต่อรายจุด ผลแยก quadrant และ mask overlay พิกัดจริง รอยต่อรวมรอตรวจตอนประกอบ |
| ขอบเขตการเขียน | ส่งออกในโฟลเดอร์นี้ตาม diff ของรอบงาน |
| แพ็กเต็มและ 7 จุดเดิมที่เกิน 4 px | เก็บจุดเดิมครบใน original-structure-open-points.json ทั้ง 7 จุดอยู่นอก context ของสี่ crop รอบนี้ |

`queue-check.json` ระบุสถานะของการส่งมอบ crop ทั้งสี่ จุดค้างของแผนที่รวมได้แก่การประกอบ 20 ชิ้น การเลือกแนวต่อ ตรวจ 7 จุดเดิม และทดสอบในเกมตามลำดับงานถัดไป

## คำสั่งตรวจซ้ำ

ใช้ Python 3, Pillow, numpy, scipy และ OpenCV รันจาก repo root

```sh
python3 -B docs/art-reviews/2026-11-11-z1-v7-native-repairs/verify.py --self-test
python3 -B docs/art-reviews/2026-11-11-z1-v7-native-repairs/verify.py --acceptance
python3 -B docs/art-reviews/2026-11-11-z1-v7-native-repairs/verify.py --check-manifest
```

`--self-test` ตรวจ oracle 3 กรณี ได้แก่ทิศทาง displacement, การตรวจพบระยะเกิน 4 px และการเก็บจุดที่ context ขาด `--acceptance` ตรวจต้นทางและสร้างหลักฐานซ้ำ ต้องเข้าถึง source assembly และ PNG ImageGen ตาม provenance `--check-manifest` ตรวจ hash, จำนวนไฟล์ และ decode ภาพจากแพ็กที่ส่งมอบ ใช้ได้โดยมีโฟลเดอร์ส่งมอบครบ ไฟล์ manifest และ queue-check ถูกยกเว้นจากรายการ hash เพื่อให้เขียนผลตรวจได้โดยไม่มีการอ้างวนกลับ
