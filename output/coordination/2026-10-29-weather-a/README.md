# WEATHER-A — 29 October 2026

Implementation extends `map-ambient.js`, the existing town depth queue and
`frontier-ambient.js`; no image generation, new assets, navigation changes or
new animation loop. `town-shade.js`, the existing L3 flow fields and night
lighting remain in place.

- All four towns: three cached soft cloud-shadow sprites over ground and actors,
  different speed/strength per zone. Each sprite alpha <= .066; even hypothetical
  full overlap stays below 1-(1-.066)^3 = 18.52% opacity. No canvas filters,
  pixel readback, fullscreen offscreen buffer or new rAF in the weather pass.
- Zone 1: completed cauldron + existing torch sites. Unbuilt cauldrons emit no smoke. Torch emission height follows exactly
  `town-scenery.js`'s `p.y - h*.85 + 9`, including decoded pillar aspect ratio.
  No invented flame positions. The existing lava surface flow/sparks remain.
- Zone 2: three low-opacity graded light wedges and floating dust.
- Border 1–2: Zone 1 cloud style on left 48%, Zone 2 clouds/light/dust on right.
  Existing leaves/waterfalls remain. No authored flame anchors on this border;
  no smoke sources were invented. Border 2–3: Zone 2 effects in left 44%, Zone 3
  cloud style in right 52%; existing snow on cold side. Transition strip clear.
- New weather runs after actors and before speech/badges/HUD. Existing canvas
  labels/tags register padded exclusions, merged before even-odd clipping.
  DOM HUD stays above the canvas. Existing sky particles move before dialogue
  and badges. Their cap and frontier leaf/snow cap now use CSS viewport/DPR.
- Weather checkbox in the existing settings (Thai/English); remembers preference
  in `avegee.weather`. Restricted storage is tolerated. Switch controls these
  new clouds/smoke/rays/dust. Existing water/lava/night lights retain their rules.
- Reduced motion: still cloud shadows and beams, zero new smoke/dust. Existing
  moving ambient passes retain their reduced-motion early returns. Pause holds
  the new weather phase. WeakMap clocks release with their canvas contexts.

Gallery: [index.html](index.html). CPU table: [timings.md](timings.md).

## Evidence and limits

Run `node scripts/weather-a-evidence.mjs` from repository root. Needs the installed
`@napi-rs/canvas`; override its path with `WEATHER_CANVAS`. All reads are local;
no browser, server, player save, deployment or external services. Python/Pillow re-encodes the C2PA PNG for the native decoder in memory; source assets stay unchanged. `--borders-only` refreshes border/pixel fixtures while retaining town timing data.

`*-before.png` means **new weather switched off in the current renderer**;
`*-after.png` means weather on at the same requested time/state. These are not
archived HEAD screenshots: the current renderer also includes the mobile caps
and sky ordering change. Town images use the real `scene.render`, authored layout,
terrain and lazy asset loading, with the initial stations marked completed in memory. View is a whole-map overview fitted into 1440×900
and 390×844 (DPR 2). This is not the game's interactive zoomed camera. Border
images exercise the real new frontier weather function over its painted map;
they omit runtime actors and DOM HUD. Native canvas rendering (with Thonburi font registration) is not Chrome;
small text and some sprites have backend artifacts, so these images cannot sign
off character readability, HUD interaction or final visual quality on devices.

`offscreen-results.json` / `offscreen-run.log` hold native CPU render timings,
pixel-level moving-ground/actor and label-exclusion checks, reduced-motion hashes,
and missing lazy assets. Whole-scene reduced hashes can differ because actors,
lights and legacy effects have independent clocks; isolated new-weather pixel
hashes are the reduced-motion check. Images are generated fixtures, not AI art.

The reference folder `/Users/agapae/Desktop/untitled folder 2/` listed in BACKLOG
is absent. Criteria read: P6 CLOUD-01 (Effect Cloud / Cloud & river.mov) and
WEATHER-01 (Effect Light.mov). No claim of matching unseen clips.

The LOAD-01b harness at `../2026-10-28-load01b/` needs Chrome + Playwright + CDP.
Per brief, browser is unavailable in this sandbox. Native CPU timings cannot
establish mobile frame-time overhead <= ~2 ms, OS reduced-motion behavior,
real HUD layering, or touch/settings interaction. These remain unverified.

## Acceptance self-check

| Criterion | Evidence / remaining work |
|---|---|
| Cloud shadows affect ground and actors in every town, differ per biome | Shared post-actor render pass; recorder and isolated pixel checks. Native town fixtures. Device readability still needs review. |
| Zone 1 smoke at existing fires | Cauldron + original torch sites/aspect ratio; native fixtures. No extra lava emission anchors invented. |
| Zone 2 rays + dust | Shared renderer and bounded dust tests; native fixtures. |
| Borders 1–2 / 2–3 combine both biomes | Clipped halves; cold snow retained. No authored flame source on border 1–2. |
| Before/after per zone desktop + 390 | Effect-off/on native fixtures for four towns and two borders; not Chrome/HEAD screenshots. |
| Reduced motion still / particles off | Recorder equality and isolated exact pixel hashes; whole-scene native capture provided, OS/browser unverified. |
| Screen/DPR particle cap and settings | Unit coverage incl. 390 DPR 2/3, huge world, preference persistence and blocked storage. |
| Frame-time before/after, <= ~2 ms mobile via LOAD-01b | Not verified: native CPU table is a diagnostic only; browser harness still required. |
| Full test suite 0 fail | **Not met by the recorded full run:** 1,651 tests, 1,649 pass, 2 fail. Both issues corrected; targeted rechecks below are green. Full suite was not repeated, per brief. |

No commit, push, merge, deploy, branch/worktree changes, hooks, status.json or
worklog.json modifications.

## Final test record

- Full suite **once**: `node --test --test-concurrency=4 --test-timeout=180000 tests/*.test.mjs`.
  Exit 1; 1,651 tests, 1,649 pass, 2 fail, 0 skipped; 215.48 s.
  `full-tests.log` is preserved without rewriting the result.
- Failure 1: construction renderer fixture has no radial gradient. Weather now
  skips unsupported canvas contexts and retries when a usable context is available,
  consistent with the existing optional ambient-sprite fallback. New regression
  covers both the skip and successful retry. Real canvas output is unchanged.
- Failure 2: the existing VM-isolated name typography test extracted the label
  helper without its new exclusion array. Its fixture now supplies that array;
  the typography assertions remain intact.
- Fix recheck: `node --test tests/e6-name-labels.test.mjs tests/weather-a.test.mjs tests/map-ambient.test.mjs tests/l3-biome-weather.test.mjs`
  → 16 pass / 0 fail (`fix-targeted-tests.log`).
- Fix recheck: `node --test --test-name-pattern='two builds approach' tests/construction-arrival.test.mjs`
  → 1 pass / 0 fail (`fix-construction-test.log`); other construction cases were
  not rerun (the recorded full run exercised them).
- `node --check` for the six changed runtime JS modules and `git diff --check`
  completed successfully. No claim of full-suite 0 fail or QA acceptance.

Changed implementation files: `index.html`, `src/map-ambient.js`, `src/scene.js`,
`src/frontier-ambient.js`, `src/dungeon-view.js`, `src/ui.js`, `src/i18n.js`.
Tests: `tests/weather-a.test.mjs` (new), `tests/e6-name-labels.test.mjs` (fixture).
Evidence generator: `scripts/weather-a-evidence.mjs`; outputs in this directory.
