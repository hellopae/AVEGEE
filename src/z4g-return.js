// T8c (Rae R2 part D, section 7): the way back through the seized world - `cyber-signal-win` page 2 (replaced: the harbours are shut), Lucifer's one line at the side gate of the colosseum (`col-pass`), the fire + controlled reapers of each zone
// (`z3-fire` `z2-fire` `z1-fire`), the freeing of each zone (`z3-restored` `z2-restored` `z1-restored`) and NR-1 (the harbour of that zone is open again).
// Rae's text is copied VERBATIM by scripts/extract-rae-z4g.py (z4g-raw.js); the existing SIG scenes (signal-arc / e1-content) are used as they are. Rules of the seized world: seized.js. Keys: seized-keys.js.
import { RAW_Z4G_SIGNAL_WIN_PAGE2, RAW_Z4G_SCENES, RAW_Z4G_LUCIFER_PASS, RAW_Z4G_CONTROLLED_TAP, RAW_Z4G_NR1 } from './z4g-raw.js';
import { SIGNAL_STORIES } from './e1-content.js';
import { fromRae } from './z3d-cases.js';
import { Z4G_KEYS } from './seized-keys.js';
const A = n => `img/z4-events/${n}.webp`;
const SIG = n => `img/story-sig/${n}.webp`;
export const Z4G_ART = Object.freeze({
  fire:Object.freeze({ west:A('cut-z3-fire'), asia:A('cut-z2-fire'), th:A('cut-z1-fire') }),   // K1-K3: placeholders until Codex draws them
  restored:Object.freeze({ west:SIG('story-signal-west-02'), asia:SIG('story-signal-asia-02'), th:SIG('story-signal-th-02') }),   // K4: "cut - the existing SIG picture can be used" (Rae)
  pass:A('cut-col-gate'),
});
/** `cyber-signal-win`: page 1 of the existing scene as it is; page 2 is Rae's replacement (the ships cannot sail - Nira: "we must walk back through the frontiers, zone by zone") */
const sigWin = SIGNAL_STORIES['cyber-signal-win'];
const p2 = RAW_Z4G_SIGNAL_WIN_PAGE2;
const SIGNAL_WIN = { ...sigWin, pages:[sigWin.pages[0], { image:sigWin.pages[1].image, title:p2.title.th, line:p2.line.th, en:{ title:p2.title.en, line:p2.line.en } }] };
const L2 = (th, en) => ({ th, en });
/** the scene + page title of the side gate (Rae checked them, T9: kept as they were) */
const PASS = { title:'สังเวียนที่ถูกตัดสาย', en:{ title:'The Arena With Its Lines Cut' }, pages:[{ image:Z4G_ART.pass, title:'ประตูข้างของสังเวียน', line:RAW_Z4G_LUCIFER_PASS.th, fallback:'📜', en:{ title:'The Arena\'s Side Gate', line:RAW_Z4G_LUCIFER_PASS.en } }] };
export const Z4G_STORIES = Object.freeze({
  'cyber-signal-win':SIGNAL_WIN,
  [Z4G_KEYS.passStory]:PASS,
  ...Object.fromEntries(Object.entries(RAW_Z4G_SCENES).map(([k, raw]) => [k, fromRae(raw, k.endsWith('-fire') ? Z4G_ART.fire[Object.keys(Z4G_KEYS.fire).find(z => Z4G_KEYS.fire[z] === k)] : Z4G_ART.restored[Object.keys(Z4G_KEYS.restored).find(z => Z4G_KEYS.restored[z] === k)])])),
});
/** NR-1 per zone: the title carries the zone's name (Rae's `<ชื่อโซน>` / `<Zone>` placeholder) */
const ZONE_NAME = { west:L2('ปัจฉิม', 'Western'), asia:L2('บูรพา', 'Eastern'), th:L2('สุวรรณภูมิ', 'Suvarnabhumi') };
export const Z4G_NOTICES = Object.freeze(Object.fromEntries(Object.entries(Z4G_KEYS.harbourNotice).map(([zone, key]) => [key, {
  title:RAW_Z4G_NR1.th.title.replace('<ชื่อโซน>', ZONE_NAME[zone].th), text:RAW_Z4G_NR1.th.text, button:RAW_Z4G_NR1.th.button, art:Z4G_ART.restored[zone],
  en:{ title:RAW_Z4G_NR1.en.title.replace('<Zone>', ZONE_NAME[zone].en), text:RAW_Z4G_NR1.en.text, button:RAW_Z4G_NR1.en.button },
}])));
/** what a controlled reaper says when touched (Rae 7.2): `<name>: "Block ... every ... road."` */
export const Z4G_TAP = RAW_Z4G_CONTROLLED_TAP;
