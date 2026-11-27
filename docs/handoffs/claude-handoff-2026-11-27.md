# Claude → Codex handoff · 27 พ.ย. 2569 (Claude weekly เหลือ ~6%)

**คุณเป้อนุญาต (ตรงตัว):** "แบ่งงานให้ claude ทำเฉพาะงานเล็กๆก็พอ ที่เหลือส่งไปให้ codex ได้ครับ ส่งคิวงานและ ให้ codex push ได้เอง ตอน claude ชน limited ด้วยนะครับ"
→ **Codex app ทำต่อ + merge main + push เองได้** (Claude ไม่มีโควตารีวิว) · ทุกงานต้องเทสต์เต็มรอบผ่านก่อน push

## วิธีทำงาน
- เทสต์เต็มรอบ: `node --test --test-concurrency=6 tests/*.test.mjs > "$TMPDIR/t.log" 2>&1; grep -E 'ℹ (tests|pass|fail|cancelled)' "$TMPDIR/t.log"` (concurrency สูง `balance28b` อาจค้าง)
- แก้โมดูล → bump cache id ใน importmap `index.html` (`scripts/bump-cache-id.py`) · มีเทสต์กัน importmap หลุด
- deploy Pages ล้ม: `gh run rerun <id> --failed` ครั้งเดียว · "Multiple artifacts" → `gh workflow run "Deploy Pages"` · ยืนยัน `https://hellopae.github.io/AVEGEE/version.json` = main · Pages เพดาน ~1 GB (ตอนนี้ ~830 MB)
- ภาพ .webp เท่านั้น · ห้ามย้อมสีภาพศิลป์ด้วยโค้ด (กลับซ้ายขวาได้) · ภาพเขียนทับชื่อเดิม
- ใบงานทั้งหมด (อ่านได้ใน repo AGAPAE Agent): `Output/Claudy/briefs/2026-11-2{6,7}-avegee-fb3-*.md` · แผน+ต้นฉบับคุณเป้: `Output/Claudy/2026-11-26-avegee-feedback/PLAN.md` `owner-comments.md` · ใบงานวาด: `Output/Codex/runs/art-1126-*.md`

## เสร็จแล้วบน main (FB3)
T1 จังหวะศึก · CLEAN/CLEAN2 · T2 ขนาด/ทิศ · R1+T3 สอบสวน/ข้อความ · T4 อัญเชิญ v2 · T5 แท่นตัดสิน/กองทัพ/หอส่องกรรม · T-LIB ศึกปลดปล่อย · T6 UI เมือง · T7/T7b ครัว/ห้อง · R2+T8 ข้อความ/คู่มือ/ตะเกียงตนละ 1 ครั้ง · T9 ต้นไม้ · ภาพ C1a C1b (Claudy/Dale) · C1c C2 C4 C5a (Codex app merge+push แล้ว `08c722f8` รวมวันทองหันซ้าย + crop ยมทัต)

## คิวที่ Codex รับต่อ (เรียงลำดับ)
1. **ภาพ Codex ที่วาดเสร็จแล้ว รอ merge** (branch local `codex/<run_id>` ใน `/Users/agapae/agapae-work/AVEGEE`):
   - ~~C5a~~ merge แล้ว — ตรวจว่า story-th-01..05 ลบ crop ครบ (commit `08c722f8` แก้เฉพาะยมทัต?) · ภาพเรื่องโซน 1 story-th-01..05 + `Intro-Boss-Zone1.webp` — **ต้องลบ entry crop ของภาพที่วาดใหม่ใน `src/cutscene-presentation.js` CONTENT_ROWS** (ภาพ pixel เก่าถูกครอปขอบดำ ภาพใหม่เต็มเฟรม) แล้วเปิดดูในเกมว่าไม่ถูกตัด
   - กำลังวาด/ยังไม่เริ่ม (คิว `queue-1126c.py` ใน AGAPAE `Output/Codex/runs/`): C3 แบบลูซิเฟอร์ (**ห้ามใช้ในเกม รอคุณเป้อนุมัติ**) · C5b story-asia/west (ลบ crop เหมือน C5a) · C6 หัวหน้าคนงานโซน 2–4 (โค้ดผูกชื่อแล้ว) · C5c Intro-Boss โซน 2–4 (ลบ crop ถ้ามี) · C7 ท่าเดิน 6 ตัว · C8 `cut-z{1,2,3}-guard-freed` (ผูกชื่อแล้ว)
   - ทุก run: เปิด `docs/art-reviews/.../compare.jpg` ดูด้วยตา · แตะเฉพาะ img/docs · ขนาด px เดิม · ไฟล์ไม่โตเกิน 15% · merge `--no-ff` · เทสต์ · push · deploy
2. **T10 เอฟเฟกต์บรรยากาศในอาคาร** — branch `toby/fb3` (push แล้ว): โซน 1 `aa1f0a05` โซน 2 `569b9c4f` เสร็จ (ยังไม่มีใครรีวิว) · โซน 3 WIP `706c63db` (Toby หยุดกลางทาง เทสต์ยังไม่ได้รัน) · โซน 4 ฝน ยังไม่เริ่ม · ใบงาน `Output/Claudy/briefs/2026-11-26-avegee-fb3-t10-room-fx.md` · ไฟล์หลัก `src/room-fx.js` `src/room-open-areas.js` `tests/fb3-t10-room-fx.test.mjs` · ทำต่อจาก branch นี้ แล้ว merge main
3. **T-WALK** (หลัง C7) `Output/Claudy/briefs/2026-11-27-avegee-fb3-twalk.md` — ท่าเดิน 6 ตัว + ฉากเดินเข้า เซเวอริน/อาร์คอน-ศูนย์
4. **T11 ซิมสมดุล** `Output/Claudy/briefs/2026-11-27-avegee-fb3-t11-balance.md`
5. ทีหลัง: หุ่นซ้อม H4 · มินิเกม 4 อาคาร · เดินแผนที่ย้อนจริง

## รอคุณเป้
- ลองเล่น: เสียง restore · แรงท่าประสาน · ศึกปลดปล่อยระลอก 2 ถึง `z1-restored` · มินิเกมลูกไฟบนมือถือ
- อนุมัติแบบลูซิเฟอร์ (C3) · หัวนาค/ยอดเสาในห้องโซน 1 ไม่บังตัวละครแล้ว (ถ้าต้องการให้บังต้องวาดชั้นหน้าใหม่) · ข้อตัดสินท้ายบท R2 A–D (ค้างจาก 20 พ.ย.)

เมื่อ Claude กลับมา: ต่อท้ายไฟล์นี้ (บนสุด) ว่าทำอะไรไป commit อะไร ค้างอะไร
