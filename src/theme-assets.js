import { mapReviewArt } from './map-art-v5.js';
import { townSkinArt, ZONE1_TOWN_ART } from './zone-skin.js';
// Exterior art shares the material, architecture and lighting of the wide rooms.
export const THEME_ZONES = ['th', 'asia', 'west', 'cyberhell'];
export const THEME_STATIONS = ['sala', 'krata', 'dab', 'lokan', 'ngiw', 'lan', 'tea', 'sawan', 'tarang', 'frontier', 'krajok'];
export function themeBackground(zone, kind) {
  if (kind === 'arena' && zone === 'th') return 'img/map-zone1/arena-v1.webp';
  if (kind === 'map' && zone === 'th') return 'img/map-zone1/mainland-v1.webp';
  return `img/theme-v4/${kind}-${THEME_ZONES.includes(zone) ? zone : 'th'}.webp`;
}
export function themeArt(key, zone) {
  // M2: the town sprites of a zone come from its skin (zone-skin.js); a role the skin does not list, or a zone that
  // still uses the old map system, gets the zone-1 file exactly as before.
  const skinned = townSkinArt(zone, key) || ZONE1_TOWN_ART[key];
  if (skinned) return skinned;
  if(key.startsWith('town-prop-'))return `img/map-zone1/prop-${key.slice(10)}-${key==='town-prop-waterfall'?'v2':'v1'}.webp`;
  if(key.startsWith('town-terrain-'))return `img/map-zone1/terrain-${key.slice(13)}-v1.webp`;
  if (key === 'town-waterfall-th') return 'img/theme-v4/town-waterfall-th-v1.webp';
  if (key === 'town-house-th') return 'img/theme-v4/town-house-th-v1.webp';
  if (key === 'town-paving-th') return 'img/theme-v4/town-paving-th-v1.webp';
  const revised = mapReviewArt(key, zone);
  if (revised) return revised;
  if (key.startsWith('theme-map-')) return themeBackground(key.slice(10), 'map');
  if (key === 'BG-Turn-Base') return themeBackground(zone, 'arena');
  if (key === 'BG-Frontier') return themeBackground(zone, 'frontier');
  if (key.startsWith('st-') && THEME_STATIONS.includes(key.slice(3)))
    return `img/theme-v4/${key}-${THEME_ZONES.includes(zone) ? zone : 'th'}.webp`;
  return null;
}
