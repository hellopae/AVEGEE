# AVEGEE — Layered Zone1 / Battle9 update, 15 October 2026

Start from current `origin/main`, not the old `codex-app/2026-10-04` checkout. The integration checkout is `/private/tmp/avegee-pages-20261014`; original workspace has unrelated deleted/untracked assets that must not be staged wholesale.

## User requirements implemented

- Zone1 no longer renders the low-resolution `mainland-v1.webp` painting as its map ground. `src/town-terrain.js` assembles native repeating materials for soil, plaza, volcanic ground, frost, grass, water and lava. All walkable paving/bridges follow the exact declarative navigation rectangles and polygons.
- Render only visible chunks at the camera/device resolution; bounded per-context LRU cache. Overview/minimap use lower-resolution chunks. The actual game and preview render the zoomed viewport directly, avoiding upscaling a world-sized intermediate bitmap.
- Buildings remain separate construction sprites. 110 separate rooted scenery objects include tree clusters, bushes, rocks, volcano, mountain ridges and waterfall. Shadows use object alpha; rendering orders objects and actors by ground-foot Y. Tall silhouettes do not expand collision roots. Tree crowns fade when Yama is behind them.
- Facilities use mapScale1.2 instead of1.5. Civic anchors moved upward: throne1920,1030; bench1920,1150; Nira2050,1170. Judgment platform is440worldpixels wide and ends at Y1230. Its authored stairs are drawn once.
- Battle9 uses full arena, vertical maroon/gold action rows next to the active actor, staggered slide transitions and right-side power/item flyouts. Current actor gets a framed circular portrait; next actors use overlapping circular portraits. Formation stepping and the matching bottom profile order are preserved.
- **Latest user instruction supersedes earlier confirmation requirement:** after selecting attack/power, clicking the enemy executes immediately. There is no second Confirm button. Clicking an enemy without a pending action only selects it. Busy/animation guards prevent double execution. Healing similarly executes on valid recipient click.
- Preserve individual turn queues, skill cooldowns, Nira/Guard recovery, dungeon progression and port activation/FastTravel from the prior release.

- Comment8 interrogation now uses the same maroon/gold vertical commands and sliding thumbnail panels. Dossier/questions/log remain in the right column; original limits, power costs and warrant validation remain authoritative. The review page has a separate สอบสวน button.

## Art and navigation

13 native assets under `img/map-zone1/`: 7 material tiles and6 transparent cutouts, ~9.73MiB combined. Native textures1254×1254; large props1536×1024. No claim of native4K. Source prompts, dimensions, hashes and alpha/seam QA are in `docs/terrain-art-2026-10-15.json`.

`mainland-v1.webp` remains as a compatibility asset for older consumers; never restore its painted buildings under the separated Zone1 props. Build new props with transparent backgrounds and put collision/foot anchors in `town-layout.js`.

Tests cover compact ellipse roots, off-route scenery, facility/crew/queue walkability, every exact-door route, construction arrivals and combat/cooldown commands. Town geometry uses exact floating-point positions rather than flooring to a raster sample at diagonal corridor edges. Other realms retain independent terrain masks.

## Review

- `output/zone1-2d/index.html`: map review, full buildings toggle, camera zoom, route overlay and destination walking; no actual-save writes.
- `output/game-review/index.html`: battle/dungeon/port review with in-memory save.
- Cache marker: `20261015-layered-battle9-r1`. Keep index preload URL and ui.js preload import identical.
- Publish to `main` because GitHub Pages uses `main` root. Verify Pages built commit before claiming the live site is updated.

Validation: main suite 915/917 passed; the only two failures were assertions for the retired cache suffix. Updated cache assertions and preload catalog version: 8/8 pass. Affected interrogation/progression suites: 79/79 pass. Earlier render-context and continuous terrain checks were repaired and retested. Browser checks verified power→enemy click damage/MP exactly once and Where→Keeper→Intensity→Issue resulting in the expected resistance battle. Deployment SHA/Pages evidence is recorded in the local handoff note after publishing.
