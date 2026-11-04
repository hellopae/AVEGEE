# Z1-LAYOUT-B2 evidence (5 Nov 2026)

- `liquid-regions.png` : lava (red) / river (blue) / ice stream (cyan) painted over ok.jpg, from DATA (ok.jpg lava colour + base layers, inside the terrain alpha holes). Under the big left arch is lava.
- `mist-zones-and-points.png` : mist zones (white = river, gold = lava steam, pale blue = ice) = liquid + bank minus the walk floor, and every emitter point (magenta bubble, yellow steam, white sparkle, green foam, orange lava fall, cyan river mist, blue ice mist, red embers).
- `b2-evidence/` : clips + stills recorded from the real game (Playwright, Chromium with GPU): `clip-1` lava / mist / river while walking, `clip-2` sky clouds drifting + parallax + cloud shadows on the ground, `clip-3` 390x844 walk.
- Rebuild the data: `python3 scripts/build-zone1-fx.py` (needs `FX_ART_DIR` = Codex FX-ART-Z1 folder only to refresh the sheets).
