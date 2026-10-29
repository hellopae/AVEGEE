# E1-v2 · 30 ต.ค. 2569

ทำต่อจาก patch ของ run `20261029T134923Z-f948baac` ใน worktree และ branch ที่ wrapper จัดไว้ (`codex/20261029T175008Z-2da7c89d`) ไม่สร้างหรือสลับ worktree/branch และไม่ commit/push/merge/deploy

นำ patch เข้าโดย `git apply --reject --whitespace=nowarn` ก่อนอ่านงานต่อ พบ reject เฉพาะ import ของ `src/ui.js` รวม import ใหม่เข้ากับ weather/tea ที่มีอยู่แล้ว และลบ `.rej` แล้ว รายงาน `preflight.md` ของ run เดิมคงไว้เป็นหลักฐานการตรวจ W2 §8 ทั้ง 12 ข้อ

## งานที่ทำ

- SIG 5 ฉาก: เหตุการณ์ `cyberSignal` → `signalTh`/`signalAsia`/`signalWest` → รับทราบ `signalClose` → `cyberFinal` ตรวจ requires ข้ามโซนและเกต entry API โดยตรง รวม pending save เก่า และคงศาลบอสที่เริ่มพิพากษาแล้ว; เคสโซนเดิมไม่เพิ่มตัวนับคดีไซเบอร์
- เหยื่อ SIG ไม่ขึ้นศาลบอสซ้ำ ledger ของมิตรเดิมยังอยู่; ทางเลือกก่อนศึกเก็บใน save ใช้ fallback สองทางที่ W2 อนุญาต: เรียกคำฝากข้ามเทิร์นบอสแรก หรือบุกทันทีได้เบี้ยเพิ่ม 25%; ไม่เพิ่ม signalTraced
- ใช้ภาพคัตซีน 10 ภาพและบอส 3 โซนใน `img/story-sig/` ผ่าน story/arena/frontier และลง manifest ครบ 13 ไฟล์ โทรจัน-9 ใช้ sprite เดิมกับเส้นสแกนมิ้นต์ รวมกรณีบอสยืนเดี่ยว
- Side quest W2 ครบ 8 เควส + สำนวน 8 id แยกจากกองสุ่มและ Asia recycle; บันทึกขั้น/ทางเลือก/ผลตัดสิน/รับรางวัลครั้งเดียว; ความลับ private ใช้กระจกหรือสะกดจิตเพิ่มกรรม 6 ครั้งเดียวเมื่อยังไม่เคยเปิด; แก้ reward เศษดาบให้เป็น item จริง `bladeShard`
- ใช้ fallback EXP ผู้ช่วย/ยักษ์ +30 เป็นห่อเสบียง ×2 ตาม W2 §8.10 เฉพาะทางที่ระบุได้ EXP ผู้ช่วย; EXP ยามา +30 ยังคงเดิม ไม่มี API ให้ EXP ผู้ช่วยตรงที่เหมาะกับ flow นี้
- มีสถานะ completed ที่เล่นต่อได้ เดินเมืองและใช้เรือกลับโซนเก่าได้ พร้อมภารกิจและป้องกันเปิดศึกสุดท้ายซ้ำ Side quest W2 พักระหว่าง finale พร้อมข้อความ “ไว้หลังเรื่องนี้จบ”; เควสญาติ W3 เปิดต่อระหว่างพักบนแผนที่ศึกสุดท้ายได้
- W3 ครบพ่อค้า 3 ฉาก: asia นับเวลาเกมเดิน 90 วินาทีตั้งแต่การมาถึง ไม่ผูกคดีแรก แผงคลุมผ้าและปิดซื้อ/ขายจนมาถึง; west/cyber คงเหตุการณ์ช่วยตัวประกันเดิม แล้ววิ่งจากจุดช่วยไปแผง ใช้เส้นทางเดินได้และ sprite พ่อค้าคนเดิม; เซฟเก่าที่ผ่านแล้วไม่เล่นฉากย้อนหลัง
- W3 เควสญาติ 8 คู่และบทสนทนาข้ามโซน 34 รายการ เก็บธงคุยครั้งเดียว มีเงื่อนไข guard หลังเหตุแวมไพร์; ทดสอบเควสญาติด้วย moveZone/เรือจริงและสองทางเลือก
- คู่มือทั้งสองทางมีประวัติ 43 ตัวละคร + ข้อความกรอบเรื่องแต่ง S0 เต็มเป็นรายการแรก และข้อความวงศ์เดียวกัน คนละยุค เวลาในนรกไม่เรียงตามปี คงภาพเกรซผู้หญิงจาก main
- รวมกับระบบ soul poses ที่เข้ามาใหม่โดยลงประเภทสำนวนใหม่ 8 คดีอย่างชัดเจน ไม่สร้างหรือเปลี่ยนภาพเดิม; bump import-map และ UI entry เป็น `20261030-e1-v2` เฉพาะไฟล์ที่แก้

## การตรวจ

Node `v26.7.0` ไม่เปิด browser ตาม brief ไม่ได้ตรวจภาพ/การกดจริงใน browser และไม่ได้ประกาศผล QA

- ชุดรวมก่อนรันเต็ม: `node --test tests/e1-signal-quests.test.mjs tests/soul-poses.test.mjs tests/p2-interrogation.test.mjs tests/b3-progression.test.mjs tests/g4-items-balance.test.mjs tests/ui27d-map-items.test.mjs` — 82 pass, 0 fail (`tests-e1-integration-final.log`)
- ตรวจ syntax ด้วย `node --check` 31 ไฟล์ที่แก้/เพิ่ม; ตรวจ import-map ครอบคลุม source ที่เปลี่ยนทั้งหมด และ `git diff --check` ไม่มี whitespace error หรือ `.rej`
- ชุดเต็มรันครั้งเดียว: `node --test --test-concurrency=4 tests/*.test.mjs` — 251 ไฟล์, 1,708 tests, 1,700 pass / 8 fail, exit 1, 316.6 วินาที ดู `tests-full-v2.log` และ `tests-full-v2.exit.txt`
- แก้หลังรอบเต็ม: (1) อย่าล็อก phase justice ที่มีบอสถูกจับแล้ว และให้ ledger ศาลบอสเป็นหลักฐานว่าเซฟเก่าเคยสู้ finale จริง แม้ไม่มี wave counters (2) เติม SIG prerequisite ใน fixture C1 (3) ลงทะเบียนภาพ SIG ทั้ง 13 ไฟล์ใน manifest พร้อม profile fallback และ cache version (4) ให้เทสต์ G3b แยกอีเวนต์ SIG ที่เพิ่มใหม่ (5) ให้ checksum MAP-Z4 normalize เฉพาะ import/เกต/การต่อรายการ SIG และ classifier ที่เพิ่ม โดยยังใช้ hash baseline เดิมตรวจ geometry และ byte อื่นทั้งหมด
- รันซ้ำเฉพาะไฟล์ที่ล้มเหลวและ regression ที่เกี่ยวข้อง 15 ไฟล์: **154 pass / 0 fail** (`tests-after-full-final.log`) รวม legacy court regression ที่เพิ่มอีก 1 ข้อหลังชุดเต็ม คำสั่ง: `node --test tests/e1-signal-quests.test.mjs tests/boss-justice.test.mjs tests/c1-combat-skills.test.mjs tests/enemy-art.test.mjs tests/g3b-frontier-challenge.test.mjs tests/map-z4-terrain.test.mjs tests/b2b-final-event.test.mjs tests/e5-events-z4.test.mjs tests/clock-item.test.mjs tests/final-gauntlet.test.mjs tests/b2-team6.test.mjs tests/story-art.test.mjs tests/zone-travel.test.mjs tests/art-grace-f.test.mjs tests/soul-poses.test.mjs`
- ผลทดสอบ manifest/preload/startup หลังเพิ่มรายการภาพ: **15 pass / 0 fail** (`tests-after-manifest.log`) คำสั่ง: `node --test tests/asset-preload.test.mjs tests/town-startup.test.mjs tests/h1-preload-tiers.test.mjs tests/load01b-perf.test.mjs`
- ตรวจขั้นสุดท้าย: `static-final.log` — syntax 31 ไฟล์, import-map ของ source ที่เปลี่ยน, manifest SIG 13 ภาพ, whitespace และไม่มี `.rej`

## Self-check เกณฑ์รับงาน

1. ลำดับ SIG / เกต cyberFinal / เควสเริ่ม-จบ-รางวัลครั้งเดียว / เล่นหลังจบเกม / id ไม่ซ้ำ / เซฟเก่า: มี automated tests ครบ รวม API ตรง, การแพ้แล้วโหลด, pending/active/completed, รางวัลสองทาง, การเดินจริง และเรือจริง ดู `tests/e1-signal-quests.test.mjs` และผลรวมข้างต้น
2. **ยังยืนยัน “ชุดเต็ม 0 fail” ไม่ได้**: รอบเต็มครั้งเดียวพบ 8 fail แก้ครบแล้วและรันทดสอบไฟล์ที่ล้มเหลวพร้อม regression ได้ 154/0 และ preload ได้ 15/0 ไม่รันชุดเต็มครั้งที่สองตาม brief รายงานและ log ครบในโฟลเดอร์ที่กำหนด
3. W3: โค้ดครบพ่อค้า 3 ฉาก / ญาติ 8 เควส / บทข้ามโซน 34; ไม่มีรายการเนื้อหา W3 เลื่อนไปทำภายหลัง แต่การตรวจด้วย browser ยังไม่ได้ทำ

## ไฟล์ที่แก้/เพิ่ม

- `img/manifest.json`
- `index.html`
- `src/art.js`
- `src/breach-approach.js`
- `src/cases.js`
- `src/data.js`
- `src/e1-content.js`
- `src/frontier.js`
- `src/game.js`
- `src/proximity.js`
- `src/quest-cases.js`
- `src/remorse.js`
- `src/scene.js`
- `src/side-quests.js`
- `src/signal-arc.js`
- `src/soul-poses.js`
- `src/story.js`
- `src/talk.js`
- `src/ui.js`
- `tests/b2-team6.test.mjs`
- `tests/b3-balance.mjs`
- `tests/b3-progression.test.mjs`
- `tests/balance28b.test.mjs`
- `tests/breach-march29c.test.mjs`
- `tests/c1-combat-skills.test.mjs`
- `tests/e1-signal-quests.test.mjs`
- `tests/e5-events-z4.test.mjs`
- `tests/final-event-helpers.mjs`
- `tests/g3b-frontier-challenge.test.mjs`
- `tests/g4-items-balance.test.mjs`
- `tests/map-z4-terrain.test.mjs`
- `tests/p2-interrogation.test.mjs`
- `tests/ui27d-map-items.test.mjs`
- รายงานและผลทดสอบใน `output/coordination/2026-10-29-e1/`
