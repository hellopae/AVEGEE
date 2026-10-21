# Interrogation expansion — implementation and remaining queue


Latest status: `../claude-handoff-2026-10-21-workers-guide.md` records the subsequently shipped worker/S1–S5 batch and the remaining manual acceptance/experiment queue. The original queue below is historical.

Build: `20261021-interrogation-roles`. Release checkout only; shared original checkout preserved.

## Implemented

- Three readable behavior badges and matching keeper borders. Evidence changes the badge; losing a fight alone does not mean acceptance. Nonmatching keepers remain selectable.
- Justice score and excessive-punishment karma depend on destination and sentence, independently of keeper skill/crowding. Mirror keeper recommendation is operational and separate from justice.
- Taan: +2 order on correctly completed punishment. Boon: 20% longer work, −1 player karma on correct completion. Pleng: explicit 2-food assignment cost, resistance control, no random karma penalty. Dam: 25% extra crowd coordination only with an exclusive funded worker physically at the station and at least two active souls.
- Kan: opens one hidden issue, including mitigation; 4 MP, 4 morale, 30-second real-time cooldown. Correctly finished Kan work prepares one insight, capped at three; an insight replaces MP only. Busy/unavailable/no-evidence/insufficient-resource attempts consume nothing.
- Assignment snapshots, saved cooldowns/insights and bounded completion reports. Correct-work benefits apply once at actual completion; no retroactive bonus for legacy slots, and no old-keeper bonus after a keeper change.
- Reports in sidebar and Nira office, mark-read only. Existing supervisor verdict gets a specific reason and one-shot skip; no second reward/judgment/sanction flow.

## Validation

- Full suite after principal implementation: 1,183 passed, zero failed (301 seconds).
- Final focused suite after expanded role wording and two additional integration cases: 36 passed, zero failed.
- Real browser: ordinary trial opened, Kan revealed exactly one additional deed, MP 40→36, cooldown button disabled, keeper picker and conditional role/cost preview inspected. Screenshot: `20261021-interrogation-roles.png`.
- Cross-case finite scoring, justice independent of all five keepers and queue crowding, save/restore cooldown/evidence/report acknowledgement, wrong/over/legacy bonus exclusion, completion idempotence, food charged once verified in tests.
- Visual/gameplay acceptance across all zones is still pending; this release does not mark that queue complete.

## Next, in the owner's requested order

1. Complete manual acceptance all zones: terrain seam/ground/shadows, dialogue placement, workers (gather/sell, deliver souls, repair/build/supervise), trial/report readability at other viewport sizes and regional names, boss court and cutscenes through end of travel. Repair any failures and record evidence.
2. Isolated Shado VFX and Hunyuan judgment-platform experiments. Preserve 2D architecture/assets; no replacement without review. If account/terms/tool complexity blocks a trial, record the concrete blocker without spending the main work queue on it.
3. New S1–S5 / video requests, explicitly queued by owner AFTER existing queue:
   - Town gate enters border automatically on arrival, without the enter-border button. Guard against immediate reentry on return.
   - Move defeated Zone 1 guide boss from town S2 to circled border S3 position. Talk offers explicit expedition confirmation.
   - Confirmed expedition shows Yama + Nira + previous-zone boss walking together and fighting together through the next gate. Ordinary border battles continue selected keeper/guard team.
   - Verify guide farewell cutscene, one-time money/outfit handover for next zone.
   - Reward overlay retains correct frontier/outside-frontier background instead of revealing town.
   - Patrols roam naturally instead of jittering in place. Inspect attached video.
   - S4 annotation requests cleaner map framing/controls; clarify exact intended removal if needed after main queue.

Do not describe the S1–S5 fixes, all-zone manual acceptance, or external experiments as complete. Owner's latest clarification confirms the missing guide and wrong keeper combat team are actual reported bugs, not a request to remove ordinary keeper battles.
