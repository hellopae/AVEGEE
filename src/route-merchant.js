// T3/2 (owner 18 Nov, G3): where the hell merchant stands on each border route - in the yard in front of the cave (normalized route coordinates, cells of the painted floor).
import { isWildernessRoute } from './route-geometry.js';
export const ROUTE_MERCHANT = Object.freeze({
  'th:asia': Object.freeze([.47, .74]),
  'asia:west': Object.freeze([.48, .74]),        // left of the captain, who stands at [.55,.72]
  'west:cyberhell': Object.freeze([.47, .74]),   // in front of the arena gate
});
/** the merchant's spot on a border route, or null */
export const routeMerchant = routeId => (isWildernessRoute(routeId) ? ROUTE_MERCHANT[routeId] || null : null);
