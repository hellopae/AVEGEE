# S1-ART4 — 29 October 2026

Built-in image_gen only: six calls, one per original/type pair, with the original supplied every time. No retries, Shado, CLI generation, browser, agents, branch changes, commits, pushes, merges or deployments. Worked only in the supplied worktree. Original images and case narratives/verdicts/karma unchanged.

## Changed files

- img/soul-poses/{cleric,worker,officer,executive,woman,business}-asia-caught-lie-v1.png — six new images; each byte-identical to its built-in output (SHA-256 comparison).
- src/soul-poses.js — six original/type registrations; existing preload consumes the registry without loader changes.
- tests/soul-poses.test.mjs — all eight ART4 cases, evidence immutability, used/exhausted/return guards, unknown region guard, other-case exclusions and shared/own/fallback preload deduplication.
- case-review.md — eight requested rows marked drawn and A1 pending note updated.
- comparison.html — six new original/replacement pairs for the eight cases.
- prompts.md — exact six executed prompts, reference paths, saved paths and reuse provenance.
- s1-art4-targeted-tests.log, s1-art4-full-tests.log and this report — verification evidence.

## Acceptance self-check

1. Coverage: A1/A2/A3/A4/A6/A7/A8/A9 all have caught_lie assets. A1/A7 share cleric; A4/A6 share executive. No image pending in ART4. Existing original/type reuse can also resolve these assets for other cases sharing the same pair; their classifications and narrative were not edited.
2. Identity: directly inspected all six originals and outputs. Same faces remain recognizable with their hair, regional costume, palette, pixel-painted style, held objects and tails preserved; widened eyes, open shocked mouths and discrete sweat droplets are drawn into the sprites. Comparison has 42 valid image references, zero missing files. Five images are 1254×1254; business is 1199×1312. All match original dimensions and have RGBA alpha extrema 0–255. No resampling, compositing or alpha edits. Alpha ≥128 bounds (left, top, right-exclusive, bottom-exclusive):
   - cleric: (281,12,1003,1226) → (281,11,1004,1227).
   - worker: (257,2,996,1250) → (256,1,998,1252).
   - officer: (263,3,1005,1248) → (262,2,1007,1249).
   - executive: (239,6,1006,1253) → (238,4,1008,1254).
   - woman: (370,0,993,1246) → (368,0,995,1247).
   - business: (138,22,1114,1303) → (137,16,1114,1308).
   Maximum boundary difference is 6 px; bottom boundary differs by up to 5 px. Exact pixel anchor alignment remains unverified and is a limitation against the brief's alignment requirement. Browser/renderer review was not performed, as instructed. This is not a claim that renderer QA passed.
3. Automated checks: `node --test tests/soul-poses*.test.mjs` — exit 0, 10 pass / 0 fail. Related S1 set (`soul-poses*`, `soul-portraits`, `interrogation-*`, `asset-preload`) — exit 0, 45 pass / 0 fail. Full suite result will be recorded below after its single run completes.

`git diff --check` returned exit 0 before the full suite completed.
