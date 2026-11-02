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
