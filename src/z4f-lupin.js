// T8b/6 (Rae R2 part D, section 9, owner G29): HOME-67's side quest - catch the thief Lupin, who stands idle in Zone 4 disguised as a worker. NQ-1 (take the job, from HOME-67 on the pier) -> a strange worker stands near the canteen -> talk (two choices)
// -> "You are not a worker here" -> z4-lupin-catch (2 pages) -> the fight (Yama + Nira + HOME-67) -> z4-lupin-win (2 pages) + NQ-2 + NU-1 = helper no. 12 "The Mask Turns the Beat" in the lamp.
// The quest does not close when the ending begins and can be played after the ending (Claudy 19 Nov); its state `g.lupin` is saved. Rae's scenes / windows / lines / table are copied VERBATIM by scripts/extract-rae-z4b.py (z4c-raw.js).
// Keys: `z4Lupin` (the fight, data.js) · `z4-lupin-catch` · `z4-lupin-win` · NQ-1 `z4-lupin-take` · NQ-2 `z4-lupin-done` · NU-1 `lamp-helper-lupin` · NQ-3 = the banner.
import { RAW_Z4C_SCENES, RAW_Z4C_NOTICES, RAW_Z4C_LUPIN_LINES, RAW_Z4C_LUPIN_TALK, RAW_Z4C_LUPIN_HELPER } from './z4c-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z4-events/${n}.webp`;
const L2 = (th, en) => ({ th, en });
const N = RAW_Z4C_NOTICES, S = RAW_Z4C_LUPIN_LINES;
export const Z4L = Object.freeze({ eventKey:'z4Lupin', catchStory:'z4-lupin-catch', winStory:'z4-lupin-win', takeNotice:'z4-lupin-take', doneNotice:'z4-lupin-done', helper:'lupin', unlockNotice:'lamp-helper-lupin' });
export const Z4L_ART = Object.freeze({ cut:A('cut-lupin-catch'), sprite:'char-lupin', profile:A('char-lupin-profile'), worker:'char-worker-lupin', icon:'img/summon/icon-lupin.webp', battle:'img/summon/battle-lupin.webp', moveCut:'img/summon/cut-lupin-mask-beat.webp' });
const side = (lab, k) => ({ th:`${lab.th}: "${S[k].th}"`, en:`${lab.en}: "${S[k].en}"` });
const lupinStart = side(L2('ลูแปง', 'Lupin'), 'เริ่มสู้ ลูแปง'), lupinHalf = side(L2('ลูแปง', 'Lupin'), 'เลือดเหลือครึ่ง ลูแปง'), homeHalf = side(L2('HOME-67', 'HOME-67'), 'HOME-67 เลือดเหลือครึ่ง');
export const Z4L_TEXT = Object.freeze({
  title:L2('จับจอมโจรลูแปง', 'Catch the Thief Lupin'), alert:L2('คนงานแปลกหน้ายืนเฉยอยู่ใกล้โรงอาหาร พร้อมสู้เมื่อใดก็ได้', 'The strange worker stands idle near the canteen. Ready to fight whenever you are.'),   // the alert is a label of the game (the quest is started by talking, not by this window)
  banner:L2(N['NQ-3'].banner.th, N['NQ-3'].banner.en), go:L2('เข้าจับ', 'Catch him'), retry:L2('สู้อีกครั้ง', 'Try again'),
  lines:{ start:lupinStart.th, half:[lupinHalf.th, homeHalf.th].join('\n') }, linesEn:{ start:lupinStart.en, half:[lupinHalf.en, homeHalf.en].join('\n') },
  lose:{ title:'ลองใหม่ได้', text:'แพ้แล้วลองใหม่ได้ ไม่เสียอะไร กลับไปคุยกับคนงานแปลกหน้าอีกครั้ง', en:{ title:'Try again', text:'If you lose, you may try again at no cost. Speak to the strange worker once more.' } },
});
/** Rae's boss move (9.3): the name / warning / use line are hers (the use line: T9). A light-medium single blow: the engine has no "an ally skips a turn" status. */
export const Z4L_MOVE = Object.freeze({ id:'stealBeat', kind:'heavyHit', warn:1, power:1.2, name:L2(S.move.th, S.move.en), warnText:L2(S.warn.th, S.warn.en), useText:L2('ลูแปง: "จังหวะของท่าน ข้าขอรับไว้"', 'Lupin: "That beat of yours. I will take it."'), when:{ firstAct:3, everyActs:4 } });
export const Z4L_STORIES = Object.freeze({
  [Z4L.catchStory]:fromRae(RAW_Z4C_SCENES['z4-lupin-catch'], Z4L_ART.cut),
  [Z4L.winStory]:fromRae(RAW_Z4C_SCENES['z4-lupin-win'], Z4L_ART.cut),
});
const nt = (raw, art, extra = {}) => ({ title:raw.th.title, text:raw.th.text, button:raw.th.button, art, en:raw.en, ...extra });
export const Z4L_NOTICES = Object.freeze({
  [Z4L.takeNotice]:nt(N['NQ-1'], 'img/z3-events/char-home67-profile.webp'),
  [Z4L.doneNotice]:nt(N['NQ-2'], Z4L_ART.profile),
  [Z4L.unlockNotice]:nt(N['NU-1'], Z4L_ART.icon, { openLamp:true }),   // NU-1 (the "new helper in the lamp" window of Rae's NA-2 shape)
});
/** the worker's first talk (9.3) + the two choices */
export const Z4L_TALK = Object.freeze({ lines:RAW_Z4C_LUPIN_TALK.talk, choices:RAW_Z4C_LUPIN_TALK.choices });
/** the worker's answer to the choice "sorry, I made a mistake" (Rae, T9): two lines, one <p> each; the quest stays open */
export const LUPIN_LET_GO = Object.freeze({
  th:Object.freeze(['คนงาน: "ไม่เป็นไรครับ ผมไม่รีบ"', 'บรรยาย: เขาหัวเราะเบา ๆ ในลำคอ แล้วหันกลับไปมองประตูหลังโรงอาหารเหมือนเดิม เขายังยืนอยู่ที่เดิม']),
  en:Object.freeze(['Worker: "No trouble, sir. I am in no hurry."', 'Narration: He gives a soft laugh in his throat and turns back to watch the door behind the canteen. He is still standing where he was.']),
});
/** helper no. 12 (Rae 9.4): ONE foe, a light-medium blow + that foe loses its next act (`stun` on the target only) */
const H = RAW_Z4C_LUPIN_HELPER;
export const LUPIN_HELPER = Object.freeze({ name:L2(H.name.th, H.name.en), move:{ name:L2(H.move.th, H.move.en), desc:L2(H.desc.th, H.desc.en) }, say:{ call:L2(H.call.th, H.call.en), use:L2(H.use.th, H.use.en), end:L2(H.end.th, H.end.en) } });
