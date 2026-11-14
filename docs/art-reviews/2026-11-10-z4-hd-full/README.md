# Z234-HD-FULL · โซน 4 cyberhell · ชุด 2/5

ส่ง candidate ครบ 4 chunk: `r1-c5 r2-c1 r2-c2 r2-c3` ใช้ **ImageGen ในตัว 16 ครั้ง** (หนึ่งครั้งต่อส่วน ไม่มีรอบสร้างซ้ำ) มี native lossless WebP 16 ภาพและภาพประกอบ 2× lossless WebP 4 ภาพ งานนี้ยังไม่รับรองคุณภาพ: **r1-c5 ต้องแก้** และทุก chunk รอ Claude ตัดสินก่อน ASSEMBLE ไม่ได้ติดตั้งเข้าเกม

ต้นฉบับเป็น `img/map-zone4/v3/r*-c*.webp` ขนาดแผนที่ 4915×3277 ตรวจ `src/zone-skin.js` กับ `src/cyberhell-terrain.js` แล้วเกมใช้ v3 จริง; `repairs:false`, `patches:false` จึงไม่มี repair ของโซน 1 มาทับ โทนภาพคงเป็น basalt/โลหะทอง คริสตัลม่วง น้ำฟ้า และลาวาส้ม เก็บของเหลว น้ำตก เมฆและหมอกเป็นฐานภาพเดิม ไม่แก้ source, walkmask, collider หรือ loader

แบ่ง core 2×2; chunk ปกติส่วนละ 512×512, c5 ใช้ 410/409×512 เพิ่ม context ด้านละ 64 px ตัดเฉพาะขอบนอกแผนที่ จึงมีบริเวณร่วมระหว่าง core ข้างกัน 128 px และมีขอบเผื่อไป chunk เพื่อนบ้านไว้ให้ ASSEMBLE ภาพส่งออก c5 = 1638×2048; อีกสาม chunk = 2048×2048 `parts.json` เก็บพิกัดและ SHA ของ crop เตรียมต้นฉบับได้ด้วย `python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/process.py prepare`

ใช้ SIFT + RANSAC affine ต่อ native ลงพิกัด context 1× แล้ว warp ที่ 2× ด้วย Lanczos4 ต่อภายใน chunk ด้วย min-cost seam ในแถบ 112 px สองข้างของเส้น core และ feather ±8 output px ไม่มีการ sharpen, ย้าย collision หรือใช้ภาพเก่าเติมให้ตัวเลขผ่าน เก็บพิกัด seam และค่าความต่างไว้ใน `seams.json` พื้นที่นอก native หลัง affine ใช้ border reflect ของภาพที่วาดใหม่ และรายงาน coverage ตามจริง

ต้นแบบสอง worktree ในใบงานไม่มีอยู่ที่ path อ้างถึงใน run นี้ อ่านใบงานโซน 1 ได้ แต่ไม่ได้ตรวจสคริปต์จาก path ที่หายไปโดยตรง ตัวต่อ seam จึงอิง solver ที่ยังอยู่ใน repo: `docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py` และทำ SIFT/affine ใหม่ใน `scripts/process.py` ข้อมูลนี้เป็นข้อจำกัดของการเทียบวิธีต้นแบบ ไม่อ้างว่าใช้สคริปต์ต้นแบบเดิมทุกบรรทัด

ค่าต่อไปนี้วัดจาก candidate หลังบันทึก lossless แล้วหนึ่งรอบ ไม่รันซ้ำเพื่อไล่ให้ผ่านเกณฑ์:

| chunk | sharpness เทียบ master | landmark สูงสุด 1× px | SIFT inlier สูงสุด 1× px | native coverage | สถานะ |
|---|---:|---:|---:|---:|---|
| r1-c5 | ×200.91 | 5.10 | 2.91 | 100.00000% | ต้องแก้ |
| r2-c1 | ×246.46 | 2.00 | 3.31 | 99.99304% | รอ Claude ตรวจภาพ |
| r2-c2 | ×337.33 | 3.00 | 3.15 | 100.00000% | รอ Claude ตรวจภาพ |
| r2-c3 | ×309.32 | 1.41 | 2.94 | 100.00000% | รอ Claude ตรวจภาพ |

Sharpness = variance ของ Laplacian grayscale โดยทั้ง master และ candidate เทียบที่ขนาดส่งออก 2× (master ขยายด้วย Lanczos) ค่า master ต่ำมากเพราะภาพตั้งต้นผ่านการขยายมาแล้ว จึงได้ ratio สูง; **ratio ไม่พิสูจน์รูปทรงหรือคุณภาพศิลป์** Landmark คือ local template search ของภาพ blur σ=2, patch 45×45, ช่วงค้น ±24 px บนจุดลาน/บันได/สะพาน/ตลิ่งที่ระบุใน `structure.json` ทั้งหมด 18 จุด correlation 0.79–0.98 ไม่ใช่หลักฐานว่าทุกขอบทั้งแผนที่ตรง ≤4 px ส่วน SIFT residual ใช้เฉพาะ inlier ที่ fit จึงต้องแยกจากโครงสร้างจริง

Nearest-edge P95 ตามลำดับ chunk = 4.00 / 4.12 / 3.61 / 4.12 px; max = 16.64 / 20.10 / 18.68 / 16.76 px ค่านี้วัดขอบกว้างหลัง blur ไม่แยก semantic geometry ออกจากรายละเอียดที่วาดใหม่ เป็น diagnostic ให้ผู้ตรวจพิจารณา ไม่ใช้ตัดสินผ่านอัตโนมัติ

ผลดูภาพ: `r1-c5` เห็นรอยต่างสี/ลวดลายท้องฟ้าบริเวณกลางบนระหว่าง q11/q12 และ `stair-top` ที่ [4537,782] เลื่อน [-1,-5] px ระยะ 5.10 px เกิน 4 px ต้อง review/re-register q21 ภาพ native q11/q21 มีฉากต่อเกินด้านล่าง เก็บเต็มตามที่เครื่องมือคืน และ affine เลือกเฉพาะกรอบ context เดิมสำหรับประกอบ อีกสาม chunk ไม่เห็นเส้นแบ่งสี่เหลี่ยมเด่นในภาพที่ตรวจ แต่ยังส่งให้ Claude ตัดสินที่ซูมเกมและดู texture/รายละเอียดบริเวณรอยต่อ `r2-c1` มี 292 output px ที่อยู่นอก native affine valid domain (coverage 99.99304%) ใช้ border-reflected generated samples ต้องตรวจขอบนี้ก่อนประกอบรวม ดู `seam-details.jpg` (crop ที่ 2× 1:1), `<chunk>/seam-check.jpg` และ `<chunk>-compare.jpg` (master ซ้าย, candidate ขวา ที่ 2.8 px/world unit)

inventory สร้างจากภาพ v3 เทียบ owner walkmask และ `src/town-cyberhell-layout.js` (`strictFloor:true`, `houses:[]`, `props:[]`) ไม่ยก ID จากโซน 1 ลบเสา/กลุ่มคริสตัล/หินที่ฝังอยู่บนพื้นเดินของ r2-c3 สี่จุด: `z4-floor-post-01`, `z4-floor-crystal-02`, `z4-floor-rubble-03`, `z4-floor-crystal-04` ตรวจ native q21/q22 และภาพประกอบแล้วเป็นพื้นต่อเนื่อง เส้นทองยังต่ออยู่ ดู `objects-inventory.json`, `objects-walkmask.jpg`, `removed-compare.jpg` และ `removed.json` ของแต่ละ chunk เสาริมหน้าผา คริสตัลนอกพื้นเดิน และ floor holes ที่กันให้สิ่งปลูกสร้างคงไว้

ไฟล์สำหรับ ASSEMBLE: ทุกโฟลเดอร์มี `q11..q22-native.webp`, `registration.json`, `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `structure.json`, `removed.json`, `seams.json`, `seam-check.jpg` Rect ใช้ `[x0,y0,x1,y1]` ใน master 1×; `nativeToContextPx1x` คือ affine จาก native px ไป context-local 1× ของส่วนนั้น บวก origin ของ context เพื่อเป็นพิกัดแผนที่ ขนาด native จริงและ SHA อยู่ใน registration กับ `generation-prompts.json` (q11/q21 ของ c5 และ q11/q21 ของ r2-c1 ไม่ใช่ 1254 square; ไม่ resize native เพื่อปิดบังขนาด)

ตรวจไฟล์ด้วย `python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/process.py check` ตรวจเฉพาะไฟล์ครบ เปิดได้ ขนาด encoding lossless จำนวนส่วน/คำสั่งวาด SHA ต้นฉบับ และงบ ≤80,000,000 bytes ผลอยู่ใน `file-check.json` ไม่มี assertion ด้าน sharpness/structure/seam ทุกรายการข้างต้นเป็นผลวัดและข้อสังเกตให้ Claude ตัดสิน ไม่ได้ทดสอบ runtime เพราะงานเปลี่ยนเฉพาะ review assets `scripts/process.py assemble` ใช้สร้าง candidate/ผลวัดใหม่จาก native ได้ แต่จะเขียน summary แบบทั่วไปทับ จึงไม่ควรรันซ้ำเพียงเพื่อไล่ตัวเลข

Self-check เกณฑ์รับงาน: (1) ครบ 16 ส่วนและ sharpness เกิน ×10 แต่ r1-c5 landmark เกิน 4 px จึงยังไม่ครบเกณฑ์; อีกสาม chunk ได้ local landmark ≤4 px แต่ยังต้องตรวจทั้งรูปทรง (2) ลบวัตถุ 4 จุดแล้ว; r1-c5 ยังเห็นรอยท้องฟ้า จึงยังไม่ครบเกณฑ์ไม่มีรอยต่อ (3) native+registration และขอบ context ครบทั้ง 4 chunk พร้อมให้ ASSEMBLE ตรวจต่อ แต่ r1-c5 ต้องแก้ก่อนใช้จริง ขอบระหว่าง chunk ยังไม่ต่อโดยเจตนาตามใบงาน ไม่มีส่วน generation ค้าง; งานแก้และตัดสินคุณภาพอยู่ใน `run-summary.json` ไม่ใช้ ImageGen เกิน 16 ครั้ง
