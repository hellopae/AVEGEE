// T5'/2-3 · Yomathat (the elder brother, Zone 1's boss) waits at the harbor and asks to go with Yama; the walk to Border 1-2 and the cage in the cave (Rae R2 A sections 5 and 6).
// Text: Rae R2 part A (Output/Rae/2026-11-19-avegee-r2a-zone1-2.md). Thai lines are copied as written; the windows carry her English too. Replaces the old T5 (boss waits at the gate).
// Keys: `z1-yomathat-wait` (the scene after the win - it IS the Zone 1 "praise" beat of src/boss-guides.js, `boss-guide-th-praise`) · `boss-guide-th-welcome` (the answer "together") ·
// `z1-frontier12-father` (the cave) · notices NY-1 / NY-2 / NF-1 / the reminder of 5.6.
export const YOMATHAT = Object.freeze({ waitNotice:'z1-yomathat-wait', joinNotice:'z1-yomathat-join', caveNotice:'z1-frontier12-cave', remindNotice:'z1-yomathat-remind', fatherStory:'z1-frontier12-father',
  pierSeen:'z1-yomathat-pier' });
export const ART = Object.freeze({
  harbor:'img/z1-events/cut-yomathat-harbor-th.webp',   // D1
  cage:'img/z1-events/cut-frontier12-cage-th.webp',     // E1
  stop:'img/z1-events/cut-frontier12-stop-th.webp',     // E2
  portrait:'img/boss-guide/th-welcome-v1.webp',
});
const page = (image, title, line) => ({ image, title, line, fallback:'📜' });

export const YOMATHAT_STORIES = Object.freeze({
  // 5.3 - after the win; he goes to wait at the harbor (replaces the old "praise" line)
  'boss-guide-th-praise':{ title:'พี่รอที่ท่าเรือ', pages:[
    page(ART.harbor, 'พี่รอน้องที่ท่าเรือ',
      'บรรยาย: ยมทัตสอดดาบเพลิงกลับเข้าฝัก ยืนนิ่งมองน้องชายอยู่ครู่หนึ่ง ก่อนเอ่ยด้วยเสียงต่ำที่แทบไม่ผิดไปจากเวลาสั่งงาน\n'
      + 'ยมทัต: "พี่ตรวจสาขาแล้ว ได้เห็นของจริงแล้ว พี่ไม่มีอะไรจะสอนเพิ่ม"\n'
      + 'ยมทัต: "ดินแดนข้างหน้าไม่ได้ใจดีเหมือนที่นี่ พี่จะรอที่ท่าเรือ เมื่อน้องพร้อม มาหาพี่"'),
  ] },
  // 5.4 - the answer "together" (the scene the guide system calls `welcome`): he joins, then they walk
  'boss-guide-th-welcome':{ title:'ไปด้วยกัน', pages:[
    page(ART.harbor, 'ไปด้วยกันครับ พี่',
      'ยามา: "ไปด้วยกันครับ พี่"\n'
      + 'ยมทัต: "ดี แต่พี่ขอไว้ข้อเดียว ถ้าพี่ห้ามอะไร น้องฟังพี่ก่อนครั้งเดียว ที่เหลือพี่ไม่ก้าวก่าย"\n'
      + 'นิรา: "ดิฉันจดไว้แล้วค่ะ ท่านคะ ทั้งสองข้อ"'),
  ] },
  // 6.3 - the cave
  [YOMATHAT.fatherStory]:{ title:'ผู้ที่ทำงานไม่สำเร็จ', pages:[
    page(ART.cage, 'กรงเหล็กกลางถ้ำ',
      'บรรยาย: ลึกเข้าไปในถ้ำ แสงคบไฟสีส้มส่องให้เห็นกรงเหล็กสนิมที่ตั้งอยู่กลางลานหิน ทัณฑสูรนั่งขัดสมาธิอยู่ข้างใน กระบองหนามถูกวางไว้นอกกรง รอยช้ำเรียงบนไหล่และแขน เขาไม่เงยหน้าเมื่อเห็นยามา\n'
      + 'ทัณฑสูร: "ตัวกระเปี๊ยก ... ไม่ต้องมามอง ข้าไม่ได้ต้องการให้ใครมาเห็น"\n'
      + 'บรรยาย: ร่างสูงใหญ่คลุมเสื้อคลุมยาวสีดำสนิทยืนอยู่ข้างกรง เงาของเขาทอดยาวทับพื้นถ้ำจนเกือบถึงรองเท้าของยามา เขาไม่ได้หันมา'),
    page(ART.cage, 'ข้าไม่เรียกว่าลูก',
      'บิดาของทัณฑสูร: "ผู้ที่ถือบัญชีแห่งสุวรรณภูมิ ท่านมาถึงเร็วกว่าที่ข้าคาด ข้าไม่ได้ขวางทางท่าน นี่เป็นเรื่องในบ้านของข้า"\n'
      + 'บิดาของทัณฑสูร: "ข้าส่งเขาไปคุมทัพที่ชายแดนด้วยงานเดียว คือบุกให้สำเร็จ เขากลับมาโดยมีหมายตัดสินในมือ ข้าไม่เรียกผู้ที่ทำงานไม่สำเร็จว่าลูก ข้าเรียกว่าผู้ที่ยังต้องเรียนรู้"\n'
      + 'ยมบาทน้อย: "ท่านครับ เขารับโทษตามหมายครบแล้วครับ การลงโทษซ้ำโดยไม่ผ่านศาล—"\n'
      + 'บิดาของทัณฑสูร: "ไม่ใช่โทษตามหมาย ข้าไม่ได้ลงโทษ ข้าอบรม นี่คือบ้านของข้า ศาลของท่านไม่มีหมายมาถึงที่นี่"'),
    page(ART.stop, 'ครั้งเดียวที่พี่ขอ',
      'บรรยาย: ยามาก้าวไปข้างหน้าหนึ่งก้าว ฝ่ามือที่หนักและอุ่นวางลงบนไหล่เขาจากด้านหลัง\n'
      + 'ยมทัต: "น้อง หยุด นี่คือครั้งเดียวที่พี่ขอ"\n'
      + 'ยมบาทน้อย: "พี่ แต่เขา—"\n'
      + 'ยมทัต: "พี่รู้ พี่เห็นเหมือนกัน พี่เติบโตมากับความเข้มงวดแบบนี้ แต่ถ้าน้องก้าวเข้าไปตอนนี้ น้องจะเป็นผู้บุกบ้านเขา ไม่ใช่ผู้ตัดสิน ให้พี่ไปส่งน้องที่ประตูก่อน ที่เหลือพี่จะหาทางเอง"\n'
      + 'ทัณฑสูร: "...ตัวกระเปี๊ยก ไปได้ ข้าไม่ต้องการให้ใครสงสาร"\n'
      + 'บรรยาย: ยามากำหมัดแน่น แล้วคลายออกช้า ๆ เขาหันหลังเดินตามทางที่ยมทัตชี้ นิราเดินเป็นคนสุดท้าย หันไปมองกรงนั้นอีกครั้งก่อนลับโค้งถ้ำ'),
  ] },
});

export const YOMATHAT_NOTICES = Object.freeze({
  // NY-1 · after the win
  [YOMATHAT.waitNotice]:{ title:'พี่ชายรอท่านที่ท่าเรือ', text:'ยมทัตผู้เป็นพี่ชายยอมรับฝีมือท่านแล้ว เขารออยู่แถวท่าเรือ เตรียมทีมให้พร้อม แล้วเดินไปคุยกับเขา', button:'รับทราบ', art:ART.portrait,
    en:{ title:'Your Brother Waits at the Harbor', text:'Your elder brother Yomathat has acknowledged your skill. He is waiting near the harbor. Ready your team, then go and speak with him.', button:'Understood' } },
  // NY-2 · "together"
  [YOMATHAT.joinNotice]:{ title:'ยมทัตร่วมทีม', text:'ยมทัตเข้าร่วมทีมเดินทางไปดินแดนใหม่ ทีมของท่านคือ ยามา นิรา และยมทัต มุ่งหน้าสู่ชายแดน 1-2', button:'ออกเดินทาง', art:ART.portrait,
    en:{ title:'Yomathat Joins the Team', text:'Yomathat joins the journey to the new land. Your team is Yama, Nira, and Yomathat, heading for the Border 1-2.', button:'Set out' } },
  // NF-1 · deep in the cave
  [YOMATHAT.caveNotice]:{ title:'เสียงโลหะกระทบกันในถ้ำ', text:'จากลึกเข้าไปในถ้ำมีเสียงเหล็กกระทบกันและเสียงคนพูดต่ำ ๆ ท่านและยมทัตรู้สึกว่าเป็นเสียงที่คุ้นเคย เดินเข้าไปดู', button:'เดินเข้าไป',
    en:{ title:'Metal Clangs Within the Cave', text:'Deep in the cave, metal rings on metal and a low voice speaks. You and Yomathat feel the sound is familiar. Go in and see.', button:'Go in' } },
  // 5.6 · tried to leave without speaking to him
  [YOMATHAT.remindNotice]:{ title:'พี่ชายยังรอท่านอยู่', text:'พี่ชายยังรอท่านอยู่ที่ท่าเรือ ท่านควรคุยกับเขาก่อนออกเดินทางไปดินแดนใหม่', button:'รับทราบ', art:ART.portrait,
    en:{ title:'Your Brother Is Still Waiting', text:'Your brother is still waiting at the harbor. You should speak with him before you set out for the new land.', button:'Understood' } },
});

/** 5.4 the talk at the harbor (not a cutscene): what he says the first time, the two answers, and what he says when tapped again after "not yet". */
export const PIER_TALK = Object.freeze({
  first:[ 'ยมทัต: "น้อง พี่ไม่ถนัดพูดยาว พี่จะพูดสั้น ๆ พี่ขอไปกับน้องถึงประตูบูรพา ไม่ใช่เพราะพี่ห่วงฝีมือ พี่ห่วงที่ผู้เฝ้าประตูตรงนั้นไม่ฟังคำใครนอกจากคำสัตย์ของตัวเอง"', 'ยมทัต: "ว่าไง จะไปด้วยกันไหม"' ],
  firstEn:[ 'Yomathat: "Little brother, I am no good at long speeches, so I will be brief. I am asking to go with you as far as the gate of the east. Not because I doubt your skill. Because the one who keeps that gate listens to no one but his own sworn word."', 'Yomathat: "So. Shall we go together?"' ],
  go:{ th:'ไปด้วยกันครับ', en:'Let\'s go together' }, wait:{ th:'ขอเตรียมตัวก่อน', en:'Let me prepare first' },
  notYet:[ 'ยามา: "ขอผมเตรียมตัวก่อนครับ พี่"', 'ยมทัต: "พี่รออยู่ ไม่มีใครรีบพี่"' ],
  notYetEn:[ 'Yama: "Give me a moment to prepare, brother."', 'Yomathat: "I will be here. No one is rushing me."' ],
  again:[ { th:'ยมทัต: "พี่ไม่ได้นับเวลา"', en:'Yomathat: "I am not counting the time."' }, { th:'ยมทัต: "ถ้าลืมอะไร ไปเอาก่อนก็ได้ ท่าเรือไม่หนีไปไหน"', en:'Yomathat: "If you forgot something, go and fetch it. The harbor is not going anywhere."' } ],
  later:{ th:'ไว้คราวหน้า', en:'Later' },
});
/** 5.5 what he says on the walk when Yama speaks to him (the first line is the owner's lore note and may be cut). */
export const TRAVEL_LINES = Object.freeze([
  { th:'ยมทัต: "พ่อไม่เคยชมพี่เหมือนกัน แต่ไม่ใช่เรื่องที่พี่อยากให้น้องจำ"', en:'Yomathat: "Father never praised me either. But that is not something I want you to remember."' },
  { th:'ยมทัต: "ดาบเพลิงของพี่ไม่ร้อนกับคนที่พี่ไม่คิดทำร้าย ไม่ต้องเก็บไว้ห่างตัว"', en:'Yomathat: "My flame blade is not hot to anyone I do not mean to hurt. You need not keep your distance."' },
  { th:'ยมทัต: "แม่นิรา ฝากดูน้องให้ด้วย เขาลืมกินข้าวเวลาทำงานเพลิน"\nนิรา: "ค่ะ ท่านคะ ดิฉันจดไว้ในสมุดเล่มเดียวกับแฟ้มค้างแล้วค่ะ"', en:'Yomathat: "Miss Nira, please keep an eye on him. He forgets to eat when he is absorbed in work."\nNira: "Yes, sir. I have noted it in the same book as the pending files."' },
]);
/** 6.4 the caged Tanthasura, if he is still in the game after the scene (cut when the cage is empty). */
export const CAGE_LINES = Object.freeze([
  { th:'ทัณฑสูร: "...ข้าไม่ได้ขอให้ใครช่วย"', en:'Tanthasura: "...I did not ask for anyone\'s help."' },
  { th:'ทัณฑสูร: "ตัวกระเปี๊ยก ถ้าวันหนึ่งท่านอยากรู้ว่าเกียรติของข้ามาจากไหน ข้าไม่เล่า"', en:'Tanthasura: "Little runt, if one day you want to know where my pride comes from, I will not tell you."' },
]);
