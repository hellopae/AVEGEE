// QUEST-REWARDS (10 พ.ย. 2569) — ฉากต่อสู้ท้ายภารกิจ sqKan / sqBoon / sqGuard
// บทและท่าไม้ตายมาจาก Rae: Output/Rae/2026-11-10-avegee-quest-battle-script.md (บทด้านล่างคัดมาทุกตัวอักษร ห้ามแก้ที่นี่ ให้แก้ผ่าน Rae)
// ที่ไม่ใช่บทของ Rae มีเฉพาะ `standby*` / `loseNote` (ข้อความระบบชั่วคราว) — ดูหัวข้อ "ข้อความที่ Rae ควรเกลา" ในรายงาน
// รูปแบบบท: บรรทัดบรรยายไม่มีป้าย · บรรทัดพูดขึ้นต้นด้วยชื่อผู้พูดและเครื่องหมายคำพูด (เหมือน SIDE_CONTENT)
// ภาพศัตรู: เงาชุดใหม่ที่ Codex วาด (img/mob-q-*.webp, 13 พ.ย. 2569)
import { scaleFoeHp, scaleFoeAtk } from './data.js';
import { featherText } from './feather-quest.js';

const Q = (text) => text;   // marker only: keeps the lines greppable as verbatim Rae copy

export const QUEST_FIGHTS = Object.freeze({
  sqKan: {
    zone:'asia', owner:'kan', ownerName:'ซาโตริ', title:'เงาเจ้าหนี้', skill:'eyeAwaitingPermission',
    // เจ้าของภารกิจ (ซาโตริ) เป็นกานต์ของบูรพา · PART-A: ภารกิจขึ้นต่อเมื่อจ้างแล้ว จึงเข้าทีมสู้เสมอ ยกเว้นล้ม/พักฟื้นอยู่ (ยืนข้างสนาม = fallback)
    pre:{
      0:[
        Q('ซาโตริวางพู่กันลงบนกระดาษเปล่า ผู้ต้องหาเงยหน้าขึ้นเป็นครั้งแรกในรอบสิบเอ็ดปี'),
        Q('เงาสีดำสูงเท่าประตูผุดขึ้นด้านหลังเขา มือหนึ่งถือสมุดบัญชีหนี้ อีกมือถือเชือกเส้นยาว'),
        Q('เงาเจ้าหนี้: "ปิดปากไว้ ... ถ้าพูดออกมา เธอต้องใช้หนี้แทน"'),
        Q('ซาโตริ: "ข้าอ่านมันได้ แต่ข้าไม่อยากอ่านต่อโดยไม่ถามเขาอีกแล้ว ท่านช่วยกันมันไว้ที ข้าจะส่องให้เห็นว่ามันจะลงมือตรงไหน"'),
      ],
      1:[
        Q('ผู้ต้องหายังคงเงียบ มือสองข้างกำแน่นบนตัก'),
        Q('เงาสีดำก้มลงมาข้างหูเขา ถือสมุดบัญชีหนี้กับเชือกเส้นยาว'),
        Q('เงาเจ้าหนี้: "พูดก็ผิด ... ไม่พูดก็ผิด ... ไม่ว่าทางไหน เธอก็ไม่พ้น"'),
        Q('ซาโตริ: "ความเงียบของเขาเป็นของเขา ข้าไม่ยอมให้ใครแย่งไปทั้งสองทาง ท่านช่วยข้าที"'),
      ],
    },
    // บรรทัดเสริมเมื่อเปิดเรื่องส่วนตัวด้วยกระจก/สะกดจิต (verdict.privateOpened) — ใส่ต่อจากบรรทัดแรกของทั้งสองทาง
    preExtraIfPrivate:Q('ซาโตริ: "เรื่องที่ถูกเปิดด้วยกระจก มันแรงกว่าที่ข้าเคยเห็น ระวังเงาลูกของมันด้วย"'),
    win:{
      0:[
        Q('เงาเจ้าหนี้ฉีกเป็นเศษกระดาษบัญชีที่ไม่มีตัวเลขสักบรรทัด ปลิวหายไปกับลม'),
        Q('ผู้ต้องหาหยิบพู่กันเอง เขียนได้บรรทัดเดียว แล้ววางลง'),
        Q('ซาโตริ: "ข้าอ่านมันไม่ได้แล้วครับ ... ก็ดี ต่อจากนี้ข้าจะไม่เปิดอ่านอะไรของเขา ถ้าเขาไม่ได้ยื่นให้เอง"'),
      ],
      1:[
        Q('เงาเจ้าหนี้ฉีกเป็นเศษกระดาษบัญชีที่ไม่มีตัวเลขสักบรรทัด ปลิวหายไปกับลม'),
        Q('ผู้ต้องหาไม่พูดสักคำ แต่ไหล่ที่เกร็งมาสิบเอ็ดปีตกลงช้า ๆ'),
        Q('ซาโตริ: "วันนี้เขาเงียบเพราะเขาเลือก ไม่ใช่เพราะเขากลัว ข้าบอกได้เท่านี้ครับ"'),
      ],
    },
    lose:[
      Q('เงาเจ้าหนี้ถอยกลับไปยืนหลังผู้ต้องหาอีกครั้ง ผู้ต้องหาไม่ได้รับอันตราย'),
      Q('ซาโตริ: "มันยังอยู่ครับ ท่านตั้งหลักก่อน แล้วค่อยเรียกข้า ข้าจะรอ"'),
    ],
    unlockLog:Q('✓ ซาโตริเรียนท่าไม้ตาย "เนตรรอคำอนุญาต"'),
    foes(extra) {   // extra = privateOpened → ลูกทวงหนี้เพิ่ม 1 ตัว (Rae)
      return [
        { who:'เงาเจ้าหนี้', sub:'สมุดบัญชีหนี้กับเชือก', sp:'mob-q-debtor', hp:340, atk:[23, 39], speed:5, bigOne:true },
        ...Array.from({ length:extra ? 3 : 2 }, (_, i) => ({ who:'เงาลูกทวงหนี้', sub:'เชือกจับตัว', sp:'mob-q-collector', hp:100, atk:[12, 21], speed:11, seal:'rope', aim:'support', aimChance:.6 })),
      ];
    },
  },
  sqBoon: {
    zone:'west', owner:'boon', ownerName:'เกรซ', title:'เงาผ้าก๊อซปิดปาก', skill:'letterDelivered',
    // บรรทัดแรกแยกตามตัวเลือกเวลา (choice 0 = อ่านก่อนตัดสิน · 1 = อ่านหลังตัดสิน) บรรทัดที่เหลือเหมือนกัน
    preFirst:{
      0:Q('คำฝากถูกอ่านไปก่อนคำตัดสินแล้ว แต่เสียงที่ถูกหักสัญญาเงียบรออยู่จนเรื่องจบ แล้วจึงเข้ามาทวง'),
      1:Q('คำฝากเพิ่งถูกอ่านออกมา เสียงที่ถูกหักสัญญาตามออกมาทันที'),
    },
    preShared:[
      Q('ผืนผ้าก๊อซบางหลายผืนลอยออกมาจากช่องแฟ้มเก่า ตัวหนึ่งใหญ่เท่าม่านเตียงผู้ป่วย แต่ละผืนกระซิบประโยคเดียวกันซ้ำ ๆ'),
      Q('เงาผ้าก๊อซ: "อย่าบอกลูกนะ ... อย่าบอกลูกนะ ... เธอรับปากแล้ว"'),
      Q('เกรซ: "ทั้งหมดนี้คือคำสัญญาที่ดิฉันรับไว้กับผู้ป่วยทุกคนค่ะ ดิฉันไม่เคยวางมันลง ท่านคะ ดิฉันไม่ได้จะผิดสัญญา ดิฉันแค่ต้องเลือกว่าข้อไหนควรจบก่อน ช่วยกันมันให้ดิฉันที"'),
    ],
    win:{
      shared:[
        Q('ผืนผ้าก๊อซผืนสุดท้ายร่วงลงบนพื้น กลายเป็นกระดาษเปล่าแผ่นหนึ่ง'),
        Q('เกรซ: "ดิฉันรับปากว่าจะปิดปาก แต่ไม่เคยรับปากว่าจะปิดตลอดไปค่ะ ความเมตตาที่ปิดความจริงไว้ ไม่ควรกลายเป็นกำแพงระหว่างแม่กับลูก"'),
        Q('เกรซพับกระดาษเปล่าแผ่นนั้นเก็บใส่กระเป๋าเสื้อ ข้างซองคำฝากที่เปิดแล้ว'),
        Q('เกรซ: "คราวหน้า ดิฉันจะถามผู้ป่วยก่อนรับปากค่ะ ว่าให้ปิดนานแค่ไหน และถ้าเขาไม่มีโอกาสพูดเอง ใครควรพูดแทน"'),
      ],
    },
    lose:[
      Q('ผืนผ้าก๊อซถอยกลับเข้าช่องแฟ้ม เกรซหายใจติดขัดแต่ไม่เป็นอะไร'),
      Q('เกรซ: "ยังไม่ได้ค่ะ ดิฉันยังไม่อยากให้เรื่องนี้จบแบบนี้ ขอตั้งหลักก่อนนะคะ"'),
    ],
    unlockLog:Q('✓ เกรซเรียนท่าไม้ตาย "คำฝากถึงมือ"'),
    foes() {   // หนักสุด: ผืนใหญ่ 1 + ผืนเล็ก 3 · ปิดปากฝ่ายสนับสนุน ต้องเก็บ "คำฝากถึงมือ"/ผู้ฟื้นพลังไว้ปลด
      return [
        { who:'เงาผ้าก๊อซผืนใหญ่', sub:'ม่านเตียงผู้ป่วย', sp:'mob-q-gauze-big', hp:260, atk:[22, 38], speed:6, seal:'gauze', aim:'support', aimChance:.5, bigOne:true },
        ...Array.from({ length:3 }, () => ({ who:'เงาผ้าก๊อซ', sub:'กระซิบซ้ำ ๆ', sp:'mob-q-gauze', hp:62, atk:[11, 20], speed:11, seal:'gauze', aim:'support', aimChance:.7 })),
      ];
    },
  },
  sqGuard: {
    zone:'th', owner:'guard', ownerName:'กุมภัณฑ์', title:'เงาแค้นสืบตระกูล', skill:'gatekeeperStand',
    pre:{
      0:[
        Q('ยักษ์ก้าวมายืนตรงหน้าหญิงเฒ่า ไม่ยกคทา ไม่ก้มหน้า'),
        Q('เงาหลายร่างผุดขึ้นจากพื้นรอบประตู ไม่มีใบหน้า มีแต่ปากที่พึมพำพร้อมกัน'),
        Q('เงาแค้น: "เป็นคนหมู่บ้านนั้น ... เป็นคนหมู่บ้านนั้น ... เล่าไว้อย่างนี้ ต้องแค้นอย่างนี้"'),
        Q('กุมภัณฑ์: "ไม่ใช่เขา เป็นข้าเอง ท่านไม่ต้องช่วยข้า ท่านช่วยกันไม่ให้พวกมันแตะเธอ ที่เหลือข้ารับเอง"'),
      ],
      1:[
        Q('ยักษ์หันหลังให้หญิงเฒ่าและยืนนิ่ง'),
        Q('เงาหลายร่างกรูเข้ามาจากใต้พื้นประตู ไม่ยอมให้เธอเดินผ่านไปโดยยังไม่ได้แค้น'),
        Q('เงาแค้น: "ผ่านไม่ได้ ... ยังไม่ได้แค้น ... ผ่านไม่ได้"'),
        Q('กุมภัณฑ์: "ข้าหันหลังให้เธอ แต่ไม่ได้หันหลังให้พวกมัน ท่านช่วยข้ายืนที"'),
      ],
    },
    win:{
      0:[
        Q('เงาแค้นตัวสุดท้ายหยุดตรงหน้ายักษ์ แล้วสลายเป็นควันบาง ๆ เหมือนเรื่องเล่าที่ไม่มีใครเล่าต่อ'),
        Q('กุมภัณฑ์: "ข้ารับได้ทุกคมของมัน แต่คมที่ข้าต้องรับจริง ๆ ยังเหลืออยู่ตรงหน้านี้"'),
      ],
      1:[
        Q('เงาแค้นตัวสุดท้ายหยุดกลางประตู แล้วสลายเป็นควันบาง ๆ เหมือนเรื่องเล่าที่ไม่มีใครเล่าต่อ'),
        Q('กุมภัณฑ์: "ข้าหันหลังให้ ไม่ใช่เพราะข้าหนี ข้าหันเพื่อให้เธอมีที่เดิน"'),
      ],
    },
    lose:[
      Q('เงาแค้นถอยลงใต้พื้นประตู หญิงเฒ่าไม่ถูกแตะ'),
      Q('กุมภัณฑ์: "เรื่องเล่ามันเล่าเก่งกว่าข้า ท่านตั้งหลักก่อน ข้ายังยืนอยู่ตรงนี้"'),
    ],
    unlockLog:Q('✓ กุมภัณฑ์เรียนท่าไม้ตาย "ทวารบาลยืนรับแค้น"'),
    foes() {   // เบาสุด: เงาเล่าเรื่อง 1 (ล็อกเป้าที่ยักษ์) + เงาเล็ก 2 (กระจายตีทีมสนับสนุน)
      return [
        { who:'เงาแค้นเล่าเรื่อง', sub:'เรื่องเล่าที่เล่าผิดคน', sp:'mob-q-tale-big', hp:420, atk:[26, 46], speed:6, aim:'guard', aimChance:1, bigOne:true },
        ...Array.from({ length:2 }, () => ({ who:'เงาแค้น', sub:'พึมพำพร้อมกัน', sp:'mob-q-tale', hp:120, atk:[14, 25], speed:11, aim:'support', aimChance:.7 })),
      ];
    },
  },
  // QUEST-DAM-B (15 Nov): the merchant's feather quest - the bundle set down at the ash pit. No owner fights beside the team (the merchant is a trader), no new ultimate.
  // Words: Rae, Output/Rae/2026-11-14-avegee-merchant-quest.md (TH + EN in feather-quest.js, picked by the language); foes: Rae's proposal, numbers fitted by scripts/fit-quest-fights.mjs
  sqMerchantFeather: {
    zone:'asia', owner:null, ownerName:'', title:'เงาเซ่นไร้ผู้รับ', skill:null, unlockLog:'',
    text:(kind, lang) => { const x = featherText(); return kind === 'pre' ? x.pre : kind === 'win' ? x.win : x.lose; },
    foes() {   // the lightest kind, like sqGuard: one big smoke that hits hard, two small ones that go for the support line
      return [
        { who:'เงาเซ่นไร้ผู้รับ', sub:'ควันเซ่นก้อนใหญ่ที่ไม่มีปลายทาง', sp:'mob-q-ashsmoke-big', hp:380, atk:[24, 42], speed:6, bigOne:true },
        ...Array.from({ length:2 }, () => ({ who:'ควันเซ่นตกค้าง', sub:'ถามซ้ำ ๆ ว่า "ถึงใคร"', sp:'mob-q-ashsmoke', hp:110, atk:[13, 23], speed:11, aim:'support', aimChance:.6 })),
      ];
    },
  },
});

/** ข้อความระบบชั่วคราว (ไม่ใช่บทของ Rae) — Rae ควรเกลา */
export const QUEST_FIGHT_SYSTEM_TEXT = Object.freeze({
  standby:name => `${name}ไม่ได้อยู่ในทีมสู้ จึงยืนเชียร์อยู่ข้างสนาม`,
  loseNote:'แพ้ไม่เป็นไร ความคืบหน้าไม่หาย · สู้ใหม่ได้ทันที หรือพักก่อนแล้วกลับมาคุยก็ได้',
  loseNoteTea:'แพ้ไม่เสียอะไร ความคืบหน้าของภารกิจยังอยู่ครบ · ไปพักที่ศาลาน้ำชาก่อน แล้วกลับมาคุยเพื่อสู้ใหม่ได้',   // the lost quest fight that ends at the tea house (Rae's line, T9)
  loseNoteTeaEn:'A defeat costs you nothing, and your quest progress is kept. Rest at the tea house, then come back and talk to fight again.',
  enter:'เข้าสู้', back:'ไปต่อ', retry:'สู้อีกครั้ง', rest:'พักไว้ก่อน',
});

export function fightScene(id, s, kind) {
  const def = QUEST_FIGHTS[id];
  if (!def) return [];
  const choice = [0, 1].includes(s?.choice) ? s.choice : 0;
  if (def.text) return [...def.text(kind)];   // a fight whose scenes come in both languages (the feather quest)
  if (kind === 'pre') {
    if (id === 'sqBoon') return [def.preFirst[choice], ...def.preShared];
    const lines = [...def.pre[choice]];
    if (id === 'sqKan' && s?.verdict?.privateOpened) lines.splice(1, 0, def.preExtraIfPrivate);
    return lines;
  }
  if (kind === 'win') return id === 'sqBoon' ? [...def.win.shared] : [...def.win[choice]];
  return [...def.lose];
}

/** build the foes for one fight. Party size scales HP only (more allies → more total damage); ATK stays per-hit. */
export function questFightFoes(g, id, partySize) {
  const def = QUEST_FIGHTS[id];
  const s = g.sideQuests?.[id];
  const rows = def.foes(!!s?.verdict?.privateOpened);
  const size = Math.max(3, Math.min(7, partySize));
  const hpMul = HP_PER_PARTY[id]?.[size] ?? 1;
  const atkMul = ATK_PER_PARTY[id]?.[size] ?? 1;
  return rows.map((r, i) => {
    const hp = scaleFoeHp(def.zone, Math.round(r.hp * hpMul), 'event');
    const [lo, hi] = scaleFoeAtk(def.zone, r.atk, 'event');
    return { id:`quest-${id}-${i}`, who:r.who, sub:r.sub, sp:r.sp, boss:false, hp, maxHp:hp,
      atk:[Math.max(1, Math.round(lo * atkMul)), Math.max(2, Math.round(hi * atkMul))], speed:r.speed, stun:0, confuse:0,
      ...(r.seal ? { seal:r.seal } : {}), ...(r.aim ? { aim:r.aim, aimChance:r.aimChance ?? .7 } : {}) };
  });
}
// party-size multipliers (whole team incl. Yama, 4-7) fitted by scripts/fit-quest-fights.mjs: the FIRST attempt (no quest ultimate, no trained moves) wins about
// 92 % (sqGuard) / 85 % (sqKan) / 75 % (sqBoon) at every size — Rae's order: Guard lightest, Kan middle, Boon heaviest. Size 5 = the base numbers above.
export const HP_PER_PARTY = { sqKan:{ 3:.6, 4:.78, 5:1, 6:1.29, 7:1.47 }, sqBoon:{ 3:.5, 4:.75, 5:1, 6:1.25, 7:1.67 }, sqGuard:{ 3:.6, 4:.82, 5:1, 6:1.17, 7:1.44 },
  sqMerchantFeather:{ 3:.6, 4:.82, 5:1, 6:1.17, 7:1.44 } };   // the feather fight starts from sqGuard's shape (the same lightest kind) and is fitted by scripts/fit-quest-fights.mjs
// T1b (16 Nov): sizes 4-7 refitted (scripts/fit-quest-fights.mjs, new targets sqGuard 82 / sqKan 75 / sqBoon 65 / sqMerchantFeather 67 = 10 points below the F3 ones) for the harder turn rule (battle-turns.js damageExp 0.8).
export const ATK_PER_PARTY = { sqKan:{ 3:.9, 4:1.04, 5:1.02, 6:1.04, 7:1.19 }, sqBoon:{ 3:.85, 4:0.98, 5:1.04, 6:1.14, 7:1.04 }, sqGuard:{ 3:.85, 4:0.86, 5:0.94, 6:1.01, 7:0.96 },
  sqMerchantFeather:{ 3:.85, 4:0.94, 5:1.06, 6:1.23, 7:1.11 } };   // F3 (15 Nov): sizes 4-7 refitted by scripts/fit-quest-fights.mjs for the new turn rule (battle-turns.js: the enemy side acts as often as the team) - same first-try win %.  Before F3: sqKan 4-7 .95/1/1.1/1.1 · sqBoon .92/1/1.09/1.15 · sqGuard .9/1/1.02/1.05 · feather .98/1.06/1.18/1.18.   // fitted to ~77 % for the first attempt at every size 4-7 (HP follows sqGuard's shape, ATK is what was bisected)
