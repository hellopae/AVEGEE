# Z234-HD-ASSEMBLE · โซน 2 asia

ประกอบพื้น 9830×6554 จาก native + registration ของ 5 worktree ตามใบงาน ส่งชุด asset และหลักฐาน offline เท่านั้น ยังไม่ยืนยันเกณฑ์โครงสร้าง/รอยต่อทั้งหมด ไม่ได้ติดตั้งในเกม

- `v7/` มี 20 chunk, preview และ manifest; chunk 2048, c5 กว้าง1638, r4 สูง410; WebP quality90, repairs=false
- `inputs/` เก็บ native ต้นทาง69ภาพและ registration20ไฟล์แบบ byte-identical พร้อมรายงานเดิมที่เกี่ยวข้อง; `source-provenance.json` เก็บ path/hash ต้นทาง
- `seam-check/` ครบแนวตั้ง4เส้น+แนวนอน3เส้นที่พิกเซล2×เต็มความยาว และ `*-game.jpg` ที่ซูม2.8 device px/world unit
- `structure-check.jpg`, `structure.json`, `sharpness.json`, `overview.jpg`, `compare-zoom/` 6มุม และ `fallback-check/` ใช้ภาพส่งออก decode กลับมาวัด/แสดง

## วิธีประกอบและขอบเขต

อ่านใบงานโซน1จาก path ที่ระบุได้ แต่ worktree ผลจริง `20261110T115811Z-6ad6e037` ไม่มีแล้ว จึงอ่าน README และสคริปต์ผลจริงจาก git commit `8c8f339f` แบบอ่านอย่างเดียว แล้วปรับเฉพาะแหล่งข้อมูล Asia/registration/missing part การตัดต่อไม่ใช้ broad colour correction ของ HD-FULL

แปลง native ตรงไป2×ด้วย affine ที่ต้นทางให้และ Lanczos4; ตรวจว่า affine context บวกoriginตรงกับ master ข้อมูล run1–3 ใช้ `[x,y,w,h]` ส่วน run4–5 ใช้ `[x0,y0,x1,y1]` แล้วจึงประกอบพร้อม context64px แต่ละด้าน ใช้ min-cost squared RGB Gaussian5, ก้าว-1/0/+1, feather smoothstep±8 output px ภายในและข้ามchunk/run ชดเชยสีเฉพาะ overlap: Gaussian16, สมมาตรไม่เกิน8ระดับRGBต่อภาพ และ taperเป็นศูนย์ที่ขอบ ไม่มีการปรับสีทั้งภาพ/sharpen/DOF/parallax/local deformation

ฐาน fallback เป็น `img/map-zone2/v2/` ซึ่งเกม Asia โหลดจริงตาม `src/zone-skin.js` (`repairs:false`) ไม่ใช้ภาพโซน1หรือ repairs ของโซน1 การติดตั้งภายหลังต้องเลือก directory นี้, fullPx9830×6554, chunk2048 และ repairs=false งานนี้ไม่แก้ runtime

## Fallback และข้อค้าง

ImageGen ใน run นี้ **0 ครั้ง** ไม่มีวาดใหม่หรือซ่อมด้วย generation

- ขาด native `r2-c3/q22` จริงจาก HD-FULL2: ใช้ Asia v2 ขยาย2×Lanczos; core1× `[2560,1536,512,512]`, context `[2496,1472,640,640]` แบบxywh เข้ารอยต่อกับnativeข้างเคียง
- คืนโครงสร้างเดิมเฉพาะ15บริเวณที่รายงานต้นทางและภาพเทียบพบข้อผิดรูป: สะพานลาวาที่เพิ่มเอง, ราว/ขั้นลานบน, ขอบลานตะวันออกหนาขึ้น, ต้นชมพูแทนวัตถุซีดเดิม, เชิงบันไดบน, สะพานสวรรค์, เชิงบันไดลาวา และ8บริเวณเพิ่มเติมจากภาพตรวจfocus (บันไดตะวันตกเฉียงเหนือ/ตะวันตกกลาง/ลานหลัก/ลานตะวันออก/ฝั่งน้ำแข็ง สะพานกลาง ท่าเรือ และบันไดลงน้ำตะวันออก) พิกัดcore/contextและเหตุผลใน `inventory.json` / manifest
- แต่ละบริเวณใช้ฐานv2ขยาย2× มีวงแหวน48 map px ตัดต่อmin-cost4ด้านและfeather±8 output px; coreคงภาพเดิม ไม่ดัดรูป ไม่ชดเชยสีเพิ่มตอนผสมfallback ไม่ถือว่าfallbackเป็นรายละเอียดnative2×
- Fallback อาจคืนพืช/พร็อพที่nativeเคยลบและมีความคมต่ำกว่าnative ยังต้องตรวจการซ้อนspriteในการบูรณาการ
- รายงานต้นทางยังไม่ยืนยันทุกcontour จำนวนขั้น และการลบวัตถุทั้งหมด บางส่วนเปลี่ยนคลื่น/ใบไม้/เสา; ไม่ใช้ค่าSIFTหรือsharpnessอ้างแทนความถูกต้องของรูปทรง

## การตรวจและการตรวจซ้ำ

Python3 + Pillow + NumPy + OpenCV; รันจากrepo root:

```sh
python3 docs/art-reviews/2026-11-10-z2-hd-assemble/scripts/ingest.py
python3 docs/art-reviews/2026-11-10-z2-hd-assemble/scripts/check-composition.py
python3 docs/art-reviews/2026-11-10-z2-hd-assemble/scripts/assemble.py
python3 docs/art-reviews/2026-11-10-z2-hd-assemble/scripts/verify.py --acceptance
```

`ingest.py` ต้องเข้าถึง5worktreeต้นทาง; หลังarchiveแล้วassemble/verifyใช้nativeภายในชุดส่ง ส่วนverifyตรวจhashต้นทางซ้ำเมื่อยังเข้าถึงได้ การตรวจcompositionใช้ภาพรู้คำตอบ5กรณี: สองแกน ขนาดผลลัพธ์ การคงพิกเซลนอกoverlap และการคงcore/พื้นที่นอกfallback

`verify.py` ตรวจไฟล์/ขนาด/decode/SHA256/งบ40,000,000bytes/เส้นทางseam แล้ววัดจากWebPที่ส่งจริง มี `--acceptance` จะคืนexit2เมื่อยังยืนยันเกณฑ์2ไม่ได้ เป็นผลตรวจรับที่ยังค้าง ไม่ใช่ข้อผิดพลาดไฟล์ และไม่ใช่การรับรองQA ไม่มีการทดสอบเกม

โครงสร้างใช้DoG sigma1.5/6, template49×49, NCCค้น±12map px เทียบAsia v2จากจุดต้นทางและcontourRLEทุก80px เก็บจุดกำกวมและจุดชนขอบค้นทั้งหมด ไม่ตัดจุดเกิน4pxออกเพื่อให้ตัวเลขผ่าน ใช้ `src/town-owner-walkmask-asia.js` เป็นmaskของAsiaจริง และ `src/town-walkmask.js` เป็นreferenceตามใบงาน (ไม่ใช่maskที่Asiaใช้) สีcyanคือAsia สีpinkคือreferenceโซน1 ความละเอียดเซลล์ประมาณ10.24map px จึงพิสูจน์semantic contour4pxทั้งแผนที่ไม่ได้

Sharpness ต่อchunkเทียบฐานAsia v2ที่ซูมเดียวกัน2.8px/world unit รายงานLaplacian variance, highpass และFFT; อัตราส่วนไม่ใช่ตัวคูณความละเอียดทางสายตา

## Self-check เกณฑ์รับงาน

1. ตรวจรายการ20chunk+preview+manifestและ≤40MB จากไฟล์จริง ดูจำนวนbyteและผลล่าสุดใน `verification.json`
2. ยังไม่ยืนยันไม่เห็นรอยต่อที่ซูมเกมหรือstructure≤4pxทุกแนว ดู `structure.json`, `visual-review.json` และภาพตรวจเต็มแนว รอยเปลี่ยนความคมของfallbackเป็นข้อค้าง
3. ระบุfallbackส่วนที่ขาด+15บริเวณคืนรูปเดิม ข้อค้าง และImageGen0ตามจริง

เพิ่มเฉพาะโฟลเดอร์reviewนี้ ไม่แก้src/tests/imgเดิม, hooks, status.json, worklog.json ไม่สร้าง/สลับ/เปลี่ยนชื่อbranchหรือworktree ไม่commit/push/merge/deploy และไม่เรียกagentอื่น

## ผลตรวจชุดสุดท้าย

- v7 รวมmanifest **25,316,983 bytes (25.316983 MB ฐานสิบ)** จากเพดาน40MB; nativeที่archiveในinputsไม่รวมในเพดานแพ็กเกม
- ภาพส่งออก21ภาพ (20chunk+preview), manifestขนาด/hashตรง; native69ภาพ+registration20ไฟล์ที่คัดลอกตรงกับต้นทางทั้งหมด129min-cost joins (ภายใน50+ข้ามchunk19+ขอบคืนโครงสร้าง60)
- จุดตรวจ **3,097จุด; confidence≥0.6 จำนวน2,493; กำกวม604; เกิน4pxอยู่7จุด** สูงสุด12.6491px (มีsearch-boundary hitจึงไม่ใช่เพดานerrorจริง) ทั้ง7จุดอยู่ในstructure-residuals.jpgและvisual-review.json
- จุดเกิน4px: [1816, 1495], [1825, 1506], [4163, 604], [1888, 1537], [1865, 860], [419, 648], [2839, 1065] หน่วยmap1×; จุดAsia owner3จุดและreferenceโซน1อีก4จุด ทั้งหมดเก็บไว้ ไม่ยืนยันsemanticทุกแนว
- Laplacian ratioต่อchunkเทียบAsia v2ที่ซูมเดียวกัน **16.82–228.15×**; ความต่างของtextureมีผล ไม่ใช่ตัวคูณresolution
- ตรวจภาพครบ7แนวพบการเปลี่ยนความคมที่fallback โดยเฉพาะr2-c3/q22, สะพานกลางและท่าเรือ การลบสะพานเพิ่มเองคืนสู่sourceแล้ว แต่ยังไม่รับรองการลบพืช/วัตถุครบ
- `structure-focus/before-*.jpg` และ `first-assembly-structure-review.jpg` เป็นหลักฐานรอบแรกก่อนเพิ่มการคืนรูป8บริเวณท้าย; `restored-structure-review.jpg`, fallback-check และcompare-zoomอ้างอิงไฟล์สุดท้าย
- รันcheck-composition:5กรณีไม่พบassertionผิด; รันverify.py --acceptanceหลังส่งออกใหม่: **exit2เพราะเกณฑ์2ยังไม่ยืนยัน** ส่วนfileChecksSucceeded=true; syntaxสคริปต์4ไฟล์ตรวจด้วยast.parse; git diff --checkไม่มีoutput

Self-checkสุดท้าย: (1)ไฟล์ครบ/ขนาดและงบตรวจแล้ว (2)ยังค้างstructure7จุด+604จุดกำกวมและรอยความคมfallback ไม่อ้างQA (3)fallbackส่วนขาด+15บริเวณ/ข้อค้าง/ImageGen0ระบุครบ
