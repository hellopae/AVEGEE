# Z234-HD-FULL — โซน 4 cyberhell ชุด 1/5

ส่ง r1-c1, r1-c2, r1-c3, r1-c4: native 16 ส่วน และภาพประกอบ 2× จำนวน 4 ภาพ ขนาด 2048×2048 แบบ WebP lossless ทั้งหมด ใช้ **ImageGen ในตัว 16 ครั้ง ไม่มี retry** สถานะคุณภาพ: **รอ Claude ตัดสิน ยังไม่รับรอง QA และยังไม่รับรอง structure ≤ 4 px**

ดู [ต้นฉบับ](source-contact.jpg), [ภาพ HD](hd-contact.jpg), [walkmask ซ้อนต้นฉบับ](walkmask-contact.jpg) และ [วัตถุที่ลบ](removed-compare.jpg) ภาพ contact วาง chunk เรียงเพื่อดูภาพรวม ขอบระหว่าง chunk ยังไม่ได้ join

## ผลวัดครั้งเดียว

| chunk | sharpness ที่ sampling 1× เท่ากัน | sharpness ที่ sampling 2× เท่ากัน | structure proxy สูงสุด (px 1×) | พื้นที่ master รองรับขอบ affine |
|---|---:|---:|---:|---:|
| r1-c1 | ×40.30 | ×262.01 | 1.00 | 0.03457% |
| r1-c2 | ×37.69 | ×225.52 | **9.22** | 0.00072% |
| r1-c3 | ×36.16 | ×228.96 | 0.00 | 0% |
| r1-c4 | ×32.53 | ×216.03 | 1.00 | 0% |

Sharpness = variance ของ grayscale Laplacian ทั้ง chunk ไม่มีการเพิ่ม sharpening หรือ noise ด้วยสคริปต์ คอลัมน์ 1× เทียบ master เดิมกับภาพส่งมอบย่อลง 1× ด้วย Lanczos; คอลัมน์ 2× เทียบ master ขยาย Lanczos กับภาพส่งมอบ 2× ค่าทั้งสองจึงมีฐาน sampling ต่างกัน และไม่ควรนำไปเทียบตัวเลขโซน 1 โดยไม่ตรวจสูตรเดิม ดูตัวเลขดิบใน `run-summary.json`

Structure proxy ใช้ patch 41×41 หลัง low-pass σ=2 ที่จุดตรวจ 6 จุดต่อ chunk ค้น ±24 px บนภาพส่งมอบย่อลง 1× เป็นตัวช่วยจับการเคลื่อนของลาน/บันได/สะพาน/น้ำตก ไม่ใช่การพิสูจน์ขอบทุกเส้น จุด `upper-stair-head` ของ r1-c2 ที่ [772,643] คลุมบริเวณหัวบันได พบ offset 9.22 px, correlation 0.948 ดู [ภาพขยาย](r1-c2/structure-head-stair-compare.jpg) จุดตรวจอีก 23 จุดอยู่ที่ 0–1 px โดย correlation ทุกจุด ≥ 0.866; **ค่ามากสุดที่รับรองเชิงโครงสร้างเป็น null** ไม่ใช้ SIFT inlier residual แทนผลเชิง semantic

ไม่ได้วัดซ้ำหรือเรียกวาดใหม่เพื่อไล่ตัวเลข ต้องให้ Claude ตรวจจุดหัวบันได r1-c2 และตัดสินงานแก้ต่อ เก็บเป็นข้อค้างใน `run-summary.json`

## วิธีและสิ่งที่คงไว้

- อ่าน master `img/map-zone4/v3/r*-c*.webp` ครบ atlas 4915×3277; ตรวจ `src/zone-skin.js` และ `src/cyberhell-terrain.js` แล้ว เกมใช้ v3, repairs=false จึงไม่มี repair โซนอื่นนำมาทับ
- แต่ละ chunk แบ่ง core 512×512 จำนวน 2×2 ขยาย context ออก 64 px ทุกด้านที่ไม่ติดขอบแผนที่ **รวมขอบข้ามไป chunk เพื่อนบ้าน** เก็บ context/core ในพิกัด full-map 1× แบบ `[x0,y0,x1,y1]`
- ImageGen 1 ครั้งต่อส่วน native คืนจริง 1254×1254 (10 ส่วน), 1323×1189 (5 ส่วน), 1388×1133 (1 ส่วน) ไม่มีการเปลี่ยนขนาด native ก่อนส่งออก รายละเอียดและ prompt ทุกครั้งอยู่ใน `generation-prompts.json`
- SIFT + full affine RANSAC register กลับ master; `registration.json` เก็บ native→context affine, rect, ขนาดจริง, hash และ matches/inliers ให้ ASSEMBLE มีขอบซ้อนดั้งเดิมครบ ไม่ได้ใช้ dense optical flow หรือย้ายโครงสร้างเกม
- ประกอบภายใน chunk ด้วย min-cost seam สามแนว (แนวตั้งบน/ล่าง และแนวนอน) เบลนด์ smoothstep ±8 px ที่ภาพ 2× ตามแนว seam ไม่มี colour matching เพิ่ม เก็บ `seams.json`, `seam-paths.jpg`, `seam-check.jpg` ให้ตรวจได้ พื้นที่ดำใน seam-check เป็นพื้นที่ว่างของแผ่น contact ไม่ใช่ช่องดำใน asset
- ลาวา น้ำฟ้า น้ำตก และหมอกยังเป็นฐานในภาพ ภูเขา เมืองไกล คริสตัลและเสาริมหน้าผายังคงอยู่ ภาพที่คืนมามีรอยแตก/แสงส้มเพิ่มบางจุด โดยเฉพาะพื้น r1-c2 และบางส่วน r1-c4 ต้องให้ Claude ตัดสินความสม่ำเสมอของแสงและความตรงกับต้นฉบับ

ต้นแบบโซน 1 ทั้งสอง worktree ที่ใบงานระบุไม่มีอยู่ในตำแหน่งนั้นแล้ว จึงอ่านวิธีจากใบงาน และใช้ precedent ที่มีใน repo: `scripts/stitch-border34-redraw.py` สำหรับ SIFT/affine และ `docs/art-reviews/2026-11-12-z1-v7r-assemble/scripts/assemble-v7r.py` สำหรับ recurrence ของ min-cost seam สคริปต์รอบนี้บันทึกไว้ใน `scripts/assemble.py`; ไม่อ้างว่าเป็นไฟล์ต้นแบบที่หายไป

## วัตถุและรอยต่อ

`objects-inventory.json` เทียบภาพกับ owner walkmask โซน 4 (cell 8 world units), `src/town-cyberhell-layout.js`, `src/town-layout.js`, `src/z4-poles-data.js` และชั้นเสา/สายไฟใน `src/z4-poles.js` ขอบเขต inventory คือสี่ chunk นี้ บ้าน/props ของ layout โซน 4 เป็นรายการว่าง เสาไฟและสถานี runtime แยกจากวัตถุฝังในพื้น

ลบคริสตัลลอยบนพื้นระหว่างบันได r1-c3 สองจุด: `z4-r1-c3-loose-crystal-west` และ `z4-r1-c3-loose-crystal-east` จุดเท้าทั้งสองอยู่บน walkmask; สั่งเติมพื้นใน ImageGen q21 และตรวจภาพประกอบแล้วเห็นพื้นแทนทั้งสองจุด ดู `removed.json` ราย chunk ไม่มีการลบราว พื้นสะพาน หรือขั้นบันไดด้วยสคริปต์

ตรวจภาพรวม ภาพประกอบ r1-c1 เต็มขนาด และ seam-check ของ r1-c2–c4 แล้ว พื้นผิว/ความเข้มแสงต่างกันบางช่วงของ overlap โดยเฉพาะบริเวณหมอกและขอบคริสตัล **ยังไม่รับรองว่าไม่เห็นรอยภายใน chunk** แนบภาพและ seam path เพื่อให้ Claude ตัดสิน ขอบระหว่าง chunk และการติดตั้งเข้าเกมเหลือให้ ASSEMBLE ตามใบงาน

## ไฟล์และการตรวจ

ทุกโฟลเดอร์ `r1-cN/` มี `q11..q22-native.webp`, `registration.json`, `r1-cN-2x.webp`, `r1-cN-compare.jpg`, `structure.json`, `removed.json` และหลักฐาน seam/structure เพิ่มเติม ภาพ compare ใช้ crop ตำแหน่งเดียวกันที่ประมาณ 2.8 screen px/world unit ไม่ใช่ screenshot ในเกม

input crop สร้างซ้ำได้จาก master จึงไม่เก็บในแพ็กเพื่อลดขนาด (hash เดิมอยู่ใน registration) สร้างกลับด้วย:

```sh
python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/assemble.py --prepare-inputs
```

`scripts/assemble.py` ใช้ native ที่มีอยู่ ไม่เรียก ImageGen; รันประกอบและวัดคุณภาพเพียงครั้งเดียวใน run นี้ หลังประกอบบีบอัด native และภาพ 2× ทั้ง 20 ไฟล์ซ้ำแบบ lossless และตรวจ RGB ก่อน/หลังตรงกัน พร้อมปรับ SHA256 ใน registration การบีบอัดนี้ไม่ใช่การวาดหรือการวัดคุณภาพรอบใหม่

ตรวจส่งมอบด้วย:

```sh
python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/verify.py
git diff --check
git status --short
```

`verification.json` รายงานไฟล์ครบ/เปิดได้/ขนาดถูก/รูปแบบ lossless/ขนาดรวม ≤80,000,000 bytes เท่านั้น ไม่มี quality gate และไม่ได้ทดสอบ runtime เกม งานนี้ไม่มีการแก้ `src/`, `tests/`, `img/`, hooks, status.json หรือ worklog.json ไม่มี commit/push/merge/deploy และไม่มีการสร้าง worktree/branch หรือเรียก agent เพิ่ม

ผลคำสั่งที่รันจริง: `verify.py` exit 0 — WebP lossless 20 ภาพ (native 16 + ภาพ 2048×2048 จำนวน 4), JPEG เปิดได้ 21 ภาพ, JSON เปิดได้ 21 ไฟล์ และไม่มีข้อผิดพลาดตามขอบเขตตรวจข้างต้น ขนาดแพ็กประมาณ **78.31 MB** รวมรายงานแล้ว `git diff --check` exit 0; `git status --short` มีเพียงโฟลเดอร์งานนี้เป็นไฟล์ใหม่ บรานช์ยังเป็น `codex/20261114T042638Z-7b9ca353` ผลนี้ไม่ใช่ผลรับรองคุณภาพงานวาด

## ตรวจรับตามใบงาน

1. **ส่วนครบ + sharpness ≥×10 + structure ≤4 px:** native ครบ 16 ส่วน/4 chunk; sharpness ที่วัดเกิน ×10 ทุก chunk; structure **ยังไม่ผ่านการยืนยัน** และ r1-c2 มี proxy 9.22 px
2. **ไม่เห็นรอยภายใน chunk + ลบวัตถุเดินทับ:** ลบสองคริสตัลและมีภาพก่อน/หลัง; seam ทำแล้วแต่ **รอ Claude ตัดสินคุณภาพ** ไม่อ้างว่าไร้รอย
3. **native + registration ครบสำหรับ ASSEMBLE:** มีครบ 16 native พร้อม affine/core/context และขอบซ้อน 64 px; ภาพ 2× ครบ 4 ภาพ ขอบเพื่อนบ้านยังไม่ประกอบ
