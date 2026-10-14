# AVEGEE — 2D migration, turns and travel — 14 October 2026

Approved scope: numbered plan1–7, Map-Zone1 geography, closer follow camera, minimap/overview, individual ally/enemy turn queue, revised commands, boss-gated first dungeon traversal, harbour travel with Yama/Nira. User's clip guides proportions/UI. Existing prior request to defer Break/Boost remains in effect.

## Implemented

1. Obsolete standalone3D studies/sources/tests moved to `Backup/3D` (81 files,20.13MiB), hash manifest and originals retained. Shared2D house/terrain art retained. Archive remains recoverable; no disk-space savings claimed.
2. Zone1 mainland painting plus separate landmark sprites, relocated districts, bent bridge routes, corrected central queue and varied houses. World3840×2560. Spatial floor bins retain exact collision checks while speeding pathfinding. BFS validates full neighbor edges to prevent jumping narrow blocked gaps.
3. Default5× follow,3.5×/5×/6.5× selectable zoom, overview shortcut, minimap with player/viewport. Save-free map preview includes camera and actual routes.
4. Painted volcano/ice/forests/waterfall/river, native scenery occlusion/contact shadows, masked lava/water animation and existing local lights/reduced-motion support. Art asset native resolutions are documented separately.
5. Deterministic speed-ordered rounds with active unit enforcement, current+next full queues, enemy turns animated independently. Allied basic strike, powers/specials, items, defense and non-story retreat. Command→target→confirmation. Defense50% until actor's next action. Hypnosis/stun/burn resolve on actual enemy turns. Party scale follows visible sprite alpha; smaller allies, two rows for final team. Updated main combat painting/HUD. Existing legacy direct battleAct API retained for older simulation/test callers; production dialogs explicitly enable queue mode.
6. Three adjacent city routes, each three named encounters through a connected walking corridor. Boss victory opens border, not teleportation. Physical border/checkpoint/exit guards enforced in game methods. Each first arrival discovers city; dock interaction separately activates port. Boat travel requires source dock proximity and two activated discovered ports. Yama/Nira board/land; local cities retain their buildings/roster. Existing frontier defenses and events remain available.
7. Legacy saves migrate visited cities without inventing boss-only discoveries; new route position/checkpoints persist, in-flight encounter retries safely. Added integrated route and queue tests, exact sprite and walking regression coverage; review page uses isolated in-memory saves.

## Review

- Game: http://localhost:8777/index.html
- Save-free system review: http://localhost:8777/output/game-review/index.html
- Save-free map review: http://localhost:8777/output/zone1-2d/index.html
- Rebuild system review after source changes: `node scripts/build-game-review.mjs`

## Artwork follow-up

Codex completed3 biome combat paintings and9 dungeon place paintings, integrated into runtime and catalog. All are original generated art, WebP94; exact prompts/source paths/native dimensions/hashes in output/zone1-2d/verification/battle-art-source.json and docs/dungeon-art-2026-10-14.json. Dungeon backdrops change by current checkpoint; completed routes retain their gate backdrop. Load errors fall back to the original frontier painting. Nira follows in a lateral lane so she cannot completely cover Yama at entry. Foreign realm asset loading excludes unused Thai map-zone1 fallback images.

Claude brief updated to optional art/shoreline refinement in docs/claude-handoff-2026-10-14.md. It has not been delivered or accepted; no work is awaiting a Claude reply. Cities2–4 retain their existing city art. More NPC stories/exploration items remain future content proposals, not new implementations.

## Validation

Final command: `node --test --test-concurrency=4 --test-timeout=180000 tests/*.test.mjs`.
Full suite:721/721 passed,0 failures/cancellations/skips,182.53s. After final timeline change, focused turn/travel/real-sprite scale checks:13/13 passed. Logs retained in output/zone1-2d/verification. Browser review covers production commands, enemy→ally turns, walking/checkpoint interactions and harbour travel; the reference clip was inspected locally.

Final focused regression run after UI lifecycle and dungeon spacing fixes:26/26 passed (turns, travel state/game integration, dungeon view, real sprite scale and path edges),1.28s. `git diff --check` passed.

Live isolated browser review verified sword target→confirmation, one automatic enemy response (Yama100→93HP), next round commands, fire resource cost (40→32MP), victory/reward/tutorial completion and return to dungeon checkpoint2/3. Harbour trip displayed Yama/Nira sailing, arrived in Asia with its city introduction, and exposed Fast Travel at the destination dock. Review storage is in memory; normal saves were not changed. Fixed asynchronous dialog close cleanup so it cannot destroy a newly mounted dungeon or sailing canvas.


## ความคืบหน้า 1–7 สำหรับคุณเป้

1. **เก็บงาน 3D:** เสร็จ เก็บคืนได้ใน Backup/3D และไม่รวมในไฟล์ขึ้นเว็บ
2. **ผังเมือง 2D:** เสร็จระบบหลัก แผนที่ใหญ่และตำแหน่งสถานที่ตาม Map-Zone1 พร้อมท่าเรือและบ้านหลายแบบ
3. **กล้อง:** เสร็จ กล้องตาม Yama, ซูมใกล้, ดูทั้งแผนที่ และ minimap
4. **รายละเอียดภาพ:** ภูเขาไฟ น้ำแข็ง ป่า แม่น้ำ น้ำตกและลาวาอยู่ในภาพหลัก ฉากต่อสู้ภูเขาไฟ/น้ำแข็ง/ป่าใหม่เชื่อมแล้ว ภาพสถานที่ดันเจี้ยนครบ 9 checkpoint เปลี่ยนตามจุดที่ผ่านแล้ว
5. **ต่อสู้:** คิวรอบปัจจุบัน/ถัดไป เลือกคำสั่ง→เป้าหมาย→ยืนยัน แนวยืนเฉียง คนถึงเทิร์นเดินออกหน้า/กลับที่ และโปรไฟล์เรียงตามช่องยืนแล้ว ทีม 8 คนจัดสองแนวเฉียง สมาชิกสัดส่วนใกล้กัน
6. **ข้ามโซน:** เสร็จระบบหลัก ชนะบอส→ออกชายแดน→ผ่านศัตรู 3 จุด→เข้าเมืองใหม่→เปิดท่าเรือ→นั่งเรือ Fast Travel พร้อม Yama/Nira
7. **เซฟ/ตรวจระบบ:** เซฟเดิมย้ายข้อมูลได้ มีหน้าทดสอบในหน่วยความจำเพื่อไม่เปลี่ยนเซฟจริง รายงานผลทดสอบใน output/zone1-2d/verification

**งานเสริมภายหลัง:** ปรับภาพอาคาร/ชายฝั่งตามข้อเสนอแนะจากการเล่น และเพิ่มเนื้อหา NPC/ไอเท็มสำรวจเมื่อระบุรายละเอียด ระบบและภาพหลักในข้อ 1–7 รอบนี้เชื่อมแล้ว

Perspective QA: live review verified Yama slot3 steps forward, then returns after enemy turns; Boon slot1 steps forward next. HUD order is taan→boon→guard→Yama, matching standing slots. Movement has a320ms animation and reduced-motion support. Biome assets are native1672×940–941, compressed WebP quality94, generated with built-in imagegen; source paths and exact prompts in output/zone1-2d/verification/battle-art-source.json.

Final perspective+biome regression suite:725/725 passed,0fail/cancel/skip,214.91s. Focused sprite/formation/queue/biome/preload checks:18/18. An older F2 test now validates a dated UI cache version instead of pinning October9; existing facing/walking safeguards remain.

Final complete suite after dungeon art integration and companion spacing:728/728 passed,0fail/cancel/skip,143.35s. Focused art/view/travel/formation/scale/preload checks22/22 passed. All9 final dungeon WebP hashes and native dimensions verified after replacing3 gate candidates with safer overhead views.
