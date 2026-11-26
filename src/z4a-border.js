// T8a (Rae R2 part D, sections 1-2): Frontier 3-4 with HOME-67 (the team = Yama + Nira + HOME-67, D7), the colosseum, the silent gate of Zone 4, entering Zone 4, Lumen-01 + the Magic Clock, HOME-67 at the harbour.
// Rae's scenes are copied VERBATIM by scripts/extract-rae-z4a.py (z4a-raw.js). This module registers them (TH on the page, EN in the `en` block) and holds the keys / pictures / notices of the whole T8a package.
// Keys: `z34-arrive` · `col-gate` · `col-thor-win` · `col-lucifer-open` / `-win` · `z4-gate-silent` · `z4-arrive` · `z4-lumen-open` / `-win` · `z4-home67-harbor`.
import { RAW_Z4A_SCENES } from './z4a-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z4-events/${n}.webp`;
export const Z4A = Object.freeze({ arriveStory:'z34-arrive', gateStory:'col-gate', thorWin:'col-thor-win', luciferOpen:'col-lucifer-open', luciferWin:'col-lucifer-win', silentStory:'z4-gate-silent', zone4Story:'z4-arrive',
  lumenOpen:'z4-lumen-open', lumenWin:'z4-lumen-win', harborStory:'z4-home67-harbor' });
export const Z4A_ART = Object.freeze({ arrive:A('cut-z34-arrive'), gate:A('cut-col-gate'), zone4:A('cut-z4-arrive'), lumen:'img/deva-intro/deva-intro-cyberhell-v1.webp', lumenWin:'img/deva-intro/deva-intro-cyberhell-v1.webp', harbor:A('cut-home67-harbor-gift') });
const IMG = { 'z34-arrive':Z4A_ART.arrive, 'col-gate':Z4A_ART.gate, 'col-thor-win':A('cut-col-s9'), 'col-lucifer-open':A('cut-col-gate'), 'col-lucifer-win':A('cut-col-s10'), 'z4-gate-silent':Z4A_ART.arrive,
  'z4-arrive':Z4A_ART.zone4, 'z4-lumen-open':Z4A_ART.lumen, 'z4-lumen-win':Z4A_ART.lumenWin, 'z4-home67-harbor':Z4A_ART.harbor };
export const Z4A_STORIES = Object.freeze(Object.fromEntries(Object.entries(RAW_Z4A_SCENES).map(([k, raw]) => [k, fromRae(raw, IMG[k])])));

// ---- T8a/3 (Rae D 2.1-2.5): Lumen-01, the Magic Clock, the captives, HOME-67 leaves the team and waits on the pier of Zone 4 with a gift (1,200 coins + the Zone 4 robes)
export const Z4A_ZONE4 = Object.freeze({ clockNotice:'z4-clock', releasedNotice:'z4-released', giftNotice:'z4-home67-gift', leftNotice:'z4-home67-left', gift:1200, outfit:'cyberhell' });
export const Z4A_LUMEN = Object.freeze({
  banner:{ th:'ลานเทวดาโซน 4 · ลูเมน-01', en:'Zone 4 · The Deva Court · Lumen-01' },   // NZ-1
});
export const Z4A_NOTICES = Object.freeze({
  [Z4A_ZONE4.clockNotice]:{ title:'นาฬิกาย้อนเวลา', text:'ท่านได้นาฬิกาวิเศษ ใช้คืนคูลดาวน์ให้ทีมกลางศึก เมื่อพลังหมดให้ไปเติมที่หอส่องกรรม', button:'ต่อ', art:Z4A_ART.lumen,
    en:{ title:'The Clock That Turns Back Time', text:'You have received the Magic Clock. It returns the team\'s cooldowns mid-battle. When its power is spent, recharge it at the Mirror Tower.', button:'Continue' } },
  [Z4A_ZONE4.releasedNotice]:{ title:'ปล่อยผู้ถูกกัก', text:'ซิสอ็อปและพ่อค้านรกออกจากคุกเทวดาแล้ว ท่านสร้างสถานที่ได้ตั้งแต่บัดนี้', button:'ต่อ', art:Z4A_ART.lumen,
    en:{ title:'The Held Are Released', text:'Sysop and the hell merchant are out of the devas\' cell. You may build from this moment.', button:'Continue' } },
  [Z4A_ZONE4.giftNotice]:{ title:'ของฝากจากนักสืบบัญชี', text:'HOME-67 มอบเงิน 1,200 เบี้ยกรรมและชุดประจำโซน 4 ให้ยามา (ชุดจะเปลี่ยนให้เองเมื่อกด "รับทราบ" และใช้ทุกภาพของโซน 4)', button:'รับทราบ', art:'img/z3-events/char-home67-profile.webp',
    en:{ title:'A Gift From the Ledger Detective', text:'HOME-67 gives Yama 1,200 karma coins and the robes of Zone 4. (The robes change over automatically when you press Understood and are used in every Zone 4 image.)', button:'Understood' } },
  [Z4A_ZONE4.leftNotice]:{ title:'HOME-67 ออกจากทีม', text:'HOME-67 ออกจากทีมไปยืนที่ท่าเรือ ทีมของท่านเหลือ ยามา และ นิรา', button:'รับทราบ', art:'img/z3-events/char-home67-profile.webp',
    en:{ title:'HOME-67 Leaves the Team', text:'HOME-67 leaves the team and goes to wait at the harbour. Your team is now Yama and Nira.', button:'Understood' } },
});
/** the three lines HOME-67 says when he is talked to again at the harbour (Rae 2.5) */
export const HOME67_HARBOR_LINES = Object.freeze([
  { th:'HOME-67: "ผมไม่เห็นเรือผิดปกติวันนี้ครับ"', en:'HOME-67: "I see no unusual ships today."' },
  { th:'HOME-67: "ท่าเรือเงียบแบบมีคนซ่อนเสียง ผมชอบตรวจเรื่องแบบนี้"', en:'HOME-67: "The harbour is quiet in the way of a place where someone hides a sound. I like inspecting that."' },
  { th:'HOME-67: "ถ้าบัญชีของคุณไม่ตรงกับตัวเลขผม ผมเชื่อบัญชีของคุณครับ"', en:'HOME-67: "If your ledger disagrees with my numbers, I will trust your ledger."' },
]);
