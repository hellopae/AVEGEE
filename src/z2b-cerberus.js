// T6/6-7 · The western gate: Cerberus will not open for words - the fight, his bow, he stays on guard; Musashi's farewell at the gate and his flame (Rae R2 part B, sections 6 and 7).
// Cerberus does not speak (narration only, no quotation marks) and is NOT broken by a spell any more (Rae 6: the spell is Valdric's, part C). He is not the Guard of Zone 3 (that is Van Helsing, part C) and not a helper of the lamp:
// he is "the Guardian of the Western Gate" who stays by the gate and drives off any foe that comes near it (owner decision 15 Nov, item 4). Musashi leaves the team here (his promise to Lian Gang was only to bring them to this gate) and leaves a flame.
// Keys: `z3Cerberus` (the event) · `z3gate-cerberus-open` / `-win` / `-lose` · `z3gate-musashi-farewell` (= the guide system's farewell of Zone 2, `boss-guide-asia-farewell`) · NC-1..4 · NM-1.
// Pictures: C1 sprite + profile and the howl card are the existing drawings (img/z3-events); C2 / C3 / C4 / M4 are labelled placeholders.
export const CERBERUS = Object.freeze({ eventKey:'z3Cerberus', arriveNotice:'z3gate-cerberus-gate', winNotice:'z3gate-cerberus-won', openStory:'z3gate-cerberus-open', winStory:'z3gate-cerberus-win', loseStory:'z3gate-cerberus-lose', farewellStory:'boss-guide-asia-farewell', helper:'musashi', reach:150 });
export const ART = Object.freeze({
  sprite:'img/z3-events/boss-cerberus-gate-west.webp', portrait:'img/z3-events/boss-cerberus-gate-west-profile.webp', gate:'img/z3-events/cut-cerberus-gate-west.webp', yields:'img/z3-events/cut-cerberus-yields-west.webp',
  guard:'guard-cerberus-west', farewell:'img/z3-events/cut-musashi-farewell-west.webp',
  icon:'img/summon/icon-musashi.webp', battle:'img/summon/battle-musashi.webp', cut:'img/summon/cut-musashi-two-blades.webp',
});

export const CERBERUS_TEXT = Object.freeze({
  // NC-1 the gate is reached
  arrive:{ title:'ผู้พิทักษ์ประตูปัจฉิม', text:'ประตูปัจฉิมถูกหิมะกลบครึ่งบาน สุนัขสามเศียรขนาดใหญ่ยืนขวางกลางทางและไม่ขยับหลบ มูซาชิกระซิบว่ามันไม่เคยเปิดทางให้ใครด้วยคำพูด เตรียมทีมให้พร้อม', button:'เข้าไปพบ', art:ART.portrait,
    en:{ title:'The Guardian of the Western Gate', text:'The western gate is half-buried in snow. A huge three-headed hound stands across the road and does not step aside. Musashi whispers that it has never opened the way for anyone by words. Ready your team.', button:'Approach' } },
  title:{ th:'ศึกประตูปัจฉิม · เซอร์เบอรัส', en:'Battle at the Western Gate · Cerberus' },   // NC-2 (the banner)
  alert:{ th:'ประตูปัจฉิมถูกหิมะกลบครึ่งบาน สุนัขสามเศียรขนาดใหญ่ยืนขวางกลางทางและไม่ขยับหลบ มูซาชิกระซิบว่ามันไม่เคยเปิดทางให้ใครด้วยคำพูด เตรียมทีมให้พร้อม', en:'The western gate is half-buried in snow. A huge three-headed hound stands across the road and does not step aside. Musashi whispers that it has never opened the way for anyone by words. Ready your team.' },
  go:{ th:'เข้าไปพบ', en:'Approach' }, retry:{ th:'สู้อีกครั้ง', en:'Try again' },
  banner:{ th:'ศึกประตูปัจฉิม · เซอร์เบอรัส', en:'Battle at the Western Gate · Cerberus' },
  // NC-3 win
  win:{ title:'เซอร์เบอรัสยอมรับ', text:'เซอร์เบอรัสยอมรับท่านเป็นนายและเปิดประตูให้ผ่าน มันจะยืนเฝ้าประตูปัจฉิมต่อไป ศัตรูที่เดินมาใกล้ประตูจะถูกปราบ', button:'ต่อ',
    en:{ title:'Cerberus Accepts You', text:'Cerberus accepts you as his master and opens the gate. He will keep standing guard at the western gate, and any foe that comes near it will be driven off.', button:'Continue' } },
  // NC-4 lose
  lose:{ title:'เซอร์เบอรัสรอท่านอยู่', text:'สามเศียรหยุดอยู่กับที่ ท่านตั้งหลักแล้วลองอีกครั้งได้', button:'สู้อีกครั้ง',
    en:{ title:'Cerberus Waits', text:'The three heads hold still. Steady yourself and try again.', button:'Try again' } },
  // 6.3 lines in the fight (narration, not speech)
  lines:{ start:'สามเศียรสูดลมหายใจพร้อมกัน แล้วก้าวมาหนึ่งก้าวเพื่อให้ผู้ที่ยืนอยู่ตรงหน้าเห็นว่ามันไม่ได้ถอย', half:'เศียรกลางเอียงคอ เหมือนกำลังตัดสินใจบางอย่าง' },
  linesEn:{ start:'All three heads draw breath together, then take one step forward to show the one before them that it will not retreat.', half:'The middle head tilts, as if deciding something.' },
  allyLines:{ musashiStart:{ th:'มูซาชิ: "ข้าไม่ชักก่อนท่าน"', en:'Musashi: "I do not draw before you."' }, musashiHalf:{ th:'มูซาชิ: "ท่านยืนได้ ข้าไม่เคยเห็นผู้ใดยืนหน้ามันได้นานเท่านี้"', en:'Musashi: "You are standing. I have never seen anyone stand before him this long."' } },
});
/** 6.4 the only change in his moves: Triple Bite no longer ends with "as if waking" (he was never under a spell) */
export const TRI_BITE_USE = Object.freeze({ th:'ทั้งสามเศียรงับลงพร้อมกัน แล้วถอยหนึ่งก้าวกลับมาตั้งท่าที่เดิม', en:'All three heads snap down together, then take one step back to hold their ground.' });
/** 6.6 what the guard does to a foe that comes near the gate (1 of 3, shown in the log) */
export const GUARD_LINES = Object.freeze([
  { th:'สามเศียรขย้ำพร้อมกัน ศัตรูที่เดินมาใกล้ประตูถูกเหวี่ยงกลับเข้าไปในหิมะ', en:'All three heads snap at once, and the foe that came near the gate is flung back into the snow.' },
  { th:'เซอร์เบอรัสคำรามต่ำสามเสียงซ้อน ศัตรูที่ก้าวเข้าใกล้ประตูหยุดชะงักแล้วล้มลง', en:'Cerberus gives three low growls, stacked together. The foe that stepped near the gate falters and falls.' },
  { th:'กรงเล็บกระแทกลงบนหิมะ ศัตรูตัวนั้นไม่ได้ลุกขึ้นอีก แล้วเซอร์เบอรัสก็กลับไปยืนที่เดิม', en:'A claw comes down on the snow. The foe does not rise again, and Cerberus goes back to where he stood.' },
]);

const page = (image, title, line, en) => ({ image, title, line, fallback:'📜', en });
export const CERBERUS_STORIES = Object.freeze({
  [CERBERUS.openStory]:{ title:'สามเศียรที่ไม่เปิดทางด้วยคำพูด', en:{ title:'Three Heads That Do Not Open for Words' }, pages:[
    page(ART.gate, 'ผู้พิทักษ์ประตู',
      'บรรยาย: ถ้ำชายแดนสิ้นสุดที่ประตูหินบานใหญ่ซึ่งหิมะกลบครึ่งหนึ่ง ลมหนาวพัดผ่านช่องว่างระหว่างบาน สุนัขสามเศียรร่างใหญ่เท่าเกวียนยืนขวางกลางทาง ดวงตาทั้งหกสีแดงเข้ม ลมหายใจเป็นไอขาวสามสายพ่นออกพร้อมกันเป็นจังหวะเดียว\n'
      + 'มูซาชิ: "ข้าเคยมาถึงประตูนี้เมื่อหลายปีก่อน ข้าไม่ได้ผ่าน ข้าไม่ได้ชนะมัน และมันไม่ได้ชนะข้า ข้ากลับไปโดยไม่เสียหน้า มันไม่เปิดให้ผู้ที่ไม่ยืนอยู่ต่อหน้ามัน"\n'
      + 'นิรา: "ท่านคะ ดิฉันนับเส้นทางเดินของมันจากรอยในหิมะแล้ว มันยืนอยู่ตรงนี้มาตลอด ไม่เคยลุกไปไหนค่ะ"',
      { title:'The Gate Guardian', line:
        'Narration: The frontier cave ends at a great stone gate half buried in snow. A cold wind passes through the gap between its leaves. A three-headed hound the size of a cart stands across the road, all six eyes a deep red. Three plumes of white breath leave it together on a single beat.\n'
      + 'Musashi: "I came to this gate years ago. I did not pass. I did not beat it, and it did not beat me. I went back with my face intact. It does not open for those who do not stand before it."\n'
      + 'Nira: "Sir, I have counted its pacing from the marks in the snow. It has stood in this one place the whole time. It has never gone anywhere."' }),
    page(ART.gate, 'ผู้ถือบัญชีกับผู้พิทักษ์',
      'ยมบาทน้อย: "ผมไม่ต้องการทำร้ายเขาครับ ผมต้องการผ่านประตู ถ้าเขาต้องการให้ผมแสดงอะไร ผมจะแสดง"\n'
      + 'บรรยาย: สามเศียรก้มลงพร้อมกัน กรงเล็บเกาะพื้นหินจนหิมะแตกกระจาย เศียรกลางจ้องยามาไม่กะพริบ เศียรซ้ายและขวาจ้องตามไปยังตะเกียงวิเศษที่ห้อยข้างเอวเขา\n'
      + 'มูซาชิ: "มันเห็นไฟในตะเกียงของท่าน ท่านยมบาทน้อย ตั้งหลักให้ดี"',
      { title:'The Keeper and the Guardian', line:
        'Yama: "I do not want to hurt him. I want to pass through the gate. If he needs me to show something, I will show it."\n'
      + 'Narration: All three heads lower together. Claws bite into the stone and the snow bursts apart. The middle head stares at Yama without blinking. The left and right heads follow its gaze to the Magic Lamp at his side.\n'
      + 'Musashi: "It sees the flames in your lamp, Lord Yama. Steady yourself."' }),
  ] },
  [CERBERUS.winStory]:{ title:'สามเศียรก้มลง', en:{ title:'Three Heads Bow' }, pages:[
    page(ART.yields, 'ผู้ที่ไม่ถอย',
      'บรรยาย: เศียรกลางหยุดจ้อง ลมหายใจสามสายที่เคยพ่นเป็นจังหวะเดียวเริ่มช้าลงทีละสาย เศียรซ้ายก้มลงก่อน แล้วเศียรขวา สุดท้ายเศียรกลางก้มลงต่ำที่สุด จนปลายจมูกเกือบแตะหิมะตรงหน้ายามา\n'
      + 'มูซาชิ: "ข้าเคยเห็นสิงโตหินหน้าวัดหลายแห่ง ข้าเคยเห็นเสือ และเคยเห็นมังกร ข้าไม่เคยเห็นผู้พิทักษ์ที่ก้มสามเศียรพร้อมกัน ท่านยมบาทน้อย มันยอมรับท่านแล้ว"\n'
      + 'ยมบาทน้อย: "ผมขอบใจครับ ผมสัญญาว่าจะไม่ปล่อยให้ประตูนี้เปิดโดยไม่มีเหตุ"',
      { title:'The One Who Did Not Retreat', line:
        'Narration: The middle head stops staring. The three plumes of breath that once left on a single beat slow one by one. The left head lowers first, then the right, and last the middle head bows lowest, until the tip of its nose nearly touches the snow before Yama.\n'
      + 'Musashi: "I have seen stone lions before many temples. I have seen tigers, and I have seen a dragon. I have never seen a guardian bow all three heads at once. Lord Yama, he has accepted you."\n'
      + 'Yama: "I thank him. I promise I will not let this gate open without cause."' }),
    page(ART.yields, 'ยืนเฝ้าต่อ',
      'บรรยาย: เซอร์เบอรัสถอยไปยืนข้างประตูหินและใช้เศียรกลางดันบานประตูให้เปิดออกเพียงพอให้คนเดินผ่านได้ ลมหนาวพัดเข้ามาพร้อมหิมะละเอียด จากนั้นสามเศียรหันออกไปทางด้านนอกประตูพร้อมกัน เหมือนยามที่ได้รับคำสั่งให้ยืนเวรต่อไป\n'
      + 'นิรา: "ท่านคะ ดิฉันขอบันทึกว่า ผู้พิทักษ์ประตูปัจฉิมอยู่ในความดูแลของท่านแล้วค่ะ"',
      { title:'Standing Guard Still', line:
        'Narration: Cerberus steps aside and uses his middle head to push the stone gate open just wide enough for a person to pass. A cold wind blows in with fine snow. Then all three heads turn together toward the outside of the gate, like a sentry ordered to keep his watch.\n'
      + 'Nira: "Sir, I note for the record that the guardian of the western gate is now under your care."' }),
  ] },
  [CERBERUS.loseStory]:{ title:'ผู้พิทักษ์รอท่านอยู่', en:{ title:'The Guardian Waits' }, pages:[
    page(ART.gate, 'ไม่ซ้ำเติม',
      'บรรยาย: เซอร์เบอรัสหยุดนิ่ง ไม่ก้าวเข้ามาหาผู้ที่ล้มลง ทั้งสามเศียรมองหิมะที่ปลิวเงียบ ๆ เหมือนรอให้ใครตั้งหลักได้',
      { title:'No Blow Upon a Fallen One', line:'Narration: Cerberus stops. He does not step toward the one who has fallen. All three heads watch the snow drift in silence, as if waiting for someone to find their feet.' }),
  ] },
  // 7.3 Musashi's farewell = the farewell of the guide system for Zone 2 (the key the system plays when the walk ends with the guest still beside Yama)
  [CERBERUS.farewellStory]:{ title:'ดาบที่ไม่รีบ', en:{ title:'The Unhurried Blade' }, pages:[
    page(ART.farewell, 'ข้าถึงที่หมายแล้ว',
      'บรรยาย: ประตูหินเปิดอยู่แล้ว ลมหนาวและหิมะละเอียดพัดผ่านช่องบาน มูซาชิยืนอยู่หน้าประตู ไม่ก้าวต่อไป\n'
      + 'มูซาชิ: "ท่านยมบาทน้อย ข้ารับปากแม่ทัพเหลียนกังว่าจะพาท่านและแม่นิราถึงประตูปัจฉิม ข้าถึงที่หมายแล้ว ข้าไปต่อไม่ได้"\n'
      + 'ยมบาทน้อย: "ท่านมูซาชิ ดาบของท่านไม่ถูกจำกัดด้วยเขตแดนมิใช่หรือครับ"\n'
      + 'มูซาชิ: "ดาบไม่มีเขต คำสัญญามี ข้ารักษาคำสัญญาของข้าไว้เสมอ ข้าจึงยังเป็นข้าอยู่"',
      { title:'I Have Reached My Mark', line:
        'Narration: The stone gate already stands open. Cold wind and fine snow stream through the gap. Musashi stays at the gate and does not step beyond it.\n'
      + 'Musashi: "Lord Yama, I promised General Lian Gang that I would take you and Miss Nira to the western gate. I have reached my mark. I cannot go further."\n'
      + 'Yama: "Lord Musashi, is your blade not bound by any border?"\n'
      + 'Musashi: "A blade has no borders. A promise does. I keep my word, and that is why I am still myself."' }),
    page(ART.farewell, 'ตะวันตกไม่เหมือนบูรพา',
      'มูซาชิ: "ข้าให้คำเตือนเดียว ตะวันตกไม่เหมือนบูรพา ที่นั่นศัตรูบางตัวไม่ชักอาวุธก่อน มันเริ่มจากสิ่งที่ท่านมองไม่เห็น อย่าเชื่อสายตาเพียงอย่างเดียว ฟังเสียงเท้าของคนที่เดินข้างท่านด้วย"\n'
      + 'นิรา: "ดิฉันจะนับเสียงเท้าให้ค่ะ ท่านมูซาชิ"\n'
      + 'มูซาชิ: "ดี แม่นิราจดเสียงเท้าอยู่แล้ว"',
      { title:'The West Is Not the East', line:
        'Musashi: "I give you one warning. The West is not the East. There, some foes do not draw a weapon first. They begin with what you cannot see. Do not trust your eyes alone. Listen also to the footsteps of those who walk beside you."\n'
      + 'Nira: "I will count the footsteps, Lord Musashi."\n'
      + 'Musashi: "Good. Miss Nira already notes the sound of feet."' }),
    page(ART.farewell, 'เรียกข้าเมื่อต้องการดาบที่ไม่รีบ',
      'บรรยาย: มูซาชิเก็บดาบยาวและดาบสั้นเข้าฝัก แล้ววางฝ่ามือเหนือตะเกียงวิเศษที่ห้อยข้างเอวยามา ประกายเงินเส้นเดียวไหลจากปลายนิ้วเขาเข้าไปในไส้ตะเกียง จุดอีกดวงด้วยเปลวสีขาวเงินนิ่งสนิท\n'
      + 'มูซาชิ: "เมื่อท่านจุดตะเกียงนี้แล้วเรียกชื่อข้า ข้าจะมา ข้าไม่รับปากว่าจะมาเร็ว ข้ารับปากว่าจะมาในจังหวะที่ใช่ ไฟของข้ามีจำกัด จงใช้ให้คุ้ม"\n'
      + 'ยมบาทน้อย: "ผมจะจำไว้ครับ ขอบพระคุณท่านมูซาชิ"\n'
      + 'บรรยาย: ยามากับนิราเดินผ่านประตูหินเข้าสู่ปัจฉิม เซอร์เบอรัสก้มสามเศียรให้ทั้งสองอีกครั้ง มูซาชิยืนอยู่ที่ปากประตูจนหิมะกลบรอยเท้าของทั้งคู่',
      { title:'Call Me When You Need an Unhurried Blade', line:
        'Narration: Musashi sheathes his long sword and short sword, then lays his palm over the Magic Lamp at Yama\'s side. A single thread of silver flows from his fingertips into the wick and lights another flame, a still, silver-white one.\n'
      + 'Musashi: "Light this lamp and call my name and I will come. I do not promise to come fast. I promise to come at the right beat. My flame is limited. Spend it well."\n'
      + 'Yama: "I will remember. Thank you, Lord Musashi."\n'
      + 'Narration: Yama and Nira walk through the stone gate into the West. Cerberus bows all three heads to them once more. Musashi stands at the gate until the snow covers both sets of footprints.' }),
  ] },
});

/** NM-1 replaces the generic helper window for Musashi */
export const MUSASHI_FLAME_NOTICE = Object.freeze({ title:'มูซาชิฝากไฟไว้ในตะเกียง', text:'มูซาชิออกจากทีมเพราะรับปากเหลียนกังว่าจะพาท่านถึงประตูปัจฉิมเท่านั้น เขาฝากไฟไว้ในตะเกียงวิเศษ ท่านเรียกเขาในศึกได้ เรียกได้ 3 ครั้ง ครั้งละ 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม', button:'ดูตะเกียง', openLamp:true, art:ART.icon,
  en:{ title:'Musashi Leaves a Flame in the Lamp', text:'Musashi leaves the team because he promised Lian Gang only to take you to the western gate. He leaves a flame in the Magic Lamp. You can call him in battle, 3 times, for 3 turns each time. When the flames run out, recharge at the Mirror Tower.', button:'See the Lamp' } });
/** 7.4 helper no. 7 */
export const MUSASHI_HELPER = Object.freeze({
  name:{ th:'มูซาชิ', en:'Musashi' },
  move:{ name:{ th:'สองดาบหนึ่งวิถี', en:'Two Blades, One Way' },
    desc:{ th:'มูซาชิชักดาบยาวและดาบสั้นพร้อมกัน ฟันเฉือนศัตรูตัวเดียวสองสายในจังหวะเดียว แรงสูง', en:'Musashi draws long sword and short sword together and cuts a single foe twice in one beat, with great force.' } },
  say:{ call:{ th:'มูซาชิ: "ข้ามาตามที่รับปาก ชี้เป้ามา"', en:'Musashi: "I come as I promised. Show me the target."' },
    use:{ th:'มูซาชิ: "สองดาบหนึ่งวิถี"', en:'Musashi: "Two Blades, One Way."' },
    end:{ th:'มูซาชิ: "ดาบเข้าฝักแล้ว เรียกอีกเมื่อจำเป็น"', en:'Musashi: "The blades are sheathed. Call again when you must."' } },
});
