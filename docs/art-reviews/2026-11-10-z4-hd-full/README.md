# Z234-HD-FULL โซน 4 cyberhell ชุด 3/5

ส่งภาพตรวจรับสำหรับ `r2-c4`, `r2-c5`, `r3-c1`, `r3-c2` โดยใช้ **ImageGen ในตัว 16 ครั้ง** ครั้งละหนึ่งส่วน รวม native 16 ภาพ และภาพประกอบ 2× จำนวน 4 ภาพ เป็น WebP lossless ทั้งหมด สถานะคุณภาพ **รอ Claude ตัดสิน**

ภาพรวมอยู่ใน [hd-contact.jpg](hd-contact.jpg) เทียบกับ [source-contact.jpg](source-contact.jpg) และ [walkmask-contact.jpg](walkmask-contact.jpg)

## ผลวัดหนึ่งรอบ

| chunk | ขนาดภาพ 2× | sharpness ที่ sampling 1× เท่ากัน | sharpness ที่ sampling 2× เท่ากัน | structure proxy สูงสุด px 1× | พื้นที่ master รองรับขอบ affine |
|---|---|---:|---:|---:|---:|
| r2-c4 | 2048×2048 | ×34.69 | ×216.44 | 1.00 | 0% |
| r2-c5 | 1638×2048 | ×30.60 | ×255.03 | 1.00 | 0.04457% |
| r3-c1 | 2048×2048 | ×34.24 | ×191.47 | 1.00 | 0% |
| r3-c2 | 2048×2048 | ×35.27 | ×192.58 | 1.00 | 0% |

Sharpness ใช้ variance ของ grayscale Laplacian ทั้ง chunk คอลัมน์ 1× เทียบ master v3 กับภาพส่งมอบย่อด้วย Lanczos ลง 1× คอลัมน์ 2× เทียบ master ขยายด้วย Lanczos กับภาพส่งมอบ 2× เก็บค่าดิบทั้งสี่ใน `run-summary.json` สคริปต์ใช้รายละเอียดที่ ImageGen วาดมาโดยตรง ค่าเปรียบเทียบกับโซน 1 ต้องพิจารณาสูตรและ sampling ของโซน 1 ด้วย

Structure proxy วัด patch 33×33 px หลัง low-pass σ=2 ค้น ±20 px ที่จุดลาน บันได สะพาน ตลิ่ง และน้ำตก จำนวน 6 จุดต่อ chunk รวม 24 จุด พบ displacement 0–1 px และ correlation 0.804–0.993 เก็บชื่อจุด พิกัด และค่ารายจุดใน `structure.json` ค่าสูงสุดเชิงโครงสร้างที่รับรองยังเป็น `null` เพราะจุดตัวอย่างครอบคลุมเพียงบางตำแหน่ง ขอบโครงสร้างทั้งหมดและรอยต่อเหลือให้ Claude ตรวจจากภาพ

## ภาพและวิธีประกอบ

- ใช้ master `img/map-zone4/v3/r*-c*.webp` ขนาดรวม 4915×3277 ตาม `src/zone-skin.js` และ `src/cyberhell-terrain.js` ทั้งสองใช้ v3 และ `repairs=false`
- แต่ละ chunk แบ่ง 2×2 core 512×512 ส่วน c5 ใช้ core กว้าง 410 และ 409 px ขยาย context 64 px ทุกด้านที่ยังอยู่ในแผนที่ รวมข้ามขอบ chunk เพื่อนบ้าน เก็บ rect แบบ full-map 1× `[x0,y0,x1,y1]` ใน `inputs.json` และ `registration.json`
- Native คืนจริง 1254×1254 จำนวน 10 ภาพ, 1189×1323 จำนวน 2 ภาพ, 1149×1368 จำนวน 2 ภาพ และ 1078×1460 จำนวน 2 ภาพ แปลงเป็น WebP lossless แล้วตรวจ RGB เท่าต้นทางก่อน/หลังทุกภาพ ขนาด native คงตามที่เครื่องมือคืน รายละเอียดอยู่ใน `generation-log.json`
- ทุกครั้งใช้ prompt เดียวกันจาก `generation-prompts.json` พร้อมภาพอ้างอิงของส่วนนั้น เน้นหินแยกก้อน รอยแตกละเอียด ร่องปูน ผิวโลหะ และเหลี่ยมคริสตัล ภาพยังคงสไตล์ไซเบอร์นรก โทนฟ้า/ม่วง พร้อมฐานน้ำ น้ำตก ลาวา และหมอก
- SIFT + full affine RANSAC register ได้ครบ 16 ส่วน เก็บ native→context 1× และ native→chunk 2× แบบ pixel-centre พร้อม hash, matches และ inliers ให้ ASSEMBLE ใช้ต่อ
- ประกอบภายใน chunk ด้วย min-cost seam สามแนว เบลนด์ smoothstep ±8 px ที่ภาพ 2× บันทึก path จริงใน `seams.json` พื้นที่ที่ affine เปิดขอบไว้ใช้ master ขยายเป็นฐานรองตามสัดส่วนในตาราง
- มี `seam-check.jpg` เป็นแผ่นภาพขยายของแนวซ้อน และ `seam-paths.jpg` แสดงแนวตัด สีเขียวเป็นแนวตั้ง สีส้มเป็นแนวนอน พื้นที่สีเข้มว่างในแผ่นตรวจเป็นพื้นของแผ่นภาพ
- ภาพ `<chunk>-compare.jpg` ใช้ crop ตำแหน่งเดียวกันของ master และภาพ HD ที่ 2.8 screen px/world unit ภาพนี้สร้างจากไฟล์ส่งมอบ

ต้นแบบโซน 1 สอง worktree ใน brief หาไม่พบที่ตำแหน่งระบุ จึงอ่าน brief โซน 1 ฉบับเต็ม และดัดแปลงแกน SIFT/affine กับ min-cost seam จากสคริปต์งานโซน 4 ชุด 1 ที่อ่านได้ใน worktree `20261114T042638Z-7b9ca353` งานนั้นอ้าง recurrence ของ `docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py` ปรับรอบนี้ให้รองรับแถว 2–3, c5 กว้าง 819 px และ mapping pixel-centre ที่ 2×

## วัตถุและผลตรวจภาพ

`objects-inventory.json` มี 87 รายการในขอบเขตสี่ chunk เทียบภาพกับ owner walkmask โซน 4, layout ของโซน, สถานี และเสา/สายไฟ runtime พร้อม SHA256 ของไฟล์อ้างอิง กลุ่มวัตถุฝังในภาพมี bbox และจุดเท้าตัวอย่างในพิกัด master ส่วนสถานีและเสา runtime ระบุเป็น `runtime-layer-only`

จากการตรวจภาพพบกลุ่มคริสตัล เสา สายเคเบิล และหินต่อกับแนวหน้าผา ตลิ่ง เกาะหิน ราวบันได และราวสะพาน พื้นลานเปิดในขอบเขตนี้ไม่มีวัตถุโดดที่ระบุให้ลบ จึงบันทึก `removedObjectIds=[]` ทุก chunk และคงกลุ่มริมขอบไว้ จุดเท้าตัวอย่างใช้เทียบ mask ระดับ cell 8 world units และพื้นลานด้านล่างของ r3 อยู่นอก owner walkmask ชุดนี้ การตรวจจุดเท้าจึงต้องอ่านควบคู่ภาพและบทบาทของกลุ่มวัตถุ

ตรวจ native ทั้ง 16 ภาพ, ภาพรวม HD, ภาพประกอบ r2-c4/r2-c5 และ seam-check ทั้งสี่ chunk แล้ว โครงลาน บันได น้ำตก และสะพานยังตามองค์ประกอบเดิม ภาพมีผิวโลหะและเหลี่ยมคริสตัลที่คมขึ้น รวมถึงลายน้ำและหมอกที่ ImageGen ตีความรายละเอียดใหม่ ความต่อเนื่องของลายน้ำและระดับความสว่างบริเวณซ้อน โดยเฉพาะ r3-c1/r3-c2 ยังต้องให้ Claude ตัดสินจากภาพขยาย ส่วนเกณฑ์ไม่เห็นรอยภายใน chunk และ structure ≤4 px จึงอยู่ระหว่างตรวจรับ

## ไฟล์ส่งมอบและการตรวจที่รัน

แต่ละโฟลเดอร์ chunk มี `q11..q22-native.webp`, `registration.json`, `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `structure.json`, `removed.json` และหลักฐาน seam/structure เพิ่มเติม รวมแพ็กประมาณ 75.47 MB อยู่ในงบ 80 MB

ภาพ input crop สร้างซ้ำได้จาก master จึงตัดออกจากแพ็กเพื่อคุมขนาด โดยยังเก็บ rect และ hash ไว้ สร้างคืนได้ด้วยคำสั่งต่อไปนี้

```sh
python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/prepare.py
```

รัน `scripts/assemble.py` หนึ่งครั้งเพื่อประกอบและบันทึกผลวัด รัน inventory หลังแก้ตัวอ่านสถานีให้ครอบคลุมหลายรายการในบรรทัดเดียวกัน มีสคริปต์บันทึก native และสร้างหลักฐานแนบไว้สำหรับตรวจสอบวิธี

คำสั่งตรวจส่งมอบที่ใช้

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/verify.py
git diff --check
git status --short
```

`verification.json` รายงานเฉพาะไฟล์ครบ เปิดได้ ขนาดถูก และขนาดแพ็ก ตรวจ syntax ของสคริปต์ทั้งห้าด้วย `ast.parse` และตรวจ RGB round-trip ตอนบันทึก native ทั้ง 16 ภาพ ผลคำสั่งพร้อมจำนวนไฟล์อยู่ในรายงานตรวจส่งมอบ

## ตรวจตนเองตามเกณฑ์รับงาน

1. **ส่วนครบ sharpness ≥×10 และ structure ≤4 px** ส่งครบ 4 chunk/16 ส่วน sharpness ที่ sampling 1× เท่ากันวัดได้ ×30.60–×35.27 จุดตรวจ structure สูงสุด 1 px ส่วนขอบทั้งหมดรอ Claude ยืนยัน
2. **ไม่เห็นรอยภายใน chunkและลบวัตถุเดินทับ** ประกอบ min-cost seam ครบพร้อมภาพขยายตรวจรอยต่อ inventory ระบุว่าไม่พบวัตถุโดดกลางพื้นในขอบเขตนี้ คุณภาพ seam รอ Claude ตัดสิน
3. **native และ registration ครบให้ ASSEMBLE** มีครบ 16 native พร้อมขนาดจริง affine core/context และขอบซ้อน 64 px รวมภาพ 2× ครบสี่ chunk งานต่อเนื่องคือการตรวจรับและ ASSEMBLE ขอบระหว่าง chunk
