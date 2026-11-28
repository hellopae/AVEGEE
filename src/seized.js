// T8c (Rae R2 part D section 7 · owner D6): after the AI Scammer Robot falls (case 10 of Zone 4) Zones 1-3 are seized - the harbours are locked, the reapers stand controlled, and Yama + Nira walk back through the frontiers
// Zone 4 -> 3 -> 2 -> 1, freeing the controlled lord of each (Trojan-9 at the Zone 4 frontier, Valdric, Akura, Tanthasura). Rules only: the story / events live in signal-arc.js + z4g-return.js.
import { SEIZED_NEXT, SEIZED_EVENT, Z4G_KEYS } from './seized-keys.js';
const ev = (g, zone, key) => g.zoneEvents?.[zone]?.[key];
const freed = (g, zone) => ev(g, zone, SEIZED_EVENT[zone]) === 'cleared';
/** the seizure lasts from the fall of the record-hall robot until the signal is closed back in Zone 4 (cyber-signal-close) */
export const seizedActive = g => (ev(g, 'cyberhell', 'cyberSala') === 'cleared' || freed(g, 'cyberhell')) && ev(g, 'cyberhell', 'signalClose') !== 'cleared';
/** a zone of 1-3 whose lord is still controlled: its reapers stand still (no work, no new souls) */
export const zoneSeized = (g, zone = g.zone) => zone !== 'cyberhell' && !!SEIZED_EVENT[zone] && seizedActive(g) && !freed(g, zone);
/** The return crossing puts this zone's Guard encounter on the route once. */
export const returnGuardPending = (g, zone = g.zone) => zoneSeized(g, zone) &&
  ['pending','active'].includes(ev(g, zone, Z4G_KEYS.guardEvent));
/** A saved arrival at the Eastern gate has already passed this crossing. */
export const walkBackCavePending = g => zoneSeized(g, 'asia')
  && ev(g, 'west', Z4G_KEYS.caveEvent) !== 'cleared'
  && !ev(g, 'asia', Z4G_KEYS.guardEvent)
  && !g.storySeen?.[Z4G_KEYS.fire.asia];

/** A helper answers again when their own return fight is won. */
export function returnSummonerBlock(g, key) {
  if (key === 'jormungandr' && zoneSeized(g, 'west')) return 'controlled';
  if (key === 'liangang' && zoneSeized(g, 'asia')) return 'controlled';
  if ((key === 'ryujin' || key === 'musashi') && walkBackCavePending(g)) return 'controlled';
  return '';
}

/** May this zone's harbour carry boats? NR-1 opens each; Zone 4 opens when all three are freed. */
export const harbourOpen = (g, zone) => !seizedActive(g) || (zone === 'cyberhell' ? ['west', 'asia', 'th'].every(z => freed(g, z)) : freed(g, zone));
/** the zone the walk back leads to from the current one, or null (not seized / its own lord not freed yet / nothing below) */
export const walkBackTarget = (g, zone = g.zone) => seizedActive(g) && SEIZED_NEXT[zone] && freed(g, zone) ? SEIZED_NEXT[zone] : null;
