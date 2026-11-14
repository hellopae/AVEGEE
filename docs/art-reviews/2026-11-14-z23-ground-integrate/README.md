# Z23-GROUND: Codex 2x ground for zone 2 (Asia) and zone 3 (West) in the game (14 Nov 2026)

Same route as zone 1 v7r.  No drawing, no recolouring: the pack chunks (Z234-HD-ASSEMBLE v7, 2048 px, q90) are only re-cut into 1024 px tiles (WebP q88).

    python3 scripts/install-ground.py <pack>/v7 --zone 2 --name v7 --activate     # img/map-zone2/v7/  (22 MB)
    python3 scripts/install-ground.py <pack>/v7 --zone 3 --name v7 --activate     # img/map-zone3/v7/  (27 MB)

* Switch back: `ZONE2_GROUND_SET = 'v2'` / `ZONE3_GROUND_SET = 'v1'` in `src/zone-skin.js` (the 1x folders stay on disk; flow maps are in world units and are shared).
* Sources (read only): Asia `.codex-worktrees/20261113T085021Z-39f7fa12/docs/art-reviews/2026-11-10-z2-hd-assemble/v7`, West `.codex-worktrees/20261114T040600Z-9e8be8df/docs/art-reviews/2026-11-10-z3-hd-assemble/v7`.
* Evidence: `scripts/z23-ground-evidence.py` (shots / compose / fps), `scripts/z23-walkmask-overlay.py`; pictures are in `Output/Review/2026-11-14-z23-ground/` of the studio folder.
* fps (desktop 1440x900, walk across the whole town at ~210 u/s, 28 tile cap): `fps-desktop.jsonl` - old 59.1-59.3 fps, new 59.1-59.4 fps, p95 16.7-16.8 ms in both, 0 blurry (preview-only) samples, no failed requests, baked ground memory 65 -> 104-106 MB.

## What the owner will notice (Codex prompt list below)
Asia
1. asia-lava-bank shot (hero at world ~1050,1200): the long diagonal stair that climbs toward the upper right is partly a flat paved ramp in the middle stretch (treads gone for roughly a third of its length).  The walkmask is the same as before; it fits the ramp.
2. Cobbles are flatter / cooler than v2 on plazas; the lava crust is darker (less white-yellow glow).  Not wrong, a different painting.
West
3. Whole zone is cooler and lower in contrast than v1: snow on the ground and ledges is much thinner (v1 had white snow drifts along every cliff and path edge), the cobbles are grey-blue.
4. Objects painted out of the ground (small dead shrubs / snowy bushes along the cliff foot, around the plaza, beside the water, bottom of the central bridge) are gone or fewer.  Zone 3 has no sprite list, so nothing puts them back.
5. Central bridge head fallback (Codex's `central-bridge-head`) is softer than its surroundings, as Codex wrote.
Both
6. 7 (Asia) / 33 (West) landmark points were > 4 px off in Codex's own NCC check; I looked at 4 of the 8 walkmask-overlay pictures (asia lava-bank, asia central-bridge, west central-bridge, west north-stairs): the walkable edge follows the painted stairs, bridge, water and cliff edges within about one walk cell (~10 px at 2x, <= ~5 px of world 1x) in all four.  The other four were not inspected at that zoom.  Not a full-map proof.

### Prompt for Codex (copy)
"Zone 3 west v7: colour and snow level drifted from v1 (desaturated, snow cover thin, ground objects removed).  Keep geometry, put back the snow drifts along cliff/path edges at v1 strength and the removed dead shrubs / snow bushes (or export them as sprites with feet positions).  Zone 2 asia v7 lava-bank diagonal stair (map 1x 1340-1700 x 1120-1250): restore tread spacing as in v2.  Same registration, same 2048 chunk grid, no ImageGen on structure."
