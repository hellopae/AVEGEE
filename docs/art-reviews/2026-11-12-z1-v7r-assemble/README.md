# Z1 v7r — v7 ground + Codex's 7 native repairs, joined by script (12 Nov 2026)

No drawing, no ImageGen, no recolouring of art: every pixel is either from the v7 pack or from a Codex native
(warped by Codex's own registration affine, Lanczos4, exactly as in Codex's `registered-2x.webp`; mean |diff| vs their export 0.01-0.36 / 255).

## How a spot is joined (scripts/assemble-v7r.py)
1. Native -> 2x with `nativeToContextPx1x * 2`.  Core of the spot = native, pixel for pixel (max diff 0, `verify-v7r.json`).
2. The 48 map px ring around the core (96 output px) is the join zone.  On each side (not on a map edge) a min-cost path
   (Codex assemble.py cost: Gaussian-5 of the squared RGB difference, steps -1/0/+1, never in the first/last 10 px) is found between
   v7 (outside) and the native (inside), smoothstep feather +-8 output px.
3. v7 still holds the blurry v5 fallback inside part of the ring (Codex's own join).  The v5 baseline is rebuilt (hashes match Codex's) and
   every pixel of v7 that is still that fallback gets +3000 path cost, so the cut lands where v7 is already native.
4. Colour/brightness: low-frequency (v7 - native) measured near the seam, clipped to +-10 RGB, tapered to 0 at the core edge - ring only.
5. Nothing outside the 7 context rects changes (0 px), 10 of 20 2048-chunks were re-encoded (q90), the other 10 copied byte for byte.
   Installed with `scripts/install-z1-ground.py <pack> --name v7r --activate` (70 tiles 1024 px, q88, 23.6 MB).

| spot | native from | seam | note |
|---|---|---|---|
| forest-r4-c1-q12 | REPAIR-1 | left/right/top (bottom = map edge, no ring) | |
| heaven-bridge | REPAIR-1 | 4 sides | the "top edge of the bridge" joins fine - the v7 top band was NOT needed (`--bridge-top v7` exists, not used) |
| lava-north-stair | REPAIR-1 | 4 sides | small straight edge of a red plant at the lower right is in Codex's native itself (see Known) |
| lava-mid-stairs | REPAIR-1 | 4 sides | |
| lava-low-stair | REPAIR-2 | 4 sides | |
| south-plaza-stair | REPAIR-2 | 4 sides | |
| pier-stair | REPAIR-2 | 4 sides | gold rails painted in the native -> `pier-back/front` sprites stay `off` (would double) |

No spot fell back to v7.

## Checks (all re-runnable: assemble-v7r.py, verify-v7r.py, compare.py, walkmask-overlay.py)
* `verify-v7r.json`: 0 px changed outside contexts; core == native; Laplacian variance of the ring is 1.21-1.81 x the 60 px band around the spot (v7 ring was 0.52-0.80 x).
* `compare/*-v7-vs-v7r.jpg`: before | after at output px, cyan = context, magenta = core.
* `game-zoom/cmp-z5-*.jpg`: the real game (390x844 @2x, max zoom) v7 | v7r.
* `walkmask-overlay/*.jpg`: unchanged walkmask (red = blocked) over v7 | v7r - edges follow the repaired stairs.
* `render-v7.json` / `render-v7r.json`: shader overflow / uncovered per spot (4 views each), `perf-v7r.jsonl`: fps.

## Known
* lava-north-stair, lower right: Codex's native has a vertical straight edge where a dark red plant meets the floor.  Its lower ~40 output px
  fall in the ring and are joined; ~25 px of the straight edge remain inside the core.  Not hidden by painting (not allowed).
* heaven-bridge: Codex's `join-review.json` flagged the bridge top rim - in v7r it joins without a visible cut (see compare image) but the
  native rock behind the bridge has a different shape than v7's.
