## 2026-10-20 — latest border party correction

- Latest user requirement implemented: ordinary border patrols use the selected keeper team and guard; only an active boss-guided interzone expedition uses Yama, Nira and the previous-zone boss.
- Guide boss has a real initiative turn, attacks, damage, healing, cooldown and saved combat state. It never enters the hired roster. Returning from an expedition restores the ordinary selected party.
- Relevant regression tests: 103/103 pass (party, turn order, Nira, combat, boss justice and cave progression). No claim of full manual end-to-end acceptance.
- Release build: `20261020-border-party`. Deployment verification recorded after push.
- Earlier frontier build `20261020-frontier-scale` / commit `44f6c78`: Pages run 39439146482 succeeded and live build marker was verified.
- Existing outstanding work below remains open; this correction does not complete the entire historical backlog.

# Handoff after usage reset — 2026-10-19

## Latest checkpoint — read this section first

### Frontier scale release — 2026-10-20 (newest)

- `44f6c78` pushed: zone1-2-v3 painting, fixed native 1672x941 world, normal camera at native scale rather than viewport-dependent 1.55x enlargement, town-equivalent Yama/Nira/normal enemy heights, removed geographic footer labels, decoration trunks moved off walkable road, water streaks restricted to painted waterfall channels.
- Isolated staged suite 23/23 passed (camera/actor metrics, decoration road clearance, dungeon view/art/cave progression, preload). Browser preview used production mountDungeonView with a separate temporary game object, not the real save. Clicked from entry to checkpoint 0: Yama walked with Nira, camera followed, encounter callback fired, defeated count changed to 1/3. This verifies encounter dispatch, not a full real combat playthrough.
- Screenshot: docs/handoffs/20261020-frontier-scale-review.png. Reusable local preview: output/frontier-review/index.html (untracked, no save writes).
- Build marker 20261020-frontier-scale. Pages run 39439146482 succeeded; live marker verification follows.
- NOT completed by this batch: more independently persistent roaming enemy encounters (still three checkpoint encounters); all route branches/exit/boss escort manual acceptance; battle comments; terrain seam stitching; supervisor/keeper interrogation expansion. Keep those open.
- Removed obsolete local-only R7 cache-marker edits after checking that catalog asset sets match HEAD; working index/preload/catalog now match the released batches. No gameplay edits were discarded.
- Battle follow-up static/logic suites (Nira combat, cutscene FX, formation) passed 13/13; recording-based manual battle acceptance is still open.
- Prior ferry r2 Pages succeeded and live marker 20261020-court-ferry-r2 was verified.

### Published batches — 2026-10-20 (read first; supersedes older local-only labels)

1. `c0ae54c` — owner-reference Zone 1 navigation, removed upper stair tree, pier edge limits, guard reachable rest point. Isolated staged snapshot 27/27 passed. Pages 39426271527 SUCCESS; live marker verified `20261020-zone1-navigation`.
2. `b84b78a` — dedicated money/outfit handover illustrations for guide bosses in th/asia/west; all three visually inspected with Yama/Nira in zone 1 outfits. Isolated guide/preload suite 23/23 passed. Pages 39427434448 SUCCESS; live marker verified `20261020-zone1-gifts`.
3. `b18a8d2` — persistent court ferries, case availability after disembarkation, workers escort from dock, UI/save integration and regressions. Isolated gameplay suite 31/31 passed; ui.js/scene.js syntax checked. Manual test: opening court changed disabled TRIAL RECESS to enabled TRIAL BEGINS and entered case 001. The local save had no workers, testing dock availability. Screenshot `docs/handoffs/20261020-ferry-trial-open.png`. Pages 39428716743 succeeded.
4. `61544ce` — prevent a soul already disembarked from being put back on the ferry when court is reopened; queue state persists through save/restore. Related suite 32/32 passed. Build marker `20261020-court-ferry-r2`, Pages run 39429240719 succeeded; live build marker verified.

Remaining local files are not part of those releases: new outside-route art + dungeon-art/view changes, pending R7 index/preload/catalog edits, handoff/experiment docs, screenshots, and terrain candidate.

Terrain repair candidate is `output/terrain-review/r2-c3-repair-candidate.png` (generated from v5/r2-c3.webp). It removes the pasted rectangular paving visually, but modifies texture along tile edges and must NOT be integrated without stitching/alignment validation. Original production tile unchanged. This repairs only one tile candidate, not all reported ground seams.

Continue with: validate repaired terrain against adjacent tiles/overview, outside map route alignment/scale/encounters, full battle acceptance list, workers jobs/escort manual checks, boss justice end-to-end, preload cold/slow cases and dialogue placements. The later interrogation expansion remains queued after existing fixes. Legacy tests still contain exact historic cache-token assertions; full-suite acceptance is not claimed.

### Partial navigation release — 2026-10-20 (newest)

- Owner authorized pushing independently completed work. Committed/pushed c0ae54c34ec5e6c49befb478f79e3575681bf5ed to main: exact owner-reference Zone 1 navigation data, removed upper stair tree, solid pier edges, reachable guard tea-rest endpoint, and navigation regressions.
- Isolated staged snapshot (without pending ferry/UI/art work) passed 27/27: town navigation, owner map review, afterlife, zone entry, guard rest, town world. Build marker 20261020-zone1-navigation. Pages run 39426271527 was in progress at dispatch; confirm success/live marker before reporting published.
- Remaining local index.html still carries pending R7 imports. Preserve that unstaged work. All ferry/gift/frontier art changes remain uncommitted.
- Terrain repair started: image tool editing r2-c3.webp as a separate candidate, fixing baked rectangular pasted paving, keeping geometry and tile border. Do not integrate until visual comparison and seam checks pass.

### Active continuation — 2026-10-20 (latest)

- Owner prioritizes existing repairs; defer complicated/token-heavy Shado/Hunyuan trials. Shado 2D Fire template was opened; export supports sprite sheet/JSON in its UI but requires an account. Nothing exported or integrated, no account created, AI link not enabled. Experiment details in enhancement-experiments.md.
- New navigation DATA extracted from the exact Desktop/map/Map-Zone1-3.jpg with 621 registration inliers. `scripts/extract-town-owner-mask.py` -> `src/town-owner-walkmask.js`; these remain untracked and must ship with runtime import if accepted.
- `src/town-layout.js` now consumes owner mask. It filters tiny red flower/JPEG flecks, retains 8-world-unit edge tolerance for the existing path grid, small 48-unit interaction pads where screenshot footprints cover anchors, and merchant UI-obscured paving. Prop/building collisions remain active. No walk.js runtime change retained.
- Focused exact navigation/afterlife/zone-entry suite now 12/12 passed. Town navigation test now probes all TOWN_STAIRS as well as every station with initial/all buildings. Red-region blocking test added; rerun with final checks.
- Full suite was run DURING mask iteration: 1121 total, 1094 pass, 27 fail. Do not cite this as final acceptance. Many navigation failures now fixed by interaction-pad connectivity; recheck of the 19 failed files is running, output `/tmp/avegee-failed-recheck.log` (session 20150). Some other failures assert obsolete cache tokens; inspect before updating tests.
- Local server restarted on 127.0.0.1:8765 (session 58571). Browser IAB 3 tab 1, variable gameTab, `/index.html?test=owner-mask`; resumed a test save. Cold preload reached title and town rendered. Screenshot visibly STILL has rectangular baked terrain seams under props, so that art issue remains open. No claim of a complete manual navigation pass.
- All map/ferry/gift changes remain LOCAL, UNCOMMITTED, UNPUSHED. Only prior boss duplicate-sentencing hotfix is live. Keep all old acceptance checklist below.

### Follow-up verification after navigation correction

- Latest focused gameplay verification: 33/33 passed (navigation, red-area blocking, afterlife, zone entry, guard recovery, keeper capacity and dock). The obsolete N1-cache assertion was explicitly excluded; this is not a full-suite pass. `git diff --check` passed.

- Failed-file recheck: 213 tests, 200 passed, 13 failed. Navigation/afterlife/zone-entry failures from the first full run cleared. Remaining actual findings fixed: pier edge tolerance no longer opens water/front edge; tea rest records the reachable path endpoint rather than an unreachable requested point. Keeper-capacity fixture now disembarks ferry passengers before assigning them, matching the new arrival requirement.
- The 17-test focused rest/keeper/dock suite has 16 passes; only its obsolete N1 cache-token assertion fails. Other old token assertions across battle/layout/flow tests still need replacement with meaningful release-cache consistency checks. Do not describe full suite as passing.
- Screenshot saved at docs/handoffs/20261020-town-review.png. Full-map click moved the player marker from centre toward the upper-west bridge; this is one manual route, not all-branch acceptance.
- Confirmed later queue from the other chat “ออกแบบระบบหน้าสอบสวน” and original checkout BACKLOG.md: AFTER existing repair release, add purple/Kan, red/Pleng, green/Boon spirit traits with text/icons; traits change through interrogation; distinct roles/costs for five keepers; worker support; impact cards; supervisor evaluation/rewards and existing three punishment steps. Retrieve the earlier detailed agreement before implementation. Do not confuse this with already implemented boss-justice flow.

### Partial release on 2026-10-20 — supersedes deployment status below

- User asked whether completed work could be pushed before the next reset. Pushed ONLY the duplicate boss sentencing fix and its regression tests, plus the build/cache marker in index.html.
- Remote main now `048f3a6f3ba59741e90456ee1561c5d015fbf2c8` (`Prevent duplicate boss sentencing on rematches`). Build marker `20261020-boss-justice-hotfix`.
- Focused boss justice suite rerun: 11/11 passed. GitHub Pages run `39296041532` completed successfully. Live URL verified with build marker `20261020-boss-justice-hotfix`.
- All other product changes below remain local and uncommitted. `index.html` is intentionally still modified locally for future R7; only the hotfix build marker and boss-justice import version were staged for this partial release.
- The documentation-only prior commit `8afe0b1` also reached main. This latest handoff update itself is still local.
- Resume with the remaining checklist. Do not redo the duplicate-docket fix, and do not claim map/ferry/gift changes are published.

User requested a durable summary before the next usage reset. This checkpoint supersedes the older status labels below; the older checklist remains as the full requirements inventory.

### Repository and deployment

- Work only in `/Users/agapae/Documents/Work PAE/Claude/AVEGEE/release-worktree-20261019`, branch `codex/release-20261019`. Preserve the original dirty checkout and other agents' work.
- Remote `main` was checked directly with `git ls-remote origin refs/heads/main`: `06beabc5dc97602b4b0fa889809d62456f537ea0`.
- Local HEAD is `8afe0b1` (documentation-only checkpoint), ahead of main. Product changes listed below are still UNCOMMITTED and UNPUSHED. Do not tell the user they are visible on production.
- Pending build marker: `20261019-map-ferry-justice-r7`. Index import mappings and preload script/catalog versions were updated to avoid stale modules.
- User authorizes push after the requested work and verification are complete. Do not push merely because automated tests pass.

### Implemented locally during the latest session — not pushed

1. Zone 1: removed the blocking tree at `(1436,691)` in `src/town-layout.js`; strengthened tests to use `townContains` (terrain plus prop blockers) on upper stairs/landing and western paths. This is a LOCAL correction, not proof that the entire reference mask is complete.
2. Ferry/court/workers: added persistent `courtArrivals` in `src/game.js`. Ferry starts with pending court cases, pauses when court is closed, disembarks at the harbour, enables the case immediately after disembarkation, and assigns available workers to escort souls. Without a worker the soul waits at the harbour. Scene/UI/save-restore integration and regression tests were added. Live visual acceptance remains.
3. Outside map: created genuinely redrawn `img/frontier-route/zone1-2-v3.webp`, connected through `src/dungeon-art.js` and preload catalog. Removed geographic labels from dungeon footer in `src/dungeon-view.js`. Camera sharpness/scale and route alignment still need live checking; enemy count has NOT been increased yet.
4. Boss gifts: created `img/boss-guide/th-gift-v1.webp`, `asia-gift-v1.webp`, `west-gift-v1.webp`. Second farewell page uses the new gift illustration. Boss hands money and next-zone outfit; Yama/Nira use zone 1 outfits as requested. Story and preload references plus tests updated.
5. Boss justice: prevented repeat sentencing on rematches by checking the persistent ledger in `queueBossJustice`. Regression test now requires one docket per boss.
6. Cache versions: `index.html`, `src/preload.js`, and `img/preload-catalog.json` updated for new assets/modules. The final preload URL bump occurred AFTER the last focused test run, so rerun affected checks.

Changed tracked files: `img/preload-catalog.json`, `index.html`, `src/boss-guides.js`, `src/boss-justice.js`, `src/dungeon-art.js`, `src/dungeon-view.js`, `src/game.js`, `src/i18n.js`, `src/preload.js`, `src/scene.js`, `src/town-layout.js`, `src/ui.js`, `tests/boss-guides.test.mjs`, `tests/boss-justice.test.mjs`, `tests/release-20261019.test.mjs`, `tests/zone1-map-review.test.mjs`. Four new WebP files are untracked; include them in the eventual commit.

### Important correction to the older checklist

The expanded boss interrogation/sentencing system is ALREADY substantially implemented in `src/boss-justice.js`, UI, scene, story, assets and tests. Do not rebuild it from scratch. Audit found capture -> regional dais -> interrogation -> location/keeper/severity -> escort -> punishment -> release to border. Final boss has ending 01 -> bound interrogation -> forced mirror/correct choices/max severity 5 -> sentence cutscene -> ending 02/03. Save/reload coverage exists. The remaining work is a live end-to-end verification of all four zones, repairing any discovered defect, and confirming art/order. The duplicate-docket defect was fixed locally above.

### Still open or not accepted — must not be marked complete

- Walk every major branch of `Map-Zone1-3.jpg`; verify full mask connectivity and blocking of red areas. Current local stairs/prop fixes do not establish full compliance.
- Repair/verify baked rectangular ground seams (images 6/8/11) and incomplete prop shadows (6/11/12). Atomic terrain loading does not repair baked art. No targeted repaint was performed in this latest session.
- Visually check mirrored buildings and removed waterfall house/event location (3.5/4).
- Visually check clouds, hot/boiling lava, detailed flames and leaf shapes (5/5.5).
- Check outside map camera, route alignment, sharpness, normal-town character scale, trees/shadows/water/leaves; increase actual outside roaming encounters and verify proximity battles. Border checkpoint should remain 2–3 small normal enemies.
- Test workers cutting thorn trees, collecting sword fragments, selling to merchant, escorting souls to prison/punishment/heaven, and assisting Taan repair/construction. Test new ferry with court closed/open and no worker.
- Test all battle comments against the supplied recording: allied forward lunge, Nira facing right, hurt poses for both, closer formation, menu not overlapping Yama, original-style ultimate transition, no black hit-effect rectangle, no giant Nira zoom after cutscene, all four Nira ultimate/heal scenes.
- Test preload cold/warm/slow loading; map must be ready before play and must not remain black.
- Check Nira/King Yom dialogue placement, team button above Nira, and smaller spirit text at different camera/viewport sizes.
- Play bosses 1–3 praise/invitation, border guide joining Yama/Nira, gate gift/farewell, money/outfit reward once only, and merchant outfit removal. Latest gift requirement supersedes the earlier request to buy outfits from merchant.
- Play border boss sentencing in every zone and final boss ending sequence; test save/reload boundaries, no duplicate rewards/dockets, no ending skip/deadlock.
- Run full automated suite, final diff review, commit, push, verify Pages success and live build marker. None of these final release gates is complete for R7.

### Verification and exact restart point

- Last focused run: 49 tests passed, 0 failed (boss guides/justice, frontier cave, dungeon art/view, zone1 map/navigation, release checks). Ferry agent separately reported 38/38; navigation agent 25/25. These are focused results, not the full suite or visual acceptance.
- A local server was started in the release checkout on `127.0.0.1:8765` (exec session `81435`; verify it still exists before reuse).
- IAB browser id `3`, tab id `5`, URL `http://127.0.0.1:8765/index.html?test=r7`. Latest tab inventory confirmed it exists. Browser variable from prior work was `tab`; rebind if needed. Latest UI was the first tutorial after new-game intro, with “รับทราบ”. Obtain fresh AX state before interacting.
- Continue by entering the map and visually checking loading, ferry and marked map locations. Rebuild `node scripts/build-game-review.mjs` and use the generated review page for other scene checks where appropriate.
- Full test command: `node --test --test-reporter=spec tests/*.test.mjs`. Also run `git diff --check` and review asset references/import mappings.
- Browser/imagegen skills were already read; follow their tool rules. Use imagegen for any raster repaint. Do not fabricate visual test results or use decorative enemy copies as a substitute for real encounters.
- No automatic resume schedule has been created. When the user resumes after reset, continue from this checkpoint, inspect git status first, and avoid overlapping other agents.

---

## Earlier requirements inventory (status labels below are historical)

Repository: `/Users/agapae/Documents/Work PAE/Claude/AVEGEE/release-worktree-20261019`

Branch: `codex/release-20261019`

Latest deployed commit at handoff: `06beabc5dc97602b4b0fa889809d62456f537ea0`

Production: <https://hellopae.github.io/AVEGEE/>

This checklist is the source of truth for the continuation. Do not report the work as complete merely because the automated suite passes. Validate the requested visual behavior in the real game and compare it with the supplied references.

## Required order after reset

1. Finish and visually verify every open or partial item below.
2. Re-audit all prior owner comments against the real deployed game, not only source/tests.
3. Implement the expanded interrogation/sentencing system described below.
4. Run focused tests, full tests, browser gameplay checks, and inspect the final diff.
5. Push only when the checklist is complete; verify `main`, GitHub Pages deployment, and the live build marker.

## Open — must be implemented

### Zone 1 map and navigation

- Rebuild the Zone 1 walkmask to match every visible walkable route in `/Users/agapae/Desktop/map/Map-Zone1-3.jpg`. The red overlay in that reference marks blocked terrain; every exposed path/stair/bridge must be connected and traversable. The current release only added a few local polygons and does not satisfy the full reference.
- Verify the upper-left stairs/bridge route from `/Users/agapae/Desktop/map/2.png`: Yama must use the upper route, must not walk through trees, and the blocking tree group must be removed cleanly.
- Verify both routes marked in `/Users/agapae/Desktop/map/3.png` are traversable end-to-end, including the lower-left path and the path beside the building.
- Add navigation regression samples for all major connected branches from `Map-Zone1-3.jpg`, then manually walk them in the real game with the camera following Yama.

### Zone 1 visual cleanup

- Repaint the square/rectangular ground seams under buildings and trees shown in map images 6, 8, and 11. The current atomic tile loading avoids mixed loading states but does not repair defects baked into the artwork.
- Repair incomplete building shadows in map images 6, 11, and 12 so buildings sit on the ground. Current generic shadow changes are not enough for each marked prop.
- Visually inspect the requested station/house flips and the removed waterfall building in the actual game at gameplay zoom.
- Inspect and refine moving clouds, boiling/hot lava, flame shapes, and falling leaf shapes. Code effects exist, but acceptance requires visual comparison with images 5 and 5.5.

### Outside-border map

- Replace `img/frontier-route/zone1-2-v2.webp` with genuinely redrawn, detailed production art. It is currently an enlargement of the old 1672×941 image; its downscaled pixels differ by only about 1–2 RGB levels.
- Ensure the full map remains sharp while the camera moves. Match Yama, Nira, and enemy scale to the normal Zone 1 map.
- Keep trees, shadows, flowing-water effects, and falling leaves; remove all geographic labels such as waterfall/valley/cave.
- Increase roaming encounters outside the border and verify proximity starts battle. Keep the border checkpoint at only 2–3 smaller normal enemies.
- Confirm only Yama and Nira travel by default; the relevant zone boss joins only during the guided journey.

### Soul ferry and workers

- Tie the ferry to opening the court and pending cases. It currently loops independently of court state.
- On court opening, show the ferry arriving at the harbour, souls disembarking, and a hired worker escorting them toward the judgment dais.
- Make the case immediately available after disembarkation so the player can press “เริ่มพิจารณาคดี” without waiting for the full walk.
- Define and implement a graceful flow when no worker is available: the soul should wait at the harbour or use an explicit fallback attendant, not appear suddenly on the dais stairs.
- Re-test worker jobs in live gameplay: thorn-tree cutting, sword-fragment collection and merchant sale, prison/punishment/heaven escort, Taan repair, and building construction.

### Story/cutscene art still incomplete

- Draw a real boss gift scene for bosses 1–3 giving money and the next-zone outfit at the new-zone gate. The current flow grants rewards and shows text but reuses the older farewell illustration.
- Verify the new Nira combat/healing ultimate illustrations for zones 1–4 in real battles, including orientation, camera reset, no giant zoom, hurt reactions, and absence of a black rectangle behind hit effects.

## Partial — code exists, visual/gameplay acceptance still required

- Battle polish: allied forward lunge, Nira facing right, Yama/Nira hurt poses, closer formation, command-menu spacing, classic ultimate transition, hit-effect transparency, and post-cutscene camera reset are implemented and covered by tests. Replay the supplied recording scenario in a browser before acceptance.
- Preloading: the exact map preview is retained/decoded and corrupt image cache retries are implemented. Test with cache disabled, normal cache, and throttled network to ensure the map never remains black after entering play.
- Dialogue placement/team button/spirit text: CSS and placement changes exist; verify Nira, King Yom, and spirit bubbles at common camera positions and multiple viewport sizes.
- Boss guide rewards: money/outfit state and merchant removal are implemented; the bespoke gift artwork remains open.
- Regional Nira cutscenes: four new images exist; validate all four routes from command selection through return to normal battle framing.

## Implemented and covered, but include in the final regression pass

- Yama display name is “ยามา”; “ยมบาทน้อย” is the title.
- Normal border enemies are smaller and limited; boss scale remains authored separately.
- Boss weapon powers include area attacks: wind fan, Valkyrie spear, hypnosis, and ice.
- Bosses 1–3 praise Yama, invite Yama to the border, accompany Yama/Nira, and provide reward state at farewell.
- Existing sentencing flow and final-boss forced mirror/max settings have automated coverage. The expanded interrogation work below still must be implemented and verified as a user-facing sequence.

## Expanded interrogation and sentencing system — do after the fixes above

### Border bosses in every zone

- After defeating each zone’s border boss, cut to that zone’s judgment dais.
- Show Yama, Nira, and the captured border boss on the map.
- Enter an interrogation screen where the player chooses punishment location, keeper, and severity.
- After judgment, show the keeper escorting the boss to the selected punishment.
- When punishment is complete, release the boss back to the border with persistent state preventing duplicate sentencing.

### Zone 4 final boss ending sequence

- After defeating the Zone 4 boss and playing `story-ending-01-v4`, show the bound Zone 4 boss in the interrogation screen.
- Force use of the magic mirror; it must reveal/confirm the punishment location, keeper, and maximum severity.
- Draw and play a new cutscene of the keeper taking the bound Zone 4 boss to punishment.
- Only after that sequence completes, play `story-ending-02-v3`.
- Test save/reload at every boundary so the ending cannot skip sentencing, replay rewards, or deadlock.

## Release gate

- Manual route matrix: every branch visible in `Map-Zone1-3.jpg` walked end-to-end.
- Manual visual matrix: map images 1–14, 3.5, 5.5 and the battle recording checked against the live build.
- Story matrix: bosses 1–4, guide journey/reward, border sentencing, final ending, save/reload.
- Focused tests pass, then `node --test --test-reporter=spec tests/*.test.mjs` passes.
- Working tree clean after commit; push branch/main as authorized.
- Confirm remote `main` SHA, successful Pages run, and the same build marker from the live URL.

