// T8a (Rae R2 part D, sections 1-2): Frontier 3-4 with HOME-67 (the team = Yama + Nira + HOME-67, D7), the colosseum, the silent gate of Zone 4, entering Zone 4, Lumen-01 + the Magic Clock, HOME-67 at the harbour.
// Rae's scenes are copied VERBATIM by scripts/extract-rae-z4a.py (z4a-raw.js). This module registers them (TH on the page, EN in the `en` block) and holds the keys / pictures / notices of the whole T8a package.
// Keys: `z34-arrive` · `col-gate` · `col-thor-win` · `col-lucifer-open` / `-win` · `z4-gate-silent` · `z4-arrive` · `z4-lumen-open` / `-win` · `z4-home67-harbor`.
import { RAW_Z4A_SCENES } from './z4a-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z4-events/${n}.webp`;
export const Z4A = Object.freeze({ arriveStory:'z34-arrive', gateStory:'col-gate', thorWin:'col-thor-win', luciferOpen:'col-lucifer-open', luciferWin:'col-lucifer-win', silentStory:'z4-gate-silent', zone4Story:'z4-arrive',
  lumenOpen:'z4-lumen-open', lumenWin:'z4-lumen-win', harborStory:'z4-home67-harbor' });
export const Z4A_ART = Object.freeze({ arrive:A('cut-z34-arrive'), gate:A('cut-col-gate'), zone4:A('cut-z4-arrive'), lumen:'img/deva-intro/deva-intro-cyberhell-v1.webp', lumenWin:'img/deva-intro/deva-intro-cyberhell-v1.webp', harbor:A('cut-home67-harbor-gift') });
const IMG = { 'z34-arrive':Z4A_ART.arrive, 'col-gate':Z4A_ART.gate, 'col-thor-win':A('cut-col-s9'), 'col-lucifer-open':A('cut-col-gate'), 'col-lucifer-win':A('cut-col-s10'), 'z4-gate-silent':Z4A_ART.arrive,
  'z4-arrive':Z4A_ART.zone4, 'z4-lumen-open':Z4A_ART.lumen, 'z4-lumen-win':Z4A_ART.lumenWin, 'z4-home67-harbor':Z4A_ART.harbor };
export const Z4A_STORIES = Object.freeze(Object.fromEntries(Object.entries(RAW_Z4A_SCENES).map(([k, raw]) => [k, fromRae(raw, IMG[k])])));
