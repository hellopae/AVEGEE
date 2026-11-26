// T6/5 · Border 2-3, the water cave: the dragon Ryujin is angry that nobody asked before entering; Musashi's special move closes the fight at ~25% HP; Ryujin leaves a flame in the lamp (Rae R2 part B, section 5).
// Team: Yama + Nira + Musashi (the guest of the walk, no fight with him). Keys: `z2Ryujin` (the event) · `z2-ryujin-open` · `z2-ryujin-musashi-strike` (mid-fight, HP ~ 25 %) · `z2-ryujin-win` · `z2-ryujin-lose` · `ryujin` (boss moves) · NR-1..4.
// The strike is a LIGHT across the dragon's body - no blood, no wound on the scales (Claudy's decision of 19 Nov, Rae 5.6 as corrected after Reese 4.1).
export const RYUJIN = Object.freeze({ eventKey:'z2Ryujin', arriveNotice:'z2-ryujin-cave', strikeStory:'z2-ryujin-musashi-strike', winStory:'z2-ryujin-win', helper:'ryujin', strikeAt:.25, checkpoint:1 });
export const ART = Object.freeze({
  open:'img/z2-events/cut-ryujin-open-asia.webp', yields:'img/z2-events/cut-ryujin-yields-asia.webp', tide:'img/z2-events/cut-ryujin-tide-asia.webp',
  sprite:'boss-ryujin-asia', portrait:'img/z2-events/boss-ryujin-asia-profile.webp', strike:'img/summon/cut-musashi-two-blades.webp',
  icon:'img/summon/icon-ryujin.webp', battle:'img/summon/battle-ryujin.webp', cut:'img/summon/cut-ryujin-dragon-beneath.webp',  // (R2, the cave background img/bg-cave-lake-asia.webp, is only in the art spec - the fight uses the default Zone 2 hall)
});

export const RYUJIN_TEXT = Object.freeze({
  // NR-1 the cave is reached
  arrive:{ title:'ถ้ำสายน้ำกลางชายแดน', text:'ในถ้ำมีทะเลสาบใต้ดินเรืองแสงสีน้ำเงิน ผิวน้ำสั่นไหวโดยไม่มีลม มูซาชิกระซิบว่าที่นี่มีผู้ที่ถือสายน้ำอยู่ ให้เดินด้วยความเคารพ', button:'เดินเข้าไป', art:ART.portrait,
    en:{ title:'The Water Cave at the Frontier', text:'A glowing blue underground lake fills the cave, its surface trembling though there is no wind. Musashi whispers that someone who holds the waters lives here. Walk with respect.', button:'Go in' } },
  title:{ th:'ศึกถ้ำสายน้ำ · ริวจิน', en:'Battle at the Water Cave · Ryujin' },   // NR-2 (the banner)
  alert:{ th:'ในถ้ำมีทะเลสาบใต้ดินเรืองแสงสีน้ำเงิน ผิวน้ำสั่นไหวโดยไม่มีลม มูซาชิกระซิบว่าที่นี่มีผู้ที่ถือสายน้ำอยู่ ให้เดินด้วยความเคารพ', en:'A glowing blue underground lake fills the cave, its surface trembling though there is no wind. Musashi whispers that someone who holds the waters lives here. Walk with respect.' },
  go:{ th:'เดินเข้าไป', en:'Go in' }, retry:{ th:'สู้อีกครั้ง', en:'Try again' },
  banner:{ th:'ศึกถ้ำสายน้ำ · ริวจิน', en:'Battle at the Water Cave · Ryujin' },
  // NR-3 win + unlock
  win:{ title:'ริวจินยอมรับ', text:'ริวจินฝากไฟไว้ในตะเกียงวิเศษ ท่านเรียกมังกรสายน้ำมาช่วยในศึกได้ เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม', button:'ดูตะเกียง',
    en:{ title:'Ryujin Accepts You', text:'Ryujin leaves a flame in the Magic Lamp. You can call the dragon of the waters in battle, once, and he stays in your team for 3 turns. When the flame is spent, recharge at the Mirror Tower.', button:'See the Lamp' } },
  // NR-4 lose
  lose:{ title:'ริวจินรอท่านอยู่', text:'ริวจินลดตัวลงสู่ผิวน้ำ ท่านตั้งหลักแล้วลองอีกครั้งได้', button:'สู้อีกครั้ง',
    en:{ title:'Ryujin Waits', text:'Ryujin lowers himself to the water\'s surface. Steady yourself and try again.', button:'Try again' } },
  // 5.4 lines in the fight
  lines:{ start:'ริวจิน: "จงเห็นความโกรธของสายน้ำ"', half:'ริวจิน: "ข้าไม่ได้โกรธที่เจ้ามา ข้าโกรธเพราะไม่มีใครถาม"' },
  linesEn:{ start:'Ryujin: "See the anger of the water."', half:'Ryujin: "I am not angry that you came. I am angry that no one asked."' },
  allyLines:{ musashiStart:{ th:'มูซาชิ: "ข้าจะดู"', en:'Musashi: "I will watch."' }, niraHalf:{ th:'นิรา: "ท่านคะ เขาไม่ได้พยายามให้ใครบาดเจ็บ คลื่นทุกลูกหลบผู้ที่ล้มค่ะ"', en:'Nira: "Sir, he is not trying to hurt anyone. Every wave goes around the one who has fallen."' } },
});
/** the strike is a light across the dragon: said once on the board too */
export const RYUJIN_STRIKE_LOG = 'มูซาชิ: "สองดาบหนึ่งวิถี" — ประกายเงินพาดผ่านริวจิน ไม่มีบาดแผล ริวจินหยุดนิ่ง';

/** 5.5 what Musashi says on the walk when tapped (random 1 of 4; line 2 may be cut) */
export const MUSASHI_TALK = Object.freeze([
  { th:'มูซาชิ: "ข้าไม่เคยนับว่าชนะกี่ครั้ง ข้านับแต่ว่าครั้งไหนที่ข้าเข้าใจจังหวะของศัตรูก่อนจะชัก"', en:'Musashi: "I have never counted how many times I won. I count only the times I understood my opponent\'s rhythm before I drew."' },
  { th:'มูซาชิ: "แม่ทัพเหลียนกังไม่เคยขอให้ข้าเป็นลูกน้อง เขาขอให้ข้ามาดูว่าตรวนของเขาใช้ถูกที่หรือไม่ ข้าดูมาสิบปีแล้ว ยังไม่เห็นว่าใช้ผิด"', en:'Musashi: "General Lian Gang never asked me to be his soldier. He asked me to come and watch whether his chain was used in the right place. I have watched for ten years and have not seen it misused."' },
  { th:'มูซาชิ: "แม่นิรา ที่ท่านจดอยู่ ท่านจดเสียงเท้าด้วยหรือ"\nนิรา: "จดค่ะ จังหวะก้าวของท่านสม่ำเสมอกว่าผู้ใดที่ดิฉันเคยบันทึก"', en:'Musashi: "Miss Nira, what you are writing, do you note the sound of footsteps too?"\nNira: "I do. Your stride is steadier than anyone I have ever recorded."' },
  { th:'มูซาชิ: "ท่านยมบาทน้อย ในถ้ำนี้ ข้าจะไม่ชักดาบก่อนท่าน ไม่ใช่เพราะข้ากลัวผู้ใด แต่เพราะนี่เป็นถ้ำของท่านที่ต้องผ่านไป"', en:'Musashi: "Lord Yama, in this cave I will not draw before you. Not because I fear anyone, but because this is the road you must walk."' },
]);

const page = (image, title, line, en) => ({ image, title, line, fallback:'📜', en });
export const RYUJIN_STORIES = Object.freeze({
  'z2-ryujin-open':{ title:'ผู้ถือสายน้ำ', en:{ title:'The Keeper of the Waters' }, pages:[
    page(ART.open, 'ถิ่นของน้ำ',
      'บรรยาย: ผิวทะเลสาบใต้ดินเริ่มนูนขึ้นช้า ๆ น้ำสีน้ำเงินหมุนเป็นเกลียวก่อนที่เกล็ดสีเขียวหยกจะโผล่พ้นผิวน้ำทีละแผ่น มังกรขนาดใหญ่ตัวยาวเหมือนสะพานโค้งขึ้นกลางถ้ำ หนวดยาวพลิ้วอยู่ในอากาศที่ไม่มีลม ไข่มุกสีขาวนวลลอยนิ่งอยู่ใต้คางของมัน\n'
      + 'ริวจิน: "ผู้ใดล่วงล้ำสายน้ำของข้า ถ้ำนี้เป็นของน้ำก่อนจะมีชายแดน ก่อนจะมีบัญชี ก่อนจะมีผู้ใดเดินผ่าน"\n'
      + 'มูซาชิ: "ข้าขออภัยท่านผู้ถือสายน้ำ เรามาโดยไม่ได้ส่งข่าวก่อน ข้ารู้ว่าเป็นความไม่งามของผู้เดินทาง"\n'
      + 'ริวจิน: "คำขออภัยของผู้เดินผ่านมีมานับพัน เจ้าขอหรือไม่ขอ ข้าก็ไม่ได้ยินต่างกัน"',
      { title:'The Land of Water', line:
        'Narration: The surface of the underground lake begins to swell slowly. The blue water turns in a spiral, and jade-green scales break the surface one plate at a time. A great dragon, long as a bridge, arches up in the middle of the cave, its whiskers streaming in air that has no wind. A pale white pearl hangs still beneath its jaw.\n'
      + 'Ryujin: "Who tramples the waters that are mine? This cave belonged to the water before there was a frontier, before there was a ledger, before anyone walked through."\n'
      + 'Musashi: "I ask pardon, keeper of the waters. We came without sending word first. I know it is a poor courtesy in a traveller."\n'
      + 'Ryujin: "Pardons from those who pass have come in their thousands. Whether you ask or not, I hear no difference."' }),
    page(ART.open, 'จงแสดงให้ข้าเห็น',
      'ยมบาทน้อย: "ผมไม่ได้มาแย่งถ้ำของท่านครับ ผมต้องผ่านไปยังปัจฉิม ถ้ามีวิธีผ่านโดยไม่รบกวนท่าน ผมยินดีทำตาม"\n'
      + 'ริวจิน: "ทุกผู้ที่ผ่านย่อมทิ้งรอยเท้าในน้ำข้า ข้าไม่ถามว่าเจ้าจะไปไหน ข้าถามว่าเจ้ารับผิดชอบรอยเท้านั้นได้หรือไม่ จงแสดงให้ข้าเห็น"\n'
      + 'บรรยาย: น้ำทั้งถ้ำยกตัวสูงขึ้น หางมังกรฟาดผิวน้ำจนคลื่นแตกกระจายเป็นละอองเรืองแสง มูซาชิวางมือบนด้ามดาบ แต่ยังไม่ชัก\n'
      + 'มูซาชิ: "ท่านยมบาทน้อย ข้าจะดูก่อน ข้าไม่ชักดาบจนกว่าจะถึงเวลา"',
      { title:'Show Me', line:
        'Yama: "I did not come to take your cave. I must pass through to the West. If there is a way through that does not trouble you, I will gladly follow it."\n'
      + 'Ryujin: "Everyone who passes leaves footprints in my water. I do not ask where you are going. I ask whether you can answer for those footprints. Show me."\n'
      + 'Narration: The water of the whole cave rises. The dragon\'s tail strikes the surface and the waves burst into glowing spray. Musashi rests his hand on the hilt of his sword, but does not draw.\n'
      + 'Musashi: "Lord Yama, I will watch first. I will not draw until the time comes."' }),
  ] },
  'z2-ryujin-musashi-strike':{ title:'สองดาบหนึ่งวิถี', en:{ title:'Two Blades, One Way' }, pages:[
    page(ART.strike, 'ถึงเวลา',
      'บรรยาย: ริวจินยกตัวขึ้นสูงสุด น้ำทั้งถ้ำรวมเป็นกำแพงเรืองแสงสูงกว่าเพดานก่อนจะเอนลงมาทับทีมที่ยืนอยู่ริมฝั่ง ยามาและนิราก้าวถอย\n'
      + 'มูซาชิ: "ท่านยมบาทน้อย ถอยไปหนึ่งก้าว ถึงเวลาแล้ว"\n'
      + 'บรรยาย: มูซาชิก้าวออกมายืนหน้าทีม ชักดาบยาวและดาบสั้นพร้อมกัน ไขว้ปลายไว้เหนือไหล่ ถ้ำเงียบลงทั้งที่น้ำยังเดือดอยู่เหนือหัว',
      { title:'The Time Has Come', line:
        'Narration: Ryujin rears to his full height. The water of the whole cave gathers into a glowing wall higher than the roof and leans down upon the team on the shore. Yama and Nira step back.\n'
      + 'Musashi: "Lord Yama, step back once. The time has come."\n'
      + 'Narration: Musashi steps out in front of the team and draws his long sword and short sword together, crossing their tips above his shoulder. The cave goes quiet even as the water boils overhead.' }),
    page(ART.strike, 'ฟันที่ไม่ฆ่า',
      'มูซาชิ: "สองดาบหนึ่งวิถี"\n'
      + 'บรรยาย: ประกายเงินสองสายพุ่งขึ้นตัดผ่านกำแพงน้ำจากสองทิศในจังหวะเดียว กำแพงน้ำแยกออกเป็นสองฟากและทรุดลงข้างทีมโดยไม่แตะใคร ประกายเงินสองสายพาดผ่านลำตัวมังกรเป็นเส้นแสงบางเส้นเดียว ไม่มีเลือด ไม่มีบาดแผลบนเกล็ด ริวจินชะงักนิ่งอยู่กลางอากาศ\n'
      + 'ริวจิน: "...เจ้าฟันข้า แต่ไม่ได้ฟันเพื่อฆ่า ข้าเห็นความต่าง"\n'
      + 'มูซาชิ: "ข้าฟันเพื่อหยุด ข้าไม่ฟันผู้ที่ควรได้รับความเคารพ"',
      { title:'A Cut That Does Not Kill', line:
        'Musashi: "Two Blades, One Way."\n'
      + 'Narration: Two silver streaks leap up and cut through the wall of water from two directions in a single beat. The wall splits to either side and collapses beside the team without touching anyone. The two silver streaks cross the dragon\'s coils as a single thin line of light. There is no blood and no wound on the scales. Ryujin halts in mid-air.\n'
      + 'Ryujin: "...You struck me, but not to kill. I see the difference."\n'
      + 'Musashi: "I cut to stop. I do not cut one who deserves respect."' }),
  ] },
  'z2-ryujin-win':{ title:'ริวจินยอมรับ', en:{ title:'Ryujin Accepts You' }, pages:[
    page(ART.yields, 'เห็นรอยเท้า',
      'บรรยาย: ริวจินลดตัวลงสู่ผิวน้ำอย่างช้า ๆ น้ำที่เดือดสงบลงเป็นกระจกสีน้ำเงิน มังกรหุบหนวด ก้มศีรษะลงจนปลายจมูกเกือบแตะน้ำ\n'
      + 'ริวจิน: "เจ้ายืนอยู่หลังผู้ที่ฟันเพื่อหยุด และเจ้าไม่ถอยแม้น้ำของข้าท่วมถึงเข่า ข้าเห็นรอยเท้าของเจ้าในน้ำของข้าแล้ว มันเป็นรอยที่คนเดินด้วยความเคารพ"\n'
      + 'นิรา: "ท่านคะ ดิฉันขอบันทึกว่า ท่านทำให้มังกรสงบโดยไม่ต้องทำให้มังกรเสียหน้าค่ะ"',
      { title:'I Have Seen Your Footprints', line:
        'Narration: Ryujin lowers himself slowly to the surface. The boiling water settles into a mirror of blue. The dragon folds his whiskers and bows his head until the tip of his snout nearly touches the water.\n'
      + 'Ryujin: "You stood behind the one who cuts to stop, and you did not retreat though my water rose to your knees. I have seen your footprints in my water. They are the footprints of one who walks with respect."\n'
      + 'Nira: "Sir, I note for the record that you calmed a dragon without making the dragon lose face."' }),
    page(ART.yields, 'น้ำจะมาเมื่อถูกเรียก',
      'ริวจิน: "ข้าไม่ได้ให้ของแก่ผู้ใดมาหลายร้อยปี ข้ามอบไฟหนึ่งดวงจากไข่มุกของข้า จุดตะเกียงแล้วเรียกชื่อข้า น้ำจะมาเมื่อถูกเรียก"\n'
      + 'บรรยาย: ประกายสีน้ำเงินใสหยดหนึ่งหลุดจากไข่มุกใต้คางของมังกร ลอยข้ามผิวน้ำเข้าไปในตะเกียงวิเศษที่ห้อยข้างเอวยามา ไส้ตะเกียงอีกดวงสว่างด้วยเปลวสีน้ำเงินอ่อนที่สั่นไหวเหมือนผิวน้ำ\n'
      + 'ยมบาทน้อย: "ผมขอบพระคุณครับ ผมจะใช้อย่างเคารพ"\n'
      + 'ริวจิน: "ไปเถิด ทางข้างหน้ามีผู้พิทักษ์ที่ไม่ฟังเสียงน้ำ ข้าเตือนไว้เท่านี้"\n'
      + 'บรรยาย: มังกรจมลงสู่ผืนน้ำจนเหลือเพียงวงคลื่นกลมที่ขยายออกไปถึงริมฝั่ง',
      { title:'The Water Will Come When Called', line:
        'Ryujin: "I have not given anything to anyone for hundreds of years. I give you one flame from my pearl. Light your lamp and call my name. The water will come when it is called."\n'
      + 'Narration: A single clear drop of blue light slips free of the pearl beneath the dragon\'s jaw, drifts across the water and enters the Magic Lamp at Yama\'s side. Another wick glows with a pale blue flame that trembles like the surface of water.\n'
      + 'Yama: "I thank you. I will use it with respect."\n'
      + 'Ryujin: "Go. Ahead of you is a guardian who does not listen to the voice of water. That is all the warning I give."\n'
      + 'Narration: The dragon sinks into the lake until only a round ripple remains, spreading out to the shore.' }),
  ] },
  'z2-ryujin-lose':{ title:'ริวจินรอท่านอยู่', en:{ title:'Ryujin Waits' }, pages:[
    page(ART.yields, 'น้ำไม่ซ้ำเติม',
      'ริวจิน: "ลุกเถิด สายน้ำไม่ท่วมผู้ที่ล้ม ตั้งหลักแล้วมาใหม่ ข้ารออยู่ในน้ำ"\n'
      + 'บรรยาย: ระดับน้ำในถ้ำลดลงช้า ๆ จนผู้ที่ล้มลงยืนบนพื้นหินแห้งได้',
      { title:'The Water Does Not Pile On', line:
        'Ryujin: "Rise. The water does not drown one who has fallen. Steady yourself and come again. I wait in the water."\n'
      + 'Narration: The water in the cave slowly lowers until the fallen stand on dry stone.' }),
  ] },
});

/** 5.8 helper no. 6 (a strong group hit, the wave with the dragon's shadow in it) */
export const RYUJIN_HELPER = Object.freeze({
  name:{ th:'ริวจิน (มังกร)', en:'Ryujin (the Dragon)' },
  move:{ name:{ th:'มังกรสะท้านถ้ำ', en:'Dragon Beneath the Cave' },
    desc:{ th:'ริวจินยกคลื่นสีน้ำเงินจากพื้นสนามขึ้นซัดศัตรูทั้งหมดพร้อมกัน', en:'Ryujin raises a blue wave from the ground of the battlefield and crashes it over every foe at once.' } },
  say:{ call:{ th:'ริวจิน: "น้ำถูกเรียกแล้ว ชี้ทางมา"', en:'Ryujin: "The water is called. Show it the way."' },
    use:{ th:'ริวจิน: "จงเห็นกำลังของสายน้ำ!"', en:'Ryujin: "See the strength of the water!"' },
    end:{ th:'ริวจิน: "น้ำกลับลงสู่ถ้ำ ข้าไปก่อน"', en:'Ryujin: "The water returns to the cave. I go now."' } },
});
