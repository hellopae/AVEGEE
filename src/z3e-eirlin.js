// T7b/4 (Rae R2 part C, section 4): case 10 - Eirlin (the Valkyrie, inspector of spears) came one step too late for the vampire and tests Yama with her spear. Winning gives the crate of inspected spears (= the existing `valkyrieSpear` reward,
// no new reward) and she leaves a flame in the lamp -> helper no. 8 "Spear to the Sound of Battle" (NE-1). Scenes: open + lose = Rae's first script verbatim (z3d-raw-old.js), win = page 1 verbatim + her two new pages (z3d-raw.js).
// The existing arrival scene `deva-west` is kept as it is. Keys: `westDevaTest` (the event, data.js) - `z3-eirlin-open` / `-win` / `-lose` - notices N10-1 (`z3-eirlin-wait`), N10-4' (`z3-eirlin-crate`), NE-1 (`lamp-helper-eirlin`).
import { RAW_OLD_Z3_EIRLIN_OPEN, RAW_OLD_Z3_EIRLIN_WIN } from './z3d-raw-old.js';
import { RAW_EIRLIN_WIN_PAGES } from './z3d-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z3-events/${n}.webp`;
const INTRO = 'img/deva-intro/deva-intro-west-v1.webp';   // the existing picture of the Valkyrie (open / lose / page 1 of the win)
export const EIRLIN = Object.freeze({ eventKey:'westDevaTest', openStory:'z3-eirlin-open', winStory:'z3-eirlin-win', loseStory:'z3-eirlin-lose', waitNotice:'z3-eirlin-wait', crateNotice:'z3-eirlin-crate', helper:'eirlin' });
export const EIRLIN_ART = Object.freeze({ intro:INTRO, crate:A('cut-eirlin-crate-west'), icon:'img/summon/icon-eirlin.webp', battle:'img/summon/battle-eirlin.webp', cut:'img/summon/cut-eirlin-spear-call.webp' });

export const EIRLIN_TEXT = Object.freeze({
  // N10-2 (the window when you talk to her) · N10-3 banner · N10-5 lose
  title:{ th:'เทวดาทดสอบแห่งปัจฉิม', en:'The West\'s deva tests you' },
  alert:{ th:'เอียร์ลิน ผู้ตรวจหอกวาลคิรี มาปราบแวมไพร์ไม่ทัน จึงขอทดสอบท่านด้วยหอก เธอไม่ใช่ศัตรู แต่อยากเห็นว่าท่านยืนได้เมื่อหอกพุ่งเข้าหา', en:'Eirlin, spear-inspector of the Valkyries, came too late for the vampire and asks to test you with her spear instead. She is no enemy. She wants to see you stand when the spear comes.' },
  go:{ th:'รับการทดสอบ', en:'Take the test' }, retry:{ th:'ทดสอบอีกครั้ง', en:'Test again' },
  banner:{ th:'ศึกทดสอบหอกวาลคิรี · เอียร์ลิน', en:'Valkyrie spear test · Eirlin' },
  win:{ title:'ผ่านการทดสอบของเอียร์ลิน', text:'ท่านผ่านการทดสอบของเอียร์ลิน หอกถูกเก็บเข้าฝักแล้ว' },   // N10-4 (the result of the fight itself; the crate window N10-4' follows the scene)
  lose:{ title:'หอกหยุดชั่วคราว', text:'เอียร์ลินลดหอกลงก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้' },
  lines:{ start:'เอียร์ลิน: "ให้ข้าเห็นว่าเจ้ายืนได้นะ"', half:'เอียร์ลิน: "ดี! เจ้ายังไม่ถอยสักก้าว"' },
  linesEn:{ start:'Eirlin: "Show me you can stand."', half:'Eirlin: "Good! You have not given one step."' },
});
export const EIRLIN_NOTICES = Object.freeze({
  [EIRLIN.waitNotice]:{ title:'เทวดาผู้ตรวจรอท่านอยู่', text:'เอียร์ลิน ผู้ตรวจหอกวาลคิรี ลงมาช้าไปก้าวเดียว และรออยู่เพื่อทดสอบท่าน เตรียมทีมให้พร้อมแล้วเดินไปคุยกับเธอ', button:'รับทราบ', art:INTRO,
    en:{ title:'The inspector awaits you', text:'Eirlin, spear-inspector of the Valkyries, arrived one step too late and now waits to test you. Ready your team and go speak with her.', button:'Understood' } },
  [EIRLIN.crateNotice]:{ title:'ผ่านการทดสอบของเอียร์ลิน', text:'เอียร์ลินมอบลังหอกวาลคิรีที่เธอตรวจแล้วให้ท่าน ท่านได้ท่าหอกวาลคิรี รายละเอียดตามรางวัล valkyrieSpear เดิม', button:'ต่อ', art:EIRLIN_ART.crate,
    en:{ title:'You Passed Eirlin\'s Test', text:'Eirlin gives you a crate of Valkyrie spears she has inspected. You gain the Valkyrie Spear technique, as described by the existing valkyrieSpear reward.', button:'Continue' } },
  // NE-1 replaces the generic helper window (z1-events.js maps it to `lamp-helper-eirlin`)
  'lamp-helper-eirlin':{ title:'เอียร์ลินฝากไฟไว้ในตะเกียง', text:'เอียร์ลินฝากไฟไว้ในตะเกียงวิเศษ ท่านเรียกเธอในศึกได้ เรียกได้ 3 ครั้ง ครั้งละ 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม', button:'ดูตะเกียง', openLamp:true, art:EIRLIN_ART.icon,
    en:{ title:'Eirlin Leaves a Flame in the Lamp', text:'Eirlin leaves a flame in the Magic Lamp. You can call her in battle, 3 times, for 3 turns each time. When the flames run out, recharge at the Mirror Tower.', button:'See the Lamp' } },
});
/** helper no. 8 (Rae 4.4). The picture of the move is a placeholder; "lowers the guard for one round" is not in the engine yet - the move is a strong single strike (see the T7 report). */
export const EIRLIN_HELPER = Object.freeze({
  name:{ th:'เอียร์ลิน (วาลคิรี)', en:'Eirlin (the Valkyrie)' },
  move:{ name:{ th:'หอกตามเสียงศึก', en:'Spear to the Sound of Battle' }, desc:{ th:'เอียร์ลินพุ่งลงจากฟ้าด้วยหอกสีฟ้าขาว แทงศัตรูตัวเดียวที่ทีมกำลังรบอยู่หนักที่สุด', en:'Eirlin dives from the sky with a blue-white spear and pierces the one foe the team is fighting hardest.' } },
  say:{ call:{ th:'เอียร์ลิน: "เจ้าเรียกข้าแล้วนะเจ้าตัวเล็ก ข้าได้ยินเสียงศึกแล้ว!"', en:'Eirlin: "You called me, little one. I hear the battle!"' },
    use:{ th:'เอียร์ลิน: "ดูหอกนี้ให้ดี มันเลือกเป้าเอง!"', en:'Eirlin: "Watch this spear. It chooses its own mark!"' },
    end:{ th:'เอียร์ลิน: "ข้ากลับไปบินต่อ จุดตะเกียงเรียกอีกถ้าเจ้าต้องการ"', en:'Eirlin: "Back to the sky for me. Light the lamp again if you need me."' } },
});
export const EIRLIN_STORIES = Object.freeze({
  [EIRLIN.openStory]:fromRae(RAW_OLD_Z3_EIRLIN_OPEN['z3-eirlin-open'], INTRO),
  [EIRLIN.winStory]:(() => { const old = fromRae(RAW_OLD_Z3_EIRLIN_WIN['z3-eirlin-win'], INTRO), news = fromRae({ title:RAW_OLD_Z3_EIRLIN_WIN['z3-eirlin-win'].title, pages:RAW_EIRLIN_WIN_PAGES }, EIRLIN_ART.crate);
    // her old page 2 ("the spear technique and a tide that drew back") is replaced by the two new pages (the crate + the flame): page 1 stays verbatim
    return { ...old, pages:[old.pages[0], ...news.pages] }; })(),
  [EIRLIN.loseStory]:fromRae(RAW_OLD_Z3_EIRLIN_WIN['z3-eirlin-lose'], INTRO),
});
