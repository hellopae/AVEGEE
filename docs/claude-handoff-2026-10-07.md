# ส่งต่องาน AVEGEE ให้ Claude — 7 ตุลาคม 2026 (Asia/Bangkok)

บันทึกนี้เป็นสถานะล่าสุดจาก Codex ก่อน reset บทสนทนา อ่านไฟล์นี้ก่อนข้อมูลส่งต่อวันที่ 4 ต.ค. เพราะสถานะและสิทธิ์ push เปลี่ยนแล้ว

## Repository และการส่งขึ้นเว็บ

- Workspace: `/Users/agapae/Documents/Work PAE/Claude/AVEGEE`
- Branch ที่ทำงาน: `codex-app/2026-10-04`
- Remote: `https://github.com/hellopae/AVEGEE.git`
- ผู้ใช้อนุญาตให้แก้แล้ว push ได้เลย ปัจจุบัน push แบบ atomic ไปทั้ง `main` และ `codex-app/2026-10-04` แล้ว ข้อความเก่า “ห้าม merge main / push branch เท่านั้น” ไม่ใช่สถานะล่าสุด
- Runtime commit ล่าสุด: `c8141bc` ภาพข่มขู่ v4 ทั้ง 4 ชุดขึ้น GitHub Pages แล้ว ตรวจ SHA256 ไฟล์สาธารณะ 7 ไฟล์ตรงกับ workspace
- อย่าใช้ `git add .` มีไฟล์ของผู้ใช้ถูกลบ/เพิ่มใน `Exam/` และไฟล์งานอื่นค้างอยู่ ไม่เกี่ยวกับงานนี้ ให้ stage เฉพาะไฟล์ที่แก้เอง

## งานที่ทำและ push แล้ว

1. `4c45c91` — ธีมภาพภายนอกแต่ละโซนให้เข้ากับภาพภายใน, ข้อความ preload ใช้เรื่องเรือข้ามฟาก, สูตรความแรงให้อ่านง่าย, ปรับตำแหน่งสถานที่โซน 4 ตามคำขอ รายละเอียดดู commit และ `img/theme-v4/README.md`
2. `158e557` — สไปรท์ท่าฟันดาบ Yama ครบ 4 ชุด ใช้โจมตีธรรมดาและฝึกป่าดาบ
3. `ee771c6` — ผู้ใช้เห็นท่าดึงดาบเข้าออก จึงวาดลำดับใหม่เป็นยกดาบ → ฟันลงในทิศเดียว → ค้างปลายต่ำ → คืนท่า ทั้ง 4 ชุด พร้อมจังหวะ 8 เฟรมรวม 580 ms ทดสอบ Node ทั้งชุด 469/469 และตรวจ browser จริง ทั้งต่อสู้/ฝึก/พักและกลับมาฝึก ครบ 4 ชุด
4. `ff35da7` — แก้โซน 1 ที่หน้าเหลียวซ้ายตอนจบ ให้เฟรมเตรียมและคืนท่าหันขวา เก็บช่วงฟัน 6 เฟรมเดิมแบบ pixel-for-pixel ผู้ใช้ยืนยันว่าท่าฟันโอเคแล้วก่อนขอแก้ทิศ
5. `c8141bc` — ลดความอลังการภาพพลังเริ่มต้น “ตวาดข่มขู่” ทั้ง 4 ชุด เป็น close-up ใบหน้าขู่และออร่าหัวเสือด้านหลัง ตัดวงคลื่น ระเบิด หินลอย และฉากมหากาพย์ อัปเดตระบบเลือกภาพตามชุดและ preload ตรวจ 6 tests ผ่าน และตรวจไฟล์สดแล้ว **แต่ชุดโซน 1 และ 4 ยังต้องแก้ตามข้อทักท้วงล่าสุดด้านล่าง**

## งานค้างล่าสุดที่ผู้ใช้แจ้ง — สำคัญ

ผู้ใช้ดูภาพข่มขู่ v4 แล้วบอกว่า “เหมือนชุดของโซน 1 และ 4 จะไม่ตรงครับ” ยังไม่ได้แก้ชุดสองภาพนี้ ก่อนผู้ใช้ขออัปเดตให้ Claude และ reset

ให้แก้เฉพาะชุดในภาพข่มขู่โซน 1/4 โดยใช้ตัวละครที่เกมใช้จริงเป็น reference แทนภาพ cutscene v3 ที่รายละเอียดคลาดเคลื่อน:

- โซน 1 reference: `img/hero-yama.png` — ชฎาทองทรงเรียว เสื้อดำขอบทอง ด้านใน/ผ้ากลางแดง คอเสื้อแดง ชุดเรียบ ไม่ใช่บ่าเกราะใหญ่หรือสายคาดอกอลังการ
- โซน 4 reference: `img/CyberHell/hero-yama-cyberhell.png` — หมวกดำม่วงทรงเฉพาะมีปีกหน้าตรงกลาง เสื้อคลุมดำม่วงขอบลายเรียบ คอ/ผ้าขอบเทา ไม่ใช่ชุดบ่าเกราะ/เสื้อแดงแซมดำ
- ภาพแก้ปัจจุบัน: `img/hero-yama-th-roar-cutscene-v4.png`, `img/hero-yama-cyberhell-roar-cutscene-v4.png`
- คง close-up หน้าขู่ ออร่าเสือด้านหลัง และลดความอลังการตามคำขอ ไม่กลับไปแบบระเบิดยักษ์เดิม
- โซน 2/3 ไม่มีข้อทักท้วงเรื่องชุดตอนนี้
- งานแก้ชุดยังไม่มี commit และยังไม่ได้เรียก imagegen รอบแก้ชุด

## จุดเชื่อมระบบ / ไฟล์อ้างอิง

- `src/power-cutscene-assets.js`: `powerCutsceneImage()` ใช้ outfit เป็นหลัก; roar ใช้ v4 ส่วน hypno/mirror/fire ใช้ v3
- `src/ui.js`: `actionCutsceneSrc()` เรียก resolver ข้างต้น; `playActionCutscene()` ใช้ในสอบสวนด้วย
- `src/preload.js`: URL catalog ล่าสุด `?v=20261007-roar-v4`
- `scripts/make-preload-catalog.mjs`: ใช้เฉพาะภาพที่ tracked ใน git; ยกเว้น img/raw, sword v1, Thai sword v2 และ roar v3 ที่ถูกแทนแล้ว **ต้อง stage ภาพใหม่ก่อนสร้าง catalog** แล้ว stage `img/preload-catalog.json` อีกครั้ง
- `img/roar-v4-prompts.json`: final prompts; ภาพทั้งหมดสร้างด้วย built-in imagegen ไม่มี API key
- `output/roar-v4/all-outfits.jpg`: preview รวม 4 ชุด; `output/roar-v4/deployment.json`: ผลตรวจเว็บ (output ไม่ได้ commit)
- ระบบท่าดาบ: `src/yama-sword.js`, `src/yama-sword-v2-assets.js`; โซน 1 ชี้ `img/yama-sword-v3/hero-yama-th-sword.webp` อีก 3 ชุดชี้ v2
- `scripts/export-yama-sword-v2.py`, `scripts/export-yama-sword-facing.py`: export/align generated pixels ไม่ได้วาดรูปด้วย Python
- Preview ดาบที่แก้ทิศแล้ว: `output/yama-sword-v3/all-outfits.gif`
- Training actor ID ของ Yama: `global:yama` (`HERO_TRAINING_ID`) ไม่ใช่ `you`

## การตรวจที่เหมาะกับงานถัดไป

หลังแก้ชุด: ดูภาพเทียบ canonical sprites ด้วยตา, ตรวจ resolver เลือกภาพทั้ง 4 ชุดและไฟล์มีจริง, `node --test tests/power-cutscene-assets.test.mjs tests/asset-preload.test.mjs`, `git diff --check` แล้ว push ตามที่ผู้ใช้อนุญาต ตรวจ Pages build และไฟล์ภาพใหม่จริงก่อนบอกว่าขึ้นเว็บแล้ว

บันทึกนี้เป็นเอกสารส่งต่อใน workspace ยังไม่ได้ส่งข้อความเข้า session Claude ที่กำลังรันอยู่ การเรียก Claude CLI ครั้งก่อนวันที่ 4 ต.ค. ล้มเหลวเพราะ Not logged in ไม่ควรอ้างว่า Claude รับทราบแล้วจนมีหลักฐานตอบรับ
