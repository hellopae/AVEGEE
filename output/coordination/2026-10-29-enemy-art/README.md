# ENEMY-ART — 2026-10-29

## Findings and implementation

`src/data.js` defines 17 mob kinds. The reported skeleton/bot/bug already have regional PNGs, but their root fallback files are absent. The scan also found the same missing fallback for the worm. Before the async manifest loads (or when it fails), the previous `artUrl()` returns those absent root files. A portrait can then request an absent `-profile` file and fall back to the same absent standee; the turn queue uses that standee directly.

| Previously missing fallback | Zone / reference | New file |
|---|---|---|
| `mob-skeleton` | west / `img/West/mob-skeleton-west.png` | `img/mob-skeleton.png` |
| `mob-bot` | cyberhell / `img/CyberHell/mob-bot-cyberhell.png` | `img/mob-bot.png` |
| `mob-bug` | cyberhell / `img/CyberHell/mob-bug-cyberhell.png` | `img/mob-bug.png` |
| `mob-worm` | cyberhell / `img/CyberHell/mob-worm-cyberhell.png` | `img/mob-worm.png` |

All four new files were generated with built-in `image_gen`, one call per enemy (4 calls total), using the listed local images as style/identity references. The exact prompts are in [prompts.json](prompts.json). Generated RGBA files were resized to 512×512 with nearest-neighbor resampling; alpha was retained. No new attack/walk sheets are required: these mobs use the existing standing-sprite system for map, battle, portrait fallback and turn icon.

The new `src/enemy-art.js` resolves enemy files before the manifest is available. Existing regional art keeps its paths. The four Asia-only enemies (`mob-gaki`, `mob-kasha`, `mob-nukekubi`, `mob-hitodama`) resolve directly to their existing Asia files, including during cold startup and cross-zone fallback; no duplicate drawings are needed. Explicit boss keys retain their home zone. Enemy profile requests return null so the caller selects the existing standee without an initial missing-file request. This is deliberately limited to enemy families; hero/crew resolution is unchanged.

The four new files are registered in `img/manifest.json`. Only the changed `art.js` entry in the HTML import map and the changed manifest fetch URL receive cache version updates.

## Scan and visual evidence

- [asset-audit.md](asset-audit.md): every mob/boss/possessed enemy key found recursively in data, checked in all four zones, including fallback combinations. 31 keys × 4 zones, 0 missing/unregistered paths. `zone-skin.js` contains town/environment art rather than enemy overrides; `regional-spirits.js` contains soul portrait aliases rather than mob/boss overrides. Both were inspected and included in the scan.
- Reproduce the path table from repo root: `node output/coordination/2026-10-29-enemy-art/audit.mjs`.
- [contact-sheet.png](contact-sheet.png): regional references on the left, new fallback sprites in the middle, 64px turn-size previews on the right. Checkerboard is added only to the comparison sheet, not the sprite files. Inspected locally: skeleton looks left; bot leads with its left claw; bug head points left; worm mouth points left. Palettes and pixel shading follow the regional references.
- [image-checks.txt](image-checks.txt): decoded PNG dimensions/mode, alpha range and visible bounds. All new files are 512×512 RGBA with alpha 0–255.

This is a static image and filesystem review. No browser was opened; live map/battle screenshots and visual QA remain for Dale.

## Tests and acceptance self-check

- `node --test tests/enemy-art.test.mjs`: 3 pass, 0 fail ([log](tests-targeted.log)). Exercises the real `artUrl()` and the UI's actual `storyFoeArt()` with manifest loaded/unavailable across all zones, checks map/battle/turn/portrait paths exist and are registered, checks PNG headers and regional/home-zone identity.
- Full suite invoked once with `node --test tests/*.test.mjs`: **1,615 tests, 1,615 pass, 0 fail, 0 cancelled/skipped, exit 0**, duration 120,522 ms. Full output is recorded in [tests-full.log](tests-full.log) and [tests-full-exit.txt](tests-full-exit.txt).
- `git diff --check`: no whitespace errors at implementation review; final check recorded separately.

1. Missing-enemy table → new files: delivered above. Static resolver/file coverage has no missing enemy paths; this is not a browser/network verification.
2. New/reference contact sheet in the requested coordination directory: delivered and inspected.
3. Full tests 0 fail: met by the single full run (1,615 pass / 0 fail / exit 0). This does not establish live visual QA.

## Changed files

- `img/mob-skeleton.png`, `img/mob-bot.png`, `img/mob-bug.png`, `img/mob-worm.png`: new transparent fallback sprites.
- `src/enemy-art.js`: manifest-independent enemy path resolution and profile fallback.
- `src/art.js`: call the enemy resolver; bump the changed manifest URL.
- `img/manifest.json`: register the four new PNGs.
- `index.html`: bump only the changed art module's import-map URL.
- `tests/enemy-art.test.mjs`: asset existence/registration, manifest availability, portrait/turn/map and identity regression checks.
- `output/coordination/2026-10-29-enemy-art/`: this report, complete asset table/reproduction script, prompts, contact sheet, decoded image checks, test logs/exit status and whitespace-check result.

No commit, push, merge, deployment, branch change, second worktree, hook, status.json or worklog.json edits were performed.
