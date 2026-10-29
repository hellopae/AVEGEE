// Small first-frame bundle shared by the preload gate and canvas renderers.
// Keep decoded exterior sprites, not rooms, cutscenes or terrain chunks.
import { townSkinOf, ZONE1_TOWN_ART } from './zone-skin.js';
import { themeArt, THEME_STATIONS } from './theme-assets.js';
const decoded = new Map();
export function townStartupAssets(zone) {
  const skin = townSkinOf(zone);
  if (!skin) return [];
  return [...new Set([
    ...Object.values({...ZONE1_TOWN_ART, ...skin.art}),
    ...THEME_STATIONS.map(k => themeArt(`st-${k}`, zone)),
    themeArt('town-house-th', zone), themeArt('town-waterfall-th', zone),
    `img/food-art/canteen-${zone}.webp`,
  ].filter(Boolean))];
}
export const startupImage = url => decoded.get(url) || null;
export function retainStartupImage(url, image) {
  if (image) decoded.set(url, image);
}
export function withTownStartupAssets(tiers, zone) {
  const urls = townStartupAssets(zone), own = new Set(urls);
  return {
    critical:[...new Set([...tiers.critical, ...urls])],
    background:tiers.background.filter(url => !own.has(url)),
    late:tiers.late.filter(url => !own.has(url)),
  };
}
