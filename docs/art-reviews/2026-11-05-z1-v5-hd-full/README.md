# Z1-V5-HD-FULL · ชุด 2/8 · 5 พฤศจิกายน 2569

ส่งเฉพาะ **r3-c2 และ r2-c4** ใน worktree/branch ที่ wrapper เตรียมให้ ไม่แก้ runtime หรือผูกภาพเข้าเกม ใช้ **ImageGen ในตัว 10 ครั้ง**: วาด 8 ส่วน + แก้ q21 ของ r2-c4 เพื่อคืนป่าที่ถูกเปิดเกิน และแก้ q11 เพื่อลบเรือนยอด city-tree-08 ไม่มี Shado หรือ API/CLI generation

| chunk | ส่วนครบ | native ที่เลือก | ภาพประกอบ | Laplacian เทียบ v5 | โครงสร้างที่จับคู่มั่นใจ |
|---|---|---|---|---|---|
| r3-c2 | q11/q12/q21/q22 | 4 × 1254×1254 | 2048×2048 | 17.42× | 12/16 จุด, สูงสุด 1 px |
| r2-c4 | q11/q12/q21/q22 | 4 × 1254×1254 | 2048×2048 | 21.41× | 18/24 จุด, สูงสุด 3.61 px |

เปิด [ภาพเทียบ r3-c2](r3-c2/r3-c2-compare.jpg), [ภาพเทียบ r2-c4](r2-c4/r2-c4-compare.jpg), [ผลสรุป](run-summary.json) และ seam-check.jpg ในแต่ละโฟลเดอร์ ภาพเทียบใช้ซูมเดียวกัน **2.8 device px/world unit** (2.187589 px/map px) ให้เปิดที่ 100%; JPEG เป็นภาพ preview บีบอัด quality 88 ส่วน native และภาพประกอบ WebP เป็น lossless

แต่ละ chunk มี `q11..q22-native.webp`, `registration.json`, `<chunk>-2x.webp`, `<chunk>-compare.jpg`, `structure.json`, `removed.json` พร้อม input, seam trace และภาพจุดตรวจ ค่าความคมวัดจากภาพประกอบ lossless ที่ decode แล้วบนทั้ง chunk ตายตัว ไม่ได้วัดจาก JPEG และไม่ได้ sharpen ค่า Laplacian เป็นพลังงานรายละเอียด/contrast ไม่ใช่ความละเอียดเพิ่ม 17–21 เท่า

ใช้ master v5 + repairs ของต้นแบบแบบอ่านอย่างเดียว ตัด core 512×512 กับ context 64 px ทุกด้าน แต่ละ input 640×640 จึงมีพิกเซลวาดจริงประมาณ 1.959 px/map px ก่อน register เก็บ affine ทั้ง native→context และ native→global map พร้อม rect แบบ xywh 1× ครบสำหรับ run ประกอบรวม ไม่เบลนด์ข้าม chunk

ประกอบตามต้นแบบ: SIFT/RANSAC partial affine, warp จาก native ตรงสู่กริด 2×, min-cost color seam และ feather 8 output px ส่วน r3-c2/q21 มีสเกล native คลาดประมาณ 6% จึงชดเชยด้วย affine ทั้งภาพ ไม่ใช้ local deformation การปรับสนามสี sigma 35 map px ลดน้ำหนักในกรอบวัตถุ และปิดบนสองส่วนล่างของ r3-c2 เพื่อไม่ดึงเงาของพร็อพที่ลบกลับมา

ตรวจภาพ native และ seam sheet แล้วไม่พบเส้นแบ่งสี่เหลี่ยมเด่นในมุมที่ตรวจ พื้นใต้ก้อนหิน/ต้นไม้ถูกเติมต่อเนื่อง ราวสะพานถูกลบโดยเก็บพื้นไม้ บันไดและของเหลวยังอยู่เป็นชั้นฐาน **ยังไม่ทดสอบกับ mask animation ใน runtime** และไม่รับรองทุก contour จากค่าจุดตรวจบางส่วน

`removed.json` เก็บ ID ที่ตรวจภาพแล้วและรายการค้างแยกกัน: **city-tree-16, city-tree-17, ice-tree-04** ของ r2-c4 ยังจับคู่ identity จากกรอบสำรวจที่ทับหลายเรือนยอด/หน้าผาหรือมีแค่ส่วนขอบไม่ได้ชัด พุ่มแดงเตี้ยข้างลานซ้ายยังคงอยู่ จึงไม่อ้างว่าลบ inventory ครบทุก ID; เศษวัตถุใน context นอก core ต้องตรวจใน run ประกอบรวมด้วย ห้ามลบหน้าผาเพื่อให้ตรงกรอบสำรวจโดยเดา

การตรวจที่รัน:

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
```

verify ตรวจ decode ภาพทุกไฟล์, จำนวน generation ≤10, native 8 ไฟล์และพิกเซล lossless ตรงผล ImageGen (มี RGB hash สำหรับตรวจภายหลัง), ภาพประกอบ 2048, ความคม ≥10×, จุดโครงสร้างที่จับคู่มั่นใจ ≤4 px และขนาดชุด ≤60,000,000 bytes ตัวเลขจริงอยู่ใน run-summary.json จุดที่ correlation ต่ำยังเก็บครบใน structure.json ไม่ทิ้งออกจากหลักฐาน ไม่มีการรัน test แอปหรือ in-game QA เพราะไม่ได้แก้โค้ดเกม

Self-check ตามเกณฑ์:

1. **ส่วนครบและความคมถึงเกณฑ์**; จุดโครงสร้างที่มั่นใจอยู่ใน 4 px แต่ยังไม่ยืนยันทุกเส้นขอบ
2. **ตรวจภาพรอยต่อและพื้นแล้ว**; ยังไม่ปิดการลบครบทุกวัตถุ เนื่องจาก 3 ID ข้างต้นและ context นอก core
3. **native + registration ครบ** พร้อมส่ง run ประกอบรวม; ไม่ตัดต่อขอบกับเพื่อนบ้าน

เพิ่มเฉพาะโฟลเดอร์ review นี้ ไม่แก้ src/tests/img เดิม, hooks, status.json, worklog.json หรือโฟลเดอร์คุณเป้ ไม่สร้าง/เปลี่ยน branch หรือ worktree และไม่ commit/push/merge/deploy ข้อมูล prompt จริงครบ 10 ครั้ง, ขนาด, hash และภาพต้นทางอยู่ใน generation-prompts.json / source-provenance.json การประกอบและตรวจซ้ำไม่เรียก ImageGen
