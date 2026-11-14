# โซน 3 west — HD-FULL ชุด 3/5

รับช่วง r2-c4, r2-c5, r3-c1, r3-c2 จาก worktree `20261113T141746Z-b2dc2ebd` เมื่อ 14 พ.ย. 2569 มายัง branch `codex/20261114T014100Z-71f476be` คัดลอกครบ 80 ไฟล์และเทียบ SHA-256 ตรงทุกไฟล์ก่อนปรับเอกสาร (`continuation.json`) **run นี้ใช้ ImageGen 0 ครั้ง**; ภาพเดิมสร้างด้วย ImageGen ในตัว 16 ครั้ง ไม่วาดซ้ำ ไม่เปลี่ยน native/ภาพ 2×/registration/prompt/ผลวัด/รายการวัตถุ ไม่มีงานค้างสร้างภาพ แต่ยังค้าง Claude ตัดสินคุณภาพและข้อบกพร่องด้านล่าง ไม่ได้ติดตั้งเข้าเกม

ตรวจภาพ seam-check ทั้ง 4 chunk และ known-issue ทั้ง 2 ภาพใน run นี้แล้ว: ภาพรวมไม่พบเส้น grid seam ชัด แต่ preview ย่อไม่ยืนยันรายละเอียดเต็ม ยังคงข้อบกพร่องเดิมทั้งสองจุด ไม่รันวัดคุณภาพซ้ำเพื่อไล่ตัวเลข ค่าในตารางเป็นผลวัดที่รับช่วงมา ไม่ใช่การรับรอง QA

master = `img/map-zone3/v1/r*-c*.webp` ตาม `src/zone-skin.js`, repairs=false; hash ของ master ทั้ง 20 tile และโค้ดหลักฐานอยู่ใน `source-manifest.json` ไม่แก้ src/tests/img เดิม ไม่ commit/push/merge/deploy

แบ่ง 2×2 core 512×512 พร้อม context 64 px ทุกด้านที่มีพื้นที่ในแผนที่; c5 กว้างจริง 819 แบ่ง 410/409 px ขอบซ้อนภายในรวม 128 px พิกัด rect เป็น global 1× [x0,y0,x1,y1] exclusive end สร้างส่วนละหนึ่งครั้ง เก็บขนาดที่คืนจริง ไม่มีการขยาย native ปลอมเป็น 1254 px

SIFT mutual ratio .70, partial affine RANSAC จาก training half; อีกครึ่งเป็น holdout ไม่ใช้ fit ประกอบด้วย min-cost seam และ smoothstep feather ±8 output px เฉพาะภายใน chunk ไม่ต่อขอบเพื่อนบ้าน ไม่ sharpen และไม่ใส่พื้น master คืนเพื่อทำคะแนน

| chunk | ภาพ 2× | Laplacian × ที่ 1× | Laplacian × ที่ 2× | NCC เลื่อนสูงสุด px 1× | SIFT holdout raw max px |
|---|---|---:|---:|---:|---:|
| r2-c4 | 2048×2048 | 14.32 | 82.21 | 1.0 (7 จุด) | 591.28 |
| r2-c5 | 1638×2048 | 10.86 | 83.65 | 1.0 (6 จุด) | 334.48 |
| r3-c1 | 2048×2048 | 12.33 | 78.48 | 1.0 (8 จุด) | 501.61 |
| r3-c2 | 2048×2048 | 12.32 | 70.77 | 1.0 (7 จุด) | 522.70 |

Laplacian วัด grayscale ksize=1: คอลัมน์ 1× เทียบ master กับ redraw downsample แบบ AREA; คอลัมน์ 2× เทียบ redraw กับ master ขยาย Lanczos4 บน raster เท่ากัน ค่าเกิน ×10 ทุก chunk ตามทั้งสองนิยาม ผลนี้เป็นความถี่ภาพ ไม่ได้ยืนยันคุณภาพรายละเอียดด้วยตัวเอง

NCC ใช้ 28 จุดที่เลือกบนต้นฉบับ (41×41, Gaussian σ1.3, search ±16 px) วัดหนึ่งรอบ ไม่ตัดจุดทิ้ง สูงสุด 1 px ทุก chunk แต่เป็นเพียงจุดตัวอย่าง ไม่ได้พิสูจน์ขอบลาน/บันได/หน้าผา/ตลิ่งทุกตำแหน่ง ค่า SIFT raw max รวมจุดจับคู่กำกวมในหิน/โฟมซ้ำรูป เก็บทุกคู่ไว้ใน `sift-correspondences.json.gz` ไม่ใช้ตัวเลขนี้ตัดสินผ่านอัตโนมัติ ผลเต็มอยู่ใน `structure.json` และ `landmarks.json`

ตรวจภาพรวม `seam-check.jpg` ทุก chunk แล้ว ไม่เห็นเส้นแบ่งตารางตรงชัด; ยังต้องตรวจรอยที่รายละเอียดเต็มในไฟล์ 2× และ compare ที่สเกลเกม 2.8 px/world unit ลบเสา/ราวที่เห็นในกลุ่ม inventory แล้ว พื้นสะพาน/arch/ขั้นบันไดยังอยู่ เก็บน้ำ น้ำตก โฟม และหมอกเป็นฐาน คงต้นไม้บนเขา/ตลิ่ง จุด sprite จากโค้ดเป็นหลักฐานตำแหน่ง ไม่ได้แปลว่ามีวัตถุฝังใน master (`objects-inventory.json`, `removed.json`, `source-inventory.jpg`) พุ่มริมทางยังต้องตัดสินเทียบ walkmask

ข้อบกพร่องค้างตรวจ (มีภาพ master | redraw ใน `known-issue.jpg`):
- r2-c5 q22: หน้าผาหิมะมีเส้นขาวคล้ายน้ำไหลชัดกว่าปื้นซีดต้นฉบับ ต้องตรวจว่าเปลี่ยนความหมายพื้นผิวหรือไม่
- r3-c2 q22: กะโหลกเล็กบนตลิ่งนอก walk floor ถูก ImageGen วาดใหญ่ขึ้น/เลื่อน แม้ prompt ให้คงขนาดและตำแหน่ง ต้องตัดสินหรือซ่อมภายหลัง

ส่งมอบส่วน native lossless 16 ภาพ + registration 4 ชุดพร้อม context สำหรับ ASSEMBLE และภาพ 2× lossless 4 ภาพ (`r2-c5` 1638×2048, อื่น 2048×2048) prompt เต็มอยู่ใน `generation-prompts.json`; provenance และการเทียบ RGB กับ PNG อยู่ใน `generation-provenance.json` ไม่บีบอัดสูญเสียที่ native/2× เก็บคู่ SIFT แบบ gzip และลดเฉพาะภาพตรวจเสริมเพื่อคุม ≤80,000,000 bytes ลบ input ที่สร้างซ้ำจาก master ได้ออกจากชุดส่งมอบ

อ่านใบงาน Z1 ตาม path ที่ brief ให้แล้ว แต่ worktree ตัวอย่าง plaza-detail และ hd-full เดิมไม่มีอยู่ ใช้แนววิธีตามใบงานและ seam DP ของ Z1 v7r ที่อยู่ใน repo; script ตั้งต้นอ่านจากชุด west 2/5 (path ใน run-summary) ไม่คัดลอก native จาก run อื่น

ตรวจรับตนเอง:
1. ครบ 16 ส่วน, sharpness วัดได้เกิน ×10; structure sampled ≤4 px แต่ยังไม่ยืนยันทั้งแนว
2. ภาพรวมไม่เห็นเส้น grid seam, ลบเสา/ราวแล้ว; การตรวจรายละเอียด/พุ่มขอบทางและ 2 จุดผิดสังเกตยังค้าง
3. native + registration/core/context และภาพ 2× ครบสำหรับ ASSEMBLE; ขอบระหว่าง chunk ยังไม่ประกอบ

คำสั่งที่รอบสร้างเดิมบันทึกไว้ (run นี้ไม่ได้รันซ้ำ): `prepare.py`, `save-native.py` ×16, `assemble.py --chunks <chunk>` ×4, `measure-landmarks.py` หนึ่งครั้งต่อ chunk, `package.py` หนึ่งครั้ง และ `verify.py` หนึ่งรอบหลังจัดชุดไฟล์ ตรวจเฉพาะความครบ/เปิดได้/ขนาด/ความเป็น lossless/พิกเซล native/hash master/งบไฟล์ รอบเดิมไม่มี `verification.json` อยู่ใน 80 ไฟล์ที่รับช่วงมา; report ที่ส่งครั้งนี้เกิดจากการรัน `python3 docs/art-reviews/2026-11-10-z3-hd-full/scripts/verify.py` หนึ่งครั้งใน worktree นี้ ตรวจไฟล์/เปิดภาพ/ขนาดและ integrity ของ lossless กับต้นฉบับเท่านั้น ผลดู `verification.json` ไม่ใช่การรับรองคุณภาพหรือ QA
