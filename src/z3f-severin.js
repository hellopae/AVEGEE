// T7b-2/5 (Rae R2 part C, section 5): case 15 - Severin brings Jormungandr as "collateral": the serpent is fought FIRST (it yields, never dies), then Severin; winning gives the ice power (the existing STORY.west panel),
// the collateral scene, helper no. 9 "Coil Around the World" (NS-1) and then HOME-67 waits on the pier and asks for help (he joins; the walk to Frontier 3-4 is part D / T8).
// Scenes: Rae's first script verbatim (z3d-raw-old.js: sev-open / jorm-yields / jorm-lose / sev-lose / sev-win) and her part C (z3d-raw.js: collateral, HOME-67). NS-2 (money + the Zone 4 robes at this pier) is CUT: HOME-67 gives them in part D.
// Keys: `westJorm` (the serpent fight, data.js) · `z3-sev-open` (= ZONES.west.bossArrive) · `z3-jorm-yields` / `z3-jorm-lose` / `z3-sev-lose` / `z3-sev-win` / `z3-sev-collateral` · `z3-home67-intro` / `-join` · N15-1 N15-4 N15-5 N15-6 NS-1 NH-1 NH-3 NH-4.
import { RAW_OLD_Z3_SEV_OPEN, RAW_OLD_Z3_JORM_YIELDS, RAW_OLD_Z3_SEV_WIN } from './z3d-raw-old.js';
import { RAW_SEV_COLLATERAL, RAW_HOME67 } from './z3d-raw.js';
import { fromRae } from './z3d-cases.js';
const A = n => `img/z3-events/${n}.webp`;
export const SEV = Object.freeze({ jormKey:'westJorm', arriveNotice:'z3-sev-arrive', openStory:'z3-sev-open', yieldsStory:'z3-jorm-yields', jormLoseStory:'z3-jorm-lose', sevLoseStory:'z3-sev-lose', winStory:'z3-sev-win', collateralStory:'z3-sev-collateral',
  yieldsNotice:'z3-jorm-withdraws', helper:'jormungandr', home67Notice:'z3-home67-wait', home67JoinNotice:'z3-home67-joined', home67WarnNotice:'z3-home67-warn', home67Intro:'z3-home67-intro', home67Join:'z3-home67-join', pierSeen:'z3-home67-pier' });
export const SEV_ART = Object.freeze({ arrive:A('cut-sev-jorm-arrive-west'), yields:A('cut-jorm-yields-west'), win:'img/West/Boss Zone3-cutscene.webp', collateral:A('cut-sev-collateral-west'), home67:A('cut-home67-pier-west'),
  jormSprite:'boss-jormungandr-west', icon:'img/summon/icon-jormungandr.webp', battle:'img/summon/battle-jormungandr.webp', cut:'img/summon/cut-jorm-coil-world.webp', home67Sprite:'char-home67', home67Profile:A('char-home67-profile') });

export const SEV_STORIES = Object.freeze({
  [SEV.openStory]:fromRae(RAW_OLD_Z3_SEV_OPEN['z3-sev-open'], SEV_ART.arrive),
  [SEV.yieldsStory]:fromRae(RAW_OLD_Z3_JORM_YIELDS['z3-jorm-yields'], SEV_ART.yields),
  [SEV.jormLoseStory]:fromRae(RAW_OLD_Z3_JORM_YIELDS['z3-jorm-lose'], SEV_ART.arrive),
  [SEV.sevLoseStory]:fromRae(RAW_OLD_Z3_JORM_YIELDS['z3-sev-lose'], SEV_ART.arrive),
  [SEV.winStory]:fromRae(RAW_OLD_Z3_SEV_WIN['z3-sev-win'], SEV_ART.win),
  [SEV.collateralStory]:fromRae(RAW_SEV_COLLATERAL['z3-sev-collateral'], SEV_ART.collateral),
  [SEV.home67Intro]:fromRae(RAW_HOME67['z3-home67-intro'], SEV_ART.home67),
  [SEV.home67Join]:fromRae(RAW_HOME67['z3-home67-join'], SEV_ART.home67),
});
/** `z3-sev-open` replaces the four old `ZONES.west.bossArrive` lines: one line per row, the speaker before the colon (T9: the presenter shows SEV_ARRIVE_LINES_EN when the game is in English) */
export const SEV_ARRIVE_LINES = Object.freeze(RAW_OLD_Z3_SEV_OPEN['z3-sev-open'].pages.flatMap(p => p.line.th.split('\n')).filter(Boolean).map(l => l.replace(/\s*\/\*.*\*\/\s*$/, '')));

/** the same lines in English (the pages' `en.line` of Rae's z3-sev-open, same count and order as SEV_ARRIVE_LINES); the presenter (ui.js openBossArrive) shows them when the game is in English */
export const SEV_ARRIVE_LINES_EN = Object.freeze(RAW_OLD_Z3_SEV_OPEN['z3-sev-open'].pages.flatMap(p => p.line.en.split('\n')).filter(Boolean).map(l => l.replace(/\s*\/\*.*\*\/\s*$/, '')));

/** The serpent fight (an event of its own, fought before Severin; opened by game.js startZoneBoss) - narration only, it never speaks. Numbers: Toby's first ones. */
export const JORM_TEXT = Object.freeze({
  title:{ th:'ศึกอสรพิษโลก · ยอร์มุนกันดร์', en:'The World-Serpent · Jörmungandr' },
  alert:{ th:'เซเวอรินนำหลักประกันมาสอบทานท่าน ต้องผ่านยอร์มุนกันดร์ก่อนจึงจะสู้กับเซเวอรินได้', en:'Severin has brought his collateral to audit you. You must get past Jörmungandr before you can face Severin.' },
  go:{ th:'รับมือ', en:'Face it' }, retry:{ th:'สู้อีกครั้ง', en:'Fight again' },
  banner:{ th:'ศึกอสรพิษโลก · ยอร์มุนกันดร์', en:'The World-Serpent · Jörmungandr' },
  lines:{ start:'ยอร์มุนกันดร์เลื่อนขดช้า ๆ เหมือนยังไม่รู้ว่าใครอยู่ตรงหน้า', half:'ลำตัวใหญ่สั่นสะท้านทั้งสาย เหมือนเพิ่งรู้ว่ามีผู้ยืนอยู่' },
  linesEn:{ start:'Jörmungandr shifts his coils slowly, as if not yet aware who stands before him.', half:'The vast body shudders along its whole length, as if only now aware that someone is standing there.' },
  win:{ title:'อสรพิษโลกถอยแล้ว', text:'ยอร์มุนกันดร์คลายขดและจมลงสู่แม่น้ำวิญญาณ เซเวอรินก้าวขึ้นท่าเรือมาเอง' },
  lose:{ title:'อสรพิษโลกรออยู่', text:'ยอร์มุนกันดร์หยุดนิ่งไว้ก่อน ท่านตั้งหลักแล้วสู้อีกครั้งได้' },
});
/** Severin's own lines in the boss fight (N15-3 is the zone boss banner of the existing fight) */
export const SEV_LINES = Object.freeze({
  start:{ th:'เซเวอริน: "ข้าตรวจตัวเลขของเจ้าสองรอบแล้ว ลงมือได้"', en:'Severin: "I have checked your figures twice. You may begin."' },
  half:{ th:'เซเวอริน: "ยอดยังไม่ปิด! ข้ายังเหลืออีกหนึ่งหน้า"', en:'Severin: "The account is not closed! I still have one more page."' },
});
export const SEV_NOTICES = Object.freeze({
  [SEV.arriveNotice]:{ title:'ผู้ตรวจบัญชีแห่งปัจฉิมมาถึงแล้ว', text:'เซเวอริน อัศวินบัญชีปัจฉิม เดินเข้าประตูชายแดนด้านล่างมุ่งหน้าสู่ท่าเรือ โดยมีบางสิ่งใหญ่โตเลื้อยตามหลังมาในแม่น้ำ ไปคุยกับเขาที่ท่าเรือ', button:'ไปที่ท่าเรือ', art:'img/West/Boss Zone3-west-profile.webp',
    en:{ title:'The West\'s auditor has arrived', text:'Severin, the Knight of the Western Ledger, walks through the lower frontier gate toward the pier, with something vast sliding along behind him in the river. Go and speak with him at the pier.', button:'To the pier' } },
  [SEV.yieldsNotice]:{ title:'อสรพิษโลกถอยแล้ว', text:'ยอร์มุนกันดร์คลายขดและจมลงสู่แม่น้ำวิญญาณ เซเวอรินก้าวขึ้นท่าเรือมาเอง', button:'สู้ต่อ', art:A('boss-jormungandr-west-profile'),
    en:{ title:'The World-Serpent withdraws', text:'Jörmungandr loosens its coils and sinks into the river of souls. Severin steps up onto the pier himself.', button:'Fight on' } },
  // NS-1 replaces the generic helper window (z1-events.js maps it to `lamp-helper-jormungandr`)
  'lamp-helper-jormungandr':{ title:'อสรพิษโลกฝากไฟไว้ในตะเกียง', text:'ยอร์มุนกันดร์เลือกฝากไฟไว้ในตะเกียงวิเศษ ท่านเรียกเขาในศึกได้ เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม', button:'ดูตะเกียง', openLamp:true, art:SEV_ART.icon,
    en:{ title:'The World-Serpent Leaves a Flame in the Lamp', text:'Jörmungandr chooses to leave a flame in the Magic Lamp. You can call him in battle, once, and he stays in your team for 3 turns. When the flame is spent, recharge at the Mirror Tower.', button:'See the Lamp' } },
  [SEV.home67Notice]:{ title:'ผู้มาที่ท่าเรือ', text:'ชายแปลกหน้าในหมวกมีแถบแสงยืนรออยู่ที่ท่าเรือตั้งแต่ก่อนเรือของเซเวอรินจะออก เขาสนใจท่านมากกว่าที่ควร ไปคุยกับเขา', button:'ไปคุย', art:SEV_ART.home67Profile,
    en:{ title:'Someone at the Harbour', text:'A stranger in a cap with a thin band of light has been standing on the pier since before Severin\'s ship left. He is more interested in you than he ought to be. Go and speak with him.', button:'Go and speak' } },
  [SEV.home67JoinNotice]:{ title:'HOME-67 ร่วมทีม', text:'HOME-67 เดินทางไปกับท่าน ทีมของท่านคือ ยามา นิรา และ HOME-67 มุ่งหน้าสู่ชายแดน 3-4', button:'ออกเดินทาง', art:SEV_ART.home67Profile,
    en:{ title:'HOME-67 Joins the Team', text:'HOME-67 travels with you. Your team is Yama, Nira, and HOME-67, heading for Frontier 3-4.', button:'Set out' } },
  // NH-4: shown when the player tries to leave the harbour for Frontier 3-4 before speaking to him - the walk itself is part D (T8), so nothing opens this window yet
  [SEV.home67WarnNotice]:{ title:'ชายในหมวกแสงยังรออยู่', text:'ชายในหมวกแสงยังรอท่านอยู่ที่ท่าเรือ ท่านควรคุยกับเขาก่อนออกเดินทางไปชายแดน 3-4', button:'รับทราบ', art:SEV_ART.home67Profile,
    en:{ title:'The man in the light-banded cap is still waiting', text:'The man in the light-banded cap is still waiting at the harbour. You should speak with him before you set out for Frontier 3-4.', button:'Understood' } },
});
/** helper no. 9 (Rae 5.4): narration only, he never speaks. "slows every foe for one round" is not in the engine - a moderate group hit (see the T7 report). */
export const JORM_HELPER = Object.freeze({
  name:{ th:'ยอร์มุนกันดร์', en:'Jörmungandr' },
  move:{ name:{ th:'ขดล้อมโลก', en:'Coil Around the World' }, desc:{ th:'ยอร์มุนกันดร์ยกขดสีเทาน้ำเงินขึ้นจากน้ำล้อมศัตรูทั้งหมดไว้ในวงเดียว บีบจนศัตรูชะงักและช้าลง 1 รอบ', en:'Jörmungandr raises blue-grey coils from the water and rings every foe in a single loop, squeezing them until they falter and slow for one round.' } },
  say:{ call:{ th:'บรรยาย: ผืนน้ำใต้เท้าทีมเอนตัวขึ้น ดวงตาสีเหลืองซีดเปิดออกช้า ๆ ตรงขอบสนาม', en:'Narration: The ground beneath the team swells like water. A pale yellow eye opens slowly at the edge of the field.' },
    use:{ th:'บรรยาย: ขดสีเทาน้ำเงินยกขึ้นทีละวงจนล้อมศัตรูครบรอบ', en:'Narration: Blue-grey coils rise one loop at a time until they ring the foe completely.' },
    end:{ th:'บรรยาย: ขดคลายออกช้า ๆ จมลงโดยไม่มีคลื่น ปลายหางโผล่พ้นน้ำครู่เดียวแล้วหายไป', en:'Narration: The coils loosen slowly and sink without a ripple, the tip of the tail breaking the surface for a moment before it is gone.' } },
});
/** the journal line when `z3-sev-win` ends (page 3: the clue, same level as the earlier ones) */
export const SEV_JOURNAL = Object.freeze({ th:'PHANTOM-404: ยอดค้างสามรายการในสมุดปัจฉิมผิดปกติ ถูกแก้จากภายนอก', en:'PHANTOM-404: three outstanding balances in the West ledger out of order, altered from outside.' });
/** HOME-67 on the pier (Rae 5.5): the question, the two answers, and the lines said when he is tapped again after "let me prepare first" */
export const HOME67_TALK = Object.freeze({
  ask:{ th:'HOME-67: "คุณพร้อมจะเดินทางไปดินแดนใหม่แล้วหรือยังครับ"', en:'HOME-67: "Are you ready to travel to the new land?"' },
  ready:{ th:'พร้อมครับ', en:'I am ready' }, wait:{ th:'ขอเตรียมตัวก่อน', en:'Let me prepare first' },
  notYet:{ th:['ยมบาทน้อย: "ขอผมเตรียมตัวก่อนครับ"', 'HOME-67: "ได้ครับ ผมจะรอ ท่าเรือไม่หนีไปไหน แต่รหัสที่ถูกแก้ ไม่รอใคร"'], en:['Yama: "Let me prepare first."', 'HOME-67: "Of course. I will wait. The harbour is not going anywhere. But a code that has been altered will not wait for anyone."'] },
  again:[
    { th:'HOME-67: "คนที่เตรียมตัวไม่ใช่คนที่ลังเล ผมเห็นความต่างจากรองเท้า"', en:'HOME-67: "Those who prepare are not hesitating. I can tell the difference by the shoes."' },
    { th:'HOME-67: "คุณมีก้อนขี้ผึ้งหนึ่งก้อนในกระเป๋าเสื้อ ผมจำได้ว่ามันเป็นของคนที่ระวังเสียงมานาน เก็บไว้ให้ดีครับ"', en:'HOME-67: "You carry a lump of beeswax in your coat pocket. I recognise it as belonging to someone who has long been wary of certain sounds. Keep it well."' },
  ],
  later:{ th:'ไว้คราวหน้า', en:'Later' },
});
