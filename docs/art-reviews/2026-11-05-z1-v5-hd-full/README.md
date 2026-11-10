# Z1-V5-HD-FULL ชุด 5/8

ส่งภาพร่าง HD ครบ r1-c1 และ r2-c1 ทั้ง 8 ส่วน ใช้ ImageGen ในตัว 10 ครั้ง รวมแก้หมอกและบันได 2 ครั้ง สถานะยังไม่ครบเกณฑ์รับงาน

| chunk | native ครบ | sharpness เทียบ v5 | structure สูงสุดของจุดที่จับคู่มั่นใจ |
|---|---|---|---|
| r1-c1 | 4/4 | ×46.58 | 4.00 px จาก 20/28 จุด |
| r2-c1 | 4/4 | ×34.94 | 10.30 px จาก 15/26 จุด |

## ไฟล์ส่งงาน

ในแต่ละโฟลเดอร์ chunk มี `q11..q22-native.webp` แบบ lossless ขนาดจริงจาก ImageGen, `registration.json`, ภาพประกอบ `*-2x.webp` ขนาด 2048×2048, `*-compare.jpg`, `structure.json` และ `removed.json` พร้อมภาพตรวจ seam และ structure

ขนาด native จริงมี 1254×1254, 1323×1189 และ 1189×1323 ตาม crop ที่ชิดขอบแผนที่ พิกัด core/context มีทั้ง local chunk และ master 1× โดย context มีขอบ 64 px เฉพาะด้านที่มีพื้นที่แผนที่ต่อ

`generation-prompts.json` บันทึก prompt ทั้ง 10 ครั้งและแหล่งผลลัพธ์ รวมรอบแก้ ภาพ native ที่ส่งเป็นตัวเลือกสุดท้าย ส่วนภาพที่แทนแล้วอยู่ที่ตำแหน่งต้นทางของ ImageGen

## วิธีและผลตรวจ

ใช้ SIFT กับ partial affine, warp จาก native สู่ 2× โดยตรง และ min-cost seam ตามสคริปต์ต้นแบบ แก้แสงกว้างด้วย sigma 35 map px พร้อมเว้นพื้นที่ลบวัตถุ/หมอก เพื่อหลีกเลี่ยงการนำแสงหมอกกลับมา ไม่มี repair ของ `town-terrain-repair.js` ตัดผ่านสอง chunk หรือขอบซ้อนนี้

Laplacian variance วัดภาพเต็ม chunk ที่ 2.8 device px ต่อ world unit เท่ากัน ค่า ratio รวมผลจากพื้นใหม่และการลบวัตถุ รายละเอียดการวัดอยู่ใน `run-summary.json` ค่า SIFT residual ใน registration แยกจาก structure ซึ่งวัดด้วย landmark template หลังประกอบ

รันจาก root ของ repo ด้วย Python ที่มี Pillow, NumPy และ OpenCV

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/assemble.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py
python3 docs/art-reviews/2026-11-05-z1-v5-hd-full/scripts/verify.py --strict
```

การตรวจ artifact ถอดรหัสภาพ 27 ไฟล์ ตรวจขนาด native/2×, SHA-256, sharpness และเพดาน 60 MB ส่วน `--strict` คืน exit 1 เพราะยังมีเกณฑ์ค้าง

## ตรวจตนเองตามเกณฑ์รับงาน

1. ภาพครบ 8 ส่วนและ sharpness มากกว่า ×10 ทั้งคู่ แต่ r2-c1/q22 บันไดล่างยังคลาด 10.30 px หลังแก้ครั้งสุดท้าย จุด correlation ต่ำยังยืนยันไม่ได้ และยังไม่ได้ตรวจทุกเส้น contour หรือ animation mask
2. ประกอบ min-cost seam แล้วและตรวจภาพ seam แบบ offline ลบหมอก `lump-11` และส่วนของ `lump-13` ในขอบเขตนี้แล้ว แต่ยังมีพืชในกรอบสำรวจ `west-bed-07` ของ r2-c1 และมีแนวหินเฉียงที่ ImageGen เพิ่มบนลาน r1-c1/q21 ซึ่งต้องแก้/ตรวจรูปทรงเพิ่ม จึงยังยืนยันเกณฑ์ความต่อเนื่องและการลบครบไม่ได้
3. native และ registration ครบสำหรับ run ประกอบรวม พร้อมขอบซ้อนของเพื่อนบ้าน

จุดค้างทั้งหมดบันทึกใน `run-summary.json` ส่งเป็นงานรอตรวจ/แก้ภาพเพิ่มเติม ขอบระหว่าง chunk เตรียมไว้ให้รอบ assemble ทำต่อ สถานะ QA และการตรวจในเกมอยู่ใน summary ตามผลที่มี
