# B12-FX — 2026-10-30

Scope: `th:asia`, in the provided worktree/branch. No commit, push, merge, deployment, hook or coordination-status mutation.

## Resumed run B12-FX-v2

Applied the previous run's supplied patch with `git apply --reject --whitespace=nowarn` in `codex/20261029T225313Z-a73b479c`. All files applied cleanly; no reject files. Previous logs below this directory are retained as historical evidence. `tests-full.log` from the previous run is incomplete and has no final summary; the resumed full-suite result is `tests-full-v2.log` with `tests-full-v2-exit.txt`.

Concrete follow-up fixes:

- Pause → settings/manual now uses the border's destroy/reopen lifecycle, preventing a detached renderer and a missing return to the route.
- Pinch clears held walking keys; cancellation leaves gesture ownership with the shared control until every pointer is released. HUD actions also clear pointer/joystick state.
- Border pause and automatic pause stop camera interpolation, simulation and the route FX clock. The existing hero renderer now accepts an optional time argument; B12 passes that clock through to its book idle animation, whose default otherwise reads `performance.now()`. Other callers retain the existing default clock.
- Zoom buttons use a fixed three-column grid so the overview button shares the available 160px mobile row without intrinsic flex overflow.
- Added behavioral tests for the actual pause HUD callback and zone-dependent town zoom levels, plus SHA-256 verification against the shipped v6 painting. Native renderer evidence checks a held-key/cancelled pinch and paused scene identity after lazy sprite decoding. The first pause image assertion exposed the hero idle clock above; waiting for images alone did not fix it. The inherited evidence helper also forced weather on while testing the off setting; it now uses the production default setting.

No new image generation was needed; existing v6 art and the inherited traced field are reused. No browser or Shado tools were used.

## Implementation

- `route-geometry.js`: zero sprite trees and zero obsolete rectangle waterfalls for the v6 route. Existing unused art metadata is retained for compatibility. Other route geometry/navigation/story data stays intact.
- `map-zoom-controls.js`: extracted town button binding, used by the town and B12 minimap; B12 adds wheel/pinch, bounded levels, overview and listener cleanup. Pinch clears walking input until both pointers are released. Camera uses the existing frontier projection and follows the player.
- `dungeon-view.js/css`, `ui.js`: B12 profile/manual/bag bottom-left, pause/settings and minimap top-right, touch targets >=44 CSS px. Calls existing game windows. Settings retains the existing weather toggle. Map pause is separate from the town simulation's modal pause.
- `bake-b12-flow.py`, `zone1-2-v6-flow.png`, `route-flow.js`: new v6-only traced paths, intersected with conservative colour coverage and eroded. Encodes kind + downstream vectors for the existing town flow engine; no per-frame image readback. 180 particle pool, viewport culling and the existing screen/DPR budget. Water engine footprint checks remain active.
- `frontier-ambient.js`: existing post-actor WEATHER-A shadows plus warm red/yellow leaves on the Thai side and slender green leaves on the Asia side. Weather toggle and reduced-motion gates reused. DOM HUD is above canvas effects.
- Painted trees are retained in v6. No new tree sprites or guessed tree occlusion polygons were added. Browser-level review of any painted canopy overlapping an actor remains outstanding.
- Cache keys change only for edited resources.

## Evidence and limits

`v6-flow-overlay.png`: magenta lava / cyan water cells, yellow/white downstream guide paths, on the v6 painting. `flow-trace.json` records the source SHA-256, cell counts and all traced paths. The PNG's cells, not the wider guide paths, control emission.

`desktop-*` and `390-*`: actual `mountDungeonView` canvas rendering via native Node canvas, including actors, terrain, flow and weather. Before reconstructs the former 80 sprite tree overlays with effects off in the current renderer; it is not a baseline browser screenshot. Native / max / overview images are included. The DOM adapter does not render the HUD, CSS, browser compositing or touch hardware. These images cannot certify HUD layout or real browser interaction.

`offscreen-results.json`: reduced FX layer identity, weather toggle clearing, animated layer changes, pinch movement checks, and CPU render measurements. Whole-scene reduced hashes may differ because the existing patrol NPC simulation continues; the FX layer is checked separately. Native CPU measurements are not browser frame-time validation, CDP throttling or GPU profiling.

Browser was not opened, per brief. Do not treat this work as browser QA completion.

## Resumed verification

- Full suite, run **once**: `node --test --test-reporter=spec tests/*.test.mjs`. **1,726 tests; 1,717 pass; 9 fail**, exit 1, ~203.5s. Preserved in `tests-full-v2.log` / `tests-full-v2-exit.txt`.
- Those failures were confined to `f12-input`, `f12-mask`, and the MAP-Z4 baseline guard: an outdated DOM adapter, assertions requiring the removed 80 trees, and normalization that still required the deleted B12 tree/fall constants and old import. Updated only those B12-specific expectations. Legacy shared-tree depth/fallback checks still run with an explicit old-tree fixture and restore the empty production list afterward. The independent route/fallback baseline remains authenticated against its original fixture hash.
- Recovery selection: B12 controls, F12 input/mask, M2 route geometry, MAP-Z4 terrain, WEATHER-A — **39 pass, 0 fail**, exit 0, ~4.1s (`tests-recovery.log`).
- Actor regressions: live Yama animation, A7 size/feet, I1b facing, E1 building flip — **15 pass, 0 fail**, exit 0, ~6.4s (`tests-actor-clock.log`).
- No second full-suite run, honoring the brief. A complete 0-failure full-suite result for the final tree is therefore **not established**.
- `git diff --check` and syntax checks for the changed renderer, UI, hero rendering and evidence script exit 0. No `.rej` files.

## Acceptance self-check

1. **No floating trees, zoom max/overview desktop + 390:** zero overlay trees confirmed by route tests and offscreen before/after images. Shared control unit tests cover buttons, bounds, wheel, pinch, cancellation and destroy. Mounted renderer evidence covers desktop and 390. **Outstanding:** browser screenshots with actual HUD/CSS and physical pinch/wheel interaction.
2. **v6 flow registration, full test suite, evidence folder:** newly traced field and overlay saved in this folder; source identity recorded. The resumed full-suite result is recorded in `tests-full-v2.log` and `tests-full-v2-exit.txt`: 9 failures, subsequently corrected and rerun in the affected selection (39/39); final whole-suite 0 fail is not established. **Outstanding:** a final full-suite 0-failure result, browser frame-time check against ~2ms budget and visual review of flow/occlusion in play.


## Changed files

- Runtime/cache: `index.html`, `src/art.js`, `src/dungeon-view.js`, `src/dungeon-view.css`, `src/frontier-ambient.js`, `src/route-geometry.js`, `src/ui.js`, `src/map-zoom-controls.js`, `src/route-flow.js`.
- Field/evidence tools: `img/frontier-route/zone1-2-v6-flow.png`, `scripts/bake-b12-flow.py`, `scripts/b12-fx-evidence.mjs`.
- Tests: `tests/b12-fx.test.mjs`, `tests/f12-input.test.mjs`, `tests/f12-mask.test.mjs`, `tests/m2-route-geometry.test.mjs`, `tests/map-z4-terrain.test.mjs`.
- Evidence: this `output/coordination/2026-10-30-b12-fx/` directory (images, flow trace, renderer results, inherited and resumed logs).

Final HUD callback check after limiting automatic pause to `th:asia`: `tests-final-hud.log`, 5 pass / 0 fail. No other route opts into the new border pause behavior.

## Final native renderer evidence

`node scripts/b12-fx-evidence.mjs` exits 0 (`evidence-exit.txt`); no missing images. Desktop and 390 both retain the original player position after a held-key pinch/cancel, and both report `pauseFreezesScene: true`. The isolated FX layer reports `reducedFxIdentical: true`, `animatedFxChanges: true`, `toggleClearsFx: true`. The whole reduced-motion scene still changes because existing NPC patrol positions continue; this is separate from FX motion.

CPU canvas median before/after deltas: desktop **+1.326 ms**, 390 **+2.486 ms** (80 samples per state). Paired current-renderer weather off/on median deltas: desktop **+1.515 ms**, 390 **+1.902 ms** (12 samples per setting). The mobile before/after comparison exceeds the approximate 2 ms target in this native measurement; the paired setting comparison is below it. These are limited CPU canvas samples, not browser/GPU frame timings. Performance acceptance remains unverified and the mobile result needs attention during browser review.

Reviewed the final native desktop overview, 390 overview/max, and the v6 field overlay. No tree sprites remain on the production B12 route. These images omit browser HUD/CSS and are not substitutes for the required browser checks.
