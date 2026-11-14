# Z234-HD-FULL · โซน 4 ชุด 5/5

ส่งภาพ review ของ `r4-c2 r4-c3 r4-c4 r4-c5` ครบ 8 ส่วน ใช้ **ImageGen ในตัว 8 ครั้ง** จาก master `img/map-zone4/v3/` ซึ่ง `src/zone-skin.js` โหลดจริงและตั้ง `repairs=false` ทั้ง native และภาพประกอบ 2× เป็น WebP lossless

**มีผลวัด structure เกิน 4 px ใน r4-c2 สองจุด** ค่าสูงสุด 6.40 px รอ Claude ตัดสินจากหลักฐานชุดนี้ การตรวจคุณภาพทั้งชุดยังเปิดอยู่

## ผลส่งและผลวัด

| chunk | native q11 | native q12 | ประกอบ 2× | Laplacian เทียบ v3 | structure สูงสุดของจุดมั่นใจ | จุดมั่นใจ/ทั้งหมด |
|---|---|---|---|---|---|---|
| r4-c2 | 1935×813 | 1935×813 | 2048×410 | ×291.33 | 6.40 px | 33/34 |
| r4-c3 | 1935×813 | 1935×813 | 2048×410 | ×368.03 | 1.41 px | 35/35 |
| r4-c4 | 1935×812 | 1935×813 | 2048×410 | ×307.45 | 1.41 px | 34/34 |
| r4-c5 | 1774×887 | 1663×946 | 1638×410 | ×314.23 | 3.16 px | 27/28 |

ความคมวัด grayscale Laplacian variance `ksize=1` หลัง decode และ resample ด้วย Lanczos ที่ซูม **2.8 device px ต่อ world unit** เท่ากันทั้ง v3 และภาพใหม่ ใช้ทั้ง chunk เป็น primary ROI พร้อมผลครึ่งซ้าย/ขวา ฐาน v3 ของแถวนี้มีผิวเบลอมาก ค่า contrast และผิวที่วาดเพิ่มส่งผลต่ออัตราส่วนด้วย ตัวเลขนี้ใช้ประเมินรายละเอียดร่วมกับภาพจริง เก็บค่าดิบใน `sharpness.json` ทุก chunk

structure ใช้จุดชื่อที่กำหนดบนต้นฉบับและกริดคงที่ทั่ว chunk, template DoG 33×33 px, sigma 1.5/6, NCC ค้นหา ±12 px และระบุ confidence ≥0.6 เป็นจุดมั่นใจ เก็บจุดไม่มั่นใจไว้ครบ SIFT residual เป็นอีกตัววัดหนึ่ง แยกอยู่ใน `registration.json` การพิสูจน์ contour เชิงความหมายทุกเส้นยังค้างในทุก chunk

`r4-c2/structure.json` พบ `[240,100]` เลื่อน `[-5,+4]` ระยะ **6.403 px**, correlation 0.739 และ `[720,172]` เลื่อน `[-4,+2]` ระยะ **4.472 px**, correlation 0.712 หน่วย chunk-local 1× ผลวัดคงตามการประกอบครั้งแรกให้ Claude ประเมินตามใบงาน 13 พ.ย.

## วิธีและพิกัดสำหรับ ASSEMBLE

แถว r4 สูงจริง 205 px ตามข้อยกเว้นในใบงานโซน 1 จึงแบ่งเป็น **q11/q12 สองส่วน** ต่อ chunk, core กว้าง 512/512 px ส่วน c5 กว้าง 410/409 px ขอบซ้อน 64 px ต่อด้าน มีบริบทด้านบนจาก r3 จำนวน 64 px และจบที่ขอบล่างแผนที่ y=3277 ทุก crop สูง 269 px c2–c4 กว้าง 640 px, c5 กว้าง 538/473 px

อ่านวิธีต้นแบบจาก git history `bc9dc4dd` และ `d54fac28` เพราะ directory ของ worktree ที่ brief อ้างถึงไม่มีอยู่แล้วในเครื่องรอบนี้ สคริปต์ในชุดนี้ดัดแปลงวิธี SIFT + RANSAC partial affine, broad-light correction sigma35 map px น้ำหนัก 0.8 และ minimum-cost seam พร้อม feather 8 output px ต่อด้าน วาดผิวละเอียดด้วย ImageGen แล้ว warp native ตรงสู่กริด 2×

`registration.json` ระบุ rect เป็น `[x,y,width,height]` ทั้ง core/context แบบ chunk-local และ master-global พร้อม `nativeToContextPx1x` และ `nativeToMasterPx1x` สำหรับ native เดิมทุกส่วน สเกล native จริงประมาณ 3.02–3.52 px ต่อ map px บันทึกแยก x/y ตามขนาดที่คืนจริง ขอบที่ affine เลื่อนพ้น native ใช้ `BORDER_REFLECT` เช่นต้นแบบ valid fraction ของ context อยู่ประมาณ 99.66–99.99% เก็บค่าต่อส่วนไว้ให้ตรวจ

ไฟล์ `<chunk>-2x.webp` ประกอบรอยต่อภายใน chunk แล้ว ขอบระหว่าง chunk ส่งพร้อม context native 64 px สำหรับขั้น ASSEMBLE ตำแหน่ง seam ภายในเก็บใน `seams.json` และแสดงเส้นฟ้าบน `seam-check.jpg`

## วัตถุและผลดูภาพ

ทำ inventory ของโซนนี้จาก owner walkmask RLE, `town-cyberhell-layout.js`, `town-layout.js` และภาพต้นฉบับ เก็บเหตุผลรายกลุ่มใน `objects-inventory.json` และหลักฐาน overlay ใน `inputs/walkmask-review.jpg` ของแต่ละ chunk พื้นเดินใน core มีเฉพาะสะพาน r4-c3 จำนวน 31,939 master pixels ส่วนอีกสาม chunk มี 0 pixels ตาม mask เดิมที่ cell ละ 8 world units

พื้นสะพานกลางว่างต่อเนื่อง จึงมีรายการลบ 0 รายการใน `removed.json` เลือกคงเสา/ขอบสะพานซึ่งเป็นสถาปัตยกรรมด้านข้าง และกลุ่มหิน/คริสตัลในบริเวณที่เดินไม่ถึงตามรูปเดิม Inventory ใช้กรอบกลุ่มโดยประมาณเพื่อ review และระบุข้อจำกัดจากความละเอียด mask ไว้แล้ว ในสี่ core นี้ไม่พบฐานของเหลวหรือเมฆ

ดูภาพ native ที่ ImageGen คืน, compare และ seam sheet ครบแล้ว เห็นรายละเอียด bevel หิน รอยแตก ร่องปูน ผิวโลหะ และหน้าผลึกเพิ่ม โทนม่วงเทา แสงม่วง เส้นทองและสายพลังสีแดงยังอยู่ในองค์ประกอบเดิม ใน seam sheet ที่ตรวจไม่พบเส้นแบ่งสี่เหลี่ยมชัด ลายหินและผิวที่แต่ละส่วนวาดอิสระยังต่างกันใกล้แนว seam ให้ Claude ประเมินภาพเต็มประกอบ บันทึกใน `visual-review.json` การดูในเกมยังค้าง

## ไฟล์ที่เพิ่ม

- แต่ละ `<chunk>/` มี native 2 ภาพ, export 2×, compare, registration, structure, sharpness, removed, seams, ภาพตรวจ seam/structure และ inputs ที่ใช้จริง
- ส่วนกลางมี `generation-prompts.json` พร้อม prompt เต็มทั้ง 8 ครั้งและขนาดจริง, `objects-inventory.json`, `inputs-provenance.json` พร้อม source hash, `run-summary.json`, `visual-review.json`, `verification.json`, README และสคริปต์สองไฟล์
- เปิดภาพเทียบได้ที่ [r4-c2](r4-c2/r4-c2-compare.jpg), [r4-c3](r4-c3/r4-c3-compare.jpg), [r4-c4](r4-c4/r4-c4-compare.jpg), [r4-c5](r4-c5/r4-c5-compare.jpg)

## คำสั่งที่รันและ self-check

```sh
python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-10-z4-hd-full/scripts/verify.py
```

ประกอบและวัดผลหนึ่งครั้ง การตรวจอัตโนมัติจำกัดอยู่ที่ไฟล์ครบ, decode ภาพได้, ขนาดตรง และขนาดรวม ≤80,000,000 bytes รายละเอียดผลตรวจและจำนวนภาพอยู่ใน `verification.json` การวัดคุณภาพเก็บเป็นข้อมูลให้ reviewer พิจารณา

| เกณฑ์รับงาน | self-check |
|---|---|
| 1. ส่วนครบ, sharpness ≥×10, structure ≤4 px | ครบ 8 ส่วน ความคมที่วัด ×291.33–×368.03, r4-c2 มีสองจุดเกิน 4 px ส่วน contour ทุกเส้นยังรอพิจารณา |
| 2. ภายใน chunk ไม่เห็นรอยต่อ, ลบวัตถุเดินทับ, พื้นต่อเนื่อง | ตรวจ seam sheet ครบ ไม่พบเส้นแบ่งสี่เหลี่ยมชัดในการดูรอบนี้ inventory พบรายการลบ 0 จุด คงขอบสะพานด้านข้างไว้ ผลภาพเต็มรอ Claude ประเมิน |
| 3. native + registration ครบให้ ASSEMBLE | มี native lossless 8 ไฟล์, affine และ core/context rect ครบทั้ง 4 chunk พร้อม overlap 64 px |
| ขอบเขต run และงบ | 4 chunk ตาม brief, ImageGen 8/16 ครั้ง, ขนาดจริงดู `verification.json` ภายในเพดาน 80 MB |

งานที่ค้างเป็นการตัดสินคุณภาพ r4-c2, contour และ seam ทั้งชุด ตลอดจนการประกอบขอบเพื่อนบ้านและดูในเกม ไฟล์ส่งครบแล้วใน review directory นี้
