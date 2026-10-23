# Claude → Codex handoff · 23 ต.ค. 2569 (Claude weekly 96%, reset 28 ต.ค. 23:00)

คุณเป้สั่ง: Claude พักรอ reset · Codex ทำงานที่ทำได้ · งานที่ต้องเป็น Claude จดไว้ท้ายไฟล์
คิวละเอียด: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Claudy/briefs/2026-10-22-avegee-feedback-queue.md`
merge ทุก run: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Claudy/MERGE-CHECKLIST-codex.md`
สั่งรัน Codex worker: `cd "/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent" && python3 scripts/openai-worker.py --agent codex --task <ใบงาน> --project /Users/agapae/agapae-work/AVEGEE --write --run`

## main ตอนนี้ = `28f923c` (เทสต์ 1,404/0)
- F12 ชายแดน 1–2: เดินตาม mask คุณเป้ + ทางแยก + ต้นไม้ 80 + ภาพ v4 (`ac1c792`)
- Z2 เมืองโซน 2: mask คุณเป้ + ต้นไม้ 29 + อาคาร/โคมตำแหน่งโซน 1 (คุณเป้ยืนยัน 23 ต.ค. ให้คงตำแหน่งโซน 1) · สลับ sprite v3 = แก้ `ASIA_TOWN_SPRITES` ใน `src/zone-skin.js`
- ภาพชายแดน 2–3 / 3–4 อยู่ใน repo แล้ว route ยังปิด

## ลำดับงาน Codex (ทำตามลำดับ)
1. **22:30 รันอัตโนมัติแล้ว** (ถ้า session Claude ปิดก่อน ให้รันเอง): ใบงานต่อ 3 ใบใน `Output/Claudy/briefs/`
   - `2026-10-23-avegee-b1-cont.md` — พุ่งไปฟัน (โค้ดมีแล้ว เหลือเทสต์/README)
   - `2026-10-23-avegee-z2-art-cont.md` — sprite จีน-ญี่ปุ่นโซน 2 ที่เหลือ (sawan, krajok, sakura, willow) + composite
   - `2026-10-23-avegee-z3-ground-cont.md` — พื้นโซน 3 (ต่อครบแล้ว เหลือ QA/README)
2. **merge ตาม checklist** ทีละ run: B1 ก่อน → Z2-ART (คัดลอก `img/` + แก้ `ASIA_TOWN_SPRITES` ชี้ `-v3` / sakura / willow แล้วเทสต์) → Z3-GROUND (เอาเฉพาะ `img/map-zone3/` — ยังไม่เปิด skin `west`)
3. **B3 ฉากจบ + เป้าหมาย/สถานะ + ชื่อท่า** (คุณเป้เลือกข้อ 1,3,4): `2026-10-23-avegee-b3-result-screen.md` — **เริ่มหลัง B1 merge แล้วเท่านั้น** (แตะ `src/ui.js` เหมือนกัน)
4. **sprite โซน 3 (west)**: เขียนใบงานจากแม่แบบ `2026-10-23-avegee-z2-art-cjk.md` เปลี่ยนธีมเป็นตะวันตก-โกธิค-หิมะ (`k=west`, โฟลเดอร์ `map-zone3`, ทุกชิ้นใน `PLANNED_ART` + facade สถานี + ต้นสนหิมะ/ต้นแห้ง) ห้ามคล้ายโซน 1/2
5. **เมื่อคุณเป้ส่ง mask โซน 3** (`/Users/agapae/agapae-work/mask-for-kittanate/west/` → `west-mask-layer-edited.png` 1536×1024): ทำแบบ Z2-CODE (`2026-10-23-avegee-z2-code-mask-trees.md`) กับ `--zone west` + เปิด skin `west` (`docs/m2-zone-skin.md`) — ต้นไม้/ของตกแต่งตามที่คุณเป้วาด
6. **เมื่อคุณเป้ส่ง mask ชายแดน 2–3 / 3–4** (ทาแดงบนภาพ 1672×941): ทำแบบ F12 (`2026-10-23-avegee-f12-code-walkmask.md`) → `scripts/build-frontier-walkmask.py` + เปิด route
   - ถ้าคุณเป้ส่งเป็น screenshot (ขนาดไม่ตรง) ต้องจับคู่ภาพก่อน: วิธีอยู่ใน `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/.claude/skills/map-markup-extract/SKILL.md` (ORB/SIFT affine — ภาพโซน 2 ยืด sx≠sy ต้องใช้ full affine)
7. **พื้นโซน 4 (cyberhell)**: ใบงานแบบ `2026-10-23-avegee-z3-art-ground.md` เปลี่ยนธีม (ออบซิเดียน ผลึกม่วง เปลวฟ้า เครื่องจักร — M0 §4.1 แถว Z4, Mind M1 §6) แล้ว sprite โซน 4 ตามข้อ 4

## งานที่รอ Claude หลัง reset (28 ต.ค. 23:00)
- ตรวจรับ/แก้ run ที่ Codex app merge ไม่ได้ (conflict ตรรกะ, เทสต์แดงที่ไม่ใช่ของ run นั้น)
- ดูภาพรวมในเบราว์เซอร์ทุกโซนที่เปิดใหม่ (ทางเดิน/อาคารทับ/ต้นไม้)
- ล้าง worktree `.codex-worktrees` ที่ merge แล้ว + จัดระเบียบโฟลเดอร์ AVEGEE ซ้ำ (คิวเดิม: รายงานคุณเป้ก่อนลบ)
- ~~ขอคุณเป้ยืนยัน ต้นขาว/ฟ้า~~ → คุณเป้ยืนยันแล้ว 23 ต.ค.: ขาว = ซากุระ, ฟ้าอมเขียว = หลิว
