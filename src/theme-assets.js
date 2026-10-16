import { mapReviewArt } from './map-art-v5.js';
// Exterior art shares the material, architecture and lighting of the wide rooms.
export const THEME_ZONES = ['th', 'asia', 'west', 'cyberhell'];
export const THEME_STATIONS = ['sala', 'krata', 'dab', 'lokan', 'ngiw', 'lan', 'tea', 'sawan', 'tarang', 'frontier', 'krajok'];
export function themeBackground(zone, kind) {
  if (kind === 'arena' && zone === 'th') return 'img/map-zone1/arena-v1.webp';
  if (kind === 'map' && zone === 'th') return 'img/map-zone1/mainland-stairs-v2.webp';
  return `img/theme-v4/${kind}-${THEME_ZONES.includes(zone) ? zone : 'th'}.webp`;
}
export function themeArt(key, zone) {
  const houses = ['front-one','right-two','left-two','right-one'];
  if (key.startsWith('town-residence-') && houses.includes(key.slice(15)))
    return `img/town-district/house-${key.slice(15)}-v1.webp`;
  if (key === 'town-judgment-th') return 'img/theme-v4/town-judgment-th-v2.webp';
  if (key === 'town-tree-th') return 'img/theme-v4/town-tree-th-v1.webp';
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
