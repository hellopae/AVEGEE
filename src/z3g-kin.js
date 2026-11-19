// T7c/6 (Rae R2 part C, section 6): the relatives of the crew in Zone 3, built the way Zone 2's are (z2-events.js Z2_KIN) - each relative's case comes to the queue once the crew member who owns it is hired AND Eirlin's test (case 10) is passed,
// at the tail of the queue (never ahead of a story case); the crew member speaks before the bench ("before" = the window behind the notice's button), in the interrogation ("during"), after the verdict ("after" + two choices, each with its lines).
// The six cases, notices and talk are Rae's, copied VERBATIM by scripts/extract-rae-z3-kin.py (z3g-raw-kin.js): 1 judge / Poena (taan) · 2 younger brother / Ognien (plerng) · 3 client / Sibyl (kan) · 4 daughter / Grace (boon) ·
// 5 the sentry bound to open the gate / VAN HELSING (the Gate Guard of the West - part C 6.2 replaces the gate giant; the case itself is her first-script text) · 6 the soup-house cook / Noir (dam, version B).
// Two choices have an effect in the game: relative 3's second choice sends Sibyl away to serve a penalty and she comes back (Rae 5.3 B, owner 16 Nov) - done with the crew's tea-house recovery; relative 6's first choice is a journal line.
import { RAW_KIN, RAW_KINCASE_FALSEORDER, RAW_KINCASE_YOUNGERBROTHER, RAW_KINCASE_DOOMCLIENT, RAW_KINCASE_CARERDAUGHTER, RAW_KINCASE_GATESENTRY, RAW_KINCASE_SOUPCOOK } from './z3g-raw-kin.js';
import { Z2_KIN_BY_KEY } from './z2-events.js';
import { Z4_KIN_BY_KEY } from './z4c-cases.js';   // T8b: WATSON-03's quest of Zone 4
const A = n => `img/z3-events/${n}.webp`;
const caseDef = raw => { const { quest, ...rest } = raw; return Object.freeze({ ...rest, story:true, z3kin:true }); };   // `quest` would put it in the side-quest pools; `story` keeps it out of the random draw
const RAW = { falseorder:RAW_KINCASE_FALSEORDER, youngerbrother:RAW_KINCASE_YOUNGERBROTHER, doomclient:RAW_KINCASE_DOOMCLIENT, carerdaughter:RAW_KINCASE_CARERDAUGHTER, gatesentry:RAW_KINCASE_GATESENTRY, soupcook:RAW_KINCASE_SOUPCOOK };
const CREW = { falseorder:'taan', youngerbrother:'plerng', doomclient:'kan', carerdaughter:'boon', gatesentry:'guard', soupcook:'dam' };

export const Z3_KIN_AWAY = Object.freeze({ crew:'kan', choiceOf:'doomclient', choiceIndex:1, awayNotice:'z3-kin3-away', backNotice:'z3-kin3-back', journalCook:'นัวร์เริ่มติดป้ายวันต้มบนหม้อในโรงอาหาร' });
/** Rae 5.3 B (owner 16 Nov): what Sibyl says and does as she goes - added to the end of her second choice - and when she comes back (the back lines are the detail of the "back at work" window) */
const SIBYL_GO = { th:['บรรยาย: ซิบิลวางลูกแก้วไว้บนแท่น หยิบเพียงผ้าคลุมไหล่ แล้วเดินไปที่สถานีลงทัณฑ์ต่อท้ายแถววิญญาณ ไม่มีใครต้องพาไป หัวหน้าตระกูลมองตามอยู่นาน', 'ซิบิล: "ดิฉันไปก่อนนะคะ ท่านไม่ต้องรอ ลูกแก้วฝากไว้ที่โต๊ะ ดิฉันจะกลับมาเมื่อรับส่วนของดิฉันครบค่ะ"'],
  en:['Narration: Sibyl leaves her crystal on the dais, takes only her shawl, and walks to the penalty station at the tail of the line of spirits. No one has to lead her. The head of the house watches her go for a long while.', 'Sibyl: "I will go ahead, sir. Please do not wait. I leave my crystal at the desk. I will come back once I have borne my share."'] };
const SIBYL_BACK = { th:['บรรยาย: ซิบิลเดินกลับมาที่โต๊ะ ชายผ้าคลุมไหล่ยังมีไอร้อนจางจากสถานี เธอเลิกผ้าที่คลุมลูกแก้วออกช้า ๆ แล้ววางมือบนลูกแก้วอย่างไม่รีบ', 'ซิบิล: "ดิฉันกลับมาแล้วค่ะ ที่นั่นไม่มีใครถามให้ดิฉันทำนาย ดิฉันเลยได้ฟังตัวเองเงียบ ๆ ต่อไปนี้ดิฉันจะพูดคำว่า \'อาจ\' ให้ดังกว่าเดิมค่ะ และจะย้ำจนกว่าผู้ฟังจะได้ยิน"'],
  en:['Narration: Sibyl walks back to her desk. The hem of her shawl still carries a faint warmth from the station. She lifts the cloth from the crystal slowly and lays a hand on it without hurry.', 'Sibyl: "I am back, sir. No one there asked me to foretell anything, so I could hear myself in the quiet. From now on I will say \'may\' more loudly, and I will repeat it until the listener hears."'] };

export const Z3_KIN = Object.freeze(Object.keys(CREW).map(k => {
  const r = RAW_KIN[k], choices = r.choices.map((c, i) => ({ label:c.label.th, labelEn:c.label.en,
    lines:k === Z3_KIN_AWAY.choiceOf && i === Z3_KIN_AWAY.choiceIndex ? [...c.lines.th, ...SIBYL_GO.th] : c.lines.th, linesEn:k === Z3_KIN_AWAY.choiceOf && i === Z3_KIN_AWAY.choiceIndex ? [...c.lines.en, ...SIBYL_GO.en] : c.lines.en }));
  return Object.freeze({ k, crew:CREW[k], zone:'west', def:caseDef(RAW[k]),
    notice:{ ...r.notice.th, en:r.notice.en }, before:r.before.th, beforeEn:r.before.en, during:r.during.th, duringEn:r.during.en, after:r.after.th, afterEn:r.after.en, choices });
}));
export const Z3_KIN_CASES = Object.freeze(Z3_KIN.map(r => r.def));
export const Z3_KIN_BY_KEY = Object.freeze(Object.fromEntries(Z3_KIN.map(r => [r.k, r])));
/** the soul pictures of the six relatives (img/z3-events, Rae sec. 8 #7-#11 and #20 `soul-soup-cook-west`) */
export const Z3_KIN_SPRITE = Object.freeze({ falseorder:'soul-false-judge-west', youngerbrother:'soul-younger-brother-west', doomclient:'soul-prophecy-client-west', carerdaughter:'soul-carer-daughter-west', gatesentry:'soul-gate-sentry-west', soupcook:'soul-soup-cook-west' });
export const Z3_KIN_ART_KEY = /^soul-(false-judge|younger-brother|prophecy-client|carer-daughter|gate-sentry|soup-cook)-west(-profile)?$/;
/** one lookup for the relatives of Zone 2 and Zone 3 (game.js / ui.js read this instead of Z2_KIN_BY_KEY) */
export const KIN_BY_KEY = Object.freeze({ ...Z2_KIN_BY_KEY, ...Z3_KIN_BY_KEY, ...Z4_KIN_BY_KEY });

/** `kin-<k>`: the window when the relative comes to the queue (behind its button = what the crew member says before the hearing) */
export const Z3_KIN_NOTICES = Object.freeze({
  ...Object.fromEntries(Z3_KIN.map(r => [`kin-${r.k}`, { title:r.notice.title, text:r.notice.text, button:r.notice.button, detail:r.before.join('\n'), art:A(`${Z3_KIN_SPRITE[r.k]}-profile`),
    en:{ ...r.notice.en, detail:r.beforeEn.join('\n') } }])),
  [Z3_KIN_AWAY.awayNotice]:{ title:'ซิบิลไปรับทัณฑ์', text:'ซิบิลเดินไปรับทัณฑ์ที่สถานีเคียงข้างวิญญาณ เธอจะทำงานไม่ได้จนกว่าจะกลับมา', button:'รับทราบ', art:A('soul-prophecy-client-west-profile'),
    en:{ title:'Sibyl goes to serve her penalty', text:'Sibyl has walked to the station to serve a penalty beside the spirit. She cannot work until she returns.', button:'Understood' } },
  [Z3_KIN_AWAY.backNotice]:{ title:'ซิบิลกลับมาทำงานแล้ว', text:'ซิบิลรับทัณฑ์เสร็จและกลับมาที่โต๊ะ พร้อมทำงานต่อ', button:'ฟังซิบิล', detail:SIBYL_BACK.th.join('\n'), art:A('soul-prophecy-client-west-profile'),
    en:{ title:'Sibyl is back at work', text:'Sibyl has served her penalty and returned to her desk, ready to work again.', button:'Hear Sibyl', detail:SIBYL_BACK.en.join('\n') } },
});
