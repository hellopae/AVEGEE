# S1-ART5 — 29 October 2026

Worked only in the supplied worktree and branch. No Shado, CLI generation, agents, browser, deployment or git mutations. Built-in image_gen: one call using the original clerk as reference, transparent_background true; no retries. Original art, classifications, narratives, verdicts and karma unchanged.

Changed files:
- img/soul-poses/clerk-asia-caught-lie-v1.png — one new 1254×1254 RGBA sprite for A16.
- src/soul-poses.js — clerk original/type registration; preload uses existing registry integration.
- tests/soul-poses.test.mjs — extends Asia selection, evidence immutability, used/exhausted/return guards, region guard, other-case exclusion and preload deduplication to all eight ART5 cases.
- case-review.md — updates eight statuses and records ART4 audit and ART5 reuse.
- comparison.html — four original/pose pairs covering eight ART5 cases; 50 total image references, zero missing files.
- prompts.md — exact executed prompt and original/output paths; provenance of reused ART4 images.
- s1-art5-targeted-tests.log, s1-art5-full-tests.log and this report — verification evidence.

Acceptance self-check:
1. Artwork coverage: all eight cases covered. A16 uses new clerk; A10/A14/A17/A18/A20 share ART4 business; A12 shares ART4 woman; A15 shares ART4 executive. ART4 six files, registrations, prompts and eight reviewed statuses already complete. No artwork pending in ART4–5.
2. Identity: directly inspected clerk original/output and business/woman/executive original/output pairs. Same character identity, costume, palette, pixel-painted style, held objects and tails remain recognizable. Wide eyes, startled mouth and separate sweat droplets are in the sprite. New clerk is byte-identical to built-in output, SHA256 d33aa38286dfba8e8a6d64fbf79727b0a60c78a006df47cce3b6d5f8a335d384. All seven Asia registered pairs match original dimensions, RGBA alpha extrema 0–255. No resampling, compositing or alpha edits. Clerk alpha ≥128 bounds (222,10,1024,1244) → (222,9,1025,1244): lower edge matches, upper/right differ 1 px. Reused business lower edge differs 5 px (ART4 evidence retained). Exact pixel anchor alignment remains unverified; therefore the strict alignment requirement is not fully established. Browser/renderer review was not performed as instructed. No claim that QA passed.
3. Tests: node --test tests/soul-poses*.test.mjs: exit 0, 10 pass / 0 fail. Related S1 command: node --test tests/soul-poses*.test.mjs tests/soul-portraits.test.mjs tests/interrogation-*.test.mjs tests/asset-preload.test.mjs: exit 0, 45 pass / 0 fail. git diff --check: exit 0. Full suite run once at the end; final result recorded below.

Full suite: `node --test tests/*.test.mjs` — single run, exit 0, 1591 pass / 0 fail / 0 cancelled / 0 skipped, duration 375108 ms. Evidence: s1-art5-full-tests.log. Final git diff --check: exit 0. Automated acceptance criterion 3 is satisfied; the visual alignment limitation in criterion 2 remains.
