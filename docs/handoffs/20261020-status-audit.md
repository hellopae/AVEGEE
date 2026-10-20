# 2026-10-21 continuation checkpoint — read first

- `c611daa` pushed and Pages 39468148254 succeeded: six real optional roaming patrols on zone 1–2, alongside three story checkpoints. Persistent victories, real combat/result cleanup, anti-remote-start checks, safe retreat and gate separation. Focused release tests 70/70 passed. Local preview verified proximity callback and separate patrol count; it auto-resolves the callback and is NOT a full battle UI acceptance.
- Town repair batch: generated restoration for three painted patches within tile r2-c3. Renderer blends only those areas and preserves the original outer 80px; browser pixel comparison reports zero changed border pixels. Preview and detail share the repair. It is not a repaint of every reported terrain tile. Optional art failure/timeout retains original terrain, never a blank map.
- Workers: court cancellation preserves the worker's current visible position; auto gather finishes/sells its cargo then yields to newly available build/repair/supervise jobs. Escort work cannot be interrupted by auto scheduling. Worker/escort/afterlife suite 50/50 passed.
- Supervisor praise now reports real star bonus (five stars60/four stars25), with no false40-coin or guaranteed-heal claim. Focused authority/narrative/archive18/18 passed.
- Real battle UI review found and fixed missing guide portrait (do not request nonexistent profile file). Small 2/3-member parties now use a tighter formation. Formation/anchor/party/Nira follow-up19/19 passed.
- Replaced ten obsolete historic cache-token assertions with module identity/import-map/entry consistency tests; gameplay assertions retained. L5 tests actual dispatch for patrol/checkpoint/chase. Focused90/90 passed.
- Browser real combat UI review: Yama normal attack reduced enemy450→436; Nira healing played the zone1 full-screen scene, healed65→91, returned to normal camera/actor scale, and handed the next turn to the guide. No broken guide portrait remained. Review fixture used memory-only save; this is zone1 acceptance, not all four regions.
- Full suite after cache-test updates: 1144/1144 passed. Small formation/guide-portrait adjustment followed that run and has focused19/19 pass; do not claim all later visual acceptance complete.
- Interrogation expansion is still queued AFTER old map repairs. Exact approved source agreement is saved in `20261021-interrogation-spec-audit.md`; no new trait/keeper/supervisor expansion has been implemented.
- Remaining: other terrain tiles and all marked shadows; all-route manual map/guide checks; four-zone battle animations/cutscene acceptance; full worker choreography/cold-load/dialogue checks; then the approved interrogation expansion. Shado/Hunyuan remains deferred.

# Current status audit — 2026-10-20

This current table supersedes stale local-only and pending-cache labels in earlier historical handoffs. Do not report all work complete.

## Release

- Latest product commit: edfb70a, pushed to origin/main. Build: 20261020-border-party.
- Original Pages run 39443245777 stalled in git fetch for about 22 minutes (14:52:49–15:15:11 UTC), without a game compilation failure. Cancelled and requested rerun; then requested a direct Pages build because rerun stayed queued. Direct build run 39447916481 succeeded (Checkout 26 seconds), deployment completed 15:25:02 UTC. Live build marker verified 20261020-border-party. No game code change was needed for this recovery.
- Current live build: 20261020-border-party (edfb70a).

## Effect audit (source present in committed production history)

| Request | Implementation | Acceptance still required |
| --- | --- | --- |
| Floating clouds | town-night-effects.js drawTownClouds, scene ground pass | Compare cloud plateau at gameplay zoom |
| Detailed fire | town-scenery.js torch layer: five curved flame tongues, bright core, embers and local light | Compare all marked torches, not only one |
| Leaf shapes | town-night-effects.js pointed leaf silhouettes and midribs below trees; frontier-ambient.js falling leaves | Check size, visibility and canopy placement |
| Flowing water/waterfalls | town-flow.js baked direction mask and flow particles; frontier-ambient.js waterfall strokes | Check actual channels, bridges and camera motion |
| Hot/boiling lava | town-flow.js flow/glow/bubbles on painted lava; map-ambient.js and map-fx-h3.js regional surfaces | Compare heat, bubbles and falls against images 5/5.5 |

No Shado or Hunyuan assets were integrated. Their experiments remain deferred at the owner's request unless quick and useful.

Effects/scenery test run: 14 tests, 13 pass; one existing test fails because it hard-codes an old scene import cache suffix (-n4), whereas current release uses 20261020-court-ferry. Do not claim the full suite passes or treat this as visual acceptance.

## Remaining work

- Repair baked rectangular terrain patches and inspect all incomplete building shadows. One isolated terrain candidate exists but is not integrated.
- Add more real persistent roaming encounters outside the border (currently three checkpoint encounters), then verify proximity battles and all exit/guide routes.
- Manually replay all 12 battle-video comments, including four regional Nira cutscenes, facing/lunging/hurt, menus and post-cutscene framing. Logic tests are not a substitute for this pass.
- Manually verify all requested map paths, building flips/removal, dialogue placement and slow/cold preload.
- Worker jobs exist but still need full gameplay acceptance: wood/sword resources, sale, prison/punishment/heaven escort, repair and construction.
- Ferry/court code shipped and dock case availability tested; worker arrival choreography still requires acceptance.
- Four-zone boss sentencing/final ending and boss reward/escort stories need complete manual save/reload acceptance. Gift art shipped for bosses 1–3.
- Expanded spirit-trait/keeper-role/supervisor interrogation system is queued after these repairs; retrieve the approved detailed agreement before implementing.

## Completed recent batches

- Owner-reference Zone 1 navigation, stairs/tree correction (c0ae54c).
- Three money/outfit gift illustrations (b84b78a).
- Court ferry arrivals and workers/dock availability (b18a8d2, 61544ce).
- Native-scale outside map and town-equivalent actors; geographic labels removed (44f6c78).
- Ordinary border selected keepers/guard versus guided Yama/Nira/previous boss party (edfb70a), isolated regression 103/103.
