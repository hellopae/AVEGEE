# เก็บขมับครบทุกเฟรมหน้า

ผู้ใช้แจ้งว่ายังมีเนื้อเกินบางเฟรม หลังท่าขาเกือบเนียนแล้ว ตรวจคลิป13.28.29และภาพแยกครบ8เฟรมพบว่าเฟรมหน้า1,2,4,5,6,8ยังมีติ่งแดงหลังเขาซ้าย ส่วนเฟรม3และ7ที่วาดแก้ในv4สะอาดแล้ว

ใช้ built-in ImageGen แก้เฉพาะภาพส่วนศีรษะทั้ง6ใน head-edit-target.png ผลคือ heads-cleaned.png เก็บ prompt เต็มใน prompt.txt ไม่ได้สร้างท่าเดินใหม่

apply_patches.py ทำ technical assembly: จัดขนาดหัวที่สร้างใหม่ตามมงกุฎเดิม แล้วดึงเฉพาะ patch เล็กบริเวณติ่งเดิม ไม่ยกหัว/หน้าทั้งชิ้นมาทับ แผ่นmaskเลือกตำแหน่งภาพเกินเดิมและกันเขาหลักกับใบหู ส่วนงานวาดเก็บขมับมาจาก ImageGen ไม่ใช่ procedural painting

ตรวจพิกเซลนอกpatchให้เหมือนต้นฉบับทุกจุด รวมทั้งขาและลำตัว (y≥290) อีก26เฟรมเดินที่ไม่เกี่ยวข้องตรวจ hash ว่าไม่เปลี่ยน ดู verification.json แถวบนของ head-comparison.png คือก่อน แถวล่างคือหลัง

จุดประกอบใหม่: prepare.py → front-back-v3/apply_frontback.py → lift-v4/apply_lift.py → temple-v5/apply_patches.py ผลสุดท้ายคือ walk-sheet.png, walk-down.gif, walk-contact.jpg, metadata.json และพรีวิวในโฟลเดอร์แม่ ส่วน GIFหน้า–หลังล่าสุดคือ temple-v5/front-back-preview.gif

ยังเป็นโฟลเดอร์ทดลองแยก ไม่เปลี่ยนไฟล์แผนที่/UI/เซฟ/src ของ Claude
