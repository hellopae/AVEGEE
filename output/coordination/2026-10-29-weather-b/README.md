# WEATHER-B — implementation evidence, 29 October 2026

Base: `72e074d9b1380fd0a154e3c30d76c0c2caf83ebe`. Work stayed in the supplied worktree/branch. No commit, push, merge, deploy, agents, hooks, status.json or worklog.json edits.

## Scope and concrete changes

- Existing `map-ambient.js`: Zone3 snow budget increases from 90 to 160 on a large viewport; five cached feathered low fog patches. Zone4 rain replaces the sparse sky spark pass; one pale lightning pulse (100 ms, peak opacity .055) every 9 s. All weather is below actors, buildings and labels in `scene.js`; weather is skipped while paused.
- Existing `frontier-ambient.js` and route data: snow/fog on border2–3 east `[.48,1]`, border3–4 west `[0,.46]`; rain/lightning on border3–4 east `[.54,1]`. Transition strip stays clear. Weather remains below depth-sorted actors and route UI. Existing waterfall anchors get low opacity curtains, moving folds and foot foam. No new navigation/terrain geometry.
- Existing L3 `town-flow.js`: purple/cold water use broad trough/foam crests under source-over instead of additive streak/spark mixes. Field vectors still drive motion; full sprite bounding rectangles reject dry cells and walkable floor. Fall spray is also constrained. Lava retains its prior mix. Population cap remains 420, with runtime viewport/DPR reduction (about126 on the 390×844 DPR2 profile).
- Legacy/H3 maps: broader low contrast surface ripples, no water twinkles; existing masks still clip banks/piers. Cyberhell uses the existing non-town map path; its town skin/flowUrl remains disabled. Border3–4 has no authored waterfall anchors; no guessed water routes were introduced there. Water hidden in this painting is still an acceptance gap.
- Existing settings: persistent weather/surface-motion checkbox, Thai/English. OS reduced-motion returns before weather/flow simulation or flash. Only edited module cache versions were bumped through the entry import map.

## Captures

These call production renderer functions on Node/Skia (`@napi-rs/canvas`), composited over existing terrain previews. They are effect-layer evidence, not full-game screenshots, browser QA or proof of actor/UI readability. Cropped water uses low-resolution previews and cannot establish source-art quality. No generated game art and no Shado calls.

| Scene | Before | After |
| --- | --- | --- |
| Zone3 | [before](west-before.png) | [after](west-after.png) |
| Zone4 legacy map | [before](cyberhell-before.png) | [after](cyberhell-after.png) |
| Border2–3 | [before](asia-west-before.png) | [after](asia-west-after.png) |
| Border3–4 | [before](west-cyberhell-before.png) | [after](west-cyberhell-after.png) |
| Water point1: Zone1 river/bridge | [before](water-th-before-3000.png) | [after](water-th-after-3000.png) |
| Water point2: Zone2 east cascade | [before](water-asia-before-3000.png) | [after](water-asia-after-3000.png) |
| Water point3: Zone3 west channel | [before](water-west-before-3000.png) | [after](water-west-after-3000.png) |

Water captures also have corresponding `3500.png` frames, 500 ms later. Visual inspection found overly regular small crests in the first iteration; the final water sprite uses one broken crest, trough and foam flecks. Water/biome visual acceptance against all reference clips remains open. P6 and its reference names were read from the supplied backlog; no clip was copied into assets.

## Flash verification

`tests/weather-b.test.mjs` samples 90,000 one-ms instants: ten starts, exactly9,000ms apart; intensity falls monotonically inside each100ms pulse. Peak opacity ≤.055; no flash for reduced-motion or settings off. This verifies the scheduling rule (≤1 start in any1s window), not a clinical/photosensitivity certification. No overlapping independent lightning timers. No new animation loop or listeners to clean up.

## Render-time table

Milliseconds per standalone renderer call (Node26.7.0 / native Skia, 60 warmup +300 measured frames). Mobile label means viewport390×844 / DPR2, not phone hardware. Border call uses780×440 projected map on780×1688 canvas; water uses a full-field view and old420/new126 particles. Desktop weather uses1440×900 / DPR1. Clearing the canvas is included for weather/borders. Water update+draw is measured; terrain and actors are excluded. Sequential old/new, no CDP CPU throttle, no rAF sampling. These values **cannot substitute for LOAD-01b** or prove the ≤~2ms mobile whole-scene requirement.

| Profile / effect | Before median | After median | Delta | p95 before → after |
| --- | ---: | ---: | ---: | ---: |
| mobile / asia:west | 2.345 | 2.298 | -0.046 | 2.792 → 2.759 |
| mobile / west:cyberhell | 0.403 | 1.718 | +1.314 | 0.491 → 2.080 |
| mobile / water-th | 4.597 | 4.643 | +0.045 | 5.254 → 5.235 |
| mobile / water-asia | 3.673 | 1.507 | -2.166 | 4.308 → 1.973 |
| mobile / water-west | 3.027 | 1.010 | -2.017 | 3.945 → 1.406 |
| desktop / west | 1.035 | 1.534 | +0.499 | 1.228 → 1.846 |
| desktop / cyberhell | 0.489 | 2.685 | +2.195 | 0.713 → 3.199 |
| mobile / west | 0.430 | 0.439 | +0.010 | 0.755 → 0.487 |
| mobile / cyberhell | 0.210 | 0.735 | +0.525 | 0.252 → 0.892 |

Raw: [offscreen-frame-times.json](offscreen-frame-times.json). Harness: [render-evidence.mjs](render-evidence.mjs). Dependency installed only into `/private/tmp/weather-b-tools` (npm cache `/private/tmp/weather-b-npm-cache`); no package files added to the game. Reproduce from repository root: `node output/coordination/2026-10-29-weather-b/render-evidence.mjs` after installing `@napi-rs/canvas` at that path. Before source is loaded read-only from the pinned base commit.

The supplied LOAD-01b harness was inspected: Playwright/Chrome, 390×844 DPR2 CPU×4 and1440×900 DPR1, rAF deltas across town/border/trial/battle. It was not executed because this brief states that sandbox browsers cannot open. Physical-mobile, whole-scene LOAD-01b and interactive settings checks remain open.

## Tests and acceptance

- Full run, exactly once: `node --test --test-reporter=tap --test-concurrency=4 tests/*.test.mjs` — **1672 tests:1670 pass,2 fail**,265.35s. Original output retained in [full-tests.txt](full-tests.txt). Failures: redundant reduced-motion frontier transform (fixed with early return); whole-file route geometry baseline hash (updated to normalize only the exact authorized weather-area addition, still checking every other byte). Do not interpret this run as0fail.
- Final targeted recheck: `node --test --test-reporter=tap tests/map-z4-terrain.test.mjs tests/weather-b.test.mjs tests/map-ambient.test.mjs tests/l3-biome-weather.test.mjs tests/n4-flow.test.mjs tests/h3-map-ambience.test.mjs tests/c1-frontier-grounding.test.mjs` — **38 pass,0 fail**, including both failed cases. [final-targeted-tests.txt](final-targeted-tests.txt).
- `git diff --check`: clean. Node/Skia evidence harness completed. Earlier targeted results remain in their own logs. Full suite was not rerun, following the once-only instruction; final tree therefore has no verified full-suite0fail result. The final tiny water-crest artwork adjustment was checked by the final targeted run and refreshed evidence, not another full run.

| Acceptance item | Self-check |
| --- | --- |
| Zone3 fog + denser snow, including both requested borders | Implemented; production-function captures and biome clipping tests available. Full-game visual review open. |
| Zone4 rain + lightning and cyber side of border3–4 | Implemented; scheduling/reduced-motion tests and captures available. Full-game visual review open. |
| WATER-01 continuous directional water / falls / foam throughout all water scenes | Existing L3 and legacy paths changed, three water points captured at two times. Full visual acceptance of continuous surface flow against reference clips and every border is **open**, including untraced border3–4 water. |
| Before/after per zone + water3points | Present; limited to offscreen terrain/effect composites. |
| Flash rule | Scheduler tests verify100ms pulse every9s and no reduced-motion flash; no independent overlapping pulses. |
| Mobile impact ≤~2ms with LOAD-01b | **Not verified**. Offscreen microbenchmark table provided; browser/CDP/real-mobile measurements remain open. |
| Full tests0fail | **Not achieved in the single full run** (2 failures); both addressed and targeted recheck38/38. |
| Required output folder | All new evidence stored in `output/coordination/2026-10-29-weather-b/`. |

Changed game files: `index.html`, `src/map-ambient.js`, `src/frontier-ambient.js`, `src/map-fx-h3.js`, `src/route-geometry.js`, `src/scene.js`, `src/town-flow.js`, `src/ui.js`. Tests: `tests/weather-b.test.mjs` (new), `tests/h3-map-ambience.test.mjs`, `tests/l3-biome-weather.test.mjs`, `tests/map-ambient.test.mjs`, `tests/map-z4-terrain.test.mjs`, `tests/n4-flow.test.mjs`. Evidence files: this folder only. No QA acceptance claim is made.
