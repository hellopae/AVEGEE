# S1-ART2 — 29 October 2026

Built-in image_gen only, 4 calls with original references, no retries. Generated files copied byte-for-byte, originals unchanged. No Shado, CLI generation, browser, commit, push, merge, branch/worktree changes or deployment.

## Changed files

- img/soul-poses/woman-th-caught-lie-v1.png — 1254×1254; nun/novice, also shared by orchard.
- img/soul-poses/worker-th-caught-lie-v1.png — 1254×1254; star.
- img/soul-poses/business-th-caught-lie-v1.png — 1199×1312; lord, also shared by hunter/gadget.
- img/soul-poses/cleric-th-caught-lie-v1.png — 1145×1374; monk/prophet.
- src/soul-poses.js — register original/type pairs; existing preload consumes these automatically.
- tests/soul-poses.test.mjs — exercise all eight requested case mappings, non-mutation, used lines, region isolation and preload deduplication.
- case-review.md, comparison.html, prompts.md — statuses, original/replacement comparisons and exact executed prompts.
- s1-art2-full-tests.log and this report — verification evidence.

## Acceptance self-check

1. Coverage: all eight requested cases covered, four new unique images; pol/gen reuse existing officer. No ART2 image remains pending.
2. Identity: inspected all four original/replacement images directly. Face identity, hair, clothing, colors, line style, held objects and ghost tails remain recognizable; startled eyes/open mouths and sweat are part of each image. Canvas dimensions equal originals, RGBA with alpha extrema 0–255. No resampling or alpha edits. At alpha ≥128, original → output bounds:
   - woman: (362,17,1015,1229) → (362,17,1016,1229)
   - worker: (291,9,1011,1235) → (289,7,1012,1236)
   - business: (133,16,1060,1296) → (131,13,1062,1298)
   - cleric: (264,89,908,1369) → (262,86,907,1368)
   Edges differ by up to 3 px; bottom edges by up to 2 px. Exact pixel alignment is not claimed. Browser/renderer review was not performed, per brief.
3. Tests: soul-poses 9 pass / 0 fail; related S1 set 44 pass / 0 fail. Full suite executed once: exit 1, 1,589 pass / 1 fail out of 1,590; duration 509,699.406643 ms. The 0-fail criterion is NOT met.

## Commands and failure

- `node --test tests/soul-poses*.test.mjs` — exit 0; 9 pass, 0 fail.
- `node --test tests/soul-poses*.test.mjs tests/soul-portraits.test.mjs tests/interrogation-*.test.mjs tests/asset-preload.test.mjs` — exit 0; 44 pass, 0 fail.
- `node --test tests/*.test.mjs` — once only; exit 1; 1,589 pass, 1 fail.
- Read-only Pillow inspection — identical canvas dimensions, RGBA, transparent alpha present; bounds above.
- `git diff --check` — exit 0.

Full-suite failure: tests/workers.test.mjs:154, “frame-local atlas guards remove edge bleed without clipping the character or held tool in all 64 source cells”. Its Python subprocess at line 177 exceeded the 30-second timeout: spawnSync python3 ETIMEDOUT / SIGTERM. No worker code or worker images were changed. This failure has not been isolated or proven to predate this change; it remains unresolved, outside ART2 scope. The full suite was not rerun.
