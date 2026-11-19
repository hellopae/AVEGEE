// T6/2 · Zone 2 case 12 - the father of Guanyin's story; after the verdict she comes down to thank the judge (Rae R2 part B, section 2).
// Text: Output/Rae/2026-11-19-avegee-r2b-zone2-3.md (checked by Reese; the notes "Reese 1.1-1.3 / 3.1 / 3.3" are already in it). Thai lines as written; windows + scenes carry her English too (`en` on a page).
// Keys: `guanyinfather` (the case) · `z2-guanyin-thanks` (the scene, two versions of page 2's lead line: `-ok` = the verdict was right, `-off` = it missed) · notices NGY-1 / NGY-2 / NGY-3.
// She is not judged, does not fight, is not a helper of the lamp (Rae: she is revered - never). The soul on the dais is her father only.
// Pictures (Codex slots, labelled placeholders until drawn - scripts/build-t5-placeholders.py guanyin): H1 soul + profile, H2 she descends, H3 the father bows. H4 (a petal icon) is not needed: the keepsake is a journal note.
export const GUANYIN = Object.freeze({ caseKey:'guanyinfather', arriveNotice:'z2-guanyin-arrive', afterNotice:'z2-guanyin-after', petalNotice:'z2-guanyin-petal', thanksStory:'z2-guanyin-thanks' });
const A = n => `img/z2-events/${n}.webp`;
export const ART = Object.freeze({ sprite:'soul-guanyin-father-asia', portrait:A('soul-guanyin-father-asia-profile'), descends:A('cut-guanyin-descends-asia'), father:A('cut-guanyin-father-asia') });

// ---- 2.3 the case (twist: one false merit + one `deny` the player can catch) ----
export const GUANYIN_CASE = Object.freeze({
  k:'guanyinfather', zone:'asia', sex:'m', sp:'soul-guanyin-father-asia', kind:'twist', calm:true, story:true,
  name:'กษัตริย์ผู้เป็นพระบิดา', who:'อดีตกษัตริย์ในเรื่องเล่าเก่า พระบิดาของธิดาองค์เล็กผู้ปฏิเสธการอภิเษก',
  face:'ชายสูงวัยในเครื่องทรงกษัตริย์ที่ซีดจางตามกาลเวลา ไหล่ตกทั้งที่พยายามยืนตรง ไม่เงยหน้ามองผู้ใด มือสองข้างประสานแน่นเหมือนกำลังกลั้นบางอย่างไว้',
  seen:[
    { t:'สั่งลงโทษธิดาองค์เล็กเพราะนางไม่ยอมอภิเษกตามพระประสงค์', s:'kha', w:4 },
    { t:'สั่งเผาวัดที่ธิดาพำนัก', s:'bian', w:3 },
  ],
  hidden:[
    { t:'ธิดาบอกเหตุผลของนางแล้ว แต่เขาไม่ฟังจนจบ สั่งการจากความโกรธและความอายต่อราชสำนัก', s:'bian', w:1 },
    { t:'ต่อมาประชวรหนักจนหมอหลวงถอดใจ ธิดาที่ถูกลงโทษนั้นเองยอมสละสิ่งที่ตนมีเป็นยารักษา พระองค์หายประชวรและสำนึกผิดตั้งแต่วันนั้น', s:'bian', w:-3 },
  ],
  merits:[
    { t:'หลังหายประชวร สร้างวัดและโรงทานอุทิศแด่ธิดา และไม่เคยสั่งลงโทษผู้ใดเพียงเพราะไม่ทำตามพระประสงค์อีกเลยตลอดรัชสมัยที่เหลือ', v:2, fake:false },
    { t:'ครองบ้านเมืองด้วยความเที่ยงธรรมต่อราษฎรทุกคน', v:1, fake:true },
  ],
  line:'"ข้าเป็นพ่อ ข้าเคยเชื่อว่าข้ากำหนดชีวิตลูกข้าได้ ข้าเชื่อเช่นนั้นมาทั้งชีวิต จนวันที่คนที่ช่วยชีวิตข้า คือลูกที่ข้าลงโทษเอง"',
  claims:[
    { kind:'deny', t:'ข้าไม่ได้สั่งลงโทษลูกข้า ข้าสั่งเพียงให้นางกลับเข้าวัง',
      reveal:'"...ข้าสั่งลงโทษนางจริง ข้าลงนามด้วยมือตัวเอง ข้าเรียกมันว่า \'สั่งให้กลับ\' เพราะอายที่จะเรียกมันตามจริง"' },
    { kind:'boast', t:'ท่านดูบุญของข้าด้วย ข้าครองบ้านเมืองด้วยความเที่ยงธรรมต่อราษฎรทุกคน',
      merit:'ครองบ้านเมืองด้วยความเที่ยงธรรมต่อราษฎรทุกคน',
      reveal:'ท่านถามว่าเที่ยงธรรมกับผู้ที่ไม่ยอมทำตามพระประสงค์ด้วยหรือไม่ เขานิ่งไปนาน — คนแรกที่เขาไม่ยอมฟังจนจบก่อนลงโทษ คือลูกของเขาเอง' },
    { kind:'solid', t:'เรื่องสั่งลงโทษธิดากับสั่งเผาวัด ข้ายอมรับ ข้าทำจริงทั้งสองเรื่อง' },
    { kind:'solid', t:'ข้าไม่ขอให้ท่านเบาเพราะนางเคยช่วยชีวิตข้า และไม่ขอให้ท่านหนักเพื่อให้นางเห็น ข้าขอเพียงให้บันทึกตามที่ข้าทำจริง' },
  ],
  secret:'ส่องกระจกแล้ว ไม่พบความอาฆาตต่อผู้ใด พบเพียงความละอายที่เขาแบกไว้ทุกวันนับแต่หายประชวร และคำตอบของลูกที่เขาไม่ยอมฟังจนจบ',
  reward:'พระบิดาก้มศีรษะรับหมายด้วยสองมือ เดินตามผู้คุมไปโดยไม่ขอให้ใครรู้ว่าตนเป็นใคร',
  fail:'พระบิดาก้มศีรษะรับคำตัดสินโดยไม่เอ่ยสักคำ มือที่ประสานแน่นค่อย ๆ คลายออก เสียงน้ำหยดเบา ๆ ดังมาจากที่ไกลโดยไม่มีท่อน้ำ',
});

// ---- 2.2 windows ----
export const GUANYIN_NOTICES = Object.freeze({
  [GUANYIN.arriveNotice]:{ title:'พระบิดาของผู้ที่คนเคารพ', text:'วิญญาณกษัตริย์ผู้หนึ่งมาถึงคิวพิจารณา ในเรื่องเล่าเก่าเขาคือพระบิดาของธิดาที่ผู้คนเคารพบูชา ตามบัญชีเขาเคยลงโทษธิดาของตนเอง โปรดไต่สวนด้วยความเที่ยงตรง ไม่เอียงตามชื่อของผู้ใด', button:'เริ่มไต่สวน', art:ART.portrait,
    en:{ title:'The Father of One Who Is Revered', text:'The soul of a king has reached the queue. In the old tale he is the father of a daughter whom many revere. The ledger says he once punished his own daughter. Please hear him with a steady hand, and lean toward no one\'s name.', button:'Begin the hearing' } },
  [GUANYIN.afterNotice]:{ title:'แสงขาวลงมากลางโถง', text:'มีผู้ลงมาในโถงพิพากษาเพื่อกล่าวขอบคุณท่าน ขอให้ท่านและนิราต้อนรับด้วยความเคารพ', button:'ต้อนรับ',
    en:{ title:'White Light in the Hall', text:'Someone has come down into the hall to thank you. Please receive her with respect.', button:'Receive her' } },
  [GUANYIN.petalNotice]:{ title:'ได้รับ กลีบบัวขาว', text:'กลีบบัวขาวกลีบหนึ่งตกลงในมือท่านและไม่เหี่ยวเฉา (ของที่ระลึก ไม่มีผลต่อสถิติ)', button:'เก็บไว้',
    en:{ title:'White Lotus Petal Received', text:'A single white lotus petal has fallen into your hand and does not wilt. (A keepsake. It has no effect on stats.)', button:'Keep it' } },
});
/** NGY-3's item line, kept as a journal note (not an inventory item: no stat, no icon to draw) */
export const PETAL_NOTE = 'กลีบบัวขาว · กลีบบัวขาวที่ตกลงกลางโถงพิพากษาในวันที่ผู้พิพากษาไม่เอียง';
export const PETAL_NOTE_EN = 'White lotus petal · A white lotus petal that fell in the judgment hall on the day the judge did not lean.';

// ---- 2.4 the scene (page 2's first line depends on the verdict) ----
const VERDICT_LINE = Object.freeze({
  ok:{ th:'เจ้าแม่กวนอิม: "ท่านชั่งบาปของเขาตรงกับที่เขาทำ ไม่เกินไม่ขาด ข้าขอบคุณ"', en:'Guanyin: "You weighed his wrong as it was done, no more and no less. I thank you."' },
  off:{ th:'เจ้าแม่กวนอิม: "ข้าไม่ได้มาเพื่อบอกว่าท่านชั่งถูกหรือผิด ข้าเห็นว่าท่านตั้งใจชั่งให้ตรง ข้าขอบคุณที่ท่านตั้งใจ"', en:'Guanyin: "I have not come to say whether you weighed rightly or wrongly. I saw that you meant to weigh it true. I thank you for that."' },
});
const thanks = v => ({ title:'แสงขาวกลางโถง', en:{ title:'White Light in the Hall' }, pages:[
  { image:ART.descends, fallback:'📜', title:'ข้ามาขอบคุณ', en:{ title:'I Have Come to Thank You', line:
      'Narration: When the verdict is done, a soft white light drifts down into the judgment hall without a sound. The paper and the pens in the hall fall quiet together. White lotus petals fall in thin streams. A woman in plain white robes, holding a small vase with a willow branch, descends to the end of the light without her feet touching the floor. Her face is calm as still water.\n'
    + 'Narration: Yama rises from the dais, steps down, raises his palms to his brow and bows low. Nira presses her palms too and says nothing.\n'
    + 'Yama: "I bow to Lady Guanyin."\n'
    + 'Guanyin: "Keeper of the ledger, please do not trouble yourself. I have come for nothing but to thank you."' },
    line:
      'บรรยาย: เมื่อคำตัดสินจบ แสงขาวนวลลอยลงมากลางโถงพิพากษาโดยไม่มีเสียง เสียงกระดาษและปากกาในโถงสงบลงพร้อมกัน กลีบบัวขาวร่วงลงเป็นสายบาง ๆ สตรีในอาภรณ์ขาวเรียบ ถือแจกันใบเล็กที่ปักกิ่งหลิว ลอยลงมายืนที่ปลายแสงโดยเท้าไม่แตะพื้น ใบหน้าสงบเหมือนผิวน้ำ\n'
    + 'บรรยาย: ยามาลุกจากแท่น ก้าวลงมา ประนมมือขึ้นจรดหว่างคิ้วแล้วก้มศีรษะต่ำ นิราประนมมือตามโดยไม่เอ่ยสิ่งใด\n'
    + 'ยมบาทน้อย: "ผมขอกราบเจ้าแม่กวนอิมครับ"\n'
    + 'เจ้าแม่กวนอิม: "ท่านผู้ถือบัญชี อย่าลำบากเลย ข้าไม่ได้ลงมาเพื่อสิ่งใดนอกจากกล่าวขอบคุณ"' },
  { image:ART.descends, fallback:'📜', title:'ผู้ที่ไม่เอียง', en:{ title:'The One Who Did Not Lean', line:
      VERDICT_LINE[v].en + '\n'
    + 'Guanyin: "A judge who must rule on the father of one whom people revere often leans one of two ways. Some lean toward me, to please. Some lean toward harshness, so that others will see they do not lean. You leaned neither way. You read his lines to the end."\n'
    + 'Yama: "I do not know whether I deserve thanks. I only did what I swore: to read every line to the end before I judge."\n'
    + 'Guanyin: "What you swore is exactly what I thank you for."' },
    line:
      VERDICT_LINE[v].th + '\n'
    + 'เจ้าแม่กวนอิม: "ผู้พิพากษาที่ต้องตัดสินบิดาของผู้ที่ผู้คนเคารพ มักเอียงไปสองทาง บางคนเอียงเข้าหาข้าเพื่อเอาใจ บางคนเอียงเข้าหาความเข้มงวดเพื่อให้ผู้อื่นเห็นว่าตนไม่เอียง ท่านไม่เอียงทั้งสองทาง ท่านอ่านบรรทัดของเขาจนจบ"\n'
    + 'ยมบาทน้อย: "ผมไม่ทราบว่าสมควรได้รับคำขอบคุณหรือไม่ครับ ผมเพียงทำตามที่ผมสาบานไว้ ว่าจะอ่านทุกบรรทัดให้จบก่อนตัดสิน"\n'
    + 'เจ้าแม่กวนอิม: "สิ่งที่ท่านสาบานไว้นั่นเอง คือสิ่งที่ข้าขอบคุณ"' },
  { image:ART.father, fallback:'📜', title:'ผลของกรรมเป็นของผู้ทำ', en:{ title:'The Weight Belongs to the One Who Did It', line:
      'Narration: Guanyin turns toward the soul kneeling in the hall. The old man bows until his forehead touches the floor and cannot lift his head.\n'
    + 'Guanyin: "Father."\n'
    + 'The Father: "Child ... I do not ask you to forgive me."\n'
    + 'Guanyin: "I stopped holding it against you long ago. But not holding it against you is not erasing what was done. The weight of what was done belongs to the one who did it. Bear it yourself, as I bear mine. But I will be beside the road you walk."\n'
    + 'Narration: Guanyin presses her palms and bows once to her father, then turns and bows once to Yama.\n'
    + 'Nira: "Sir, I have not written down a single line. This time I ask only to listen."\n'
    + 'Narration: The white light fades slowly. The petals on the floor fade with it until they are gone, leaving only a faint fragrance in the hall.' },
    line:
      'บรรยาย: เจ้าแม่หันไปทางวิญญาณที่คุกเข่าอยู่ ชายเฒ่าก้มศีรษะแนบพื้นโถง ไม่กล้าเงยหน้า\n'
    + 'เจ้าแม่กวนอิม: "ท่านพ่อ"\n'
    + 'พระบิดา: "ลูก ... พ่อไม่ขอให้ลูกยกโทษให้พ่อ"\n'
    + 'เจ้าแม่กวนอิม: "ข้าไม่ถือโทษท่านมานานแล้ว แต่การไม่ถือโทษไม่ใช่การลบสิ่งที่ทำ ผลของกรรมเป็นของผู้ทำ ท่านรับมันด้วยตัวท่านเอง เหมือนที่ข้ารับของข้า แต่ข้าจะอยู่ข้างทางที่ท่านเดิน"\n'
    + 'บรรยาย: เจ้าแม่ประนมมือไหว้บิดาหนึ่งครั้ง แล้วหันมาประนมมือไหว้ยามา\n'
    + 'นิรา: "ท่านคะ ดิฉันไม่ได้จดสักบรรทัดเลยค่ะ ครั้งนี้ดิฉันขอฟังอย่างเดียว"\n'
    + 'บรรยาย: แสงขาวค่อย ๆ จางลง กลีบบัวบนพื้นโถงจางตามจนหาย เหลือเพียงกลิ่นหอมอ่อน ๆ ในโถง' },
] });
export const GUANYIN_STORIES = Object.freeze({ 'z2-guanyin-thanks-ok':thanks('ok'), 'z2-guanyin-thanks-off':thanks('off') });
