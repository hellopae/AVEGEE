// T7/2 (Rae R2 part C, section 2): case 5 - the spirits stop, Van Helsing fights Valdric at the frontier, 3 demon waves, the team is put under the spell (wave 4 = Poena + Noir + Nira + Cerberus, only Van Helsing is untouched),
// Valdric falls, Yama gets Hypnosis, Van Helsing becomes the Gate Guard of the West, Valdric is tried and sent home. Text is Rae's, copied verbatim (TH + EN); the Cerberus lines are Toby's short narration (owner decision 19 Nov, TODO(Rae) to polish).
// Keys: `westVampireBreach` (data.js) · `z3-freeze` · `z3-vh-frontier` · `z3-hypnosis-v2` · `z3-valdric-down` · `z3-vh-guard` · `frontier-west-boss-to-dais/punished/released` · notices N5-1 NV-1 NV-2 N5-5 N5-6. Imports nothing.
const A = n => `img/z3-events/${n}.webp`;
export const Z3_FRONTIER = Object.freeze({ eventKey:'westVampireBreach', freezeStory:'z3-freeze', frontierStory:'z3-vh-frontier', hypnosisStory:'z3-hypnosis-v2', downStory:'z3-valdric-down', guardStory:'z3-vh-guard',
  freezeNotice:'z3-frozen', powerNotice:'z3-hypno-gift', guardNotice:'z3-vh-guard-notice', daisNotice:'z3-valdric-to-dais', manorNotice:'z3-valdric-manor' });
export const Z3_FRONTIER_ART = Object.freeze({
  freeze:A('cut-freeze-west'), frontier:A('cut-vh-frontier-west'), hypnosisV1:'img/frontier-west-hypnosis-v1.webp', hypnosisV2:'img/frontier-west-hypnosis-v2.webp', down:A('cut-valdric-down-west'), guard:A('cut-vh-guard-west'),
  toDais:A('cut-frontier-boss-to-dais-west'), punished:A('cut-frontier-boss-punished-west'), released:A('cut-frontier-boss-released-west'),
  vhGuard:'guard-vanhelsing-west', vhProfile:A('guard-vanhelsing-west-profile') });

/** N5-1 (event alert, replaces the old vampire alert) · N5-2' (wave banners) · N5-3 (boss banner) */
export const Z3_FRONTIER_TEXT = Object.freeze({
  title:{ th:'ปัจฉิมหยุดนิ่ง', en:'The West stands still' },
  alert:{ th:'วิญญาณทุกดวงหยุดกลางก้าว ไม่ขยับ ไม่ตอบ และชายแดนด้านล่างมีบางอย่างผิดปกติ เดินลงไปตรวจ', en:'Every spirit has stopped mid-step. None move, none answer, and something is wrong at the lower frontier. Walk down and look.' },
  ack:{ th:'รับทราบ', en:'Understood' },
  banners:{ th:['ศึกชายแดนปัจฉิม · ปีศาจในหมอก ระลอกที่ 1', 'ศึกชายแดนปัจฉิม · ปีศาจในหมอก ระลอกที่ 2', 'ศึกชายแดนปัจฉิม · ปีศาจในหมอก ระลอกที่ 3', 'ระลอกที่ 4 · ลูกทีมถูกสะกด'],
    en:['Western frontier · Demons in the mist, wave 1', 'Western frontier · Demons in the mist, wave 2', 'Western frontier · Demons in the mist, wave 3', 'Wave 4 · Our own, under the spell'] },
  boss:{ th:'ศึกชายแดนปัจฉิม · วาลดริก', en:'Western frontier · Valdric' },
  // 2.4 - lines between the waves (Thai / English), keyed by the wave that has just FALLEN (1..3 demons, 4 = the team) and 'start' / 'valdricStart' / 'valdricHalf' / 'vhHalf'
  between:{
    start:{ th:'แวน เฮลซิง: "ข้าจะอยู่ข้างท่านจนจบศึก แต่คำพิพากษาเป็นของท่านคนเดียว"', en:'Van Helsing: "I will stand beside you to the end of the fight. But the verdict is yours alone."' },
    1:{ th:['นิรา: "ระลอกที่หนึ่งผ่านแล้วค่ะ เหลืออีกสองระลอก ปีศาจพวกนี้หลับตาเดินเหมือนวิญญาณในลาน ไม่ใช่ทัพที่ตื่นค่ะ"', 'แวน เฮลซิง: "ข้าเห็นมาแล้ว ศัตรูที่หลับตาเดินไม่ใช่ศัตรูที่ตั้งใจ ข้าไม่ลังเลที่จะหยุดพวกมัน แต่ข้าไม่เกลียดพวกมัน"'],
        en:['Nira: "The first wave is down, sir. Two remain. These demons walk with their eyes shut, like the spirits in the square. This is no army awake."', 'Van Helsing: "I have seen it before. Foes who walk with their eyes shut are not foes who mean it. I do not hesitate to stop them, but I do not hate them."'] },
    2:{ th:['นิรา: "อีกระลอกเดียวค่ะ แต่ดิฉันได้ยินเสียงฝีเท้าที่คุ้นหูมาจากในหมอก ท่านเตรียมใจไว้ก่อนนะคะ"', 'โพเอน่า: "ข้าได้ยินเสียงสู้จากลาน มาช่วย!"', 'นัวร์: "ผมตามท่านโพเอน่ามาครับ"', 'แวน เฮลซิง: "ท่านผู้ถือบัญชี ทุกคนที่ยืนอยู่เบื้องหลังท่านตอนหมอกหนาที่สุด ขอให้ท่านอย่าเอาหลังให้ใครโดยไม่ระวัง"'],
        en:['Nira: "One more, sir. But I hear footsteps I know from inside the mist. Please brace yourself."', 'Poena: "I heard the fighting from the square. I came to help!"', 'Noir: "I followed Lady Poena, sir."', 'Van Helsing (low, to Yama): "Keeper of the ledger, everyone who stands at your back when the mist is thickest. Please do not turn your back on anyone without care."'] },
    4:{ th:['โพเอน่า: "ข้า ... ข้าทำอะไรลงไป ข้าหวดท่านไปกี่ครั้ง ข้าไม่รู้ตัวเลย หมอกเข้าตาข้าก่อนข้าจะทันเตือนใคร"', 'นัวร์: "ผมขอโทษครับ ผมได้ยินเสียงสวดอยู่ในหัว เสียงเดียวบอกว่า \'ทำต่อ ทำต่อ\' ผมก็ทำต่อ ... แต่ไม่รู้เลยว่ามือที่ทำอยู่กำลังยกใส่ใครครับ"',
            'นิรา: "ท่านคะ ดิฉันขออภัย ดิฉันนับเสียงเท้าได้เพียงสามก้าวก่อนเสียงนั้นกลืนไป ดิฉันขอจดไว้ว่าการนับอย่างเดียวไม่พอต้านมนต์นี้ค่ะ"',
            'ยมบาทน้อย: "ไม่เป็นไรครับ ผมไม่เป็นอะไรมาก ขอบคุณที่กลับมา"', 'แวน เฮลซิง: "เสียงกล่อมแบบนั้นทำงานกับคำสั่งที่ค้างอยู่ในหัว ไม่ใช่กับความรู้สึกของผู้ฟัง ท่านทั้งสามไม่ผิดที่โดน"',
            // TODO(Rae): Cerberus wakes - narration only (he does not speak). Toby's short draft, owner decision 19 Nov
            'บรรยาย: เซอร์เบอรัสสะบัดสามเศียรพร้อมกัน แสงเขียวในดวงตาหลุดเป็นฝอยแล้วกลับเป็นสีแดงเข้ม มันก้มศีรษะให้ยามาหนึ่งครั้งแล้วถอยกลับไปยืนที่เดิม'],
        en:['Poena: "I ... what did I do? How many times did I strike you? I never knew it. The mist got into my eyes before I could warn anyone."', 'Noir: "I am sorry, sir. A chant was running in my head, one voice saying \'keep going, keep going\', so I kept going. ... I never knew whom my hands were raised against."',
            'Nira: "Forgive me, sir. I counted three footsteps before that voice swallowed the rest. I note for the record that counting alone is not enough to resist this spell."',
            'Yama: "It is all right. I am not badly hurt. Thank you for coming back."', 'Van Helsing: "A lulling voice works on the order already waiting in the head, not on the listener\'s feelings. You three are not at fault for being caught."',
            'Narration: Cerberus shakes all three heads together. The green light in his eyes breaks into threads and turns back to deep red. He bows to Yama once and steps back to where he stood.'] } },
  valdricStart:{ th:'วาลดริก: "ขออภัยล่วงหน้า ท่านผู้มาเยือน ข้าไม่ถนัดการเป็นฝ่ายแพ้"', en:'Valdric: "My apologies in advance, honoured guest. I am not practised at losing."' },
  valdricHalf:{ th:'วาลดริก: "ท่านยืนได้ดีกว่าที่ข้าคาด ราตรีของข้าเริ่มสั้นลงแล้ว ข้าไม่มีเขี้ยวเหลือให้ใช้ ท่านผู้มาเยือน ข้ามีแต่หมอก และหมอกไม่เคยชนะใคร ได้แต่ทำให้ทุกคนหยุด"',
    en:'Valdric: "You stand better than I expected. My night is beginning to grow short. I have no fangs left to use, honoured guest. I have only the mist, and mist has never won anything. It can only make everyone stop."' },
  vhHalf:{ th:'แวน เฮลซิง: "เขาไม่ได้กัดสักครั้ง ข้าสังเกตมาเกือบสองร้อยปี ข้ายังไม่เข้าใจ"', en:'Van Helsing: "He has not bitten once. I have watched him for nearly two hundred years and I still do not understand."' },
  hypnoFoe:{ th:'ถูกสะกดจิต', en:'under the spell' },
});

/** The wave-4 foes' names; the team members are the ones put under the spell (Van Helsing is not). */
export const Z3_HYPNO_TEAM = Object.freeze([
  Object.freeze({ k:'taan', th:'โพเอน่า', en:'Poena', sp:'crew-taan-west' }),
  Object.freeze({ k:'dam', th:'นัวร์', en:'Noir', sp:'crew-dam-west' }),
  Object.freeze({ k:'nira', th:'นิรา', en:'Nira', sp:'crew-nira-west' }),
  Object.freeze({ k:'cerberus', th:'เซอร์เบอรัส', en:'Cerberus', sp:'boss-cerberus-west' }),   // owner 19 Nov: the old green-eyed drawing = under the spell
]);

export const Z3_FRONTIER_NOTICES = Object.freeze({
  [Z3_FRONTIER.freezeNotice]:{ title:Z3_FRONTIER_TEXT.title.th, text:Z3_FRONTIER_TEXT.alert.th, button:'รับทราบ', art:Z3_FRONTIER_ART.hypnosisV1,
    en:{ title:Z3_FRONTIER_TEXT.title.en, text:Z3_FRONTIER_TEXT.alert.en, button:'Understood' } },
  [Z3_FRONTIER.powerNotice]:{ title:'วาลดริกยกวิชาหมอกให้ท่าน', text:'ท่านได้รับพลังสะกดจิต รายละเอียดของพลังดึงจากรางวัล hypno เดิม', button:'ต่อ', art:Z3_FRONTIER_ART.hypnosisV1,
    en:{ title:'Valdric Hands Down the Art of Mist', text:'You have gained the power of Hypnosis. Its details come from the existing hypno reward.', button:'Continue' } },
  [Z3_FRONTIER.guardNotice]:{ title:'แวน เฮลซิงเป็นผู้เฝ้าด่านปัจฉิม', text:'แวน เฮลซิงจะเฝ้าด่านปัจฉิมในนามของท่าน เรียกใช้ได้เหมือนผู้เฝ้าด่านของโซนอื่น เวลาพักระหว่างการเรียกคือ 1 นาที', button:'รับทราบ', art:Z3_FRONTIER_ART.vhProfile,
    en:{ title:'Van Helsing Keeps the West for You', text:'Van Helsing will guard the west in your name. Call on him like the gate guards of other zones. The wait between calls is 1 minute.', button:'Understood' } },
  [Z3_FRONTIER.daisNotice]:{ title:'วาลดริกขอเดินไปแท่น', text:'วาลดริกพ่ายแล้ว เขาไม่ขอความเมตตาและเลือกเดินไปที่แท่นตัดสินด้วยตัวเอง', button:'ไปที่แท่น', art:Z3_FRONTIER_ART.down,
    en:{ title:'Valdric asks to walk to the dais', text:'Valdric has fallen. He asks for no mercy and chooses to walk to the judgment dais himself.', button:'To the dais' } },
  [Z3_FRONTIER.manorNotice]:{ title:'วาลดริกกลับคฤหาสน์', text:'วาลดริกรับทัณฑ์เสร็จแล้วและกลับไปยังคฤหาสน์ริมชายแดน แวะไปคุยกับเขาได้', button:'รับทราบ', art:Z3_FRONTIER_ART.released,
    en:{ title:'Valdric returns to his manor', text:'Valdric has served his sentence and gone back to the manor at the edge of the frontier. You may stop by and speak with him.', button:'Understood' } },
});
export const VH_JOURNAL = Object.freeze({ th:'แวน เฮลซิง: เข้าเฝ้าด่านปัจฉิมแล้ว พกก้อนขี้ผึ้งไว้ที่เข็มขัดและให้ข้าหนึ่งก้อน ยังไม่บอกเหตุผล', en:'Van Helsing: keeps the western gate now. Carries beeswax at his belt and gave me one. Has not said why.' });

const page = (image, title, line, en) => ({ image, title, line, fallback:'📜', en });
const R = Z3_FRONTIER_ART;
export const Z3_FRONTIER_STORIES = Object.freeze({
  'z3-freeze':{ title:'หยุดพร้อมกัน', en:{ title:'All at Once' }, pages:[
    page(R.freeze, 'เสียงที่ถูกปิด',
      'บรรยาย: ลานหินกลางปัจฉิมเงียบลงเหมือนมีใครปิดเสียงทั้งโลก วิญญาณที่เดินวนในคิวหยุดกลางก้าวพร้อมกัน หิมะที่ตกบางเบาลอยค้างกลางอากาศชั่วอึดใจ แล้วค่อยตกต่อเมื่อไม่มีใครขยับ\n'
      + 'นิรา: "ท่านคะ ไม่ใช่ความตายซ้ำและไม่ใช่การพักค่ะ ชีพจรบนแฟ้มยังเดิน แต่ตัววิญญาณเหมือนถูกนับให้หยุดไว้ก่อน ต้นทางของแรงนี้อยู่ที่ชายแดนด้านล่างค่ะ"\n'
      + 'โพเอน่า: "ข้าได้กลิ่นหมอกอีกแล้ว ครั้งนี้หนากว่าครั้งก่อนมาก"',
      { title:'The Sound Switched Off', line:
        'Narration: The stone square at the heart of the West falls silent, as if someone had switched off the whole world. The spirits circling in the queue stop mid-step, all together. The thin snow hangs in the air for a heartbeat, then drifts down again, since nothing is moving to disturb it.\n'
      + 'Nira: "Sir, this is not a second death and not rest. The pulse on every file still runs, but the spirits themselves have been counted still. The source of this force lies at the lower frontier."\n'
      + 'Poena: "I smell the mist again. Thicker this time than before."' }),
  ] },
  'z3-vh-frontier':{ title:'ผู้ที่ตามมาสองร้อยปี', en:{ title:'The Man Who Followed for Two Hundred Years' }, pages:[
    page(R.frontier, 'สองคนในหมอก',
      'บรรยาย: ชายแดนปัจฉิมจมอยู่ในหมอกขาวที่ไหลลงตามเนินเหมือนน้ำนมเทลงหุบ ประตูชายแดนเปิดอ้าครึ่งบาน ปีศาจแถวหนึ่งยืนนิ่งอยู่ในหมอก ตาประกายเหลืองแต่ไม่ขยับ ตรงหน้าแถวนั้น ชายสูงวัยในเสื้อคลุมยาวสีเทาเข้มยืนขวางทางกับชายหนวดขาวในโค้ตดำซับแดง ชายแรกถือตะเกียงแสงขาวเย็นในมือซ้าย ที่เอวมีกระเป๋าหนังใบเก่ากับซองหนังเสียบไม้เรียวแหลมสั้นไว้ ชายหนวดขาวถือไม้เท้าหัวค้างคาว ยืนตัวตรงไม่ขยับ ที่เท้าของชายเสื้อคลุมเทา ปีศาจสองสามตนนอนนิ่งอยู่บนหิมะ ชายเสื้อของเขามีรอยไหม้ที่ขอบ และลมหายใจหนักเหมือนคนที่สู้มาทั้งคืน\n'
      + 'วาลดริก: "ท่านแวน เฮลซิงมาเยือนราตรีของข้าเป็นครั้งที่เจ็ดแล้ว ข้าไม่เคยเป็นฝ่ายชักก่อนสักครั้ง ท่านผู้มาเยือน ข้าขออภัยที่ท่านต้องมาพบภาพนี้"\n'
      + 'แวน เฮลซิง: "ท่านผู้ถือบัญชี อย่าเข้ามาใกล้ ข้าตามเขามาเกือบสองร้อยปี ทั้งก่อนตายและหลังตาย ข้ารู้จักหมอกนี้ดีกว่าท่าน"',
      { title:'Two Men in the Mist', line:
        'Narration: The western frontier lies drowned in white mist that pours down the slope like milk tipped into a ravine. The frontier gate stands half open. A row of demons waits motionless in the fog, eyes glinting yellow. Before that row, an elderly man in a long dark-grey coat blocks the road against a white-moustached man in a black coat lined with red. The first holds a cold white lantern in his left hand; at his belt hang a worn leather bag and a sheath holding a short sharpened stake. The white-moustached man holds a bat-headed cane and stands perfectly upright. At the grey-coated man\'s feet, two or three demons lie still on the snow. Scorch marks edge his coat, and he breathes like a man who has been fighting all night.\n'
      + 'Valdric: "Doctor Van Helsing has come to my night for the seventh time. I have never once drawn first. Honoured guest, I apologise that you must meet this sight."\n'
      + 'Van Helsing: "Keeper of the ledger, do not come near. I have followed him for almost two hundred years, before my death and after it. I know this mist better than you."' }),
    page(R.frontier, 'ข้าไม่เชื่อเสียงที่ไพเราะ',
      'แวน เฮลซิง: "ข้าชื่อแวน เฮลซิง ข้าเป็นหมอ ข้าไม่เชื่อคำที่ไพเราะ ข้าเชื่อมือและรอยบนคอ เสียงนุ่ม ๆ แบบนั้นข้ารู้จักมันดี อย่าให้เขาพูดกับท่านนาน"\n'
      + 'ยมบาทน้อย: "ผมไม่ตัดสินใครจากเสียง หรือจากความกลัวของใครครับ ผมอ่านบัญชีก่อนเสมอ"\n'
      + 'แวน เฮลซิง: "บัญชีของเขาอาจเขียนไว้สวยกว่าที่เขาเป็น ข้าเคยอ่านบัญชีที่สวยเกินไปมาก่อน และข้าไม่อ่านแบบนั้นอีกแล้ว"\n'
      + 'นิรา: "ท่านคะ ดิฉันนับฝีเท้าในหมอกแล้ว ปีศาจแถวนั้นจะมาสามระลอกค่ะ และหลังจากนั้นจะมีเสียงฝีเท้าที่ดิฉันคุ้นหูตามมา"',
      { title:'I Do Not Trust a Soft Voice', line:
        'Van Helsing: "I am Van Helsing. I am a physician. I do not trust a soft word. I trust hands, and marks upon the neck. I know that gentle voice well. Do not let him speak to you for long."\n'
      + 'Yama: "I do not judge anyone by a voice, or by anyone\'s fear. I read the ledger first, always."\n'
      + 'Van Helsing: "His ledger may be written more kindly than he is. I once read a ledger that was too kind, and I do not read them so any more."\n'
      + 'Nira: "Sir, I have counted the footsteps in the mist. The demons will come in three waves, and after that there will be footsteps I know."' }),
    page(R.hypnosisV1, 'ข้าขอยืมมือท่าน',
      'วาลดริก: "ข้าไม่ต้องการสู้กับผู้ใด แต่ข้าไม่ยอมให้ผู้ใดเดินผ่านข้าไปแตะผู้เช่าของข้า"\n'
      + 'บรรยาย: เขายกไม้เท้าขึ้นหนึ่งครั้ง หมอกหนาขึ้นทันตาจนตะเกียงในมือแวน เฮลซิงริบหรี่ ปีศาจทั้งแถวลืมตาพร้อมกัน\n'
      + 'แวน เฮลซิง: "ข้าขอยืมมือท่านชั่วครู่ ข้าไม่ขอให้ท่านเชื่อข้า ข้าขอให้ท่านอย่าปล่อยให้ปีศาจพวกนั้นผ่านไปถึงลานปัจฉิม"\n'
      + 'ยมบาทน้อย: "ผมจะช่วยป้องกันคนที่ยังยืนอยู่ครับ ที่เหลือผมจะตัดสินที่แท่น"',
      { title:'I Ask to Borrow Your Hands', line:
        'Valdric: "I wish to fight no one, but I will not let anyone walk past me to touch my tenants."\n'
      + 'Narration: He lifts his cane once. The mist thickens at once until the lantern in Van Helsing\'s hand gutters. The whole row of demons opens its eyes together.\n'
      + 'Van Helsing: "I ask to borrow your hands for a moment. I do not ask you to believe me. I ask you not to let those creatures through to the square of the West."\n'
      + 'Yama: "I will protect whoever is still standing. The rest I will judge at the dais."' }),
  ] },
  'z3-hypnosis-v2':{ title:'เสียงกล่อมในหมอก', en:{ title:'A Lullaby in the Mist' }, pages:[
    page(R.hypnosisV2, 'ลูกน้องสามระลอก',
      'วาลดริก: "ลูกน้องสามระลอกล้มลงแล้วหรือ ท่านผู้มาเยือน ข้าไม่ถนัดการเป็นฝ่ายแพ้ ข้าขออภัยล่วงหน้า ข้าเหลือสิ่งเดียวที่ไม่ต้องใช้เขี้ยว"\n'
      + 'บรรยาย: เขายกไม้เท้าขึ้นอีกครั้ง หมอกบางเป็นเส้นพุ่งผ่านลานเข้าหูของโพเอน่า นัวร์ และนิรา ตาของทั้งสามหมองลงทีละน้อย มือที่เคยถืออาวุธและสมุดบันทึกข้างเดียวกับยามาค่อย ๆ หันปลายมาหาเขา\n'
      // TODO(Rae): Cerberus under the spell (owner decision 19 Nov) - Toby's short draft, narration only
      + 'บรรยาย: ที่ปากทางชายแดน เซอร์เบอรัสผู้พิทักษ์ประตูปัจฉิมสะบัดสามเศียร ดวงตาสีแดงเข้มของมันกลายเป็นสีเขียวทีละคู่ แล้วมันก็หันตัวมาหาผู้ที่ยืนอยู่ข้างหลังวาลดริก',
      { title:'Three Waves of Servants', line:
        'Valdric: "Three waves of servants fallen already, honoured guest? I am not practised at losing. I apologise in advance. I have one thing left that needs no fangs."\n'
      + 'Narration: He raises his cane again. Thin threads of mist shoot across the yard into the ears of Poena, Noir and Nira. Their eyes dim by degrees. The hands that held weapons and the ledger beside Yama slowly turn their points toward him.\n'
      + 'Narration: At the mouth of the frontier, Cerberus, the Guardian of the Western Gate, shakes all three heads. His deep red eyes turn green pair by pair, and he swings round to face those who stand behind Valdric\'s line.' }),
    page(R.hypnosisV2, 'ข้าสะกดคนไข้มาสี่สิบปี',
      'นิรา: "ท่านคะ ... ดิฉันได้ยินเสียงเดียว บอกว่า \'ปราบ\' ... ดิฉันนับเสียงเท้าอย่างที่ท่านมูซาชิเตือน หนึ่ง สอง ... ขออภัยค่ะท่าน ดิฉัน ... นับไม่ทัน"\n'
      + 'แวน เฮลซิง: "เสียงกล่อมนี้ไม่ได้ผลกับข้า ข้าสะกดคนไข้มาสี่สิบปี ข้ารู้ว่าเสียงแบบนี้ค้นหาอะไรในหัวของคน ข้ารู้ทางต้านมัน"\n'
      + 'ยมบาทน้อย: "ตั้งสติไว้! ข้าจะทำลายมนต์สะกดและพาพวกเจ้ากลับมา"',
      { title:'I Have Mesmerised Patients for Forty Years', line:
        'Nira: "Sir ... I hear one voice saying \'subdue\' ... I am counting footsteps as Lord Musashi warned. One, two ... forgive me, sir. I ... cannot count fast enough."\n'
      + 'Van Helsing: "That lullaby does nothing to me. I mesmerised patients for forty years. I know what a voice like that searches for inside a head. I know the way to resist it."\n'
      + 'Yama: "Hold on! I will break the spell and bring you back."' }),
  ] },
  'z3-valdric-down':{ title:'ข้าขอเดินไปเอง', en:{ title:'I Will Walk There Myself' }, pages:[
    page(R.down, 'ไม้เท้าบนหิมะ',
      'บรรยาย: ไม้เท้าหัวค้างคาวหลุดจากมือแล้วกลิ้งไปบนหิมะ วาลดริกคุกเข่าลงข้างเดียว ปัดผงหิมะออกจากโค้ตอย่างเรียบร้อย ฝูงค้างคาวที่เคยหมุนรอบตัวบินกลับเข้าชายเสื้อทีละตัวจนเงียบ\n'
      + 'วาลดริก: "ข้าแพ้แล้ว ท่านผู้มาเยือน ข้าไม่ขอความเมตตา ข้าขอเพียงให้ท่านตัดสินข้าด้วยบัญชีที่ท่านอ่านเอง ไม่ใช่ด้วยหมอกที่ท่านเห็น ข้าจะเดินไปเอง"\n'
      + 'ยมบาทน้อย: "ผมจะอ่านบัญชีของท่านให้จบก่อนครับ แล้วค่อยตัดสิน"',
      { title:'A Cane on the Snow', line:
        'Narration: The bat-headed cane slips from his hand and rolls across the snow. Valdric goes down on one knee and brushes the snow from his coat with care. The bats that wheeled about him fly back into the lining of his coat, one by one, until all is still.\n'
      + 'Valdric: "I am beaten, honoured guest. I ask no mercy. I ask only that you judge me by the ledger you read yourself, not by the mist you saw. I shall walk there myself."\n'
      + 'Yama: "I will read your ledger to the end first, and then I will judge."' }),
    page(R.down, 'หมอกไม่เคยสั่งใหม่',
      'วาลดริก: "ข้าขอบอกไว้ข้อเดียวก่อนเดิน หมอกของข้าไม่เคยสั่งใครให้ฟันกัน มันเร่งคำสั่งสุดท้ายที่ผู้ถูกสะกดแบกอยู่ในใจ ยมทูตของท่านแบกคำว่า \'ปราบ\' มาเต็มสองมือ เมื่อไม่มีศัตรูตรงหน้า พวกเขาจึงปราบกันเอง ข้าควรรู้ ข้าไม่ได้เอ่ยขอโทษเรื่องนี้เลย"\n'
      + 'ยมบาทน้อย: "เก็บไว้เล่าที่แท่นครับ ผมจะฟังให้จบ"',
      { title:'The Mist Never Gives New Orders', line:
        'Valdric: "One thing before I walk. My mist never ordered anyone to strike another. It hurries the last order a bound man carries in his heart. Your reapers carried the word \'subdue\' in both hands. With no enemy before them, they subdued one another. I should have known. I have not yet said I am sorry for it."\n'
      + 'Yama: "Keep it for the dais. I will hear it to the end."' }),
    page(R.down, 'วิชาที่ข้ายกให้',
      'วาลดริก: "ท่านผู้มาเยือน หมอกของข้าไม่มีประโยชน์อื่นนอกจากทำให้คนหยุด ข้ายกวิธีใช้ให้ท่าน ใช้กับศัตรูที่ยังฟังอยู่ อย่าใช้กับคนที่ไม่ได้ขอ"\n'
      + 'บรรยาย: หมอกบางสายหนึ่งลอยจากปลายไม้เท้าของเขาเข้าฝ่ามือยามา เย็นแล้วค่อย ๆ อุ่น\n'
      + 'ยมบาทน้อย: "ผมรับไว้ และผมจะไม่ใช้กับคนที่ไม่ได้ขอครับ"\n'
      + 'นิรา: "ดิฉันขอบันทึกค่ะ"',
      { title:'What I Hand Down', line:
        'Valdric: "Honoured guest, my mist has no use but to make people stop. I hand down its method to you. Use it on foes who are still listening. Never on those who did not ask."\n'
      + 'Narration: A single thread of mist drifts from the tip of his cane into Yama\'s palm, cold at first, then slowly warm.\n'
      + 'Yama: "I accept it, and I will not use it on anyone who did not ask."\n'
      + 'Nira: "I will note that."' }),
  ] },
  'z3-vh-guard':{ title:'ผู้เฝ้าด่านปัจฉิม', en:{ title:'The Gate Guard of the West' }, pages:[
    page(R.guard, 'ไม้เรียวที่ยังไม่ลง',
      'บรรยาย: วาลดริกคุกเข่าข้างเดียวบนหิมะ ฝูงค้างคาวบินกลับเข้าชายเสื้อ แวน เฮลซิงก้าวเข้ามาหาเขาช้า ๆ ตะเกียงในมือซ้าย ไม้เรียวแหลมในมือขวา ยามายืนเข้าไปขวางระหว่างทั้งสอง\n'
      + 'แวน เฮลซิง: "ท่านผู้ถือบัญชี หลีก ข้ารอมาสองร้อยปี"\n'
      + 'ยมบาทน้อย: "ผมจะอ่านบัญชีของเขาให้จบก่อนครับ ถ้าท่านยังอยากลงมือหลังจากนั้น ผมจะไม่ห้าม แต่ไม่ใช่ที่นี่ และไม่ใช่ตอนที่เขาวางอาวุธแล้ว"\n'
      + 'บรรยาย: แวน เฮลซิงมองฝูงค้างคาวที่ซุกตัวในซับโค้ต แล้วมองมือของวาลดริกที่ปัดผงหิมะจากชายเสื้ออย่างเรียบร้อย มือที่ถือไม้เรียวค้างอยู่ครู่หนึ่งก่อนหย่อนลง',
      { title:'The Stake That Did Not Fall', line:
        'Narration: Valdric kneels on one knee in the snow. The bats fly back into the lining of his coat. Van Helsing steps toward him slowly, lantern in his left hand, the sharpened stake in his right. Yama steps in between them.\n'
      + 'Van Helsing: "Keeper of the ledger, move. I have waited two hundred years."\n'
      + 'Yama: "I will read his ledger to the end first. If you still want to act after that, I will not forbid it. But not here, and not while he has laid down his weapon."\n'
      + 'Narration: Van Helsing looks at the bats nesting in the lining of the coat, and at Valdric\'s hands, brushing snow from his hem with care. The hand holding the stake hangs a moment, then lowers.' }),
    page(R.guard, 'ไม่เชื่อตัวเองก่อนหลักฐาน',
      'แวน เฮลซิง: "ข้าเคยเชื่อว่าข้ารู้ทันทุกเสียงกล่อม จนวันที่ข้าไม่ทัน ตั้งแต่วันนั้นข้าไม่เชื่อตัวเองก่อนมีหลักฐาน ท่านยืนระหว่างข้ากับเขา ทั้งที่ทีมของท่านเพิ่งหันอาวุธใส่ท่านเมื่อครู่ ข้าไม่เคยเห็นผู้ตัดสินแบบนี้"\n'
      + 'แวน เฮลซิง: "ข้าขอเฝ้าด่านนี้ให้ท่าน ไม่ใช่เพราะท่านชนะ แต่เพราะท่านอ่านก่อนลงมือ"\n'
      + 'ยมบาทน้อย: "ผมขอบพระคุณครับ ผมจะพยายามให้สมกับที่ท่านฝากไว้"',
      { title:'Not Trusting Myself Before Proof', line:
        'Van Helsing: "I once believed I could outwit every lullaby, until the day I could not. Since that day I do not trust myself before there is proof. You stood between him and me, though your own team had just turned their weapons on you. I have never seen a judge like this."\n'
      + 'Van Helsing: "I ask to keep this gate for you. Not because you won, but because you read before you struck."\n'
      + 'Yama: "I thank you. I will try to deserve what you leave in my care."' }),
    page(R.guard, 'ขี้ผึ้งก้อนหนึ่ง',
      'บรรยาย: แวน เฮลซิงปลดก้อนขี้ผึ้งห่อผ้าเก่าจากเข็มขัด ส่งให้ยมบาทน้อยด้วยมือที่สั่นเล็กน้อยก่อนจะนิ่ง\n'
      + 'แวน เฮลซิง: "เก็บไว้ ข้าทำก้อนนี้ไว้เผื่อแจก ถ้าวันหนึ่งมีเสียงที่ท่านไม่ควรฟัง ท่านยังมีทางปิดหู ไม่ต้องถามว่าข้ารู้ได้อย่างไรว่ามีเสียงแบบนั้น ข้ายังไม่พร้อมเล่า"\n'
      + 'ยมบาทน้อย: "ผมจะเก็บไว้ และผมจะไม่ถามจนกว่าท่านพร้อมครับ"\n'
      + 'แวน เฮลซิง: "...ท่านเป็นคนแรกที่ไม่ถาม"\n'
      + 'วาลดริก: "ข้าขอเดินไปแท่นเอง ท่านผู้มาเยือน"',
      { title:'A Lump of Beeswax', line:
        'Narration: Van Helsing unhooks a lump of beeswax in old cloth from his belt and holds it out to Yama in a hand that trembles slightly, then steadies.\n'
      + 'Van Helsing: "Keep it. I made this one to give away. If ever there is a sound you should not hear, you will still have a way to close your ears. Do not ask how I know there are such sounds. I am not ready to tell."\n'
      + 'Yama: "I will keep it, and I will not ask until you are ready."\n'
      + 'Van Helsing: "...You are the first who has not asked."\n'
      + 'Valdric: "I will walk to the dais myself, honoured guest."' }),
  ] },
  'frontier-west-boss-to-dais':{ title:'พาไปแท่นตัดสิน', en:{ title:'To the Dais' }, pages:[
    page(R.toDais, 'เดินเข้าแสงโคม',
      'บรรยาย: วาลดริกเดินนำหน้าบนลานหินที่หิมะเริ่มละลายเป็นทางตามรอยโคม ยมบาทน้อยกับนิราเดินตามหลัง ผู้เช่าที่เคยหลับอยู่ในคฤหาสน์ค่อย ๆ ตื่นมายืนสองข้างทาง บางดวงถือผ้าห่มหนา ๆ ไว้ในอ้อมแขน ไม่มีใครพูด ไม่มีใครหลบสายตา\n'
      + 'บรรยาย: แวน เฮลซิงเดินตามหลังสุดเงียบ ๆ ตะเกียงแสงขาวในมือสั่นหนึ่งครั้งเมื่อผู้เช่าคนหนึ่งยื่นผ้าห่มผืนหนาให้เขา เขาไม่รับ และไม่ปฏิเสธ',
      { title:'Walking Into Lamplight', line:
        'Narration: Valdric walks ahead across the stone yard where the snow has begun to melt into a trail along the lamplight. Yama and Nira follow. The tenants who once slept in the manor wake little by little and stand along both sides of the road, some with thick blankets in their arms. Nobody speaks. Nobody looks away.\n'
      + 'Narration: Van Helsing walks last and in silence. The white lantern trembles once in his hand when one of the tenants holds a thick blanket out to him. He does not take it, and he does not refuse it.' }),
  ] },
  'frontier-west-boss-punished':{ title:'ลงโทษเรียบร้อย', en:{ title:'Sentence Served' }, pages:[
    page(R.punished, 'ไอร้อนจากกระทะ',
      'บรรยาย: วาลดริกนั่งบนขอบกระทะทองแดงที่ตั้งกลางลานโดยไม่ถอดโค้ต ไอร้อนพุ่งขึ้นปะทะใบหน้าแรงจนน้ำแข็งที่หนวดละลายหมดในพริบตา ชายเสื้อโค้ตเริ่มเป็นรอยไหม้ ฝูงค้างคาวในซับโค้ตดิ้นหนีออกมาบินวนอยู่เหนือกระทะ เขากัดฟัน เสียงต่ำหลุดจากลำคอครั้งหนึ่ง แล้วนั่งต่อไปไม่ขยับ จนไอร้อนจางลงเมื่อฟ้าตะวันออกเริ่มสว่างเป็นคืนแรกในรอบสองร้อยปี\n'
      + 'วาลดริก: "ร้อน ... ร้อนกว่าที่ข้าเคยกลัวมาก ข้ารับไว้ได้ เท่าที่ข้ารับตอนยื่นมือไปหาคนที่ยื่นผ้าห่มให้ข้าในคืนนั้น สองร้อยปีที่ข้าไม่ยอมให้ใครในบ้านหลังนั้นรู้สึกอะไรเลย แม้แต่ข้า"',
      { title:'Steam From the Pan', line:
        'Narration: Valdric sits on the rim of the copper pan set in the middle of the yard, still wearing his coat. Steam surges against his face so hard that the frost in his moustache is gone in a breath. The hem of his coat begins to scorch. The bats in its lining struggle free and circle above the pan. He grits his teeth, a low sound escapes his throat once, and then he sits on without moving, until the steam thins as the eastern sky begins to pale for the first dawn in two hundred years.\n'
      + 'Valdric: "Hot. ... Far hotter than I ever dreaded. I can bear it. I bear it as I bore the night I reached out toward the one who had handed me a blanket. Two hundred years I allowed no one in that house to feel anything at all. Not even myself."' }),
  ] },
  'frontier-west-boss-released':{ title:'ปล่อยกลับชายแดน', en:{ title:'Returned to the Frontier' }, pages:[
    page(R.released, 'ราตรีสั้นลงหนึ่งคืน',
      'บรรยาย: เมื่อครบวาระ ยมบาทน้อยเปิดทางให้วาลดริกกลับขึ้นเนินไปยังคฤหาสน์ด้วยตัวเอง เขาหยุดหน้าประตูใหญ่ แล้วดึงม่านหน้าต่างบานหนึ่งเปิดออกครึ่งบาน แสงโคมจากลานสาดเข้าไปในห้องที่มืดมาสองร้อยปี\n'
      + 'วาลดริก: "ข้ายังเป็นเจ้าของบ้านหลังนี้ ท่านผู้มาเยือน แต่ข้าเลิกเป็นเจ้าของราตรีแล้ว ถ้าใครมาแตะชายแดนนี้อีก ข้าจะออกไปยืนขวางเอง และข้าจะไม่ใช้หมอก"\n'
      + 'แวน เฮลซิง: "ข้าเห็นเขาเปิดม่านแล้ว ข้าจะยังเฝ้าเขาต่อไป ไม่ใช่เพราะข้าไม่เชื่อ แต่เพราะข้าเชื่อได้เฉพาะสิ่งที่ข้าเห็นซ้ำ"\n'
      + 'ยมบาทน้อย: "ผมเห็นด้วยครับ"',
      { title:'One Night Shorter', line:
        'Narration: When the sentence is done, Yama opens the way and Valdric climbs the hill back to his manor on his own. At the great door he stops and draws one curtain half open. Lamplight from the yard spills into a room that has been dark for two hundred years.\n'
      + 'Valdric: "I am still master of this house, honoured guest, but I am no longer master of the night. If anyone touches this frontier again, I shall go out and stand in the way myself, and I shall not use the mist."\n'
      + 'Van Helsing: "I have seen him open the curtain. I will go on watching him, not because I disbelieve, but because I can only believe what I see more than once."\n'
      + 'Yama: "I agree."' }),
  ] },
});
