// T8c (Rae R2 part D, section 7): the keys of the way back through the seized Zones 3 -> 2 -> 1 (no imports - signal-arc.js, data.js, the story table and the notices all read it).
// Zone keys are the game's: 'west' = Zone 3, 'asia' = Zone 2, 'th' = Zone 1, 'cyberhell' = Zone 4.
/** where the walk back goes from each zone (through the frontier below it) */
export const SEIZED_NEXT = Object.freeze({ cyberhell:'west', west:'asia', asia:'th' });
/** the controlled lord of each zone: the event that frees it (signal-arc.js) */
export const SEIZED_EVENT = Object.freeze({ cyberhell:'cyberSignal', west:'signalWest', asia:'signalAsia', th:'signalTh' });
export const Z4G_KEYS = Object.freeze({
  fire:Object.freeze({ west:'z3-fire', asia:'z2-fire', th:'z1-fire' }),
  restored:Object.freeze({ west:'z3-restored', asia:'z2-restored', th:'z1-restored' }),
  harbourNotice:Object.freeze({ west:'z3-harbour-open', asia:'z2-harbour-open', th:'z1-harbour-open' }),   // NR-1 per zone
  passStory:'col-pass',   // the single line of Lucifer at the side gate of the colosseum (7.1)
  tapNotice:'z4g-controlled',   // what a controlled reaper says when touched
});
