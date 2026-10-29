# C1-v2 — continuation report (2026-10-29)

Worktree: `/Users/agapae/agapae-work/.codex-worktrees/20261029T124704Z-c8238ccc`  
Branch: `codex/20261029T124704Z-c8238ccc`

## Continuation and scope

Applied the previous run's `diff.patch` with `git apply --reject --whitespace=nowarn` before any implementation. The only rejection was the two new imports in `src/game.js`; merged them while retaining the newer main branch canteen imports (`orderRice`, `cancelRice`), then removed the rejection file. Read the original brief, Astra design sections 1–5, PARTY-01/SKILL-01/BALANCE-01 acceptance criteria, and the previous run's balance.md/balance.json. Those two balance files were the only C1 coordination notes left by that run. Continued its implementation instead of replacing it.

No branch/worktree changes, commits, pushes, merges, deployments, hook edits, status.json/worklog.json edits, browser attempts, Shado calls, other agents or new image generations.

## Implemented behavior

- Eight moves use existing actor stats, fire control and canonical roster identity. Seven personal unlocks require two completed personal-training sessions scoring at least 60, including one at least 80. Work acceleration and old EXP/fire levels do not manufacture score evidence. Capped actors can train for missing moves; failed result saves roll back the unlock and session together.
- Support moves heal living recipients, including full-HP targets for protection; shields and attack buffs use max replacement, expire on recipient turns, share the user's existing special cooldown, and do not revive fallen actors.
- Yama's ultimate snapshots real non-guest teammates, retargets without damage spill, charges MP once, ignores Rage/buff/weapon effects, and refreshes at T6 after use at T1. Owner turns, protection and applied hits persist in finale saves; cooldown continues across waves and finale encounters. The clock does not reset the ultimate.
- Team capacity grows 3/4/5/6/7, includes Yama/Guard, allows Nira, and preserves older selected lists instead of silently deleting overflow. Thai breach victory grants Guard and the ultimate once; old cleared saves infer the ultimate without fabricating a Guard.
- Encounters freeze scaling at creation and retain that party size across waves. Profiles add minions and adjust boss HP without automatically raising enemy ATK. Finale pressure cap is 2.25 instead of 3.25.
- Thai cutscenes, C2 icons/FX and explicit regional fallback maps are connected. Existing actual teammate sprites perform the combo. HUD exposes owner-turn cooldown and temporary protection. Cache versions changed only for edited runtime files; original import aliases and newer main changes are preserved.

## Additional fixes in this continuation

- Kept the command locked between display-only combo dashes and excluded an active skill sequence from the generic phase timeout.
- Hid pending damage until impact and made duplicate visual-hit callbacks idempotent.
- New ranged moves use one 250 ms flight rather than emitting a legacy slash/fire recipe simultaneously; reduced motion keeps the impact without a flying projectile.
- Updated legacy test fixtures for the new starter team and deterministic Yama counter targets; updated VM harness dependencies for the new runtime imports.
- Added tests for mid-command finale restore, wave cooldown retention, fixed encounter party size after a casualty, duplicate visual callbacks, reduced motion, projectile direction/timing, and canonical entry/review cache identities.

## Simulation

`node scripts/sim-c1.mjs` generated `balance.md`, `balance.json` and `simulation.log`: 72 before/after damage-only scenarios, 400 survival samples for sizes 3/4/5/6/7, and 40 further story-cap samples including Guard.

The story-cap policy won Thai team 4: 8/10, Asia team 5: 10/10, West team 6: 10/10, Cyber team 7: 10/10. Resource budgets, mean rounds, healing, absorbed shield and MP/medicine use are documented in balance.md. Several hypothetical smaller teams still lose frequently, especially in the finale. These are deterministic fixed-policy samples, not a statement that live balance has been accepted.

## Acceptance self-check

1. Unlock-once, save/load, cooldown, actual-team combo, clock exclusion and skip-once: covered by the C1 automated suite and targeted integration tests. C1 suite: 21 passed, 0 failed. The final focused retest includes this suite.
2. Team 3/5/7 before/after balance tables: present in balance.md with raw samples and assumptions in balance.json; extra 4/5/6/7 story-cap samples included.
3. Full suite 0 failures: **not confirmed**. The single full run recorded 1,659 passed and 7 failed (1,666 tests). All seven failures were corrected; the focused retest of all seven failing files plus C1 recorded 70 passed, 0 failed. The full suite was not rerun, honoring the one-full-run constraint. The coordination report and logs are present.

## Remaining verification and limits

No browser or real-device visual verification was attempted, as instructed. Dale still needs to inspect the owner-turn meter, seven-member formation, added-enemy target selection, facing and cutscene/impact timing at desktop/mobile sizes. No claim of QA acceptance is made.

Regional cutscenes deliberately fall back to Thai art. New pose atlases and authored per-frame hand/contact metadata were not supplied in C2's current assets. This implementation uses the existing sprites/pose timing and a source point in the upper body of the current measured sprite bounds; exact per-frame hand registration remains work for the art/runtime follow-up. The simulation does not run the complete nine-encounter finale or model human decisions/reaction time.

## Test evidence

| Check | Outcome | Evidence |
|---|---|---|
| C1 acceptance suite | 21 pass, 0 fail | tests-c1-final-targeted.log |
| Earlier affected combat/UI fixture fixes | 56 pass, 0 fail | tests-fixes.log |
| Counter/revival fixture checks | 38 pass, 0 fail | tests-counter-fixtures.log |
| C1 + FX runtime checks | 46 pass, 0 fail | tests-fx-final-targeted.log |
| Full suite, once, 246 files | 1,659 pass, 7 fail, exit 1, 116.728 seconds | tests-full.log; tests-full-exit.txt |
| All seven failing files + C1 after fixes | 70 pass, 0 fail, exit 0 | tests-failed-files-retest.log |
| Diff whitespace/conflict remnants | clean diff check; no .rej/.orig files | static-checks.txt |

Full command: `node --test --test-concurrency=4 tests/*.test.mjs`.

Final focused command: `node --test tests/30a.test.mjs tests/b3-result-screen.test.mjs tests/battle-target-weapon-hud.test.mjs tests/l3-crew-rest-hypno.test.mjs tests/map-z4-terrain.test.mjs tests/p7-copy-apply.test.mjs tests/prison-break.test.mjs tests/c1-combat-skills.test.mjs`.

The seven full-run failures and repairs:

1. Story crop test assumed every asset was PNG/WebP. It now reads JPEG SOF dimensions and checks that Guard's reused full-frame JPEG is displayed without a crop.
2. Reward-screen VM lacked the newly imported COMBAT_SKILLS dependency. Injected the actual module.
3. Weapon/HUD VM lacked abilities and the ultimate data/API. Injected the actual skill module and neutral state; extended receiver selection checks to Nira/Boon's new moves.
4. Rest fixture toggled Taan off the new default team. It now explicitly selects Taan before testing rest.
5. Map preservation test hashed all of data.js, including the three intended C1 non-geometry changes. Kept the original baseline and normalized only the exact lan/sawan trainee additions and boss pressure value for that comparison; every other byte remains checked. map-z4-baseline-audit.json establishes that all recorded hashes matched HEAD before C1 and that only data.js changed in those baseline files.
6. Fire QTE unlock message bypassed the existing localization convention. Added g5.infernoUnlocked in Thai/English, called t(), bumped only i18n.js's cache version, and tested the new key.
7. Prison-loss fixture relied on a random counter targeting Yama despite the default teammates. Made its target explicit.

The earlier 59-file combat regression log contains an interrupted first attempt and a bounded retry against the pre-fix fixtures. It is retained as diagnostic evidence, not a clean result or an additional full-suite run. Node also emits an ExperimentalWarning about localStorage; no warning was treated as a passing test.

Changed files are listed in changed-files.txt. No functional changes were made after the full run except localizing the fire-training unlock message; subsequent edits repaired tests and documented results. A final full-suite 0-failure result remains unverified.
