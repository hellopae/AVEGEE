import { mapReviewArt } from './map-art-v5.js';
// Exterior art shares the material, architecture and lighting of the wide rooms.
export const THEME_ZONES = ['th', 'asia', 'west', 'cyberhell'];
export const THEME_STATIONS = ['sala', 'krata', 'dab', 'lokan', 'ngiw', 'lan', 'tea', 'sawan', 'tarang', 'frontier', 'krajok'];
export function themeBackground(zone, kind) {
  return `img/theme-v4/${kind}-${THEME_ZONES.includes(zone) ? zone : 'th'}.webp`;
}
export function themeArt(key, zone) {
  const revised = mapReviewArt(key, zone);
  if (revised) return revised;
  if (key.startsWith('theme-map-')) return themeBackground(key.slice(10), 'map');
  if (key === 'BG-Turn-Base') return themeBackground(zone, 'arena');
  if (key === 'BG-Frontier') return themeBackground(zone, 'frontier');
  if (key.startsWith('st-') && THEME_STATIONS.includes(key.slice(3)))
    return `img/theme-v4/${key}-${THEME_ZONES.includes(zone) ? zone : 'th'}.webp`;
  return null;
}
