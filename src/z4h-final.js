// T8d (Rae R2 part D, section 8): case 15 - the final battle. NF-1 (the invasion window) · NF-2 ("The Final Chapter": Begin / Not yet) · `z4-final-open` (2 pages) · THREE minion waves · `cyber-approach` AFTER wave 3 ·
// `cyber-reinforcements` / `-advance` (the Zone 4 label follows the picture crew-guard = the Gate Guard) · `cyber-control` · the four possessed lords (their broken voice before the fight, their thanks after it) ·
// Archon-Zero (`cyber-duel` text stays: lines in the fight + after the win) · `ending-capture` / `ending` (as they are) · `ending-coda`.
// Rae's text is copied VERBATIM by scripts/extract-rae-z4h.py (z4h-raw.js). The engine lives in final-event.js / game.js.
import { RAW_Z4H_SCENES, RAW_Z4H_NF1, RAW_Z4H_NF2, RAW_Z4H_NF3, RAW_Z4H_APPROACH, RAW_Z4H_REINFORCEMENT_LABELS, RAW_Z4H_RULERS, RAW_Z4H_DUEL, RAW_Z4H_AFTER_WIN } from './z4h-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z4-events/${n}.webp`;
const L2 = (th, en) => ({ th, en });
const pick = (v, lang) => (lang === 'en' ? v.en : v.th);

export const Z4H = Object.freeze({ openStory:'z4-final-open', archonDownStory:'z4-archon-down', codaStory:'ending-coda', rulerFree:Object.freeze({ th:'z4-ruler-free-th', asia:'z4-ruler-free-asia', west:'z4-ruler-free-west', cyberhell:'z4-ruler-free-cyberhell' }) });
export const Z4H_ART = Object.freeze({
  open:A('cut-final-open'),   // F1 (placeholder: Rae allows the old 01-v2 until it is drawn)
  coda:A('cut-ending-coda'),   // F2 (not compulsory)
  approach:'img/story-cyberhell-01-v2.webp', reinforcements:'img/story-cyberhell-reinforcements-01.webp', reinforcementsAdvance:'img/story-cyberhell-reinforcements-02.webp',
  control:'img/story-cyberhell-02-v3.webp', duel:'img/story-cyberhell-03-v4.webp',
});

// ---- NF-1 (the alert) and NF-2 (the gate window; the warning only while the side job of HOME-67 is pending)
export const Z4H_NF1 = Object.freeze({ title:L2(RAW_Z4H_NF1.th.title, RAW_Z4H_NF1.en.title), text:L2(RAW_Z4H_NF1.th.text, RAW_Z4H_NF1.en.text), button:L2(RAW_Z4H_NF1.th.button, RAW_Z4H_NF1.en.button) });
const split2 = s => s.split(' / ');
export const Z4H_NF2 = Object.freeze({ title:L2(RAW_Z4H_NF2.th.title, RAW_Z4H_NF2.en.title), text:L2(RAW_Z4H_NF2.th.text, RAW_Z4H_NF2.en.text),
  begin:L2(split2(RAW_Z4H_NF2.th.button)[0], split2(RAW_Z4H_NF2.en.button)[0]), notYet:L2(split2(RAW_Z4H_NF2.th.button)[1], split2(RAW_Z4H_NF2.en.button)[1]),
  warn:L2(RAW_Z4H_NF2.warn.th, RAW_Z4H_NF2.warn.en) });

// ---- NF-3: the banner of every fight of the finale (wave n of 3 · the four under control · Archon-Zero)
export function finalBannerLabel(encounter, wave, lang) {
  const parts = lang === 'en' ? RAW_Z4H_NF3.en : RAW_Z4H_NF3.th;
  const tail = encounter.startsWith('minion:') ? parts[1].replace(/\d \/ \d \/ \d/, String(wave)) : encounter.startsWith('ruler:') ? parts[2] : parts[3];
  return `${parts[0]} · ${tail}`;
}

// ---- the labels on the reinforcements (8.3; the Zone 4 one says "Gate Guard" because the picture is the Guard)
export const finalReinforcementLabel = (zone, lang) => pick(RAW_Z4H_REINFORCEMENT_LABELS[zone], lang);

// ---- the four possessed lords: name (the labels are the game's - Rae's narration gives the English names), the broken voice before the fight, the thanks after it
const RULER_EN = Object.freeze({ th:'Yamabat', asia:'Zhao Wen', west:'Halvar', cyberhell:'Nexar' });
const rulerName = zone => L2(RAW_Z4H_RULERS[zone].nameTh, RULER_EN[zone]);
const said = (who, line) => L2(`${who.th}: "${line.th}"`, `${who.en}: "${line.en}"`);
/** said at the start of the fight of that lord (the voice of the lord, broken) */
export const Z4H_RULER_START = Object.freeze(Object.fromEntries(Object.keys(RAW_Z4H_RULERS).map(z => [z, said(rulerName(z), RAW_Z4H_RULERS[z].before)])));

// ---- Archon-Zero: the lines in the fight (start, half way: him, HOME-67 freed and standing at the side, Nira) and after the win (before `ending-capture`)
const speakerLine = (th, en, line) => said(L2(th, en), line);
const halfLines = [speakerLine('อาร์คอน-ศูนย์', 'Archon-Zero', RAW_Z4H_DUEL.half), speakerLine('HOME-67', 'HOME-67', RAW_Z4H_DUEL.halfHome67), speakerLine('นิรา', 'Nira', RAW_Z4H_DUEL.halfNira)];
export const Z4H_DUEL = Object.freeze({
  start:speakerLine('อาร์คอน-ศูนย์', 'Archon-Zero', RAW_Z4H_DUEL.start),
  half:L2(halfLines.map(x => x.th).join('\n'), halfLines.map(x => x.en).join('\n')),
});

// ---- the scenes
const rae = (key, image) => fromRae(RAW_Z4H_SCENES[key], image);
const approachLine = lang => [pick(RAW_Z4H_APPROACH.text, lang), ...RAW_Z4H_APPROACH.tail[lang]].join('\n');
/** replaces STORY['cyber-approach'] (story.js): the text is Rae's new one - after wave 3, not before wave 1 */
const APPROACH = { title:'โซน 4 · ศึกสุดท้าย', en:{ title:'Zone 4 · The Final Battle' }, pages:[{ image:Z4H_ART.approach, title:RAW_Z4H_APPROACH.title.th, line:approachLine('th'), fallback:'📜', en:{ title:RAW_Z4H_APPROACH.title.en, line:approachLine('en') } }] };
/** replace STORY[...] (story.js) - same keys and pictures as the game had, Rae's text */
export const Z4H_STORY_OVERRIDES = Object.freeze({
  'cyber-approach':APPROACH,
  ...Object.fromEntries([['cyber-reinforcements', Z4H_ART.reinforcements], ['cyber-reinforcements-advance', Z4H_ART.reinforcementsAdvance], ['cyber-control', Z4H_ART.control]].map(([k, img]) => [k, fromRae(RAW_Z4H_SCENES[k], img)])),
});
/** the page title of each lord's thank-you page (Rae, T9: quoted from the lord's own line; the scene title is the lord's name) */
const FREE_PAGE_TITLE = Object.freeze({
  th:Object.freeze({ th:'เสียงเรียกท่านพ่อ', en:'The Word "Father"' }),
  asia:Object.freeze({ th:'บัลลังก์ที่ไม่ใช่ของใคร', en:'A Throne Nobody Else Holds' }),
  west:Object.freeze({ th:'ความเย็นของตัวเอง', en:'A Cold of His Own' }),
  cyberhell:Object.freeze({ th:'สายที่ถูกตัดให้เป็นอิสระ', en:'A Line Cut Free' }),
});
const freeStory = zone => { const n = rulerName(zone), line = said(n, RAW_Z4H_RULERS[zone].after), pt = FREE_PAGE_TITLE[zone];
  return { title:n.th, en:{ title:n.en }, pages:[{ image:Z4H_ART.control, title:pt.th, line:line.th, fallback:'📜', en:{ title:pt.en, line:line.en } }] }; };
/** the page after the fall of Archon-Zero (Rae 8.5 "the line after the win, before ending-capture"; the titles are Rae's, T9) */
const ARCHON_DOWN = { title:'อาร์คอน-ศูนย์ล้ม', en:{ title:'Archon-Zero Falls' }, pages:[{ image:Z4H_ART.duel, title:'รายการที่ยังไม่ปิด', line:RAW_Z4H_AFTER_WIN.map(w => `${w.speaker.th}: "${w.th}"`).join('\n'), fallback:'📜',
  en:{ title:'Item Not Yet Closed', line:RAW_Z4H_AFTER_WIN.map(w => `${w.speaker.en}: "${w.en}"`).join('\n') } }] };
/** new keys (story.js reads them through Z1_STORIES) */
export const Z4H_STORIES = Object.freeze({
  [Z4H.openStory]:rae('z4-final-open', Z4H_ART.open),
  [Z4H.codaStory]:rae('ending-coda', Z4H_ART.coda),
  [Z4H.archonDownStory]:ARCHON_DOWN,
  ...Object.fromEntries(Object.entries(Z4H.rulerFree).map(([zone, key]) => [key, freeStory(zone)])),
});
