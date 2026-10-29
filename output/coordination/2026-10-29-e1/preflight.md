# E1 — ตรวจ W2 §8 ก่อนแก้โค้ด

ตรวจเมื่อ 29 ต.ค. 2569 ใน worktree ที่ได้รับ ไม่มีการสร้างหรือสลับ branch

1. `game.js:refreshZoneEvents` อ่าน requires เฉพาะโซนเดียว ต้องเพิ่ม requiresZone และ gate signalClose ให้ cyberFinal ตามการอนุมัติใน brief รวม direct start และ migrate pending save
2. `zone-travel.js:harbourDestinations` ต้องเปิด ports ทั้งสองฝั่ง เพิ่มการเปิดท่าเคยเยือนครั้งเดียวหลัง cyberRescue ไม่เปลี่ยนค่าเรือ/เวลา
3. `breach-approach.js` มี allowlist 4 key เพิ่ม SIG 4 ศึกและอ่าน foes/waves ได้
4. `boss-justice.js:queueBossJustice` ใช้ isFrontierBreachEvent ห้ามเพิ่ม SIG ใน classifier นี้ เพราะเหยื่อไม่ต้องขึ้นศาลซ้ำ
5. `frontier.js:releasedFrontierBoss` ซ่อนมิตรเมื่อ invasion และคืนจาก ledger หลังจบ ไม่ต้องเปลี่ยน ledger เดิม
6. บันทึกทางเลือกก่อนเริ่มศึกและเก็บข้าม retry ได้ ใช้ตัวเลือกสองทาง/ฉากตาม fallback ที่ W2 อนุญาต: เรียกคำฝาก (boss stun) / บุกทันที (+25% coin); ไม่เพิ่ม signalTraced
7. ไม่มี sideQuests ต้องเพิ่ม state, snapshot, restore และ migration พร้อมปุ่มภารกิจในนิรา มีขั้นคุย เดินทาง เรียกคดี ตัดสิน เลือก และส่งของ
8. `nextNamedCase` ต้องตัด quest ทั้งรอบปกติและ recycle asia; mkCaseSoul เก็บ private ใน deeds ได้ เพิ่มผลกรรม +6 ครั้งเดียวเมื่อใช้ mirror/hypno และเพิ่ม west quest cases โดยไม่เข้ากองสุ่ม
9. CASES_BY_ZONE ไม่มี cyberhell; ALL_CASES รวมรายชื่อทั้งโซนได้ ใช้ registry ไม่สมมติว่าทุกโซนมี pool
10. EXP ผู้ช่วยอยู่ในระบบ training แยกต่างหาก ไม่มี public grant helper ตรง ใช้ห่อเสบียง ×2 แทน EXP ผู้ช่วย +30 ตาม W2 fallback และระบุในรายงาน
11. finalEvent มี phase completed และ UI มีปุ่มเล่นต่อแล้ว แต่ต้องกัน start ซ้ำ, เปิดภารกิจและเรือหลัง completed, migrate ending ให้เล่นต่อได้ ปิดภารกิจระหว่างศึกสุดท้ายด้วยข้อความ “ไว้หลังเรื่องนี้จบ”
12. atCases ใช้ zoneCases[zone] จึงนับแยกโซน เควสเก่าไม่เร่ง cyberSignal (7) / cyberFinal (10)

## ตรวจเพิ่มเติม
- ค้น src/cases* แล้วไม่พบ W*/N* หรือ 8 id ใหม่; ต้องทดสอบ uniqueness ทั้ง ALL_CASES
- W3 มีไฟล์ครบ ใช้ตามการตัดสินล่าสุด: asia 90 วินาทีจาก arrival (ไม่ผูกคดีแรก), west/cyber คงช่วยตัวประกันและต่อด้วยฉากหลังช่วย
- มี img/story-sig ครบ 10 คัตซีนและ sprite 3 โซน ใช้ของที่มี ไม่สร้างภาพ
- ไม่ใช้ browser ตาม brief; full suite จะรันครั้งเดียวตอนท้าย
