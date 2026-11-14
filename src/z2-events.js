// Z2-EVENTS (owner spec 14 Nov 2026 · Output/Claudy/briefs/2026-11-14-avegee-z234-events-owner-spec.md, Rae's script Output/Rae/2026-11-14-avegee-z2-events.md)
// One table for the order of Zone 2's story beats, so the order can be read (and tested) in one place:
//
//   case  3  prison fire             ZONE_EVENTS.asia asiaPrisonFire  atCases 3 (the deva Kuroha descends after ONE spirit fell and helps with the other two)
//            Kuroha waits, test      ZONE_EVENTS.asia asiaDevaTest    atCases 3 (reward windFan - the existing deva-asia)
//   case  7  old ape -> Wukong       story case 'apeelder' (the 7th case), then asiaWukong (atCases 7) -> PHANTOM-404 -> Wukong goes back
//   case 11  frontier breach         ZONE_EVENTS.asia asiaRageBreach  atCases 11 (3 waves + Akura, closing move "ลูกไฟใหญ่", dais with the answer locked, cave)
//   case 13  Satori's father         story case 'satorifather' (always happens, hired or not; Satori's clue button is off in this case)
//   case 15  Lian Gang               the existing zone-boss flow (boss-guide afterwards), now at 15 cases (data.js ZONE_BOSS_AT)
//   kin      relatives of crew       hired first: the Guard's trial fight + 5 relatives' cases (Z2_KIN)
//
// A "story case" is a named case that is put at the head of the queue when the count is reached (the same mechanism as Zone 1, z1-events.js).
// This module is data only: it imports nothing from the game, so z1-events.js / story.js / data.js can all read it without a cycle.
import { Z2_STORIES_RAW, WUKONG_CAMEO, CASE_APEELDER, CASE_AKURA, CASE_SATORIFATHER, CASE_DESERTER, CASE_CHAINCMD, CASE_FAKECUP, CASE_A2, CASE_GRANARYSISTER } from './z2-events-text.js';
export { WUKONG_CAMEO };

const A = name => `img/z2-events/${name}.webp`;
const DEVA_INTRO = 'img/deva-intro/deva-intro-asia-v1.webp';
const BREACH_INTRO = 'img/frontier-asia-intro-v1.webp';
const LIAN_INTRO = 'img/Asia/Intro-Boss-Zone2-asia.webp';

/** Where the art lives: every picture is its own file under a stable name - a real drawing saved over a placeholder needs no code change. */
export const Z2_ART = Object.freeze({
  wukongArrives:A('cut-wukong-arrives-asia'), wukongYields:A('cut-wukong-yields-asia'), apePhantom:A('cut-ape-phantom-ledger-asia'), wukongReturns:A('cut-wukong-returns-asia'),
  toDais:A('cut-frontier-boss-to-dais-asia'), punished:A('cut-frontier-boss-punished-asia'), released:A('cut-frontier-boss-released-asia'),
  satoriAsk:A('cut-satori-ask-asia'), satoriFarewell:A('cut-satori-farewell-asia'), guardTest:A('cut-guard-test-asia'),
  shacklePair:A('prop-shackle-pair-asia'), cupFlame:A('prop-cup-flame-asia'), emptyGranary:A('prop-empty-granary-asia'),
  breachIntro:BREACH_INTRO, devaIntro:DEVA_INTRO, lianIntro:LIAN_INTRO,
});
/** Own drawings of the story souls / the Wukong boss (soul-portraits.js · art.js read these keys). */
export const Z2_SOUL_SPRITE = Object.freeze({
  apeelder:'soul-ape-elder-asia', satorifather:'soul-satori-father-asia', deserter:'soul-deserter-asia', chaincmd:'soul-commander-asia',
  fakecup:'soul-cupdealer-asia', granarysister:'soul-granary-sister-asia',
});
export const Z2_ART_KEY = /^(soul-(ape-elder|satori-father|deserter|commander|cupdealer|granary-sister|bandit-chief)-asia|boss-wukong-asia)(-profile)?$/;

// ---------------------------------------------------------------------------------------------------------------------
// Story pages. Rae's text is copied verbatim (z2-events-text.js); here only the pictures are attached - one picture per page, the last one repeats.
const IMAGES = {
  'z2-kuroha-wait':[DEVA_INTRO], 'z2-kuroha-open':[DEVA_INTRO], 'z2-kuroha-win':[DEVA_INTRO], 'z2-kuroha-lose':[DEVA_INTRO],
  'z2-wukong-open':[Z2_ART.wukongArrives], 'z2-wukong-open-b':[Z2_ART.wukongArrives],
  'z2-wukong-win':[Z2_ART.wukongYields], 'z2-wukong-lose':[Z2_ART.wukongYields],
  'z2-ape-phantom':[Z2_ART.apePhantom], 'z2-wukong-return':[Z2_ART.wukongReturns],
  'z2-breach-intro':[BREACH_INTRO], 'z2-akura-open':[BREACH_INTRO], 'z2-akura-down':[BREACH_INTRO],
  'frontier-asia-boss-to-dais':[Z2_ART.toDais], 'frontier-asia-boss-punished':[Z2_ART.punished], 'frontier-asia-boss-released':[Z2_ART.released],
  'z2-satori-ask':[Z2_ART.satoriAsk], 'z2-satori-ask-b':[Z2_ART.satoriAsk], 'z2-satori-farewell':[Z2_ART.satoriFarewell], 'z2-satori-farewell-b':[Z2_ART.satoriFarewell],
  'z2-lian-open':[LIAN_INTRO], 'z2-lian-win':[LIAN_INTRO], 'z2-lian-lose':[LIAN_INTRO],
  'z2-guard-test-open':[Z2_ART.guardTest], 'z2-guard-test-win':[Z2_ART.guardTest], 'z2-guard-test-lose':[Z2_ART.guardTest],
};
const dress = (key, raw) => ({ title:raw.title, pages:raw.pages.map((p, i) => ({ image:IMAGES[key][Math.min(i, IMAGES[key].length - 1)], title:p.title, line:p.line, fallback:'📜' })) });

// Wukong's first scene has two second pages in Rae's file (version A: the old ape was sent to heaven · version B: he was punished). Two stories, one per version.
const WUKONG_PAGES = Z2_STORIES_RAW['z2-wukong-open'].pages;   // [p1, A, B, p3]
const wukongOpen = second => ({ title:Z2_STORIES_RAW['z2-wukong-open'].title, pages:[WUKONG_PAGES[0], second, WUKONG_PAGES[3]] });
// Satori: version A (hired) / B (not hired) differ in one narration line at the start of page 1, and B adds a line at the end of the farewell (Rae's comments, copied here).
const SATORI_B_OPEN = 'บรรยาย: ชายหนุ่มผู้ถือสมุดบันทึกเดินเข้ามาในโถงพิพากษา นิราเอ่ยเบา ๆ ว่า "ท่านคะ นี่คือซาโตริ ผู้อ่านสำนวนประจำบูรพา ดิฉันรู้จักเขามานานแล้วค่ะ"\n';
const SATORI_A_OPEN = 'บรรยาย: ซาโตริเดินมาหยุดหน้าโต๊ะของท่านโดยไม่เหลือบมองแฟ้มบนแท่นเลยแม้แต่ครั้งเดียว\n';
const SATORI_B_END = '\nซาโตริ: "ถ้าวันหน้าท่านต้องการคนอ่านสำนวน ข้ายังอยู่ที่บูรพาครับ"';
const satoriAskB = () => { const r = Z2_STORIES_RAW['z2-satori-ask'];
  return { title:r.title, pages:r.pages.map((p, i) => i ? p : { ...p, line:p.line.replace(SATORI_A_OPEN, SATORI_B_OPEN) }) }; };
const satoriFarewellB = () => { const r = Z2_STORIES_RAW['z2-satori-farewell'];
  return { title:r.title, pages:r.pages.map((p, i, all) => i === all.length - 1 ? { ...p, line:p.line + SATORI_B_END } : p) }; };

export const Z2_STORIES = Object.freeze({
  ...Object.fromEntries(Object.entries(Z2_STORIES_RAW).filter(([k]) => IMAGES[k]).map(([k, raw]) => [k, dress(k, raw)])),
  'z2-wukong-open':dress('z2-wukong-open', wukongOpen(WUKONG_PAGES[1])),
  'z2-wukong-open-b':dress('z2-wukong-open-b', wukongOpen(WUKONG_PAGES[2])),
  'z2-satori-ask-b':dress('z2-satori-ask-b', satoriAskB()),
  'z2-satori-farewell-b':dress('z2-satori-farewell-b', satoriFarewellB()),
});
// The raw scenes that are NOT played, and why (kept honest in the report, not silently dropped):
//  · z2-kuroha-descends - the existing 'deva-asia' scene (picture + video of the deva coming down) IS this moment; the owner decided "same scene, no second one". It carries the new deva.asia.arrival text.
//  · z2-breach-intro / z2-akura-open / z2-akura-down are used (ui.js openFrontier + the boss fight windows).

// ---------------------------------------------------------------------------------------------------------------------
// Notice windows (Rae N3-1 ... N15-1) - game.js queueNotice / ackNotice · ui.js openStoryNotice. `detail` = shown when the button is pressed.
const BASE_NOTICES = {
  'z2-kuroha-wait':{ title:'เทวดาผู้ตรวจรอท่านอยู่', text:'คุโรฮะ ผู้ตรวจแห่งวายุ รออยู่ที่ลานหน้าศาลเพื่อทดสอบท่าน เตรียมทีมให้พร้อมแล้วเดินไปคุยกับเขา', button:'รับทราบ', art:DEVA_INTRO },
  'z2-ape-arrive':{ title:'วิญญาณจากเขาฮั้งกัวซัน', text:'วิญญาณลิงเฒ่าจากเขาฮั้งกัวซันมาถึงคิวพิจารณา ตามบัญชีระบุว่าต้องรับโทษ แต่รอยหมึกในแฟ้มดูไม่น่าไว้ใจ โปรดไต่สวนอย่างรอบคอบ', button:'เริ่มไต่สวน', art:A('soul-ape-elder-asia-profile') },
  'z2-ape-phantom':{ title:'พบรหัสผู้แก้ที่ไม่มีในทะเบียนอีกครั้ง', text:'นิราพบว่าแฟ้มฝูงลิงเขาฮั้งกัวซันถูกแก้ด้วยรหัสเดียวกับแฟ้มนางสีดา คือ [PHANTOM-404] เพิ่มบันทึกลงสมุดแล้ว', button:'ดูบันทึก',
    detail:'PHANTOM-404 (ครั้งที่ 2): ช่องวันตายในแฟ้มฝูงลิงเขาฮั้งกัวซันถูกแก้ด้วยมือเดียวกับแฟ้มนางสีดา วิญญาณยังไม่ถึงกำหนด นิราแก้บัญชีคืนแล้วและจะตรวจแฟ้มอื่นต่อ', art:Z2_ART.apePhantom },
  'z2-satori-arrive':{ title:'วิญญาณจากตระกูลของซาโตริ', text:'วิญญาณที่ถึงคิวคือบิดาของซาโตริ ขุนนางผู้ถูกกล่าวหาว่าโกงกินบ้านเมือง ซาโตริขอพบท่านก่อนเริ่มคดี', button:'ฟังซาโตริ', art:A('soul-satori-father-asia-profile') },
  // Rae N11-5 / N11-6: the window after Akura has fallen (leads to the dais) and the one after his sentence (he is back in the cave, can be talked to)
  'z2-akura-to-dais':{ title:'อากุระยอมเดินไปแท่น', text:'อากุระพ่ายแล้ว เขาไม่ขอให้ใครล่าม และเลือกเดินไปที่แท่นตัดสินด้วยตัวเอง', button:'ไปที่แท่น', art:'img/Asia/boss-frontier-asia.webp' },
  'z2-akura-cave':{ title:'อากุระกลับถ้ำ', text:'อากุระรับโทษเสร็จแล้วและกลับไปยืนอยู่ในถ้ำริมชายแดน แวะไปคุยกับเขาได้', button:'รับทราบ', art:'img/Asia/boss-frontier-asia.webp' },
  'z2-lian-arrive':{ title:'แม่ทัพแห่งบูรพามาถึงแล้ว', text:'เหลียนกัง แม่ทัพตรวนบูรพา เดินเข้าประตูชายแดนด้านล่างมุ่งหน้าสู่ท่าเรือ ไปคุยกับเขาที่ท่าเรือ', button:'ไปที่ท่าเรือ', art:'img/Asia/Boss Zone2-asia-profile.webp' },
};
/** Texts of the zone 2 events that live inside the generic event windows (data.js ZONE_EVENTS.asia reads these). */
export const Z2_TEXT = Object.freeze({
  prisonFire:{ title:{ th:'วิญญาณแหกคุก', en:'Prison break' },
    alert:{ th:'วิญญาณสามดวงหลุดจากตะรางรอวาระและจุดไฟเผาอาคารบนแผนที่ ไฟยังลามอยู่ รีบไปปราบ', en:'Three spirits slipped out of the waiting cells and set a building on fire. The fire is still spreading - go and put them down.' },
    go:{ th:'ไปปราบ', en:'Go' }, banner:{ th:'วิญญาณแหกคุก · เผาอาคาร', en:'Prison break · the fire' } },
  devaTest:{ title:{ th:'เทวดาทดสอบแห่งบูรพา', en:'The deva of the East tests you' },
    alert:{ th:'คุโรฮะ ผู้ตรวจแห่งวายุ ขอทดสอบท่านกลางสายลม เขาไม่ใช่ศัตรู แต่ต้องการเห็นว่าท่านตั้งสติได้', en:'Kuroha, the inspector of the wind, asks to test you in the gale. He is no enemy; he wants to see that you keep your head.' },
    go:{ th:'รับการทดสอบ', en:'Take the test' }, retry:{ th:'ทดสอบอีกครั้ง', en:'Test again' }, banner:{ th:'ศึกทดสอบแห่งวายุ · คุโรฮะ', en:'Wind test · Kuroha' },
    win:{ title:'ผ่านการทดสอบของคุโรฮะ', text:'ท่านผ่านการทดสอบของคุโรฮะ ลมสงบลงแล้ว' }, lose:{ title:'ลมสงบชั่วคราว', text:'คุโรฮะเก็บพัดไว้ก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้' } },
  wukong:{ title:{ th:'หงอคงบุกลงมาแล้ว', en:'Wukong has come down' },
    alert:{ th:'เจ้าแห่งเขาฮั้งกัวซันลงมาทวงบัญชีของฝูงลิง เขาไม่ใช่ศัตรูของยมโลก แต่โกรธแทนพวกพ้อง และจะไม่ฟังจนกว่าจะเห็นฝีมือท่าน', en:'The lord of the Mountain of Flowers and Fruit has come for his troop\'s ledger. He is no enemy of the underworld, only angry for his own - and he will not listen until he sees your skill.' },
    go:{ th:'รับมือ', en:'Face him' }, retry:{ th:'สู้อีกครั้ง', en:'Fight again' }, banner:{ th:'ศึกรักษาบัญชี · หงอคง', en:'Keeping the ledger · Wukong' },
    lines:{ start:'หงอคง: "ลงมือเลย ข้าไม่อยากให้เจ้าบอกทีหลังว่าข้ายังไม่ได้ใช้แรง"', half:'หงอคง: "มือเจ้าไม่เบา! ข้ายังไม่เคยเจอผู้ถือบัญชีที่ยืนได้นานเท่านี้"' },
    win:{ title:'หงอคงหยุดมือ', text:'หงอคงวางไม้เท้าลงแล้ว เขายอมฟังนิราอ่านบัญชีของฝูงลิงต่อหน้า' }, lose:{ title:'หงอคงรอท่านอยู่', text:'หงอคงหยุดไม้เท้าไว้ก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้' } },
  breach:{ title:{ th:'ปีศาจบุกชายแดนบูรพา', en:'Demons at the Eastern frontier' },
    alert:{ th:'ปีศาจกำลังฝ่าชายแดนบูรพา ให้เดินลงไปตรวจที่ชายแดนด้านล่าง', en:'Demons are breaking through the Eastern frontier. Walk down to the lower border and look.' },
    banner:{ th:'ศึกชายแดนบูรพา · อากุระ', en:'Eastern frontier · Akura' },
    afterWave1:'นิรา: "ระลอกที่หนึ่งผ่านแล้วค่ะ เหลืออีกสองระลอก ท่านคะ ปีศาจพวกนี้ถูกต้อนมาข้างหน้าอย่างมีทิศทาง ไม่ได้ตั้งแถวเอง"',
    afterWave2:'นิรา: "อีกระลอกเดียวค่ะ เสียงกลองหยุดแล้ว ผู้นำอยู่ใกล้"',
    lines:{ start:'อากุระ: "ข้าไม่ออมแรง เพราะข้าไม่อยากให้ใครออมแรงให้ข้า"', half:'อากุระ: "ดี! ข้าฟาดไปสามทีแล้ว เจ้ายังไม่ปล่อยมือ เจ้าไม่ใช่ผู้ล่ามแน่ แต่ข้ายังไม่เชื่อ"' } },
  lian:{ lines:{ start:'เหลียนกัง: "ข้าไม่ได้จะล่ามเจ้า ข้าจะดูว่าเจ้าหลุดจากตรวนข้าได้หรือไม่"', half:'เหลียนกัง: "ท่านยังยืน! ข้ายังเหลือหนึ่งท่าไว้ใช้ตอนที่ใครคิดว่าชนะแล้ว"' },
    retry:{ th:'สู้อีกครั้ง', en:'Fight again' }, lose:{ title:'เหลียนกังรอท่านอยู่', text:'เหลียนกังม้วนตรวนเก็บไว้ก่อน ท่านตั้งหลักแล้วสู้อีกครั้งได้' } },
  guard:{ title:{ th:'ยักษ์ทวารบาลขอทดสอบ', en:'The gate guardian asks to test you' },
    alert:{ th:'ก่อนรับท่านเป็นนาย ยักษ์ทวารบาลแห่งบูรพาขอทดสอบว่าท่านเหมาะกับตำแหน่งนี้หรือไม่ เขาไม่ใช่ศัตรู แต่จะไม่ออมแรง', en:'Before he takes you as his master, the gate guardian of the East wants to see whether you suit the post. He is no enemy, but he will not hold back.' },
    go:{ th:'รับมือ', en:'Face him' }, retry:{ th:'ทดสอบอีกครั้ง', en:'Test again' }, banner:{ th:'ศึกพิสูจน์นาย · ยักษ์ทวารบาล', en:'Proving the master · gate guardian' },
    win:{ title:'ยักษ์ทวารบาลยอมรับ', text:'ท่านผ่านการทดสอบ ยักษ์ทวารบาลพร้อมเข้าร่วมทีม' }, lose:{ title:'ยักษ์ทวารบาลรอท่านอยู่', text:'ยักษ์ทวารบาลหยุดมือไว้ก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้' } },
  satori:{ blocked:'ซาโตริ: "ข้าขอไม่ร่วมในคดีนี้ครับ ข้ารับปากท่านไว้แล้วว่าจะไม่ป้อนคำตอบ"' },
});
/** Journal line for the second PHANTOM-404 sighting (Rae N7-7). */
export const Z2_JOURNAL = Object.freeze({ phantom2:BASE_NOTICES['z2-ape-phantom'].detail });

/** New deva.asia.arrival (Rae 1.10) - the owner's order: the deva comes down after ONE spirit has fallen. i18n.js reads these two. */
export const DEVA_ASIA_ARRIVAL = Object.freeze({
  th:'ท่านปราบไปหนึ่งตนแล้ว อีกสองตนข้าช่วยรับเอง เมื่อไฟสงบ หากท่านพร้อม โปรดมาพบข้าเพื่อทดสอบฝีมือ',
  en:'You have subdued one spirit. I shall help with the other two. Once the fire has settled, come and find me when you are ready for a test of skill.',
});

// ---------------------------------------------------------------------------------------------------------------------
// Story cases of Zone 2: normal cases (heard and judged in the ordinary court), put at the head of the queue at their number.
// `after` = cases already judged in Zone 2 when it becomes due (after:6 -> it is the 7th case).
const caseDef = (def, extra = {}) => { const { quest, ...rest } = def; return { ...rest, story:true, z2:true, zone:'asia', ...extra }; };
export const APE_CASE = caseDef(CASE_APEELDER);
export const SATORI_CASE = caseDef(CASE_SATORIFATHER, { noKanSupport:true });
export const Z2_STORY_CASES = Object.freeze([
  Object.freeze({ k:'apeelder', after:6, needsEvent:'asiaDevaTest', def:APE_CASE, notice:'z2-ape-arrive' }),
  Object.freeze({ k:'satorifather', after:12, needsEvent:'asiaRageBreach', def:SATORI_CASE, notice:'z2-satori-arrive' }),
]);

// ---------------------------------------------------------------------------------------------------------------------
// Relatives of the crew (hired first). The Guard also has to be beaten once before he joins (Z2_TEXT.guard).
// `before` = said when the soul arrives (the window after the notice) · `during` = said in the interrogation log at the first question
// `after` = said after the verdict, with the choice · each choice has its own lines.
export const Z2_KIN = Object.freeze([
  { k:'deserter', crew:'guard', def:caseDef(CASE_DESERTER), image:Z2_ART.guardTest,
    notice:{ title:'ทหารเก่าของยักษ์ทวารบาล', text:'วิญญาณดวงหนึ่งในคิวคืออดีตทหารร่วมกองของยักษ์ทวารบาล เขาหนีทัพในคืนสุดท้ายของศึก ยักษ์ทวารบาลจำเขาได้และขอพบท่านก่อนเริ่มคดี', button:'ฟังยักษ์ทวารบาล' },
    before:[
      'ยักษ์ทวารบาล: "ท่านอย่าเพิ่งหัวเราะนะ ข้าแค่หน้านิ่ง แต่มือข้าสั่น (กระแอม) คนที่กำลังจะขึ้นแท่น เคยนอนข้างข้าในค่ายสามปี เขาคือคนที่ข้าไว้ใจให้ถือกุญแจประตูหลังค่าย"',
      'ยักษ์ทวารบาล: "ข้าไม่ขอให้ท่านเบา ไม่ขอให้ท่านหนัก ข้าโกรธเขามายี่สิบปี ข้าไม่ไว้ใจความโกรธของข้าเองแล้ว ท่านตัดสินเอง ส่วนข้าขอยืนข้างแท่นเงียบ ๆ ได้ไหม"'],
    during:[
      'ยักษ์ทวารบาล: "เสบียงเช้าวันนั้นหายไปจริง ข้ากับเพื่อนอีกสามคนกินน้ำเปล่ากับรากไม้เฝ้าประตูหน้า ข้าไม่ได้บอกเพื่อให้ท่านหนักมือนะ ข้าบอกเพราะข้าไม่อยากโกหกตัวเอง"',
      'ยักษ์ทวารบาล: "เรื่องลูกสาวเขา ข้าไม่เคยถาม เพราะข้ากลัวคำตอบ ถ้าเขาบอกข้าคืนนั้น ข้าอาจเปิดประตูหลังให้เขาเองก็ได้"'],
    after:['ยักษ์ทวารบาล: "ท่านตัดสินแล้ว ข้าขอยืนหน้าเขาสักครู่ได้ไหม ถ้าจะให้พูด ข้าขอพูดแค่ชื่อของเพื่อนสามคนที่ไม่ได้กลับมา"'],
    choices:[
      { label:'ให้ยักษ์เอ่ยชื่อเพื่อนสามคนให้เขาฟัง', lines:[
        'บรรยาย: ยักษ์ทวารบาลเอ่ยสามชื่อช้า ๆ ชายผู้หนีทัพหลับตา', 'ทหารเก่า: "ข้าจำได้ทุกชื่อ"',
        'ยักษ์ทวารบาล: "ข้ารู้ว่าเจ้าจำได้ ข้าไม่อภัยเจ้าวันนี้ แต่ข้าไม่ลืมที่เจ้าส่งเงินให้บ้านพวกเขา ข้าเห็นหมด"'] },
      { label:'ให้ยักษ์ยืนเงียบจนเขาผ่านประตูไป', lines:[
        'บรรยาย: ชายผู้หนีทัพก้มศีรษะต่ำที่สุดเท่าที่เคยก้ม', 'ยักษ์ทวารบาล: "ข้าไม่มีคำพูดให้เขาวันนี้ แต่ข้ายืนอยู่ตรงนี้ เขารู้ว่าข้ายังอยู่"'] }] },
  { k:'chaincmd', crew:'taan', def:caseDef(CASE_CHAINCMD), image:Z2_ART.shacklePair,
    notice:{ title:'ผู้สั่งล่ามอากุระมาถึงแท่น', text:'วิญญาณอดีตผู้บังคับการด่านบูรพามาถึงคิว เขาเคยสั่งล่ามนักรบอากุระ โกคุจำตรวนที่เขาถือติดตัวมาได้ และขอพบท่านก่อนเริ่มคดี', button:'ฟังโกคุ' },
    before:[
      'บรรยาย: โกคุเดินมาพร้อมตรวนเหล็กขาดคู่เดียวกับที่ผู้บังคับการถือ ปลายนิ้วลูบรอยค้อนที่ข้างห่วงด้านซ้าย',
      'โกคุ: "ท่าน ข้ารู้จักตรวนอันนี้ ข้าตีมันเอง ข้าจำรอยค้อนของข้าได้ รอยที่ข้างห่วงซ้ายนี่ ผู้ที่ถือมันมาถึงแท่นคือคนที่สั่งให้ข้าตีมัน"',
      'โกคุ: "ข้าตีตรวนตามหมายสามสิบปีไม่เคยถามชื่อ แต่คู่นี้ข้าถามตอนหลังว่าใส่ให้ใคร มันถูกใส่ที่ข้อมือนักรบชื่ออากุระสามปี ข้าเพิ่งรู้ว่าเขาถูกล่ามเพราะอะไรก็ตอนเห็นหน้าคนนี้"'],
    during:['โกคุ: "ท่านจะตัดสินข้าด้วยก็ได้ ข้ารับ แต่ขอให้ท่านเรียงลำดับให้ถูก คนสั่ง คนตี คนใส่ สามชั้น ไม่ใช่ก้อนเดียวกัน"'],
    after:['โกคุ: "ท่านตัดสินแล้ว ข้าขอถามข้อเดียว ตรวนคู่นี้ควรหลอมใหม่เป็นอะไร หรือควรเก็บไว้ให้คนเห็นว่ามันเคยล่ามคนที่ไม่ผิด"'],
    choices:[
      { label:'ให้โกคุหลอมตรวนคู่นั้นเป็นตะปูซ่อมประตูชายแดน', lines:[
        'โกคุ: "ตะปูซ่อมประตูที่อากุระเคยพัง ... ดีแล้ว ข้ารู้ว่าเขาไม่ชอบเสียงค้อนข้า แต่ข้าจะตีให้เบาที่สุดเท่าที่ข้าตีเป็น"'] },
      { label:'ให้โกคุเก็บตรวนไว้ที่หอทะเบียนเป็นหลักฐาน', lines:[
        'โกคุ: "ข้าจะเขียนป้ายแขวนไว้เอง \'ตรวนคู่นี้ล่ามคนที่ไม่ผิดสามปี\' ข้าเขียนหนังสือไม่เก่ง แต่ป้ายนี้ข้าจะเขียนเอง"'] }],
    // Rae's optional follow-up (7.3): Akura in the cave says two more lines once this case is closed
    followUp:['อากุระ: "ได้ยินว่าคนที่สั่งล่ามข้าถูกตัดสินแล้ว ข้าไม่ดีใจ ข้าไม่เสียใจ ข้าแค่รู้สึกข้อมือเบาขึ้นอีกนิด"', 'อากุระ: "บอกช่างตรวนคนนั้นว่า ข้าไม่เคยโกรธมือที่ตี ข้าโกรธมือที่สั่ง"'] },
  { k:'fakecup', crew:'plerng', def:caseDef(CASE_FAKECUP, { assist:{ by:'โฮมุระ', label:'ให้โฮมุระดูลายถ้วยและเฉลยเอง', reveals:0, karma:0, lines:[
      'โฮมุระ: "ขอผมดูใต้ก้นถ้วยหน่อยครับ ... ใช่ครับ ลายเปลวไฟสามเส้นที่ผมแกะตอนเตาร้าว เส้นที่สามผมแกะไม่จบเพราะหมดความอดทน ถ้วยใบนี้เป็นของผม เป็นของเสียที่ผมทิ้งเอง"',
      'โฮมุระ: "ถ้วยทุกใบในกล่องนี้มาจากกองเศษเตาผม เคลือบทับรอยร้าวแล้วขายเป็นของเก่า คนซื้อไม่ผิดครับ คนที่ปล่อยให้ของเสียรั่วออกไปก็มีส่วนผิดด้วย"'] } }), image:Z2_ART.cupFlame,
    notice:{ title:'พ่อค้าถ้วยโบราณปลอม', text:'วิญญาณพ่อค้าถ้วยโบราณถึงคิว ถ้วยที่เขาขายล้วนมาจากเตาร้าวของโฮมุระ โฮมุระขอพบท่านก่อนเริ่มคดี', button:'ฟังโฮมุระ' },
    before:[
      'โฮมุระ: "ท่านครับ ผมเห็นถ้วยในกล่องของเขาแล้ว ลายเปลวไฟเล็ก ๆ ใต้ก้นถ้วย ผมจำได้ เพราะเป็นลายที่ผมแกะตอนเตาร้าว ของเสียที่ผมตั้งใจทุบทิ้ง แต่ทุบไม่หมด"',
      'โฮมุระ: "ผมใจร้อนครับ ทุบไม่หมดก็ปล่อยให้เด็กเก็บขยะเอาไป ผมไม่เคยตามไปดูว่ามันไปไหน"'],
    during:['โฮมุระ: "ผมช่วยได้ครับ ถ้าท่านอยากรู้ว่าถ้วยพวกนี้ใช่ของผมไหม ผมดูลายแล้วเฉลยให้ได้ ไม่ต้องใช้พลังสะกดจิตของท่านเลย แต่ถ้าผมเฉลย ผมต้องยอมรับว่าผมเป็นต้นทางของของปลอมพวกนี้"'],
    after:['โฮมุระ: "ท่านครับ ผมอยากเขียนขอโทษผู้ซื้อถ้วยสักฉบับ แต่ผมเขียนไม่เคยจบ ท่านช่วยเลือกให้ผมที"'],
    choices:[
      { label:'ให้โฮมุระเขียนขอโทษบรรทัดเดียวถึงผู้ซื้อ', lines:[
        'โฮมุระ: "บรรทัดเดียวพอเหรอครับ ... ผมจะลองเขียนว่า \'ถ้วยนั้นเป็นของเสียของผม ขออภัยครับ\' แล้วส่งก่อนจะคิดซ้ำ"'] },
      { label:'ให้โฮมุระเผาถ้วยร้าวที่เหลือในเตาให้หมดต่อหน้าท่าน', lines:[
        'บรรยาย: โฮมุระโยนถ้วยร้าวที่เหลือเข้าเตาทีละใบ ไฟลุกสีส้มอ่อนก่อนกลายเป็นขาว', 'โฮมุระ: "ครั้งนี้ผมไม่ทุบไม่หมดแล้วครับ ... ไม่ใช่ล้อเล่นนะครับ"'] }] },
  { k:'A2', crew:'dam', existing:true, def:null, image:Z2_ART.cupFlame,
    notice:{ title:'จอมโจรแห่งตลาดเก่า', text:'จอมโจรแห่งตลาดเก่ามาถึงคิวพิจารณา ครอบครัวของคุโรเคยรอดหนาวด้วยข้าวที่แก๊งของเขาแบ่งให้ คุโรขอพบท่านก่อนเริ่มคดี', button:'ฟังคุโร' },
    before:[
      'คุโร: "ท่านครับ ผมไม่ได้หลับสนิทมาหลายคืน เพราะลุงที่กำลังจะขึ้นแท่นคนนี้ ผมไม่รู้ว่าควรเกลียดหรือขอบคุณ"',
      'คุโร: "ตอนผมเด็ก หน้าหนาวปีที่พ่อป่วย ข้าวสารหมดบ้าน มีคนวางถุงข้าวกับฟืนไว้หน้าประตูทุกเช้า ผมนึกว่าเทวดา เพิ่งรู้ว่าเป็นแก๊งโจร ของพวกนั้นมาจากคฤหาสน์ที่เขาปล้นมา"'],
    during:['คุโร: "ชาวบ้านเล่าว่าเขาแบ่งให้คนจนทั้งเมือง ผมอยู่ในกลุ่มที่ได้จริงครับ แต่ผมรู้ว่าไม่ได้ทั้งเมือง มีแค่บ้านของลูกน้องเขา ผมไม่ได้บอกเพราะอยากให้ท่านเบาหรอกครับ ผมบอกเพราะข้อมูลที่ถูกต้อง"'],
    after:['คุโร: "ท่านตัดสินแล้ว ผมขอถามข้อเดียวครับ ผมขอบคุณเขาได้ไหม ทั้งที่ข้าวที่ผมกินมาจากบ้านของคนที่ถูกปล้น"'],
    choices:[
      { label:'ให้คุโรขอบคุณเรื่องฤดูหนาวต่อหน้า โดยไม่พูดถึงเรื่องปล้น', lines:[
        'คุโร: "ขอบคุณที่ให้ข้าวผมกินครับ ... (เงียบ) ผมไม่ได้บอกว่ามันถูกนะครับ ผมแค่ไม่อยากเป็นคนเนรคุณ"',
        'จอมโจร: "เด็กน้อยที่ไม่ยอมหลับ ... ข้าจำเจ้าได้ เจ้าตัวเล็กที่ยืนหลบหลังประตู ข้าแค่วางข้าวแล้วไป"'] },
      { label:'ให้คุโรจุดธูปให้เจ้าของคฤหาสน์ที่ถูกปล้นก่อน แล้วค่อยขอบคุณ', lines:[
        'คุโร: "ผมจุดธูปให้เจ้าของบ้านที่ถูกปล้นก่อนครับ แล้วถึงขอบคุณ ผมอยากให้ทั้งสองอย่างมีที่ของมันเอง"',
        'จอมโจร: "ข้าเกิดมาไม่เคยมีใครแยกสองอย่างนี้ให้ข้าดู ... เจ้าทำถูกแล้ว"'] }] },
  { k:'granarysister', crew:'boon', def:caseDef(CASE_GRANARYSISTER), image:Z2_ART.emptyGranary,
    notice:{ title:'พี่สาวของเมกุมิ', text:'วิญญาณเจ้าของยุ้งข้าวหมู่บ้านถึงคิว เธอคือพี่สาวของเมกุมิ ผู้ให้ยืมข้าวทุกคนที่ขอโดยไม่เคยปฏิเสธ เมกุมิขอพบท่านก่อนเริ่มคดี', button:'ฟังเมกุมิ' },
    before:[
      'เมกุมิ: "ท่านครับ ผมขอพูดสั้น ๆ คนที่กำลังจะขึ้นแท่นคือพี่สาวของผม พี่เลี้ยงผมมาตั้งแต่เด็กโดยไม่เคยบ่นสักคำ"',
      'เมกุมิ: "ใคร ๆ ในสามภพเรียกผมว่าใจดีเกินไป ผมไม่เคยบอกใครเลยว่าผมเอาแบบมาจากใคร"',
      'เมกุมิ: "ผมขอท่านสองข้อครับ อย่านับความใจดีของพี่เป็นข้ออ้างลดโทษ และอย่านับความผิดของพี่เป็นข้ออ้างให้ผมเลิกใจดี สองเรื่องนี้ผมอยากให้ท่านแยกให้ชัด"'],
    during:[
      'เมกุมิ: "ผมเคยบอกพี่ครั้งเดียวครับ ว่าพี่ปฏิเสธได้ ไม่ใช่ความใจร้าย พี่พยักหน้ารับปากผมเลย แล้วคืนนั้นก็ยังเปิดยุ้งให้คนเดิม ผมไม่ได้บอกเพื่อให้ท่านหนักมือ ผมบอกเพราะมันเป็นความจริง"',
      'เมกุมิ: "พี่ไม่ได้อ่อนแอครับ พี่แค่ไม่รู้ว่าความใจดีมีที่สิ้นสุด ผมเองก็เพิ่งเรียนรู้เรื่องนี้ ... ช้ากว่าที่ควรมาก"'],
    after:['เมกุมิ: "ท่านตัดสินแล้ว ผมขอถามข้อเดียวครับ ก่อนพี่ไปผมควรพูดอะไรกับพี่ คำสอน หรือคำขอบคุณ"'],
    choices:[
      { label:'ให้เมกุมิบอกพี่ว่า "พี่ครับ ผมเรียนที่จะปฏิเสธจากเรื่องของพี่"', lines:[
        'เมกุมิ: "พี่ครับ ผมเรียนที่จะปฏิเสธจากเรื่องของพี่ ผมจะยังให้ข้าวต่อ แต่ผมจะถามตัวเองก่อนทุกครั้งว่า ให้เพราะเขาหิว หรือให้เพราะผมไม่กล้าพูดว่าไม่"',
        'พี่สาว: "เจ้าพูดคำว่าไม่ได้แล้วหรือ ... ข้าฝึกมาสี่สิบปียังไม่เคยพูดสำเร็จ เจ้าพูดได้ก็ดีแล้ว"'] },
      { label:'ให้เมกุมิเงียบ แล้วต้มข้าวต้มหนึ่งหม้อส่งพี่ไปที่ประตู', lines:[
        'บรรยาย: เมกุมิจุดเตาข้างประตู ต้มข้าวต้มใสหนึ่งหม้อโดยไม่พูดสักคำ แล้วยกถ้วยส่งให้พี่สาวด้วยสองมือ',
        'พี่สาว: "ข้าวต้มของเจ้ายังใสเหมือนที่ข้าเคยต้มให้เจ้ากินตอนเด็กเลย"', 'เมกุมิ: "ครับ ผมพูดไม่เก่งเท่าข้าวต้มหม้อนี้หรอกครับ"'] }] },
]);
/** TEMPORARY wording (Toby, 14 Nov - Rae has no line for this yet, see Output/Toby/2026-11-14-avegee-z2-fixup.md): said when the old bandit case A2 comes back as Kuro's relative
 *  after the same soul was already judged once. Rae to replace; the game reads only this constant. */
export const Z2_KIN_REPEAT_LINE = 'บรรยาย: วิญญาณดวงนี้เคยขึ้นแท่นของท่านมาแล้วครั้งหนึ่ง วันนี้เขากลับมาที่คิวอีกครั้งเพราะคุโรขอให้ท่านฟังเรื่องของเขาอีกด้าน';
/** Every hand-written case of this package that the court can hold (cases.js ALL_CASES / the Zone 2 pool; `story` keeps them out of the random draw). */
export const Z2_CASES = Object.freeze([APE_CASE, SATORI_CASE, ...Z2_KIN.filter(k => k.def).map(k => k.def)]);
export const Z2_KIN_BY_KEY = Object.freeze(Object.fromEntries(Z2_KIN.map(k => [k.k, k])));
/** The old A2 (existing case) with Rae's rewrite: the soul keeps the case key 'A2', only the wording changes (cases-asia.js uses this). */
export const A2_REWRITE = Object.freeze({ ...CASE_A2 });
/** The Akura trial: what Nira reads and what the verdict says (Rae 3.8). The arena shows these instead of the generic Zone 1 lines. */
export const AKURA_TRIAL = Object.freeze({
  name:CASE_AKURA.name, face:CASE_AKURA.face, who:CASE_AKURA.who,
  reading:'ความผิดของอากุระ คือฝ่าด่านและพังประตูไม้กับหอสัญญาณบูรพา ทำให้ผู้เฝ้าด่านบาดเจ็บหลายนาย แม้ไม่มีผู้ใดถึงชีวิต ความดีที่นำมาหักได้ คือไม่ล่ามผู้ที่ล้มลง ไม่แตะหมู่บ้านข้างด่าน และหามผู้บาดเจ็บส่งศาลาหมอทุกคนค่ะ',
  verdict:['ยมบาทน้อย: "ผมสั่งทัณฑ์ระดับปานกลางที่ลานตรากตรำครับ ให้แบกหินซ่อมประตูไม้ที่พังด้วยมือเขาเอง ไม่ใช้ตรวน"', 'อากุระ: "แบกหินซ่อมของที่ข้าพัง ข้ารับ นี่เป็นโทษที่ข้ามองหน้าตัวเองได้"'],
  line:CASE_AKURA.line,
  /** The locked answer (owner 14 Nov): the exercise yard (ลานตรากตรำ, station key `lan`), middle strength (3 of 5). */
  station:'lan', intensity:3,
});

/** The notice that introduces each relative: the window (N7K-x) and, behind its button, what the crew member says before the bench. */
const KIN_NOTICES = Object.fromEntries(Z2_KIN.map(r => [`kin-${r.k}`, { title:r.notice.title, text:r.notice.text, button:r.notice.button, detail:r.before.join('\n'),
  art:r.def ? A(`${Z2_SOUL_SPRITE[r.k]}-profile`) : 'img/Asia/spirit-worker-asia-v2.webp' }]));
/** Notice windows (Rae N3-4, N7-1, N7-6, N13-1, N15-1 and the relatives'): game.js queueNotice / ackNotice · ui.js openStoryNotice. */
export const Z2_NOTICES = Object.freeze({ ...BASE_NOTICES, ...KIN_NOTICES });

/** Rae's three-page opening of the zone boss (5.3) as the lines of the arrival scene (data.js ZONES.asia.bossArrive): one line per page, the speaker before the colon. */
export const LIAN_ARRIVE_LINES = Object.freeze(Z2_STORIES_RAW['z2-lian-open'].pages.flatMap(p => p.line.split('\n')).filter(Boolean));
