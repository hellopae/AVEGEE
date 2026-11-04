# Z1-LAYOUT-B1 evidence (Toby, 5 Nov 2026)

All images are stills of the real game (Chromium via Playwright, fresh save slot, in-memory), made by the scripts in `scripts/z1-v6-*.py`.

| folder / file | what it shows | made by |
|---|---|---|
| `walkmask-overlay-ok.jpg` | walk floor (green) on ok.jpg, spots / crew homes / queue (yellow), station doors (blue) | `scripts/build-zone1-v6.py` |
| `overview/compare-game-left-proof-right.jpg` | the game's whole-map view (left) vs `proof-composite.jpg` cropped to the same world window (right) | `z1-v6-overview-evidence.py` |
| `walk-390/`, `walk-desktop/` | gate-side start -> plaza -> dais -> upper platform -> heaven gate -> lava side -> ice side -> pier -> lower gate; `walk-report.json` lists every leg (every sample stayed on floor) | `z1-v6-walk-evidence.py` |
| `occlusion/` | Yama behind / in front of two pines and the upper gate (wall vs arch), 2x crops, `*-pair.jpg` left = behind, right = in front | `z1-v6-occlusion-evidence.py` |
| `edge-report.json` | arrow key held into cliffs, water, tree trunks, dais wall: 0 samples off the floor | `z1-v6-edge-evidence.py` |
| `zones/` | zone 1-4 stills before (commit d55d08ac) and after; `zones-diff.json` has the pixel difference (zones 2-4 identical, only animation noise) | `z1-v6-zones-evidence.py` |
| `save-*.jpg`, `save-report.json` | pause, resume, save, page reload, load, zone 1 -> 2 -> 1 | `z1-v6-save-evidence.py` |
| `zone1-360x740.jpg` | 360 px wide phone viewport | `z1-v6-walk-evidence.py` boot |

Re-run: start any no-cache **threaded** static server on the repo root (`python3 scripts/serve-nocache.py` is single threaded and stalls with Chromium), then
`BASE=http://127.0.0.1:<port>/index.html python3 scripts/z1-v6-walk-evidence.py <outdir> 390 844` (and the other scripts, same arguments).
