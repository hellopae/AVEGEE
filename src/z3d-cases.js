// T7b/3 (Rae R2 part C, section 3): the three new fairy-tale cases of Zone 3 - Little Red (case 3), Loki posing as a charitable priest (case 7, then the reveal and the fight), the Witch of the Bread House (case 12).
// Case texts / scenes / Loki's moves are Rae's, copied VERBATIM by scripts/extract-rae-z3c.py into z3d-raw.js (TH + EN: the case objects carry her `en_*` fields; the court screen shows Thai only, like every other case of the game).
// Rules from Rae's notes: no religious symbols and no child in any picture; Loki is "inspired by the Norse Loki, made lighter" (never "true to the myth"); posing as a priest is HIS act, not the priest's fault.
// Positions: `after:` = cases already judged in Zone 3, so after:2 is the 3rd case (T6 found the same off-by-one for case 12).
import { RAW_REDHOOD, RAW_LOKIPRIEST, RAW_GINGERWITCH, RAW_LOKI_STORIES } from './z3d-raw.js';
const A = n => `img/z3-events/${n}.webp`;
const caseDef = raw => { const { quest, ...rest } = raw; return Object.freeze({ ...rest, story:true, z3:true }); };   // `quest` would put it in the side-quest pools; these are story cases found by key
export const CASE_REDHOOD = caseDef(RAW_REDHOOD), CASE_LOKIPRIEST = caseDef(RAW_LOKIPRIEST), CASE_GINGERWITCH = caseDef(RAW_GINGERWITCH);
export const Z3_CASES = Object.freeze([CASE_REDHOOD, CASE_LOKIPRIEST, CASE_GINGERWITCH]);
export const Z3_STORY_CASES = Object.freeze([
  Object.freeze({ k:'redhood', after:2, needsEvent:'westHypnotized', def:CASE_REDHOOD, notice:'z3-redhood-arrive' }),
  Object.freeze({ k:'lokipriest', after:6, needsEvent:'westVampireBreach', def:CASE_LOKIPRIEST, notice:'z3-loki-arrive' }),
  Object.freeze({ k:'gingerwitch', after:11, needsEvent:'westVampireBreach', def:CASE_GINGERWITCH, notice:'z3-witch-arrive' }),
]);
export const Z3_SOUL_SPRITE = Object.freeze({ redhood:'soul-redhood-west', lokipriest:'soul-loki-priest-west', gingerwitch:'soul-witch-bread-west' });
/** every picture of this package lives in img/z3-events under its own name (a real drawing saved over a placeholder needs no code change) */
export const Z3_ART_KEY = /^(soul-(redhood|loki-priest|witch-bread)-west|boss-loki-west)(-profile)?$/;
export const LOKI = Object.freeze({ eventKey:'westLoki', caseKey:'lokipriest', revealStory:'z3-loki-reveal', winStory:'z3-loki-win', loseStory:'z3-loki-lose', sprite:'boss-loki-west', portrait:A('boss-loki-west-profile'), reveal:A('cut-loki-reveal-west') });

// ---- notices: NRH-1 / NLK-1 / NWB-1 (the case comes to the queue) · NLK-2 = the event window of the fight (below) · NLK-3 banner · NLK-4 win · NLK-5 lose
export const Z3_CASE_NOTICES = Object.freeze({
  'z3-redhood-arrive':{ title:'หญิงชราผู้ถูกเรียกว่าหนูน้อย', text:'วิญญาณหญิงสูงวัยจากหมู่บ้านริมป่ามาถึงคิว ทั้งหมู่บ้านยังเรียกเธอด้วยชื่อที่ได้ตอนอายุเก้าขวบ ตามแฟ้มเธอนำชาวบ้านล่าหมาป่าเกือบสามสิบปี โปรดไต่สวนด้วยความเที่ยงตรง', button:'เริ่มไต่สวน', art:A('soul-redhood-west-profile'),
    en:{ title:'The Old Woman They Still Call Little Red', text:'The spirit of an elderly woman from a village at the forest\'s edge has reached the queue. The whole village still calls her by a name she earned at the age of nine. The file says she led the villagers in hunting wolves for nearly thirty years. Please hear her with a steady hand.', button:'Begin the hearing' } },
  'z3-loki-arrive':{ title:'บาทหลวงผู้ใจบุญ', text:'วิญญาณบาทหลวงผู้ดูแลโรงทานท่าเรือมาถึงคิว แฟ้มของเขาสะอาดผิดปกติ มีเพียงรายการเงินเล็ก ๆ สามรายการที่ยังคลุมเครือ โปรดอ่านทุกบรรทัดให้จบ', button:'เริ่มไต่สวน', art:A('soul-loki-priest-west-profile'),
    en:{ title:'The Charitable Priest', text:'The spirit of the priest who ran the harbour soup house has reached the queue. His file is unusually clean, with only three small money entries still unclear. Please read every line to the end.', button:'Begin the hearing' } },
  'z3-witch-arrive':{ title:'เจ้าของบ้านขนมปัง', text:'วิญญาณหญิงชราที่เด็ก ๆ เล่าต่อกันว่าเป็นแม่มดมาถึงคิว ตามคำให้การเธอขังเด็กชายคนหนึ่งไว้ในกรง โปรดอ่านทุกหน้าของแฟ้ม รวมหน้าที่คนในเรื่องเล่าไม่เคยเปิด', button:'เริ่มไต่สวน', art:A('soul-witch-bread-west-profile'),
    en:{ title:'The Keeper of the Bread House', text:'The spirit of an old woman whom children whisper about as a witch has reached the queue. By testimony she kept a boy in a cage. Please read every page of the file, including the pages no one in the tale ever opened.', button:'Begin the hearing' } },
});
/** The fight with Loki (data.js ZONE_EVENTS.west westLoki). NLK-2 is the window that opens it (button = "ready", then the reveal scene plays, then the fight). Numbers are Toby's first ones (no spec). */
export const LOKI_TEXT = Object.freeze({
  title:{ th:'เสียงหัวเราะในโถง', en:'A Laugh in the Hall' },
  alert:{ th:'ผู้ที่ยืนบนแท่นหัวเราะเบา ๆ เงาของเขาบนพื้นไม่ตรงกับท่ายืน เตรียมทีมให้พร้อม', en:'The one on the dais laughs softly. The shadow on the floor does not match how he stands. Ready your team.' },
  go:{ th:'เตรียมสู้', en:'Ready' }, retry:{ th:'สู้อีกครั้ง', en:'Try again' },
  banner:{ th:'ศึกโถงพิพากษา · โลกิ', en:'Battle in the Judgment Hall · Loki' },
  win:{ title:'โลกิยอมแพ้', text:'โลกิหัวเราะแล้วโค้งให้ท่านหนึ่งครั้งก่อนหายไปในเงาของตัวเอง', button:'ต่อ', en:{ title:'Loki Concedes', text:'Loki laughs, bows once to you, and vanishes into his own shadow.', button:'Continue' } },
  lose:{ title:'โลกิยังไม่เบื่อ', text:'โลกิถอยหนึ่งก้าวและรอ ท่านตั้งหลักแล้วลองอีกครั้งได้', button:'สู้อีกครั้ง', en:{ title:'Loki Is Not Bored Yet', text:'Loki steps back and waits. Steady yourself and try again.', button:'Try again' } },
  lines:{ start:'โลกิ: "ตัวไหนจริง ตัวไหนเงา ท่านเดาสิ"', half:'โลกิ: "อ้าว ท่านไม่หลงเลยหรือ น่าเสียดาย ข้าเตรียมมุกอีกสามเรื่อง"\nนิรา: "ท่านคะ เขาตั้งใจพลาดบางครั้ง ดิฉันนับได้สองครั้งแล้วค่ะ"' },
  linesEn:{ start:'Loki: "Which is real and which is shadow? Guess."', half:'Loki: "Oh, you are not fooled at all? What a pity. I had three more tricks ready."\nNira: "Sir, he misses on purpose now and then. I have counted twice already."' },
});

// ---- Rae's scenes {title:{th,en}, pages:[{title:{th,en}, line:{th,en}}]} -> the game's story format (Thai on the page, `en` block for English)
const fromRae = (raw, image) => ({ title:raw.title.th, en:{ title:raw.title.en }, pages:raw.pages.map(p => ({ image, title:p.title.th, line:p.line.th, fallback:'📜', en:{ title:p.title.en, line:p.line.en } })) });
export const Z3_CASE_STORIES = Object.freeze(Object.fromEntries(Object.entries(RAW_LOKI_STORIES).map(([k, raw]) => [k, fromRae(raw, LOKI.reveal)])));
export { fromRae };
