# Exterior theme set — 6 October 2026

56 production WebP assets: four maps, four shared battle/court arenas, four frontier maps and eleven transparent building sprites per zone. Generated with imagegen using the wide station interiors as visual references. Original generated PNGs and review screenshots remain local and are not deployed.

- th: Thai black stone, gilded gables, crimson wood and volcanic amber.
- asia: jade stone, curved tiled roofs, red lanterns and cool mountains.
- west: snowy carved stone and oak, blue banners, wolf knots and warm fire.
- cyberhell: obsidian gothic architecture, gold trim, violet/cyan energy.

`src/theme-assets.js` resolves production paths before the legacy art manifest. Sprite sizes fit original plot widths and heights; map navigation deliberately samples the original terrain masks, not decorative gold or glowing details. Zone 4's old tilted server/rubble was removed from the new background; the sword shrine and its hit, worker and interaction coordinates moved together by (+65,+5) from the shared plot. All 56 assets belong in the zone preload catalog.
