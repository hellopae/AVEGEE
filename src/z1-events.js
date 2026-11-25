// Z1-EVENTS (owner spec 13 Nov 2026 · Output/Claudy/briefs/2026-11-13-avegee-z1-events-owner-spec.md)
// One table for the order of Zone 1's story beats, so the order can be read (and tested) in one place:
//
//   case  3  prison break            ZONE_EVENTS.th prisonBreak   atCases 3
//   case  5  ER nurse (existing)     story case 'nurse'           the 5th case
//   case  6  temple beggar -> deva   story case 'devaMonk'        the 6th case, then devaTest (atCases 6)
//   case  9  frontier breach         ZONE_EVENTS.th frontierBreach atCases 9 (3 waves + border boss, Guard joins)
//   case 12  Sita / Hanuman          story case 'sitaledger'      the 12th case, then sitaHanuman (atCases 12)
//   case 15  elder brother Yommathat ZONE_EVENTS.th thBorderBoss  atCases 15
//
// A "story case" is a named case that is put at the head of the queue when the count is reached (the same mechanism the temple beggar always used).
// `after` = cases already judged in Zone 1 when it becomes due (after:4 -> it is the 5th case).
import { SPOTS } from './data.js';
import { Z2_NOTICES, Z2_STORIES, Z2_STORY_CASES } from './z2-events.js';
import { SUMMONERS, LAMP_FIRST_SLOT_ON } from './lamp.js';
import { HARBOR_FLAME_NOTICE } from './z2b-harbor.js';
import { RYUJIN_TEXT, ART as RYUJIN_ART } from './z2b-ryujin.js';
import { MUSASHI_FLAME_NOTICE } from './z2b-cerberus.js';
import { LAMP_TEXT } from './lamp-text.js';
import { WANTHONG, WANTHONG_CASE, WANTHONG_STORIES, WANTHONG_NOTICES } from './z1-wanthong.js';
import { YOMATHAT_STORIES, YOMATHAT_NOTICES } from './z1-yomathat.js';
import { GATE_ALL_STORIES, GATE_NOTICES } from './z2-gate.js';
import { BOATMAN_STORIES, BOATMAN_NOTICES } from './boatman.js';
import { Z3_ARRIVE_STORIES, Z3_ARRIVE_NOTICES } from './z3c-arrival.js';   // T7/1
import { Z3_FRONTIER_STORIES, Z3_FRONTIER_NOTICES } from './z3c-frontier.js';   // T7/2
import { Z3_STORY_CASES, Z3_CASE_NOTICES, Z3_CASE_STORIES } from './z3d-cases.js';   // T7b/3
import { EIRLIN_NOTICES, EIRLIN_STORIES } from './z3e-eirlin.js';   // T7b/4
import { SEV_NOTICES, SEV_STORIES } from './z3f-severin.js';   // T7b-2/5
import { Z3_KIN_NOTICES } from './z3g-kin.js';   // T7c/6
import { Z4A_STORIES, Z4A_NOTICES } from './z4a-border.js';   // T8a
import { COL_NOTICES } from './z4b-colosseum.js';   // T8a/2
import { Z4_STORY_CASES, Z4C_CASE_NOTICES } from './z4c-cases.js';   // T8b
import { Z4T_STORIES, Z4T_NOTICES } from './z4d-trojan.js';   // T8b/2
import { Z4S_STORIES, Z4S_NOTICES } from './z4e-sala.js';   // T8b/5
import { Z4G_STORIES, Z4G_NOTICES } from './z4g-return.js';   // T8c
import { Z4H_STORIES } from './z4h-final.js';   // T8d (the opening scene, the free-from-control pages, the page after Archon-Zero, the ending coda)
import { Z4L_STORIES, Z4L_NOTICES } from './z4f-lupin.js';   // T8b/6

export const TH_STORY_CASES = Object.freeze([
  Object.freeze({ k:'nurse', after:4, needsGate:true }),
  Object.freeze({ k:'devaMonk', after:5, needsGate:true, needsCase:'nurse' }),
  Object.freeze({ k:'sitaledger', after:11, needsEvent:'frontierBreach' }),
  // T5'/1 (Rae R2 A 4.1): case 13 - Lady Wanthong, an ordinary case in the ordinary court; whatever is ruled, Khun Phaen comes (the event khunPhaen)
  Object.freeze({ k:'wanthong', after:12, needsEvent:'sitaHanuman', def:WANTHONG_CASE, notice:WANTHONG.arriveNotice }),
]);
export const TH_STORY_CASE_KEYS = Object.freeze(TH_STORY_CASES.map(c => c.k));
/** Zone 2 (Z2-EVENTS): the old ape (7th case) and Satori's father (13th case) - ordinary cases, heard in the ordinary court (z2-events.js). */
export const STORY_CASE_ROWS = Object.freeze({ th:TH_STORY_CASES, asia:Z2_STORY_CASES, west:Z3_STORY_CASES, cyberhell:Z4_STORY_CASES });
export const storyCaseRows = zone => STORY_CASE_ROWS[zone] || [];
export const storyCaseRow = (zone, k) => storyCaseRows(zone).find(c => c.k === k) || null;
export const isStoryCaseKey = (zone, k) => storyCaseRows(zone).some(c => c.k === k);
/** The Zone 1 event that follows a story case (opens only once that case is judged). */
export const EVENT_AFTER_CASE = Object.freeze({ devaTest:'devaMonk', sitaHanuman:'sitaledger', khunPhaen:'wanthong', asiaWukong:'apeelder' });

/** Has this story case been judged (or is the story already past it)? */
export function storyCaseDone(g, k, zone = g.zone) {
  if (g.storyCaseDone?.[k]) return true;
  const ev = g.zoneEvents?.[zone] || {};
  // Later beats prove earlier ones: an old save must not get a beat again once the story moved on.
  if (zone === 'asia') {
    if (k === 'apeelder') return ev.asiaWukong === 'cleared' || !!g.bossCleared?.asia;
    if (k === 'guanyinfather') return !!g.bossCleared?.asia || !!g.storyCaseDone?.satorifather;   // T6/2: a save already past case 12 never gets her late
    if (k === 'satorifather') return !!g.bossCleared?.asia;
    return false;
  }
  if (k === 'devaMonk') return !!g.devaVisits?.th || !!ev.devaTest;
  if (k === 'nurse') return !!g.devaVisits?.th || !!ev.devaTest;
  if (k === 'sitaledger') return !!ev.sitaHanuman || !!g.bossCleared?.th;
  if (k === 'wanthong') return !!ev.khunPhaen || !!ev.thBorderBoss || !!g.bossCleared?.th;   // later beats prove it: a save that is already past case 13 never gets her late
  return false;
}
/** The story case that is due now (key), or null. Only one is ever due: they are strictly ordered. */
export function owedStoryCase(g) {
  const rows = storyCaseRows(g.zone);
  if (!rows.length) return null;
  const n = g.zoneCases?.[g.zone] || 0;
  for (const row of rows) {
    if (storyCaseDone(g, row.k, g.zone)) continue;
    if (n < row.after) return null;
    if (row.needsCase && !storyCaseDone(g, row.needsCase, g.zone)) return null;
    if (row.needsEvent && g.zoneEvents?.[g.zone]?.[row.needsEvent] !== 'cleared') return null;
    return row.k;
  }
  return null;
}

/** Guard (green giant): in Zone 1 he is the gate keeper of the border and joins the team only after the frontier breach (owner e2 / e3).
 *  Other zones keep their own rule. */
export const guardUnlocked = (g, zone = g.zone) =>
  zone === 'cyberhell' ? g.zoneEvents?.cyberhell?.cyberBreach === 'cleared' :   // T8b/2: WATSON-03 joins through the case-7 fight, not the hire desk
  zone === 'west' ? g.zoneEvents?.west?.westVampireBreach === 'cleared' :   // T7/2: Zone 3's Guard (Van Helsing) joins through the case-5 event, not the hire desk
  zone !== 'th' || g.zoneEvents?.th?.frontierBreach === 'cleared' || !!g.bossCleared?.th;

/** HP share of the border boss at which the story closes the fight with the new team move (owner: "ใช้เป็นท่าสุดท้ายเพื่อจบฉากต่อสู้บอสชายแดน"). */
export const BREACH_FINALE_AT = 0.3;

// ---------------------------------------------------------------------------------------------------------------------
// Case 12 · Sita / Hanuman / [PHANTOM-404]
// Text: Rae R1 part A (Output/Rae/2026-11-16-avegee-r1.md, A1-A6: owner feedback F10-F12 of 15 Nov) + R2 part A section 3 (the lamp). Reese checked both.
// R1 A replaces the 13 Nov text: no "suspicious" headline/tag, charge = "บัญชีผิดปกติ", four short claims in Sita's own voice, THREE verdicts
// (sentence / do not sentence / put on hold - Nira advises the last) and all three end with Hanuman coming down. Her pictures are Codex slots (e2 / e3 not drawn yet:
// the old Hanuman pictures stand in). Every string of the beat lives in this object.
export const SITA_CAMEO = false;
export const SITA = Object.freeze({
  caseKey:'sitaledger', eventKey:'sitaHanuman',
  caseTitle:'คดีที่ 12 · นางสีดา',
  art:Object.freeze({
    sprite:'img/z1-events/soul-sita-th.webp',            // map / court standee
    portrait:'img/z1-events/soul-sita-th-profile.webp',  // hearing card
    hanumanSprite:'img/z1-events/boss-hanuman-th.webp',
    hanumanPortrait:'img/z1-events/boss-hanuman-th-profile.webp',
    descend:'img/z1-events/cut-hanuman-descends-th.webp',
    yield:'img/z1-events/cut-hanuman-yields-th.webp',
    phantom:'img/z1-events/cut-sita-phantom-ledger-th.webp',
    lamp:'img/z1-events/cut-sita-lamp-th.webp',          // R2 A4: Codex slot - a copy of cut-hanuman-yields-th stands in until it is drawn
    return:'img/z1-events/cut-sita-return-th.webp',
  }),
  notices:Object.freeze({
    // A1 N1 (replaces the 13 Nov text, which gave the plot away)
    arrive:{ title:'วิญญาณนามสูงมาถึงแล้ว', text:'วิญญาณนางสีดามาถึงคิวพิจารณา แฟ้มระบุให้รับโทษเก้าวาระ', button:'เริ่มไต่สวน',
      en:{ title:'A Revered Soul Has Arrived', text:'Lady Sita has reached the queue. Her file orders nine terms of penance.', button:'Begin the hearing' } },
    // A5 N2: reads right whatever was ruled
    hanuman:{ title:'หนุมานลงมาแล้ว', text:'ทหารเอกของพระรามลงมารับพระนางกลับ ไม่ว่าท่านจะตัดสินอย่างไร เขาไม่ใช่ศัตรู แต่ต้องการเห็นว่าท่านปกป้องพระนางได้จริง', button:'รับมือ',
      en:{ title:'Hanuman Has Descended', text:'Rama\'s chief warrior has come to take her home, whatever you ruled. He is no enemy, but he wants to see that you can truly protect her.', button:'Face him' } },
    win:{ title:'หนุมานยอมรับ', text:'ท่านผ่านการทดสอบของหนุมาน พระนางยังปลอดภัย', button:'ต่อ' },
    lose:{ title:'หนุมานรอท่านอยู่', text:'หนุมานหยุดมือไว้ก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้', button:'ทดสอบอีกครั้ง' },
    phantom:{ title:'พบรหัสผู้แก้ที่ไม่มีในทะเบียน', text:'นิราพบว่าแฟ้มของนางสีดาถูกแก้จากด้านนอก รหัสผู้แก้คือ [PHANTOM-404] เพิ่มบันทึกลงสมุดแล้ว', button:'ดูบันทึก' },
  }),
  journal:'PHANTOM-404: แฟ้มนางสีดาถูกแก้โดยผู้ไม่อยู่ในทะเบียนสาขาใด วิญญาณยังไม่ถึงกำหนดแต่ถูกเรียกลงมา นิราจะตรวจแฟ้มเก่าย้อนหลังต่อ',
  banner:'ศึกปกป้องพระนาง · ท่านหนุมาน',
  hearing:Object.freeze({
    name:'นางสีดา', who:'ชายาแห่งพระราม ผู้ถูกเรียกลงมาตามบัญชี',
    face:'สงบ นิ่ง ใครเห็นก็อยากก้มศีรษะให้โดยไม่ต้องบอก',
    // A2 (the `sitaledger` block): the charge line + its tag, merits, her opening line, four claims (one `deny` = the only one that clashes with the file)
    charge:'แฟ้มสั่งให้รับโทษเก้าวาระ ไม่ระบุความผิด',
    chargeTag:'บัญชีผิดปกติ',
    chargeTagEn:'Irregular ledger',
    merits:Object.freeze([
      'ยึดมั่นในสัจจะตลอดเวลาที่ถูกกักตัว ไม่ยอมอ่อนข้อต่อการบังคับ',
      'ยังเมตตาต่อผู้ที่เฝ้าคุมตน แม้ในวันที่ตนเองทุกข์ที่สุด',
      'ไม่เคยเอ่ยโทษผู้เฝ้าคุมว่าเป็นต้นเหตุของความทุกข์ที่ตนได้รับ',
    ]),
    line:'"หม่อมฉันมาตามที่บัญชีเรียกเจ้าค่ะ ท่านจะตัดสินอย่างไร หม่อมฉันขอฟัง"',
    claims:Object.freeze([
      { kind:'solid', t:'หม่อมฉันไม่ทราบว่าแฟ้มเขียนความผิดอะไรไว้เจ้าค่ะ ทราบเพียงว่าถูกเรียกมา' },
      { kind:'deny', t:'หม่อมฉันไม่เคยทำสิ่งใดที่ต้องรับโทษเก้าวาระเจ้าค่ะ',
        reveal:'นิราเทียบกับแฟ้มต้นฉบับ หมึกในช่องผู้กระทำเข้มกว่าบรรทัดอื่นของหน้าเดียวกัน' },
      { kind:'solid', t:'หม่อมฉันไม่ขอให้ท่านเมตตาเพราะหม่อมฉันเป็นใครเจ้าค่ะ ขอเพียงให้ตัดสินจากความจริง' },
      { kind:'solid', t:'ถ้าท่านจะถามสิ่งใดอีก หม่อมฉันยินดีตอบเจ้าค่ะ' },
    ]),
    secret:'ส่องกระจกแล้ว ไม่พบเรื่องใดซ่อนอยู่ในใจพระนางเลย',
    reward:'ยมบาทน้อยมองพระนางเดินกลับขึ้นไปพร้อมหนุมาน แล้วนิราก็ปิดแฟ้มเล่มนั้นลงช้า ๆ ด้วยสองมือ',
    // A3: Nira's advice (the "ช่วยเปิดความจริง" button) - puts the "Nira advises" tag on the hold verdict
    nira:Object.freeze({
      button:'ช่วยเปิดความจริง · นิรา', buttonEn:'Open the truth · Nira',
      say:'นิรา: "ท่านคะ ดิฉันอ่านแฟ้มเล่มนี้แล้วยังไม่สบายใจค่ะ ขอแนะนำให้พักคดีไว้ก่อนเพื่อตรวจสอบ ท่านไม่ต้องรีบตัดสินค่ะ"',
      sayEn:'Nira: "Sir, I am not easy about this file. I suggest putting the case on hold while it is checked. There is no need to rule in haste."',
      tag:'นิราแนะนำ', tagEn:'Nira advises',
    }),
    // A4: three verdicts, all end with Hanuman. `lines` = what is said when the verdict is pressed. `punish` first asks the usual three things (station / who guards / level) and
    // "ออกหมาย" - but Hanuman comes down BEFORE the writ reaches the guard, so no sentence is ever carried out and nothing is scored (Rae: the three paths score the same).
    choices:Object.freeze([
      { k:'punish', label:'ลงโทษ', labelEn:'Sentence her', hint:'เลือกที่ไหน · ใครคุม · ระดับทัณฑ์ แล้วกด "ออกหมาย"', hintEn:'Pick station, guard, level, then Issue the Writ',
        lines:['ยมบาทน้อย: "ผมออกหมายตามระดับที่เลือกครับ"', 'นางสีดา: "หม่อมฉันรับฟังเจ้าค่ะ"', 'บรรยาย: ตราหมายกดลงบนกระดาษ ผู้คุมยังไม่ทันก้าวเข้ามา แสงสีทองแหวกเพดานห้องพิพากษาลงมา'] },
      { k:'free', label:'ไม่ลงโทษ', labelEn:'Do not sentence her',
        lines:['ยมบาทน้อย: "ผมไม่ลงโทษครับ เชิญพระนางรอที่ประตูสวรรค์"', 'นางสีดา: "ขอบพระคุณเจ้าค่ะ"', 'บรรยาย: ประตูสวรรค์ยังไม่ทันเปิด แสงสีทองแหวกเพดานห้องพิพากษาลงมา'] },
      { k:'hold', label:'พักคดีไว้ก่อนเพื่อตรวจสอบ', labelEn:'Put the case on hold for checking', advised:true,
        lines:['ยมบาทน้อย: "ผมขอพักคดีนี้ไว้ก่อนครับ เพื่อตรวจสอบแฟ้ม"', 'นิรา: "รับทราบค่ะ ดิฉันจะเปิดแฟ้มต้นฉบับทันที"', 'นางสีดา: "ขอบพระคุณเจ้าค่ะ หม่อมฉันจะรอ"', 'บรรยาย: นิราเริ่มพลิกหน้าแฟ้ม แล้วแสงสีทองก็แหวกเพดานห้องพิพากษาลงมา'] },
    ]),
  }),
});
/** The verdict keys, in the order of the buttons. */
export const SITA_CHOICE_KEYS = Object.freeze(SITA.hearing.choices.map(c => c.k));

/** The soul that stands in the queue for case 12. Not part of cases.js: it is never drawn by chance and never sentenced (see game.js resolveSitaCase). */
export const SITA_CASE = Object.freeze({ k:'sitaledger', story:true, zone:'th', sex:'f', sp:'soul-sita-th', kind:'innocent', calm:true,
  name:SITA.hearing.name, who:SITA.hearing.who, face:SITA.hearing.face,
  seen:[{ t:SITA.hearing.charge, tag:SITA.hearing.chargeTag, w:0 }], hidden:[],
  merits:SITA.hearing.merits.map((t, i) => ({ t, v:i ? 1 : 2, fake:false })),
  line:SITA.hearing.line, claims:SITA.hearing.claims.map(c => ({ ...c })), secret:SITA.hearing.secret, reward:SITA.hearing.reward, fail:null });

/** T4 (R2 A 2.6): the three lamp windows. NA-1 = the lamp arrives (its last sentence names Hanuman in the first slot - only when the first slot comes with the lamp, LAMP_FIRST_SLOT_ON) ·
 *  NA-2 = a new helper has accepted you (one per helper, `{name}` filled in) · NA-3 = the first time every flame is spent (after a fight). `openLamp` = the button opens the bag's lamp tab. */
function lampNotices() {
  const T = LAMP_TEXT, slot = LAMP_FIRST_SLOT_ON === 'receive';
  const out = {
    'lamp-received':{ title:T['notice.received.title'].th, text:T['notice.received.text'].th + (slot ? T['notice.received.slot'].th : ''), button:T['notice.received.button'].th, openLamp:true, art:SUMMONERS.hanuman.art.icon,
      en:{ title:T['notice.received.title'].en, text:T['notice.received.text'].en + (slot ? T['notice.received.slot'].en : ''), button:T['notice.received.button'].en } },
    'lamp-low':{ title:T['notice.low.title'].th, text:T['notice.low.text'].th, button:T['notice.low.button'].th, art:SUMMONERS.hanuman.art.icon,
      en:{ title:T['notice.low.title'].en, text:T['notice.low.text'].en, button:T['notice.low.button'].en } },
  };
  for (const k of Object.keys(SUMMONERS)) out[`lamp-helper-${k}`] = { title:T['notice.helper.title'].th, text:T['notice.helper.text'].th.replace('{name}', SUMMONERS[k].name.th), button:T['notice.received.button'].th, openLamp:true,
    art:SUMMONERS[k].art?.icon || '',   // a helper that has no drawing yet shows the window without a picture (never another character's)
    en:{ title:T['notice.helper.title'].en, text:T['notice.helper.text'].en.replace('{name}', SUMMONERS[k].name.en), button:T['notice.received.button'].en } };
  return out;
}
/** Notice windows of Zone 1's story (game.js queueNotice / ackNotice · ui.js openStoryNotice). `detail` = shown when the button is pressed. */
export const NOTICES = Object.freeze({
  // Case 5 — the owner's own sentence (spec 13 Nov 2026)
  'nurse-ledger':{ title:'คดีพยาบาลห้องฉุกเฉิน', text:'ลายมือในแฟ้มต้นทางที่สลับเลขเป็นของเพื่อนร่วมโต๊ะเดิมของนิรา', button:'รับทราบ', art:'img/soul-nurse.webp' },
  'sita-arrive':{ ...SITA.notices.arrive, art:SITA.art.portrait },
  'sita-phantom':{ ...SITA.notices.phantom, detail:SITA.journal, art:SITA.art.phantom },
  ...lampNotices(),
  ...WANTHONG_NOTICES,
  ...YOMATHAT_NOTICES,
  ...GATE_NOTICES,
  ...BOATMAN_NOTICES,
  ...Z2_NOTICES,
  ...Z3_ARRIVE_NOTICES,   // T7/1
  ...Z3_FRONTIER_NOTICES,   // T7/2
  ...Z3_CASE_NOTICES,   // T7b/3
  ...EIRLIN_NOTICES,   // T7b/4 (N10-1, N10-4', NE-1)
  ...SEV_NOTICES,   // T7b-2/5 (N15-1, N15-4, NS-1, NH-1 / 3 / 4)
  ...Z3_KIN_NOTICES,   // T7c/6 (NK1-NK6 + Sibyl away / back)
  ...COL_NOTICES,   // T8a/2 (N-COL-1, NT-1, NL-1)
  ...Z4A_NOTICES,   // T8a/3 (NW-1, NZ-2, NH-5, NH-6)
  ...Z4C_CASE_NOTICES,   // T8b (NAS-1 ...)
  ...Z4T_NOTICES,   // T8b/2 (NV-W)
  ...Z4S_NOTICES,   // T8b/5 (NS-10)
  ...Z4L_NOTICES,   // T8b/6 (NQ-1 NQ-2 NU-1)
  ...Z4G_NOTICES,   // T8c (NR-1 per zone)
  'lamp-helper-ryujin':{ ...RYUJIN_TEXT.win, openLamp:true, art:RYUJIN_ART.icon },   // T6/5 (NR-3): the win window IS the unlock window
  'lamp-helper-musashi':MUSASHI_FLAME_NOTICE,   // T6/7 (NM-1)
  'lamp-helper-liangang':HARBOR_FLAME_NOTICE,   // T6/4 (NL-4): Lian Gang's own window instead of the generic one
});

const page = (image, title, line) => ({ image, title, line, fallback:'📜' });
/** Story pages of the beat. Pictures are Codex slots (16:9); until they exist the comic shows its normal "no picture" fallback. */
/** A5: the Hanuman-descends scene exists in three versions, one per verdict - the first narration line and Yama's first line change, the rest is shared. */
const OPEN_BY_CHOICE = Object.freeze({
  punish:{ lead:'บรรยาย: หลังคาห้องพิพากษาสั่นสะเทือน แสงสีทองแหวกเมฆดำลงมาก่อนหมายจะถึงมือผู้คุม วานรร่างขาวสง่าลงยืนขวางหน้านางสีดา มือหนึ่งถือจดหมายประทับตราพระราม',
    yama:'ยมบาทน้อย: "ท่านหนุมาน หมายนั้นผมยังไม่ได้บังคับใช้ครับ ขอผมตรวจแฟ้มก่อนได้ไหมครับ"' },
  free:{ lead:'บรรยาย: หลังคาห้องพิพากษาสั่นสะเทือน แสงสีทองแหวกเมฆดำลงมาก่อนประตูสวรรค์จะเปิด วานรร่างขาวสง่าลงยืนขวางหน้านางสีดา มือหนึ่งถือจดหมายประทับตราพระราม',
    yama:'ยมบาทน้อย: "ท่านหนุมาน ผมเพิ่งตัดสินให้พระนางไม่ต้องรับโทษครับ ท่านไม่ต้องห่วง"' },
  hold:{ lead:'บรรยาย: หลังคาห้องพิพากษาสั่นสะเทือน แสงสีทองแหวกเมฆดำลงมาขณะนิราพลิกแฟ้ม วานรร่างขาวสง่าลงยืนขวางหน้านางสีดา มือหนึ่งถือจดหมายประทับตราพระราม',
    yama:'ยมบาทน้อย: "ท่านหนุมาน ผมกำลังตรวจแฟ้มของพระนางอยู่พอดีครับ ขอเวลาอีกหน่อย"' },
});
const openStory = k => ({ title:'คำบัญชาจากพระราม', pages:[
  page(SITA.art.descend, 'คำบัญชาจากพระราม',
    OPEN_BY_CHOICE[k].lead + '\n'
    + 'หนุมาน: "ข้าชื่อหนุมาน ทหารเอกของพระราม ท่านจะตัดสินพระนางอย่างไร ข้าไม่ได้มาฟังคำตัดสิน ข้ามาตามพระบัญชา ให้รับพระนางกลับไปให้พ้นจากที่แห่งนี้ พระรามเจ้าทรงรู้สึกว่ามีสิ่งผิดปกติ"'),
  page(SITA.art.descend, 'ข้าเชื่อพระบัญชาก่อน',
    OPEN_BY_CHOICE[k].yama + '\n'
    + 'หนุมาน: "ข้าไม่ได้สงสัยท่าน แต่ข้าสาบานต่อพระรามไว้แล้วว่าจะไม่ปล่อยให้พระนางอยู่ในที่ที่ข้ายังไม่แน่ใจว่าปลอดภัย ท่านอยากให้ข้าเชื่อ ก็จงแสดงให้ข้าเห็นว่าท่านปกป้องพระนางได้จริง"\n'
    + 'บรรยาย: หนุมานยกมือตั้งท่า ไม่ใช่เพื่อทำลาย แต่เพื่อทดสอบผู้ที่จะยืนเคียงพระนางแทนเขา'),
] });
/** `sita-return` (R1 A6): Sita's first line (page 1) and Yama's first line (page 2) follow the verdict; the rest is the 13 Nov text. */
const RETURN_BY_CHOICE = Object.freeze({
  punish:{ sita:'นางสีดา: "หม่อมฉันไม่ถือโทษท่านเจ้าค่ะ ท่านทำตามบัญชีที่ท่านได้รับ"', yama:'ยมบาทน้อย: "ผมต่างหากที่ต้องขออภัยพระนางครับ ที่เกือบออกหมายโดยไม่ตรวจก่อน"' },
  free:{ sita:'นางสีดา: "ขอบพระคุณที่ท่านไม่ตัดสินจากบัญชีเพียงอย่างเดียวเจ้าค่ะ"', yama:'ยมบาทน้อย: "ผมต่างหากที่ต้องขอบคุณครับ ที่พระนางใจเย็นพอให้ผมตรวจ"' },
  hold:{ sita:'นางสีดา: "ขอบพระคุณที่ท่านฟังหม่อมฉันก่อนอ่านบัญชีเจ้าค่ะ"', yama:'ยมบาทน้อย: "ผมต่างหากที่ต้องขอบคุณครับ ที่พระนางใจเย็นพอให้ผมตรวจ"' },
});
const returnStory = k => ({ title:'ส่งพระนางกลับ', pages:[
  page(SITA.art.return, 'คืนบัญชี',
    'บรรยาย: นิราประทับตรายกเลิกข้อหา แล้วเขียนกำกับท้ายแฟ้มว่า "ผู้ถูกเรียกก่อนกำหนด คืนอายุขัยเต็ม" ประตูสวรรค์เปิดออกช้า ๆ\n' + RETURN_BY_CHOICE[k].sita),
  page(SITA.art.return, 'ขอบคุณที่ไม่ตัดสินจากบัญชี',
    RETURN_BY_CHOICE[k].yama + '\n'
    + 'หนุมาน: "ข้าค้อมศีรษะให้ศาลแห่งนี้ ข้าขอพระนางกลับไปหาพระรามเจ้า เจ้านายของข้าคงรออยู่"\n'
    + 'บรรยาย: หนุมานประคองพระนางขึ้นไปตามแสงทอง ประตูสวรรค์ปิดลงเบา ๆ นิรายังยืนมองแฟ้มเล่มนั้นอยู่อีกครู่'),
] });
export const SITA_STORIES = {
  ...Object.fromEntries(SITA_CHOICE_KEYS.map(k => [`sita-hanuman-open-${k}`, openStory(k)])),
  // A6 · e2: Sita tells Hanuman to stop, he accepts and bows (the picture is a Codex slot: cut-hanuman-yields-th stands in)
  'sita-hanuman-win':{ title:'หนุมานยอมรับ', pages:[
    page(SITA.art.yield, 'พอเถิดหนุมาน',
      'บรรยาย: หนุมานตั้งท่าจะพุ่งเข้าใส่อีกครั้ง นางสีดาก้าวออกมายืนกลางโถง ยกมือขึ้นเบา ๆ\n'
      + 'นางสีดา: "พอเถิดหนุมาน ท่านทำเพื่อหม่อมฉันมาตลอด หม่อมฉันขอบใจเจ้าค่ะ แต่ผู้ที่ยืนอยู่ตรงหน้าท่านไม่ใช่ศัตรูของหม่อมฉัน โปรดหยุดมือเถิด"\n'
      + 'หนุมาน: "ข้าน้อมรับคำของพระนาง ข้าผิดเองที่ใจร้อน"'),
    page(SITA.art.yield, 'ขออภัย',
      'บรรยาย: หนุมานลดมือลง ถอยหนึ่งก้าว แล้วก้มศีรษะต่ำ ประนมมือขอโทษยมบาทน้อยและทุกคนในห้องพิพากษา\n'
      + 'หนุมาน: "ขออภัยท่านยมบาทน้อย ข้ายกมือใส่ผู้ที่ปกป้องพระนาง ข้าไม่ควรเลย ข้าขอโทษ"'),
  ]},
  // R2 A 3.3 (G14): Sita gives the lamp. Page 1 may be cut by the owner if it repeats the thanks of `sita-return` (Rae 3.1). Picture = Codex slot (cut-hanuman-yields-th stands in).
  'sita-lamp':{ title:'ประทีปของพระนาง', pages:[
    page(SITA.art.lamp, 'สิ่งเดียวที่หม่อมฉันมี',
      'บรรยาย: แสงสุดท้ายของเหตุการณ์ในห้องพิพากษาจางลง นางสีดาเดินมาหยุดตรงหน้าแท่น ในมือถือตะเกียงทองดวงเล็กที่ฐานเป็นกลีบบัว ไส้ตะเกียงยังไม่มีเปลว\n'
      + 'นางสีดา: "ท่านยมบาทน้อย หม่อมฉันไม่ได้นำสิ่งใดมาด้วยนอกจากประทีปดวงนี้ ท่านไม่ตัดสินจากบัญชีเพียงอย่างเดียว และยอมให้หม่อมฉันรอจนเห็นความจริง หม่อมฉันไม่มีสิ่งใดตอบแทนได้เท่าไร ขอท่านรับสิ่งนี้ไว้เจ้าค่ะ"'),
    page(SITA.art.lamp, 'ไฟของผู้ที่ยอมรับ',
      'นางสีดา: "ประทีปดวงนี้หม่อมฉันจุดทุกค่ำตลอดวันที่หม่อมฉันรอคอย ไฟของมันไม่จุดด้วยไม้ขีดหรือน้ำมัน มันจุดติดเมื่อมีผู้ที่ยอมรับผู้ถือ ฝากไฟของเขาไว้ ท่านหนุมานเป็นผู้แรกที่ยอมรับท่านต่อหน้าหม่อมฉัน"\n'
      + 'หนุมาน: "พระนาง ข้ายินดี"\n'
      + 'บรรยาย: หนุมานคุกเข่าลงข้างหนึ่ง ประนมมือเหนือไส้ตะเกียง เปลวสีทองไหลจากระหว่างฝ่ามือลงมาจุดไส้ตะเกียงที่ว่างอยู่ เปลวสั่นครั้งเดียวแล้วนิ่ง'),
    page(SITA.art.lamp, 'เรียกข้าเมื่อต้องการ',
      'หนุมาน: "ท่านยมบาทน้อย ข้ายกมือใส่ท่านเมื่อครู่ ข้าไม่ลืม แต่ท่านไม่ถือโทษ เมื่อใดที่ท่านจุดตะเกียงนี้แล้วเรียกชื่อข้า ข้าจะมาช่วยท่านปกป้องผู้ที่ท่านต้องปกป้อง แต่ไฟของข้ามีจำกัด จงใช้ให้คุ้ม"\n'
      + 'นางสีดา: "ไฟของใครที่ฝากไว้ จะดับเมื่อผู้ถือทิ้งสิ่งที่เขายอมรับ หม่อมฉันเชื่อว่าท่านไม่ทิ้งเจ้าค่ะ"\n'
      + 'ยมบาทน้อย: "ผมรับไว้ด้วยความเคารพครับ และจะใช้อย่างระวัง"\n'
      + 'บรรยาย: ยามารับตะเกียงจากสองมือของนางสีดา ไส้ตะเกียงอุ่นขึ้นเล็กน้อยในมือเขา เหมือนมีใครหายใจอยู่ข้างใน'),
  ]},
  // R2 A 2.5: Kan explains the lamp the first time Yama comes to the Mirror Tower after receiving it (ui.js openStation). Nira's last line may be cut without touching the plot.
  'z1-kan-lamp':{ title:'แสงที่เติมได้', pages:[
    page('img/crew-kan-profile.webp', 'แสงจากกระจก',
      'บรรยาย: กานต์มองตะเกียงในมือยามาอยู่ครู่หนึ่ง ก่อนยื่นมือไปหมุนกระจกบานเล็กบนแท่นให้รับแสงเข้าหาเปลวไฟ\n'
      + 'กานต์: "ผมไม่ค่อยพูดครับ แต่เรื่องนี้ต้องพูด ตะเกียงนั้นจุดด้วยไฟของคนที่ยอมรับท่าน ไฟแบบนั้นมีจำกัด ใช้ท่าไม้ตายไปสามครั้งมันก็ริบ"\n'
      + 'กานต์: "หอกระจกรับแสงมาเติมให้ได้ครับ ไม่ใช่แค่กระจกวิเศษ ตะเกียงก็เติมได้ นาฬิกาก็เติมได้ถ้าท่านมี ถ้าไฟริบเมื่อไหร่ กลับมาที่นี่"\n'
      + 'นิรา: "ดิฉันจดไว้แล้วค่ะ ท่านคะ ไฟดับกลางศึกไม่ใช่ความผิดของใคร แต่ตะเกียงที่ไม่ได้เติมเป็นความผิดของคนถือ"'),
  ]},
  // R2 A 1.2 (G10): the green giant tells his name - once, right after he joins (case 9). Before this scene he is still "ยักษ์ทวารบาล" / "ยักษ์เขียว" in the case 9 scenes.
  'z1-guard-name':{ title:'ชื่อของผู้เฝ้าด่าน', pages:[
    page('img/z1-events/cut-guard-joins-th.webp', 'ข้าชื่อกุมภัณฑ์',
      'บรรยาย: ยักษ์ร่างเขียวคล้ำผู้ยืนเฝ้าประตูชายแดนมาตลอดปี ยกมือเกาท้ายทอย มืออีกข้างยังกำกระบองไว้แน่น\n'
      + 'ยักษ์เขียว: "เอ่อ ... ท่านเรียกข้าว่ายักษ์ทวารบาลมาตั้งนาน ข้าไม่ได้ว่าอะไรนะ แต่ข้ามีชื่อ ข้าชื่อกุมภัณฑ์ (กระแอม) ตั้งแต่รุ่นพ่อข้าเฝ้าด่านนี้"\n'
      + 'นิรา: "บันทึกชื่อแล้วค่ะ กุมภัณฑ์ ผู้เฝ้าด่านสุวรรณภูมิ"\n'
      + 'กุมภัณฑ์: "ฮะ ฮะ ฟังแล้วเหมือนข้ามียศเลย"'),
  ]},
  'sita-hanuman-lose':{ title:'หนุมานรอท่านอยู่', pages:[
    page(SITA.art.yield, 'หนุมานรอท่านอยู่',
      'หนุมาน: "ข้าไม่ซ้ำเติมผู้ที่ล้มลงแล้ว ลุกขึ้นเถิด ข้ารอได้"\n'
      + 'บรรยาย: หนุมานหยุดกำปั้นไว้กลางอากาศ ยกมือขึ้นเป็นสัญญาณว่าให้ตั้งหลัก'),
  ]},
  'sita-phantom':{ title:'รอยหมึกจากข้างนอก', pages:[
    page(SITA.art.phantom, 'แฟ้มเล่มนี้ไม่ถูกต้อง',
      'บรรยาย: ศึกสงบ ฝุ่นในห้องพิพากษายังไม่ทันตก นิราก้าวออกมากางแฟ้มต้นฉบับบนแท่น แล้วไล่นิ้วตามเลขกำกับทีละบรรทัด\n'
      + 'นิรา: "ท่านคะ ขออภัยที่ขัดจังหวะ แฟ้มเล่มนี้ไม่ถูกต้องค่ะ ช่องอายุขัยของพระนางระบุว่ายังไม่ถึงกำหนด ตามระเบียบ วิญญาณที่ยังไม่ถึงกำหนดไม่ต้องลงมาถึงสถานพิพากษาเลยค่ะ"'),
    page(SITA.art.phantom, 'ถูกแก้จากข้างนอก',
      'นิรา: "ช่อง ผู้กระทำ กับ ผู้ถูกกระทำ ถูกสลับกันด้วยหมึกที่ใหม่กว่าส่วนอื่นของแฟ้ม ไม่มีเลขรับรองจากฝ่ายคัดกรรมสักบรรทัด ดิฉันไล่รอยแก้ย้อนกลับไปทุกโต๊ะในสำนักแล้วค่ะ ไม่มีโต๊ะไหนเป็นผู้แก้ คนที่แก้ไม่ได้อยู่ในนี้ค่ะ เขาแก้จากข้างนอก"\n'
      + 'ยมบาทน้อย: "ใครจะแก้บัญชีของยมโลกจากข้างนอกได้ครับ"'),
    page(SITA.art.phantom, '[PHANTOM-404]',
      'นิรา: "ท้ายบรรทัดที่แก้ มีรหัสผู้แก้ติดอยู่ค่ะ [PHANTOM-404] ดิฉันค้นทะเบียนทุกสาขาแล้ว ไม่มีรหัสนี้ ในรหัสของสำนักคัดกรรม เลขท้ายสี่ศูนย์สี่ หมายถึง ไม่พบต้นทาง ค่ะ"\n'
      + 'นิรา: "คนที่เลือกแก้ชื่อพระนาง ไม่ได้เลือกเพราะบังเอิญนะคะ เขาเลือกชื่อที่รู้อยู่แล้วว่าต้องมีคนตามลงมาทวงถามแน่ ๆ ดิฉันขอเก็บแฟ้มเล่มนี้เป็นหลักฐาน และขอตรวจแฟ้มเก่าย้อนหลังต่อ เล่มนี้อาจไม่ใช่เล่มแรกค่ะ"'
      + (SITA_CAMEO ? '\nหนุมาน: "ผู้ใดเอาชื่อพระนางมาเป็นเหยื่อ ข้าจะตามไปคุยด้วยเอง ถ้าท่านต้องการกำลัง ส่งข่าวมาได้"' : '')),
  ]},
  ...Object.fromEntries(SITA_CHOICE_KEYS.map(k => [`sita-return-${k}`, returnStory(k)])),
};

// ---------------------------------------------------------------------------------------------------------------------
// Case 9 · cutscene slots around the border boss (pictures are Codex slots; text is functional, Rae may replace it).
// The owner's own words are used for the captions so nothing is invented here.
export const BREACH_ART = Object.freeze({
  // The owner's spec names "frontier-th-intro-v19". No v19 file exists on this machine (searched 13 Nov 2026) - v1 is the picture in the repo and is what plays
  // (narrative-cutscenes.js frontierIntroduction). When v19 arrives: save it over frontier-th-intro-v1.webp, or change the name there.
  intro:'img/frontier-th-intro-v1.webp',
  guardJoins:'img/z1-events/cut-guard-joins-th.webp',
  toDais:'img/z1-events/cut-frontier-boss-to-dais-th.webp',
  punished:'img/z1-events/cut-frontier-boss-punished-th.webp',
  released:'img/z1-events/cut-frontier-boss-released-th.webp',
  caveInterior:{ th:'img/z1-events/bg-cave-th.webp', asia:'img/z1-events/bg-cave-asia.webp', west:'img/z1-events/bg-cave-west.webp' },
  flameCharge:['img/z1-events/skill-yama-fire-charge-cut-01.webp','img/z1-events/skill-yama-fire-charge-cut-02.webp'],
});
export const BREACH_STORIES = {
  'frontier-th-guard-joins':{ title:'ยักษ์ทวารบาลออกมาช่วย', pages:[
    page(BREACH_ART.guardJoins, 'ยักษ์ทวารบาลออกมาช่วย', 'ข้าชื่อ "กุมภัณฑ์" เดี๋ยวข้าช่วยจัดการเจ้าพวกนี้เอง') ]},
  'frontier-th-boss-to-dais':{ title:'พาไปแท่นตัดสิน', pages:[
    page(BREACH_ART.toDais, 'พาไปแท่นตัดสิน', 'พาบอสชายแดนไปที่แท่นตัดสิน') ]},
  'frontier-th-boss-punished':{ title:'ลงโทษเรียบร้อย', pages:[
    page(BREACH_ART.punished, 'ลงโทษเรียบร้อย', 'พาบอสชายแดนไปลงโทษเรียบร้อย') ]},
  'frontier-th-boss-released':{ title:'ปล่อยกลับชายแดน', pages:[
    page(BREACH_ART.released, 'ปล่อยกลับชายแดน', 'ปล่อยบอสชายแดนกลับไปที่ชายแดน · เขาไปยืนอยู่ในถ้ำ') ]},
};
/** Mid-fight window (case 9): Yama learns the team move while the border boss is nearly down, and closes the fight with it. Name/text come from ABILITY_REWARDS. */
export const TEAM_MOVE_UNLOCK = 'th-team-judgment-unlock';
/** Every cutscene of the event work packages (Zone 1 here, Zone 2 from z2-events.js): story.js storyOf() reads this one table. */
export const Z1_STORIES = { ...SITA_STORIES, ...BREACH_STORIES, ...WANTHONG_STORIES, ...YOMATHAT_STORIES, ...GATE_ALL_STORIES, ...BOATMAN_STORIES, ...Z2_STORIES, ...Z3_ARRIVE_STORIES, ...Z3_FRONTIER_STORIES, ...Z4T_STORIES, ...Z4S_STORIES, ...Z4L_STORIES, ...Z3_CASE_STORIES, ...EIRLIN_STORIES, ...SEV_STORIES, ...Z4A_STORIES, ...Z4G_STORIES, ...Z4H_STORIES };

/** Where the elder brother walks on the town map when case 15 opens: in through the lower border gate, up to the pier. */
export const bossWalkEnds = (frontier, spots = SPOTS) => ({ from:[frontier.x, frontier.y], to:[spots.bossPier.x, spots.bossPier.y] });
