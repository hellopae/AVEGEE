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

export const TH_STORY_CASES = Object.freeze([
  Object.freeze({ k:'nurse', after:4, needsGate:true }),
  Object.freeze({ k:'devaMonk', after:5, needsGate:true, needsCase:'nurse' }),
  Object.freeze({ k:'sitaledger', after:11, needsEvent:'frontierBreach' }),
]);
export const TH_STORY_CASE_KEYS = Object.freeze(TH_STORY_CASES.map(c => c.k));
/** Zone 2 (Z2-EVENTS): the old ape (7th case) and Satori's father (13th case) - ordinary cases, heard in the ordinary court (z2-events.js). */
export const STORY_CASE_ROWS = Object.freeze({ th:TH_STORY_CASES, asia:Z2_STORY_CASES });
export const storyCaseRows = zone => STORY_CASE_ROWS[zone] || [];
export const storyCaseRow = (zone, k) => storyCaseRows(zone).find(c => c.k === k) || null;
export const isStoryCaseKey = (zone, k) => storyCaseRows(zone).some(c => c.k === k);
/** The Zone 1 event that follows a story case (opens only once that case is judged). */
export const EVENT_AFTER_CASE = Object.freeze({ devaTest:'devaMonk', sitaHanuman:'sitaledger', asiaWukong:'apeelder' });

/** Has this story case been judged (or is the story already past it)? */
export function storyCaseDone(g, k, zone = g.zone) {
  if (g.storyCaseDone?.[k]) return true;
  const ev = g.zoneEvents?.[zone] || {};
  // Later beats prove earlier ones: an old save must not get a beat again once the story moved on.
  if (zone === 'asia') {
    if (k === 'apeelder') return ev.asiaWukong === 'cleared' || !!g.bossCleared?.asia;
    if (k === 'satorifather') return !!g.bossCleared?.asia;
    return false;
  }
  if (k === 'devaMonk') return !!g.devaVisits?.th || !!ev.devaTest;
  if (k === 'nurse') return !!g.devaVisits?.th || !!ev.devaTest;
  if (k === 'sitaledger') return !!ev.sitaHanuman || !!g.bossCleared?.th;
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
  zone !== 'th' || g.zoneEvents?.th?.frontierBreach === 'cleared' || !!g.bossCleared?.th;

/** HP share of the border boss at which the story closes the fight with the new team move (owner: "ใช้เป็นท่าสุดท้ายเพื่อจบฉากต่อสู้บอสชายแดน"). */
export const BREACH_FINALE_AT = 0.3;

// ---------------------------------------------------------------------------------------------------------------------
// Case 12 · Sita / Hanuman / [PHANTOM-404]
// Text: Rae, Output/Rae/2026-11-13-avegee-sita-hanuman.md (13 Nov 2026). NOT yet through chris-culture.
// Claudy's temporary cultural defaults (owner may change them):
//   · charge = Rae's safer alternative "ผิดวาระ ค้างโทษจากภพก่อน เก้าวาระ" (not "ต้นเหตุศึกกรุงลงกา")
//   · choice C (stamp the ledger) is cut: only A / B, and no path ever sentences or escorts her
//   · Hanuman does not speak during the fight, buttons say "ทดสอบ" (test), never "สู้" (fight)
//   · the closing Hanuman cameo line is cut (SITA_CAMEO) so the story makes no promise yet
// Rae's question 2 and the wording "ผู้ลักพา" in question 3 belong to the Lanka charge. Question 2 is left out here and question 3 is kept as written:
// Rae owes one small pass on these two strings (her own note, section 8.1). Every string of the beat lives in this object.
export const SITA_CAMEO = false;
export const SITA = Object.freeze({
  caseKey:'sitaledger', eventKey:'sitaHanuman',
  caseTitle:'คดีที่ 12 · บัญชีที่ผิดที่',
  art:Object.freeze({
    sprite:'img/z1-events/soul-sita-th.webp',            // map / court standee
    portrait:'img/z1-events/soul-sita-th-profile.webp',  // hearing card
    hanumanSprite:'img/z1-events/boss-hanuman-th.webp',
    hanumanPortrait:'img/z1-events/boss-hanuman-th-profile.webp',
    descend:'img/z1-events/cut-hanuman-descends-th.webp',
    yield:'img/z1-events/cut-hanuman-descends-th.webp'      /* no own picture yet: spec cut-hanuman-yields-th */,
    phantom:'img/z1-events/cut-sita-phantom-ledger-th.webp'   /* PLACEHOLDER until Codex draws it */,
    return:'img/z1-events/cut-hanuman-descends-th.webp'     /* no own picture yet: spec cut-sita-return-th */,
  }),
  notices:Object.freeze({
    arrive:{ title:'วิญญาณนามสูงมาถึงแล้ว', text:'วิญญาณนางสีดามาถึงคิวพิจารณา ตามบัญชีระบุว่าต้องรับโทษ แต่รายละเอียดในแฟ้มมีข้อน่าสงสัย โปรดไต่สวนอย่างรอบคอบ', button:'เริ่มไต่สวน' },
    hanuman:{ title:'หนุมานลงมาแล้ว', text:'ทหารเอกของพระรามลงมารับพระนางกลับ เขาไม่ใช่ศัตรู แต่ต้องการเห็นว่าท่านปกป้องพระนางได้จริง', button:'รับมือ' },
    win:{ title:'หนุมานยอมรับ', text:'ท่านผ่านการทดสอบของหนุมาน พระนางยังปลอดภัย', button:'ต่อ' },
    lose:{ title:'หนุมานรอท่านอยู่', text:'หนุมานหยุดมือไว้ก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้', button:'ทดสอบอีกครั้ง' },
    phantom:{ title:'พบรหัสผู้แก้ที่ไม่มีในทะเบียน', text:'นิราพบว่าแฟ้มของนางสีดาถูกแก้จากด้านนอก รหัสผู้แก้คือ [PHANTOM-404] เพิ่มบันทึกลงสมุดแล้ว', button:'ดูบันทึก' },
  }),
  journal:'PHANTOM-404: แฟ้มนางสีดาถูกแก้โดยผู้ไม่อยู่ในทะเบียนสาขาใด วิญญาณยังไม่ถึงกำหนดแต่ถูกเรียกลงมา นิราจะตรวจแฟ้มเก่าย้อนหลังต่อ',
  banner:'ศึกปกป้องพระนาง · ท่านหนุมาน',
  hearing:Object.freeze({
    title:'บัญชีที่ไม่ชอบมาพากล',
    name:'นางสีดา', who:'ชายาแห่งพระราม ผู้ถูกเรียกลงมาตามบัญชี',
    face:'ใครเห็นก็ก้มศีรษะให้โดยไม่ต้องบอก สงบ นิ่ง ไม่แสดงความหวั่นไหวแม้ถูกเรียกลงมายังที่นี่',
    opening:'"หม่อมฉันไม่ได้มาเพื่อให้ใครเชื่อเจ้าค่ะ หม่อมฉันมาเพื่อให้ท่านดูความจริงด้วยตัวเอง"',
    line:'"หม่อมฉันมาตามที่บัญชีเรียกเจ้าค่ะ ขอท่านโปรดอ่านให้จบก่อนตัดสิน"',
    charge:'ตามบัญชี ระบุว่า ผิดวาระ ค้างโทษจากภพก่อน เก้าวาระ',
    chargeTag:'ข้อมูลน่าสงสัย',
    merits:Object.freeze([
      'ยึดมั่นในสัจจะตลอดเวลาที่ถูกกักตัว ไม่ยอมอ่อนข้อต่อการบังคับ',
      'ยังเมตตาต่อผู้ที่เฝ้าคุมตน แม้ในวันที่ตนเองทุกข์ที่สุด',
      'ไม่เคยเอ่ยโทษผู้ใดว่าเป็นต้นเหตุของสิ่งที่ตนต้องเผชิญ',
    ]),
    // q = the judge's question, a = her answer, reveal = what Yama sees. `truth:true` is the one that opens the verdict.
    questions:Object.freeze([
      { q:'พระนางทราบไหมครับว่าบัญชีเขียนข้อหาอะไรไว้',
        a:'"หม่อมฉันทราบเพียงว่าถูกเรียก จึงมาตามที่เรียกเจ้าค่ะ ข้อหาที่ท่านอ่านให้ฟัง หม่อมฉันเพิ่งได้ยินเป็นครั้งแรก"' },
      { q:'ผมขอดูแฟ้มต้นฉบับพร้อมกันกับพระนาง ช่อง "ผู้กระทำ" กับ "ผู้ถูกกระทำ" ในหน้านี้ พระนางเห็นอะไรครับ', truth:true,
        a:'"ถ้าหม่อมฉันอ่านไม่ผิด ชื่อของหม่อมฉันอยู่ในช่องที่ควรเป็นชื่อของผู้ลักพาเจ้าค่ะ"',
        reveal:'ยมบาทน้อยส่องแฟ้มใกล้ ๆ หมึกตรงสองช่องนั้นเป็นสีเดียวกับตราประทับของสำนักคัดกรรม แต่ไม่มีเลขรับรองกำกับแม้แต่บรรทัดเดียว และสองช่องถูกสลับที่กัน' },
      { q:'พระนางต้องการสิ่งใดจากศาลนี้ครับ',
        a:'"หม่อมฉันไม่ขอให้ใครยกโทษเพราะหม่อมฉันเป็นใคร ขอเพียงให้ตัดสินจากความจริง หากความจริงว่าหม่อมฉันต้องรับ หม่อมฉันก็รับเจ้าค่ะ"' },
    ]),
    secret:'ส่องกระจกแล้ว ไม่พบเรื่องใดซ่อนอยู่ในใจพระนางเลย พบเพียงรอยหมึกบนช่อง "ผู้กระทำ" ที่ไม่ใช่ลายมือของสำนักคัดกรรม',
    choices:Object.freeze([
      { k:'suspend', label:'ระงับโทษไว้ก่อน เพราะบัญชีไม่ชอบมาพากล',
        lines:['ยมบาทน้อย: "ผมขอระงับโทษไว้ก่อนครับ บัญชีที่มีรอยแก้ไม่มีเลขรับรอง ผมไม่ตัดสินจากบัญชีที่ผมเชื่อไม่ได้"', 'นางสีดา: "ขอบพระคุณเจ้าค่ะ หม่อมฉันจะรอ"'] },
      { k:'pavilion', label:'ให้พระนางพักที่ศาลาระหว่างรอตรวจบัญชี',
        lines:['ยมบาทน้อย: "ขอเชิญพระนางพักที่ศาลาก่อนครับ ระหว่างที่นิราตรวจต้นฉบับ"', 'นางสีดา: "หม่อมฉันขอบพระคุณเจ้าค่ะ"'] },
    ]),
    reward:'ยมบาทน้อยมองพระนางเดินกลับขึ้นไปพร้อมหนุมาน แล้วนิราก็ปิดแฟ้มเล่มนั้นลงช้า ๆ ด้วยสองมือ',
  }),
});

/** The soul that stands in the queue for case 12. Not part of cases.js: it is never drawn by chance and never sentenced (see game.js resolveSitaCase). */
export const SITA_CASE = Object.freeze({ k:'sitaledger', story:true, zone:'th', sex:'f', sp:'soul-sita-th', kind:'innocent', calm:true,
  name:SITA.hearing.name, who:SITA.hearing.who, face:SITA.hearing.face, seen:[], hidden:[],
  merits:SITA.hearing.merits.map((t, i) => ({ t, v:i ? 1 : 2, fake:false })),
  line:SITA.hearing.line, claims:[], secret:SITA.hearing.secret, reward:SITA.hearing.reward, fail:null });

/** Notice windows of Zone 1's story (game.js queueNotice / ackNotice · ui.js openStoryNotice). `detail` = shown when the button is pressed. */
export const NOTICES = Object.freeze({
  // Case 5 — the owner's own sentence (spec 13 Nov 2026)
  'nurse-ledger':{ title:'คดีพยาบาลห้องฉุกเฉิน', text:'ลายมือในแฟ้มต้นทางที่สลับเลขเป็นของเพื่อนร่วมโต๊ะเดิมของนิรา', button:'รับทราบ', art:'img/soul-nurse.webp' },
  'sita-arrive':{ ...SITA.notices.arrive, art:SITA.art.portrait },
  'sita-phantom':{ ...SITA.notices.phantom, detail:SITA.journal, art:SITA.art.phantom },
  ...Z2_NOTICES,
});

const page = (image, title, line) => ({ image, title, line, fallback:'📜' });
/** Story pages of the beat. Pictures are Codex slots (16:9); until they exist the comic shows its normal "no picture" fallback. */
export const SITA_STORIES = {
  'sita-hanuman-open':{ title:'คำบัญชาจากพระราม', pages:[
    page(SITA.art.descend, 'คำบัญชาจากพระราม',
      'บรรยาย: หลังคาห้องพิพากษาสั่นสะเทือน แสงสีทองแหวกเมฆดำลงมากลางโถง วานรร่างขาวสง่าลงยืนขวางหน้านางสีดา มือหนึ่งถือจดหมายประทับตราพระราม\n'
      + 'หนุมาน: "ข้าชื่อหนุมาน ทหารเอกของพระราม ข้ามาตามพระบัญชา ให้รับพระนางกลับไปให้พ้นจากที่แห่งนี้ พระรามเจ้าทรงรู้สึกว่ามีสิ่งผิดปกติ"'),
    page(SITA.art.descend, 'ข้าเชื่อพระบัญชาก่อน',
      'ยมบาทน้อย: "ท่านหนุมาน ผมให้เกียรติท่านและพระนางเสมอครับ บัญชีฉบับนี้มีข้อน่าสงสัย ขอเวลาผมตรวจก่อนได้ไหมครับ"\n'
      + 'หนุมาน: "ข้าไม่ได้สงสัยท่าน แต่ข้าสาบานต่อพระรามไว้แล้วว่าจะไม่ปล่อยให้พระนางอยู่ในที่ที่ข้ายังไม่แน่ใจว่าปลอดภัย ท่านอยากให้ข้าเชื่อ ก็จงแสดงให้ข้าเห็นว่าท่านปกป้องพระนางได้จริง"\n'
      + 'บรรยาย: หนุมานยกมือตั้งท่า ไม่ใช่เพื่อทำลาย แต่เพื่อทดสอบผู้ที่จะยืนเคียงพระนางแทนเขา'),
  ]},
  'sita-hanuman-win':{ title:'หนุมานยอมรับ', pages:[
    page(SITA.art.yield, 'หนุมานยอมรับ',
      'หนุมาน: "พอแล้ว ข้าเห็นแล้วว่าท่านสู้เพื่อปกป้อง ไม่ได้สู้เพื่อให้ชนะ ข้านับถือ"\n'
      + 'บรรยาย: หนุมานลดมือ ถอยหนึ่งก้าว แล้วโค้งศีรษะให้ยมบาทน้อยอย่างสงบ\n'
      + 'นางสีดา: "พอเถิดหนุมาน ท่านไม่ต้องกังวลแทนหม่อมฉันขนาดนั้นเจ้าค่ะ"'),
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
  'sita-return':{ title:'ส่งพระนางกลับ', pages:[
    page(SITA.art.return, 'คืนบัญชี',
      'บรรยาย: นิราประทับตรายกเลิกข้อหา แล้วเขียนกำกับท้ายแฟ้มว่า "ผู้ถูกเรียกก่อนกำหนด คืนอายุขัยเต็ม" ประตูสวรรค์เปิดออกช้า ๆ\n'
      + 'นางสีดา: "ขอบพระคุณที่ท่านฟังหม่อมฉันก่อนอ่านบัญชีเจ้าค่ะ"'),
    page(SITA.art.return, 'ขอบคุณที่ไม่ตัดสินจากบัญชี',
      'ยมบาทน้อย: "ผมต่างหากที่ต้องขอบคุณครับ ที่พระนางใจเย็นพอให้ผมตรวจ"\n'
      + 'หนุมาน: "ข้าค้อมศีรษะให้ศาลแห่งนี้ ข้าขอพระนางกลับไปหาพระรามเจ้า เจ้านายของข้าคงรออยู่"\n'
      + 'บรรยาย: หนุมานประคองพระนางขึ้นไปตามแสงทอง ประตูสวรรค์ปิดลงเบา ๆ นิรายังยืนมองแฟ้มเล่มนั้นอยู่อีกครู่'),
  ]},
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
    page(BREACH_ART.guardJoins, 'ยักษ์ทวารบาลออกมาช่วย', 'ยักษ์เขียวที่ยืนเฝ้าประตูชายแดนออกมาช่วยเราสู้') ]},
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
export const Z1_STORIES = { ...SITA_STORIES, ...BREACH_STORIES, ...Z2_STORIES };

/** Where the elder brother walks on the town map when case 15 opens: in through the lower border gate, up to the pier. */
export const bossWalkEnds = (frontier, spots = SPOTS) => ({ from:[frontier.x, frontier.y], to:[spots.bossPier.x, spots.bossPier.y] });
