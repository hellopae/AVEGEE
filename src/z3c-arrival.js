// T7/1 (Rae R2 part C, section 1): Zone 3 case 0 - arriving in the West. NO Cerberus here any more (he keeps the western gate, part B): the spirits under the spell are the only fight,
// then Poena's duty roster carries the PHANTOM-404 clue (moved from the old Cerberus roster). Text is Rae's, copied verbatim (TH + EN). This module imports nothing (data.js / z1-events.js read it).
// Keys: `westHypnotized` (the event, data.js) · `z3-arrive` (2 pages, queued on the first arrival in Zone 3) · `z3-clear` (1 page) · notices N0-1 (the event alert), N0-2 (map label), N0-3 (banner), N0-4' (`z3-cleared`).
const ART = 'img/z3-events/cut-arrive-west.webp';   // placeholder until Codex draws it (Rae sec. 9 #1: the stone square under the first lamp, Yama in the Zone 3 robes, NO hound)
export const Z3_ARRIVE = Object.freeze({ eventKey:'westHypnotized', arriveStory:'z3-arrive', clearStory:'z3-clear', clearedNotice:'z3-cleared', art:ART,
  spiritSprites:['spirit1', 'spirit2', 'spirit3'] });

/** N0-1 (event alert) · N0-2 (the map label, i18n west.rescue.approach / build.westBlocked) · N0-3 (banner) */
export const Z3_ARRIVE_TEXT = Object.freeze({
  title:{ th:'วิญญาณถูกสะกดจิต', en:'Spirits under a spell' },
  alert:{ th:'วิญญาณหลายดวงเดินวนในลานโดยไม่รู้ตัว ปลดมนต์ให้หมดก่อน จึงจะสร้างสถานที่ได้', en:'Several spirits are pacing the square without knowing it. Break the spell on all of them first. Nothing can be built until you do.' },
  go:{ th:'ไปปลดสะกด', en:'Break the spell' },
  approach:{ th:'เดินเข้าไปปลดสะกดวิญญาณหลงทาง', en:'Approach the wandering spirits and break the spell' },
  banner:{ th:'ปลดสะกด · วิญญาณหลงทาง', en:'Breaking the spell · wandering spirits' },
  foe:{ th:'วิญญาณถูกสะกด', en:'Spirit under a spell' },
  // 1.5 (Nira's two lines are said in the fight, Poena's closes it)
  lines:{ start:'นิรา: "ท่านคะ อย่าฟาดแรงเกินไปนะคะ พวกเขาไม่ได้เจตนา ปลดมนต์ได้แล้วพวกเขาจะหยุดเอง"', first:'นิรา: "ดวงแรกสร่างแล้วค่ะ เขากำลังถามหาชื่อของตัวเอง"', last:'โพเอน่า: "ทุกดวงกลับเข้าคิวแล้ว ข้านับให้ ขอบใจ"' },
  linesEn:{ start:'Nira: "Sir, please do not strike too hard. They mean no harm. Once the spell is broken they will stop on their own."', first:'Nira: "The first one has come to himself. He is asking for his own name."', last:'Poena: "All of them are back in the queue. I counted. My thanks."' },
  win:{ title:'ปัจฉิมกลับเข้าคิวแล้ว', text:'วิญญาณทุกดวงหลุดจากมนต์แล้ว และท่านสร้างสถานที่ได้ตั้งแต่บัดนี้' },
});
/** N0-4' (after the last spirit) */
export const Z3_ARRIVE_NOTICES = Object.freeze({
  [Z3_ARRIVE.clearedNotice]:{ title:'ปัจฉิมกลับเข้าคิวแล้ว', text:'วิญญาณทุกดวงหลุดจากมนต์แล้ว และท่านสร้างสถานที่ได้ตั้งแต่บัดนี้', button:'ต่อ', art:'img/frontier-west-hypnosis-v1.webp',
    en:{ title:'The West is back in line', text:'Every spirit is free of the spell. You may build from this moment.', button:'Continue' } },
});
/** PHANTOM-404 note on Poena's roster (journal) */
export const Z3_PHANTOM_NOTE = Object.freeze({ th:'PHANTOM-404: ใบเวรของโพเอน่าผิดปกติ ถูกแก้จากภายนอก', en:"PHANTOM-404: Poena's duty roster out of order, altered from outside." });

const page = (image, title, line, en) => ({ image, title, line, fallback:'📜', en });
export const Z3_ARRIVE_STORIES = Object.freeze({
  'z3-arrive':{ title:'ปัจฉิมที่เงียบเกินไป', en:{ title:'A West That Is Too Quiet' }, pages:[
    page(ART, 'ผู้พิทักษ์ประตูปัจฉิมยอมเปิดให้ท่าน',
      'บรรยาย: ยามาในชุดปัจฉิมที่ได้รับจากเหลียนกังก้าวผ่านประตูหินเข้าสู่ลานหินปกคลุมหิมะบาง โคมเหล็กเรียงสองข้างทางยังจุดอยู่ แต่ไม่มีใครเดินสวนมา มีเพียงโพเอน่ากับพ่อค้านรกยืนรออยู่ใต้โคมดวงแรก ส่วนไกลออกไปมีวิญญาณสองสามดวงเดินวนเป็นวงช้า ๆ ตาเปิดแต่ไม่มองอะไร\n'
      + 'โพเอน่า: "ท่านมาแล้ว และท่านผ่านประตูเข้ามาได้ ข้าไม่เชื่อสายตา สามเศียรนั่นไม่เคยเปิดทางให้ใครเลยสักคนในสมัยข้าเฝ้าเวร ข้ายังจำเสียงมันหอนใส่เจ้าหน้าที่ใหม่ทุกคนได้ ท่านทำอะไรกับมัน"\n'
      + 'ยมบาทน้อย: "ผมเพียงไม่ถอยครับ"\n'
      + 'พ่อค้านรก: "ข้ามีของจะขาย แต่ตอนนี้ไม่มีใครซื้อ ลูกค้าทุกคนเดินผ่านข้าไปเหมือนข้าเป็นเสาโคม"',
      { title:'The Guardian of the Western Gate Let You Through', line:
        'Narration: Yama, in the robes of the West that Lian Gang gave him, steps through the stone gate into a square of thin snow. Iron lamps still burn along both sides of the road, but nobody walks toward you. Only Poena and the hell merchant stand waiting under the first lamp. Farther off, two or three spirits circle slowly, eyes open, looking at nothing.\n'
      + 'Poena: "You came, and you came through the gate. I do not believe my own eyes. That three-headed one never opened for a single soul in all my watches. I still remember it howling at every new clerk. What did you do to it?"\n'
      + 'Yama: "I only did not retreat."\n'
      + 'Hell Merchant: "I have goods to sell, but nobody is buying. Every customer walks past me as if I were a lamp-post."' }),
    page(ART, 'หมอกที่ไม่ได้หนาว',
      'นิรา: "ท่านคะ ดิฉันตรวจแล้ว ไม่ใช่โรคและไม่ใช่ความลืมค่ะ หมอกบาง ๆ ลอยมาจากชายแดนทางเหนือและตกลงบนบ่าของวิญญาณทุกดวง ดวงที่หมอกหนาที่สุดเดินวนเร็วที่สุดค่ะ"\n'
      + 'โพเอน่า: "ข้าเรียกชื่อพวกมันสามรอบ ไม่มีใครหัน ข้าไม่กล้าเข้าใกล้หมอกนั่น มันทำให้มือข้าเบาแบบที่ข้าไม่ชอบ"\n'
      + 'ยมบาทน้อย: "ผมเข้าใจครับ ผมจะปลดมนต์วิญญาณพวกนี้ก่อน ผมไม่อยากให้ใครเจ็บเกินจำเป็น"',
      { title:'A Mist That Is Not Cold', line:
        'Nira: "Sir, I have examined them. This is neither illness nor forgetting. A thin mist drifts down from the northern frontier and settles on the shoulders of every spirit, and the ones under the thickest mist circle fastest."\n'
      + 'Poena: "I called their names three times. Not one turned. I dare not go near that mist. It makes my hands light in a way I do not like."\n'
      + 'Yama: "I understand. I will break the spell on these spirits first. I do not want anyone hurt more than needed."' }),
  ] },
  'z3-clear':{ title:'ใบเวรผิดปกติ', en:{ title:'A Duty Roster Out of Order' }, pages:[
    page(ART, 'ลายมือที่ไม่ใช่ของข้า',
      'บรรยาย: วิญญาณดวงสุดท้ายยืนนิ่ง ตาที่ไร้โฟกัสกลับมามีแสง ลมหนาวพัดหมอกบางจากบ่าของเขาหลุดออกเป็นฝอยแล้วหายไปในหิมะ\n'
      + 'โพเอน่า: "ข้านับครบแล้ว แต่ใบเวรของข้าไม่ครบ มีบรรทัดหนึ่งที่ข้าไม่เคยเขียน ข้าไม่เคยลงเวรกะดึกวันที่ห้า แต่ในใบมีลายเซ็นข้า"\n'
      + 'นิรา: "ท่านคะ ดิฉันขออ่านค่ะ ... ใบเวรของโพเอน่าที่หอทะเบียนผิดปกติ ถูกแก้จากข้างนอก รหัสผู้แก้คือ [PHANTOM-404] ดิฉันขอจดไว้ค่ะ"',
      { title:'A Hand That Is Not Mine', line:
        'Narration: The last spirit stands still. The unfocused eyes find their light again, and the cold wind tears the thin mist from his shoulders into threads that vanish into the snow.\n'
      + 'Poena: "I have counted them all. But my duty roster does not add up. There is a line I never wrote. I never took the night watch on the fifth day, yet my signature is on it."\n'
      + 'Nira: "May I read it, sir? ... Poena\'s duty roster at the registry is out of order. It was altered from outside. The alterer\'s code is [PHANTOM-404]. I will note it down."' }),
  ] },
});
