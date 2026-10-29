# LEADER-ART evidence

- `before.png`, `after.png`, `before-after.png`: static composites of real Zone 3 terrain and the existing stone throne, using world-space draw sizes/anchors from the game. Reproduce with `python3 output/coordination/2026-10-29-leader-art/compose.py` from the repo root.
- `identity-comparison.png`: original and new sprites at the same 512×512 canvas size.
- `prompts.md`: both built-in image_gen edit prompts and normalization details.
- `tests.log`: output from the single required `node --test tests/*.test.mjs` invocation.

## Implementation and visual self-check

The active map uses `zone-skin.js` → west judgment skin → `img/theme-v4/town-judgment-west-v2.webp`. `scene.js` previously drew the ordinary `hero-boss` at SPOTS.throne `(1862,917)`, with its own red/gold chair. `boss-court-view.js` handles the final Zone 4 court and does not own this map sprite.

The new map-only key `hero-boss-seated` resolves to `img/West/hero-boss-west-seated-v2.png`. Ordinary dialogue/cutscene ruler references keep their original art. Manifest and west preload catalog include the new asset; cache versions change only for changed resources.

At the current dais `(1862,1057)`, width 307, the new sprite canvas is 64.0095 world units tall. Its hip anchor at 70% canvas height is placed on the stone seat at world Y=932.1533; canvas top is Y=887.3467. Placement follows the dais position/width rather than the old standee foot position. The map seat stays still, without standee bob or a floor contact shadow.

1. Inspected `after.png`: only the scene's stone throne remains; hips meet the seat and boots extend below the knees onto the front of the throne. No red/gold chair remains in the new sprite.
2. Inspected `identity-comparison.png`: same red face, eye patch/dark eye, yellow eye, white beard, horned helmet, silver armor, orange straps, fur, spear and raven. Raven now hovers without the removed chair-post fragment.
3. Full suite was invoked once: `node --test tests/*.test.mjs`, exit 1, 1,581 tests / 1,579 pass / 2 fail, about 597 seconds. Failures: `tests/h5b-cover-fx.test.mjs:179` required the existing manifest cache-version prefix; fixed by appending `-leader-art-v2` to the original version. Targeted follow-up `node --test tests/h5b-cover-fx.test.mjs` exited 0 (15 pass / 0 fail); see `cache-version-recheck.log`. The other full-suite failure is `tests/p6-cauldron-fireball.test.mjs:169`, expecting one hit for a press 60 ms after the last frame, actual zero. P6 source/tests were not modified; no baseline run was made, so this is not asserted to be a pre-existing failure. The full suite was not repeated, and acceptance criterion 3 (full suite 0 fail) remains unfulfilled.

Additional checks: `git diff --check` clean; PNG dimensions 512×512, RGBA alpha extrema 0–255; new path present in both west catalogs. Original sprite unchanged. No commit/push/merge or deployment performed.

These images are PIL composites, not browser screenshots. They check the throne/character geometry against the real assets; they do not exercise live browser rendering, NPC overlap, animated lighting or effects.
