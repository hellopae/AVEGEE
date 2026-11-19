// T8b (Rae R2 part D, sections 3 / 5): the story cases of Zone 4 - case 4 AI Scammer's victim (the retired teacher), cases 8 and 9 (relatives of two reapers). The relatives are ordinary story cases here (Rae gives them a notice + a case, no crew talk);
// every one of them carries the code [PHANTOM-404] on its ledger and adds a line to the journal. Case / notice / journal text and HOME-67's hints are Rae's, copied VERBATIM by scripts/extract-rae-z4b.py into z4c-raw.js (TH + EN: the case
// objects carry her `en_*` fields; the court screen shows Thai only, like every other case of the game).
// Positions: `after:` = cases already judged in Zone 4 (Rae's "case 4" = after:4, the same count her events use). Content rule [R]: the victims are never made fools of, no method of fraud is described, no blood / death shown.
import { RAW_Z4CASE_AISCAM, RAW_Z4CASE_KIN8, RAW_Z4CASE_KIN9, RAW_Z4CASE_WATKIN, RAW_Z4C_WAT_KIN, RAW_Z4C_NOTICES, RAW_Z4C_JOURNAL, RAW_Z4C_HINTS } from './z4c-raw.js';
const A = n => `img/z4-events/${n}.webp`;
const caseDef = raw => { const { quest, ...rest } = raw; return Object.freeze({ ...rest, story:true, z4:true }); };   // `quest` would put it in the side-quest pools; these are story cases found by key
export const CASE_AISCAM = caseDef(RAW_Z4CASE_AISCAM);
export const CASE_KIN8 = caseDef(RAW_Z4CASE_KIN8), CASE_KIN9 = caseDef(RAW_Z4CASE_KIN9);   // cases 8 and 9: a relative of the reaper Cypher (elder sister, lullaby singer) and of Buffer (uncle, keeper of the archive)
export const CASE_WATKIN = caseDef(RAW_Z4CASE_WATKIN);   // WATSON-03's own quest (relative 5 of Zone 4: the administrator who followed the rule)
export const Z4_CASES = Object.freeze([CASE_AISCAM, CASE_KIN8, CASE_KIN9, CASE_WATKIN]);
export const Z4_STORY_CASES = Object.freeze([
  Object.freeze({ k:'aiscam', after:4, needsEvent:'cyberRescue', def:CASE_AISCAM, notice:'z4-aiscam-arrive' }),
  Object.freeze({ k:'kin8', after:8, needsEvent:'cyberBreach', def:CASE_KIN8, notice:'z4-kin8-arrive' }),   // Rae 5: "case 8 / case 9" - after the Trojan-9 fight (case 7) is over
  Object.freeze({ k:'kin9', after:9, needsEvent:'cyberBreach', def:CASE_KIN9, notice:'z4-kin9-arrive' }),
]);
export const Z4C_SOUL_SPRITE = Object.freeze({ aiscam:'soul-aiscam-cyber', kin8:'soul-singer-cyber', kin9:'soul-archivist-cyber', watkin:'soul-admin-cyber' });
/** every picture of this package lives in img/z4-events under its own name (a real drawing saved over a placeholder needs no code change) */
export const Z4C_ART_KEY = /^(soul-(aiscam|singer|archivist|admin)-cyber|guard-watson03|boss-aiscam|char-lupin|char-worker-lupin)(-profile)?$/;

const win = (raw, art) => ({ title:raw.th.title, text:raw.th.text, button:raw.th.button, ...(art ? { art } : {}), en:raw.en });
export const Z4C_CASE_NOTICES = Object.freeze({
  'z4-aiscam-arrive':win(RAW_Z4C_NOTICES['NAS-1'], A('soul-aiscam-cyber-profile')),
  'z4-kin8-arrive':win(RAW_Z4C_NOTICES.NK8, A('soul-singer-cyber-profile')),
  'z4-kin9-arrive':win(RAW_Z4C_NOTICES.NK9, A('soul-archivist-cyber-profile')),
  // NK-W: WATSON-03's quest - the window carries what he says before the hearing behind its button (the same shape as the relatives of Zone 2 / 3: `kin-<k>`)
  'kin-watkin':{ ...win(RAW_Z4C_NOTICES['NK-W'], A('soul-admin-cyber-profile')), detail:RAW_Z4C_WAT_KIN.before.th, en:{ ...RAW_Z4C_NOTICES['NK-W'].en, detail:RAW_Z4C_WAT_KIN.before.en } },
});
/** WATSON-03's quest, shaped like the relatives of Zone 3 (z3g-kin.js Z3_KIN rows: ensureKinCases / kinSpeaks / openKinAfter read it through KIN_BY_KEY). Rae's `after:12` = twelve cases judged; it comes to the tail of the queue once the record hall is won (case 10 is a story beat),
 *  so it never stands before a story case (8 / 9 / 10 / 15). The Guard is the "crew member" of this relative (WATSON-03 is the Guard of Zone 4). */
const nk = RAW_Z4C_NOTICES['NK-W'], wk = RAW_Z4C_WAT_KIN;
export const Z4_KIN = Object.freeze([Object.freeze({ k:'watkin', crew:'guard', zone:'cyberhell', atCases:12, needsEvent:'cyberSala', def:CASE_WATKIN,
  notice:{ ...nk.th, en:nk.en }, before:[wk.before.th], beforeEn:[wk.before.en], during:[wk.during.th], duringEn:[wk.during.en], after:[wk.after.th], afterEn:[wk.after.en],
  choices:wk.choices.map(c => ({ label:c.label.th, labelEn:c.label.en, lines:c.lines.th, linesEn:c.lines.en })) })]);
export const Z4_KIN_BY_KEY = Object.freeze(Object.fromEntries(Z4_KIN.map(r => [r.k, r])));
/** the journal line each of these cases leaves (Rae: "บันทึกสมุด") · HOME-67's extra line at the harbour once the case has been judged (Rae: "ระดับใบ้เพิ่ม") */
export const Z4C_JOURNAL = Object.freeze({ aiscam:RAW_Z4C_JOURNAL.aiscam, kin8:RAW_Z4C_JOURNAL.kin8, kin9:RAW_Z4C_JOURNAL.kin9 });
export const Z4C_HINT_AFTER = Object.freeze({ aiscam:RAW_Z4C_HINTS.aiscam, kin9:RAW_Z4C_HINTS.kin9 });
