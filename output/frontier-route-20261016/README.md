# Border route and Nira combat — 2026-10-16

Implemented local source changes; not published.

- Town upper west stairs redrawn; west connector navigation now avoids the tea building facade.
- Town gate opens checkpoint. Lower checkpoint exit opens zone 1–2 wilderness.
- Free movement on painted roads, following camera, following Nira, roaming enemies and proximity combat.
- Ordinary camps can be defeated in either order; cave boss requires the camps and existing story prerequisites. Zone 2 gate requires cleared route and boss.
- Outside battles use Yama and Nira. Nira can attack or heal herself/Yama with an animated, skippable cutscene.
- Victory button: เก็บไอเท็มที่ตก. Rewards use existing single-payment mechanism.

## Assets and final prompts
Generated with built-in image_gen; references use existing Nira art. Runtime exports preserve transparency.

- `img/map-zone1/mainland-stairs-v2.webp`: preserve the existing 1536×1024 map, redraw west-central bridge connector as stone stairs and add hillside stairs matching the west terrace. No labels/UI/characters.
- `img/frontier-route/zone1-2-v1.webp`: painted isometric wilderness from a volcanic Thai gate through red/gold forest, waterfall, valley and bridge across a chasm, descend stone stairs to a cave clearing, then jade eastern gate. Warm volcanic scenery gradually becomes cool eastern mountains. No UI/text/characters. Final edit connected the bridge east exit to the cave using broad stone stairs.
- `img/frontier-route/battle-border-v1.webp`: wide Thai dark fantasy wilderness clearing, flat empty ground for opposing sprites, forest/waterfall/gorge backdrop, volcanic red/gold transitioning to jade mist. No UI/text/characters.
- `img/frontier-route/battle-cave-v1.webp`: wide empty basalt cave arena, guardian carvings and lava on the left, jade waterfall daylight through distant opening, no UI/text/characters.
- `img/nira-combat/nira-{th,asia,west,cyberhell}-sheet-v1.webp`: transparent 4×4 sprite sheet preserving Nira’s purple skin, horns, lavender bun, golden eyes and wooden manuscripts. Four frames per row: breathing idle; normal book/rune attack; hurt/flinch/recover; emerald-gold healing spell. Zone outfits match existing Thai, eastern kimono, western fur/leather and cyber armor references. Consistent cell scale, no labels or grid. Exported at 1280×1280, 320×320 cells.

Browser QA screenshots: overview-proof.png, free-roam-proof.png, nira-battle-proof.png, nira-heal-proof.png. Disposable review fixture uses in-memory saves. `verify.cjs` drives a separate headless Chrome profile.

Validation: full Node suite 743/743 passed; browser verified free movement, extracted animated Nira frame, proximity-triggered battle and exact actors `[you, global:nira]`. Asset loading regression and Nira checks 17/17 passed. `git diff --check` clean.
