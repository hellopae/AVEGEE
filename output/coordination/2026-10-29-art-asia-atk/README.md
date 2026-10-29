# ART-ATK2 — Asia empty-hand attack

New runtime asset: `img/Asia/hero-yama-asia-atk-v2.png`.
The original PNG and its L/R variants remain unchanged.

## Artwork evidence

- `comparison-four-zones.png`: Thai, Asia v2, West, CyberHell, at original canvas scale and a common foot baseline.
- `comparison-asia-before-after.png`: original Asia and revision side by side.
- `ai-original-01.png`, `ai-original-02.png`: unmodified built-in imagegen outputs. The second output is selected; the first still raised the hand.
- `prompt.txt`, `prompt-02.txt`: exact prompts for the two calls.
- `normalize.c`: reproducible nearest-neighbour reframing of output 02, with alpha below 128 removed to eliminate generation residue. No additional generation or hand-painted effects.
- `metrics.json`: measured dimensions and alpha bounds.

The revised sprite retains the red demon, Asian ceremonial hat, patterned kimono, cape, trousers and sandals. It faces right and extends an empty hand horizontally. Visual inspection of the saved comparison found no fireball, trail, glow or particles in the revised Asia sprite.

## Geometry

Coordinates are pixels; bbox right/bottom are exclusive.

| Measurement | Original Asia | Asia v2 |
| --- | --- | --- |
| Canvas | 512 × 512 | 512 × 512 |
| Full alpha bbox | (48, 0, 464, 512) | (48, 60, 392, 512) |
| Character/hat top | 60 | 60 |
| Foot baseline, inclusive | 511 | 511 |
| Character height excluding fire | 452 | 452 |

The original bbox includes fire at y=0 and x=464. Removing that effect necessarily changes the full alpha bbox; it does not change canvas size, character height or foot baseline. The original character top is measured in x=[0,220), outside the fireball.

## Integration

The manifest and preload catalog select v2. `art.js` aliases the existing semantic attack key to the new asset. `ragePoseSrc('asia')` also selects v2. The preload priority rule accepts versioned attack filenames. Cache versions change only for the modified source modules, manifest and catalog. Existing facing normalization strips `-v2`; its test now uses that same normalization.

## Validation

- Targeted command: `node --test tests/skill-atk.test.mjs tests/west-hit-facing.test.mjs tests/asset-preload.test.mjs tests/30b.test.mjs` — 29 tests, 29 pass, 0 fail. See `tests-targeted.log`.
- Full command: `node --test tests/*.test.mjs` — 1,582 tests, 1,582 pass, 0 fail, 0 skipped, exit 0; 546.277 seconds. See `tests-full.log`.
- `git diff --check` — no whitespace errors.

No browser/gameplay QA or deployment was performed. No commit, push, merge, branch change or other-agent call was made.

## Acceptance self-check

1. Four-zone comparison: inspected the saved sheet and Asia before/after; v2 has the same character/outfit, a horizontal empty-hand attack, and no effect pixels visible.
2. Geometry: canvas 512×512, character top 60, character height 452, foot baseline 511 unchanged. Full alpha bbox changes only as documented above, reflecting the removed fire and changed arm pose.
3. Required test command: completed with 1,582 pass and 0 fail. Path/facing and preload tests now exercise the versioned asset; the added geometry test measures the retained original against v2.
