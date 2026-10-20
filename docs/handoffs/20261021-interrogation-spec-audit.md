# Approved interrogation expansion — read-only audit, 2026-10-21

Scope: audit only. No source or tests changed by this audit. Existing map/release repairs must be completed first. This is a new feature queue, distinct from the already implemented boss-justice/captured-boss sentencing flow.

## Authoritative agreement and sources

Source chat: **ออกแบบระบบหน้าสอบสวน**, Codex thread `01a152ed-62a9-7ac2-aceb-a851e513900e` (read via read_thread; no messages sent).

- Original request and Astra design proposal: turn `01a152ed-68a4-7852-9ced-436883a50013`.
- Owner's exact color addition and explanatory design: turn `01a15305-3a51-7a82-882d-e6edd1c76d39`.
- Owner approval to add agreed system after map work: turn `01a15307-80b5-7403-a452-a3f3ea1870a6`, user: “ถ้าเสร็จแล้ว สามารถเอาระบบที่คุย เพิ่มเข้าไปได้เลยครับ”.
- Owner explicitly prioritizes unfinished old work: turn `01a15308-8fbe-7b83-b943-5714c889a93e`, “ถ้ายังมีงานอื่นๆค้างอยู่ ก็ให้ทำให้เสร็จก่อนครับ ค่อยทำต่อ”.
- Original shared checkout BACKLOG.md has the confirmed 20 October queue. Release checkout BACKLOG.md is an older copy and does not include that section. Preserve the shared checkout rather than copying over its dirty files.
- 2.5D experiment queued after the above: turn `01a1553d-69c0-7bd3-8e05-9caf3963d8e4`. Not a prerequisite for interrogation and not approved replacement art for production.

## Design contract

**Destination + sentence level determine justice. Keeper + worker choice determine how work proceeds and its operational benefits/costs.** A good team must not make wrong destination, excessive punishment or an innocent soul's punishment become just.

### Three spirit traits (new, separate from sentence colors)

| Trait | Text/icon/color | Preferred keeper | Behavior |
| --- | --- | --- | --- |
| Concealing truth | Eye + purple, ปิดบังความจริง | Kan / กานต์ (`kan`) | Help uncover one hidden issue; may reveal guilt OR exculpatory evidence |
| Stubborn/resisting | Flame + red, ดื้อและต่อต้าน | Pleng / เพลิง (`plerng`, actual code key) | Manage resistance; correct punishment can guarantee fear/เข็ด, distinct from repentance/สำนึก |
| Accepting/ready to change | Leaf + green, ยอมรับและพร้อมแก้ไข | Boon / บุญ (`boon`) | Rehabilitation and conditional cleansing benefit after correctly judged work finishes |

- Trait badges must include text and symbols, not color alone. They must be visibly separate from existing severity/merit/mitigation text colors.
- Traits describe behavior, not the weight of guilt. Green must not imply lower deserved punishment; red must not increase it.
- Traits can change during interrogation: concealing -> resisting OR accepting after evidence. This provides visible progression.
- Highlight a matching keeper with corresponding frame/color and an explicit conditional benefit such as “เหมาะกับลักษณะนี้ — เปิดความจริงได้ 1 ประเด็น”.
- Other keepers still work; show “คุมได้ตามปกติ” rather than enforcing a single correct keeper.
- Taan and Dam derive their advantage from station/order/crowding rather than adding more spirit colors.

### Distinct roles and visible costs for five keepers

| Keeper | Desired distinct benefit | Cost/tradeoff |
| --- | --- | --- |
| Taan / ทัณฑ์ (`taan`) | Correct work completed as ordered increases town order; reliable supervision | Must remain at station until work ends; unavailable to build/repair |
| Boon (`boon`) | Correct completed work can reduce PLAYER karma a little and support morale | Slower work, so queue clears less quickly; unavailable for recovery duty |
| Pleng (`plerng`) | Handles resisting spirits without resistance delay; correct sentence guarantees fear, not blanket repentance | Visible higher food/effort cost, replacing hidden random extra karma |
| Dam / ดำ (`dam`) | Handles crowded stations, coordinates assistants and delivery | Requires worker support; assigned workers cannot simultaneously gather/repair |
| Kan (`kan`) | BEFORE judgment opens one hidden fact, including mitigating facts; later supervision may yield future-case information | Explicit resource/ability cost and recovery; cannot be used continuously |

Numeric **examples, not fixed approved balance**: Taan +2 order, Boon -1 player karma and +20% duration, Dam one assistant. Proposal explicitly said numbers are for testing/balance. Do not present these as owner-mandated values. Source has no approved specific Kan MP amount, cooldown duration, Pleng food multiplier, or Dam throughput percentage. Choose conservative values and show exact cost in UI if implementing; document them as implementation tuning.

Kan is distinct from Yama's existing unlocked hypno power: do not silently replace the existing power that currently reveals all hidden facts. Kan must not reveal an entire case at once.

### Workers

Reuse current roles rather than rebuilding workers: delivery, station assistance, city build/repair/gathering. One worker does one job at a time. Show actual city handoffs and a short completion benefit report. Moving an assistant to a station should remove its assistance from repair/gathering; no duplicated passive bonus.

### UI preview/impact cards

- Keeper cards show benefit, explicit cost, and current job/block reason before assignment.
- Show conditional outcomes (“หากตัดสินถูกและงานจบ…”) rather than leaking whether a still-unrevealed sentence is correct.
- Do not show hidden crime types, hidden text, fake merit truth, exact deserved severity, guaranteed score, or answer station in a normal pre-verdict preview. Existing mirror answer behavior remains an explicit power exception.
- Clarify “กำลังทำงาน” vs “ระดับทัณฑ์” rather than both being “แรง”.
- Show worker availability/assigned burden and consequences of moving one.

### Supervisor: two evaluation moments, one punishment system

1. After warrant: evaluate the JUDGMENT with a specific reason (wrong place, over/under severity, missed mitigation, correctly exposed false merit). Good judgments receive praise/reward. Important cases, first praise and warning tiers can use full skippable cutscenes; ordinary cases should have brief skippable feedback.
2. After station work finishes: report TEAM performance/bonuses. Do not re-evaluate guilt or punish the player again.

Reuse the original three stages: warning -> initial punishment/fireball -> supervisor comes personally. No second independent counter or duplicate punishment from the new evaluation.

## Current implementation findings

All references below are in `release-worktree-20261019/` and current at audit; line numbers can move with concurrent work.

### New expansion not present

- No trait state machine, badges, matching cards or evolution through interrogation.
- No Taan completion-order bonus, Boon conditional completion-karma benefit, Pleng trait-linked resistance handling or Dam worker-linked crowd specialization.
- No Kan pre-verdict one-clue assistance API/action; current interrogation only has normal press and Yama powers.
- No explicit keeper impact/cost card, conditional team preview, or structured post-job team performance report.
- No new specific supervisor evaluation cutscene with fact-based reasons. Current generic verdict overlay exists; reuse rather than count it as new feature completion.

### Existing mechanics to preserve/extend

- `src/game.js` `press()` ~882: tied testimony reveals; preserve subject-specific evidence and both positive/mitigating deeds.
- `src/game.js` `usePower()` ~825: Yama roar/mirror/ice/hypno. Hypno currently reveals all hidden deeds + fake merits; new Kan assistance must be separate.
- `src/game.js` `assign()` ~983: actual worker/keeper dispatch, station slot creation, need/progress, immediate judge/applyVerdict. New trait/cost state should be captured per assignment, not read from later mutable global selection.
- `src/game.js` `judge()` ~1042: score currently mixes justice and keeper stats: `panya>=7` +6 matching and `rab=48+rabiab*5-queue*4`, weighted into score. Approved separation means explicitly distinguish justice from operational team result when extending, while preserving save compatibility and reward gates.
- **Concrete obsolete behavior:** `judge()` ~1080 still gives Pleng 35% random +3 player karma. The proposal explicitly replaces this with foreseeable cost. `src/data.js` Pleng line also promises “บวกให้อีกนิดหน่อยเอง”; update alongside mechanic.
- `src/game.js` station progress ~1557 already uses strength/morale/hunger/share and `workerSupervisionMultiplier`. Extend this path for slower Boon/resistance/worker-assisted Dam rather than a duplicate simulator.
- `src/game.js` `finish()` ~1311 only settles normal coin, sentence/jail flow and closed record. Add idempotent correct-work keeper outcome here, plus completion report; no second verdict call/reward on save restore.
- `src/workers.js` has exclusive jobs, worker availability and 20%-per-worker general station supervision (max2), build/repair/gather/delivery. Dam-specific benefit is absent. Preserve exclusivity and physical-arrival requirements.
- `src/ui.js` `openTrial()` ~2380–2485 keeper choices only show portrait/name/strength/order tooltip; add badges/role/cost/conditional impact here or extracted helper module.
- `src/ui.js` `verdictCard()` ~635 shows final/known truth and ordinary score, not the new pre-choice impact card. Preserve its hidden-fact filtering before closed=true.
- `src/ui.js` `showVerdict()` ~1802 uses generic BOSS_LINE and a 7-second overlay; supervisor appears on throne via bossUntil. Needs case-specific reason and appropriate skippable presentation, not duplicate reward payment.
- **Text/mechanics inconsistency discovered:** BOSS_LINE.great claims +40 coins, but `applyVerdict()` actual 5-star bonus is +60 (4-star +25). New evaluation must display actual granted reward rather than another static mismatch.
- `src/game.js` snapshot/restore ~4667/4874 persist existing warnings/dadFight. New trait/assistance/completion-report state must migrate old saves and remain idempotent.

### Existing supervisor thresholds (do not invent a second set)

- `applyVerdict()` ~1121: score>=78 good; score<50 bad; intermediate result resets consecutive reds too (existing code behavior).
- Bad #1: pendingWarn, no HP hit.
- Bad #2: fireball, HP loss 25% of hpMax, floored at15% of hpMax.
- Bad #3: pendingWarn + dadFight; reds resets; unavoidably lost authority fight then copper-cauldron punishment, HP1/recovery.
- Values in `src/data.js` DAD ~817: redsToCome3, warnFireballAt2, fraction.25, floor.15, punishHp1.
- Stars and boss category are not identical to consecutive-red gate. boss grade great at score>=82, cruel if over>=2 and score>=50; 5 stars give actual60 bonus. Reuse existing exact mechanics unless deliberately migrating with tests.
- Existing authority names/regional adaptation and warning save/reload must remain.

## Recommended implementation slices after old repairs

1. Extract a small pure spirit-trait/keeper-role module + serialize state. Test hidden truth/mitigation, trait evolution, migration; avoid full game architecture refactor.
2. Add Kan one-clue action and idempotent per-assignment role effects, remove Pleng hidden RNG, preserve actual costs and worker exclusivity. Test exact-correct vs wrong/over/innocent and save/reload.
3. Add accessible trait badges, role cards and conditional preview without hidden answer leaks; inspect in browser.
4. Add supervisor specific-reason/skippable presentation reusing existing warning/punishment progression, then post-completion team report. No double rewards or sanctions.

## Audit validation

Ran only relevant existing baseline: `tests/system-review-20261007.test.mjs` + `tests/narrative-cutscenes.test.mjs`, **9/9 pass**. This verifies existing three-stage authority, narrative and interrogation baselines; it does not mean the new expansion is implemented or visually accepted. No source edits, no commit/push by audit agent.
