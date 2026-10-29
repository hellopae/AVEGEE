# B34-v2 continuation — 29 October 2026

Applied the complete previous run's `diff.patch` with `git apply --reject --whitespace=nowarn` in the supplied worktree. Every hunk applied cleanly; no `.rej` files were produced. The inherited coordination folder contained only `centerline.jpg` and an unfinished test log, with no handoff notes. The current `node-tests.txt` replaces that unfinished log with this run's full-suite output.

## Implementation and scope

- Enabled only `west:cyberhell`, using its independent 1672×941 owner mask, 68 corridor vertices, checkpoint vertices 7/34/48, and ordinary foes 10/11/12. No new boss/captain caves.
- Exact alternating blocked/walkable RLE: 107,353 floor pixels, one connected component, no dilation or added walkable pads. The northern branch remains closed.
- Preserved all 28 owner tree roots: 16 white, 11 teal, one purple. Snow/pine/crystal art already exists; no generation, image edits, or background changes were necessary. Tree anchors use the existing depth-sorted renderer. Real visual grounding, palette and canopy overlap still require browser review.
- Updated only the route-geometry cache token in `index.html`; preserved the current R1 renderer/import-map tokens. Other route definitions and shared renderer/navigation code remain unchanged.
- Updated legacy tests that expected route 3–4 to be disabled. Added owner-mask, checkpoint/migration, native input-handler and draw-order coverage; fixtures match the supplied owner files byte-for-byte (`source-hashes.json`).

## Verification

The Node input tests mount the production `mountDungeonView`, dispatch its pointer/keyboard handlers, and advance animation frames against a mocked DOM/Canvas. They exercise movement and draw calls, not browser layout or real image decoding. Checkpoint combat outcomes are resolved through `resolveDungeonEncounter`; combat itself is not played. Patrols are marked defeated to isolate checkpoint traversal.

- Initial focused run: 11 tests, 11 pass, 0 fail (B34 plus B5b).
- Final focused B34 run after adding native boundary input coverage: 9 tests, 9 pass, 0 fail; `targeted-tests.txt`.
- Full suite, run exactly once: `node --test tests/*.test.mjs` exited 1 after 508,028 ms (8m28s): **1,590 tests, 1,586 pass, 4 fail**; see `node-tests.txt`. Three failures were obsolete B34-disabled expectations in `dungeon-art`, `l3-biome-weather`, and `z3-west-integration`; these assertions were corrected after that run. The fourth was `workers.test.mjs`'s Python atlas check exceeding its existing 30-second subprocess timeout. Worker production/test code was not changed. Focused rerun results are recorded below; the full suite was not rerun per the one-run instruction, so a final full-suite 0-fail result is not established.
- After fixing the three stale route assertions: `node --test tests/dungeon-art.test.mjs tests/l3-biome-weather.test.mjs tests/z3-west-integration.test.mjs` exited 0, **11 pass / 0 fail** in 32,525 ms (`retest-route-assertions.txt`).
- Isolated worker check: `node --test --test-name-pattern='frame-local atlas guards' tests/workers.test.mjs` exited 1, **0 pass / 1 fail**, with the same `spawnSync python3 ETIMEDOUT` at 30 seconds (`retest-worker-atlas.txt`). This remains unresolved; no timeout extension or unrelated worker changes were made.
- `git diff --check`: no errors.
- `capture.py` parsed successfully with Python `ast.parse`; browser execution stopped at Chromium launch.

## Acceptance self-check

| Criterion | Evidence and remaining limit |
| --- | --- |
| 1. Walk start → exit through three checkpoints; reject at least five boundaries including closed branch | Production movement/input handlers exercised at widths 1280 and 390, through all three gated checkpoints and exit. Six blocked points tested via navigation and native pointer/held-key handlers: `[.12,.14]`, `[.22,.22]`, `[.4,.47]`, `[.58,.29]` (northern branch), `[.81,.6]`, `[.67,.78]`. Real-browser traversal remains unverified. |
| 2. 28 trees match preview and occlude correctly | Exact owner coordinates/counts and roots outside mask are asserted; native render draw calls verify all 28 anchors, plus hero ordering before/after tree 25. Real visual palette, size, grounding and all-tree occlusion review remain unverified. |
| 3. Connected mask, centerline inside, 28 roots outside, full Node suite 0 fail | Geometry assertions pass. Full suite recorded 1,586 pass / 4 fail before the three stale assertions were fixed. Focused reruns are recorded below; **full-suite 0 fail is not established**. |
| 4. Desktop + 390×844 screenshots, empty console, evidence folder | **Incomplete due to sandbox browser launch failure.** One Chromium attempt failed with `MachPortRendezvousServer: Permission denied (1100)`; no retries. No browser screenshots were created and console cleanliness is unverified. Launch details: `browser-launch.txt` and `browser.json`. |

## Browser review handoff

From the repository root on a machine that can launch Playwright Chromium:

```sh
python3 output/coordination/2026-10-28-b34-border34/capture.py
```

The script serves a temporary in-memory fixture at localhost, using production CSS, import map, art and `mountDungeonView`. It seeds cleared checkpoints and positions solely for visual snapshots; it never writes player saves or modifies production responses. It captures start/middle/lower/exit at 1440×900 and 390×844 and writes console/page/request/HTTP errors to `browser.json`. These seeded screenshots do **not** prove browser traversal. Inspect the screenshots and console, then manually traverse the route and test the closed northern branch in the real game before accepting criteria 1/2/4.

`centerline.jpg` is inherited geometry evidence, not a screenshot from this run. Optional L3 snow/waterfall effects were not added.

## Changed files

- Production: `index.html`, `src/route-geometry.js`, `src/frontier-walkmask-west-cyberhell.js`.
- Tests: `tests/b34-border34-input.test.mjs`, `tests/b34-border34-owner-mask.test.mjs`, `tests/b5b-captain-cave.test.mjs`, `tests/c1-frontier-grounding.test.mjs`, `tests/c6-border23-owner-mask.test.mjs`, `tests/f12-mask.test.mjs`, `tests/m2-route-geometry.test.mjs`, `tests/dungeon-art.test.mjs`, `tests/l3-biome-weather.test.mjs`, `tests/z3-west-integration.test.mjs`.
- Fixtures: `tests/fixtures/border34-owner-mask.png`, `tests/fixtures/border34-owner-trees.json`.
- Evidence in this directory: `README.md`, `centerline.jpg` (inherited), `node-tests.txt`, `targeted-tests.txt`, `retest-route-assertions.txt`, `retest-worker-atlas.txt`, `source-hashes.json`, `capture.py`, `browser.json`, `browser-launch.txt`.
