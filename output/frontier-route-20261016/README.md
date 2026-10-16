# Border route and Nira combat — 2026-10-16

Release prepared on current main (19d1afe). The initial working-branch push did not publish the game; this integration uses the actual v5 streamed terrain and preserves main’s town layout, lighting, battle menu and other-zone chase behavior.

- Upper circled bridge approach is redrawn in img/map-zone1/v5/r1-c2.webp; v5 preview/chunks are the actual town renderer assets. Upper stairs and landing have matching walk polygons. Lower circled stairs and landing are checked with real collision silhouettes in initial and fully built towns.
- Town gate opens checkpoint. Lower checkpoint exit opens zone 1–2 wilderness.
- Free movement on painted roads, following camera, following Nira, roaming enemies and proximity combat.
- Ordinary camps can be defeated in either order; cave boss requires the camps and existing story prerequisites. Zone 2 gate requires cleared route and boss.
- Outside battles use Yama and Nira. Nira can attack or heal herself/Yama with an animated, skippable cutscene.
- Victory button: เก็บไอเท็มที่ตก. Rewards use existing single-payment mechanism.

## Assets and final prompts
Generated with built-in image_gen; references use existing Nira art. Runtime exports preserve transparency.

- `img/map-zone1/v5/r1-c2.webp`: edit the existing actual v4 map chunk, replace the foliage blocking the eastern lava bridge approach with one continuous wide stone staircase meeting the city terrace. Preserve all surrounding terrain and tile edges; no UI/characters/text. Built-in image_gen produced the stair art; production export preserves the original outside the approved local corridor. Other chunks retain the v4 artwork. The matching v5 overview is regenerated from the shipped chunks.
- `img/frontier-route/zone1-2-v1.webp`: painted isometric wilderness from a volcanic Thai gate through red/gold forest, waterfall, valley and bridge across a chasm, descend stone stairs to a cave clearing, then jade eastern gate. Warm volcanic scenery gradually becomes cool eastern mountains. No UI/text/characters. Final edit connected the bridge east exit to the cave using broad stone stairs.
- `img/frontier-route/battle-border-v1.webp`: wide Thai dark fantasy wilderness clearing, flat empty ground for opposing sprites, forest/waterfall/gorge backdrop, volcanic red/gold transitioning to jade mist. No UI/text/characters.
- `img/frontier-route/battle-cave-v1.webp`: wide empty basalt cave arena, guardian carvings and lava on the left, jade waterfall daylight through distant opening, no UI/text/characters.
- `img/nira-combat/nira-{th,asia,west,cyberhell}-sheet-v1.webp`: transparent 4×4 sprite sheet preserving Nira’s purple skin, horns, lavender bun, golden eyes and wooden manuscripts. Four frames per row: breathing idle; normal book/rune attack; hurt/flinch/recover; emerald-gold healing spell. Zone outfits match existing Thai, eastern kimono, western fur/leather and cyber armor references. Consistent cell scale, no labels or grid. Exported at 1280×1280, 320×320 cells.

Browser QA screenshots: overview-proof.png, free-roam-proof.png, nira-battle-proof.png, nira-heal-proof.png. Disposable review fixture uses in-memory saves. `verify.cjs` drives a separate headless Chrome profile.

Validation on main integration: full run covered 1,010 tests; 1,005 passed, 5 old location/cache-token assertions were updated for the new release and all 29 affected regression tests passed. Core feature/asset suite 86/86 passed; terrain/navigation/chase 25/25 passed, including both stair flights with +/-8-unit walking lanes and real building silhouettes. Browser checks confirmed new terrain tiles, checkpoint exit, wilderness route, proximity encounter, exact actors [you, global:nira], animated sprite frames and healing via the real command UI. No browser exceptions. git diff --check clean.
