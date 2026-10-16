# Codex update — map polish and closed backlog, 16 October 2026

The 7690c56 handoff was reviewed before starting. Previous animation/night-city delivery is be307b5. This follow-up closes the outstanding alert icon and five previously failing tests, plus the owner's new map corrections.

## Delivered

- Expanded ground cleanup around roots and footprints; v4 terrain uses the existing 1024px chunk geometry (last column 819, last row 205). Actual file dimensions are now checked against the renderer for all 20 chunks. Ground outside the editing mask is byte-identical to the prior full painting.
- Terrain grade is brighter and more neutral (.74/.73/.76 ambient), retaining the orange fire layer and warm fixture pools. Matches independent rocks/trees/buildings more closely.
- Station shadow origin now uses the actual sprite rectangle and measured visible base, rather than the station's nominal anchor. Shorter cast length (.48) keeps the base connected. Contact shade remains under the measured building footprint.
- Nira speech renders at 74% of its previous size, closer to her head. Other speech stays at its previous size/height.
- Newly drawn diagonal stone stairs replace the tree-covered route east of the middle lava bridge. A connected lower landing and the stair polygon are walkable; neighboring cliff remains blocked. Removed the independent tree obstructing the stair's upper end.
- Finished L2b alert icon 64x64 and connected it to the dungeon chase alert (text fallback retained while loading).
- Memory-only game review can start the actual map loop and visit plaza/ice/quarry/stairs, with built station art. No production save reset or changes.

## Closed old failures

- Mirror depth and return-to-idle tests now recognize the drawn Yama book animation atlas, preserving actual before/after depth ordering and adjustment attack checks.
- Cache tests verify the active entry matches importmap instead of requiring obsolete 20261009 tokens.
- Construction canvas stub now handles the browser drawImage natural-size overload and scratch canvases, preserving concurrent worker ownership/render assertions.

Full integrated suite: 996/996 passing. Final focused checks include the added continuous stair-route regression and actual v4 chunk dimensions. No runtime mirror/construction behavior was weakened to satisfy tests.

Claude CLI was attempted for system-only work but was limited until 14:00 Bangkok; Codex completed these system fixes too. Shared original checkout and unrelated changes/deletions were preserved. Optional previously paused ART-02C port/coast audit and optional L2 copy review remain outside this delivery.
