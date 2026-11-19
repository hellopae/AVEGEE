// T6/3 · Wukong leaves a flame in the lamp (Rae R2 part B, section 3) - helper no. 4, "Strand Barrage".
// Inserted into the old scene z2-wukong-return (Rae 0.2 / 3.1): page 1 + page 2 up to "ผมสัญญาครับ" stay in `z2-wukong-return`, then `z2-wukong-flame` (1 page), then the last narration line
// (the golden cloud) as `z2-wukong-leave`. The flame scene hands over the helper (D4); the "new helper in the lamp" window NA-2 follows (the generic `lamp-helper-wukong`).
// Pictures: W1 icon + battle = copies of Wukong's boss drawings (img/summon/icon-wukong.webp, battle-wukong.webp), W2 = the clones cut as a stand-in, W3 = his "returns" cut as a stand-in (all replaceable by name).
export const WUKONG_FLAME = Object.freeze({ story:'z2-wukong-flame', leaveStory:'z2-wukong-leave' });
export const ART = Object.freeze({ flame:'img/z2-events/cut-wukong-flame-asia.webp', icon:'img/summon/icon-wukong.webp', battle:'img/summon/battle-wukong.webp', cut:'img/summon/cut-wukong-strand-barrage.webp' });

export const WUKONG_STORIES = Object.freeze({
  [WUKONG_FLAME.story]:{ title:'ขนเส้นเดียว', en:{ title:'A Single Hair' }, pages:[
    { image:ART.flame, fallback:'📜', title:'ขนเส้นเดียวของข้า', en:{ title:'A Single Hair of Mine', line:
        'Narration: Wukong plucks a single golden hair from his shoulder and blows on it softly. It kindles into a still golden flame and drifts into the Magic Lamp at Yama\'s side.\n'
      + 'Wukong: "I have blown that hair into a thousand clones, and never once for anyone to carry. You read my troop\'s ledger to the end. It is yours."\n'
      + 'Wukong: "Light the lamp and call my name and I will come, wherever I am under heaven. But that flame is limited. Spend it well."\n'
      + 'Yama: "I accept it with respect."\n'
      + 'Wukong: "Do not respect me. Keep the promise you made about the hand that changed the ledger. That is enough."' },
      line:
        'บรรยาย: หงอคงถอนขนทองหนึ่งเส้นจากไหล่ เป่าเบา ๆ ขนเส้นนั้นลุกเป็นเปลวสีทองนิ่ง ลอยเข้าไปในตะเกียงวิเศษที่ห้อยข้างเอวยามา\n'
      + 'หงอคง: "ขนเส้นนี้ข้าเคยเป่าเป็นร่างแยกนับพันครั้ง ไม่เคยเป่าให้ใครถือ เจ้าอ่านบัญชีฝูงข้าจนจบ ข้าให้เจ้า"\n'
      + 'หงอคง: "จุดตะเกียงแล้วเรียกชื่อข้า ข้าจะมา ไม่ว่าอยู่ปลายฟ้าไหน แต่ไฟนี้มีจำกัด ใช้ให้คุ้ม"\n'
      + 'ยมบาทน้อย: "ผมรับไว้ด้วยความเคารพครับ"\n'
      + 'หงอคง: "ไม่ต้องเคารพข้า รักษาคำที่เจ้าสัญญาไว้เรื่องมือที่แก้บัญชี ก็พอ"' },
  ] },
});

/** 3.3 the helper's text rows for lamp.js (Thai + English) */
export const WUKONG_HELPER = Object.freeze({
  name:{ th:'หงอคง', en:'Wukong' },
  move:{ name:{ th:'ขนวิเศษรุมซัด', en:'Strand Barrage' },
    desc:{ th:'หงอคงเป่าขนเป็นร่างแยกหลายตน รุมซัดศัตรูตัวเดียวพร้อมกันหลายครั้ง', en:'Wukong blows his hair into several clones that strike a single foe together, again and again.' } },
  say:{ call:{ th:'หงอคง: "เจ้าเรียกข้าแล้ว ข้ามาแล้ว ชี้เป้ามา!"', en:'Wukong: "You called. I am here. Point me at them!"' },
    use:{ th:'หงอคง: "ออกมาเถิด พวกเรา รุมมัน!"', en:'Wukong: "Out you come, all of you. Get him!"' },
    end:{ th:'หงอคง: "ขนข้าเหลือเท่านี้ เรียกอีกเมื่อเจ้าต้องการ"', en:'Wukong: "That is all the hair I can spare. Call me again when you need me."' } },
});
