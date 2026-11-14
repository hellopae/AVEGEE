# Z4-GROUND: Codex 2x ground for zone 4 (Cyberhell) in the game (14 Nov 2026)

Same route as zones 1-3.  No drawing, no recolouring, no DOF/parallax: the pack chunks (Z4-HD-ASSEMBLE v7, 2048 px, q90, 70 parts) are only re-cut into 1024 px tiles (WebP q88).

    python3 scripts/install-ground.py <pack>/v7 --zone 4 --name v7 --activate     # img/map-zone4/v7/  (22.4 MB, 70 tiles + preview 1536x1024)

* Source (read only): `.codex-worktrees/20261114T071713Z-9434a667/docs/art-reviews/2026-11-10-z4-hd-assemble/v7`.
* Switch back: `ZONE4_GROUND_SET = 'v3'` in `src/zone-skin.js` (the 1x folder `img/map-zone4/v3/` stays on disk; the legacy loader `src/cyberhell-terrain.js` is only a fallback and still reads v3).  The zone uses the shared town terrain loader like zones 1-3 (`isTownZone('cyberhell')`).
* Evidence: `scripts/z23-ground-evidence.py` (zone `cyberhell`: shots / compose / fps; `W=1792 H=958` for the desktop size) and `scripts/z23-walkmask-overlay.py <out> cyberhell`.  Pictures: `Output/Review/2026-11-14-z4-ground/` (6 spots, old | new, plus 6 walkmask overlays).
* fps, desktop 1792x958, walk over the whole town (~210 u/s, 28 tile cap): old 59.8 fps / p95 16.7 ms / worst 67 ms / 0 stalls, new 59.1 fps / p95 16.8 ms / worst 67 ms / 0 stalls, 0 blurry samples, no failed requests.  (1440x900: 59.9 / 59.9.)  Baked ground memory 65 -> 99-111 MB.

## What the owner will notice
1. Sharper, darker and cooler than v3; the gold inlays on plazas are crisp; lava is deeper red with fewer white-yellow highlights.
2. Walkmask check: 6 overlays were made (main plaza, central bridge, lava bank, ice bank, heaven gate, south plaza); I looked at 5 of them (not the main-plaza overlay): the walkable edge follows the painted stairs, bridge deck, plaza rim, lava / water bank and building bases within about one walk cell (<= ~5 px of world 1x) in all five.  No spot seen > 5 px.  Codex's own check lists 19 landmark points > 4 px (max 10.44 px) that are NOT at these six places - not inspected one by one.
3. I looked at the old | new shots of main plaza, lava bank and heaven gate and the five overlays (all show the new ground): no visible tile seam at the 1024 grid and no object missing compared with v3 there.  The old | new shots of central bridge, ice bank and south plaza were produced but not looked at one by one.  (Lightning flashes appear in some old shots only: the weather is random, not a ground difference.)
