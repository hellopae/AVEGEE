# Handoff AVEGEE ถึง Codex — 1 พ.ย. 2569 (ฉบับปรับ 11:55)

ฉบับนี้แทนฉบับเดิมของวันเดียวกัน ซึ่งเขียนว่า Codex จะกลับ 4 พ.ย. แต่ Codex reset แล้วเมื่อเช้า 1 พ.ย.

## สถานะตอนส่งมอบ
- `main` = `743c07c9` เท่ากับ origin · เทสต์ 1778/1778 ผ่าน (รัน 1 พ.ย. 11:58)
- Claude weekly ใช้ไป 93% กลับ **4 พ.ย. 23:00** · ระหว่างนี้ไม่มี Claude รีวิว
- work mode: `codex-only` คุณเป้สั่ง Codex app ตรง
- ไม่มี Claude agent ค้างทำงานอยู่

## กติกาสำหรับ Codex
repo AVEGEE ไม่มี `AGENTS.md` กติกาทั้งหมดจึงอยู่ตรงนี้

1. **ทำงานที่ `/Users/agapae/agapae-work/AVEGEE`** ฐาน `main` ล่าสุด
2. **อย่าใช้ clone `/Users/agapae/Documents/Work PAE/Claude/AVEGEE`** อยู่ branch `codex-app/2026-10-04` ค้างตั้งแต่ 16 ต.ค. และมีไฟล์ค้างใน working tree งานใหม่บนนั้นจะชนหนัก อย่า commit/stash/revert ไฟล์ที่ค้าง
3. อย่าใช้ worktree `.codex-worktrees/20261029T230514Z-d449356b` และ `...230615Z-bd39bd74` ทั้งคู่ไม่มี diff และฐานเก่า เริ่ม B23/B34 ใหม่จาก main
4. ขนานไม่เกิน 2 งาน · แยก branch ต่องาน `codex/2026-11-01-<slug>`
5. **Merge เข้า main เมื่อคุณเป้สั่งเท่านั้น** ตาม `AGAPAE Agent/Output/Claudy/MERGE-CHECKLIST-codex.md` และ `docs/git-push-protocol.md` · เทสต์ต้อง 0 fail · conflict ตรรกะให้หยุด รวมได้แค่ suffix `?v=`
6. เทสต์ `node --test tests/*.test.mjs` (ไม่มี `package.json`, ต้องใส่ `*.test.mjs`, macOS ไม่มี `timeout`)
7. ห้ามอ้างว่าผ่าน Reese/Chris ผลของ Codex คือ "รอตรวจรับ" · ห้ามแก้ `status.json` `worklog.json` `work-mode.json`
8. ห้ามบุคคลจริงในคดี · คดีดัดจากเรื่องจริงห้ามเพิ่มรายละเอียด · `Exam/` และ `files/` ห้ามดึงกลับ repo
9. จบแต่ละงานเขียนสรุปต่อท้ายไฟล์นี้ใน repo AVEGEE (`docs/handoffs/claude-handoff-2026-11-01.md`) เพื่อให้ Claude รับต่อหลัง 4 พ.ย.

## เสร็จแล้ว อยู่บน main
| คิว | งาน | commit |
|---|---|---|
| Q1 | ชื่อยักษ์ กุมภัณฑ์ เมซุ มูนิน ไฟร์วอลล์ · บทเทวดาขอทาน · สะกดวาลคีรี · Reese PASS | อยู่ใน Q2 |
| Q2 | คู่มือประวัติ ลบรหัส ปลดล็อกตามการพบตัว ญาติไม่บอกชื่อถ้ายังไม่เจอ | `b7a5b23e` |
| Q3 | ท่าไม้ตายล่างสุด ลบข้อความขาว หน้าต่างโรงอาหาร คนงานเท่ายามา HUD ขวาล่างครบ | `d3c58219` |
| Q4 | นิราไม่ซ้อนยามา ศัตรูไม่ขวางทาง ศัตรูเดินไปมา mask เรือ บอสโซน 4 ออกจากท่าเรือ ศาลา ×1.5 พ่อค้าโซน 4 โรงอาหารย้ายครบ 4 โซน | `4e9879b2` |
| Q5 | เงาเมฆทุกแผนที่ หิมะ+หมอกโซน 3 ฝน+ฟ้าผ่าโซน 4 ค่าอยู่ที่ `MAP_FX` | `f97a9866` `4e80e31a` |
| Q6 นำร่อง | ชั้นบังหน้า หอสะพานทองสองหลังใน `th:asia` | `545ef8f8` |
| แก้ตามคุณเป้ 1 พ.ย. | เงาเมฆจางลง โน้ตท่าไม้ตายสั้นลง ทีมพุ่งช้าลง โรงอาหารโซน 4 ต่ำลงและกลับด้าน | `743c07c9` |

งานก่อนหน้าที่รวมแล้วด้วย: Z4-TOWN-A-v2 `c685330f` · B12-FX-v2 `73f52877` · B34 `a957f838`

## ยังไม่เสร็จ เรียงตามลำดับที่ให้ทำ
ใบงาน: `AGAPAE Agent/Output/Claudy/briefs/2026-11-01-avegee-codex-queue.md` ยกเว้นข้อที่ระบุไฟล์เอง

| ลำดับ | งาน | ใบงาน | เงื่อนไข |
|---|---|---|---|
| 1 | B23-REDRAW แผนที่ชายแดน 2-3 ×2 | `briefs/2026-10-30-avegee-b23-redraw.md` | ขนานกับข้อ 2 ได้ |
| 2 | B34-REDRAW แผนที่ชายแดน 3-4 ×2 | `briefs/2026-10-30-avegee-b34-redraw.md` | ขนานกับข้อ 1 ได้ |
| 3 | ART-CANTEEN โรงอาหาร 4 โซน | queue | |
| 4 | ART-DAIS2 แท่นตัดสินโซน 2 | queue | |
| 5 | ART-ULT-ICON ไอคอนประสานพิพากษา | queue | |
| 6 | ART-MOB-WALK เฟรมเดินศัตรู 17 ตัว | queue | ทำทีละชุดโซน |
| 7 | CAVE-12 ถ้ำชายแดนโซน 1-2 | queue | วาด + โค้ด |
| 8 | OCCLUSION-EXPAND ชั้นบังหน้าที่เหลือ | queue | หลังข้อ 1-2 merge |
| 9 | W4-DRAFT ร่างบทเรื่องราวใหม่ 4 โซน | `briefs/2026-11-01-avegee-w4-story.md` | ยังไม่ลงโค้ด |
| 10 | ART-W4 ตัวละครใหม่ | queue | ยังไม่เสียบเข้าเกม |

เหตุที่ลำดับต่างจากฉบับเดิม: งานวาดมีแต่ Codex ทำได้ และทำจบเข้าเกมได้เลย ส่วน W4 ลงเกมไม่ได้จนกว่า Reese ตรวจ

## รอ Claude หลัง 4 พ.ย. 23:00 (Codex ไม่ต้องทำ)
- W4 ยังไม่เริ่มเลย ไม่มีบทของ Rae สักโซน · Claude ตรวจร่าง Codex ผ่าน Reese แล้วจึงให้ Toby/Codex ลงโค้ด
- หลังลงโค้ด W4 ต้องจูนสมดุลใหม่ เพราะศึกสุดท้ายย้ายจากคดี 10 เป็น 15

## รอคุณเป้ดูในเกม
- ข้อความขาวท่าไม้ตายหายจริงบน Brave
- ตำแหน่งพ่อค้าโซน 4 อาจคลาดราว 40 หน่วย
- FPS มือถือจริงหลังเพิ่มเอฟเฟกต์ ถ้ากระตุก ให้ทำหิมะ/ฝนเป็นกระเบื้องสำเร็จแล้วเลื่อน

## branch เก่าที่ไม่ต้องสนใจ
`codex/20261028T163139Z-9e572efc` `20261028T164031Z-262e083a` `20261029T023509Z-020aec7e` `20261029T034756Z-bcc51097` ไม่อยู่บน main แต่งานถูกทำซ้ำรอบ v2 และรวมแล้ว **อย่า merge**

## Codex 1 พ.ย. 2569 — B23-REDRAW (รอตรวจรับ)

- Branch `codex/2026-11-01-b23-redraw` · worktree `/Users/agapae/agapae-work/AVEGEE/.codex-worktrees/2026-11-01-b23-redraw` · ฐาน `a2cd7069`
- ภาพใหม่ 3344×1882 + walk mask ที่เป็นผืนเดียว + zoom/HUD เดิม + flow trace ตามภาพ + foreground จากภาพจริง
- รักษาถ้ำหัวหน้าโซน 2 ที่ [.55,.72] และ owner stair connection; น้ำตก 4 จุดเก็บเป็น author anchors แล้วใช้ flow ตามวัสดุบนภาพใหม่แทนแถบสี่เหลี่ยมเดิม
- ความกว้างรวม p10 58.14, median 74.97 px; ทุกช่วงผ่านเกณฑ์ 40/48 และ off-floor 0
- Full suite 1786/1786 ผ่าน, 0 fail; native input/zoom/HUD ที่ 390/1280 ผ่าน
- รายละเอียด/ภาพก่อน–หลัง/overlay/log/prompt: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-b23-redraw/README.md`
- ยังรอตรวจรับภาพใน browser และ FPS มือถือจริง; ไม่อ้างผ่าน Reese/Chris
- ไม่มี commit/push/merge และไม่ได้แตะ status.json, worklog.json หรือ work-mode.json
- B23/B34 แยก branch/worktree; คุณเป้ย้ำให้รายงานและคอนเฟิร์มก่อน merge งานอื่นใน queue ยังไม่เริ่ม

## Codex 1 พ.ย. 2569 — B34-REDRAW (รอตรวจรับ)

- Branch `codex/2026-11-01-b34-redraw` · worktree `/Users/agapae/agapae-work/AVEGEE/.codex-worktrees/2026-11-01-b34-redraw` · ฐาน `a2cd7069`
- ภาพใหม่ 3344×1882 + walk mask ที่เป็นผืนเดียว + zoom/HUD เดิม + flow trace ตามภาพ + foreground จากภาพจริง
- เลิกวาด tree sprites 28 ต้น; ต้นไม้วาดผสานในภาพตามรากเจ้าของ 28 จุด เก็บพิกัด/ชนิดต้นฉบับเป็น bakedTrees; ทางแยกขึ้นเหนือยังปิดทั้งในภาพและ collision
- ความกว้างรวม p10 44.27, median 61.74 px; ทุกช่วงผ่านเกณฑ์ 40/48 และ off-floor 0
- Full suite 1782/1782 ผ่าน, 0 fail; native input/zoom/HUD ที่ 390/1280 ผ่าน
- รายละเอียด/ภาพก่อน–หลัง/overlay/log/prompt: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-b34-redraw/README.md`
- ยังรอตรวจรับภาพใน browser และ FPS มือถือจริง; ไม่อ้างผ่าน Reese/Chris
- ไม่มี commit/push/merge และไม่ได้แตะ status.json, worklog.json หรือ work-mode.json
- B23/B34 แยก branch/worktree; คุณเป้ย้ำให้รายงานและคอนเฟิร์มก่อน merge งานอื่นใน queue ยังไม่เริ่ม

## Codex 1 พ.ย. 2569 — อนุมัติรวม B23/B34 และเผยแพร่

- คุณเป้อนุญาตใช้แพตช์แก้ conflict ที่เสนอ และอนุญาต push ไป GitHub `hellopae/AVEGEE` สาขา `main` อย่างชัดเจนแล้ว
- ใช้ไฟล์แก้ที่เสนอครบ5ไฟล์: เก็บ import/row/mask/เทสต์ของทั้ง B23/B34, รวม cache suffix และ handoff; ไม่มี conflict ค้าง
- Full suite ของต้นไม้รวม1790/1790,0fail; syntax160/160 และ diff-checkผ่าน
- หลักฐาน integrationอยู่ `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-b34-redraw/tests-merged-b23-b34.log`; ผลpush/Pagesและcommitสุดท้ายให้ดู MERGE-LOG.md ใน Output/Codex
- งานอาร์ตอื่นที่ทำตามคิวยังคงแยกbranchรอตรวจ; ไม่ได้รวมในแพตช์แผนที่นี้ รายงานคิวอยู่ `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/QUEUE-PROGRESS-2026-11-01.md`

## Codex 1 พ.ย. 2569 — ART-CANTEEN (รอตรวจรับ)

- Branch `codex/2026-11-01-art-canteen` จาก `6f2328b8`; วาดโรงอาหารโปร่งใสใหม่ครบ4โซน ชื่อเดิม 768×640
- ภาพใหญ่ขึ้น8% โดยฐาน/ประตู/พ่อค้า/collision layout เดิม; วัด alpha foot ให้ฐานอาคารติดจุดเดิม; zone4 ยังกลับด้าน
- ภาพก่อน–หลังจาก scene.render จริงครบ4โซน (native canvas ไม่ใช่ browser); โรงอาหารและพ่อค้าเดินถึงหลังโหลดภาพจริง
- food-a/z4-town-a 19/19; full suite 1786/1786,0fail
- หลักฐาน `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-art-canteen/README.md`
- ยังไม่commit/push/merge; รอเจ้าของกลับมาตรวจ; คิวถัดไป ART-DAIS2

## Codex 1 พ.ย. 2569 — ART-DAIS2 (รอตรวจรับ)

- Branch `codex/2026-11-01-art-dais2` จาก `6f2328b8`; วาดแท่นเอเชียเป็นมุมตรงสมมาตร บันไดกลาง ธีมหลังคาหยก/เสาแดงเดิม
- ไฟล์ชื่อเดิม1536×1024; ฐานแท่นและคิวเดิม; ปรับเฉพาะเอเชีย throne [1862,944], นิรา home [1938,968] stage [1914,956,1956,982] ตามพื้นภาพใหม่
- เทียบ4โซนและก่อน–หลังด้วย native scene.render พร้อมพญายม/นิรา; ไม่ใช่ screenshot browser
- targeted120/120; full1786/1786,0fail; ไม่อ้าง Reese/Chris
- หลักฐาน `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-art-dais2/README.md`
- ยังไม่commit/push/merge; ART-ULT-ICON และเฟรมเดินศัตรูโซน1กำลังทำ

## Codex 1 พ.ย. 2569 — ART-ULT-ICON (รอตรวจรับ)

- Branch `codex/2026-11-01-art-ult-icon`; วาดประสานพิพากษาเป็นยามาสั่ง/เพื่อน3คนพุ่ง/ดาบปิดท้าย ชื่อเดิม256×256 โปร่งใสนอกวงกลมแดง ไม่มีตัวอักษร
- เทียบไอคอนข้างเคียงที่40/32px; ไม่แก้โค้ดหรือstory
- Full1786/1786,0fail; ไม่อ้าง Reese/Chris; ยังไม่commit/push/merge
- หลักฐาน `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-art-ult-icon/README.md`
- เฟรมเดินศัตรูโซน1กำลังทดสอบท้ายงาน คิวโซน2ต่อ

## Codex 1 พ.ย. 2569 — ART-MOB-WALK โซน1 (รอตรวจรับ)

- Branch `codex/2026-11-01-art-mob-walk-th`; วาดครบ6ตัว pret/pret2/werewolf/krahang/pop/tanee
- PNG2048×512,4เฟรม×512,โปร่งใส,หันขวา,ฐานล่างคงเดิม; กระหัง/ตานีลอยโยก; ลงENEMY_WALK_ARTแล้ว
- ตรวจโหลดPNGจริงผ่านdrawCrewWalk24crop phasesและpivot; pixel tests7/7, native/Q4/scale18/18, full1793/1793,0fail
- หลักฐาน `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-art-mob-walk-th/README.md`
- ไม่อ้างReese/Chris/มือถือจริง; ยังไม่commit/push/merge; ชุดเอเชีย4ตัวกำลังทำต่อ

## Codex 1 พ.ย. 2569 — ART-MOB-WALK โซน 2 (รอตรวจรับ)

- Branch `codex/2026-11-01-art-mob-walk-asia`, ฐาน local main `6f2328b8`; ยังไม่ commit/push/merge
- วาด walk strip ใหม่ครบ 4 key: mob-gaki, mob-kasha, mob-nukekubi, mob-hitodama; 2048×512 RGBA, สี่เฟรมหันขวา; ตัวลอยไม่เพิ่มร่างกาย/ขา
- เปิด key และ cache version ของ registry; native ตัววาดเกมตรวจครบ 16 crop phases และฐานคงที่
- เทสต์เฉพาะ 5/5; full หลังแพ็กสุดท้าย 1791/1791, 0 fail; syntax/diff-check ผ่าน
- รายงาน/ภาพก่อนหลัง/ลูป/สคริปต์/ผลทดสอบ: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-art-mob-walk-asia/README.md`
- รอเจ้าของตรวจในเกมจริง ไม่อ้างผล Reese/Chris; ไม่แตะ status.json/worklog.json/work-mode.json

## Codex 1 พ.ย. 2569 — ART-MOB-WALK โซน 3–4 (รอตรวจรับ)

- Branch `codex/2026-11-01-art-mob-walk-west-cyber`, ฐาน local main `6f2328b8`; ยังไม่ commit/push/merge
- ครบ7key skeleton/bot/bug/worm/cyber-guard/cyber-lancer/cyber-brute; PNG2048×512 สี่เฟรมหันขวา ใช้สเกลเดียวต่อชุด/ฐานคงที่; ไม่มีขาเพิ่มให้หนอน
- แพ็กจากตัวละครทั้งตัว ไม่ตัดอาวุธตามเส้นช่อง; อสูรค้อนแก้กรอบด้วยimage_genก่อนเลือกไฟล์สุดท้าย
- Nativeตัววาดเกมตรวจครบ28 crop phases; เทสต์เฉพาะ8/8; full1794/1794,0fail; syntax/diff-checkผ่าน
- รายงาน/ภาพ/ลูป/ผลทดสอบ: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-art-mob-walk-west-cyber/README.md`
- ART-MOB-WALK ครบ17ตัวใน3branchแล้ว ยังไม่รวมregistryทั้งหมดหรือmergeงานใหม่; รอเจ้าของตรวจ ไม่อ้างReese/Chris

## Codex 1 พ.ย. 2569 — รวมงานอาร์ตตามอนุมัติล่าสุด

- คุณเป้สั่ง “งานที่ทำแล้ว merge ได้เลย” จึงรวม ART-CANTEEN, ART-DAIS2, ART-ULT-ICON และ ART-MOB-WALK ทั้ง3ชุด ครบ17key
- รักษา B23/B34 ที่เผยแพร่แล้ว รวม handoff ทุกงาน และต่อcache suffix; registryเก็บทุกkeyของทั้ง3โซน ไม่มีkeyหาย
- Candidate codex/2026-11-01-approved-art-merge ผ่านfull1810/1810,0fail และsyntax161/161; logภายนอก Output/Codex/tests-approved-art-merged-2026-11-01.log
- W4ยังเป็นอาร์ตรอตรวจภายนอกและร่างบท ไม่ได้ผูกเข้าระบบเนื้อเรื่องที่ยังรอReese

## Codex 1 พ.ย. 2569 — HOME START + เซฟ3ช่อง (รอตรวจรับ)

- Branch `codex/2026-11-01-home-save-slots`, ฐาน `f9a4edd3`; ไม่merge/push
- Homeปุ่มหลักSTARTหนึ่งปุ่ม เปิดselector3ช่อง ช่องว่างNew Game ช่องเดิมแสดงเวลาเล่น เงิน ระเบียบ บาป โซน และcrewที่เป็นเจ้าของทุกสาขา; ใช้ปก/โลโก้AVEGEEเดิม
- Copy-only migrationจากavegee.save.v2ไปslot1 ไม่ลบต้นฉบับ/ไม่ทับslotที่มีข้อมูล; guardก่อนเลือกslotและข้อมูลผิดรูป/storageเต็ม; restartล้างเฉพาะslotที่ยืนยัน ไม่ฟื้นlegacyกลับมา
- เวลาเล่นforegroundจริง ไม่รวมพักเอง/ออกแท็บ/ปิดเกม; legacyที่ไม่มีเวลาระบุเริ่มนับหลังอัปเดต ไม่เดาเวลาเก่า
- Full1798/1798,0fail; syntax162/162; targeted20/20และHOME+BALANCE-2 15/15; fixture7snippetpersistence-onlyย้อนกลับได้game.jsเดิมทุกbyteก่อนhashcombat ไม่แตะsimulation32k
- RealChromium cleanprofile1280×800/390×844ผ่านSTART/3cards/newslot2/reloadcontinue/legacycopy/summary25crew/no-horizontal-overflow; pageErrors=[]
- รายงาน ภาพจริง สคริปต์browser และlog: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-home-save-slots/README.md`
- ไม่แตะpunishment/effectsหรือstatus.json/worklog.json/work-mode.json; ไม่อ้างReese/Chrisตรวจ

## Codex 1 พ.ย. 2569 — เวลา/สีทัณฑ์และการแยกความแรงจากคะแนน

- Branch codex/2026-11-01-punishment-duration; ฐานmain df42fb1b
- 10/30/60/120/240วินาทีตามระดับ1–5, สีฟ้า/เขียว/เหลือง/ส้ม/แดง; คุณเป้ยืนยันเบา30วินาที
- เวลาทำงานจริง เริ่มหลังถึงสถานี,พัก/ขนส่ง/ซ่อม/ผู้คุมไม่พร้อมไม่เดินเวลา; saveเก่าคงสัดส่วน progress ไม่มีofflinecatchup; ไม่มีนับframe+managementซ้ำ
- ความแรงไม่เปลี่ยนคะแนน/บาปจากความพอดี; mirrorไม่แนะนำforceที่ได้คะแนน; remorseเลือกforceต่างกันผลเท่ากัน
- สไปรต์ห้องย้อมจริงผ่านแคช256px/สูงสุด6สีต่อภาพ; ไม่ย้อมฉาก
- Full1821/1821,0fail; syntax162; Chromiumภาพจริง5สีผ่านไม่มีpageErrors; ก่อนแก้มีtestlegacyที่คาดคะแนนความแรงและaliasเก่า แก้ตามสเปกใหม่แล้ว
- รายงานภายนอก `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-01-punishment-duration/README.md`; native fallbackdiagnosticไม่นับเป็นภาพจริง
- รวมsnippetsfixture punishment-noncombat-changes.jsonกับHOMEfixtureในBALANCE-2ก่อนตรวจชุดรวม ห้ามแก้หลักฐาน32kเดิม

## Codex 2 พ.ย. 2569 — ZONE-ATMOS

- เพิ่ม shared atmosphere ในสอบสวน/ต่อสู้ทุกโซน, TH/Asia เมฆประกอบชั้นแล้วจำกัด20%, THโคมไฟเดิม/Asiaใบไม้และแสง, Westพื้นหิมะ/รอยเท้าจำกัด96จุด อายุ6วินาที
- ชายแดนใช้projectionร่วม1.12×/follow180ms; ภาพ ตัวละคร pointer และforegroundใช้transformเดียวกัน
- targeted weather/camera/footprint45/45ผ่าน; fullและbrowserรวมตรวจต่อบนgameplay-updateก่อนเผยแพร่ ยังไม่อ้างตรวจผ่านมือถือจริง

## Codex — RECOVERY-120 (2026-11-02)

Branch: `codex/2026-11-02-recovery-120`, base `df42fb1b`. No merge or push by this task.

Downed crew now disappear from combat/map availability and occupy a real tea-room cushion for 120 wall-clock seconds. Their persistent `teaRest.recovery` record uses the existing room renderer and seat reservations. At the original deadline they return with the existing 50-morale recovery behavior. `battle.absentActors` keeps them excluded from the encounter in which they fell. Guard's battle 1-HP rule and the Yama return/sleep/wake story remain unchanged.

All roster entries, including dormant home zones, advance recovery. JSON saves preserve seat, zone, deadline, and return point. Legacy one-minute recovery deadlines receive a one-time 60-second extension, preserving elapsed time; `recoveryVersion:2` prevents repeated extensions. A full pavilion uses a non-overlapping waiting record until a cushion opens, while retaining the original recovery deadline. Existing voluntary rest remains two minutes from seated arrival and restores 100 morale.

Integration: parent must version canonical import-map destinations for `actor-recovery.js`, `tea-staff-rest.js`, `roster.js`, and `game.js`. This task intentionally does not edit index/UI. The exact `tests/fixtures/recovery-120-runtime-changes.json` snippets normalize only the three reviewed game hooks before authenticating the original combat runtime hash. Combine its normalization with HOME/punishment fixtures when integrating; do not relabel the historical 32,000-trial reports.

Validation: existing recovery/tea/BALANCE-2 targeted 28/28, new recovery cases 4/4, revised roster migration 7/7. First full suite1813/1814: sole old B1 one-minute expectation was corrected and its7 focused tests passed. Parent requested stopping redundant full rerun; final integrated full verification belongs to parent. Interrupted rerun1808pass/0fail/1cancelled is not claimed green. Full logs recorded in external task evidence. `node --check` for four changed runtime modules and `git diff --check` passed. No browser or physical-device performance claim in this task; parent owns integrated browser review.

Evidence: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-02-recovery-120/`.

## Codex — ONBOARD-FOOD (2026-11-02)

Branch `codex/2026-11-02-onboard-food`, base `df42fb1b`. No merge/push. Ownership: new `src/onboarding.js`, narrow UI court/merchant/canteen hooks, `src/canteen.js`, indoor cook rendering in `src/room.js`, outdoor cook visibility/hit filtering in `src/scene.js`, and regression tests. No game.js, sentencing guide, quest/story event, or index changes.

Explicit New Game records onboarding and removes the formerly free cauldron so the first build lesson is real. Instructions explain opening court, receiving the ferry's soul, and choosing consideration/investigation. First investigation prompts walking to the upper copper-cauldron build point; it waits for a completed usable destination. Existing/continued saves are not initialized or stripped of buildings. The hook in startPlay(fresh) is idempotent.

HOME integration: after `g.saveSlot=id;` in enterSaveSlot, add `if(fresh)beginCourtOnboarding(g);` before the first `g.save()`; keep startPlay's idempotent fallback. This ordering was checked in a detached bf021975 preview plus this feature. The very first selected-slot write already omits free krata, other slots remain untouched, and continued existing slots retain krata. Import-only merge conflicts preserve both sides (punishment/FX/HOME imports plus new onboarding/canteen imports). Existing UI export list gains openMerchant/openStation; do not add duplicate export declarations.

Merchant and reachable canteen both sell ten pooled food packs through existing g.buy('food',1), independently of Nira. Existing stock/inventory consumables and worker meal ordering/delivery remain separate, clearly labeled. Cook reaches outdoor entrance, walks up the actual canteen interior stairs to the counter, and cooks inside. Room-local walk progress persists; legacy already-cooking saves remain inside. Outdoor sprite and hit target disappear during the inside phase, then existing return-to-post movement resumes after final portion/cancellation. Existing paid portions/3-second preparation timing are preserved.

Validation: focused onboarding/food/travel/BALANCE-2 tests 29/29; syntax checks for five changed runtime modules and whitespace checks clean. Real clean-profile Chromium proof covers New Game instructions, actual first-investigation build prompt/walk action, merchant food purchase, and indoor cook at1280x800 and390x844, with no page errors. HOME preview additionally covers selected-slot first-write timing and Continue preserving old buildings. Parent owns final integrated full suite; no separate full claimed.

Cache/import-map filenames for parent: onboarding.js(new),canteen.js,scene.js,room.js,ui.js. Evidence and browser harness: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-02-onboard-food/`.

## Codex 2 พ.ย. 2569 — ชุดรวม START / ทัณฑ์ / อากาศ / พักฟื้น / สอนเล่น

- รวมHOME-SLOTS, PUNISHMENT-DURATION, ZONE-ATMOS, RECOVERY-120, ONBOARD-FOOD พร้อมรักษาcacheทุกaliasและอาร์ตเดิมบนmain
- ความแรง10/30/60/120/240วินาที+สีฟ้า/เขียว/เหลือง/ส้ม/แดง; คู่มือและบทสอนเลิกสอนสูตรให้คะแนนความแรงเดิม
- เกมใหม่เริ่มสอนสร้างกระทะก่อนสอบสวนและบันทึกลงslotที่เลือกตั้งแต่ครั้งแรก; Continueไม่ลบอาคาร
- ซื้อเสบียงที่พ่อค้า/โรงอาหารได้ พ่อครัวเข้าไปทำงานในห้อง; ยมทูตล้มพักศาลา120วินาที มีsnapshot/legacy migrationและไม่กลับศึกเดิม
- Full1844/1844,0fail,0cancel; syntax192ไฟล์ผ่าน; ChromiumจริงตรวจHOME1280/390,8ฉากสอบสวน/ต่อสู้,20%เมฆ,pause/weather-off,ห้องพักฟื้น,สอนเล่น/ซื้อข้าว/พ่อครัวครบ
- หลักฐานอยู่นอกrepo Output/Codex/2026-11-02-gameplay-release; ยังไม่อ้างFPSมือถือจริงหรือผ่านReese/Chris
- คิวและข้อความคอมเมนต์ต้นฉบับอยู่docs/queues/2026-11-02-active-queue.md; คิวถัดไปQUEST-OWNER แล้วW4-FOUNDATION/ทีละโซน/CAVE-12/OCCLUSION/BALANCE-W4

## Codex 2 พ.ย. 2569 — เอฟเฟกต์สอบสวนและต่อสู้เพิ่มเติม

- ตามคำย้ำล่าสุด เพิ่มใบไม้ไทยและลาวาเคลื่อนไหวตามmaskสีในภาพฉากจริง แยกชั้นพื้นใต้ตัวละครและตรงCSScover/background-position; เมฆTH/Asiaยัง20%
- สอบสวนและต่อสู้ใช้profileเดียวกัน: THเมฆ/ใบไม้/ลาวา, Asiaเมฆ/ใบไม้/แสง/ลาวาที่มีในภาพ, Westเมฆ/หมอก/หิมะ, Cyberเมฆ/ฝน/ฟ้าผ่า
- สองcanvasรวมไม่เกิน900000pixels; ไม่รับpointer; pause/weather-off/reduced-motion/teardownคงอยู่
- Full1847/1847,0fail,0cancel; focused32/32; Chromiumจริง16บริบท(2หน้า×4โซน×1280/390),0pageerror พร้อมตรวจลาวามีพิกเซลจริง/เมฆ.2/หยุดเวลา/ปิดอากาศ
- หลักฐานนอกrepo Output/Codex/2026-11-02-dialog-effects; ไม่อ้างFPSมือถือจริงหรือReese/Chris

## Codex — SAVE-VISUAL (2026-11-02)

Branch `codex/2026-11-02-save-visual`, base `27fb00a7`. No merge/push. Only save-slot renderer, save-slot CSS, its cache destination, and tests changed (plus this handoff).

Cards keep time/zone and exactly three choices; empty slots still say New Game. Money/order/karma use the same existing HUD icon images (`icon-coin`, `icon-justice`, `icon-skull`) in a single row, with accessible alt labels and values. Owned crew render as portraits for only the saved current zone plus global Nira, with names in alt/title. Filtering happens after saveSlotSummary: no storage, save schema, summary actors, crew ownership, or progress is removed/rewritten. Images resolve directly to existing region-specific portraits, including fixed West Boon art. West/Cyber Guard has no dedicated profile, so existing correct-region cutscenes are framed as head portraits using CSS; no new art. Seven small portrait images request synchronous decoding to avoid transient blank first paint. The custom accessible back button remains; only the duplicate auto-injected corner close is hidden within save-slots-modal.

Cache identity: `save-slot-menu.js?v=20261102-save-visual`; no other import-map aliases changed. Parent may combine index CSS/import destination with its own map changes.

Validation: focused HOME/storage/menu/regional art tests 12/12, syntax and whitespace clean. Real installed clean-profile Chromium: all four zones at390x844 and1280x800, plus TH3840x2160 (9 contexts), no page errors, all portrait/icon decodes succeed, current-region IDs only, one visible close, exactly three slots/two New Game choices, no horizontal overflow, and raw occupied save string unchanged. Screenshot review corrected close CSS specificity and awaited image decode to distinguish pending raster paint from missing art. Final Cyber Guard framing was additionally checked at390/1280 after its CSS crop adjustment. No full suite rerun here; parent owns final integrated run.

External evidence/harness/screens: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-02-save-visual/`; final Cyber screenshots under `guard-crop/`. No physical-device FPS claim.

## Codex 2 พ.ย. 2569 — รวม SAVE-VISUAL / CLOUD-RAYS ตามรูป1–3

- ช่องเซฟใช้ไอคอนHUDเงิน/ระเบียบ/บาป และรูปยมทูตเฉพาะโซนของเซฟ+นิรา; ไม่ลบactorโซนอื่นจากข้อมูล; ปุ่มปิดไม่ซ้อน
- เอาเสาไฟที่เพิ่มในห้องสอบสวน/ต่อสู้ออก (เสาไฟของแผนที่คงเดิม); เงาเมฆดำเป็นปื้นแยกมีช่องสว่าง ความเข้มสูงสุด20%ทุกโซน/ทุกบริบท
- แสงโซน2เปลี่ยนจากpolygonสามเหลี่ยมเป็นtextureลำแสงGaussianขอบฟุ้ง+ชั้นหมอก/แสงพื้น ขยับนุ่ม อ้างอิงDesktop/Exam/f1.mp4; อบภาพครั้งเดียว384×512 วาด2blit ไม่อ่านpixelsทุกframe
- Chromiumจริง:9บริบทช่องเซฟ+2cropGuardผ่าน, รูปทั้งหมดdecode/ข้อมูลเซฟไม่เปลี่ยน;16บริบทสอบสวน/ต่อสู้ไม่มีเสาไฟเพิ่มและ0error; instrumentdrawImageบนแผนที่จริงครบ4โซนยืนยันalpha.2และhashเงาเปลี่ยนตามเวลา
- Full1852/1852,0fail,0cancel โดยจำกัดconcurrency4; syntax193/193; รอบแรกdefaultconcurrencyชนtimeout30sในเทสต์Pythonรูปคนงานเดิม ตรวจเดี่ยว20/20ผ่าน ไม่ได้แก้timeoutหรือข้ามเทสต์
- คิวแทรกบันทึกในdocs/queues/2026-11-02-active-queue.md ก่อนQUEST-OWNER; หลักฐานภายนอกOutput/Codex/2026-11-02-cloud-rays และ2026-11-02-save-visual; ไม่อ้างFPSมือถือจริงหรือReese/Chris

## Codex — QUEST-OWNER engine (2026-11-02)

Branch `codex/2026-11-02-quest-engine`, base `cfe04ef5`. No merge/push. Engine/data helpers only; parent owns UI/index/manual/tracker wiring. No game.js changes or new save fields.

Non-kin step0 now targets `q.zone + q.npc` instead of the generic Cyber merchant. Dedicated sqMerchant remains its actual Asia merchant. Existing later TH reply routes (Plerng/Boon), kin from→to→from routes, unlock gates, final-arc pause semantics, case/verdict progression, choices and rewards remain unchanged. Available current-zone Nira uses her actual map feet for questNear; resting/unplaced/off-zone Nira retains the prior stable fallback. Each successful step0→1 logs `รับภารกิจ: <title>` once through existing saved logs. Acceptance still requires actual target zone/proximity; parent UI must offer actions only from current owner's conversation.

APIs:
- `questsForActor(g,npc,zone=g.zone)` exported from side-quests.js returns unlocked unfinished QUEST objects whose current questTarget matches actor kind and zone. Paused side missions remain readable; advanceQuest still blocks their actions. Kin intentionally remains available during finale, matching previous behavior.
- `activeQuestEntries(g)` exported from quest-journal.js returns pure derived entries for step>0&&!done: `{id,title,zone,npc,name,x,y,objective,paused}`. Objectives name the actual pending case and required action, later reply target, or kin delivery/return. No state initialization/mutation; no duplicate persistence model. `paused` is questsPaused(g)&&!q.kin.

Acceptance copy changes only replace merchant delivery framing with the owner handing over the existing letter (Taan/Plerng/Dam), let Guard tell his existing joke directly, and adjust Nira's arrival wording. Original authored letters remain byte-for-byte strings; every later dialogue, choice/response, case fact, kin/cross-zone/SIG narrative and award function was compared to base and remained unchanged.

Validation: focused49/49 (27 existing E1/SIG/kin/reward tests +22 new owner/journal/proximity/save tests), syntax for three changed/new modules and whitespace clean. All16 quest owner/regional-denial/title-once cases covered; generic Cyber merchant denial, pending verdict stage2, old-save active state, locks, pure helper reads, final pause behavior, kin route, later TH reply routing, Nira map position, real reload and existing once-only branch rewards pass. An old post-finale travel test assumed acceptance happened in Cyber; its roundtrip now travels Cyber→TH after Nira's TH acceptance. No browser or full-suite claim in this engine-only task; parent owns integrated UI/browser/full checks.

Cache/module filenames for parent: side-quests.js, quest-journal.js(new), e1-content.js. External evidence and16quest routing/objective matrix: `/Users/agapae/Documents/Work PAE/Claude/AGAPAE Agent/Output/Codex/2026-11-02-quest-engine/`.

## Codex — QUEST-OWNER integrated UI/release (2 Nov 2026)

- รับ16ภารกิจที่เจ้าของจริงในโซนของเขา พ่อค้ามีเฉพาะภารกิจของตัวเอง; บับเบิลคุย/โต๊ะนิรา/หมุดนัดแสดงงานของเจ้าของปัจจุบันเท่านั้น
- กดรับแล้วแจ้งชื่อเรื่องและบันทึกชื่อครั้งเดียว; ป้องกันcallbackของปุ่มเดิม/กดซ้ำข้ามstep; ถ้าไกลเกินไปยังลองใหม่หลังเดินถึงได้
- เพิ่มตัวติดตามชื่อ/สิ่งที่ต้องทำ/โซนและเจ้าของใต้minimap; จอเตี้ยใช้แผงย่อซ้ายบน; ไม่แสดงในศึก/เดินทาง
- คู่มือมีแท็บวิธีเล่นและภารกิจ (กำลังทำ/พร้อมให้ไปคุย/เสร็จแล้ว), keyboard arrows/Home/End; ดูรายละเอียดและเลือกติดตามได้ การอ่านไม่รับงานหรือรับรางวัลเอง
- ใช้sideQuestsเดิมต่อจากเซฟเก่า ไม่เพิ่มsave fields; คงunlock/kin routes/คำตัดสิน/ข้อความหลักและรางวัลเดิม; งานที่เสร็จหายจากtrackerและอ่านในbookได้
- Chromiumจริง1280×800/390×844/844×390 ผ่านคุยNPC→รับ→ชื่อยืนยัน→เรียกclickปุ่มเดิมอีกครั้งไม่ข้ามstep→tracker→book→พ่อค้าเฉพาะงานตัวเอง→ปฏิเสธรับระยะไกล→reload;0page errors ตรวจภาพด้วยตา
- แก้bubbleยาวตกขอบจอแนวนอน โดยจำกัดความสูง/เลื่อนภายในและขยับตามขอบจอ; ไม่แก้กล้องหรือwalkmask
- Full1880/1880,0fail/0cancel/0skip (--test-concurrency=4), focused94/94, syntax195/195, diffcheckผ่าน. Fullรอบแรกมี2failureเฉพาะtest harnessที่ดึงfunctionเดี่ยว:เติมimporthelperจริงในofficeVMและปรับค้นsignatureopenHelpที่รับพารามิเตอร์; assertionsเดิมคงอยู่ จากนั้นรันfullใหม่ผ่านทั้งหมด
- หลักฐาน/browser harness/screens/logsภายนอก: Output/Codex/2026-11-02-quest-owner; engine matrixที่2026-11-02-quest-engine. ไม่อ้างphysicaldeviceFPSหรือReese/Chris. คิวถัดไปW4-FOUNDATION; งานเนื้อเรื่อง/ถ้ำ/occlusion/balanceยังไม่เสร็จ

## Codex — W4-FOUNDATION integrated release (2 Nov 2026)

- เพิ่มstory-progression.js: ตารางevent/sourceแยกTH/Asia/West/Cyber และชนิดfrontier/ruler/tester/challenge/final; grantพลังเฉพาะชัยชนะsourceที่ตรง ไม่อิงlevelหรือboss sprite; rematchchallengeไม่รับพลังruler/คำชมguide
- Iceทั้งสอบสวนและต่อสู้ใช้abilities.iceจากชัยชนะบอสใหญ่West, hypnoจากชายแดนWest,mirrorจากเทวดาTH; levelเพิ่มstat/coinตามเดิม. แก้hintให้บอกเหตุการณ์จริง
- THfrontierให้teamJudgmentพร้อมGuard, Asiafrontierให้bigFire; sourceเดียวใช้ทั้งgrantและrestore. สิทธิ์bigFireที่เซฟเก่าบันทึกไว้จากศึกเดิมคงเดิม;ไม่deriveใหม่จากTH. คำอธิบายรางวัลลูกไฟใหญ่แก้เป็นโซน2
- restoreทำหลังโหลดbossCleared/finalreceiptแล้ว;Iceที่เคยปลดจากlevelแต่ไม่มีชัยชนะWestถูกล้างflag/discovery/storyrewardเกินสิทธิ์,สิทธิ์ที่ชนะจริงและเซฟซ้ำยังอยู่
- courtเก็บencounterRoleแยกบอสชายแดนกับruler;THrulerใหม่ใช้th:ruler. ledgerเก่าth:frontierที่เป็นrulerเก็บID/phaseเดิมและบล็อกลงทัณฑ์ซ้ำ. ไม่มีrename/deleteประวัติ
- ไม่แสดงmeter/ข้อความล็อกท่าประสานใต้portraitจนกว่าจะได้จริง;publicMeritLineใช้สีเขียวทุกweightและทั้งจริง/ปลอม (ไม่เฉลยคำตอบ);sin/reliefยังสีตัวเลขเดิม
- ตรวจChromiumจริง1280×800/390×844/844×390: migrationIce/noqueuednotice,lockedmeterหาย/earnedmeterปรากฏ,สอบสวนบุญจริงและอ้างบุญปลอมเป็นสีเดียวrgb(74,157,106);0pageerrors,ตรวจภาพไม่มีtutorialบัง
- Full1887/1887,0fail/0cancel/0skip (--test-concurrency=4),syntax196/196,diffcheckผ่าน. Fullรอบแรก1883/1887มี4expectationsเก่าที่ถูกแทนตามคำสั่งใหม่ (Iceจากlevel/fixtureall-earnedไม่มีproof,THbigFire,บุญสีnumeric);ปรับfixture/expectationsแต่เก็บdamage/stun/loot/save/karma/relief assertions แล้วรันfullใหม่ผ่านทั้งหมด
- รายงานBALANCE-2เดิมและตัวเลข32kไม่เปลี่ยน. tests/fixtures/w4-story-progression-changes.jsonย้อนเฉพาะsnippetgame/dataที่reviewแล้วเพื่อauthenticateinputhashเก่า; 200trialsmallteamเดิมยังตรง. ไม่อ้างว่าเป็นBALANCE-W4รอบใหม่
- ยังไม่แก้threshold/ระลอก/PHANTOM/ฉากใหม่/บอสTHหน้าถ้ำในชุดfoundationนี้: คิวถัดไปW4-THแล้วทีละโซน,CAVE-12/OCCLUSION/BALANCEตามคิว. ไม่แต่งเพิ่มความสัมพันธ์พ่อ/พี่ที่ต้นฉบับขัดกัน
- หลักฐานภายนอกOutput/Codex/2026-11-02-w4-foundation;ไม่อ้างphysicaldeviceFPS/Reese/Chris;ไม่แก้status.json/worklog.json/work-mode.json


## 2 Nov — MAP-UI-REVIEW ชุดแรก

รวมคอมเมนต์ภาพ1–13/m0–m3/boat1/boat2ไว้ที่docs/queues/2026-11-02-map-ui-review.md และแทรกก่อนW4-TH โดยเก็บคิวเดิมทั้งหมด. คำย้ำล่าสุด: เสาไฟฟ้าCyberยังเก่าต้องวาดใหม่ในชุดรั้ว/อาคาร.

แก้lower-road polygonข้ามลาวาTHใต้สะพาน (900..1080,1150) ให้เหลือเฉพาะeastlanding; เลิกตัดweatherเป็นกรอบรอบข้อความ; ลดข้อความซ่อมเป็นMAP_NAME_SIZE; START76%/ตัวอักษรเล็กลง; Pauseglowonly; ซ่อนtown-actionharbourซ้ำโดยเก็บcontextual/E. Cacheversionsตรงกัน. Full1888/1888,syntax171ไฟล์top-level,Chromium3ขนาดไม่มีpageerror; blockedlavaprobes/oldpositionrecovery/routeclearผ่าน. Fixturebreachrematchต้องรอRECOVERY_MS120sแทน60s.

งานรั้วทุกแผนที่/แท่นcollisionและขนาด/อาคาร/เสาไฟใหม่/FXความชัดและน้ำไหล/ตัวละคร/questportraits/rewardsยังไม่ถือว่าเสร็จ รายละเอียดตามคิวใหม่.


## Codex — DAIS-NAVIGATION (3 Nov 2026)

- town-dais-geometry.js traces foot-level fence, seat/column bases and front stair floor on all four current judgement sprites; blockers run before owner-mask/interaction pads. No art regenerated.
- Cyber dais width245→307 at fixed foot1855,1062.5. Asia/West/Cyber ruler/Nira anchors shifted onto clear platform floor; FINAL_EVENT first enemy moved1760,930→1760,965 outside enlarged rail.
- walk.clearLine samples each world unit only around dais bounds, preventing smoothing across tiny stair/mask seams. Boat approach duration rounds upward to whole milliseconds, keeping Nira at or below0.11world units/ms.
- Historical BALANCE-2 source authentication undoes the exact noncombat spawn-coordinate snippet via fixture; original simulation evidence is unchanged and BALANCE-W4 remains pending.
- Focused36/36 and Chromium all4town zones passed (front-stair arrival, allrail midpoints blocked, no page errors). Final full suite1894/1894 passed; baseline7/7, syntax/diff checks passed.
- Remaining queue: all-map bridge railing art/foreground, Cyber prison/canteen/zoom/pole redraw, Grace walking, Guard timeline portrait, punishment tint timing, boat deck feet, atmosphere/interiors, quest portraits/rewards, W4 zone events. Continue docs/queues/2026-11-02-map-ui-review.md in priority order.


## Codex — ACTOR-REVIEW queue portraits/wait tint (3 Nov 2026)

- battleTurnOrderHtml delegates all ally portraits to crewArt with each actor.homeZone; profiles missing on West/Cyber Guard fall back to the existing regional full sprite, rather than src=null.
- Map queue souls no longer turn red after40wait ticks; show a small waiting label instead. Punishment-room level colors and gameplay timers are unchanged.
- Focused27/27 and Chromium four-zone real battle image loading passed. Full suite1898/1898 passed.
- Shado desktop now connects (Pro), but every AI provider is ready:false and defaults empty. No generation attempted. User advised to configure Settings→AI generation. Keep original painted AVEGEE style; trial1pole sprite when ready. Existing Grace walk sheet visually confirmed male; female walk redraw, boat alignment and fence/pole art remain pending.

Latest user steering: continue original drawing workflow; defer Shado trial. Use imagegen for pending art, keeping existing painted style.


## Codex — painted Cyber poles (3 Nov 2026)

- Replaced procedural pole bodies with original-style generated painted art, town-pole-cyberhell-v1.webp (512×768,46,410bytes,true alpha). Built-in imagegen; user deferred Shado.
- z4-pole-art.js maps measured foot/crossbar anchors to all287existing poles.293wire layout/depth/effects unchanged. Critical Cyber startup retains decoded image; renderer reuses it, with existing procedural fallback.
- Chromium1280×800/390×844 screenshots inspected; startup image ready and direct renderer blit passed, zero page errors. Geometry checks cover every pole.
- Evidence source/prompt/screens/logs in Output/Codex/2026-11-03-cyber-pole-art. All-map bridge railing/foreground, Cyber prison/canteen/zoom, Grace walk, boat, atmosphere/interiors, quest presentation and W4 remain queued.

ผลตรวจชุดเสาไฟ: full1901/1901 ผ่าน,0fail/0cancel/0skip; syntax/diffcheckผ่าน.


## CYBER-ELECTRIC-POLISH — 3 พฤศจิกายน 2569 (ภาพ12:38)

- คงภาพเสาไฟที่ผู้ใช้ชอบ; สายไฟเปลี่ยนเป็นฉนวนเข้ม มีแสงสะท้อนตามแนวโค้งและข้อต่อสีทอง ลดขอบนีออนหนาเดิม
- กระแสไฟวิ่งเป็นหางแสงเรียวตามsagจริง หัวกลมและcoronaเส้นเล็กแทนสี่เหลี่ยมแสง; fadeเข้า/ออกที่ปลายสาย
- electric-fx.js สร้างฟ้าผ่าเส้นหลัก+3แขนง ปลายเรียว เรขาคณิตคงเดิมระหว่างfade ใช้ร่วมทั้งประกายเสาและพายุCyberในแผนที่/สอบสวน/ต่อสู้; ประกายเสามีcooling tail240ms
- คงจำนวน293สาย/287เสา ตำแหน่ง/ชั้นdepth/culling และงบมือถือ/reduced-motion/weather-off; ไม่มีcanvas blurหรือภาพเพิ่ม
- Full1903/1903; focused40/40; syntax/diffcheckผ่าน. Chromiumจริง1280×800และ390×844ไม่มีpageerror ตรวจภาพและคลิปmotion พร้อมภาพแยกเอฟเฟกต์
- หลักฐานภายนอก Output/Codex/2026-11-03-electric-polish. คิวราวสะพาน/อาคาร/Grace/เรือ/บรรยากาศส่วนอื่น/ภารกิจ/เนื้อเรื่องยังคงเดิม


## MAP-DETAIL-4 / TH-CLOUD-VISIBILITY ชุด runtime — 3 พฤศจิกายน 2569

- ยกปัญหาซูมทั้ง4โซนและเมฆTHก่อนคิวรั้ว; เดิมคิวภาพแตกเจาะจงCyber ตอนนี้ขยายครบ4โซนตามคำย้ำผู้ใช้
- Chromiumdesktopตรวจซูมสูงสุดครบ4โซน:ภาพchunkโหลดได้; จากนั้นพบmobile374pxที่maxzoomยังใช้overviewเพราะthreshold.7สูงกว่าpreviewdensity.4. แก้thresholdเป็น.38แล้ว ตอนนี้desktop/mobileครบ8ฉากเป็นdetailจริง ไม่มีpageerror. แหล่งภาพWest/Cyberบางส่วนเป็นquadrant1536×1024ที่ขยายประมาณ1.8×ก่อนตัดเป็นแผนที่4915×3277; ไฟล์ใหญ่ไม่ได้หมายถึงnative detailเพิ่ม
- เปลี่ยนresampleพื้น/แสงเป็นhigh qualityครั้งเดียวต่อขนาดdevice แล้วblitแคช; terrain-detail.jsจำกัด16M pixelsรวม/3Mต่อtile ไม่สร้างfull-worldcanvasตอนzoom และไม่ลดระดับzoomเดิม
- THcloud20→32%ตามคำย้ำให้เห็นชัด; กลุ่มเงาเล็กลง(.56,.40)เกิดช่องแสงเทียบกลุ่มเก่า(.78,.58)ที่บังเกือบเต็มจอ; Asia/West/Cyberยัง20%. ใช้passร่วมแผนที่/ชายแดน/สอบสวน/ต่อสู้;ไม่มีกรอบเจาะข้อความ
- Probeพื้นขาว1000×600:เงาTHmin179/max255,พื้นที่มืดกว่า220=18.2%,พื้นที่สว่างกว่า245=80.5%; ตรวจภาพจริงแล้วเงาแยกเป็นกลุ่มชัด
- **ยังไม่ปิด MAP-DETAIL-4:** งานนี้ปรับการแสดงผล ไม่ได้สร้างรายละเอียดใหม่ที่ต้นฉบับไม่มี ต้องทำhigh-detail art tilesครบ4โซนต่อ และทดสอบตำแหน่งรอยต่อ/walkmaskเทียบต้นฉบับ ห้ามอ้างว่าแก้แตกครบแล้ว
- หลักฐานภายนอก Output/Codex/2026-11-03-map-detail-cloud;มีbefore/after4โซน, audit/verify scripts และcloudprobe

พบและแก้เกณฑ์detail switch:.7→.38devicepx/worldunitตามpreview1536/3840=.4; มือถือสูงสุดเดิมไม่ขอtileเลย ตอนนี้โหลดและวาด6visibletilesจริงทุกโซน. ตัวตรวจเฟรมไม่นับminimapทับกล้อง. Focused36/36ผ่าน.

ผลตรวจสุดท้ายruntime/cloud:Full1905/1905,focused36/36,Chromium8ฉากdetailจริง/0pageerrors;cacheอยู่ใน16Mpixel. งานnative-detail redrawทั้ง4โซนยังเปิด.


## 3พ.ย. CLOUD-ORGANIC และเริ่ม MAP-DETAIL-4

เงาเมฆเปลี่ยนจากแกนวงรีใหญ่เป็น9ลอนต่างขนาด+ริ้วหาง3แบบ; TH32%/อื่น20%เหมือนเดิม หมอกไม่เปลี่ยน. Full1905/1905 focused30/30,Chromium8ฉาก0errors. หลักฐาน Output/Codex/2026-11-03-cloud-organic-detail.

ภาพรายละเอียดใหม่สร้างจริงด้วยbuilt-in imagegenครบ4ธีม รวม8ภาพร่าง (ลานกลางr2-c3/NW r1-c1) เก็บ docs/art-reviews/2026-11-03-terrain-detail พร้อมREADMEและprompts.json. **ไม่ติดตั้งในruntimeและไม่ปิดMAP-DETAIL-4**:ผัง/รอยต่อยังคลาด โซน2r1-c1เพิ่มวัตถุที่ต้องลบ; ผ่านติดตั้ง0/80. ให้แก้กลุ่มลานกลางและรอยต่อให้ตรงก่อนทำbatchใหญ่ แล้วต่อครบ20tiles/โซนและตรวจwalkmask. ไม่ใช้Shadoตามคำสั่งผู้ใช้. คิวนี้อันดับแรกก่อนรั้วและคิวเก่าทั้งหมด.


3พ.ย. BOAT-DECK-FIT: แก้จุดเท้าYama/Niraบนเรือ13unitsลงมาให้ตรงพื้นtexture; เปลี่ยนcache map-travel เป็น20261103-boat-deck-fit. Focused27/full1906ผ่าน, Chromiumrenderer4โซน×2ขนาดไม่มีpageerror. หลักฐาน Output/Codex/2026-11-03-boat-deck-fit. คิวnative detail4โซนยังเหลืองานแก้seam/ผังภาพร่างก่อนติดตั้ง และGraceเดิน/รั้ว/ภายใน/ภารกิจ/เรื่องราวยังคงเดิม.
