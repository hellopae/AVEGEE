# S1-ART1 — 29 October 2026

Delivered necessity artwork for recruit, girl, boy, sergeant, hammer and healer. Six built-in image_gen edits; each supplied its own original as the reference and requested transparency. No extra generations, CLI fallback, Shado, browser or other agents were used. Original images were not overwritten.

## Changed files

- img/soul-poses/{recruit,girl,boy,officer,elder-woman,worker}-th-necessity-v1.png: six new RGBA PNGs, copied byte-for-byte from built-in outputs.
- src/soul-poses.js: registers each necessity variant by its original path; existing preload and selection functions consume the mapping without further production changes.
- tests/soul-poses.test.mjs: replaces obsolete missing-art expectation; adds all-six-case selection, evidence immutability, used/exhausted/return/wrong-kind/known-evidence gates and deduplicated preload tests.
- case-review.md: marks only the six scoped rows วาดแล้ว.
- comparison.html: adds six original/pose pairs with checkerboard background and correct local links.
- prompts.md: records the exact six prompts, reference paths and output paths, retaining historical provenance.
- s1-art1-asset-checks.txt, s1-art1-*-tests.log and this report: inspection and test evidence.

## Acceptance self-check

1. Complete scoped set: 6/6 necessity PNGs integrated, no scoped artwork pending. Five are 1254×1254; elder-woman is 1145×1374, matching originals. All contain actual alpha transparency (range 0–255).
2. Same character: inspected each original and built-in output directly. Face identity, age, hair, clothing, accessories, palette, pixel-painted style and ghost tail retained; crying expressions and tears are visible. comparison.html contains all pairs. Canvas dimensions are exact; alpha≥128 visible bottom bounds differ by 1–2 pixels, so pixel-exact outline/anchor equivalence is not claimed. No renderer alignment/browser inspection was performed under the brief's restriction. See asset-checks for measured bounds and hashes.
3. Tests: exact soul-poses command 8 pass / 0 fail; related S1 set 43 pass / 0 fail. Full suite: exit 0, 1,589 pass / 0 fail, 0 cancelled/skipped/todo; duration 485,508.210253 ms (~8 min 6 sec), executed once.

## Tests run

- node --test tests/soul-poses*.test.mjs → exit 0, 8 pass, 0 fail.
- node --test tests/soul-poses*.test.mjs tests/interrogation-*.test.mjs tests/soul-portraits.test.mjs tests/asset-preload.test.mjs → exit 0, 43 pass, 0 fail.
- node --test tests/*.test.mjs → executed once, exit 0, 1,589 pass, 0 fail; see s1-art1-full-tests.log.
- git diff --check → exit 0.
- Read-only Pillow inspection: all six canvas sizes/RGBA/alpha extrema verified. HTML parser check: every comparison image link resolves to an existing file.

Narrative, verdict and karma files untouched. Worked only in the supplied worktree and existing branch; no commit, push, merge, deploy, hook or status/worklog edits.
