// T8a/2 (Rae R2 part D, section 1.5-1.7): Lucifer's colosseum in the cave of Frontier 3-4 - ten bouts in a row at the middle checkpoint of the walk (the team = Yama + Nira + HOME-67). Bouts 1-8 are the table of 1.5 (copied verbatim by
// scripts/extract-rae-z4a.py), bout 9 = Thor (win -> helper no. 10 "The Hammer Commands the Field", NT-1), bout 10 = Lucifer (win -> helper no. 11 "The Founder's Decree", NL-1, and the Lucifer’s Eye pendant).
// Each bout is a gate event (`colS1`..`colS10`, never by the case count): banner N-COL-2, one line before, one line after (the winner's), one card move; a lost bout = the tea house, then the SAME bout again at no cost (N-COL-1).
// Numbers (hp / atk) are Toby's first ones, no spec. The warn / use lines of the bouts' moves are Rae's (MOVE_TEXT, T9; bout 8 uses the name of R2 1.5, Reese's fix).
import { RAW_BOUTS, RAW_HELPERS } from './z4a-raw.js';
const A = n => `img/z4-events/${n}.webp`;
const L2 = (th, en) => ({ th, en });
export const COL = Object.freeze({ checkpoint:1, noticeMouth:'col-mouth', bouts:10, key:n => `colS${n}`, sprite:n => `col-s${n}`, card:n => A(`cut-col-s${n}`), thorWin:'col-thor-win', luciferOpen:'col-lucifer-open', luciferWin:'col-lucifer-win', helperThor:'thor', helperLucifer:'lucifer' });

export const Z4_ART_KEY = /^col-s(10|[1-9])(-profile)?$/;   // sprites / profiles of the bouts: img/z4-events/<key>.webp

/** the ten bouts: name / pre / win / move are Rae's {th,en}; `kind` of the move decides group or single (Rae's proposals where she gave one: Gaze of Stone, Broadside, Scanning Beam, Roaring Hammer = group; the rest single) */
const EXTRA = {
  3:{ winAdd:L2('นิรา: "ท่านคะ ดิฉันขอบันทึกว่านายขนมต้มไหว้ผู้ชนะก่อนลงจากเวทีค่ะ"', 'Nira: "I note for the record that Nai Khanom Tom paid his respects to the victor before leaving the stage, sir."') },
  7:{ winAdd:L2('HOME-67: "ผมเดาว่าเขาไม่ใช่เหยื่อและไม่ใช่ผู้ร้ายครับ เขาเป็นแขกที่ผ่านมาแล้วไม่มีใครส่งกลับบ้าน"', 'HOME-67: "I guess he is neither victim nor villain. He is a guest who passed through and was never sent home."') },
};
const GROUP = new Set([5, 6, 7, 9]);
const T = (n, name, pre, win, move, extra = {}) => ({ n, name, pre, win, move, group:GROUP.has(n), ...extra });
export const BOUTS = Object.freeze([
  ...Object.entries(RAW_BOUTS).map(([n, r]) => T(Number(n), r.name, r.pre, r.win, r.move, EXTRA[n] || {})),
  T(9, L2('ธอร์', 'Thor'), L2('เจ้าตัวเล็กแต่ยืนตรงดีนี่! ข้าไม่ถนัดการออมมือ ขอบอกไว้ก่อน', 'Small, but you stand straight. I am no good at holding back. I tell you now.'),
    L2('ธอร์ทรุดนั่งบนพื้นสังเวียน', 'Thor sinks down on the arena floor.'), L2('ค้อนฟ้าคำราม', 'Roaring Hammer'),
    { announce:L2('ลูซิเฟอร์: "ท่านทั้งหลาย ด่านเก้า แชมป์สังเวียนของข้า ธอร์!"', 'Lucifer: "Ladies and gentlemen, bout nine, the champion of my arena. Thor!"'),
      half:L2('ธอร์: "ฮ่า ๆ! ข้าไม่ได้หัวเราะแบบนี้มานานแล้ว สู้ต่อ!"', 'Thor: "Ha ha! I have not laughed like this in ages. On with it!"'), winLine:false, speaker:L2('ธอร์', 'Thor') }),
  T(10, L2('ลูซิเฟอร์', 'Lucifer'), L2('ข้าไม่เคยลืมกติกา ข้าเคยเขียนมันเอง', 'I never forget a rule. I wrote them all.'),
    L2('ข้าแพ้', 'I lose.'), L2('ม่านปิดสังเวียน', 'Final Curtain'),
    { half:L2('ลูซิเฟอร์: "ดี ท่านยังอ่านจังหวะข้าได้ ข้าจะเพิ่มความเร็ว"\nนิรา: "ท่านคะ เขาใช้ไม้เท้าเป็นตัวกำหนดจังหวะ ไม่ใช่ใช้ตีค่ะ"', 'Lucifer: "Good. You can still read my timing. I will speed up."\nNira: "Sir, he uses the staff to set the tempo, not to strike."'), winLine:false, speaker:L2('ลูซิเฟอร์', 'Lucifer') }),
]);
/** warn ("one line, a dash, what happens next turn") and use line of the ten moves - Rae's wording (T9); group moves say "the whole team", single ones "one of you" (as `kind` in the engine). Bout 8 carries the name of R2 1.5 (Reese). */
const MOVE_TEXT = Object.freeze({
  1:{ warn:L2('ซามูไรไร้นายวางมือบนด้ามดาบ นิ่งสนิท — รอบหน้าเขาจะชักดาบฟันหนักใส่คนเดียว!', 'The Masterless Samurai rests a hand on his hilt, perfectly still. Next turn he draws and strikes one of you hard!'), use:L2('ซามูไรไร้นาย: "ประกายดาบหนึ่งเดียว!"', 'The Masterless Samurai: "One-Draw Flash!"') },
  2:{ warn:L2('นินจาธรรมดาหายเข้าเงาหลังม่านสังเวียน — รอบหน้าเขาจะโผล่มาฟันหนักใส่คนเดียว!', 'The Plain Ninja slips into the shadow behind the arena curtain. Next turn he comes out and strikes one of you hard!'), use:L2('นินจาธรรมดาโผล่ออกมาจากเงาหลังฉาก — เงาหลังฉาก!', 'The Plain Ninja steps out of the shadow behind the curtain: Shadow Behind the Curtain!') },
  3:{ warn:L2('นายขนมต้มตั้งการ์ดต่ำ ตาจับอยู่ที่คนเดียว — รอบหน้าเขาจะส่งศอกกลับหนักใส่คนนั้น!', 'Nai Khanom Tom drops his guard low, his eyes on one of you. Next turn he throws a reverse elbow at that one, hard!'), use:L2('นายขนมต้ม: "ศอกกลับ!"', 'Nai Khanom Tom: "Reverse Elbow!"') },
  4:{ warn:L2('มิโนทอร์ก้มเขาลงและขูดกีบกับพื้นหิน — รอบหน้ามันจะพุ่งขวิดหนักใส่คนเดียว!', 'The Minotaur lowers his horns and scrapes a hoof on the stone. Next turn he charges one of you hard!'), use:L2('มิโนทอร์: "พุ่งขวิดเขาวงกต!"', 'The Minotaur: "Labyrinth Charge!"') },
  5:{ warn:L2('ประกายเงินน้ำเงินเริ่มสว่างในดวงตาเมดูซา — รอบหน้าสายตาของเธอจะกวาดทั้งทีม!', 'A silver-blue glow wakes in Medusa\'s eyes. Next turn her gaze sweeps the whole team!'), use:L2('เมดูซา: "สายตาหินแข็ง!"', 'Medusa: "Gaze of Stone!"') },
  6:{ warn:L2('ปืนใหญ่ทั้งแถวหันปากกระบอกมาทางทีม — รอบหน้ากัปตันคลื่นเงินจะสั่งยิงใส่ทั้งทีม!', 'A whole row of cannon swings round to face your team. Next turn Captain Silverwave orders them to fire on all of you!'), use:L2('กัปตันคลื่นเงิน: "ปืนใหญ่ไล่คลื่น!"', 'Captain Silverwave: "Broadside!"') },
  7:{ warn:L2('ผู้มาเยือนจากดาวเก่าเงียบลง เส้นแสงบาง ๆ เริ่มสว่างในดวงตา — รอบหน้าลำแสงจะกวาดสแกนทั้งทีม!', 'The Visitor From an Old Star goes quiet, and a thin line of light grows in its eyes. Next turn a beam sweeps and scans the whole team!'), use:L2('ผู้มาเยือนจากดาวเก่า: "ลำแสงสแกนร่าง!"', 'The Visitor From an Old Star: "Scanning Beam!"') },
  8:{ warn:L2('ยักษ์เหล็กซี-8 ยกกำปั้นเหล็กขึ้นเหนือหัว จอหน้าอกขึ้นว่า [กำลังล็อกเป้าหมาย] — รอบหน้าหมัดจะตกหนักใส่คนเดียว!', 'C-8, the Steel Colossus, raises an iron fist overhead. Its chest display reads [Locking target]. Next turn the fist falls on one of you, hard!'), use:L2('ยักษ์เหล็กซี-8: "[ดำเนินการ] หมัดเหล็กจากฟ้า!"', 'C-8, the Steel Colossus: "[Executing] Iron Fist From Above!"') },
  9:{ warn:L2('ธอร์ยกค้อนขึ้นเหนือหัว ประกายฟ้าไต่ตามด้าม — รอบหน้าสายฟ้าจะฟาดทั้งทีม!', 'Thor lifts the hammer overhead and sparks climb the haft. Next turn lightning strikes the whole team!'), use:L2('ธอร์: "ค้อนฟ้าคำราม!"', 'Thor: "Roaring Hammer!"') },
  10:{ warn:L2('ลูซิเฟอร์ยกปลายไม้เท้าชี้ไปที่คนหนึ่ง — รอบหน้าม่านแสงของสังเวียนจะปิดลงใส่คนนั้นอย่างหนัก!', 'Lucifer raises the tip of his staff and points at one of you. Next turn the arena\'s curtain of light falls on that one, hard!'), use:L2('ลูซิเฟอร์: "ม่านปิดสังเวียน"', 'Lucifer: "Final Curtain."') },
});
const hpOf = n => (n <= 8 ? 190 + 25 * n : n === 9 ? 440 : 500);
const atkOf = n => [14 + n, 22 + n];
/** the move of a bout as a rulebook entry (boss-skills.js): announced one turn ahead, TH + EN, a card for the group moves */
const skillOf = b => Object.freeze([Object.freeze({ id:`colMove${b.n}`, kind:b.group ? 'groupHit' : 'heavyHit', warn:1, power:b.group ? .7 : 1.6, name:L2(b.move.th, b.move.en),
  warnText:MOVE_TEXT[b.n].warn,
  useText:MOVE_TEXT[b.n].use, when:{ firstAct:3, everyActs:4 }, ...(b.group ? { image:COL.card(b.n) } : {}) })]);
const speaker = b => b.speaker || b.name;
/** ZONE_EVENTS rows (data.js appends them to Zone 3's list: the walk of Frontier 3-4 starts there) */
export const COL_EVENTS = Object.freeze(BOUTS.map(b => ({ k:COL.key(b.n), atCases:999, mode:'single', gate:true, colBout:b.n,
  title:L2(`ศึกสังเวียน ด่านที่ ${b.n} · ${b.name.th}`, `Arena bout ${b.n} · ${b.name.en}`), alert:L2(b.pre.th, b.pre.en), go:L2('เข้าสังเวียน', 'Enter the arena'), retry:L2('สู้อีกครั้ง', 'Try again'),
  banner:L2(`ศึกสังเวียน ด่านที่ ${b.n} · ${b.name.th}`, `Arena bout ${b.n} · ${b.name.en}`),
  lines:{ start:[b.announce?.th, `${speaker(b).th}: "${b.pre.th}"`].filter(Boolean).join('\n'), ...(b.half ? { half:b.half.th } : {}) },
  linesEn:{ start:[b.announce?.en, `${speaker(b).en}: "${b.pre.en}"`].filter(Boolean).join('\n'), ...(b.half ? { half:b.half.en } : {}) },
  win:{ title:L2(`ผ่านด่านที่ ${b.n}`, `Bout ${b.n} won`).th, text:b.winLine === false ? b.win.th : [`${speaker(b).th}: "${b.win.th}"`, b.winAdd?.th].filter(Boolean).join('\n'),
    en:{ title:`Bout ${b.n} won`, text:b.winLine === false ? b.win.en : [`${speaker(b).en}: "${b.win.en}"`, b.winAdd?.en].filter(Boolean).join('\n') } },
  loseText:{ title:'ลองด่านเดิมใหม่ได้', text:'แพ้แล้วลองด่านเดิมใหม่ได้ ไม่เสียอะไร', en:{ title:'Try the same bout again', text:'If you lose, you may try the same bout again at no cost.' } },
  foe:{ name:b.name.th, nameEn:b.name.en, sp:COL.sprite(b.n), hp:hpOf(b.n), atk:atkOf(b.n), boss:true, skills:skillOf(b) },
  ...(b.n === 9 ? { winStories:[COL.thorWin] } : b.n === 10 ? { openStory:COL.luciferOpen, winStories:[COL.luciferWin] } : {}),
  reward:b.n === COL.bouts ? { coin:0, item:'luciferEye' } : { coin:0 }, lose:{ hp:9 } })));

/** N-COL-1 (the window when the team reaches the mouth of the arena) · NT-1 · NL-1 (the helper windows replace the generic ones: z1-events.js maps them to `lamp-helper-<k>`) */
export const COL_NOTICES = Object.freeze({
  [COL.noticeMouth]:{ title:'โคลอสเซียมของลูซิเฟอร์', text:'ทางผ่านชายแดนนี้ต้องผ่านสังเวียน 10 ด่านทีละคู่ ชนะต่อเนื่องจึงผ่านได้ แพ้แล้วลองด่านเดิมใหม่ได้ ไม่เสียอะไร', button:'เข้าสังเวียน', art:A('cut-col-gate'),
    en:{ title:'Lucifer\'s Colosseum', text:'The road through this frontier runs through a ten-bout arena, one opponent at a time. Win in sequence to pass. If you lose, you may try the same bout again at no cost.', button:'Enter the arena' } },
  'lamp-helper-thor':{ title:'ธอร์ฝากค้อนไว้ในตะเกียง', text:'ธอร์ยอมรับเป็นพันธมิตรของท่าน เรียกเขาในศึกได้ เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม', button:'ดูตะเกียง', openLamp:true, art:'img/summon/icon-thor.webp',
    en:{ title:'Thor Leaves a Hammer in the Lamp', text:'Thor accepts you as an ally. You can call him in battle, once, and he stays in your team for 3 turns. When the flame is spent, recharge at the Mirror Tower.', button:'See the Lamp' } },
  'lamp-helper-lucifer':{ title:'ผู้ก่อตั้งสังเวียนฝากชื่อไว้ในตะเกียง', text:'ลูซิเฟอร์รับคำท้าและฝากชื่อไว้ในตะเกียงวิเศษ ท่านเรียกเขาในศึกได้ เรียกได้ 1 ครั้ง อยู่ในทีม 3 ตา หมดแล้วเติมไฟที่หอส่องกรรม', button:'ดูตะเกียง', openLamp:true, art:'img/summon/icon-lucifer.webp',
    en:{ title:'The Arena\'s Founder Leaves His Name in the Lamp', text:'Lucifer accepts the challenge and leaves his name in the Magic Lamp. You can call him in battle, once, and he stays in your team for 3 turns. When the flame is spent, recharge at the Mirror Tower.', button:'See the Lamp' } },
});

/** helpers no. 10 and 11 (Rae 1.6-a / 1.7-a, her tables copied by the script): Thor = group hit + stun 1 round (60 % = her "if too strong" option) · Lucifer = one foe, a heavy blow + that foe hits weaker for one round */
const helperOf = (r, k) => Object.freeze({ name:L2(r.name.th, r.name.en), move:{ name:L2(r.move.th, r.move.en), desc:L2(r.desc.th, r.desc.en) },
  say:{ call:L2(r.call.th, r.call.en), use:L2(r.use.th, r.use.en), end:L2(r.end.th, r.end.en) } });
export const THOR_HELPER = helperOf(RAW_HELPERS.thor, 'thor'), LUCIFER_HELPER = helperOf(RAW_HELPERS.lucifer, 'lucifer');
export const COL_ART = Object.freeze({ thorIcon:'img/summon/icon-thor.webp', thorBattle:'img/summon/battle-thor.webp', thorCut:'img/summon/cut-thor-hammer-rules.webp',
  luciferIcon:'img/summon/icon-lucifer.webp', luciferBattle:'img/summon/battle-lucifer.webp', luciferCut:'img/summon/cut-lucifer-decree.webp' });
