# Z234-HD-FULL — โซน 3 west ชุด 2/5

ส่งครบ `r1-c5 r2-c1 r2-c2 r2-c3` สำหรับตรวจงานและประกอบภายหลัง **ยังไม่รับรองคุณภาพ** โดยเฉพาะ structure ≤ 4 px ที่หลักฐานปัจจุบันยังยืนยันไม่ได้ และปื้นไฮไลต์ผิดธรรมชาติใน `r2-c2/q22` ที่ยังค้าง

## งานที่ทำต่อใน run นี้

- คัดลอกจาก `20261113T134009Z-6bb73ea0` ตามคำสั่ง: native 15 ภาพ และผลประกอบ/registration/ผลวัดเดิมของ 3 chunk แรก ไม่วาดซ้ำ
- ใช้ **ImageGen ในตัว 1 ครั้ง** เพื่อวาด `r2-c3/q22` ขนาดจริง 1254×1254 แล้วแปลงเป็น WebP lossless โดยไม่เปลี่ยนพิกเซล รวมต่อเนื่องสอง run 16 ครั้ง/16 ส่วน ไม่มี batch หรือ Shado
- register และประกอบ `r2-c3` ครั้งเดียวด้วย SIFT/partial affine และ min-cost seam; วัด Laplacian และ landmark ครั้งเดียว ไม่เปลี่ยนภาพ/เกณฑ์/จุดวัดเพื่อไล่ตัวเลข
- เก็บ prompt จริงทั้ง 16 ส่วนใน `generation-prompts.json`; `generation-provenance.json` เชื่อมกลับ PNG ที่เครื่องมือสร้าง รวม SHA256 native และระบุว่า 15 ส่วนมาจากรอบก่อน
- ไม่แก้ไฟล์เกม `src/`, `tests/`, `img/` ไม่ commit/push/merge/deploy และไม่เปลี่ยน branch/worktree

## ต้นทางและวิธี

`src/zone-skin.js` ระบุ west โหลด `img/map-zone3/v1/`, 4915×3277, chunk 1024 และ `repairs:false` จึงไม่ทับ repairs ของโซน 1 ต้นทาง WebP 20 ชิ้นมี SHA256 ใน `source-manifest.json`

แบ่งแต่ละ chunk เป็น core 2×2 และ context ซ้อน 64 px ต่อข้าง ตัดที่ขอบแผนที่ `r1-c5` กว้าง 819 จึงแบ่ง 410/409 px ผล 2× คือ 1638×2048; chunk อื่น 2048×2048 ไม่เปลี่ยนสไตล์นรกน้ำแข็งตะวันตก prompt ให้คงขอบลาน บันได หน้าผา ตลิ่ง สะพาน น้ำ/น้ำตก/หมอกเป็นฐาน และลบเสา/ราวกับพืชที่อยู่บนพื้นเดิน

อ่านใบงานโซน 1 ที่ระบุแล้ว แต่ worktree ต้นแบบเก่าทั้งสองเส้นทางไม่มีอยู่ ใช้สคริปต์ต่อเนื่องจากรอบก่อนและเทียบวิธี seam กับ `docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py` ที่มีอยู่: DP ตาม squared colour cost และ feather 16 output px

`objects-inventory.json` แยก runtime props/สิ่งปลูกสร้างที่มี sprite ของตัวเองจากวัตถุฝังในภาพ เทียบ `src/town-layout.js`, `src/town-west-trees.js` และ owner walkmask ของ west การมี sprite หรือเท้าตรง walkmask ไม่ใช่หลักฐานว่ามีวัตถุนั้นฝังในพื้น จึงไม่อ้างว่าลบ runtime object ทุกตัวจากภาพแล้ว `removed.json` ของแต่ละ chunk บอกขอบเขตที่เห็นและข้อค้าง

## ผลวัดที่ส่งให้ Claude ตัดสิน

| chunk | Laplacian เทียบที่ 1× | Laplacian เทียบที่ 2× | landmark max (px 1×) | raw SIFT holdout max (px 1×) |
|---|---:|---:|---:|---:|
| r1-c5 | 10.729× | 89.099× | 20.616 | 648.137 |
| r2-c1 | 10.316× | 62.862× | 17.889 | 483.248 |
| r2-c2 | 10.971× | 63.356× | 13.342 | 472.879 |
| r2-c3 | 13.462× | 85.359× | 21.932 | 629.357 |

1× เปรียบเทียบ master กับภาพใหม่ย่อกลับ 1×; 2× เปรียบเทียบ master ขยาย Lanczos4 กับภาพใหม่ที่ raster 2× เดียวกัน ใช้ variance ของ grayscale Laplacian ksize=1 ไม่มี sharpen/เติม noise ค่าความคมเกิน 10× ทุก chunk ทั้งสองนิยาม ให้ Claude พิจารณานิยามร่วมกับภาพจริง

โครงสร้าง: fit affine บน training ครึ่งหนึ่งของ mutual SIFT แล้วเก็บ residual ของ holdout ทุกคู่โดยไม่คัดทิ้ง ค่าสูงมากอาจรวม descriptor จับคู่ผิดบนลายซ้ำ **ไม่ใช่ระยะเลื่อนขอบจริงที่ยืนยันแล้ว** landmark ใช้ตำแหน่งคงที่จากรอบก่อน, NCC template 41×41, search ±16 px; บันไดลายซ้ำและการเปลี่ยน texture อาจทำให้จับผิดขั้น ตัวอย่าง `r2-c3 central-stair` ได้ (16,15) px ที่ขอบ search แม้ NCC สูง จึงห้ามตีความเป็นหลักฐานผ่าน structure ≤4 px มีทุกจุด/ค่าดิบใน `landmarks.json`, `structure.json`, `sift-correspondences.json` และภาพประกอบให้ตรวจ ไม่วัดซ้ำหรือย้ายจุด

registration เก็บ affine native→context และ native→map, rect core/context ในพิกัดแผนที่ 1×, ขนาด native จริง, hash และเส้น min-cost seam ครบ พื้นที่ core บางส่วนที่ขอบแผนที่ของ `r1-c5`/`r2-c1` อยู่นอก native หลัง transform สูงสุดประมาณ 0.1223% ใช้ REFLECT_101 ตามสคริปต์เดิม ไม่คืนพื้น master มาปะ รายส่วนอยู่ใน registration

## ตรวจภาพและส่วนค้าง

ตรวจ native ใหม่ `r2-c3/q22` และ seam overview ทั้ง 4 chunk: พื้นลาน บันได น้ำตก ป่าและน้ำแข็งยังอยู่ เสา/ราวถูกลบจากบริเวณที่มองเห็น ไม่เห็นเส้นกริดตรงที่ภาพรวม แต่ยังไม่รับรองทุกแนวขอบหรือทุกพุ่มบนพื้นเดินที่ขนาดจริง JPEG เป็นภาพช่วยตรวจ ให้ใช้ lossless native/2× ตัดสินรายละเอียด

`r2-c2/known-issue.jpg` แสดงปื้นโปร่งวงรีบนหน้าผาใต้แนวน้ำแข็งจาก `q22` ที่รอบก่อนระบุ พบว่ายังมีอยู่ เก็บไว้ตามคำสั่งห้ามวาดซ้ำ ให้ Claude ตัดสิน/จัดงานซ่อมภายหลัง

ไม่มีส่วนค้างวาด แต่ค้างการตัดสิน structure, รอยต่อภายใน chunk และการลบวัตถุโดย Claude รวมถึงปื้นข้างต้น ขอบระหว่าง chunk ยังไม่ได้ join ให้ ASSEMBLE ใช้ native+registration ที่ส่งมาจัดการพร้อมกัน

## ไฟล์และงบ

แต่ละ chunk มี `q11..q22-native.webp` lossless, `<chunk>-2x.webp` lossless, `<chunk>-compare.jpg`, `registration.json`, `structure.json`, `removed.json` และหลักฐาน seam/landmark/walkmask เพิ่มเติม ระดับรากมี inventory, source manifest, prompts, provenance, measurements, run summary และ verification

ตัดสำเนา `source.webp`/`q*-input.webp` ที่สร้างซ้ำได้รวม 20 ภาพ (~13.4 MB) และ scope overview ออกจากชุดส่งเพื่อ ≤80 MB ลด JPEG compare เป็น quality 25 **ขนาดภาพและสเกล 2.8 px/world unit เดิม** ไม่ลดขนาด native/2× หรือบีบอัดแบบสูญเสียบนภาพส่งประกอบ

สคริปต์ `assemble.py` โหลด crop ที่ขาดจาก master ในหน่วยความจำได้ ไม่ต้องสร้างไฟล์ input ใหม่ หากต้องการไฟล์เหล่านี้จริง ให้รัน `prepare.py` แต่จะเพิ่มขนาดแพ็กเกินงบได้ ส่วน `summarize.py` รวบรวมผลวัดที่มีอยู่โดยไม่วัดซ้ำ

## คำสั่งตรวจและ self-check เกณฑ์รับงาน

รอบนี้รัน `assemble.py --chunks r2-c3`, `measure-landmarks.py --chunks r2-c3`, `summarize.py` และ `verify.py` ผลตรวจไฟล์อยู่ใน `verification.json` ตรวจเพียงไฟล์ครบ/เปิดได้/ขนาดตรง, lossless, hash และงบ ไม่ตัดสินคุณภาพภาพ ไม่มีการรันชุดทดสอบเกมเพราะไม่เปลี่ยน runtime

ผลตรวจจริง: `verify.py` exit 0, missing/errors ว่าง, เปิดภาพได้ 41 ไฟล์, master เดิม 20 ชิ้น hash ไม่เปลี่ยน, native ทั้ง 16 ตรงกับพิกเซล PNG ต้นกำเนิด และ native ที่คัดลอกมา 15 ภาพตรงกับรอบก่อนทุก byte ตรวจ syntax สคริปต์ 5 ไฟล์ได้ครบ และเรียก fallback crop จาก master ในหน่วยความจำเทียบ input/source เดิมได้ตรง 20/20 ภาพ ผล 2× ที่รับต่อมา 3 chunk ตรงกับรอบก่อนทุก byte ขนาดก่อนเขียน verification 79,522,158 bytes; รวมเอกสารสุดท้ายยังต่ำกว่า 80,000,000 bytes

1. **ครบทุกส่วน/ความคม/โครงสร้าง:** ครบ 16/16 native และ 4/4 ภาพ 2×; ความคมวัดได้ ≥10×; โครงสร้าง ≤4 px **ยังยืนยันไม่ได้** ค่า landmark max เกินเกณฑ์ทั้ง 4 chunk ต้องตรวจภาพจริง
2. **รอยต่อ/ลบวัตถุ/พื้นต่อเนื่อง:** ไม่เห็นกริดตรงใน overview และเห็นการลบเสา/ราว แต่รอการตัดสินละเอียดของ Claude รวมพุ่มบนพื้นเดิน มี known issue `r2-c2/q22` ที่ยังไม่แก้
3. **native+registration สำหรับ ASSEMBLE:** ครบ 16 native lossless และ 4 registration พร้อม context overlap/affine; รอประกอบขอบนอก chunk ตามขอบเขตงาน ไม่มีการติดตั้งภาพในเกม

ผลตรวจไฟล์ไม่ใช่ QA sign-off และ `run-summary.json` ระบุ `qualityApproved:false`
