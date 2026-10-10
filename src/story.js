import { t } from './i18n.js';
import { BATTLE, WEAPONS } from './data.js';
import { weaponCutsceneSrc } from './weapons.js';
// Story panels share the intro comic layout; rewards are granted by game logic.
const panel = (id, title, line) => ({ image:`img/story-${id}.png`, title, line });
const devaPanel = (zone, lineKey) => ({ get title() { return t('deva.intro.title'); }, pages:[{
  video:zone === 'th' ? 'img/deva-intro/deva-intro-th-beggar-v2.mp4' : `img/deva-intro/deva-intro-${zone}-v1-web.mp4`, videoAspect:16/9,
  image:zone === 'th' ? 'img/deva-intro/deva-intro-th-beggar-v2.webp' : `img/deva-intro/deva-intro-${zone}-v1.png`, get title() { return t('deva.intro.title'); }, get line() { return t(lineKey); },
}] });
// G3b — คัตซีนรับอาวุธประจำโซน: ภาพ 16:9 วาดโดย Kittanate/Codex ที่ img/weapons/weapon-cutscene-<id>.jpeg
// แยกจาก STORY ตั้งใจ: ภาพยังไม่มีไฟล์ได้ (renderStoryComic ใส่ภาพแทนให้เอง ไม่ error) · เทสต์ "ทุกหน้าเรื่องมีไฟล์จริง" จึงไม่ตีธงรายการนี้
// ข้อความ = ชื่ออาวุธ + บทพูด "ชนะ" ของบอสโซนนั้น (ร่าง Minnie) · เล่นครั้งเดียวต่ออาวุธ (g.storySeen)
const weaponStory = id => ({ get title() { return t('weapon.cutscene.title'); }, pages:[{
  image:weaponCutsceneSrc(id), fallback:'🗡️', get title() { return t(`weapon.${id}.name`); },
  get line() { return `${t(`challenge.${WEAPONS[id].zone}.win`)}\n\n${t('weapon.reward.hint')}`; },
}] });
export const WEAPON_STORY = Object.fromEntries(Object.keys(WEAPONS).map(id => [`weapon-${id}`, weaponStory(id)]));
export const STORY = {
  'deva-th-praise':devaPanel('th', 'deva.th.praise'),
  'deva-th-warning':devaPanel('th', 'deva.th.warning'),
  'deva-west':devaPanel('west', 'deva.west.arrival'),
  'deva-cyberhell':devaPanel('cyberhell', 'deva.cyberhell.arrival'),
  'deva-asia':devaPanel('asia', 'deva.asia.arrival'),
  th: { title:'โซน 1 · เพลิงที่ตื่นขึ้น', reward:'flameCharge', pages:[
    panel('th-01','ดาบเพลิงของพี่ใหญ่','เมื่อใกล้พ่ายแพ้ พี่ใหญ่รวบรวมแรงเฮือกสุดท้าย ฟาดดาบเพลิงใส่ยมบาทน้อย'),
    panel('th-02','ยังล้มไม่ได้','ยมบาทน้อยบาดเจ็บ ทรุดลงกับพื้น แต่ยังไม่ยอมปล่อยให้การต่อสู้จบลง'),
    panel('th-03','ไฟจากข้างใน','เปลวไฟลุกขึ้นห่อหุ้มทั่วร่าง ความเจ็บปวดเปลี่ยนเป็นแรงฮึดสู้'),
    panel('th-04','พุ่งชนเพลิง','ยมบาทน้อยรวบพลังไฟรอบตัว แล้วพุ่งเข้าชนพี่ใหญ่เต็มแรง'),
    panel('th-05','พี่ใหญ่ยอมรับ','พี่ใหญ่ยอมรับความแข็งแกร่งของน้อง ยมบาทน้อยชนะและควบคุมพลังพุ่งชนเพลิงได้แล้ว'),
  ]},
  asia: { title:'โซน 2 · เพื่อคนที่ปกป้องเรา', reward:'rage', pages:[
    panel('asia-01','โจมตีทีเผลอ','บอสบูรพาใกล้หมดแรง แต่แอบปล่อยท่าไม้ตายใส่ยมบาทน้อยในจังหวะที่ไม่ทันระวัง'),
    panel('asia-02','นิราเข้ารับแทน','นิรากระโดดเข้ามาขวาง รับการโจมตีแทนและบาดเจ็บต่อหน้ายมบาทน้อย'),
    panel('asia-03','พลังบ้าคลั่ง','ความโกรธปลุกพลัง Rage ให้ตื่นขึ้น ยมบาทน้อยลุกขึ้นปกป้องนิรา'),
    panel('asia-04','ไม่มีใครทำร้ายเธออีก','ยมบาทน้อยพุ่งเข้าโจมตีด้วยพลังบ้าคลั่ง จนบอสและปีศาจทั้งสองพ่ายแพ้'),
    panel('asia-05-v2','พักก่อนนะ นิรา','นิราไปพักที่ศาลาน้ำชา แวะไปเยี่ยมเธอได้ พัก 3 วาระก็จะหายและกลับมาช่วยงานตามเดิม'),
  ]},
  'west-hypnosis': { title:'โซน 3 · ลูกทีมที่ถูกสะกดจิต', pages:[
    { image:'img/frontier-west-hypnosis-v1.webp', title:'วาลดริก · เจ้าแห่งแวมไพร์', line:'ลูกน้องสองระลอกล้มลงแล้วหรือ? ถ้าเช่นนั้น จงรับมือคนของเจ้าเอง!\nแวมไพร์สะกดจิตยมทูตและ Guard โซน 3 ทุกคนให้หันอาวุธเข้าหายมบาทน้อย' },
    { image:'img/frontier-west-hypnosis-v1.webp', title:'ช่วยทุกคนกลับมา', line:'ยมบาทน้อย: ตั้งสติไว้! ข้าจะทำลายมนต์สะกดและพาพวกเจ้ากลับมา\nเอาชนะยมทูตที่จัดทีมมาและ Guard ในระลอก 3 เพื่อปลดปล่อย ก่อนเข้าต่อสู้กับแวมไพร์' },
  ]},
  west: { title:'โซน 3 · ของขวัญจากผู้พ่ายแพ้', reward:'ice', pages:[
    panel('west-01','ผู้ท้าชิงยอมรับ','เซเวอริน คู่แข่งของฮาลวาร์ที่เคยคิดยึดอำนาจ ยอมรับฝีมือยมบาทน้อยหลังพ่ายแพ้ และยอมให้ปกครองโซน 3'),
    panel('west-02','ผนึกน้ำแข็ง','ความเย็นรวมตัวในฝ่ามือ ยมบาทน้อยได้รับพลังน้ำแข็งไว้ใช้ในการต่อสู้'),
  ]},
  'cyber-approach': { title:'โซน 4 · ศึกสุดท้าย', pages:[
    panel('cyberhell-01-v2','สี่ระลอกก่อนกำลังเสริม','หลังคดีที่ 10 ปีศาจสี่ระลอกขวางทางอยู่ รับเงินและไอเทมแต่ละระลอก แล้วกลับไปเตรียมตัวบนแผนที่ได้'),
  ]},
  'cyber-reinforcements': { title:'โซน 4 · กองหนุนจากทั้งสี่สาขา', pages:[
    panel('cyberhell-reinforcements-01','พวกเราไม่ได้มาคนเดียว','ปีศาจสี่ระลอกพ่ายแพ้แล้ว แต่ลูกน้องของบอสยังเหลืออีกมาก เสียงฝีเท้าด้านหลังเผยให้เห็นยมทูตและ Guard จากทั้งสี่โซนที่มาช่วย'),
  ]},
  'cyber-reinforcements-advance': { title:'โซน 4 · กองหนุนเปิดทาง', pages:[
    panel('cyberhell-reinforcements-02','เปิดทางให้ยมบาทน้อย','กองหนุนพุ่งเข้ารับมือลูกน้องที่เหลือ ยมบาทน้อยกับนิราจึงหันไปช่วยหัวหน้าทั้งสี่ ก่อนเข้าถึงบอสใหญ่ · ช่วยหัวหน้าโซน 1 → 2 → 3 → 4 ทีละคน พัก ซื้อของ และจัดทีมระหว่างศึกได้'),
  ]},
  'cyber-control': { title:'โซน 4 · ผู้ถูกควบคุม', pages:[
    { ...panel('cyberhell-02-v3','ช่วยหัวหน้าทั้งสี่','กองหนุนรับมือลูกน้องไว้ให้แล้ว ต้องปลดปล่อยพ่อและหัวหน้าโซน 2–4 จากการควบคุม ก่อนจะเข้าถึงตัวผู้ตรวจการโซน 4'), video:'img/story-cyberhell-02-v3.mp4', videoAspect:1276/536 },
  ]},
  'cyber-duel': { title:'โซน 4 · ตัดสายควบคุม', pages:[
    { ...panel('cyberhell-03-v4','เหลือบอสคนสุดท้าย','หัวหน้าทั้งสี่เป็นอิสระแล้ว ยมบาทน้อยและทีมที่เตรียมพร้อมก้าวเข้าสู่ศึกตัดสินกับผู้ตรวจการโซน 4'), video:'img/story-cyberhell-03-v4.mp4', videoAspect:1280/544 },
  ]},
  ending: { title:'อเวจี · สันติสุขทั้งสี่สาขา', pages:[
    { ...panel('ending-01-v4','จบการควบคุม','บอสใหญ่พ่ายแพ้ ทุกคนเป็นอิสระ ศึกสุดท้ายสิ้นสุดลงแล้ว'), video:'img/story-ending-01-v4.mp4', videoAspect:1276/584 },
    { ...panel('ending-02-v3','ผู้ปกครองทั้งสี่โซน','ยมบาทน้อยปกครองทั้ง 4 โซนด้วยความสงบสุข โดยมีนิรา พ่อ และหัวหน้าโซน 2–4 ร่วมดูแลอยู่เคียงข้าง'), video:'img/story-ending-02-v1.mp4', videoAspect:1280/544 },
    { ...panel('ending-03-v1','พ่อยอมรับ','พ่อเดินมาตบบ่าของยมบาทน้อยเบาๆ แล้วพูดว่า “ทำได้ดีมากลูกพ่อ” ขณะที่นิรายืนยิ้มอยู่ข้างๆ ด้วยความภูมิใจ'), video:'img/story-ending-03-v1.mp4', videoAspect:16/9, poster:'img/story-ending-03-start-v1.png' },
  ]},
};
/** เรื่อง/คัตซีนตามคีย์ — STORY หลักก่อน แล้วคัตซีนอาวุธ */
export const storyOf = key => STORY[key] || WEAPON_STORY[key];
export const ABILITY_REWARDS = {
  bigFire:{ howTo:'ในฉากต่อสู้ กดลูกไฟ (แรงขึ้นอัตโนมัติ) บนวงคำสั่ง ใช้ MP', name:'ลูกไฟใหญ่', image:'img/fx-fireball-big.png', text:'พลังลูกไฟแรงขึ้น 20 หน่วย · ได้จากการชนะศึกชายแดนโซน 1 ครบ 2 ระลอกหลังคดี 8' },
  flameCharge:{ howTo:'ในฉากต่อสู้ กดพุ่งชนเพลิงบนวงคำสั่ง ใช้ MP', name:'พุ่งชนเพลิง', image:'img/fx-flame-charge.png', text:`ห่อหุ้มตัวด้วยไฟแล้วพุ่งชนศัตรู · ใช้ MP ${BATTLE.mpCost.charge} · ความเสียหายเริ่มต้น 65 หน่วย` },
  rage:{ howTo:'ในฉากต่อสู้ กดบ้าคลั่งบนวงคำสั่ง ใช้ MP', name:'พลังบ้าคลั่ง', image:'img/fx-rage.png', text:`เพิ่มความเสียหาย 50% สำหรับการโจมตี 3 ครั้ง · คูลดาวน์ 3 เทิร์น · ใช้ MP ${BATTLE.mpCost.rage} · นิราจะพักที่ศาลาน้ำชา 3 วาระ` },
  ice:{ howTo:'ในฉากต่อสู้ กดผนึกน้ำแข็งบนวงคำสั่ง ใช้ MP', name:'ผนึกน้ำแข็ง', image:'img/fx-ice.png', text:`โจมตีศัตรูทุกคน คนละ 30 หน่วยและหยุด 1 เทิร์น · ใช้ MP ${BATTLE.mpCost.ice}` },
};

Object.assign(ABILITY_REWARDS, {
 windFan:{name:'พัดสายลม', image:'img/fx-fan-wind.png', text:'โจมตีศัตรูทุกคนด้วยลม', howTo:'ในฉากต่อสู้ กดพัดสายลมบนวงคำสั่ง ใช้ MP'},
 hypno:{name:'สะกดจิต', image:'img/fx-hypno.png', text:'ควบคุมศัตรูทุกคนให้โจมตีกันเอง 1 เทิร์น', howTo:'ในฉากต่อสู้ กดสะกดจิตบนวงคำสั่ง ใช้ MP'},
 valkyrieSpear:{name:'หอกวาลคีรี', image:'img/fx-valkyrie-spear.png', text:'โจมตีศัตรูด้วยหอก', howTo:'ในฉากต่อสู้ กดหอกวาลคีรีบนวงคำสั่ง ใช้ MP'},
 cooldownClock:{name:'นาฬิกาย้อนเวลา', image:'img/fx-clock-reset.png', text:'คืนคูลดาวน์ให้ทีม', howTo:'ในฉากต่อสู้ เลือกไอเท็ม → นาฬิกาย้อนเวลา ไม่ใช้ MP · ใช้ได้ครั้งเดียวต่อชุดการต่อสู้'},
});
