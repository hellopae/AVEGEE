// T5'/4-5 · The gate of Zone 2 (Rae R2 A sections 7 and 8): Guan Yu will not let Yama pass until he has seen him fight; he then keeps the eastern gate as Zone 2's Guard;
// Yomathat hands over the Zone 2 robes and 800 coins, leaves the team ("the east is not his district") and leaves a flame in the lamp (helper no. 3).
// Text: Rae R2 part A (Output/Rae/2026-11-19-avegee-r2a-zone1-2.md). Thai lines as written; windows carry her English. Keys: `z2-guanyu-open` · `z2-guanyu-win` · `z2-guanyu-lose` · `guanyu` (boss moves) ·
// `boss-guide-th-farewell` = Rae's `z2-yomathat-gift` (the guide system's own key for Zone 1's farewell, so the grant / outfit / "he leaves the team" rules of src/boss-guides.js stay in use).
export const GATE = Object.freeze({ eventKey:'z2Gate', arriveNotice:'z2-guanyu-gate', guardNotice:'z2-guanyu-guard', giftNotice:'z2-yomathat-gift-received', flameNotice:'z2-yomathat-flame', giftStory:'boss-guide-th-farewell' });
export const GATE_GRANT = 800;
export const ART = Object.freeze({
  gate:'img/z2-events/cut-guanyu-gate-asia.webp', yields:'img/z2-events/cut-guanyu-yields-asia.webp', sweep:'img/z2-events/cut-guanyu-sweep-asia.webp',
  sprite:'img/z2-events/boss-guanyu-asia.webp', portrait:'img/z2-events/boss-guanyu-asia-profile.webp', guard:'img/z2-events/boss-guanyu-asia-guard.webp',
  gift:'img/z2-events/cut-yomathat-gift-asia.webp', flameCut:'img/summon/cut-yomathat-flame-guard.webp',
});
const page = (image, title, line) => ({ image, title, line, fallback:'📜' });

export const GATE_TEXT = Object.freeze({
  title:{ th:'ผู้เฝ้าประตูบูรพา', en:'The Keeper of the Eastern Gate' },
  alert:{ th:'ประตูบูรพามีผู้เฝ้าอยู่ เขายืนหันหน้าเข้าหาท่านและไม่ขยับหลบ ยมทัตกระซิบว่าเขาไม่ฟังคำของใครนอกจากคำสัตย์ของตัวเอง เตรียมทีมให้พร้อม', en:'The eastern gate has a keeper. He faces you and does not step aside. Yomathat whispers that he listens to no one but his own sworn word. Ready your team.' },
  go:{ th:'เข้าไปพบ', en:'Approach' }, retry:{ th:'สู้อีกครั้ง', en:'Try again' },
  banner:{ th:'ศึกประตูบูรพา · กวนอู', en:'Battle at the Eastern Gate · Guan Yu' },
  win:{ title:'กวนอูยอมรับ', text:'กวนอูผู้เฝ้าประตูบูรพายอมรับท่านแล้ว ประตูเปิดให้ท่านผ่าน', button:'ต่อ',
    en:{ title:'Guan Yu Accepts You', text:'Guan Yu, keeper of the eastern gate, has accepted you. The gate opens.', button:'Continue' } },
  lose:{ title:'กวนอูรอท่านอยู่', text:'กวนอูลดง้าวลงก่อน ท่านตั้งหลักแล้วลองอีกครั้งได้', button:'สู้อีกครั้ง',
    en:{ title:'Guan Yu Waits', text:'Guan Yu lowers his blade. Steady yourself and try again.', button:'Try again' } },
  guard:{ title:'กวนอูเป็นผู้เฝ้าด่านบูรพา', text:'กวนอูจะยืนเฝ้าด่านบูรพาในนามของท่าน เรียกใช้ได้เหมือนผู้เฝ้าด่านของโซนอื่น เวลาพักระหว่างการเรียกคือ 1 นาที', button:'รับทราบ',
    en:{ title:'Guan Yu Keeps the East for You', text:'Guan Yu will guard the east in your name. Call on him like the gate guards of other zones. The wait between calls is 1 minute.', button:'Understood' } },
  lines:{ start:'กวนอู: "ข้าไม่ลดมือ เพราะข้าไม่อยากให้ท่านคิดว่าข้าออมแรง"', half:'กวนอู: "ท่านยืนได้นานกว่าที่ข้านึก ฟันที่สองข้าไม่ถอยแล้ว"' },
  yomathatLine:'ยมทัต: "ลุยเลยน้อง พี่อยู่ข้างหลัง"',
});
export const GATE_NOTICES = Object.freeze({
  // NG-1 (the notice that comes with the alert before the scene)
  [GATE.arriveNotice]:{ title:GATE_TEXT.title.th, text:GATE_TEXT.alert.th, button:GATE_TEXT.go.th, art:ART.portrait, en:{ title:GATE_TEXT.title.en, text:GATE_TEXT.alert.en, button:GATE_TEXT.go.en } },
  // NG-4 (comes on the first day in Zone 2, when he stands at the gate as the Guard)
  [GATE.guardNotice]:{ ...GATE_TEXT.guard, art:ART.portrait },
  // NY-4 (after the gift scene; NY-3 "A gift from your brother" is the grant receipt of src/boss-guides.js - Thai text there, the receipt window has no English yet)
  [GATE.flameNotice]:{ title:'ยมทัตฝากไฟไว้ในตะเกียง', text:'ยมทัตออกจากทีมเพราะสาขาบูรพาไม่ใช่เขตของเขา เขาฝากไฟไว้ในตะเกียงวิเศษ ท่านเรียกเขาในศึกได้ ท่าไม้ตายใช้ได้ 3 ครั้งก่อนต้องเติมพลังที่หอกระจก', button:'ดูตะเกียง', openLamp:true,
    en:{ title:'Yomathat Leaves a Flame in the Lamp', text:'Yomathat leaves the team because the eastern branch is not his jurisdiction. He leaves a flame in the Magic Lamp. You can call him in battle, 3 special moves before a recharge at the Mirror Tower.', button:'See the Lamp' } },
});

export const GATE_STORIES = Object.freeze({
  'z2-guanyu-open':{ title:'ผู้เฝ้าประตูบูรพา', pages:[
    page(ART.gate, 'ข้าชื่อกวนอู',
      'บรรยาย: ประตูไม้แดงบานสูงของบูรพาตั้งตระหง่านอยู่กลางหมอกบาง ๆ หน้าประตูมีชายร่างสูงใหญ่ใบหน้าแดงเข้ม เคราดำยาวเกือบถึงอก สวมเกราะและเสื้อคลุมสีเขียวเข้มลายมังกร มือหนึ่งถือง้าวด้ามยาวปลายโค้งตั้งตรงกับพื้น เขาไม่ขยับแม้ลมจะพัดชายเสื้อคลุม\n'
      + 'กวนอู: "ผู้ถือบัญชีแห่งสุวรรณภูมิ ข้าชื่อกวนอู ข้าเฝ้าประตูบูรพานี้ ผู้ใดจะผ่าน ต้องผ่านข้าก่อน"\n'
      + 'ยมทัต: "กวนอู พี่ขออนุญาตพาน้องชายข้ามผ่านด้วยกัน"\n'
      + 'กวนอู: "ท่านยมทัต ข้าให้เกียรติท่าน แต่ข้าไม่เปิดทางเพราะเกียรติของใคร ข้าเปิดเมื่อข้าเชื่อ"'),
    page(ART.gate, 'ประตูที่ถูกเปิดจากข้างใน',
      'กวนอู: "ข้าเคยเฝ้าเมืองหนึ่ง ประตูเมืองไม่เคยถูกบุกจากข้างนอก มันถูกเปิดจากข้างใน โดยคนที่ข้าฝากเมืองไว้ นับแต่นั้นมา ข้าไม่เชื่อสิ่งใดที่ข้ายังไม่เห็น"\n'
      + 'กวนอู: "ท่านถือบัญชีตัดสินวิญญาณ ผู้ที่ถือของหนักเช่นนั้น ต้องมีคำสัตย์ของตนเอง ท่านสาบานสิ่งใดไว้"\n'
      + 'ยมบาทน้อย: "ผมสาบานว่าจะอ่านทุกบรรทัดให้จบก่อนตัดสินครับ ไม่ว่าคนที่ยืนอยู่ตรงหน้าจะเป็นใคร"\n'
      + 'นิรา: "ท่านคะ ดิฉันขอยืนยัน ท่านไม่เคยข้ามบรรทัดสุดท้ายเลยค่ะ"'),
    page(ART.gate, 'จงแสดงให้ข้าเห็น',
      'กวนอู: "คำสัตย์ที่ทำได้ทุกวัน เป็นคำสัตย์ที่ดี แต่คำพูดกับมือต่างกัน ข้าเชื่อมือ"\n'
      + 'บรรยาย: กวนอูยกง้าวขึ้นจากพื้นหนึ่งชั่วลมหายใจ เสียงลมแหวกอากาศดังขึ้นก่อนที่ใครจะเห็นใบมีด เขาตั้งท่าแล้ว ยืนนิ่งเหมือนภูเขา\n'
      + 'กวนอู: "ข้าไม่ถือว่าท่านเป็นศัตรู แต่ข้าไม่ลดมือ จงแสดงให้ข้าเห็นว่าคำสัตย์ของท่านหนักแค่ไหน"'),
  ] },
  'z2-guanyu-win':{ title:'กวนอูยอมรับ', pages:[
    page(ART.yields, 'ข้าเห็นแล้ว',
      'บรรยาย: กวนอูหยุดง้าวกลางอากาศ ลดปลายลงช้า ๆ แล้วปักด้ามลงที่พื้น เขาประสานมือหน้าอก ก้มศีรษะให้ยามาหนึ่งครั้ง\n'
      + 'กวนอู: "พอแล้ว ข้าเห็นแล้ว ท่านไม่ละคำที่พูดไว้เลยแม้ตอนข้าฟันแรงที่สุด ข้าไม่ยอมรับท่านเพราะข้าแพ้ ข้ายอมรับเพราะท่านไม่ปล่อยมือจากคำสัตย์ของท่าน"'),
    page(ART.yields, 'ข้าจะเฝ้าให้ท่าน',
      'กวนอู: "ตั้งแต่วันนี้ ข้าจะเฝ้าประตูบูรพาแทนท่าน ท่านจะเรียกข้าเมื่อใด ข้าจะมา ข้าขอเพียงอย่างเดียว อย่าให้ผู้ใดเปิดประตูนี้จากข้างใน"\n'
      + 'ยมบาทน้อย: "ผมสัญญาครับ"\n'
      + 'บรรยาย: กวนอูถอยไปยืนข้างประตู ใช้ง้าวผลักบานประตูไม้แดงให้เปิดออกเพียงพอให้คนเดินผ่านได้ ลมจากบูรพาพัดเข้ามา กลิ่นไม้ไผ่และดินชื้น'),
  ] },
  'z2-guanyu-lose':{ title:'กวนอูรอท่านอยู่', pages:[
    page(ART.yields, 'ลุกเถิด', 'กวนอู: "ลุกเถิด ข้าไม่ฟันผู้ที่ล้ม ตั้งหลักแล้วมาใหม่ ข้ายืนรออยู่ที่ประตู"'),
  ] },
});
/** 8.3 the gift scene. The guide system plays it as Zone 1's farewell (`boss-guide-th-farewell`); `z2-yomathat-gift` is Rae's own key for the same scene. */
const giftStory = Object.freeze({ title:'ของฝากจากพี่', pages:[
  page(ART.gift, 'ก่อนเข้าประตู',
    'บรรยาย: ประตูแดงบานสูงเปิดออกครึ่งหนึ่ง ลมกลิ่นไผ่พัดผ่านช่องว่าง ยมทัตหยิบห่อผ้าและถุงเงินใบเล็กออกมาจากอกเสื้อ ยื่นให้ยามาด้วยสองมือ\n'
    + 'ยมทัต: "ชุดบูรพาของน้อง พี่เตรียมไว้ตั้งแต่ก่อนศึก กับเงินแปดร้อยเบี้ย ที่นั่นไม่มีใครรู้จักน้อง น้องต้องซื้อทุกอย่างด้วยมือตัวเอง"\n'
    + 'ยมบาทน้อย: "พี่ ผมไม่ได้ขอ—"\n'
    + 'ยมทัต: "ไม่ต้องขอ พี่ให้"'),
  page(ART.gift, 'ที่นี่ไม่ใช่เขตพี่',
    'ยมทัต: "พี่ไปต่อไม่ได้ น้องจำเรื่องสาขาได้ใช่ไหม ผู้ตรวจการมีเขตที่ตนดูแล บูรพาเป็นเขตอื่น ถ้าพี่เดินเข้าไป พี่จะกลายเป็นผู้บุกรุกในสายตาคนที่นั่น"\n'
    + 'ยมทัต: "พี่ต้องกลับไปรายงานพ่อ ตรวจสาขา และเรื่องทัณฑสูรที่ถ้ำนั้น พี่ยังไม่ลืม พี่จะหาทางเอง ตามที่บอกไว้"\n'
    + 'นิรา: "ดิฉันจะดูแลท่านยมบาทน้อยให้ค่ะ ท่านยมทัต"\n'
    + 'ยมทัต: "ฝากด้วย แม่นิรา"'),
  page(ART.gift, 'เรียกพี่เมื่อต้องการ',
    'บรรยาย: ยมทัตวางฝ่ามือเหนือตะเกียงวิเศษที่ห้อยข้างเอวยามา เปลวสีแดงส้มของดาบเพลิงไหลลงมาจากข้อมือ จุดไส้ตะเกียงอีกดวงหนึ่ง เปลวสีแดงนิ่งสนิท ไม่ร้อนกับมือใครเลย\n'
    + 'ยมทัต: "น้องไปที่ใด พี่ไปไม่ได้ แต่ถ้าน้องจุดตะเกียงนี้แล้วเรียกพี่ พี่จะมา ไม่ว่าน้องจะอยู่ที่ใดของเมืองนรก"\n'
    + 'ยมทัต: "ไปเถอะ พี่ไม่ได้ลาเพราะเราจะไม่เจอกันอีก พี่ลาเพราะมีงานต้องทำ"\n'
    + 'ยมบาทน้อย: "ครับพี่ ผมจะใช้อย่างระวัง"\n'
    + 'บรรยาย: ยามากับนิราเดินผ่านประตูเข้าสู่บูรพา ยมทัตยืนมองตามจนประตูแดงปิดลงช้า ๆ ด้านหลังทั้งสอง'),
] });
export const GATE_ALL_STORIES = Object.freeze({ ...GATE_STORIES, [GATE.giftStory]:giftStory, 'z2-yomathat-gift':giftStory });

/** 8.4 helper no. 3 - Yomathat. A heavy single hit, then he stands before the team: every teammate takes less damage until their next turn (the existing "defend" rule). */
export const YOMATHAT_HELPER = Object.freeze({
  name:{ th:'ยมทัต', en:'Yomathat' },
  move:{ name:{ th:'ดาบเพลิงคุ้มน้อง', en:"Flame Blade, Brother's Guard" },
    desc:{ th:'ยมทัตชักดาบเพลิงฟันเดี่ยวหนักใส่ศัตรูตัวหนึ่ง แล้วยืนบังหน้าทีม ลดความเสียหายที่ทีมได้รับ 1 รอบ', en:'Yomathat cuts one foe with a heavy flame-blade strike, then stands before the team, reducing the damage they take for one round.' } },
  say:{ call:{ th:'ยมทัต: "น้อง พี่มาแล้ว หลบหลังพี่"', en:'Yomathat: "Brother, I am here. Get behind me."' },
    use:{ th:'ยมทัต: "พี่ไม่ออมมืออีกแล้ว!"', en:'Yomathat: "I will not hold back any more!"' },
    end:{ th:'ยมทัต: "ไฟพี่เหลือเท่านี้ ดูแลตัวเอง"', en:'Yomathat: "That is all my flame allows. Look after yourself."' } },
});
