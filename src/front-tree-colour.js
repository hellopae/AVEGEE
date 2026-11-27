// FB3-T9 (owner 22 Nov): the tree standing in front of a Zone 1 building's room takes its colour from where that building stands on the big map -
// the left third of the map has the red (lava) trees, the middle the green ones, the right third the white (snow) ones, like the trees outside.
// The sprites are the game's own banyans of each colour (img/theme-v4): nothing is recoloured in code; a drawing saved over a file changes the room too.
import { TOWN_SIZE, TOWN_STATION_SITES, TOWN_HOUSE_SITES } from './town-layout.js?v=k1d';

export const FRONT_TREE_ART = Object.freeze({
  red:'img/theme-v4/town-tree-red-th-v1.webp',
  green:'img/theme-v4/town-tree-th-v1.webp',
  white:'img/theme-v4/town-tree-snow-th-v1.webp',
});
/** x of each building on the big map in Zone 1 (the layout as it is when the game starts - the canteen has no station site, it stands on house slot 3). */
export const ZONE1_BUILDING_X = Object.freeze({ ...Object.fromEntries(Object.entries(TOWN_STATION_SITES).map(([k, s]) => [k, s.x])), canteen:TOWN_HOUSE_SITES[3].x });

/** 'left' | 'middle' | 'right' - thirds of the map's width. */
export const mapThird = x => x < TOWN_SIZE.w / 3 ? 'left' : x < TOWN_SIZE.w * 2 / 3 ? 'middle' : 'right';
export const FRONT_TREE_COLOUR = Object.freeze({ left:'red', middle:'green', right:'white' });
/** The colour of the front tree of a Zone 1 building's room ('red' | 'green' | 'white'), or null for a building the map does not know. */
export const frontTreeColour = k => ZONE1_BUILDING_X[k] == null ? null : FRONT_TREE_COLOUR[mapThird(ZONE1_BUILDING_X[k])];
export const frontTreeArt = k => FRONT_TREE_ART[frontTreeColour(k)] || null;
