# M2 — painted-town skin per zone (how to switch a zone on)

Zone 1 ('th') is the reference and always on. Zones 2-4 ('asia' / 'west' / 'cyberhell') keep the OLD map system until their
skin is switched on. Nothing in the engine mentions a zone name any more for these things; they all read `src/zone-skin.js`.

## Switch Zone N on (data only, no engine change)
1. Ground: paint 4 quadrants -> `img/raw/map-zoneN/q-{nw,ne,sw,se}.png` (3:2, >= 1536x1024; NOT committed).
   `python3 scripts/stitch-town-terrain.py --zone asia` -> `img/map-zoneN/v1/r{1-4}-c{1-5}.webp` + `zoneN-terrain-v1-preview.webp`.
2. Sprites (names in `PLANNED_ART` in zone-skin.js): put the files in place, then list the finished groups in the zone's
   `use: ['judgment','houses','trees','lamp','torch','rock']`. List a group ONLY after its files exist (a missing file draws
   the old placeholder, it does not fall back to Zone 1). A group that is not listed uses the Zone 1 sprite.
3. Station facades: `stations.facade` = { sala:'img/map-v5/st-sala-asia-v2.webp', ... } if v2 facades exist, else the plain
   `st-<k>-<zone>.webp` is used with the town box limits `facadeSizes`. `stationFlip` = override of `STATION_FLIP[zone]`.
4. Walk mask: `python3 scripts/make-town-mask-overlay.py --zone asia` -> owner paints -> `python3 scripts/extract-town-owner-mask.py
   --zone asia --layer <layer.png> --write` (overwrites `src/town-owner-walkmask-asia.js`; `patches` switches off by itself).
   Until then the zone walks on Zone 1's mask. Moved stations / houses / props: `TOWN_ZONE_LAYOUT[zone]` in town-layout.js.
5. Flow (moving lava / water): `scripts/bake-town-flow.py --zone asia --profile <json>` then `flowUrl` in the skin (null = none).
6. Light: `light.emit` (fire + hue sources), `light.flame` (torch flame frames).
7. `enabled: true`. Bump the `?v=` of zone-skin.js (and any touched module) in index.html's import map.
8. Saves: the first load after the switch moves positions of that zone once (`townSkinMigrated`, game.js `migrateTownSkinZone`).

Dev / test without art: `enableTownSkin('asia', {}, { fake:true })` (zone-skin.js) borrows Zone 1's ground and sprites.

## Frontier routes (src/route-geometry.js)
`ROUTE_GEOMETRY['asia:west']` / `['west:cyberhell']` are ready (same trail, pads, checkpoints, 6 patrols as 1-2, no boss cave) and
`enabled:false`. Put the 1672x941 picture at `background` (the trail must follow `DUNGEON_CORRIDOR`), then `enabled:true`.
