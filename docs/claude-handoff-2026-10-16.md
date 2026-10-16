> Update: Codex completed handoff items 2–5 in the night-city/map-polish releases. All five old failing tests now pass; integrated suite 996/996. See [current handoff](claude-update-2026-10-16.md). Items below are retained as original context.

# Claude → Codex app handoff, 16 ต.ค. 2569 ~00:05 (Claude ใกล้ชนลิมิต — คุณเป้สั่งส่งงานให้ Codex)

main ตอนเขียน = `1b7ab52` → อัปเดต 00:30: `a511143`+ · ทำตามลำดับ · `git pull` ก่อนเริ่มและก่อน push ทุกครั้ง · `node --test tests/*.test.mjs`
ใบงานต้นฉบับทั้งหมดอยู่ใน `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Claudy/briefs/2026-10-15-avegee-*.md` · คิวรวม `.../2026-10-15-avegee-l-queue.md`

## ขึ้น main แล้ววันนี้ (ฝั่ง Claude)
K2 เมนูเอียง · K3 60fps · K4 ลบปุ่มซูม · K1d แผนที่ภาพวาดใหม่ · K5 เมนูไม่บังศัตรู · K1e ปาล์ม/โคมทอง/ต้นแดง/ต้นหิมะ (คบไฟใช้เสาไฟไทยของ Codex) · L4a ดาบอสิปัตตะ · L4b ไอคอนชุด ·
L3 ปุ่มพักยมทูต + สะกดจิตเป็นรางวัลบอสชายแดนโซน 3 (ริบจากเซฟเก่าที่ยังไม่ชนะ) · L1 เงา `src/town-shade.js` (`SUN`) + ตัวละครโซน 1 เล็กลง 25% + นิราบนแท่นพิพากษา ·
L2 ป้องกัน (โล่ x0.5)/หนี (หน้าต่างยืนยัน, `g.fleeBattle`, `openFleeConfirm`)/ตัวที่ถึงเทิร์นไม่ทับ/ตัดกล่องคำแนะนำทั้งหมด/สอบสวนรูปที่เลือก/พลังเวท/pause ไม่มีขอบทอง/เอฟเฟกต์เติมเลือด `src/heal-fx.js`

## งานที่ส่งต่อให้ Codex (เรียงลำดับ)
1. ~~merge L5~~ — **เสร็จแล้ว** Claude Dale merge ที่ `a511143` (Pages built) ไม่ต้องทำซ้ำ · main ตอนนี้มี L1/L2/L3/L5 ครบ · เทสต์แดงเหลือ 6 ข้อ (ข้อ 5)
2. **ปรับแสงโซน 1 ที่ค้าง** (งานของ Codex เอง) → push · ทิศเงาของ Claude อยู่ที่ `SUN` ใน `src/town-shade.js` ให้ตรงกัน
3. **L1b เคลียร์พื้นใต้อาคาร/ต้นไม้ที่วางบนแผนที่** — ใบงาน `.../briefs/2026-10-15-avegee-l1b-map-clear.md`
   มาสก์ล่าสุด (รวมเสาไฟ 10 ต้นของ Codex): `/Users/agapae/agapae-work/backup/avegee-l1-clear-mask-v2/` (สคริปต์ `scripts/l1-clear-mask.py` สร้างใหม่ได้ถ้าผังเปลี่ยน) · ภาพแผนที่ต้นฉบับ `/Users/agapae/agapae-work/backup/avegee-k1b-map-v2-2026-10-15/zone1-terrain-v2-full.png`
4. **L2b ไอคอน** — ใบงาน `.../briefs/2026-10-15-avegee-l2b-ui-icons.md`: `img/ui/icon-defend-shield.png` 128 (แทนโล่วาดด้วยโค้ดของ L2) + `img/ui/alert-mark.png` 64 (แทน ❗ ตัวอักษรของ L5 — ทำหลังข้อ 1)
5. **เทสต์แดงบน main** — `.../briefs/2026-10-15-avegee-codex-app-test-failures.md` (เกิดหลัง `acc9c43`/`69ed45e`/`8f82178`; ฝั่ง Claude แก้ regex cache-token ไปบางข้อแล้ว — รันใหม่บน main ล่าสุดก่อน): I1-A กระจก/ท่า atk, construction two builds, F1/F3 + h5b cache-bust
6. (ถ้าเหลือเวลา) **ข้อความไทยใหม่ของ L2** (หน้าต่างหนี/ตั้งรับ/เหตุผลหนีไม่ได้) Toby ร่างไว้ — ให้คุณเป้ดูหรือรอ Rae

## ยังพักไว้
ART-02C ตรวจชายฝั่ง/ท่าเรือบนแผนที่ใหม่ — หลัง L1b · โซน 2–4 ยังไม่มีเงา/ย่อตัวละคร

## รายงานกลับ
`docs/claude-update-2026-10-16.md` ตามรูปแบบเดิม (ทำอะไร / ไฟล์ / ตรวจอะไร / ค้าง)
