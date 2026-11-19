// T8b/2 (Rae R2 part D, section 4): case 7 of Zone 4 - the demons break through the lower frontier, Trojan-9 (the wooden horse) waits, HOME-67 comes from the harbour and calls the Guard of Zone 4 (WATSON-03, a robot - the log-keeping assistant of
// HOME-67's future detective office). 4 waves of demons (then the boss row), the team in the fight = Yama + Nira + HOME-67 (the guest of the fight, he goes back to the pier afterwards) + WATSON-03 (the guest Guard; he stays if it is won).
// Rae's scenes / windows / lines are copied VERBATIM by scripts/extract-rae-z4b.py (z4c-raw.js). Keys: `cyberBreach` (data.js) · `z4-troj-run` (HOME-67's one line when he runs in) · `z4-troj-pre` · `z4-wat-join` · windows N7-1 N7-2 NV-W.
// The existing scene of Trojan-9 (narrative-cutscenes.js `frontier-cyberhell-intro-v1`) plays first, as before (Rae: used verbatim).
import { RAW_Z4C_SCENES, RAW_Z4C_NOTICES, RAW_Z4C_TROJ_LINES, RAW_Z4C_JOURNAL } from './z4c-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z4-events/${n}.webp`;
export const Z4T = Object.freeze({ eventKey:'cyberBreach', runStory:'z4-troj-run', preStory:'z4-troj-pre', joinStory:'z4-wat-join', guardNotice:'z4-wat-guard' });
export const Z4T_ART = Object.freeze({ assist:A('cut-wat-assist'), guard:'guard-watson03', guardProfile:A('guard-watson03-profile') });
const L2 = (th, en) => ({ th, en });
const N = RAW_Z4C_NOTICES;
/** N7-1 (the event alert) · N7-2 (the wave banners: Rae's one banner "wave 1 / 2 / 3 / 4 · Zone 4 frontier · Trojan-9" cut into one line per wave and one for the boss) */
const bannerParts = lang => N['N7-2'].banner[lang].split(' · ');
const waveBanner = (lang, k) => { const p = bannerParts(lang); return `${p[0].replace('1 / 2 / 3 / 4', String(k))} · ${p[1]}`; };
export const Z4T_TEXT = Object.freeze({
  title:L2(N['N7-1'].th.title, N['N7-1'].en.title), alert:L2(N['N7-1'].th.text, N['N7-1'].en.text), ack:L2(N['N7-1'].th.button, N['N7-1'].en.button),
  banners:{ th:[1, 2, 3, 4].map(k => waveBanner('th', k)), en:[1, 2, 3, 4].map(k => waveBanner('en', k)) },
  boss:L2(bannerParts('th').slice(1).join(' · '), bannerParts('en').slice(1).join(' · ')),
  /** lines between the waves, keyed by the wave that has just fallen (1..4) and `run` (HOME-67 running in) */
  between:Object.freeze(Object.fromEntries(Object.entries(RAW_Z4C_TROJ_LINES).map(([k, v]) => [k, L2(`${v.sp.th}: "${v.th}"`, `${v.sp.en}: "${v.en}"`)]))),
});
/** the 1-page scene of HOME-67 running in (his one line is Rae's; the page title is a label of the game) + her two scenes */
const runScene = { title:{ th:'HOME-67 มาสมทบ', en:'HOME-67 Joins' }, pages:[{ title:{ th:'เสียงเตือนบนกระจก', en:'The Alert on the Pane' }, line:{ th:Z4T_TEXT.between.home67Run.th, en:Z4T_TEXT.between.home67Run.en } }] };
export const Z4T_STORIES = Object.freeze({
  [Z4T.runStory]:fromRae(runScene, Z4T_ART.assist),
  [Z4T.preStory]:fromRae(RAW_Z4C_SCENES['z4-troj-pre'], Z4T_ART.assist),
  [Z4T.joinStory]:fromRae(RAW_Z4C_SCENES['z4-wat-join'], Z4T_ART.assist),
});
export const Z4T_NOTICES = Object.freeze({
  [Z4T.guardNotice]:{ title:N['NV-W'].th.title, text:N['NV-W'].th.text, button:N['NV-W'].th.button, art:Z4T_ART.guardProfile, en:N['NV-W'].en },
});
/** the Gate Guard of Zone 4 (Rae NV-W "the label under the name": Gate Guard of the Network Hell) */
export const Z4T_GUARD = Object.freeze({ th:'WATSON-03', en:'WATSON-03', title:L2('ผู้เฝ้าด่านนรกเครือข่าย', 'Gate Guard of the Network Hell') });
export const Z4T_JOURNAL = RAW_Z4C_JOURNAL.watson;
