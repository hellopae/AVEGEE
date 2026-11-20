// T8b/5 (Rae R2 part D, section 6): case 10 of Zone 4 - the record hall (the registry, `st-sala`) is seized, HOME-67 comes down from the pier and speaks the name (`z4-reveal`, 3 pages), the AI Scammer Robot ([PHANTOM-404]) is fought by Yama +
// Nira + WATSON-03 (HOME-67 stands in front of nobody: he stays behind Yama and does not fight, as he said in part C), `z4-sala-win` (2 pages) and NS-10 (Zones 1-3 are seized, the ships cannot sail - the walk back is T8c).
// Rae's scenes / windows / lines are copied VERBATIM by scripts/extract-rae-z4b.py (z4c-raw.js). The fight is the event `cyberSala` (data.js), opened by its alert window N10-1 (button "go to the hall" = the fight starts after z4-reveal; there is no walk to the building).
// The boss is the existing PHANTOM-404 drawing + its two moves of the owner's 15 Nov set (BOSS_SKILLS.phantom404: Phishing Flood, Delete Row) plus Rae's half-way move "Voice Like One You Love" (a light single blow here: the engine has no "allies falter" status).
import { RAW_Z4C_SCENES, RAW_Z4C_NOTICES, RAW_Z4C_SALA_LINES } from './z4c-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z4-events/${n}.webp`;
const L2 = (th, en) => ({ th, en });
const N = RAW_Z4C_NOTICES, S = RAW_Z4C_SALA_LINES;
export const Z4S = Object.freeze({ eventKey:'cyberSala', revealStory:'z4-reveal', winStory:'z4-sala-win', seizedNotice:'z4-seized' });
export const Z4S_ART = Object.freeze({ reveal:A('cut-reveal-name'), boss:'boss-phantom404-cyberhell', bossProfile:A('boss-phantom404-cyberhell-profile') });
const side = (lab, k) => ({ th:`${lab.th}: "${S[k].th}"`, en:`${lab.en}: "${S[k].en}"` });
const ROBOT = L2('AI Scammer Robot', 'AI Scammer Robot');
const robotStart = side(ROBOT, 'เริ่มสู้ AI Scammer Robot'), robotHalf = side(ROBOT, 'เลือดเหลือครึ่ง AI Scammer Robot');
const niraHalf = side(L2('นิรา', 'Nira'), 'นิรา เลือดเหลือครึ่ง'), watHalf = side(L2('WATSON-03', 'WATSON-03'), 'WATSON-03 เลือดเหลือครึ่ง');
/** N10-1 (alert) · N10-2 (banner) · the lines in the fight (start / half-way: the robot, then Nira, then WATSON-03) */
export const Z4S_TEXT = Object.freeze({
  title:L2(N['N10-1'].th.title, N['N10-1'].en.title), alert:L2(N['N10-1'].th.text, N['N10-1'].en.text), go:L2(N['N10-1'].th.button, N['N10-1'].en.button), retry:L2('สู้อีกครั้ง', 'Try again'),
  banner:L2(N['N10-2'].banner.th, N['N10-2'].banner.en),
  lines:{ start:robotStart.th, half:[robotHalf.th, niraHalf.th, watHalf.th].join('\n') }, linesEn:{ start:robotStart.en, half:[robotHalf.en, niraHalf.en, watHalf.en].join('\n') },
  lose:{ title:'ลองใหม่ได้', text:'แพ้แล้วลองใหม่ได้ ไม่เสียอะไร', en:{ title:'Try again', text:'If you lose, you may try again at no cost.' } },
});
/** Rae's half-way move (6.4): the name / warning are hers, the use line is Rae's too (T9). Power 1.3 = a light-medium single blow. */
export const Z4S_VOICE_MOVE = Object.freeze({ id:'voiceLikeLove', kind:'heavyHit', warn:1, power:1.3, name:L2(S.move.th, S.move.en), warnText:L2(S.warn.th, S.warn.en),
  useText:L2('AI Scammer Robot: "ไม่ต้องกลัวนะ ... ฉันเอง"', 'AI Scammer Robot: "Do not be afraid. ... It is me."'), when:{ hpBelow:.5, firstAct:2, everyActs:4 } });
export const Z4S_STORIES = Object.freeze({
  [Z4S.revealStory]:fromRae(RAW_Z4C_SCENES['z4-reveal'], Z4S_ART.reveal),
  [Z4S.winStory]:fromRae(RAW_Z4C_SCENES['z4-sala-win'], Z4S_ART.reveal),
});
export const Z4S_NOTICES = Object.freeze({
  [Z4S.seizedNotice]:{ title:N['NS-10'].th.title, text:N['NS-10'].th.text, button:N['NS-10'].th.button, art:Z4S_ART.reveal, en:N['NS-10'].en },
});
