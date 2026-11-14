# Z4-HD-ASSEMBLE — cyberhell v7

ประกอบพื้นโซน 4 จาก native ของ Z4-HD-1 ถึง Z4-HD-5 ครบ **70 ส่วน / 20 chunk** เป็นแผนที่ **9830×6554 px** งานนี้ส่ง asset pack กับหลักฐาน offline ไม่แก้ runtime และไม่รับรอง QA

## ชุดส่งมอบ

- `v7/`: WebP quality90 จำนวน 20 chunk ขนาดหลัก 2048×2048 คอลัมน์ท้ายกว้าง 1638 แถวท้ายสูง 410 พร้อม `zone4-terrain-v7-preview.webp` ขนาด 1536×1024 และ `manifest.json` ระบุขนาด ไบต์ SHA256 และตำแหน่งของทุกไฟล์
- ขนาดรวม `v7/` รวม manifest **25,773,731 bytes (25.773731 MB ฐานสิบ)** ดูผลตรวจใน `verification.json` ตรวจเพดาน **40,000,000 bytes** กับโฟลเดอร์นี้เท่านั้น สำเนา native และภาพ review อยู่นอกงบ pack
- `inputs/`: สำเนา native 70 ภาพ, registration เดิมครบ 20 ชุด และผล structure/removal พร้อม README จากแต่ละ run; `source-copies.json` ผูก SHA256 กับ worktree ต้นทางทั้งหมด ไม่ได้แก้ต้นทาง
- `inventory.json`: rect ที่แปลงเป็น global `[x,y,width,height]` หน่วย map1×, affine เดิม, hash และข้อมูลการวางทุกส่วน; `seams.json`: เส้น min-cost ทั้ง 69 เส้น
- `seam-check/`: รอยต่อแนวตั้ง 4 แนวและแนวนอน 3 แนว เต็มความยาวที่ 2× พร้อมฉบับ `*-game.jpg` ที่ **2.8 device px/world unit**; `internal/` มีภาพตรวจรอยต่อย่อยครบ 20 chunk และพิกัดใน `index.json`
- `overview.jpg`, `compare-zoom/` 6 มุมเทียบ v3 | v7: ลานหลัก สะพานกลาง ฝั่งลาวา ฝั่งน้ำสีฟ้า ลานเหนือ และลานใต้ ใช้พิกัดตามผังโซนเดียวกัน ไม่มี sprite ปิดรอยต่อ ไม่ใช่ภาพที่รันเกมจริง
- `structure-check.jpg`, `structure.json`, `structure-details/`: ผลจับคู่ landmark/grid/ขอบ walkmask และภาพขยายจุดค้าง; `sharpness.json`: ผลวัดต่อ chunk จากไฟล์ WebP ที่ decode กลับมา เทียบฐาน v3 ที่สเกลเกมเท่ากัน
- `native-domain-extrapolation.png`: สีขาวคือพิกเซลที่ไม่มี native ใดครอบคลุมจริงหลังประกอบ; `border-reflection.json` รายงานขอบเขต native ก่อนประกอบแยกทุกส่วน

## วิธีประกอบและการใช้ pack

อ่านใบงานโซน 1 ที่อ้างใน brief แล้ว โฟลเดอร์ตัวอย่าง `/Users/agapae/agapae-work/.codex-worktrees/20261110T115811Z-6ad6e037/docs/art-reviews/2026-11-05-z1-v5-hd-assemble/` ไม่มีอยู่บนดิสก์รอบนี้ จึงอ่าน README และสคริปต์จริงจาก commit **`8c8f339f`** แบบ read-only และปรับใช้เฉพาะงานโซน 4

registration ของ run 1–4 ใช้ rect แบบ global XYXY ส่วน run 5 ใช้ global XYWH แปลงเป็น XYWH แล้วตรวจ core ว่าปูครบโดยไม่ซ้อน/เว้นช่องและตรวจ matrix ที่ระบุซ้ำ ไม่ fit registration ใหม่ ไม่ใช้ภาพ `<chunk>-2x.webp` ที่ผ่านการปรับแสงทั้งภาพจาก run ต้นทาง

warp native ตรงด้วย Lanczos4 สู่กริด 2× ใช้การแปลงจุดศูนย์พิกเซล `u2x=2*u1x+0.5` เหมือน output matrix ที่ run 3 ระบุไว้ บริบทซ้อนข้างละ 64 map px ประกอบด้วย squared RGB difference + Gaussian5, min-cost path ก้าว -1/0/+1 และ smoothstep feather ±8 output px ชดเชยสีเฉพาะแถบ overlap แบบสมมาตร Gaussian16 จำกัดด้านละ 8 RGB และ taper เป็นศูนย์ที่ขอบ ไม่ปรับสีทั้งภาพ ไม่ sharpen ไม่ DOF/parallax ไม่ดัดรูปทรงเพิ่มเติม

ใช้ validity mask หลีกเลี่ยงเส้นทางตัดผ่านส่วนที่ affine พ้นภาพ native และบังคับเลือกภาพที่มีพิกเซลจริงหากมีเพียงด้านเดียว ขอบที่ไม่มีภาพใดครอบคลุมใช้ `BORDER_REFLECT` จาก native เท่านั้น ส่วนนี้มี **8,229 output pixels (0.012773%)** อยู่เฉพาะริมแผนที่ หนาสูงสุด 5 output px (2.5 map px) จำนวนและกรอบจริงอยู่ที่ `inventory.json/nativeDomainExtrapolation` ตัวเลขขอบบริบทก่อนประกอบใน `border-reflection.json` ไม่ใช่จำนวนพิกเซลที่สะท้อนในภาพส่งออก

มีรอยต่อภายใน chunk 50 เส้น ข้ามคอลัมน์ 16 เส้น ข้ามแถว 3 เส้น รวม **69 เส้น** ตัดไฟล์ทั้ง 20 ชิ้นจาก master เดียวในหน่วยความจำ แล้วสร้างผลวัดและภาพตรวจจาก WebP ส่งออกที่ decode ใหม่

pack นี้ใช้กับ loader ที่กำหนด `fullPx={w:9830,h:6554}`, `chunk=2048`, `worldSize={w:3840,h:2560}`, `repairs=false` ตาม manifest การเชื่อมเข้าเกมยังเป็นงานถัดไป: `src/cyberhell-terrain.js` ปัจจุบันอ่าน v3 และคำนวณ grid 1024 จึงต้องปรับ loader ให้รองรับ grid นี้ก่อนเลือก pack งานนี้ไม่แก้ `src/`, `tests/`, `img/` หรือเปิดใช้ pack แทน v3

## Fallback และข้อค้าง

**ImageGen 0 ครั้ง; fallback จาก v3 จำนวน 0 ส่วน** native พร้อมครบทุก chunk ไม่มีส่วน generation ค้าง การสะท้อนขอบ native เป็นข้อจำกัดเชิง sampling ที่เปิดเผยแยกไว้ ไม่ได้นำ v3 มาทับเพื่อให้ค่าตรวจดูดี

ผลวัดโครงสร้างมาตรฐานรอบสุดท้าย **2,465 จุด จับคู่มั่นใจ 2,406 จุด กำกวม 59 จุด มี 19 จุดเกิน 4 px สูงสุด 10.4403 px** อ่านรายจุดใน `structure.json` เก็บทั้งจุดเกินเกณฑ์และ confidence ต่ำไว้ทั้งหมด ไม่ใช้ SIFT inlier residual หรือความคมรับรองรูปทรงทั้งแผนที่

ตรวจด้วย DoG sigma1.5/6, template49×49, NCC ค้น ±12 map px, confidence≥0.6 บนภาพสุดท้ายที่ย่อลง 1× ใช้ landmark จากต้นทาง กริดคงที่ทุก 160 px และจุดตาม contour ของ **`src/town-owner-walkmask-cyberhell.js`** ทุก 80 px (เป็น mask โซน 4 จริง ไม่ใช่ `town-walkmask.js` ของโซน 1) cell 8 world units มีขนาดประมาณ 10.24 map px จึงใช้ประกอบบริบททางเดินได้ แต่พิสูจน์ contour ความคลาด 4 px ทุกเส้นไม่ได้

ต้นทางเคยระบุข้อค้างหัวบันได `r1-c2` ระยะ 9.22 px, บันได `r1-c5` ระยะ 5.10 px และหิน `r4-c2` ระยะ 6.40/4.47 px เก็บผลต้นทางไว้ใน `inputs/` และตรวจตำแหน่งเหล่านี้ด้วยวิธีเดิมเพิ่มใน `structure-details/upstream-exceptions-retest.json` ผลที่ต่างจากต้นทางอาจมาจากการ warp native โดยตรง การงด broad-light correction การประกอบบริบท และการ encode ใหม่ ไม่ถือว่าพิสูจน์ semantic contour แล้ว ไม่ลบผลเดิมหรือเลือกเพียงวิธีที่ค่าต่ำ

Laplacian variance / high-pass / FFT ใน `sharpness.json` เปรียบเทียบสเกลและ footprint เดียวกัน Laplacian ratio ต่อ chunk อยู่ที่ **×176.66–×394.34** ค่า ratio สูงเพราะฐาน v3 เบลอมาก ผิวที่วาดเพิ่มและ contrast มีผลต่อค่า จึงไม่ใช่ตัวคูณความละเอียดที่ตารับรู้

ผลดูภาพและไฟล์ที่เปิดตรวจจริงอยู่ใน `visual-review.json` ลายผิวหิน น้ำ หมอก และรายละเอียดราวที่ native วาดแยกกันอาจต่อไม่เหมือนต้นฉบับ การตรวจในเกมและ contour ทุกเส้นยังค้าง จึง **ไม่ยืนยันเกณฑ์รับงานข้อ 2**

## ตรวจซ้ำและ self-check

ต้องมี Python3, Pillow, numpy และ OpenCV รันจาก repo root ได้ ไม่ต้องใช้ worktree ต้นทางหากมี `inputs/` แล้ว; `baseline-consistency.json` ตรวจภาพฐาน v3 ทั้ง 20 ชิ้นใน 5 worktree ตรงกับงานนี้ครบ 100 ไฟล์; verifier ตรวจ hash สำเนาทุกไฟล์ และตรวจต้นทางเพิ่มเมื่อ path เดิมยังอยู่

```sh
python3 docs/art-reviews/2026-11-10-z4-hd-assemble/scripts/check-composition.py
python3 docs/art-reviews/2026-11-10-z4-hd-assemble/scripts/assemble.py
python3 docs/art-reviews/2026-11-10-z4-hd-assemble/scripts/review-details.py
python3 docs/art-reviews/2026-11-10-z4-hd-assemble/scripts/verify.py --acceptance
```

`assemble.py --snapshot` ใช้คัดลอกต้นทางใหม่โดยตั้งใจเท่านั้น การประกอบปกติอ่านสำเนาในงานนี้ การทดสอบภาพจำลองตรวจแนวนอน แนวตั้ง ขอบเขตผลลัพธ์ การไม่เปลี่ยนพิกเซลนอก overlap, schema ทั้ง 5 ชุด, coverage 70 ส่วน, จุดศูนย์พิกเซล/ตำแหน่ง native ที่รู้คำตอบ และการเลือกแหล่งพิกเซลเมื่ออีกด้านไม่มีข้อมูล

ผลรันสุดท้าย: `check-composition.py` exit0 ครบ 7 กลุ่ม, `assemble.py` exit0, `review-details.py` exit0 และ `verify.py --acceptance` exit2 โดยผลตรวจไฟล์สำเร็จ เปิด decode ภาพ 143 ไฟล์ ต้นทาง/สำเนา 163 ไฟล์ hash ตรงกัน รายการคำสั่งและการหยุดตรวจพิกัดในรอบแรกเก็บตามจริงใน `checks.json`

`verify.py` ตรวจจำนวน/ขนาด/decode/hash/งบ pack, SHA256 ของ inputs/ฐาน, validity mask และความต่อเนื่องของเส้น min-cost; `--acceptance` คืน **exit 2** เมื่อข้อรับงานยังยืนยันไม่ครบ ไม่แปลว่าไฟล์เสีย หากตรวจเฉพาะไฟล์ใช้คำสั่งเดียวกันโดยไม่ใส่ flag

| เกณฑ์รับงาน | Self-check |
|---|---|
| 1. v7 ครบ 20 ชิ้น + preview + manifest และ ≤40 MB | ตรวจจากไฟล์ส่งออกจริง ผล/จำนวน bytes อยู่ใน `verification.json` |
| 2. ไม่เห็นรอยต่อที่ซูมเกมและ structure ≤4 px | มีหลักฐาน offline ครบ ยังไม่รับรองทั้งข้อ มี 19 จุดมาตรฐานเกิน 4 px สูงสุด 10.44 px และจุดกำกวม 59 จุด ไม่ได้รันเกม |
| 3. ระบุ fallback/ข้อค้างตามจริง | ไม่มี v3 fallback, ImageGen 0; เปิดเผยขอบ native extrapolation และข้อค้างทั้งหมดข้างต้น |

เพิ่มเฉพาะไฟล์ใน `docs/art-reviews/2026-11-10-z4-hd-assemble/` ใช้ worktree/branch ที่ได้รับเท่านั้น ไม่สร้างหรือเปลี่ยน branch/worktree ไม่ commit/push/merge/deploy ไม่แก้ hooks, status.json, worklog.json และไม่เรียก agent อื่น
