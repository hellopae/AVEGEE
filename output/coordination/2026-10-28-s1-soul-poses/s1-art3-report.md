# S1-ART3 — 29 October 2026

Built-in image_gen only: two calls with original references, no retries. Outputs copied byte-for-byte. Original images unchanged. Worked in the supplied worktree and branch; no branch changes, commit, push, merge, deployment, browser, Shado or CLI generation.

## Changed files

- img/soul-poses/executive-th-caught-lie-v1.png — new 1254×1254 RGBA; trader/accountant/heir.
- img/soul-poses/clerk-th-caught-lie-v1.png — new 1254×1254 RGBA; sister.
- src/soul-poses.js — register these two original/type pairs; existing preload consumes the registry.
- tests/soul-poses.test.mjs — cover all seven ART3 case selections, evidence immutability, used-line and regional guards, shared/own/fallback preload deduplication.
- case-review.md — mark four newly covered cases drawn; orchard/hunter/gadget already marked drawn by ART2 reuse.
- comparison.html — all seven cases shown using four unique original/replacement pairs.
- prompts.md — both exact executed prompts and reuse provenance.
- s1-art3-full-tests.log and this report — verification evidence.

## Acceptance self-check

1. Coverage: all seven requested cases have caught_lie assets, with two new images. orchard reuses woman; hunter/gadget reuse business. No pending ART3 image.
2. Identity: inspected the two new outputs and both reused outputs against their originals directly. Same character, hair, costume, palette, line style, held objects and tail remain recognizable, with widened eyes, open shocked mouth and sweat drawn into the image. All have matching canvas dimensions and actual RGBA transparency (alpha extrema 0–255). New files are byte-identical to built-in outputs. At alpha ≥128, bounds (left, top, right-exclusive, bottom-exclusive) are:
   - executive: (266,3,988,1247) → (265,2,990,1247).
   - clerk: (303,6,1018,1244) → (300,2,1019,1245).
   - reused woman: (362,17,1015,1229) → (362,17,1016,1229).
   - reused business: (133,16,1060,1296) → (131,13,1062,1298).
   Maximum edge difference 4 px; new executive bottom unchanged, new clerk bottom differs 1 px. Exact pixel anchor alignment is not established. No resampling or alpha edits. Browser/renderer review was not performed, as instructed. All 30 comparison image references resolve to existing files.
3. Tests: soul-poses 9 pass / 0 fail; related S1 set 44 pass / 0 fail. Full suite executed once: exit 0, 1,590 pass / 0 fail, 0 cancelled/skipped/todo; duration 273,676.596125 ms (~4 min 34 sec). The automated 0-fail criterion is met; this does not establish renderer QA.

## Validation

- `node --test tests/soul-poses*.test.mjs` — exit 0, 9 pass / 0 fail.
- `node --test tests/soul-poses*.test.mjs tests/soul-portraits.test.mjs tests/interrogation-*.test.mjs tests/asset-preload.test.mjs` — exit 0, 44 pass / 0 fail.
- `node --test tests/*.test.mjs` — executed once, exit 0, 1,590 pass / 0 fail; see s1-art3-full-tests.log.
- `git diff --check` — exit 0.
- Read-only Pillow inspection — dimensions, mode, alpha extrema and bounds as recorded above.
