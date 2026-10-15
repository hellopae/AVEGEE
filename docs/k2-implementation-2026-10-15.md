# K2 — เมนูต่อสู้/สอบสวน

ทำงานใน worktree `/Users/agapae/agapae-work/.codex-worktrees/20261015T032143Z-53c7d49d` บน branch `codex/20261015T032143Z-53c7d49d` ที่แยกอยู่แล้ว ไม่มี commit/merge/push/deploy

อ่านบันทึก `docs/claude-update-2026-10-15.md` และเปิดดูภาพอ้างอิง/ภาพในเกมทั้ง 4 ภาพก่อนแก้ ไม่แตะภาพ แผนที่ town-* สมดุลเกม loop วาดภาพ hooks status.json หรือ worklog.json

## สิ่งที่เปลี่ยน

- เมนูทั้งสองใช้ skewX(-10deg) กับแถว และ skew กลับ +10deg ที่ข้อความ ขั้นละ 8px ที่ความกว้าง 1678px ใช้ token สีเดิม
- Flyout อิง offset ของปุ่มที่เลือก ซ้อนขอบ 12px แถวสูง 40px พร้อมขั้นบันได เลื่อนในแผงได้ สอบสวนใช้ thumbnail เต็มพื้นหลังพร้อมชื่อทับภาพ รายละเอียดข้อจำกัดยังอยู่ใน title และสถานะ disabled เดิม ต่อสู้แยกไอคอน ชื่อ และค่า MP/จำนวนไว้ทางขวา
- กำหนด index ขั้นบันไดใหม่ในแต่ละ flyout ไม่ใช้ index สะสมข้ามแผง
- Formation แกน X จากช่วง .275 เหลือ .172 (62.55%) และแกน Y จาก .155 เหลือ .097 (62.58%) ทีมปกติอยู่ X20–37.2% ลำดับ depth, scale และระยะก้าวของผู้ถึงตายังคงเดิม ศัตรูไม่ย้าย
- แก้ specificity ของ profile ที่เดิมแพ้ `.arena.combat-arena .battle-portrait` และกฎ final-team: รูปทีมสูงประมาณ 90px พร้อมชื่อและแถบ HP/พลัง รวมการ์ดประมาณ 120–130px ที่ 1678×937 รูปศัตรูประมาณ 117px; profile สอบสวน 115px พร้อมชื่อ/แถบด้านล่าง ตัวเลขนี้คำนวณจาก CSS ยังไม่ได้วัดใน browser
- Entry ทั้ง index หลักและ game-review ใช้ URL css/js ลงท้าย `-k2` ตรงกัน รวมถึง import ui.js ใน review เพื่อไม่ให้โหลด ui สอง module instance คนละ URL และส่ง suffix ต่อไปถึง battle-scale/formation/command-press

## ตรวจปุ่มกดไม่ติด

หลักฐานจาก source ก่อนแก้:

1. `battle9RowIn` เลื่อน hit area ของแถวจาก -14px เป็น 0 และ `battle9SubmenuIn` เลื่อนทั้งแผงจาก -18px เป็น 0 ทุกครั้งที่ paint พร้อม delay ตาม index แถว ปุ่มพลังต่อสู้ยังรับ transition transform จาก command-wheel.css ด้วย การกดบริเวณขอบระหว่างการเคลื่อนที่จึงมีโอกาสให้ pointerdown และ pointerup อยู่คนละ target
2. ตำแหน่งเมนูต่อสู้คำนวณ async หลังรอ sprite fitting และ requestAnimationFrame ทำให้ตำแหน่งอาจเปลี่ยนหลังแสดงปุ่มแล้ว
3. Flyout ต่อสู้ยังรับ `width:62px!important; flex:0 0 62px!important` ของวงเมนูเก่า ทำให้แถบที่ต้องการกว้างเต็มแผงมี hit area แคบผิดจากแบบ

การแก้: ปิด animation/transition ที่เปลี่ยนตำแหน่งในแถวและ flyout ทั้งสอง ลบความกว้าง/flex เก่าด้วยกฎที่เจาะจงกว่า จับ pointer ของปุ่มเดิมบน primary pointerdown ให้คง target เมื่อมีการจัดตำแหน่ง async การใช้คำสั่งยังอยู่ใน native click จุดเดียว ไม่ยิง action บน pointerdown จึงคง keyboard activation และ guard ของ handler เดิม

ประเด็นอื่นที่ตรวจ:

- paint แทน innerHTML จริง แต่ในตาฝ่ายเราตอนรอคลิก ไม่พบ timer ที่ paint เมนูซ้ำเป็นระยะ trial roar timer และ battle crew timer อัปเดตเฉพาะสถานะ DOM timer สำหรับตาศัตรูเป็นการเปลี่ยนตาจริง ไม่ควรเปิดปุ่มฝ่ายเรา
- scrim เดิมมี pointer-events:none; flyout ปิดมี display:none และ inert เพิ่ม pointer-events:none ให้แผงปิดชัดเจน
- หลัง skew ข้อความ/ภาพไม่รับ pointer แยกจากปุ่ม และใช้ pointer capture ของตัวปุ่ม
- busy/phase guard และการคืนสถานะเมื่อหมดเวลา 6000ms ยังคงเดิม ไม่พบหลักฐานจาก source ว่ามี lock ค้างใหม่
- เลือกพลังแล้วคลิกศัตรูยังเรียก executeCommand ทันที รวมถึง recipient ของการรักษา cooldown คิวเทิร์น และ warrant validation เดิม

**ข้อจำกัด:** ยังยืนยันไม่ได้ว่า movement คือสาเหตุที่เกิดกับผู้ใช้จริง หรือกดติดทุกครั้งใน browser เพราะไม่มี runtime trace การกดก่อน/หลัง เทสต์ใหม่ส่วน CSS เป็น source regression และเทสต์ pointer เป็น unit test ไม่ใช่ browser hit testing

## การตรวจ

- ก่อนแก้ `node --test tests/k2-menu.test.mjs`: ล้ม 3/3 (movement contract, formation geometry, cache URL)
- หลังแก้: เทสต์ K2 4/4 ผ่าน รวม primary pointer capture, ไม่ activate ตอน pointerdown, click ครั้งเดียว, disabled/right-click/secondary pointer/cancelled pointer
- ชุดที่เจาะส่วน battle/formation/power/trial: 31/31 ผ่าน
- รอบเต็มครั้งแรก 919/921; สองข้อที่ล้มเป็น assertion suffix ui.js เก่าใน skill-atk และ west-hit-facing ปรับเฉพาะ expected suffix ให้ตรง -k2 แล้วชุดที่เกี่ยวข้อง 12/12 ผ่าน
- ผลชุดเต็มสุดท้าย `node --test tests/*.test.mjs`: 921/921 ผ่าน, fail 0, skipped 0 (106.39 วินาที)
- `node --check src/ui.js`, `node --check src/command-press.js` และ `git diff --check` ไม่พบข้อผิดพลาด

## ภาพหลักฐานและ self-check

1. ภาพจาก game-review 1678×937 เทียบข้าง reference: **ยังไม่ได้** Chrome headless launch จบด้วย SIGABRT; in-app browser ไม่มีให้ใช้; Brave extension ถูก browser security policy ปฏิเสธการเข้าถึง localhost จึงหยุดการใช้ browser ไม่เปลี่ยนช่องทางเพื่อข้ามข้อจำกัด ไม่มีภาพใหม่ใน `output/k2-shots/`
2. เมนูเอียง/ขั้นบันได flyout แถบเตี้ย profile ใหญ่ และทีมชิด: **ลงโค้ดแล้ว** สูตร formation มีเทสต์ แต่ยังไม่ยืนยันภาพจริง ข้อความยาว จอแคบ และการบังพื้นที่ต้องตรวจ browser ต่อ
3. รายงานสาเหตุและเทสต์ก่อนล้ม/หลังผ่าน: **ได้ระดับ source/unit** ยังขาดการ reproduce และ trace เหตุจริงใน browser จึงยังไม่ถือว่าครบด้าน runtime
4. ชุด `node --test tests/*.test.mjs`: **921/921 ผ่าน** ในรอบสุดท้าย

ไม่มีการอ้างว่า QA ผ่าน
