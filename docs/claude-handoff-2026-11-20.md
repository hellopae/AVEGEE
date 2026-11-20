# Claude handoff · 20 พ.ย. 2569 21:45 (Claude weekly 95% · reset 25 พ.ย. 23:00)

## สถานะ
- main = งานล่าสุดครบ (บทหลัก v2 A–D, T9, ท่านอนสลบ 32, ยามาโซน 4 ชุดใหม่ทั้งหมด, AI Scammer Robot ใหม่, Guard ใหม่: กวนอูครบ · แวน เฮลซิง/WATSON-03 ภาพเดี่ยว)
- คิว Codex ที่รันอยู่ (log `AGAPAE Agent/Output/Codex/runs/queue-1120h.log`): `G-west-b` + `G-cyber-b` (sheet ต่อสู้/idle/เดิน ของแวน เฮลซิง, WATSON-03) → `R-RALLY` (story-cyberhell-01/02/03 + reinforcements-01/02 ยามาชุดใหม่ + Guard ใหม่)

## วิธีรับงาน Codex เข้าเกม (ถ้า Claude ชนลิมิต — ให้ Codex app ทำตามนี้)
ทำใน `~/agapae-work/.toby-worktrees/z1-v5` (branch `claude/2026-11-05-zone1-v5-fx`):
1. `git fetch && git merge --ff-only origin/main`
2. แต่ละ run ที่ `ready_for_review` ใน log: `cd <worktree>; git diff --name-only HEAD~1 | grep '^img/'` → คัดลอกไฟล์เหล่านั้นทับที่เดียวกันใน z1-v5 (ตรวจขนาด/โหมดสีเท่าไฟล์เดิมก่อน)
3. ถ้ามีไฟล์ใหม่ใน `img/ko-pose-v1/` → `python3 scripts/add-ko-poses.py` แล้วเปลี่ยน `manifest.json?v=…` ใน `src/battle-fx.js` `src/combat-sprites.js` `src/ui.js` + `python3 scripts/bump-cache-id.py <tag-t1b-xxx> battle-fx combat-sprites ui`
4. `node --test tests/*.test.mjs` ต้องผ่าน (ข้อ `workers.test` atlas 30 วิ ล้มเฉพาะตอนเครื่องหนัก — รันเดี่ยวยืนยัน)
5. commit → push branch → ใน `~/agapae-work/AVEGEE`: `git pull --ff-only && git merge --ff-only origin/claude/2026-11-05-zone1-v5-fx && git push origin main` → ดู Deploy Pages
- ห้ามแตะ `Documents/Work PAE/Claude/AVEGEE`

## งานค้าง (ทำหลัง reset 25 พ.ย.)
- ต่อสาย `img/ui/cmd-summon.webp` เป็นไอคอนปุ่ม "อัญเชิญ"
- Rae: EN ฉากบอสมาถึง (ยมทัต/เหลียนกัง/อาร์คอน-ศูนย์) + กรอบตัวนำเสนอบอส · บทนิราปลุก (ทำแล้ว T9) 
- ภาพตัวละคร R2 ที่ยังเป็น placeholder (ขุนแผน วันทอง กุมารทอง ลุงแจว เหลียนกัง มูซาชิ ริวจิน เจ้าแม่กวนอิม(ต้องตรวจวัฒนธรรมก่อน) โลกิ HOME-67 โคลอสเซียม 10 ตัว ลูแปง ตัวอัญเชิญ 12 ตัว ฯลฯ) — สเปกในรายงาน Toby `AGAPAE Agent/Output/Toby/2026-11-19-avegee-t4..t8.md`
- เซอร์เบอรัสตาแดง (ศึกประตูปัจฉิม) `img/z3-events/boss-cerberus-gate-west(.webp|-profile.webp)`
- ซิมสมดุลศึกใหม่ · H4 หุ่นซ้อม · minigame 4 อาคาร (Fable) · เดินแผนที่ย้อนจริง · เล่นตรวจในเบราว์เซอร์ (สิทธิ์ http.server ถูกปฏิเสธ)
- รอคุณเป้ตัดสิน: ศึกสุดท้ายคดี 10 หรือ 15 · ศึกปลดปล่อยบังคับ ยามา+นิรา ไหม · Guard/เซอร์เบอรัสถูกควบคุมไหม · ภาพเมืองไหม้ · 6 ข้อ T3 · ข้อตัดสินท้ายไฟล์บท R2 A–D
