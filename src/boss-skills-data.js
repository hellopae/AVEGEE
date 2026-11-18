// BOSS-SKILLS set A (15 Nov 2026): the special moves of every boss, as DATA for src/boss-skills.js (the rulebook).
// Text: Rae (Output/Rae/2026-11-14-avegee-boss-skills.md, polished lines) with the owner's decisions of 15 Nov (briefs/2026-11-15-avegee-owner-decisions-boss-quest.md):
//   PHANTOM-404 = the AI Scammer Robot (one boss, moves "Phishing Flood" + "Delete Row"), spellings เซอร์เบอรัส / ยอร์มุนกันดร์, Lian Gang's "Last Link" kept but different from the cutscene.
// Numbers here are the STARTING numbers (Rae's table); the final power / when values are the ones this file holds after the sim pass (scripts/sim-boss-skills.mjs).
// Each list is attached to its foe in data.js (ZONE_EVENTS / SIGNAL_EVENTS), in game.js startZoneBoss (zone bosses of Asia / West), and by `bossSkillsFor` below.
// Every move has `warn:1`: announced one boss turn ahead.  Cards (`image`) are Kittanate's / Codex's real pictures, paths fixed by Rae's table section 4.2.
const A = name => `img/${name}.webp`;
const IMG = Object.freeze({
  arunadet:A('z1-events/cut-arunadet-mirror-th'), tanthasura:A('z1-events/cut-tanthasura-army-th'), hanuman:A('z1-events/cut-hanuman-sweep-th'),
  yomathat:'img/zone-boss-cutscene.webp', yamaLedger:A('z4-events/cut-yama-ledger-tide-th'),
  kuroha:A('z2-events/cut-kuroha-gale-asia'), akura:A('z2-events/cut-akura-thornstorm-asia'), wukong:A('z2-events/cut-wukong-sweep-asia'),
  wukongClones:A('z2-events/cut-wukong-clones-asia'),
  lianGang:'img/Asia/Boss Zone2-asia-cutscene.webp', zhaoWen:A('z4-events/cut-zhaowen-seal-asia'),
  eirlin:A('z3-events/cut-eirlin-spearrain-west'), valdric:A('z3-events/cut-valdric-batstorm-west'), cerberus:A('z3-events/cut-cerberus-howl-west'),
  jormungandr:A('z3-events/cut-jormungandr-tide-west'), severin:'img/West/Boss Zone3-cutscene.webp', halvar:A('z4-events/cut-halvar-lantern-west'),
  lumen:A('z4-events/cut-lumen-scan-cyberhell'), trojan9:A('z4-events/cut-trojan9-rush-cyberhell'), phishing:A('z4-events/cut-scammer-phishing-cyberhell'),
  deleteRow:A('z4-events/cut-phantom404-delete-cyberhell'), archon:'img/CyberHell/Boss Zone4-cutscene.webp', nexar:A('z4-events/cut-nexar-logsweep-cyberhell'),
});
export const BOSS_CARD_IMAGES = IMG;
// T3 (owner 19 Nov: story foes / bosses use their special more than once when the fight is long): the one-move test foes (Arunadet, Kuroha, Lumen-01/02) warn at round 2 and every 3rd round after (was round 3 then every 4th -> ~1 use in a 6-round fight, now ~2: rounds 3 and 6)
const T = (th, en) => ({ th, en });

export const BOSS_SKILLS = Object.freeze({
  // ---------------- zone 1 ----------------
  arunadet:Object.freeze([
    { id:'karmaMirror', kind:'groupHit', warn:1, power:.6, name:T('แสงกระจกกรรม', 'Karma-Mirror Flash'),
      warnText:T('อรุณเดชยกกระจกรับแสง — รอบหน้าแสงจะสาดทั้งทีม!', 'Arunadet raises his mirror to the light — next turn it floods the whole team!'),
      useText:T('อรุณเดช: "ดูตัวท่านเองในกระจกเถิด"', 'Arunadet: "Look at yourselves in the mirror."'),
      when:{ firstAct:2, everyActs:3 }, image:IMG.arunadet },
  ]),
  tanthasura:Object.freeze([
    { id:'armyCharge', kind:'groupHit', warn:1, power:.7, name:T('ทัพปีศาจบุกพร้อมกัน', 'Army Charge'),
      warnText:T('ทัณฑสูรชูกระบองให้ทัพข้างหลัง — รอบหน้าทัพจะบุกทั้งทีม!', 'Tanthasura raises his club to rally his army — next turn it charges the whole team!'),
      useText:T('ทัณฑสูร: "ทัพของข้า บุก!"', 'Tanthasura: "My army! Charge!"'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.tanthasura },
    { id:'gatekeeperBlow', kind:'heavyHit', warn:1, power:1.9, name:T('ฟาดเกียรติผู้เฝ้าด่าน', "Gatekeeper's Blow"),
      warnText:T('ทัณฑสูรกำกระบองสองมือ — รอบหน้าจะฟาดหนักใส่คนเดียว!', 'Tanthasura grips his club in both hands — a crushing blow lands on one target next turn!'),
      useText:T('ทัณฑสูร: "ด่านนี้ ข้ายังเฝ้าอยู่!"', 'Tanthasura: "I still guard this gate!"'),
      when:{ hpBelow:.5, everyActs:3 } },
  ]),
  hanuman:Object.freeze([
    { id:'skyDash', kind:'groupHit', warn:1, power:.7, name:T('เหาะกวาดลาน', 'Skyward Sweep'),
      warnText:T('ท่านหนุมานลอยขึ้นเหนือลาน — รอบหน้าจะพุ่งผ่านทั้งทีม!', 'Hanuman rises above the courtyard — next turn he sweeps past the whole team!'),
      useText:T('ท่านหนุมานพุ่งผ่านลานเร็วจนลมกระชากทุกคน', 'Hanuman streaks across the courtyard, the wind tearing at everyone.'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.hanuman },
    { id:'toweringPalm', kind:'heavyHit', warn:1, power:1.8, name:T('ขยายกายฟาดฝ่ามือ', 'Towering Palm'),
      warnText:T('ท่านหนุมานขยายกายสูงขึ้นเรื่อย ๆ — รอบหน้าจะฟาดฝ่ามือลงมาหนึ่งครั้ง!', 'Hanuman swells to a towering size — next turn a great palm comes down on one of you!'),
      useText:T('ท่านหนุมานฟาดฝ่ามือใหญ่ลงมา แล้วหดกายกลับเท่าเดิม', 'Hanuman brings his great palm down, then shrinks back to his usual size.'),
      when:{ hpBelow:.6, everyActs:4 } },
  ]),
  yomathat:Object.freeze([
    { id:'blazeBlade', kind:'groupHit', warn:1, power:.9, name:T('ดาบเพลิงพี่ใหญ่', "Elder Brother's Flame Blade"),
      warnText:T('ยมทัตชักดาบเพลิงขึ้นเหนือไหล่ — รอบหน้าจะฟันกวาดทั้งทีม!', 'Yomathat lifts his flame blade over his shoulder — next turn it sweeps the whole team!'),
      useText:T('ยมทัต: "รับให้ไหวนะน้อง!"', 'Yomathat: "Hold on tight, little brother!"'),
      when:{ firstAct:3, everyActs:3 }, image:IMG.yomathat },
    { id:'noMoreHolding', kind:'heavyHit', warn:1, power:1.7, name:T('พี่ไม่ออมมืออีกแล้ว', 'No More Holding Back'),
      warnText:T('ยมทัตกำดาบสองมือ เปลวไฟเข้มขึ้น — รอบหน้าจะฟันหนักใส่คนเดียว!', 'Yomathat grips the blade in both hands, the flames deepening — a heavy cut at one target next turn!'),
      useText:T('ยมทัต: "ถ้าผ่านท่านี้ได้ พี่ค่อยยอม!"', 'Yomathat: "Take this one and I will yield!"'),
      when:{ hpBelow:.5, everyActs:4 } },
  ]),
  yamaPossessed:Object.freeze([
    { id:'ledgerTide', kind:'groupHit', warn:1, power:.8, name:T('คลื่นบัญชีกรรม', 'Tide of Ledgers'),
      warnText:T('แผ่นบัญชีกรรมลอยขึ้นรอบบัลลังก์ — รอบหน้าจะถาโถมทั้งทีม!', 'Ledger pages rise around the throne — next turn they crash over the whole team!'),
      useText:T('พญายมบาท: "ตัดสิน ... ตาม ... บัญชี ..."', 'Lord Yama: "Judge ... by ... the ... ledger ..."'),
      when:{ firstAct:2, everyActs:4 }, image:IMG.yamaLedger },
    { id:'palmFromThrone', kind:'heavyHit', warn:1, power:2.0, name:T('ฝ่ามือเดียวจากบัลลังก์', 'One Palm from the Throne'),
      warnText:T('พญายมบาทยกฝ่ามือขึ้นโดยไม่ลุกจากบัลลังก์ — รอบหน้าจะฟาดลงมา!', 'Lord Yama raises one palm without leaving the throne — next turn it comes down!'),
      useText:T('พญายมบาท: "หลบ ... ไป ... ลูก ..."', 'Lord Yama: "Move ... away ... son ..."'),
      when:{ hpBelow:.5, everyActs:4 } },
  ]),
  // ---------------- zone 2 ----------------
  kuroha:Object.freeze([
    { id:'featherGale', kind:'groupHit', warn:1, power:.6, name:T('พายุขนนกวายุ', 'Feather Gale'),
      warnText:T('คุโรฮะกางพัดขนนกออกเต็มที่ — รอบหน้าลมจะซัดทั้งทีม!', 'Kuroha spreads his feather fan wide — next turn the gale hits the whole team!'),
      useText:T('คุโรฮะ: "ตั้งสติไว้ ลมกำลังเปลี่ยนทิศ"', 'Kuroha: "Keep your head. The wind is turning."'),
      when:{ firstAct:2, everyActs:3 }, image:IMG.kuroha },
  ]),
  akura:Object.freeze([
    { id:'thornStorm', kind:'groupHit', warn:1, power:.75, name:T('พายุกระบองหนาม', 'Thorn-Club Storm'),
      warnText:T('อากุระหมุนกระบองหนามรอบตัว — รอบหน้าจะกวาดทั้งทีม!', 'Akura spins his thorned club around him — next turn it sweeps the whole team!'),
      useText:T('อากุระ: "ข้าไม่ออมแรง!"', 'Akura: "I hold nothing back!"'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.akura },
    { id:'shackleBreaker', kind:'heavyHit', warn:1, power:1.9, name:T('ทุบตรวนแตก', 'Shackle-Breaker'),
      warnText:T('อากุระยกกระบองสุดแขน กัดฟันแน่น — รอบหน้าจะทุบลงหนักใส่คนเดียว!', 'Akura heaves his club overhead, teeth clenched — a crushing blow at one target next turn!'),
      useText:T('อากุระ: "ข้าจะไม่ถูกล่ามอีก!"', 'Akura: "I will never be chained again!"'),
      when:{ hpBelow:.55, everyActs:3 } },
  ]),
  wukong:Object.freeze([
    { id:'hairClones', kind:'summon', warn:1, name:T('เป่าขนแยกร่าง', 'Hair Clones'),
      warnText:T('หงอคงถอนขนหนึ่งกำขึ้นมา — เตรียมเป่าเป็นร่างแยก!', 'Wukong plucks a tuft of hair — he is about to blow it into clones!'),
      useText:T('หงอคง: "ออกมาเถิด พวกเรา!"', 'Wukong: "Out you come, all of you!"'),
      when:{ hpBelow:.8, firstAct:2, everyActs:5, maxUses:2 },
      summon:{ count:[2, 3], hp:26, atk:[6, 10], sp:'boss-wukong-clone-asia', name:T('ร่างแยกหงอคง', 'Wukong clone'), sub:T('ร่างจากขนวิเศษ', 'Born of a strand of hair'), max:3 } },
    { id:'staffSweep', kind:'groupHit', warn:1, power:.75, name:T('กระบองกวาดสิบทิศ', 'Ten-Direction Sweep'),
      warnText:T('หงอคงหมุนกระบองรอบตัว — รอบหน้าจะกวาดทั้งทีม!', 'Wukong spins his staff — next turn it sweeps the whole team!'),
      useText:T('หงอคง: "รับไปให้ทั่ว!"', 'Wukong: "Take it, every one of you!"'),
      when:{ firstAct:3, everyActs:3 }, image:IMG.wukong },
  ]),
  gateGuardTest:Object.freeze([
    { id:'gateSmash', kind:'heavyHit', warn:1, power:1.8, name:T('ฟาดประตูหนัก', 'Gate Smash'),
      warnText:T('ยักษ์ทวารบาลยกกระบองเหนือหัว — รอบหน้าจะฟาดหนักใส่คนเดียว!', 'The Gate Guard raises his club overhead — next turn a heavy blow lands on one target!'),
      useText:T('ยักษ์ทวารบาล: "ยืนให้มั่นนะท่าน!"', 'Gate Guard: "Stand firm, my lord!"'),
      when:{ firstAct:3, everyActs:3 } },
  ]),
  lianGang:Object.freeze([
    { id:'sealedWeight', kind:'groupHit', warn:1, power:.85, name:T('ตุ้มตรวนผนึก', 'Sealed Chain-Weight'),
      warnText:T('เหลียนกังหมุนตุ้มตรวนเหนือศีรษะ — รอบหน้าจะซัดทั้งแถว!', 'Lian Gang whirls the chain-weight overhead — next turn it lashes the whole line!'),
      useText:T('เหลียนกัง: "ยืนให้ตรงแถว!"', 'Lian Gang: "Hold the line!"'),
      when:{ firstAct:3, everyActs:3 }, image:IMG.lianGang },
    // Owner 15 Nov: keep it, but unlike the story scene (boss at 25 % HP strikes while Yama is off guard, Nira steps in): this one comes early, once, is warned, and is about standing
    { id:'lastLink', kind:'heavyHit', warn:1, power:1.8, name:T('ห่วงตรวนสุดท้าย', 'The Last Link'),
      warnText:T('เหลียนกังคลายตรวนเหลือห่วงเดียวในมือ — รอบหน้าเขาจะฟาดหนักใส่คนเดียว!', 'Lian Gang unwinds the chain down to one last link — next turn he swings it hard at one target!'),
      useText:T('เหลียนกัง: "ห่วงนี้ไว้ใช้กับคนที่ยังยืนอยู่"', 'Lian Gang: "This link is for those who still stand."'),
      when:{ hpBelow:.6, once:true } },
  ]),
  zhaoWenPossessed:Object.freeze([
    { id:'sealPress', kind:'groupHit', warn:1, power:.8, name:T('ตราประทับกดทั่วลาน', 'The Seal Descends'),
      warnText:T('ตราประทับบัลลังก์ลอยขึ้นเหนือลาน — รอบหน้าจะกดลงทั้งทีม!', 'The throne seal floats above the hall — next turn it presses down on the whole team!'),
      useText:T('จ้าวเหวิน: "ตรา ... ที่ประทับ ... เรียกคืน ... ไม่ได้ ..."', 'Zhao Wen: "A seal ... once stamped ... cannot be recalled ..."'),
      when:{ firstAct:2, everyActs:3 }, image:IMG.zhaoWen },
    { id:'lateVerdict', kind:'heavyHit', warn:1, charge:true, power:2.0, name:T('คำตัดสินที่มาถึงช้า', 'The Late Verdict'),
      warnText:T('จ้าวเหวินนิ่งเงียบรับฟังจนจบ — รอบหน้าคำตัดสินจะลงใส่คนเดียว!', 'Zhao Wen falls silent, listening to the end — next turn the verdict falls on one target!'),
      useText:T('จ้าวเหวิน: "ฟัง ... จบ ... แล้ว ..."', 'Zhao Wen: "I have ... heard ... it all ..."'),
      when:{ hpBelow:.55, everyActs:4 } },
  ]),
  // ---------------- zone 3 ----------------
  eirlin:Object.freeze([
    { id:'spearRain', kind:'groupHit', warn:1, power:.6, name:T('ฝนหอกวาลคีรี', 'Valkyrie Spear Rain'),
      warnText:T('เอียร์ลินชูหอกขึ้นฟ้า แสงหอกเรียงเป็นสาย — รอบหน้าจะพุ่งใส่ทั้งทีม!', 'Eirlin raises her spear skyward, lines of light forming — next turn they fall on the whole team!'),
      useText:T('เอียร์ลิน: "ให้ข้าเห็นว่าท่านยืนได้"', 'Eirlin: "Show me you can stand."'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.eirlin },
    { id:'chosenSpear', kind:'heavyHit', warn:1, power:1.7, name:T('หอกเลือกผู้ควร', 'Spear of the Chosen'),
      warnText:T('เอียร์ลินเล็งหอกไปที่เป้าหมายเดียว — รอบหน้าหอกจะพุ่งตรง!', 'Eirlin takes aim at one target — next turn the spear flies straight!'),
      useText:T('เอียร์ลิน: "หอกนี้เลือกผู้ที่ไม่ถอย"', 'Eirlin: "This spear picks those who do not retreat."'),
      when:{ hpBelow:.5, everyActs:4 } },
  ]),
  valdric:Object.freeze([
    { id:'batStorm', kind:'groupHit', warn:1, power:.7, name:T('พายุค้างคาวราตรี', 'Night Bat Storm'),
      warnText:T('วาลดริกยกไม้เท้า เงาค้างคาวหมุนรอบตัว — รอบหน้าจะพุ่งใส่ทั้งทีม!', 'Valdric lifts his cane, bat-shadows circling him — next turn they swarm the whole team!'),
      useText:T('วาลดริก: "ราตรียังยาวนัก ท่านผู้มาเยือน"', 'Valdric: "The night is long yet, honoured guest."'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.valdric },
    { id:'sipOfNight', kind:'heal', warn:1, heal:{ pct:.15 }, name:T('จิบไวน์ราตรี', 'A Sip of Night'),
      warnText:T('วาลดริกหยิบแก้วไวน์แดงขึ้นมา — รอบหน้าเขาจะจิบฟื้นกำลัง!', 'Valdric picks up a glass of dark wine — next turn he will sip and recover!'),
      useText:T('วาลดริก: "ขออภัย ขอข้าจิบสักนิด"', 'Valdric: "Forgive me. A sip, if you please."'),
      when:{ hpBelow:.45, once:true } },
  ]),
  // not in the game yet (the zone 3 events are a later job): ready for that day
  cerberus:Object.freeze([
    { id:'triHowl', kind:'groupHit', warn:1, power:.6, name:T('เสียงหอนสามเศียร', 'Three-Headed Howl'),
      warnText:T('เซอร์เบอรัสทั้งสามเศียรสูดลมหายใจลึก — รอบหน้าเสียงหอนจะกระแทกทั้งทีม!', 'All three heads of Cerberus draw a deep breath — next turn the howl slams the whole team!'),
      useText:T('เสียงหอนสามเสียงซ้อนกันสะเทือนทั่วลาน', 'Three howls stack into one and shake the whole yard.'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.cerberus },
    { id:'triBite', kind:'heavyHit', warn:1, power:1.8, name:T('สามเศียรงับพร้อมกัน', 'Triple Bite'),
      warnText:T('เซอร์เบอรัสหันทั้งสามเศียรมาที่เป้าหมายเดียว — รอบหน้าจะงับพร้อมกัน!', 'Cerberus turns all three heads on a single target — next turn they bite as one!'),
      useText:T('ทั้งสามเศียรงับลงพร้อมกัน แล้วชะงักราวกับสะดุ้งตื่น', 'All three heads snap down together, then flinch as if waking.'),
      when:{ hpBelow:.6, everyActs:3 } },
  ]),
  jormungandr:Object.freeze([
    { id:'tailTide', kind:'groupHit', warn:1, power:.8, name:T('คลื่นหางอสรพิษโลก', 'World-Serpent Tidal Lash'),
      warnText:T('ยอร์มุนกันดร์ม้วนหางขึ้นเหนือผิวน้ำ — รอบหน้าคลื่นจะซัดทั้งทีม!', 'Jörmungandr lifts its tail above the water — next turn a wave crashes over the whole team!'),
      useText:T('หางอสรพิษฟาดผิวน้ำ คลื่นยักษ์ซัดข้ามชายแดน', "The serpent's tail lashes the water and a great wave breaks across the frontier."),
      when:{ firstAct:3, everyActs:4 }, image:IMG.jormungandr },
    { id:'worldCoil', kind:'heavyHit', warn:1, power:1.9, name:T('ขดรัดแห่งโลก', "The World's Coil"),
      warnText:T('ลำตัวอสรพิษขดวงเข้ามาหาเป้าหมายเดียว — รอบหน้าจะรัดแน่น!', 'The serpent coils in around one target — next turn it will crush!'),
      useText:T('ลำตัวใหญ่รัดแน่น แล้วคลายออกอย่างช้า ๆ', 'The vast body tightens, then slowly loosens.'),
      when:{ hpBelow:.5, everyActs:4 } },
  ]),
  severin:Object.freeze([
    { id:'blueFlameClose', kind:'groupHit', warn:1, power:.85, name:T('เปลวน้ำเงินปิดบัญชี', 'Blue Flame of the Closing Books'),
      warnText:T('เซเวอรินกางฝ่ามือ เปลวน้ำเงินลามตามแขน — รอบหน้าจะเผาทั้งทีม!', 'Severin spreads his palm, blue flame creeping up his arm — next turn it engulfs the whole team!'),
      useText:T('เซเวอริน: "ยอดนี้ ข้าขอปิดเดี๋ยวนี้!"', 'Severin: "I close this account now!"'),
      when:{ firstAct:3, everyActs:3 }, image:IMG.severin },
    { id:'overdueSeal', kind:'heavyHit', warn:1, power:1.9, name:T('ตราปิดยอดค้าง', 'Seal of the Overdue Balance'),
      warnText:T('เซเวอรินเปิดสมุดบัญชีเล่มหนา — รอบหน้าจะประทับตราใส่คนเดียว!', 'Severin opens a thick ledger — next turn he stamps his seal on one target!'),
      useText:T('เซเวอริน: "ตัวเลขไม่เคยโกหก!"', 'Severin: "Numbers never lie!"'),
      when:{ hpBelow:.5, everyActs:4 } },
  ]),
  halvarPossessed:Object.freeze([
    { id:'lanternNight', kind:'groupHit', warn:1, power:.8, name:T('โคมคืนยาว', 'The Long-Night Lantern'),
      warnText:T('ฮาลวาร์ยกโคมดวงเดียวขึ้นสูง แสงนิ่งสนิท — รอบหน้าแสงจะกวาดทั้งทีม!', 'Halvar raises his single lantern, its light utterly still — next turn it sweeps the whole team!'),
      useText:T('ฮาลวาร์: "คืน ... นี้ ... ยาว ..."', 'Halvar: "This ... night ... is long ..."'),
      when:{ firstAct:2, everyActs:3 }, image:IMG.halvar },
    { id:'shortVerdict', kind:'heavyHit', warn:1, power:2.0, name:T('คำตัดสินสั้น ๆ', 'The Short Verdict'),
      warnText:T('ฮาลวาร์เงียบลง มือกำค้อนศาลแน่น — รอบหน้าจะตัดสินลงใส่คนเดียว!', 'Halvar falls silent, gripping the gavel — next turn the verdict falls on one target!'),
      useText:T('ฮาลวาร์: "พอ ... แล้ว ..."', 'Halvar: "Enough ... now ..."'),
      when:{ hpBelow:.5, everyActs:4 } },
  ]),
  // ---------------- zone 4 ----------------
  lumen01:Object.freeze([
    { id:'scanBeam', kind:'groupHit', warn:1, power:.6, name:T('ลำแสงตรวจสิทธิ์', 'Credential Scan'),
      warnText:T('ลูเมน-01 เปิดตาแสง เส้นสแกนไล่ข้ามพื้น — รอบหน้าจะกวาดทั้งทีม!', 'Lumen-01 opens its eyes of light, scan-lines crossing the floor — next turn they sweep the whole team!'),
      useText:T('ลูเมน-01: "ตรวจสิทธิ์ของนายก่อน!"', 'Lumen-01: "Credentials first!"'),
      when:{ firstAct:2, everyActs:3 }, image:IMG.lumen },
  ]),
  lumen02:Object.freeze([
    { id:'lockOn', kind:'heavyHit', warn:1, power:1.6, name:T('ล็อกเป้าประตู', 'Gate Lock-On'),
      warnText:T('ลูเมน-02 ล็อกวงแสงบนเป้าหมายเดียว — รอบหน้าจะพุ่งตรง!', 'Lumen-02 fixes a ring of light on one target — next turn the strike lands.'),
      useText:T('ลูเมน-02: "เป้าหมายล็อกแล้ว"', 'Lumen-02: "Target locked."'),
      when:{ firstAct:2, everyActs:3 } },
  ]),
  trojan9:Object.freeze([
    { id:'gateRush', kind:'groupHit', warn:1, power:.7, name:T('พุ่งชนประตูหลัง', 'Backdoor Rush'),
      warnText:T('ล้อม้าไม้ของโทรจัน-9 เริ่มหมุน เส้นสแกนวิ่งขวางตา — รอบหน้าจะพุ่งชนทั้งทีม!', "Trojan-9's wheels begin to turn, scan-lines racing across its eyes — next turn it rams the whole team!"),
      useText:T('โทรจัน-9: "[พุ่งชน] หลีก ... ทาง ..."', 'Trojan-9: "[Ram] Clear ... the ... way ..."'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.trojan9 },
    { id:'bellyHatch', kind:'summon', warn:1, name:T('เปิดท้องม้า', 'Hatch Open'),
      warnText:T('ฝาท้องม้าไม้เปิดอ้า แสงเขียวกะพริบข้างใน — รอบหน้าจะมีของออกมา!', 'The hatch in the wooden belly swings open, green light flickering within — something comes out next turn!'),
      useText:T('โทรจัน-9: "[ส่งของขวัญ] ... ระวัง ... กับดัก ..."', 'Trojan-9: "[Delivering gift] ... mind ... the ... trap ..."'),
      when:{ hpBelow:.7, firstAct:2, everyActs:5, maxUses:2 },
      summon:{ count:[2, 2], hp:28, atk:[6, 10], sp:'mob-bug', name:T('บั๊กในท้องม้า', 'Bug from the belly'), sub:T('ของขวัญติดกับดัก', 'Trapped gift'), max:3 } },
  ]),
  // PHANTOM-404 = the AI Scammer Robot (owner 15 Nov, one boss).  Case 10 of zone 4 is a later job: the moves wait here, the art (boss-phantom404-cyberhell + the two cards) is in img/z4-events/.
  phantom404:Object.freeze([
    { id:'phishingFlood', kind:'groupHit', warn:1, power:.75, name:T('พายุลิงก์หลอก', 'Phishing Flood'),
      warnText:T('หน้าจอบนตัวหุ่นเด้งแจ้งเตือนรัว ๆ — รอบหน้าจะซัดใส่ทั้งทีม!', "Notifications burst across the robot's screens — next turn the flood hits the whole team!"),
      useText:T('PHANTOM-404: "กดตอนนี้ รับสิทธิ์ทันที!"', 'PHANTOM-404: "Click now and claim your reward!"'),
      when:{ firstAct:3, everyActs:4 }, image:IMG.phishing },
    { id:'deleteRow', kind:'groupHit', warn:1, power:.75, name:T('ลบทั้งแถว', 'Delete Row'),
      warnText:T('เงามืดไล่ผ่านบัญชีทีละแถว — รอบหน้าจะกวาดทั้งทีม!', 'A shadow sweeps down the ledger row by row — next turn it sweeps the whole team!'),
      useText:T('PHANTOM-404: "ไม่พบ ... ผู้ใช้ ..."', 'PHANTOM-404: "User ... not ... found ..."'),
      when:{ firstAct:5, everyActs:4 }, image:IMG.deleteRow },
  ]),
  archonZero:Object.freeze([
    { id:'revokeBolt', kind:'groupHit', warn:1, power:.85, name:T('สายฟ้าม่วงถอนสิทธิ์', 'Revocation Lightning'),
      warnText:T('อาร์คอน-ศูนย์ชูมือ ประกายม่วงรวมที่ฝ่ามือ — รอบหน้าจะฟาดทั้งทีม!', 'Archon-Zero raises a hand, violet sparks gathering — next turn lightning strikes the whole team!'),
      useText:T('อาร์คอน-ศูนย์: "สิทธิ์ของคุณถูกเพิกถอน"', 'Archon-Zero: "Your access is revoked."'),
      when:{ firstAct:3, everyActs:3 }, image:IMG.archon },
    { id:'restoreBackup', kind:'heal', warn:1, heal:{ pct:.2 }, name:T('กู้คืนจากสำรอง', 'Restore from Backup'),
      warnText:T('ลายอักขระบนมงกุฎอาร์คอน-ศูนย์กะพริบ — รอบหน้าเขาจะกู้คืนตัวเอง!', "The glyphs on Archon-Zero's crown flicker — next turn he will restore himself!"),
      useText:T('อาร์คอน-ศูนย์: "โหลดสถานะก่อนหน้า"', 'Archon-Zero: "Loading previous state."'),
      when:{ hpBelow:.35, once:true } },
  ]),
  nexarPossessed:Object.freeze([
    { id:'logSweep', kind:'groupHit', warn:1, power:.8, name:T('ไล่ตรวจบันทึกทั้งแถว', 'Log Sweep'),
      warnText:T('แถบบันทึกไหลผ่านหน้าเน็กซาร — รอบหน้าจะกวาดทั้งทีม!', "Logs scroll across Nexar's face — next turn they sweep the whole team!"),
      useText:T('เน็กซาร: "ผลลัพธ์ ... ตรง ... ข้อมูล ..."', 'Nexar: "The result ... matches ... the data ..."'),
      when:{ firstAct:2, everyActs:3 }, image:IMG.nexar },
    { id:'systemRuling', kind:'heavyHit', warn:1, power:2.0, name:T('คำตัดสินจากบันทึก', 'Ruling by Record'),
      warnText:T('เน็กซารชี้ไปที่เป้าหมายเดียว ข้อมูลล็อกตาม — รอบหน้าคำตัดสินจะลงมา!', 'Nexar points at a single target, the data locking on — next turn the ruling lands!'),
      useText:T('เน็กซาร: "ระบบ ... ไม่ ... ผิดพลาด ..."', 'Nexar: "The system ... does not ... err ..."'),
      when:{ hpBelow:.5, everyActs:4 } },
  ]),
});

/** The names of the zone-boss cutscene moves (BOSS_ULTIMATE in data.js), Rae 3.3 — the two that were swapped between zones 2 and 3 are fixed. */
export const BOSS_ULTIMATE_NAMES = Object.freeze({
  th:'ดาบเพลิงพี่ใหญ่', asia:'ตุ้มตรวนผนึก', west:'เปลวน้ำเงินปิดบัญชี', cyberhell:'สายฟ้าม่วงถอนสิทธิ์',
});
/** A fresh copy of the moves (a foe owns its list: game.js clones it, tests can edit a copy). */
export const bossSkillsFor = key => BOSS_SKILLS[key] ? structuredClone(BOSS_SKILLS[key]) : undefined;

// T1b (owner 16 Nov: "the ordinary spirits are not tuned - make them harder: group attacks, stronger blows, more turns"): the wandering ghosts of the map (`mob`) and the spirits that resist
// at the court (`soul`) get two moves of the central rulebook (src/boss-skills.js) like a boss does - one hits the whole team, one is a heavy single blow - each announced one turn ahead.
// `noCard:true` = no full-screen card for these small foes (the group move still shows its name and hits everybody).  Names / lines: Rae's R1 section D1 (T3/11).
// Strength and fight length of these foes are fitted per zone and team size by the `<zone>:mob` / `<zone>:soul` rows of encounter-balance.js (scripts/fit-t1b-crowd.mjs).
export const CROWD_SKILLS = Object.freeze({
  // T3/11: names + lines from Rae's R1 section D1 (no speech marks: ordinary foes do not talk).  "รอบหน้า" is the real mechanic: a warned move is used on the foe's FIRST act of the NEXT ROUND (boss-skills.js, warn counted in rounds),
  // so TH keeps "รอบหน้า"; EN says "next round" (not "next turn": a foe with 3 acts a round would otherwise look like it strikes at once).
  mob:Object.freeze([
    { id:'wailSwarm', kind:'groupHit', warn:1, power:.55, noCard:true, name:T('เสียงหอนระงม', 'Wailing Horde'),
      warnText:T('พวกมันอ้าปากหอนพร้อมกัน เสียงกำลังก่อตัวขึ้น — รอบหน้าจะกระแทกทั้งทีม!', 'They throw back their heads as one, the howl swelling — next round it will crash over the whole team!'),
      useText:T('เสียงหอนซัดเข้าใส่ทั้งทีม', 'The howl crashes over the whole team'),
      when:{ firstAct:2, everyActs:4 } },
    { id:'frenzyBlow', kind:'heavyHit', warn:1, power:1.7, name:T('ฟาดคลั่ง', 'Frenzied Smash'),
      warnText:T('มันกำหมัดแน่นจนสั่น — รอบหน้าจะฟาดหนักใส่คนเดียว!', 'It clenches its fists until they shake — next round a heavy blow lands on one of you!'),
      useText:T('มันฟาดลงมาสุดแรง', 'It brings its fists down with everything it has'),
      when:{ hpBelow:.7, firstAct:3, everyActs:3 } },
  ]),
  soul:Object.freeze([
    { id:'curseChorus', kind:'groupHit', warn:1, power:.55, noCard:true, name:T('เสียงอาฆาตก้องศาล', 'Echoing Spite'),
      warnText:T('เสียงอาฆาตทบกันดังขึ้นทุกที — รอบหน้าจะก้องใส่ทั้งทีม!', 'The spite swells louder with every breath — next round it will ring out over the whole team!'),
      useText:T('เสียงอาฆาตก้องใส่ทั้งทีม', 'The spite rings out over the whole team'),
      when:{ firstAct:2, everyActs:4 } },
    { id:'lastStand', kind:'heavyHit', warn:1, power:1.8, name:T('ฟาดเฮือกสุดท้าย', 'Last Gasp Strike'),
      warnText:T('วิญญาณดวงนั้นสูดลมหายใจลึกจนตัวสั่น — รอบหน้าจะฟาดสุดแรงใส่คนเดียว!', 'The spirit draws a deep, shuddering breath — next round it strikes one of you with all it has left!'),
      useText:T('มันฟาดด้วยแรงทั้งหมดที่เหลืออยู่', 'It strikes with all the strength it has left'),
      when:{ hpBelow:.55, firstAct:3, everyActs:3 } },
  ]),
});
/** A fresh copy of the ordinary foes' moves (`mob` | `soul`). */
export const crowdSkillsFor = kind => CROWD_SKILLS[kind] ? structuredClone(CROWD_SKILLS[kind]) : undefined;
