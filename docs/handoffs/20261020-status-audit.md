# AVEGEE current handoff — 2026-10-21

## Latest verified release state

- `c611daa`: real outside patrols (Pages39468148254 SUCCESS). Six optional roaming encounters supplement three story checkpoints on zone1–2. Patrol wins persist separately, cannot unlock gates, cannot start remotely, and fleeing retreats with a grace period. Focused70/70.
- `a0d1550`: town paving repairs, worker handoffs, closer small battle teams, working guide portrait, accurate supervisor reward text and release-test modernization. Pages39474624521 SUCCESS, live marker verified `20261021-town-repairs`.
- `c5c5357` pushed: another upper-house ground repair and detailed painted torch flames. Pages39478936267 SUCCESS; live marker verified `20261021-flames-ground-r2`. New repair textures use WebP (~1MB total rather than ~6MB PNG) to limit loading cost.

- Latest production `6a6927c` / `20261021-resume-loading`, Pages39517943546 SUCCESS and live marker/module URLs verified: boss capture acknowledgement is one-way; temporary/requisitioned court resources survive snapshot/reload; failed/stalled terrain detail requests retry without losing preview or blocking loading lanes. Focused combined release checks70/70 plus release/import/camera/power checks30/30.

## What changed and was checked

- Ground: r2-c3 restores three earlier rectangular patches around the civic plaza; r1-c3 restores pasted paving below the upper houses. Renderer blends generated restored texture only over the damaged areas, preserving original road geometry and exact tile borders. Browser pixel comparisons report zero changed border pixels for both tiles. Overview/detail share the repair; art failure or8-second timeout falls back to original terrain rather than a black loading screen. Other ground regions remain subject to visual inspection.
- Fire: close gameplay-zoom inspection showed the old coded tongues still looked flat. Replaced them with three existing detailed flame images, crossfaded with gentle scale/sway. They have opaque black backgrounds, so additive compositing is required; no black box can cover the ground. At most two flame blits per torch per frame, three images loaded once. Reduced motion is static. Actual close view now visibly shows curling flames rather than beige diamonds. Targeted torch/ground/preload/effect checks46/46.
- Workers: cancelling dock→dais escort when a trial starts immediately after disembarking preserves the worker's visible position. Auto gatherers complete and sell current cargo before taking newly available build→repair→supervision jobs; escorts are not interrupted. Worker/escort/afterlife50/50; gathering simulation collected both materials and sold them.
- Battle: guide portrait uses actual standing art rather than nonexistent profile files. Two/three-member parties occupy a closer formation. Real zone1 UI review: Yama strike reduced enemy450→436, Nira healed65→91 with full-screen scene, returned to normal camera/actor scale and handed the turn to guide. Menu was below the team and guide portraits loaded. Memory-only review fixture; not full four-zone UI acceptance. Follow-up formation/anchor/party/Nira19/19.
- Supervisor praise: displays actual existing star bonus (five stars60, four stars25). No false40 coins or guaranteed healing when karma blocks it. Authority/narrative/archive18/18.
- Tests: replaced ten historic token whitelist assertions with versioned module identity, alias, importer, entry and stylesheet checks. Behavior assertions retained; actual chased/checkpoint/patrol dispatch expression tested. Full suite1144/1144 after modernization; later narrow battle follow-up99/99 and fire/ground follow-up46/46. No claim that every later change was rerun in the full suite.
- Real city worker UI review: after running normal stepWorld/advanceAfterlife/step with three hired workers in a memory-only fixture, visible ledger reached wood2, sword fragments2, merchant sales3, income19, completed deliveries4. Workers performed actual trips; no fabricated counter increments. Saved screenshot20261021-workers-live-review.png.
- Manual map routes: center→ice gate, ice gate→quarry/crane, quarry→cauldron all reached physical destinations. Inspected crane's attached base/cast shadow at zoom3.5/5 and cauldron torches at zoom6.5. Also cauldron→sword forest reached its destination; inspected red-tree/station/house bases at zoom3.5/6.5. This does not yet validate every branch/prop.

- Save/resume regressions cover all4frontier-boss phases (dais/trial/mirror/escort/punishment/return/released), final-ending capture/mandatorymirror/punishment/sentence acknowledgment, and all3guide grant/receipt boundaries. Found/fixed repeated capture acknowledgement rewinding sentencing and temporary court rooms becoming permanent after reload. No repeat coins/docket or premature ending.
- Cold detail loading now retries errors with1–30second backoff and fresh URL, times out stalled network/decode/repair at15seconds, releases loading lanes exactly once, ignores stale completion after retry. Existing decoded overview remains until detail is ready. Four new regressions prove these paths.
- Asset audit decoded21actual files: four Nira4x4sheets (64nonemptyframes), four regional healing illustrations, four Yama hurt atlases (16nonemptyframes), nine guide welcome/farewell/gift scenes; all correctly catalogued. This is file/animation-content evidence, not every gameplay choreography accepted.

- Final court real UI exercised: bound-boss illustration, interrogation enables mandatory mirror; only the revealed station/keeper/maximum intensity enable the warrant; issuing it closes the trial and displays actual escort status. Full ending transport/scene boundary remains covered by snapshot/stepWorld regressions, not a full live campaign playthrough. Proof20261021-final-court-review.png.

- Additional map acceptance: fixed the local review-only mask overlay to use the same post-render camera transform (initial screenshot overlay was misaligned; it was not a game collision fault). Corrected overview matches owner road/island layout; saved20261021-owner-route-review.png. Real paths plaza→upper prison and upper prison→thorn grove reached their goals with all buildings present; thorn-grove station/red-tree bases inspected at5×, no floating base or hard rectangular ground seam observed there. Additional town-navigation/walk-edge/scenery/torch checks9/9.

## Existing work not to lose

- Owner-reference Zone1 walkmask/stairs/tree fixes: c0ae54c. Native-scale outside map/actors, decoration trees/water and geographic caption removal:44f6c78.
- Bosses1–3 money/outfit illustrations and rewards: b84b78a, gift scene uses zone1 outfits. Merchant outfit purchase removed from UI.
- Persistent court ferry arrivals and immediate trial availability after disembarkation: b18a8d2,61544ce.
- Ordinary border uses selected keepers+guard; guided interzone expedition uses Yama+Nira+previous-zone boss: edfb70a, isolated103/103.
- Boss sentencing and final ending flow exist with persistent ledger and duplicate-sentence prevention. Do not rebuild as though absent.
- Leaf silhouettes/midribs, floating cloud banks, lava/water flow/bubbles and waterfall strokes exist in shipped code. Fire specifically refined further above. Effects checks now14/14 after obsolete cache assertion was repaired.

## Still open — do not report everything complete

1. Inspect remaining ground under lava-side houses/trees, all marked shadows and every major map branch against owner images6/8/11/12 and Map-Zone1-3. Two repaired tiles are not the whole map.
2. Complete visual/gameplay acceptance of all four regional battle/cutscene/hurt paths, boss guide routes/farewell and boss-justice/final ending save boundaries. Regional UI follow-up now exercises Nira healing in asia/west/cyberhell as well:65→97/100/100, real cutscene overlay, settled normal camera, next actor. Cyberhell enemy round hit Yama70→64 and Nira100→83. All four complete campaign/ultimate/hurt paths remain beyond these representative flows.
3. Full worker/ferry choreography in live UI, dialogue placement across viewports, cold/slow preload, clouds/water/lava/leaves in each marked area. Systems have integration coverage but not all visual acceptance.
4. Then implement approved expanded interrogation. Exact agreement, source turns, role/cost distinctions and non-spoiler UI rules: `20261021-interrogation-spec-audit.md`. New evolving traits, Kan one-clue help, distinct five-keeper roles/costs, conditional impact cards and team reports are NOT yet implemented. Reuse existing supervisor rewards and three sanction stages; do not add duplicate counters.
5. Shado/Hunyuan experiments remain deferred. No external assets integrated or account created.

## Workspace

Work in release-worktree-20261019 on codex/release-20261019. Preserve the dirty original checkout. Local review harnesses and raw image candidates under output/ are not shipped runtime assets. No automatic resume schedule has been created.
