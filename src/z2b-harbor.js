// T6/4 · Lian Gang stands at the harbor, gives the Zone 3 robes + 800 coins, warns of the beasts, sends Musashi with the team, leaves a flame in the lamp (Rae R2 part B, section 4).
// Replaces the old boss-guide of Zone 2 (praise -> wait at the gate -> welcome -> farewell + gift at the new land's gate): the guide system of src/boss-guides.js still runs, with these meanings for Zone 2:
//   won  = z2-lian-win (last line changed, 4.2) then NL-1 · "welcome" = the answer "I am ready" = the scene z2-lian-gift (grant + robes + Musashi follows) · "farewell" = Musashi's farewell at the western gate (z3gate-musashi-farewell, T6/7).
// Pictures: L1 (the talk page) is the existing intro cutscene of the boss; L2 = the gift cut (placeholder); Musashi M1 = `char-musashi-asia` (placeholder); L3 icon / battle = copies of the boss drawings; L4 = placeholder.
export const HARBOR = Object.freeze({ waitNotice:'z2-lian-wait', giftNotice:'z2-lian-gift-received', joinNotice:'z2-lian-join', remindNotice:'z2-lian-remind', pierSeen:'z2-lian-pier', giftStory:'boss-guide-asia-welcome', helper:'liangang', grant:800 });
export const ART = Object.freeze({
  talk:'img/Asia/Intro-Boss-Zone2-asia.webp', gift:'img/z2-events/cut-lian-gift-asia.webp', portrait:'img/Asia/Boss Zone2-asia-profile.webp',
  musashi:'char-musashi-asia', musashiProfile:'img/z2-events/char-musashi-asia-profile.webp',
  icon:'img/summon/icon-liangang.webp', battle:'img/summon/battle-liangang.webp', cut:'img/summon/cut-liangang-chain-line.webp',
});

/** 4.2 the last line of z2-lian-win (old: "I will wait for you at the frontier gate") */
export const LIAN_WIN_OLD_LAST = 'เหลียนกัง: "ข้าไม่ได้ลงมาเพื่อถูกพิพากษา ข้าลงมาเพื่อเห็นเท่านี้ ข้าจะรอเจ้าที่ประตูชายแดน"';
export const LIAN_WIN_NEW_LAST = 'เหลียนกัง: "ข้าไม่ได้ลงมาเพื่อถูกพิพากษา ข้าลงมาเพื่อเห็นเท่านี้ ข้าจะยืนอยู่ที่ท่าเรือนี้ เมื่อเจ้าพร้อม มาหาข้า"';
export const LIAN_WIN_NEW_LAST_EN = 'Lian Gang: "I did not come down to be judged. I came down to see this much. I will stand here at the harbor. When you are ready, come to me."';

// ---- 4.3 windows ----
export const HARBOR_NOTICES = Object.freeze({
  [HARBOR.waitNotice]:{ title:'แม่ทัพรอท่านที่ท่าเรือ', text:'เหลียนกังยอมรับฝีมือท่านแล้ว เขายืนอยู่ที่ท่าเรือ เตรียมทีมให้พร้อม แล้วเดินไปคุยกับเขา', button:'รับทราบ', art:ART.portrait,
    en:{ title:'The General Waits at the Harbor', text:'Lian Gang has acknowledged your skill. He stands at the harbor. Ready your team, then go and speak with him.', button:'Understood' } },
  [HARBOR.giftNotice]:{ title:'ของฝากจากแม่ทัพ', text:'เหลียนกังมอบเงิน 800 เบี้ยกรรมและชุดประจำปัจฉิมให้ยามา (ชุดจะเปลี่ยนให้เองตอนเดินเข้าโซน 3)', button:'ขอบคุณ', art:ART.portrait,
    en:{ title:'A Gift from the General', text:'Lian Gang gives Yama 800 karma coins and the robes of the West. (The robes change over automatically when you enter Zone 3.)', button:'Thank him' } },
  [HARBOR.joinNotice]:{ title:'มูซาชิร่วมทีม', text:'เหลียนกังฝากมูซาชิให้เดินทางไปกับท่าน ทีมของท่านคือ ยามา นิรา และมูซาชิ มุ่งหน้าสู่ชายแดน 2-3', button:'ออกเดินทาง', art:ART.musashiProfile,
    en:{ title:'Musashi Joins the Team', text:'Lian Gang entrusts Musashi to travel with you. Your team is Yama, Nira, and Musashi, heading for Frontier 2-3.', button:'Set out' } },
  [HARBOR.remindNotice]:{ title:'แม่ทัพยังรอท่านอยู่', text:'เหลียนกังยังรอท่านอยู่ที่ท่าเรือ ท่านควรคุยกับเขาก่อนออกเดินทางไปดินแดนใหม่', button:'รับทราบ', art:ART.portrait,
    en:{ title:'The General Is Still Waiting', text:'Lian Gang is still waiting at the harbor. You should speak with him before you set out for the new land.', button:'Understood' } },
});
/** NL-4 replaces the generic "a new helper" window for Lian Gang (lamp-helper-liangang) */
export const HARBOR_FLAME_NOTICE = Object.freeze({ title:'เหลียนกังฝากไฟไว้ในตะเกียง', text:'เหลียนกังฝากไฟไว้ในตะเกียงวิเศษ ท่านเรียกเขาในศึกได้ เรียกได้ 3 ครั้ง ครั้งละ 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม', button:'ดูตะเกียง', openLamp:true, art:ART.icon,
  en:{ title:'Lian Gang Leaves a Flame in the Lamp', text:'Lian Gang leaves a flame in the Magic Lamp. You can call him in battle, 3 times, for 3 turns each time. When the flames run out, recharge at the Mirror Tower.', button:'See the Lamp' } });

/** 4.4 the talk at the harbor (dialogue + two answers; same shape as z1-yomathat.js PIER_TALK) */
export const PIER_TALK = Object.freeze({
  first:[ 'เหลียนกัง: "เจ้ามาแล้ว ข้ายืนที่นี่ตั้งแต่ศึกจบ ข้าไม่ได้รอเจ้าเพื่อสอนอะไร ข้ารอเจ้าเพื่อส่ง"', 'เหลียนกัง: "ปัจฉิมไม่ใช่ดินแดนที่ข้าดูแล ข้ารู้เพียงว่าทางไปนั้นไม่เหมือนที่นี่ เจ้าพร้อมจะไปแล้วหรือไม่"' ],
  firstEn:[ 'Lian Gang: "You have come. I have stood here since the fight ended. I did not wait to teach you anything. I waited to see you off."', 'Lian Gang: "The West is not a land I keep. I only know the road there is not like this one. Are you ready to go?"' ],
  go:{ th:'พร้อมครับ', en:'I am ready' }, wait:{ th:'ขอเตรียมตัวก่อน', en:'Let me prepare first' },
  notYet:[ 'ยามา: "ขอผมเตรียมตัวก่อนครับท่าน"', 'เหลียนกัง: "ข้ายืนอยู่ที่นี่ ท่าเรือไม่หนีไปไหน"' ],
  notYetEn:[ 'Yama: "Give me a moment to prepare, General."', 'Lian Gang: "I will be here. The harbor is not going anywhere."' ],
  again:[ { th:'เหลียนกัง: "การเตรียมตัวไม่ใช่การถอย"', en:'Lian Gang: "Preparing is not retreating."' },
          { th:'เหลียนกัง: "ข้าเคยเห็นคนที่รีบไปจนลืมสิ่งที่ต้องพก ไม่ต้องรีบ"', en:'Lian Gang: "I have seen men hurry and forget what they needed to carry. Do not hurry."' } ],
  later:{ th:'ไว้คราวหน้า', en:'Later' },
  /** after the gift: what he says when tapped (he stays at the harbor for good) */
  after:[ { th:'เหลียนกัง: "ไป แล้วกลับมาเล่าให้ข้าฟังว่าปัจฉิมหนาวแค่ไหน"', en:'Lian Gang: "Go. And come back and tell me how cold the West is."' } ],
});

// ---- 4.5 the gift scene (3 pages) = the guide system's `welcome` of Zone 2 ----
const page = (image, title, line, en) => ({ image, title, line, fallback:'📜', en });
export const HARBOR_STORIES = Object.freeze({
  [HARBOR.giftStory]:{ title:'ของฝากจากแม่ทัพ', en:{ title:'A Gift from the General' }, pages:[
    page(ART.gift, 'ข้าไม่มีอะไรมาก',
      'บรรยาย: เหลียนกังปลดห่อผ้าจากอานม้าที่ผูกอยู่ใกล้ท่า ยื่นให้ยามาพร้อมถุงเงินใบเล็กด้วยสองมือ ตรวนเหล็กที่เอวสั่นเบา ๆ ตามจังหวะของเกราะ\n'
      + 'เหลียนกัง: "ชุดปัจฉิมกับเงินแปดร้อยเบี้ย ข้าไม่มีอะไรมากกว่านี้ ที่นั่นหนาว ผ้าของบูรพาบางเกินไป ข้าไม่อยากให้ผู้ถือบัญชีที่ยืนทนตรวนข้าได้ มาแข็งตายเพราะลม"\n'
      + 'ยมบาทน้อย: "ผมขอบพระคุณครับท่าน"\n'
      + 'นิรา: "ดิฉันขอบันทึกว่า ของฝากนี้ไม่มีเงื่อนไขค่ะ"\n'
      + 'เหลียนกัง: "ไม่มี"',
      { title:'I Have Little', line:
        'Narration: Lian Gang unties a bundle from a saddle tethered near the pier and hands it to Yama with a small purse, both hands. The iron chain at his waist trembles softly with the rhythm of his armour.\n'
      + 'Lian Gang: "Robes of the West, and eight hundred coins. I have nothing more to give. It is cold there, and the cloth of the East is too thin. I do not want a keeper of the ledger who could stand under my chain to freeze to death in a wind."\n'
      + 'Yama: "I thank you, General."\n'
      + 'Nira: "I note, for the record, that this gift carries no conditions."\n'
      + 'Lian Gang: "None."' }),
    page(ART.gift, 'ระหว่างทางมีสัตว์ร้าย',
      'เหลียนกัง: "ฟังข้า ระหว่างทางไปปัจฉิมมีสัตว์ร้ายอยู่สองแห่ง ในถ้ำกลางชายแดนมีผู้ถือสายน้ำ มันไม่ใช่สัตว์ธรรมดา ข้าไม่ได้ขอให้เจ้าฆ่ามัน ข้าขอให้เจ้าอย่าลืมว่าเจ้าเป็นผู้บุกรุก"\n'
      + 'เหลียนกัง: "ที่ปลายทางมีผู้พิทักษ์ประตูสามเศียร ไม่เคยยอมเปิดให้ใครด้วยคำพูด จงตั้งสติ เจ้าไม่ต้องชนะมันด้วยความแรง เจ้าต้องไม่ถอย"\n'
      + 'ยมบาทน้อย: "ผมจะจำไว้ครับ"',
      { title:'Beasts on the Road', line:
        'Lian Gang: "Listen. On the road to the West there are two beasts. In the cave halfway along the frontier lives a keeper of the waters. It is no ordinary beast. I do not ask you to kill it. I ask you not to forget that you are the one trespassing."\n'
      + 'Lian Gang: "At the end of the road is a three-headed guardian of the gate. It has never opened for anyone because of words. Steady yourself. You do not need to beat it by strength. You need only not to retreat."\n'
      + 'Yama: "I will remember."' }),
    page(ART.gift, 'ผู้ที่ข้าไว้ใจ',
      'บรรยาย: ชายร่างเรียบในเสื้อคลุมสีหมึก ผมรวบหลวม ๆ เดินออกมาจากเงาของเสาท่า เอวสองข้างมีดาบยาวและดาบสั้นประกบกันอย่างเรียบร้อย เขาไม่เอ่ยก่อน เพียงก้มศีรษะให้เหลียนกังและยามาอย่างละครั้ง\n'
      + 'เหลียนกัง: "คนที่ข้าไว้ใจที่สุดในบูรพา ไม่ใช่ลูกน้องข้า เป็นคนเดียวที่ไม่เคยเกรงตรวนของข้า มูซาชิ ไปกับพวกเขา"\n'
      + 'มูซาชิ: "ข้ารับคำ แม่ทัพ ข้าพาท่านยมบาทน้อยและแม่นิราไปถึงประตูปัจฉิม ข้ารับปากน้อย แต่เมื่อรับแล้วข้ารักษาคำ"\n'
      + 'มูซาชิ: "ท่านยมบาทน้อย ข้าชื่อมูซาชิ ดาบของข้าฟันน้อยกว่าที่เสียงลือบอก ข้าจะดูก่อนเสมอ ท่านไม่ต้องเกรง"\n'
      + 'เหลียนกัง: "ไป แล้วกลับมาเล่าให้ข้าฟังว่าปัจฉิมหนาวแค่ไหน"\n'
      + 'บรรยาย: เหลียนกังปลดตรวนวงเล็กจากเข็มขัดห่วงหนึ่ง ถือไว้ในมือครู่หนึ่ง แล้ววางลงเหนือตะเกียงวิเศษของยามา ห่วงนั้นละลายเป็นประกายแสงสีเหล็กเข้าไปในตะเกียง ไส้อีกดวงสว่างขึ้นด้วยเปลวสีเทาเงินนิ่ง',
      { title:'The One I Trust', line:
        'Narration: A man in a plain ink-coloured coat, his hair tied loosely back, steps out of the shadow of a pier post. A long sword and a short sword sit paired at his waist, neatly. He does not speak first. He only bows once to Lian Gang and once to Yama.\n'
      + 'Lian Gang: "The man I trust most in the East. Not my soldier. The only one who never feared my chain. Musashi, go with them."\n'
      + 'Musashi: "I accept, General. I will take Lord Yama and Miss Nira to the gate of the West. I promise little, but what I promise I keep."\n'
      + 'Musashi: "Lord Yama, I am Musashi. My blade cuts less than rumour says. I will always watch first. You need not be wary of me."\n'
      + 'Lian Gang: "Go. And come back and tell me how cold the West is."\n'
      + 'Narration: Lian Gang unclips a small ring of chain from his belt, holds it a moment, then lays it over Yama\'s Magic Lamp. The ring melts into sparks of iron-grey light and sinks into the lamp. Another wick glows with a still, silver-grey flame.' }),
  ] },
});

/** 4.6 helper no. 5 */
export const LIANGANG_HELPER = Object.freeze({
  name:{ th:'เหลียนกัง', en:'Lian Gang' },
  move:{ name:{ th:'ตรวนกั้นแถว', en:'Chain Line' },
    desc:{ th:'เหลียนกังโยนห่วงตรวนเป็นแนวกั้นระหว่างทีมกับศัตรู ศัตรูทั้งหมดถูกชะลอและโจมตีอ่อนลง 1 รอบ', en:'Lian Gang throws links of chain into a line between the team and the foe. Every enemy is slowed and strikes more weakly for one round.' } },
  say:{ call:{ th:'เหลียนกัง: "ข้าเห็นว่าเจ้าต้องการแถว ข้ามายืนในแถวให้"', en:'Lian Gang: "I see you need a line. I will stand in it."' },
    use:{ th:'เหลียนกัง: "ตรวนนี้ไม่ได้ล่ามเจ้า มันกั้นพวกมัน!"', en:'Lian Gang: "This chain does not bind you. It holds them back!"' },
    end:{ th:'เหลียนกัง: "ข้ามาตามที่ให้คำ ที่เหลือเป็นของเจ้า"', en:'Lian Gang: "I came as I gave my word. The rest is yours."' } },
});
/** Musashi as the guest of the walk (name for the team list / the fight; sprite key for the walk + the team strip) */
export const MUSASHI = Object.freeze({ name:'มูซาชิ', nameEn:'Musashi', artKey:ART.musashi, profile:ART.musashiProfile });
