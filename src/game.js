// game.js — สถานะเกม · วาระ (tick) · สูตรตัดสิน
import { SINS, DEEDS, MERITS, WHO, STATIONS, CREW, BAL, EVENTS, SCENE, SPOTS, GUARD_POST,
         POWERS, DENIALS, CONFESS, PANIC, HARD_CASES, ITEMS, ITEM_SPOTS,
         MOB, GUARD, LEVELS, SPIRIT_OF, spiritFor, starsOf,
         SELF, ORDER_TIERS, KARMA_TIERS, KARMA_RELIEF, TARANG, KRAJOK,
         DENY_BY_SIN, SOLID_LINES, SOLID_BY_SIN, ADMIT_TPL, CRACK_LINES, HOLD_LINES, RETURN, AFTER_BY_SIN,
         voice, SEX_OF, BATTLE, YAMA_FIGHT, ZONES, FOE_TALK, MOB_TALK,
         STATION_CAP, BUILD_TIME, DAD, CREW_HELP_LV, ORDER_WARN } from './data.js';
import { CASES, isPure, CASE_EVERY } from './cases.js';
import { canWalk, stepTo, nearestWalk, findPath, setBlocks } from './walk.js';
import { footOf } from './art.js';

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
/** ชื่อกับคำบรรยายซ้ำกันไหม — ใช้ตัดบรรทัดล่างที่พูดซ้ำของเดิม */
export const sameLabel = (a, b) => !a || !b || a.includes(b) || b.includes(a);
const pick = a => a[Math.floor(Math.random() * a.length)];
let SEQ = 1;

export function createGame() {
  const g = {
    tick: 0, coin: BAL.startCoin, fuel: BAL.startFuel,
    order: 72, karma: 0, hp: BAL.startHp,
    powers: POWERS.map(p => ({ ...p, cd: 0, ammo: p.k === 'roar' ? 3 : p.k === 'mirror' ? 2 : 0, max: p.k === 'roar' ? 3 : 2 })),
    star5: 0, level: 1, hits: 0, hpMax: BAL.startHp,
    orderWarns: 0, orderWarnAt: 0,    // คำเตือนเรื่องคิวล้นที่ได้ไปแล้ว (ดู ORDER_WARN)
    greens: 0,                        // คำตัดสินสีเขียว (78 ขึ้นไป) — เกณฑ์เลื่อนขั้นตั้งแต่ 9 ก.ย. 2569
    reds: 0,                          // คำตัดสินสีแดงติดกัน — ครบ 3 พ่อลงมาตบเอง
    player: { x: SPOTS.bench.x + 60, y: SPOTS.bench.y, tx: null, ty: null, face: 1, path: null },
    items: [], mobs: [], guard: null, fxHits: [],
    queue: [], held: [], logs: [], closed: [], over: null,   // held = ดวงที่ถูกขังในตะราง ไม่นับอยู่ในคิว
    // เดินวาระตั้งแต่เข้าเกม (8 ก.ย. 2569) — เดิมเป็น true แล้วไม่มีอะไรปลดให้เลย
    // ทุกกล่องข้อความจำค่า paused ตอนเปิดแล้วคืนค่าเดิมตอนปิดอย่างซื่อสัตย์
    // ค่าเดิมคือ "พัก" เกมเลยค้างตั้งแต่วินาทีแรก: ทัณฑ์ 0% ยมทูตยืนนิ่ง ไม่มีอะไรขยับ
    // (เจ้าของถามว่าทำไมความคืบหน้าเป็น 0% หมด — นี่คือคำตอบ)
    paused: false, speed: 1,
    nextArrive: 4, nextEvent: BAL.eventEvery, nextPay: BAL.payEvery, nextKpi: BAL.kpiEvery,
    kpiPassed: 0, casesDone: 0, scoreSum: 0,
    // ตอนเริ่มเกมมีสามคน: ท่าน · นิรา (อ่านสำนวน) · ทัณฑ์ (ลงทัณฑ์) — คนอื่นต้องจ้างเอง
    crew: CREW.filter(c => c.hire === 0).map(mkCrew),
    self: { ...SELF, morale: 100 },   // ท่านเองตอนลงไปคุมสถานีแทนยมทูต
    taught: [],                       // ขั้นบทเรียนที่สอนไปแล้ว (ดู TUTOR ใน data.js)
    ledger: [],                       // ทุกคำตัดสินที่เคยออก — ใช้เปิด "แฟ้มของท่าน" ตอนจบ
    returning: [],                    // คดีที่ตัดสินเบาไป รอกลับมาใหม่
    returned: 0,                      // นับว่ากลับมาแล้วกี่คดี
    stations: [],
    zone: 'th',                       // โซนที่กำลังคุมอยู่ (ดู ZONES ใน data.js)
    usedCases: [],                    // สำนวนที่มีชื่อซึ่งผ่านมาแล้ว — ไม่ส่งซ้ำจนกว่าจะหมดชุด
    fights: 0,                        // ฉากต่อสู้ที่เกิดขึ้นแล้ว (ใช้เป็นเงื่อนไขบทเรียน)
    spawns: 0,                        // วิญญาณที่ส่งมาแล้วทั้งหมด — ใช้จับจังหวะสำนวนที่เขียนมือ
    battle: null,                     // ฉากต่อสู้ที่กำลังเปิดอยู่ (null = ไม่มี)
    onChange: () => {},
  };

  // สถานีตั้งต้น: หอทะเบียน + กระทะทองแดง (ที่เหลือสร้างเอาเอง)
  g.stations = [mkStation('sala'), mkStation('krata')];

  Object.assign(g, API);
  g.log(`พญายม: "โซนนี้เละมาสามร้อยปีแล้ว นี่เบี้ยกรรม ${BAL.startCoin} ไปสร้างที่ลงทัณฑ์กับหาคนเอาเอง"`, 'boss');
  g.spawnSoul();
  return g;
}

function mkCrew(def) {
  return { ...def, morale: 92, at: null, tired: false };
}

/** สถานีหนึ่งหลังรับวิญญาณได้พร้อมกันหลายดวง (9 ก.ย. 2569 — เดิมทีละดวง)
 *  slots = [{soul, intensity, progress, need, verdict}] · ผู้คุมคนเดียวดูทั้งหลัง
 *  build = เวลาที่จะสร้างเสร็จ (0 = เสร็จแล้ว) · fire = ไฟไหม้จากผีที่บุกมา (0-100) */
function mkStation(k, build = 0) {
  const def = STATIONS.find(s => s.k === k);
  return { def, slots: [], crewK: null, intensity: 3, build, fire: 0 };
}

// ---------- สร้างสำนวนคดี ----------
/** คดีที่ถูกกับผิดปนกัน — ด้านที่ทำให้เห็นใจถูกซ่อนไว้ ต้องใช้พลังถึงจะเจอ */
function mkHardSoul(tags) {
  const ok = (!tags || !tags.length) ? HARD_CASES
           : HARD_CASES.filter(h => tags.includes(h.seen.s));
  const c = pick(ok.length ? ok : HARD_CASES);
  const soul = {
    id: SEQ++, who: c.who, sex: SEX_OF[c.who] || 'm', hard: true, waited: 0, said: [],
    deeds: [{ ...c.seen, known: true }, { ...c.hidden, known: false }],
    merits: [{ ...c.merit, fake: false, hiddenMerit: true }],
    denied: null,
  };
  soul.deserved = deservedOf(soul);
  soul.resist = soul.deserved >= BAL.resistFrom && Math.random() < BAL.resistChance;
  soul.sp = spiritFor(soul.who, soul.sex);     // หน้าตาต้องตรงกับสำนวน — รวมถึงเพศด้วย
  soul.said.push({ kind: 'deny', text: c.line });
  soul.lines = mkLines(soul);
  soul.presses = BAL.presses;
  return soul;
}

/** สำนวนที่ส่งมาต้องเป็นกรรมที่โซนนี้ "มีที่ลง" อยู่จริง
 *  เจ้าของบอก 7 ก.ย. 2569 ว่าคดีที่มาไม่ตรงกับสถานีที่มี ทำให้ลงทัณฑ์ให้ตรงกรรมไม่ได้เลย
 *  ตอนนี้จึงกรองด้วย tags ของสถานีที่สร้างแล้ว — สร้างสถานีเพิ่ม = เปิดสำนวนแนวนั้นเข้ามา
 *  (ถ้าไม่มีสถานีลงทัณฑ์สักหลัง ค่อยปล่อยทุกแนวตามเดิม ไม่งั้นคิวจะว่างเปล่า) */
function poolOf(tags) {
  if (!tags || !tags.length) return DEEDS;
  const pool = DEEDS.filter(d => tags.includes(d.s));
  return pool.length ? pool : DEEDS;
}

function mkSoul(tags, hiddenBonus = 0) {
  const POOL = poolOf(tags);
  const n = 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);
  const deeds = [];
  let guard = 0;
  while (deeds.length < n && guard++ < 40) {
    const d = pick(POOL);
    if (!deeds.some(x => x.t === d.t)) deeds.push({ ...d, known: true });
  }
  // เรื่องที่สำนวนไม่ได้เขียนไว้ — ต้องใช้พลังถึงจะเจอ (ยังอยู่ในแนวที่โซนนี้รับได้เหมือนกัน
  // ไม่งั้นความจริงที่ขุดขึ้นมาจะกลายเป็นกรรมที่ไม่มีสถานีไหนรับ = ตัดสินยังไงก็ธรรมตก)
  if (Math.random() < clamp(BAL.hiddenChance + hiddenBonus, 0, 1)) {
    const h = pick(POOL);
    if (!deeds.some(x => x.t === h.t)) deeds.push({ ...h, known: false });
  }
  // บุญ: บางอันเป็นของจริง บางอันเขากุขึ้นเอง
  const merits = [];
  if (Math.random() < 0.65) merits.push({ ...pick(MERITS), fake: false });
  if (Math.random() < BAL.fakeMeritChance) {
    const f = pick(MERITS);
    if (!merits.some(m => m.t === f.t)) merits.push({ ...f, fake: true });
  }

  const who = pick(WHO);
  const soul = {
    id: SEQ++, who, sex: SEX_OF[who] || 'm', deeds, merits, waited: 0,
    said: [],          // สิ่งที่ปรากฏบนโต๊ะแล้ว (คำแก้ตัว/คำสารภาพ/ผลของพลัง)
    denied: null,      // เรื่องที่เขาปฏิเสธ
  };
  soul.deserved = deservedOf(soul);
  // ดวงที่กรรมหนักพอ มีสิทธิ์ไม่ยอมเดินลงไปเอง — ต้องปราบก่อนถึงจะลากเข้าสถานีได้
  soul.resist = soul.deserved >= BAL.resistFrom && Math.random() < BAL.resistChance;
  soul.sp = spiritFor(soul.who, soul.sex);     // หน้าตาต้องตรงกับสำนวน — รวมถึงเพศด้วย

  // คำแก้ตัวตั้งต้น — ปฏิเสธเรื่องที่หนักที่สุดในสำนวน
  const worst = [...deeds].filter(d => d.known).sort((a, b) => b.w - a.w)[0];
  if (worst && Math.random() < 0.6) {
    soul.denied = worst.t;
    soul.said.push({ kind: 'deny', text: `"${voice(pick(DENIALS), soul.sex)}" — เรื่อง${worst.t}` });
  }
  for (const m of merits) soul.said.push({ kind: 'claim', text: `"${m.t}" (เขาอ้างเอง ยังไม่มีใครยืนยัน)` });
  soul.lines = mkLines(soul);
  soul.presses = BAL.presses;
  return soul;
}

/** สำนวนที่มีชื่อ มีหน้า มีเรื่อง — เขียนมือไว้ที่ src/cases.js
 *  ต่างจาก mkSoul ตรงที่ทุกบรรทัดถูกเขียนให้ตรงกับ "คนคนนั้น" ไม่ใช่ประกอบจากตาราง
 *  รูป (sp) เพศ (sex) และเนื้อสำนวน จึงตรงกันเสมอโดยไม่ต้องพึ่งการสุ่ม */
function mkCaseSoul(c) {
  const soul = {
    id: SEQ++, case: c.k, kind: c.kind, who: c.who, name: c.name, sex: c.sex, sp: c.sp,
    face: c.face, waited: 0, said: [], denied: null, resist: !!c.resist,
    pure: isPure(c),
    secret: c.secret || null, reward: c.reward || null, fail: c.fail || null,
    deeds:  [...c.seen.map(d => ({ ...d, known: true })),
             ...(c.hidden || []).map(d => ({ ...d, known: false }))],
    merits: (c.merits || []).map(m => ({ ...m })),
  };
  // คนบริสุทธิ์กับเทวดา "ไม่มีวาระที่สมควรได้รับ" — ทางเดียวที่ถูกคือส่งประตูสวรรค์
  soul.deserved = soul.pure ? 0 : deservedOf(soul);
  soul.said.push({ kind: 'deny', text: c.line });
  soul.lines = (c.claims || []).map((l, i) => ({ ...l, t: voice(l.t, c.sex), i, used: false }));
  soul.presses = BAL.presses;
  return soul;
}

/** คำให้การ 4 บรรทัดของวิญญาณ — หัวใจของมินิเกมไต่สวน
 *
 *  กติกาที่ทำให้มัน "อ่านออก" ไม่ใช่เดา:
 *    weak = บรรทัดที่ขัดกับสิ่งที่อยู่ในสำนวนตรงหน้าอยู่แล้ว ผู้เล่นเทียบเองได้
 *      · deny  — ปฏิเสธชนิดบาปที่สำนวนเขียนไว้ชัด ๆ  → จี้แล้วจนมุม สารภาพเรื่องที่ซ่อนไว้
 *      · boast — อวดบุญที่เป็นบุญปลอม               → จี้แล้วบุญนั้นถูกลบทิ้ง
 *      · plea  — คดีที่ตัดสินยาก คำขอร้องของเขาเอง    → จี้แล้วเจอด้านที่ทำให้เห็นใจ
 *    solid = ยอมรับทุกอย่างตรงกับสำนวน จี้ไปก็ไม่ได้อะไร
 *  จี้ได้ 2 ครั้งต่อคดี = พลาดได้หนึ่งครั้ง
 */
function mkLines(soul) {
  const out = [];
  if (soul.hard) {
    const plea = soul.said.find(x => x.kind === 'deny');
    out.push({ kind: 'plea', t: (plea ? plea.text : voice('"{i}ขอพูดอะไรสักอย่างได้ไหม{p}ท่าน"', soul.sex)).replace(/^"|"$/g, '') });
  } else {
    // ปฏิเสธชนิดบาปที่หนักที่สุดในสำนวนที่ผู้เล่นเห็นแล้ว
    const known = soul.deeds.filter(d => d.known).sort((a, b) => b.w - a.w);
    if (known.length && DENY_BY_SIN[known[0].s])
      out.push({ kind: 'deny', t: voice(DENY_BY_SIN[known[0].s], soul.sex), sin: known[0].s });
  }
  const fake = soul.merits.find(m => m.fake);
  if (fake) out.push({ kind: 'boast', t: voice(`ท่านดูบุญ{my}ด้วย{na} — ${fake.t}`, soul.sex), merit: fake.t });

  // ---- บรรทัดที่ "ตรงกับสำนวน" ----
  // เจ้าของทัก 8 ก.ย. 2569 ว่าสี่บรรทัดนี้ดูซ้ำทุกคดี เพราะเดิมสุ่มจากกองกลางกองเดียว 5 บรรทัด
  // ของใหม่ต่อกันสามชั้น ชั้นแรกผูกกับ "ข้อความในสำนวนจริง" จึงไม่มีทางซ้ำข้ามคดีได้เลย
  const pool = [];
  const known = soul.deeds.filter(d => d.known);
  if (known.length) {
    const d = pick(known);
    pool.push(pick(ADMIT_TPL).replace(/\{d\}/g, d.t));           // 1. อ้างสำนวนตรง ๆ
  }
  for (const d of known) pool.push(...(SOLID_BY_SIN[d.s] || []));  // 2. ตามชนิดบาปในคดีนี้
  pool.push(...SOLID_LINES);                                        // 3. กองกลางเป็นตัวเติม

  const used = new Set();
  let guard2 = 0;
  while (out.length < 4 && guard2++ < 60) {
    if (!pool.length) break;
    const i = Math.floor(Math.random() * pool.length);
    const t = pool.splice(i, 1)[0];
    if (used.has(t)) continue;
    used.add(t);
    out.push({ kind: 'solid', t: voice(t, soul.sex) });
  }
  // สลับลำดับ ไม่งั้นบรรทัดที่จี้ได้จะอยู่บนสุดทุกคดี
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.map((l, i) => ({ ...l, i, used: false }));
}

/** วาระที่สมควรได้รับ คิดจาก "ความจริงทั้งหมด" ไม่ใช่จากที่ผู้เล่นเห็น */
function deservedOf(soul) {
  const ws = soul.deeds.map(d => d.w).sort((a, b) => b - a);
  const raw = ws[0] + ws.slice(1).reduce((s, w) => s + w * 0.4, 0);
  const merit = soul.merits.filter(m => !m.fake).reduce((s, m) => s + m.v, 0);
  return clamp(Math.round(raw - merit), 1, 5);
}

const API = {
  log(text, kind = '') {
    this.logs.unshift({ t: this.tick, text, kind });
    if (this.logs.length > 90) this.logs.pop();
  },

  spawnSoul() {
    if (this.queue.length >= 14) return;
    this.spawns = (this.spawns || 0) + 1;
    const tags = this.activeTags();
    const s = this.nextNamedCase(tags)
      || ((this.casesDone >= 2 && Math.random() < 0.22)
            ? mkHardSoul(tags)
            : mkSoul(tags, this.orderTier().hidden));
    if (s.case) this.log(`📁 สำนวนมีชื่อเข้าคิว — ${s.name} (${s.who})`, 'event');
    else if (s.hard) this.log(`⚖️ สำนวน #${String(s.id).padStart(3, '0')} หนา​ผิดปกติ — นิราวางไว้แล้วไม่พูดอะไร`, 'event');
    else this.log(`วิญญาณเข้าคิว — ${s.who} (สำนวน #${String(s.id).padStart(3, '0')})`);
    this.queue.push(s);
  },

  /** ถึงคิวของสำนวนที่เขียนมือหรือยัง — คืน null ถ้ายังไม่ถึง หรือไม่มีเรื่องไหนที่โซนนี้รับได้
   *  กติกาสองข้อที่ทำให้ไม่มีทางเจอคดีที่ "ตัดสินให้ถูกไม่ได้เลย":
   *    · คดีปกติต้องมีสถานีที่รับชนิดกรรมของเขาอยู่แล้วอย่างน้อยหนึ่งหลัง
   *    · คดีคนบริสุทธิ์/เทวดา ส่งมาก็ต่อเมื่อสร้างประตูสวรรค์แล้วเท่านั้น */
  nextNamedCase(tags) {
    if (this.casesDone < 1) return null;
    if (this.spawns % CASE_EVERY !== 0) return null;
    const left = CASES.filter(c => !this.usedCases.includes(c.k));
    if (!left.length) return null;
    const ok = left.filter(c => {
      if (isPure(c)) return this.has('sawan');
      if (!tags.length) return true;
      return c.seen.some(d => tags.includes(d.s));
    });
    if (!ok.length) return null;
    const c = pick(ok);
    this.usedCases.push(c.k);
    return mkCaseSoul(c);
  },

  /** สถานีนี้รับได้กี่ดวง — หลังที่ไม่ได้ใช้ลงทัณฑ์ (แรง 0) รับไม่ได้เลย */
  stCap(st) { return st && st.def.pow > 0 ? STATION_CAP : 0; },
  /** ยังรับเพิ่มได้อีกกี่ดวง (กำลังก่อสร้างอยู่ = ยังไม่รับ) */
  stFree(st) { return st && !st.build ? this.stCap(st) - st.slots.length : 0; },
  /** ดวงที่อยู่หน้าสุดของสถานี — ใช้ตอนซัดไฟเร่งทัณฑ์เอง */
  stFront(st) { return st && st.slots.length ? st.slots[0] : null; },

  crewOf(k) {
    if (k === 'me') return this.self;        // ท่านลงไปคุมเอง — ไม่มีค่าแรง ไม่ต้องจ้าง
    return this.crew.find(c => c.k === k);
  },

  has(k) { return this.stations.some(st => st.def.k === k); },

  /** คิวรับได้กี่ดวงก่อนระเบียบจะเริ่มตก
   *  ตะรางเปลี่ยนบทตั้งแต่ 8 ก.ย. 2569 — เดิมเป็นแค่ตัวเลขที่ดันเพดานคิวขึ้นเฉย ๆ
   *  ตอนนี้เป็น "ที่ขังจริง" ที่ผู้เล่นสั่งย้ายดวงไหนเข้าไปก็ได้ (ดู jail/release)
   *  ดวงที่ถูกขังจึงไม่นับอยู่ในคิวเลย ไม่ต้องบวกเพดานให้อีก */
  queueCap() { return BAL.queueMax; },

  /** ตะรางยังรับได้อีกกี่ดวง */
  jailFree() { return this.has('tarang') ? TARANG.hold - this.held.length : 0; },

  /** ขังไว้ก่อน — ทางออกตอน "สถานีที่ตรงกรรมไม่ว่าง แต่คิวกำลังล้น"
   *  ไม่นับเป็นคำตัดสิน ไม่ได้คะแนน ไม่เสียคะแนน แค่ซื้อเวลา แลกกับค่าข้าวทุกวาระ */
  jail(soulId) {
    if (this.jailFree() <= 0) return false;
    const i = this.queue.findIndex(x => x.id === soulId);
    if (i < 0) return false;
    const soul = this.queue.splice(i, 1)[0];
    this.held.push(soul);
    this.log(`🔒 ขัง${soul.name || soul.who} (สำนวน #${String(soul.id).padStart(3, '0')}) ไว้ในตะรางก่อน — ` +
             `ค่าข้าว ${TARANG.feed} เบี้ยต่อวาระ`, 'act');
    this.onChange();
    return true;
  },

  /** เรียกออกจากตะรางมาขึ้นแท่น */
  release(soulId) {
    const i = this.held.findIndex(x => x.id === soulId);
    if (i < 0) return false;
    const soul = this.held.splice(i, 1)[0];
    this.queue.unshift(soul);
    this.log(`🔓 เบิกตัว${soul.name || soul.who}ออกจากตะรางมาขึ้นแท่น`, 'act');
    this.onChange();
    return true;
  },

  /** เลื่อนคดีที่ยืนอยู่หน้าแท่นไปท้ายคิว — ฟรี ไม่มีโทษ
   *  มีไว้แก้ทางตันที่เจ้าของเจอ 8 ก.ย. 2569: สำนวนเป็นฉ้อโกง แต่กระทะทองแดงไม่ว่าง
   *  ตัดสินให้ตรงกรรมไม่ได้เลย และไม่มีปุ่มอะไรให้กดนอกจากตัดสินผิด ๆ ไปก่อน */
  defer() {
    if (this.queue.length < 2) return false;
    const soul = this.queue.shift();
    this.queue.push(soul);
    this.log(`⏭️ ให้${this.queue[0].name || this.queue[0].who}ขึ้นแทน — ` +
             `สำนวน #${String(soul.id).padStart(3, '0')} เลื่อนไปท้ายคิว`, 'act');
    this.onChange();
    return true;
  },

  /** ชนิดกรรมที่โซนนี้ "มีที่ลง" ตอนนี้ — คิวจะส่งมาแต่แนวนี้ */
  activeTags() {
    const t = new Set();
    for (const st of this.stations) for (const tag of st.def.tags) t.add(tag);
    return [...t];
  },

  /** ขั้นของระเบียบ/กรรมตอนนี้ — ทั้งผลจริงในเกมและข้อความอธิบายอยู่ใน data.js ที่เดียว */
  orderTier() { return ORDER_TIERS.find(t => this.order >= t.min) || ORDER_TIERS[ORDER_TIERS.length - 1]; },
  karmaTier() { return KARMA_TIERS.find(t => this.karma <= t.max) || KARMA_TIERS[KARMA_TIERS.length - 1]; },


  powerOf(k) { return this.powers.find(p => p.k === k); },
  powerReady(k) {
    const p = this.powerOf(k);
    return p && p.cd === 0 && p.ammo > 0 && !this.powerLocked(p);
  },

  /** ใช้พลังกับวิญญาณที่ยืนอยู่หน้าแท่น — คืนข้อความที่จะขึ้นบนโต๊ะ */
  usePower(k, soul) {
    if (!this.powerReady(k) || !soul) return null;
    const p = this.powerOf(k);
    p.cd = POWERS.find(x => x.k === k).cd;      // เริ่มนับ cooldown
    p.ammo--;                                    // และกินกระสุนไปหนึ่ง — เดินไปเก็บของมาเติมได้
    this.karma = clamp(this.karma + p.karma, 0, 100);

    const hidden = soul.deeds.filter(d => !d.known);
    const fakes = soul.merits.filter(m => m.fake && !m.exposed);
    let out = [];

    if (k === 'mirror') {                        // ความจริงเสมอ ทีละเรื่อง
      // สำนวนที่เขียนมือบางเรื่องมีความลับที่ "จี้เอาเองไม่ได้" — เห็นได้ทางกระจกทางเดียว
      // (เทวดาปลอมตัว กับคนที่ฝ่ายคัดกรรมส่งมาผิด) นี่คือเหตุผลที่ต้องเก็บกระจกไว้ใช้บ้าง
      if (soul.secret && !soul.secretSeen) {
        soul.secretSeen = true;
        out.push({ kind: 'truth', text: soul.secret });
      } else if (hidden.length) {
        hidden[0].known = true;
        out.push({ kind: 'truth', text: `🪞 กระจกส่องเห็น: ${hidden[0].t}` });
      } else if (fakes.length) {
        fakes[0].exposed = true;
        out.push({ kind: 'truth', text: `🪞 กระจกส่องเห็น: "${fakes[0].t}" ไม่เคยเกิดขึ้นเลย` });
      } else if (soul.denied) {
        out.push({ kind: 'truth', text: `🪞 กระจกส่องเห็น: ที่เขาปฏิเสธเรื่อง${soul.denied} — เขาทำจริง` });
      } else {
        out.push({ kind: 'truth', text: '🪞 กระจกส่องแล้วไม่พบอะไรที่ยังไม่รู้ สำนวนนี้ตรงไปตรงมา' });
      }

    } else if (k === 'roar') {                   // เร็วกว่า แต่คนกลัวพูดมั่วได้
      if (Math.random() < 0.65 && hidden.length) {
        hidden[0].known = true;
        out.push({ kind: 'confess', text: `💢 "${pick(CONFESS)}" — ${hidden[0].t}` });
      } else {
        const f = pick(DEEDS);
        out.push({ kind: 'false', text: `💢 "${pick(PANIC)}" — เขาสารภาพว่า${f.t}` });
        out.push({ kind: 'hint', text: 'คำสารภาพนี้ออกมาตอนกำลังกลัว จะเชื่อหรือไม่เชื่อก็ได้' });
      }

    } else if (k === 'hypno') {                  // เห็นหมด แต่กรรมตกที่เรา
      hidden.forEach(d => { d.known = true; out.push({ kind: 'truth', text: `🌀 ในใจเขามี: ${d.t}` }); });
      fakes.forEach(m => { m.exposed = true; out.push({ kind: 'truth', text: `🌀 "${m.t}" เป็นเรื่องที่เขาแต่งขึ้น` }); });
      if (!out.length) out.push({ kind: 'truth', text: '🌀 ในใจเขาไม่มีอะไรมากไปกว่าที่พูดออกมาแล้ว' });
      out.push({ kind: 'hint', text: `การรื้อใจคนเป็นกรรมของเราด้วย — กรรมท่าน +${p.karma}` });
    }

    soul.said.push(...out);
    return out;
  },
  // นิราเป็นคนอ่านสำนวน ไม่ใช่ผู้คุม — เธอไม่โผล่ในช่อง "ใครคุม" อีกแล้ว (7 ก.ย. 2569)
  /** จี้คำให้การบรรทัดที่ i — หัวใจของมินิเกมไต่สวน
   *  คืนข้อความที่จะขึ้นบนโต๊ะ (หรือ null ถ้ากดไม่ได้) */
  press(soul, i) {
    if (!soul || !soul.lines) return null;
    const L = soul.lines[i];
    if (!L || L.used || soul.presses <= 0) return null;
    L.used = true;
    soul.presses--;
    const out = [];

    if (L.kind === 'deny') {
      // จนมุม — เรื่องที่สำนวนไม่ได้เขียนไว้โผล่ออกมาเอง ไม่ต้องเสียพลังสักอย่าง
      const hidden = soul.deeds.find(d => !d.known);
      out.push({ kind: 'confess', text: `⚖️ ${pick(CRACK_LINES)}` });
      // สำนวนที่เขียนมือมีบทของตัวเอง — ใช้บทนั้นแทนบทกลาง
      if (L.reveal) out.push({ kind: 'truth', text: L.reveal });
      if (hidden) {
        hidden.known = true;
        if (!L.reveal) out.push({ kind: 'truth', text: `"${voice('...จริง ๆ แล้วยังมีอีกเรื่องหนึ่ง{p}', soul.sex)}" — ${hidden.t}` });
        else out.push({ kind: 'truth', text: `เปิดเพิ่มในสำนวน — ${hidden.t}` });
      } else if (soul.denied) {
        out.push({ kind: 'truth', text: `"${voice(`ที่{i}ปฏิเสธเรื่อง${soul.denied} — {i}ทำจริง{p}`, soul.sex)}"` });
        soul.denied = null;
      } else {
        out.push({ kind: 'truth', text: `"${voice('{i}พูดเกินไปเอง{p} ในสำนวนนั้นถูกทั้งหมดแล้ว', soul.sex)}"` });
      }

    } else if (L.kind === 'boast') {
      const m = soul.merits.find(x => x.t === L.merit);
      if (m) m.exposed = true;
      out.push({ kind: 'truth', text: L.reveal || `⚖️ ท่านถามกลับสองคำ เขาก็ตอบไม่ได้ — "${L.merit}" ไม่เคยเกิดขึ้น` });
      out.push({ kind: 'hint', text: 'บุญปลอมถูกลบออกจากสำนวนแล้ว วาระที่สมควรได้รับจะไม่ถูกลดลงเพราะมันอีก' });

    } else if (L.kind === 'plea') {
      // คดีที่ถูกกับผิดปนกัน — จี้แล้วเจอด้านที่ทำให้เห็นใจ
      const hidden = soul.deeds.filter(d => !d.known);
      if (L.reveal) out.push({ kind: 'confess', text: `⚖️ ${L.reveal}` });
      if (hidden.length) {
        hidden.forEach(d => { d.known = true; out.push({ kind: 'truth', text: `⚖️ เขาเล่าต่อจนจบ — ${d.t}` }); });
      } else if (!L.reveal) {
        out.push({ kind: 'truth', text: '⚖️ เขาเล่าซ้ำอีกรอบ ไม่มีอะไรเพิ่มจากที่พูดไปแล้ว' });
      }

    } else {
      out.push({ kind: 'hint', text: `↳ ${pick(HOLD_LINES)}` });
    }

    soul.said.push(...out);
    this.onChange();
    return out;
  },

  freeCrew() { return this.crew.filter(c => !c.at && !c.reader); },

  // ---------- มอบหมายคดี ----------
  assign(soulId, stKey, crewK, intensity) {
    const st = this.stations.find(s => s.def.k === stKey);
    const si = this.queue.findIndex(s => s.id === soulId);
    if (!st || si < 0 || this.stFree(st) <= 0) return false;
    // สถานีที่มีผู้คุมประจำอยู่แล้ว ดวงถัดไปเข้าเวรของคนเดิม (หนึ่งหลังหนึ่งผู้คุม)
    const useK = st.slots.length ? st.crewK : crewK;
    const c = this.crewOf(useK);
    if (!c) return false;
    if (c.reader) return false;              // นิราไม่รับเวรลงทัณฑ์
    if (!c.self && c.at && c.at !== st.def.k) return false;   // ยมทูตคนอื่นติดเวรที่อื่นอยู่
    const soul = this.queue.splice(si, 1)[0];
    const slot = { soul, intensity: clamp(intensity, 1, 5), progress: 0, need: 0, verdict: null };
    slot.need = 18 + soul.deserved * 8 + slot.intensity * 7;
    st.slots.push(slot);
    st.crewK = useK;
    st.intensity = slot.intensity;
    c.path = null;                       // ทิ้งเส้นทางเดินเล่นเดิม แล้วเดินไปประจำสถานีใหม่
    if (c.self) this.log('ท่านลงไปคุมเอง — สถานีจะเดินเฉพาะตอนท่านยืนอยู่ตรงนั้น', 'act');
    else c.at = st.def.k;
    this.log(`${c.name} รับสำนวน #${String(soul.id).padStart(3, '0')} เข้า${st.def.name} · วาระ ${slot.intensity}`
             + (st.slots.length > 1 ? ` (คุมอยู่ ${st.slots.length} ดวง)` : ''), 'act');
    slot.verdict = this.judge(st, slot);   // คำตัดสินให้คะแนนทันทีที่ออกหมาย ไม่ใช่ตอนทัณฑ์จบ
    this.applyVerdict(slot.verdict, soul);
    return true;
  },

  // ---------- สูตรตัดสิน ----------
  judge(st, slot) {
    const soul = slot.soul, c = this.crewOf(st.crewK);
    const tags = st.def.tags;
    const rabOf = () => clamp(48 + c.rabiab * 5 - this.queue.length * 4, 0, 100);

    // ---- ประตูสวรรค์: สูตรกลับด้านทั้งหมด ----
    // คนบริสุทธิ์กับเทวดา "ไม่มีวาระ" — วัดกันแค่ว่าท่านส่งเขาไปถูกทางไหม
    // นี่คือทางเดียวที่เกมยอมให้ตอบว่า "ไม่ต้องลงทัณฑ์"
    if (st.def.heaven || soul.pure) {
      const right = !!st.def.heaven && !!soul.pure;
      const rab = rabOf();
      const tham = right ? 100 : 0;
      const ked  = right ? 100 : 0;
      const score = Math.round(0.50 * tham + 0.33 * ked + 0.17 * rab);
      // ลงทัณฑ์คนที่ไม่มีกรรม = กรรมทั้งก้อนตกที่ผู้ตัดสิน ไม่มีส่วนลดจากเมตตาของผู้คุม
      const karma = soul.pure && !st.def.heaven ? 14
                  : st.def.heaven && !soul.pure ? 8 : 0;
      const coin = right ? Math.round(BAL.coinPerCase * 1.4 * this.orderTier().coin) : 0;
      return { tham, ked, rab, score, karma, coin, short: 0, over: 0, heaven: true, right };
    }
    const totalW = soul.deeds.reduce((s, d) => s + d.w, 0);
    const hitW = soul.deeds.filter(d => tags.includes(d.s)).reduce((s, d) => s + d.w, 0);
    let tham = tags.length === 0 ? 42 : Math.round(100 * hitW / totalW);
    if (c.panya >= 7) tham = Math.min(100, tham + 6);

    const short = Math.max(0, soul.deserved - slot.intensity);
    const over = Math.max(0, slot.intensity - soul.deserved);
    // เบาไปกับหนักเกิน ต้องเจ็บพอ ๆ กัน ไม่งั้นซัดวาระ 5 ทุกคดีจะเป็นวิธีเล่นที่ดีที่สุด
    // ซึ่งขัดกับแกนของเกมทั้งเกม
    const ked = clamp(100 - short * 26 - over * 17, 0, 100);
    const rab = clamp(48 + c.rabiab * 5 - this.queue.length * 4, 0, 100);

    const score = Math.round(0.50 * tham + 0.33 * ked + 0.17 * rab);

    // บาปตกที่ยมบาท — กลไกหลักของเกม
    let karma = 0;
    if (over > 0) karma += over * Math.max(1.2, 5 * (1 - c.metta / 25));
    if (tham < 40) karma += 4;                       // ลงทัณฑ์ผิดฝาผิดตัว
    if (c.k === 'plerng' && Math.random() < 0.35) {  // เพลิงชอบบวกเอง
      karma += 3; this.log('เพลิงบวกวาระให้เองอีกนิด "เดี๋ยวมันไม่จำ"', 'bad');
    }
    karma = Math.round(karma * 10) / 10;

    // ระเบียบของโซนคูณเข้ากับรายได้ — นี่คือเหตุผลที่ต้องแคร์แถบระเบียบทุกวาระ
    const coin = Math.round(BAL.coinPerCase * (score / 100) * (0.7 + soul.deserved * 0.12)
                            * this.orderTier().coin);
    return { tham, ked, rab, score, karma, coin, short, over };
  },

  /** ผลของคำตัดสิน — คะแนน กรรม บารมี และเสียงจากพ่อ (เกิดทันทีที่ออกหมาย) */
  applyVerdict(r, soul) {
    this.karma = clamp(this.karma + r.karma, 0, 100);
    this.order = clamp(this.order + (r.score - 55) / 12, 0, 100);
    this.casesDone++; this.scoreSum += r.score;
    // กรรมของท่านยิ่งหนา เปรตยิ่งขึ้นถี่ — มันตามกลิ่นกรรมมา
    const every = Math.max(2, Math.round(MOB.spawnEvery * this.karmaTier().mob));
    if (this.casesDone % every === 0) this.spawnMob();
    this.powers.forEach(p => { if (p.cd > 0) p.cd--; });

    // สำนวนที่เขียนมือมีบทเฉลยของตัวเอง — พูดทันทีที่หมายถูกประทับ
    if (soul.pure) {
      if (r.right) { if (soul.reward) this.log(`🕊️ ${soul.reward}`, 'good'); }
      else if (soul.fail) this.log(`🕊️ ${soul.fail}`, 'bad');
    }

    const tag = r.score >= 78 ? 'good' : r.score >= 50 ? '' : 'bad';
    this.log(`คำตัดสิน #${String(soul.id).padStart(3, '0')} — ธรรม ${r.tham} · เข็ด ${r.ked} · รวม ${r.score}`, tag);
    // เขียวสะสมไว้เลื่อนขั้น · แดงสามครั้งติดกันพ่อลงมาเอง (เตือนก่อนสองครั้ง)
    if (tag === 'good') { this.greens++; this.reds = 0; this.checkLevel(); }
    else if (tag === 'bad') {
      this.reds++;
      if (this.reds < DAD.redsToCome) {
        this.log(`⚠️ ${DAD.warn[this.reds - 1] || DAD.warn[0]} (คำตัดสินแดง ${this.reds}/${DAD.redsToCome})`, 'boss');
        this.pendingWarn = { n: this.reds, of: DAD.redsToCome, text: DAD.warn[this.reds - 1] || DAD.warn[0] };
      } else { this.reds = 0; this.dadFight = true; }
    } else this.reds = 0;
    if (r.over > 0) this.log(`  ↳ เกินกรรมไป ${r.over} วาระ · กรรมตกที่ท่าน +${r.karma}`, 'bad');
    if (r.short > 0) this.log('  ↳ เบาไป วิญญาณยังไม่สำนึก จดไว้ในทะเบียนกลับมาใหม่', 'bad');
    if (r.tham < 40) this.log('  ↳ ทัณฑ์ไม่ตรงชนิดกรรมของเขา', 'bad');

    // ลงทัณฑ์เกินกรรมตั้งแต่สองวาระขึ้นไป = พ่อหักบารมีเสมอ ต่อให้คะแนนรวมยังสวย
    // นี่คือข้อเดียวที่ท่านสั่งไว้ตั้งแต่วันแรก
    r.stars = starsOf(r.score);
    // ลงทัณฑ์เกินกรรมตั้งแต่สองวาระ = พ่อหักบารมีเสมอ ต่อให้คะแนนรวมยังสวย
    if (r.heaven && !r.right) { r.boss = 'terrible'; r.stars = 0; }
    else if (r.heaven && r.right) r.boss = 'great';
    else if (r.over >= 2 && r.score >= 50) { r.boss = 'cruel'; r.stars = Math.min(r.stars, 2); }
    else if (r.score < 35)  r.boss = 'terrible';
    else if (r.score < 50)  r.boss = 'bad';
    else if (r.score >= 82) r.boss = 'great';
    else                    r.boss = 'ok';

    if (r.stars === 0) this.fireball('คำตัดสินนี้ไม่มีดาวสักดวง');
    else if (r.boss === 'cruel') this.fireball('เกินกรรมไปสองวาระ');
    else if (r.stars <= 1) { this.hp -= 10; this.log('พญายมส่ายหน้า — บารมีหายไป 10', 'bad'); }
    else if (r.stars === 5) {
      this.star5++;
      // กรรมของท่านเองสูงเท่าไหร่ พ่อก็ยิ่งไม่อยากคืนบารมีให้ (ดู KARMA_TIERS)
      const heal = BAL.hpGoodHeal * this.karmaTier().heal;
      if (heal > 0) this.hp = Math.min(this.hpMax, this.hp + heal);
      this.coin += 60;
      // ห้าดาวคือทางลดกรรมที่ไม่ต้องจ่ายเงิน — ตัดสินให้ตรงกรรมคือการล้างกรรมของตัวเอง
      const cut = Math.min(this.karma, KARMA_RELIEF.star5);
      if (cut > 0) this.karma = Math.round((this.karma - cut) * 10) / 10;
      this.log(`⭐⭐⭐⭐⭐ ห้าดาว! (${this.star5} ครั้งแล้ว) +60 เบี้ยกรรม`
               + (cut > 0 ? ` · กรรมท่าน −${cut}` : '')
               + (heal > 0 ? '' : ' · กรรมท่านสูงเกินกว่าที่พ่อจะคืนบารมีให้'), 'good');
      this.checkLevel();
    } else if (r.stars === 4) this.coin += 25;

    this.hp = clamp(this.hp, 0, this.hpMax);
    // จดทุกคำตัดสินไว้ — ตอนจบเกมนิราจะวางแฟ้มชื่อของท่านเอง แล้วเปิดอ่านได้จริง
    this.ledger.push({ id: soul.id, who: soul.who, tick: this.tick,
                       over: r.over, short: r.short, karma: r.karma,
                       stars: r.stars, score: r.score, tham: r.tham,
                       deserved: soul.deserved, back: !!soul.back });
    if (this.ledger.length > 300) this.ledger.shift();
    this.pendingVerdict = { ...r, who: soul.who, id: soul.id };
    this.checkEnd();
  },

  finish(st, slot) {
    const i = st.slots.indexOf(slot);
    if (i < 0) return;
    const soul = slot.soul, c = this.crewOf(st.crewK);
    const r = slot.verdict || this.judge(st, slot);
    this.scheduleReturn(soul, r, slot.intensity);
    this.coin += r.coin;
    this.log(`ทัณฑ์ของ ${soul.who} ครบวาระแล้ว · +${r.coin} เบี้ยกรรม`, 'good');
    // เก็บสำนวนที่ปิดแล้วไว้ให้กดดูเฉลยย้อนหลังได้ในแผงข้อมูล (เก็บ 12 คดีล่าสุดพอ)
    this.closed.unshift({ soul, verdict: r, stK: st.def.k, crewK: st.crewK,
                          intensity: slot.intensity, tick: this.tick });
    if (this.closed.length > 12) this.closed.pop();
    st.slots.splice(i, 1);
    // ผู้คุมออกเวรเฉพาะตอนไม่เหลือดวงในหลังนั้นแล้ว
    if (!st.slots.length) {
      st.crewK = null;
      if (c) { c.at = null; c.path = null; }
    }
  },

  /** ตัดสินเบาไป = เขายังไม่สำนึก ปล่อยไปแล้วไปก่อเรื่องต่อ แล้วกลับมาใหม่
   *  นี่คือสิ่งที่ทำให้คำตัดสินมีผลระยะยาว ไม่ใช่จบเป็นคดี ๆ ไป */
  scheduleReturn(soul, r, intensity) {
    if (r.short <= 0 || soul.hard) return;
    if (Math.random() > RETURN.chance) return;
    this.returning.push({
      at: this.tick + RETURN.after, fromId: soul.id, gave: intensity,
      // เพศต้องติดไปด้วย ไม่งั้นคดีที่กลับมาพูด "ผม/ครับ" หมดทุกดวง
      // (เจ้าของเจอ 10 ก.ย. 2569: นักเรียนหญิง ม.๕ กลับมาแล้วแทนตัวเองว่าผม)
      who: soul.who, sp: soul.sp, sex: soul.sex, name: soul.name,
      deeds: soul.deeds.map(d => ({ ...d, known: true })),
      merits: soul.merits.filter(m => !m.fake).map(m => ({ ...m })),
    });
  },

  /** สร้างวิญญาณที่กลับมา — สำนวนเดิมเปิดหมดแล้ว บวกเรื่องที่เขาไปทำต่อ */
  mkReturnSoul(R) {
    const worst = [...R.deeds].sort((a, b) => b.w - a.w)[0] || { s: 'kong', w: 2 };
    // เรื่องที่เขาไปทำต่อหลังถูกปล่อย — ส่วนใหญ่ปิดไว้ก่อน ให้ผู้เล่นต้องไต่สวนเอา
    // (ถ้าเปิดหมดตั้งแต่แรก คดีที่กลับมาจะไม่มีอะไรให้จี้เลย มินิเกมไต่สวนก็ตายไปด้วย)
    const secret = Math.random() < 0.65;
    const after = { t: AFTER_BY_SIN[worst.s] || 'กลับไปทำเรื่องเดิมซ้ำอีกครั้ง',
                    s: worst.s, w: Math.min(5, worst.w + RETURN.addWeight), known: !secret };
    const soul = {
      id: SEQ++, who: R.who, sp: R.sp, sex: R.sex || SEX_OF[R.who] || 'm', name: R.name,
      waited: 0, said: [],
      deeds: [...R.deeds, after], merits: R.merits, denied: null,
      back: { id: R.fromId, gave: R.gave },
    };
    soul.deserved = deservedOf(soul);
    soul.resist = soul.deserved >= BAL.resistFrom && Math.random() < BAL.resistChance;
    soul.said.push({ kind: 'confess', text: voice(secret
      ? `"ท่านให้{i}ไปแค่ ${R.gave} วาระ... แล้ว{i}ก็ไม่ได้อยู่เฉย ๆ {na}"`
      : `"ท่านให้{i}ไปแค่ ${R.gave} วาระ {i}ออกไปแล้วก็${after.t}{p}"`, soul.sex) });
    soul.lines = mkLines(soul);
    soul.presses = BAL.presses;
    return soul;
  },

  // ---------- หนึ่งวาระ ----------
  step() {
    if (this.over) return;
    this.tick++;

    // คดีที่ตัดสินเบาไป — ครบกำหนดแล้วกลับมาพร้อมเรื่องใหม่
    for (let i = this.returning.length - 1; i >= 0; i--) {
      if (this.tick < this.returning[i].at) continue;
      const R = this.returning.splice(i, 1)[0];
      const soul = this.mkReturnSoul(R);
      this.queue.push(soul);
      this.returned++;
      this.log(`↩️ ${soul.who}กลับมาอีกครั้ง — สำนวน #${String(soul.id).padStart(3, '0')} ` +
               `(เคยเป็นสำนวน #${String(R.fromId).padStart(3, '0')} ที่ท่านให้ไป ${R.gave} วาระ)`, 'bad');
    }

    // วิญญาณมาใหม่
    if (--this.nextArrive <= 0) {
      this.spawnSoul();
      // ระเบียบเละ = ข้างบนไม่สนใจว่าโซนนี้รับไหวไหม ส่งลงมาถี่ขึ้น
      this.nextArrive = Math.max(5, Math.round(BAL.arriveEvery * this.orderTier().arrive));
    }
    this.queue.forEach(s => s.waited++);

    // สถานีทำงาน
    let hasSala = false;
    for (const st of this.stations) {
      if (st.def.k === 'sala') hasSala = true;
      if (st.build || !st.slots.length) continue;
      if (st.fire >= MOB.burnMax) continue;       // ไหม้จนใช้การไม่ได้ ทัณฑ์หยุดหมด
      const c = this.crewOf(st.crewK);
      if (!c) continue;
      if (this.fuel < st.def.fuel) {
        if (this.tick % 6 === 0) this.log(`🔥 ฟืนหมด ${st.def.name} หยุดทำงาน`, 'bad');
        continue;
      }
      // คุมหลายดวงพร้อมกัน = แต่ละดวงเดินช้าลง ไม่ใช่ได้ฟรี
      const share = 1 / (0.55 + 0.45 * st.slots.length);
      // สถานีที่ท่านคุมเอง เดินช้ากว่ามาก และเดินเฉพาะตอนท่านยืนอยู่ตรงนั้นจริง ๆ
      // (จะให้เร็วเท่ายมทูตไม่ได้ ไม่งั้นไม่มีเหตุผลจะจ้างใครเลย)
      if (c.self) {
        const d = Math.hypot((st.def.sx ?? st.def.x) - this.player.x, (st.def.sy ?? st.def.y) - this.player.y);
        if (d > BAL.smiteReach) {
          if (this.tick % 10 === 0) this.log(`${st.def.name} หยุดรอ — ท่านคุมเองแต่ไม่ได้ยืนอยู่ตรงนั้น`, 'bad');
          continue;
        }
        this.fuel = Math.max(0, this.fuel - st.def.fuel);
        for (const slot of [...st.slots]) {
          slot.progress += st.def.pow * 0.7 * share;
          if (slot.progress >= slot.need) this.finish(st, slot);
        }
        continue;
      }
      this.fuel = Math.max(0, this.fuel - st.def.fuel);
      const mf = 0.55 + 0.45 * (c.morale / 100);
      for (const slot of [...st.slots]) {
        slot.progress += (c.raeng * 0.55 + st.def.pow * 0.9) * mf * share;
        if (slot.progress >= slot.need) this.finish(st, slot);
      }
      c.morale = Math.max(0, c.morale - BAL.moraleDrain * this.orderTier().morale);
    }

    // พักฟื้นกำลังใจ
    const tea = this.stations.some(s => s.def.k === 'tea');
    for (const c of this.crew) {
      if (!c.at) c.morale = Math.min(100, c.morale + (tea ? BAL.moraleRest * 1.0 + BAL.moraleRestTea * 0.5 : BAL.moraleRest));
    }

    // เปรตกัดกินระเบียบไปเรื่อย ๆ ถ้าไม่ไปปราบ
    if (this.mobs.length) {
      this.order = clamp(this.order - MOB.drain * this.mobs.length, 0, 100);
      // ลูกไฟไม่ใช่ทางเดียวที่จะปราบเปรตแล้ว (ฟาดประชิดฟรี) แต่ยังหย่อนให้อยู่
      // เพราะขว้างจากไกลสะดวกกว่ามากเวลาเปรตอยู่คนละฝั่งกับที่เรายืน
      if (this.powerOf('roar').ammo === 0 && !this.items.some(it => it.k === 'fire')) this.dropItem('fire');
    }

    // ของตกบนแผนที่เป็นระยะ (ไม่ให้เกินสามชิ้น จะได้ต้องเลือกว่าจะเดินไปเก็บอันไหนก่อน)
    if (this.tick % 18 === 0 && this.items.length < 3) {
      const need = this.hp < this.hpMax * 0.55 ? 'health'
                 : this.fuel < 18 ? 'fuel'
                 : this.karma >= 40 && Math.random() < 0.35 ? 'lotus'
                 : pick(['fire', 'fire', 'mirror', 'health', 'fuel', this.powerOf('hypno').max ? 'hypno' : 'fire']);
      this.dropItem(need);
    }

    // กรรมของท่านเองที่สูงเกินไป กัดระเบียบของโซนไปด้วย
    const kt = this.karmaTier();
    if (kt.drain) this.order = clamp(this.order - kt.drain, 0, 100);

    // ระเบียบ
    const over = Math.max(0, this.queue.length - this.queueCap());
    if (over > 0) this.order = clamp(this.order - BAL.orderDrainPerOver * over, 0, 100);
    else if (hasSala) this.order = clamp(this.order + BAL.orderGainSala, 0, 100);

    // ตะราง: ส่วนที่ขังไว้ต้องเลี้ยงข้าวทุกวาระ — ไม่งั้นมันจะเป็นของฟรีที่ไม่มีข้อเสีย
    if (this.held.length) {
      this.coin -= TARANG.feed * this.held.length;
      this.held.forEach(x => x.waited++);
      if (this.tick % 20 === 0)
        this.log(`🔒 ตะรางขังอยู่ ${this.held.length} ดวง — ค่าข้าว ${(TARANG.feed * this.held.length).toFixed(1)} เบี้ยต่อวาระ`);
    }

    // หอส่องกรรม: เติมพลังให้เองเป็นระยะ จะได้ไม่มีวันตันเพราะของหมด
    if (this.has('krajok') && this.tick % KRAJOK.every === 0) {
      const got = [];
      for (const p of this.powers) {
        if (p.ammo >= p.max) continue;
        p.ammo = Math.min(p.max, p.ammo + KRAJOK.gain);
        got.push(p.name);
      }
      if (got.length) this.log(`🪞 หอส่องกรรมส่องแสงขึ้นมา — เติม${got.join(' · ')}ให้แล้ว`, 'good');
    }

    // ค่าแรง
    if (--this.nextPay <= 0) {
      const total = this.crew.reduce((s, c) => s + c.pay, 0) + (this.guard ? GUARD.pay : 0);
      this.coin -= total;
      this.log(`💸 จ่ายค่าแรงยมทูต ${this.crew.length} คน — ${total} เบี้ยกรรม`);
      this.nextPay = BAL.payEvery;
    }

    // เหตุการณ์
    if (--this.nextEvent <= 0) {
      const ev = pick(EVENTS);
      this.log(`【${ev.title}】${ev.text}`, 'event');
      ev.apply(this);
      this.pendingEvent = ev;
      this.nextEvent = BAL.eventEvery;
    }

    // พ่อตรวจ
    if (--this.nextKpi <= 0) { this.kpi(); this.nextKpi = BAL.kpiEvery; }

    this.checkEnd();
    this.onChange();
  },

  kpi() {
    const avg = this.casesDone ? Math.round(this.scoreSum / this.casesDone) : 0;
    const pass = this.order >= 55 && avg >= 62;
    if (pass) {
      this.kpiPassed++;
      this.coin += 150;
      this.log(`📜 ตรวจการรอบที่ ${this.kpiPassed} — ผ่าน (ระเบียบ ${Math.round(this.order)} · คะแนนเฉลี่ย ${avg}) +150 เบี้ย`, 'good');
    } else {
      this.order = clamp(this.order - 10, 0, 100);
      this.log(`📜 ตรวจการ — ไม่ผ่าน (ระเบียบ ${Math.round(this.order)} · คะแนนเฉลี่ย ${avg}) ระเบียบถูกหัก 10`, 'bad');
    }
    this.pendingKpi = { pass, avg };
  },

  checkEnd() {
    // ---- ระเบียบหมด: ตักเตือนก่อนสามครั้ง ----
    // เดิมแตะศูนย์ปุ๊บจบเกมปั๊บ ผู้เล่นใหม่ไม่ทันรู้ด้วยซ้ำว่าตัวเองพลาดตรงไหน
    if (this.order <= 0 && !this.over && !this.battle
        && this.orderWarns < ORDER_WARN.times && this.tick >= (this.orderWarnAt || 0)) {
      this.orderWarns = (this.orderWarns || 0) + 1;
      this.orderWarnAt = this.tick + ORDER_WARN.gap;
      this.order = ORDER_WARN.restore;                 // ยกให้ตั้งหลักใหม่
      this.pendingOrderWarn = { n: this.orderWarns, of: ORDER_WARN.times,
                                text: ORDER_WARN.lines[this.orderWarns - 1] || ORDER_WARN.lines[0] };
      this.log(`⚠️ พญายมตักเตือนเรื่องคิวล้น (${this.orderWarns}/${ORDER_WARN.times}) — ระเบียบถูกยกให้ตั้งหลักใหม่`, 'boss');
      this.onChange();
      return;
    }

    // บารมีหมด/ระเบียบหมดครบสามคำเตือน = พ่อลงมาลงโทษเอง ไม่ใช่จอจบเกมโผล่เฉย ๆ
    // ฉากนั้นไม่มีทางชนะ (ตั้งใจ) — จบแล้วค่อยไปหน้าจอจบเกมตามเดิม
    const doomed = this.hp <= 0 ? 'hp'
                 : (this.order <= 0 && this.orderWarns >= ORDER_WARN.times) ? 'order' : null;
    if (doomed && !this.yamaDone && !this.battle) {
      this.yamaDone = true;
      this.overCause = doomed;                         // จบฉากแล้วใช้ตัวนี้เลือกตอนจบ
      this.startYamaFight();
      return;
    }
    if (doomed && this.battle) return;                 // รอฉากของพ่อจบก่อน
    if (doomed === 'order' || (this.overCause === 'order' && this.order <= 0)) this.over = {
      k: 'order', title: 'ถูกเรียกกลับ',
      text: 'คิวล้นจนวิญญาณเดินกลับขึ้นไปเองได้ พญายมเตือนแล้วสามครั้ง ครั้งที่สี่ท่านลงมาเอง — ' +
            'แล้วรับตราประจำตำแหน่งคืนไปโดยไม่พูดอะไรอีกสักคำ',
    };
    else if (this.hp <= 0) this.over = {
      k: 'hp', title: 'พ่อไม่ให้โอกาสอีกแล้ว',
      text: 'คำตัดสินที่พลาดสะสมจนพญายมไม่เหลืออะไรจะพูด ท่านเรียกนิรามารับตราคืนจากมือเจ้าต่อหน้าทุกคน โดยไม่มองหน้าเจ้าเลยสักครั้ง',
    };
    else if (this.karma >= 100) this.over = {
      k: 'karma', title: 'บาปตกที่ยมบาท',
      text: 'กรรมที่ท่านลงเกินไปทีละนิด สะสมจนเต็มบัญชีของท่านเอง เช้าวันหนึ่งชื่อของท่านไปโผล่อยู่ในคิว — สำนวนที่หนาที่สุดที่โซนนี้เคยรับ',
    };
    else if (this.coin <= -300) this.over = {
      k: 'coin', title: 'นรกล้มละลาย',
      text: 'ยมทูตไม่ได้ค่าแรงสามวาระติด ทุกคนวางเครื่องมือแล้วเดินออกไปพร้อมกัน',
    };
    // เดิมจบที่ 3 รอบ ซึ่งสั้นเกินกว่าที่ระบบเลเวล/เปรต/ของสะสมจะได้ทำงาน
    // (จำลองแล้วผู้เล่นเก่งจบเกมที่เลเวล 1.4 โดยแทบไม่ได้เลื่อนขั้นเลย)
    else if (this.kpiPassed >= BAL.kpiWin) this.over =
      this.karma < 25 ? {
        k: 'win', title: 'ทายาทบัลลังก์',
        text: 'สามรอบตรวจผ่านหมด กรรมของท่านยังใส พญายมยื่นตราประจำตำแหน่งให้แล้วพูดสั้น ๆ ว่า "ทำต่อไป"',
      } : this.karma < 60 ? {
        k: 'win2', title: 'ผู้คุมที่เก่งเกินไป',
        text: 'โซนนี้เป็นระเบียบที่สุดในนรก ตัวเลขทุกช่องสวยงาม — แต่กรรมในบัญชีของท่านหนากว่าตอนมาถึงมาก พ่อเลื่อนตำแหน่งให้ โดยไม่มองหน้า',
      } : {
        k: 'win3', title: 'ผู้พิพากษาที่มีสำนวนของตัวเอง',
        text: 'ท่านผ่านการตรวจทุกรอบ โซนนี้เดินได้เองแล้ว — คืนนั้นนิราวางแฟ้มบางเล่มหนึ่งไว้บนโต๊ะโดยไม่พูดอะไร ชื่อบนปกคือชื่อของท่าน และมันหนากว่าที่คิดไว้มาก',
      };
  },

  /** ลูกไฟจากพญายม — โดนห้าครั้งบารมีหมด */
  fireball(why) {
    this.hits++;
    this.hp -= this.hpMax / 5;
    this.fxHits.push({ t: Date.now(), x: this.player.x, y: this.player.y });
    this.log(`🔥 ลูกไฟจากบัลลังก์ — ${why} · บารมีเหลือ ${Math.max(0, Math.round(this.hp))} (โดนแล้ว ${this.hits}/5)`, 'bad');
    this.checkEnd();
  },

  checkLevel() {
    const nx = LEVELS[this.level];              // เลเวลถัดไป (index = level เพราะ level เริ่มที่ 1)
    if (!nx || this.greens < nx.green) return;
    this.level++;
    // ของที่ได้ต้องจับต้องได้ทุกขั้น — พลังที่เพิ่งปลดล็อกต้องมีกระสุนติดมือทันที
    // ไม่งั้นผู้เล่นเห็นแค่ชื่อขั้นเปลี่ยน แล้วก็ยังกดอะไรใหม่ไม่ได้อยู่ดี
    if (this.level >= 2) this.powers.forEach(p => { p.max++; });
    if (this.level >= 3) this.coin += 300;
    if (this.level >= 4) { this.hpMax = 120; this.hp = this.hpMax; this.coin += 500; }
    this.powers.forEach(p => { if (p.lv <= this.level) p.ammo = Math.max(p.ammo, p.lv === this.level ? p.max : 1); });
    if (this.level >= 5) this.powers.forEach(p => { p.ammo = p.max; });
    this.log(`🎖️ เลื่อนขั้นเป็น "${nx.name}" — ${nx.bonus}`, 'good');
    this.pendingLevel = nx;
    // สาขาที่เพิ่งเปิดให้ย้ายไปได้ — เดิมไม่มีอะไรบอกเลยว่าปลดล็อกแล้ว
    // (เจ้าของ 10 ก.ย. 2569: "ไม่แน่ใจว่าเงื่อนไขย้ายโซนคืออะไร")
    const opened = ZONES.filter(z => z.level === this.level && z.k !== this.zone);
    if (opened.length) this.pendingZoneOpen = opened;
  },

  /** พลังนี้ปลดล็อกแล้วหรือยัง — ใช้ที่เดียวทั้งเกม (เดิมเช็คจำนวนคดีกระจายอยู่สี่จุด) */
  powerLocked(p) { return this.level < (p.lv || 1); },
  /** เรียกยมทูตมาช่วยในฉากต่อสู้ได้หรือยัง */
  canCallCrew() { return this.level >= CREW_HELP_LV; },

  // ---------- โลกที่เดินได้ ----------
  /** เดินตัวละครทุกตัว เก็บของ ชนเปรต — เดินตามเวลาจริง ไม่ผูกกับวาระ */
  stepWorld(dt) {
    this.syncBlocks();                 // อาคารที่สร้างเสร็จ/ถูกเผาพัง กันทางเดินให้ตรงเสมอ
    // เดินได้เฉพาะพื้นที่เหยียบได้ — ลาวากับแม่น้ำวิญญาณกันไว้ที่ src/walk.js
    const P = this.player, SP = 0.19 * dt;
    // เซฟเก่า (หรือฉากที่วาดใหม่) อาจทำให้ยืนค้างกลางลาวา — ดันขึ้นฝั่งให้เอง
    if (!canWalk(P.x, P.y)) {
      const p = nearestWalk(P.x, P.y);
      if (p) { P.x = p[0]; P.y = p[1]; P.tx = null; P.path = null; }
    }
    // เดินตามเส้นทางที่ findPath วางไว้ — อ้อมลาวาเองได้ ไม่ไปยืนจ่อกำแพงแล้วค้าง
    if (P.path && P.path.length) {
      const w = P.path[0];
      const dx = w[0] - P.x, dy = w[1] - P.y, d = Math.hypot(dx, dy);
      if (d < 5) {
        P.path.shift();
        if (!P.path.length) { P.path = null; P.tx = null; }
      } else {
        if (!stepTo(P, dx / d * SP, dy / d * SP)) { P.path = null; P.tx = null; }
        P.face = dx < 0 ? -1 : 1;
      }
    } else if (P.tx != null) {
      P.tx = null;
    }
    P.x = clamp(P.x, 40, SCENE.w - 40);
    P.y = clamp(P.y, 60, SCENE.h - 40);

    // ยมทูตเดินเตร็ดเตร่รอบจุดประจำ แล้วพูดตามนิสัยเป็นระยะ
    for (const c of this.crew) {
      const post = c.at ? STATIONS.find(d => d.k === c.at) : null;
      let hx = post ? post.x : c.hx, hy = post ? post.y : c.hy;
      // จุดประจำบางจุดวางไว้ตั้งแต่ก่อนที่ตัวอาคารจะกันทางเดิน — ตกอยู่ใต้ชายคาพอดี
      // ปล่อยไว้ยมทูตจะยืนจมอยู่ในอาคาร มองไม่เห็นทั้งเกม (เจ้าของเจอ 10 ก.ย. 2569)
      if (!canWalk(hx, hy)) { const o = nearestWalk(hx, hy); if (o) { hx = o[0]; hy = o[1]; } }
      if (c.x == null) { c.x = hx; c.y = hy; c.face = 1; }
      if (!canWalk(c.x, c.y)) {                 // โดนอาคารที่เพิ่งสร้างทับอยู่ → ดันออกมา
        const o = nearestWalk(c.x, c.y);
        if (o) { c.x = o[0]; c.y = o[1]; c.path = null; }
      }

      // เดินตามเส้นทางเหมือนตัวเรา — เดิมเดินตรงเข้าหาจุดหมาย พอมีลาวาขวางก็ค้างอยู่ขอบไฟ
      // (เห็นชัดตอนสั่งไปประจำสถานีที่อยู่คนละฝั่งแผนที่ — ยืนนิ่งกันเป็นกอง)
      const onDuty = !!post;
      const roam = onDuty ? 46 : (c.roam ?? 140);       // ว่างงานเดินเล่นกว้าง · เข้าเวรอยู่ติดที่
      const far = Math.hypot(hx - c.x, hy - c.y) > roam * 1.6;
      const sp = (far ? 0.11 : 0.05) * dt;              // กลับเข้าที่เร็วกว่าเดินเล่น

      if (c.path && c.path.length) {
        const w = c.path[0];
        const dx = w[0] - c.x, dy = w[1] - c.y, d = Math.hypot(dx, dy);
        if (d < 5) c.path.shift();
        else {
          if (!stepTo(c, dx / d * sp, dy / d * sp)) c.path = null;
          if (Math.abs(dx) > 1) c.face = dx < 0 ? -1 : 1;
        }
      } else if (c.wait > 0) {
        c.wait -= dt;
      } else {
        // อยู่ไกลบ้าน = กลับเข้าที่ก่อน · อยู่แถวบ้านแล้ว = เดินเล่นรอบ ๆ
        const tx = far ? hx : hx + (Math.random() - 0.5) * roam * 2;
        const ty = far ? hy : hy + (Math.random() - 0.5) * roam;
        const ok = canWalk(tx, ty) ? [tx, ty] : nearestWalk(tx, ty);
        if (ok) c.path = findPath(c.x, c.y, ok[0], ok[1]);
        c.wait = far ? 200 : 700 + Math.random() * 2600;
      }
      if (!c.sayUntil || Date.now() > c.sayUntil + 9000) {
        if (Math.random() < 0.0006 * dt) {
          c.say = pick(c.says); c.sayUntil = Date.now() + 4200;
        }
      }
    }

    // ของบนพื้น — เดินทับแล้วเก็บ
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (Math.hypot(it.x - P.x, it.y - P.y) > 42) continue;
      const def = ITEMS[it.k];
      if (def.hp) this.hp = clamp(this.hp + def.hp, 0, this.hpMax);
      if (def.fuel) this.fuel += def.fuel;
      if (def.karma) this.karma = clamp(this.karma + def.karma, 0, 100);
      if (def.power) {
        const p = this.powerOf(def.power);
        p.ammo = Math.min(p.max, p.ammo + 1); p.cd = 0;
      }
      this.log(`🎁 เก็บ${def.name} — ${def.say}`, 'good');
      this.items.splice(i, 1);
    }

    // ---- นั่งร้านถอดออกเมื่อครบเวลา ----
    for (const st of this.stations) {
      if (!st.build || Date.now() < st.build) continue;
      st.build = 0;
      const extra = this.buildExtra && this.buildExtra.k === st.def.k ? this.buildExtra.text : '';
      this.log(`🏗️ สร้าง${st.def.name}เสร็จแล้ว${extra}`, 'good');
      this.syncBlocks(true);          // นั่งร้านหายแล้ว ตัวอาคารกันทางเดินทันทีในเฟรมเดียวกัน
      this.onChange();
    }

    // ---- เปรตเดินไปเผาอาคาร (9 ก.ย. 2569) ----
    // เดิมมันเดินสุ่มไปมาเฉย ๆ แล้วเกมตัดเข้าฉากต่อสู้ให้ทันทีที่โผล่
    // ตอนนี้มันมีเป้าหมายจริง: อาคารที่ใกล้ที่สุด ปล่อยไว้ก็ไหม้จนพัง
    const burnable = this.stations.filter(st => st.fire < MOB.burnMax);
    const burning = new Set();
    // ระยะจาก "ขอบอาคาร" ไม่ใช่จุดกึ่งกลาง — หลังใหญ่ ๆ อย่างหอทะเบียนกรรม
    // ยืนติดกำแพงแล้วยังห่างจุดกึ่งกลางเป็นร้อยพิกเซล มันจะยืนเฉย ๆ ไม่เผาสักที
    const nearBuilding = (st, x, y) => {
      const r = footOf(st.def);
      if (!r) return Math.hypot((st.def.bx ?? st.def.x) - x, (st.def.by ?? st.def.y) - y) <= MOB.burnReach;
      const dx = Math.max(r[0] - x, 0, x - r[2]);
      const dy = Math.max(r[1] - y, 0, y - r[3]);
      return Math.hypot(dx, dy) <= MOB.burnReach;
    };
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      // เลือกเป้าหมายใหม่เมื่อยังไม่มี หรือหลังที่หมายไว้ไหม้จนพังไปแล้ว
      let tgt = burnable.find(st => st.def.k === m.at);
      if (!tgt) {
        let bd = Infinity;
        for (const st of burnable) {
          const d = Math.hypot((st.def.bx ?? st.def.x) - m.x, (st.def.by ?? st.def.y) - m.y);
          if (d < bd) { bd = d; tgt = st; }
        }
        m.at = tgt ? tgt.def.k : null;
        m.path = null;
      }
      if (tgt && nearBuilding(tgt, m.x, m.y)) {
        m.path = null;
        burning.add(tgt.def.k);
        tgt.fire = Math.min(MOB.burnMax, tgt.fire + MOB.burnRate * dt);
        if (tgt.fire >= MOB.burnMax) this.burnDown(tgt);
      } else if (tgt) {
        // เดินตามเส้นทางเหมือนยมทูต — เดินตรงเข้าหาแล้วชนกำแพงอาคารจะค้างอยู่ตรงนั้นทั้งเกม
        if (!m.path || !m.path.length) m.path = findPath(m.x, m.y, tgt.def.x, tgt.def.y) || [];
        const w = m.path[0];
        if (w) {
          const dx = w[0] - m.x, dy = w[1] - m.y, d = Math.hypot(dx, dy) || 1;
          if (d < 6) m.path.shift();
          else if (!stepTo(m, dx / d * 0.035 * dt, dy / d * 0.035 * dt)) m.path = null;
        }
      }

      if (this.huntMob && Math.hypot(m.x - P.x, m.y - P.y) < MOB.reach) {
        this.huntMob = false;
        this.strike(i, 'ท่าน');
      }
    }
    // ไม่มีผียืนอยู่แล้ว ไฟค่อย ๆ มอดเอง
    for (const st of this.stations)
      if (st.fire > 0 && !burning.has(st.def.k)) st.fire = Math.max(0, st.fire - MOB.burnCool * dt);

    // ยักษ์ทวารบาลไล่ปราบเอง
    if (this.guard && this.mobs.length) {
      const G = this.guard, m = this.mobs[0];
      const dx = m.x - G.x, dy = m.y - G.y, d = Math.hypot(dx, dy) || 1;
      stepTo(G, dx / d * 0.075 * dt, dy / d * 0.075 * dt);
      if (d < MOB.reach) this.strike(0, GUARD.name);
    } else if (this.guard) {
      // ว่างงาน → กลับไปเฝ้า "หัวสะพานที่วิญญาณข้ามมา" (เจ้าของสั่ง 10 ก.ย. 2569)
      // เดิมยืนอยู่ท่าเรือฝั่งขวาซึ่งไม่มีอะไรผ่าน มีผีบุกก็ยังวิ่งไปจัดการเหมือนเดิม
      const G = this.guard, gp = GUARD_POST;
      stepTo(G, (gp[0] - G.x) * 0.0012 * dt, (gp[1] - G.y) * 0.0012 * dt);
    }
  },

  /** ยืนอยู่ใกล้สถานีนี้พอจะลงมือเองไหม — ใช้ระยะเดียวกับการซัดไฟเร่งทัณฑ์ */
  nearStation(st) {
    if (!st) return false;
    const d = st.def;
    return Math.hypot((d.sx ?? d.x) - this.player.x, (d.sy ?? d.y) - this.player.y) <= BAL.smiteReach * 1.5;
  },

  /** แวะเติมพลังที่สถานี — ว่างเปล่าแปลว่ากดได้ · มีข้อความแปลว่ากดไม่ได้เพราะอะไร
   *  inRoom = ยืนถึงจุดในฉากของหน้าสถานีแล้ว (นับแทนการยืนใกล้บนแผนที่ได้) */
  visitWhy(st, inRoom = false) {
    const v = st && st.def.visit;
    if (!v) return 'สถานีนี้ไม่มีอะไรให้เติม';
    if (st.build) return 'ยังก่อสร้างไม่เสร็จ';
    if (!inRoom && !this.nearStation(st)) return 'เดินเข้าไปให้ถึงจุดในฉากก่อน';
    if (st.visitCd && this.tick < st.visitCd) return `เพิ่งใช้ไป · อีก ${st.visitCd - this.tick} วาระ`;
    if (v.power) {
      const p = this.powerOf(v.power);
      if (this.powerLocked(p)) return `ยังใช้${p.name}ไม่ได้ — ต้องเลื่อนขั้นก่อน`;
      if (p.ammo >= p.max) return `${p.name}เต็มมืออยู่แล้ว`;
    }
    if (v.heal && this.hp >= this.hpMax) return 'บารมีเต็มอยู่แล้ว';
    return '';
  },

  visitStation(k, inRoom = false) {
    const st = this.stations.find(x => x.def.k === k);
    if (!st || this.visitWhy(st, inRoom)) return false;
    const v = st.def.visit;
    st.visitCd = this.tick + v.cool;
    if (v.power) {
      const p = this.powerOf(v.power);
      p.ammo = Math.min(p.max, p.ammo + 1); p.cd = 0;
      this.log(`${p.glyph} ${v.say} — ${p.name} +1 (เหลือ ${p.ammo})`, 'good');
    }
    if (v.heal) {
      this.hp = clamp(this.hp + v.heal, 0, this.hpMax);
      this.log(`❤️ ${v.say} — บารมี +${v.heal} (เหลือ ${Math.round(this.hp)})`, 'good');
    }
    this.onChange();
    return true;
  },

  /** บอก walk.js ว่าตอนนี้มีอาคารกินพื้นที่ตรงไหนบ้าง
   *  วัดจากพิกเซลของสไปรท์จริง (art.footOf) — รูปยังโหลดไม่เสร็จก็ลองใหม่รอบหน้า
   *  เรียกถี่ ๆ ได้ ทำงานจริงเฉพาะตอนรายการสถานีเปลี่ยน */
  syncBlocks(force = false) {
    const sig = this.stations.map(st => (st.build ? '~' : '') + st.def.k).join(',');
    if (!force && sig === this.blockSig) return;
    const rects = [], holes = [];
    let waiting = false;
    const R = 16;
    for (const st of this.stations) {
      const r = st.build ? null : footOf(st.def);
      // ช่องยืนของผู้คุมต้อง "ทะลุออกได้" ด้วย ไม่ใช่เป็นหลุมกลางอาคาร
      // (เจ้าของเจอ 10 ก.ย. 2569: รีเฟรชแล้วตัวละครไปโผล่ในศาลาน้ำชา แล้วเดินออกไม่ได้เลย)
      // เปิดเป็นทางเดินแคบ ๆ จากจุดยืนลงมาจนพ้นฐานอาคาร
      const bottom = Math.max(st.def.y + R, r ? r[3] + 26 : st.def.y + R);
      holes.push([st.def.x - R, st.def.y - R, st.def.x + R, bottom]);
      if (st.build) continue;                     // ยังเป็นนั่งร้าน เดินผ่านได้อยู่
      if (r) rects.push(r); else waiting = true;
    }
    setBlocks(rects, holes);
    this.blockSig = waiting ? null : sig;         // ยังมีรูปไม่มา — ให้ลองใหม่รอบหน้า
  },

  /** อาคารไหม้จนพัง — ดวงที่กำลังรับทัณฑ์อยู่หลุดกลับเข้าคิว สร้างใหม่ได้จากแท็บก่อสร้าง */
  burnDown(st) {
    const i = this.stations.indexOf(st);
    if (i < 0) return;
    for (const slot of st.slots) { slot.soul.beaten = false; this.queue.push(slot.soul); }
    const c = this.crewOf(st.crewK);
    if (c) { c.at = null; c.path = null; }
    this.stations.splice(i, 1);
    this.order = clamp(this.order - 8, 0, 100);
    this.log(`🔥 ${st.def.name}ถูกเผาจนพังทั้งหลัง — ระเบียบตก 8 · ต้องสร้างใหม่`, 'bad');
    this.onChange();
  },

  /** สั่งเดินไปที่จุดหนึ่ง — วางเส้นทางอ้อมลาวา/แม่น้ำให้เอง */
  walkTo(x, y, hunt = false) {
    if (!hunt) this.huntMob = false;
    const P = this.player;
    const t = canWalk(x, y) ? [x, y] : nearestWalk(x, y);
    if (!t) return false;
    const path = findPath(P.x, P.y, t[0], t[1]);
    if (!path || !path.length) return false;
    P.tx = t[0]; P.ty = t[1]; P.path = path;
    return true;
  },

  /** เปรตที่อยู่ใกล้ตัวเราที่สุด */
  nearestMob() {
    const P = this.player;
    let bi = -1, bd = Infinity;
    this.mobs.forEach((m, i) => {
      const d = Math.hypot(m.x - P.x, m.y - P.y);
      if (d < bd) { bd = d; bi = i; }
    });
    return bi < 0 ? null : { i: bi, m: this.mobs[bi], d: bd };
  },

  /** สถานีที่กำลังลงทัณฑ์และเรายืนอยู่ใกล้พอจะลงมือเอง */
  stationInReach() {
    const P = this.player;
    let best = null, bd = BAL.smiteReach;
    for (const st of this.stations) {
      if (!st.slots.length || st.build) continue;
      const d = Math.hypot((st.def.sx ?? st.def.x) - P.x, (st.def.sy ?? st.def.y) - P.y);
      if (d < bd) { bd = d; best = st; }
    }
    return best;
  },

  /** ปุ่มฟาด (และปุ่มเว้นวรรค) — ทำอะไรขึ้นกับว่ายืนอยู่ตรงไหน
   *  เปรตประชิด → ฟาดเปรต · ยืนที่สถานีที่กำลังลงทัณฑ์ → ซัดไฟเร่งทัณฑ์ · ไกล → เดินไปหาเปรต */
  attack() {
    const n = this.nearestMob();
    if (n && n.d <= MOB.reach) return this.strike(n.i, 'ท่าน');       // ประชิด = ฟรี
    const st = this.stationInReach();
    if (st) return this.smite(st);
    if (n) {
      // ไกลเกินมือเอื้อม แต่ยังอยู่ในระยะขว้าง และมีลูกไฟ → ขว้างเลย ไม่ต้องเดิน
      if (n.d <= MOB.throw && this.powerOf('roar').ammo > 0) return this.strike(n.i, 'ท่าน', true);
      if (this.walkTo(n.m.x, n.m.y, true)) {
        this.huntMob = true;                 // ถึงตัวแล้วค่อยฟาดให้เอง (ดู stepWorld)
        this.log('เดินเข้าไปหาเปรต — ถึงตัวแล้วจะฟาดให้เอง', 'act');
        return true;
      }
      this.log('เปรตตนนั้นอยู่ฝั่งที่เดินไปไม่ถึง — รอให้มันเดินเข้ามาก่อน', 'bad');
      return false;
    }
    this.log('ไม่มีอะไรให้ลงมือตรงนี้ — ไปยืนที่สถานีที่กำลังลงทัณฑ์แล้วกดใหม่', 'event');
    return false;
  },

  /** ซัดไฟใส่วิญญาณที่กำลังรับทัณฑ์ — เร่งให้จบเร็วขึ้น แต่ลงมือเองก็เป็นกรรมของเรา
   *  (แกนของเกมคือ "ทัณฑ์ที่เกินกรรมมันมาอยู่ที่ผู้ตัดสิน" — ปุ่มนี้ต้องมีราคาเสมอ) */
  smite(st) {
    // ไม่กินลูกไฟแล้วตั้งแต่ 7 ก.ย. 2569 — เจ้าของเจอสภาพ "ลูกไฟหมด บนแผนที่ก็ไม่มีให้เก็บ
    // แล้วลงทัณฑ์เองไม่ได้เลย" ซึ่งเป็นทางตัน ไม่ใช่ความยาก
    // ลูกไฟเหลือไว้ใช้กับเปรตกับตวาดข่มขู่เท่านั้น · ราคาของการลงมือเองคือ "กรรมท่าน" อยู่แล้ว
    if (this.smiteAt && Date.now() - this.smiteAt < 420) return false;   // กันรัวเกินไป
    const slot = this.stFront(st);
    if (!slot) return false;
    this.smiteAt = Date.now();

    const d = st.def, sx = d.sx ?? d.x, sy = d.sy ?? d.y;
    slot.progress += BAL.smiteGain;
    this.swingUntil = Date.now() + 500;   // ท่าฟาดค้างครึ่งวินาที (เจ้าของเคาะเอง 10 ก.ย. 2569)
    this.player.face = sx < this.player.x ? -1 : 1;
    this.fxHits.push({ t: Date.now(), x: sx, y: sy });

    const c = this.crewOf(st.crewK);
    const k = Math.round(BAL.smiteKarma * (c && c.metta >= 8 ? 0.5 : 1) * 10) / 10;
    this.karma = clamp(this.karma + k, 0, 100);
    this.log(`🔥 ท่านซัดไฟใส่${slot.soul.who}เอง — ทัณฑ์เดินเร็วขึ้น · กรรมท่าน +${k}`, 'act');
    if (slot.progress >= slot.need) this.finish(st, slot);
    this.onChange();
    return true;
  },

  /** ฟาดเปรตตนที่ i — คืน true เมื่อฟาดออกจริง */
  /** ฟาดเปรตตนที่ i — ranged = ขว้างลูกไฟจากไกล (กินลูกไฟ) · ไม่ใส่ = ฟาดประชิด ฟรี */
  strike(i, by, ranged = false) {
    const m = this.mobs[i];
    if (!m) return false;
    if (m.cool && Date.now() < m.cool) return false;
    if (ranged && by === 'ท่าน') {
      const fire = this.powerOf('roar');
      if (fire.ammo <= 0) return false;
      fire.ammo--;
      this.log('🔥 ท่านขว้างลูกไฟใส่เปรตจากระยะไกล', 'act');
    }
    m.hp--; m.cool = Date.now() + 600;
    if (by === 'ท่าน') {
      this.swingUntil = Date.now() + 500;   // ท่าฟาดค้างครึ่งวินาที (เจ้าของเคาะเอง 10 ก.ย. 2569)                   // ให้ scene.js สลับไปท่าฟาด
      this.player.face = m.x < this.player.x ? -1 : 1;      // หันหน้าไปทางที่ขว้าง
    }
    this.fxHits.push({ t: Date.now(), x: m.x, y: m.y });
    if (m.hp > 0) { this.log(`⚔️ ${by}ฟาด${MOB.kinds[m.kind ?? 0].name}เข้าเต็ม ๆ — มันยังไม่ล้ม`, 'act'); return true; }
    this.mobs.splice(i, 1);
    this.coin += MOB.bounty;
    this.order = clamp(this.order + 3, 0, 100);
    this.log(`💥 ${by}ปราบ${MOB.kinds[m.kind ?? 0].name}ได้หนึ่งตน +${MOB.bounty} เบี้ยกรรม · ระเบียบ +3`, 'good');
    return true;
  },

  dropItem(k) {
    const spot = pick(ITEM_SPOTS);
    if (this.items.some(it => it.x === spot[0] && it.y === spot[1])) return;
    this.items.push({ k, x: spot[0], y: spot[1] });
  },

  // ---------- Phase 3 · ฉากต่อสู้ ----------
  // "วิญญาณที่โทษหนัก ๆ ร้ายกาจ จะขัดขืน ต้องสู้" — เจ้าของสั่ง 7 ก.ย. 2569
  // ตัวเกมยังเป็นเกมบริหารเหมือนเดิม ฉากต่อสู้เป็น "ด่านกั้น" ก่อนออกหมาย ไม่ใช่ระบบแยก
  // แพ้ = เขาหลุดกลับเข้าคิว ท่านเสียบารมี · ชนะ = ออกหมายได้ตามปกติ

  /** คดีนี้ต้องสู้ก่อนไหม — เฉพาะดวงที่สำนวนระบุว่าขัดขืน และยังไม่เคยถูกปราบ
   *  คนบริสุทธิ์กับเทวดาไม่มีทางเข้าเงื่อนไขนี้ (เขาไม่ขัดขืนอะไรทั้งนั้น) */
  needBattle(soul) {
    return !!soul && !!soul.resist && !soul.beaten && !soul.pure;
  },

  startBattle(soul) {
    if (this.battle) return this.battle;
    const hp = Math.max(46, Math.round((soul.deserved || 3) * BATTLE.hpPerLv));
    this.fights++;
    this.battle = {
      kind: 'soul', soulId: soul.id, sex: soul.sex || 'm',
      // ชื่อสำนวนเป็นคำบรรยายลักษณะแล้ว (ไม่มีชื่อ-นามสกุลจริง 10 ก.ย. 2569)
      // บางเรื่องจึงซ้ำกับ who เกือบทั้งบรรทัด — ซ้ำเมื่อไหร่ไม่ต้องโชว์บรรทัดล่าง
      who: soul.name || soul.who, sub: sameLabel(soul.name, soul.who) ? '' : soul.who, sp: soul.sp || 7,
      foeHp: hp, foeMax: hp,
      youHp: Math.max(24, Math.round(this.hp)), youMax: this.hpMax,
      stun: 0, turn: 1, over: null,
      log: [],
      talk: `"ท่านจะลากข้าไปได้ก็ต่อเมื่อข้าล้มเท่านั้น"`,   // ช่องข้อความโชว์แค่บทพูด
      dmg: null,                                            // เลขความเสียหายรอบล่าสุด {foe,you}
    };
    this.onChange();       // เรื่องพักเกมเป็นของ pauseForDlg() ใน ui.js ที่เดียว
    return this.battle;
  },

  /** ฉากต่อสู้กับเปรตที่ขึ้นมาก่อกวน (8 ก.ย. 2569)
   *  เจ้าของขอให้ "ผีเข้ามาบุก" เปิดหน้าต่อสู้ด้วย ไม่ใช่แค่เดินไปฟาดบนแผนที่
   *  ฟาดบนแผนที่ยังทำได้เหมือนเดิม — หน้านี้คือทางที่ได้รางวัลมากกว่าแต่เสี่ยงกว่า */
  startMobBattle(i) {
    if (this.battle) return this.battle;
    const m = this.mobs[i];
    if (!m) return null;
    const kind = MOB.kinds[m.kind ?? 0] || MOB;
    this.fights++;
    this.battle = {
      kind: 'mob', mobId: m.id ?? i, mobIndex: i,
      who: kind.name, sub: 'ขึ้นมาจากรอยแยก', sp: kind.img,
      foeHp: MOB.fightHp, foeMax: MOB.fightHp,
      youHp: Math.max(20, Math.round(this.hp)), youMax: this.hpMax,
      stun: 0, turn: 1, over: null,
      log: [],
      talk: `${kind.name}กระโจนเข้าใส่ ${kind.line || ''}`.trim(),
      dmg: null,
    };
    this.onChange();       // เรื่องพักเกมเป็นของ pauseForDlg() ใน ui.js ที่เดียว
    return this.battle;
  },

  /** เปรตที่อยู่ในระยะเอื้อมถึง — คืน index หรือ -1 */
  mobInReach() {
    const n = this.nearestMob();
    return n && n.d <= MOB.reach ? n.i : -1;
  },

  /** ฉากที่ไม่มีทางชนะ — บารมีหมดแล้วพ่อลงมาเอง (แทนหน้าจอจบเกมแบบเดิม) */
  startYamaFight() {
    if (this.battle) return this.battle;
    this.battle = {
      kind: 'yama', who: 'พญายม', sub: 'ผู้เป็นพ่อของท่าน', sp: 'hero-boss',
      foeHp: YAMA_FIGHT.hp, foeMax: YAMA_FIGHT.hp,
      youHp: 1, youMax: this.hpMax, stun: 0, turn: 1, over: null,
      log: [], talk: YAMA_FIGHT.line1, dmg: null,
    };
    this.onChange();       // เรื่องพักเกมเป็นของ pauseForDlg() ใน ui.js ที่เดียว
    return this.battle;
  },

  /** พ่อลงมาตบเองเพราะตัดสินพลาดติดกันสามสำนวน — ไม่ใช่จบเกม
   *  ตบทีเดียวเหลือบารมี DAD.hpLeft แล้วเกมเดินต่อ (เจ้าของสั่ง 9 ก.ย. 2569) */
  startDadFight() {
    if (this.battle) return this.battle;
    this.dadFight = false;
    this.battle = {
      kind: 'dad', who: 'พญายม', sub: 'ผู้เป็นพ่อของท่าน', sp: 'hero-boss',
      foeHp: YAMA_FIGHT.hp, foeMax: YAMA_FIGHT.hp,
      youHp: Math.max(1, Math.round(this.hp)), youMax: this.hpMax,
      stun: 0, turn: 1, over: null, log: [], talk: DAD.line1, dmg: null,
    };
    this.onChange();
    return this.battle;
  },

  /** เรียกยมทูตในสังกัดมาช่วยหนึ่งที — เสียกำลังใจของเขา แล้วต้องรอรอบ */
  /** ยมทูตที่เรียกมาช่วยในฉากต่อสู้ได้ — คืนทุกคนเสมอ (ยังไม่ปลดล็อกก็โชว์ปุ่มไว้ให้เห็น
   *  ว่ามีของแบบนี้อยู่ · เจ้าของ 10 ก.ย. 2569 นึกว่าไม่มีปุ่มนี้ในฉากสู้กับวิญญาณ) */
  crewHelpers() {
    return this.crew.filter(c => !c.reader && !c.self);
  },
  crewHelpWhy(c) {
    if (!this.canCallCrew()) return `ต้องเป็น${LEVELS[CREW_HELP_LV - 1].name}ก่อน`;
    if (c.helpCd && this.tick < c.helpCd) return `เพิ่งช่วยไป · อีก ${c.helpCd - this.tick} วาระ`;
    if (c.morale < BATTLE.crewMin) return 'กำลังใจไม่พอ';
    return '';
  },

  /** หนึ่งตาในฉากต่อสู้ — what = 'atk' | 'fire' | 'crew:<k>' | ชื่อของใน BATTLE.items
   *  คืน false ถ้ากดไม่ได้ (ของไม่พอ / จบไปแล้ว) */
  battleAct(what) {
    const B = this.battle;
    if (!B || B.over) return false;
    const roll = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
    // log เก็บไว้ในเครื่องเฉย ๆ ไม่ได้เอาไปโชว์แล้ว — ช่องข้อความโชว์ B.talk อย่างเดียว
    // (เจ้าของสั่ง 8 ก.ย. 2569: "เหลือแค่คำพูดของวิญญาณก็พอ log ตัดออก")
    const say = t => { B.log.push(t); if (B.log.length > 12) B.log.shift(); };
    const TALK = B.kind === 'mob' ? MOB_TALK : FOE_TALK;
    const talk = k => { const p = TALK[k]; if (p && p.length) B.talk = voice(pick(p), B.sex || 'm'); };
    B.dmg = { foe: 0, you: 0 };

    // ---- ฝั่งพญายม: ทำอะไรก็จบเหมือนกัน ----
    // 'yama' = บารมีหมดแล้วพ่อมาปิดเกม · 'dad' = มาตบเตือนแล้วเกมเดินต่อ
    if (B.kind === 'yama' || B.kind === 'dad') {
      const dad = B.kind === 'dad';
      say(pick(YAMA_FIGHT.taunt));
      B.talk = `${pick(YAMA_FIGHT.taunt)}\n${dad ? DAD.line2 : YAMA_FIGHT.line2}`;
      B.youHp = dad ? Math.max(1, Math.round(B.youMax * DAD.hpLeft)) : 0;
      B.over = 'lose';
      B.dmg = { foe: 0, you: 999 };
      say(dad ? DAD.line3 : YAMA_FIGHT.line3);
      this.onChange();
      return true;
    }

    let dmg = 0, stunFoe = 0;
    if (what === 'atk') {
      dmg = roll(BATTLE.atk);
      const crit = Math.random() < BATTLE.crit;
      if (crit) dmg = Math.round(dmg * 1.7);
      say(`⚔️ ท่านฟาดเข้าเต็มแรง — ${dmg} หน่วย${crit ? ' (เข้าเต็ม ๆ)' : ''}`);

    } else if (typeof what === 'string' && what.startsWith('crew:')) {
      const c = this.crew.find(x => x.k === what.slice(5));
      if (!c || this.crewHelpWhy(c)) return false;
      c.helpCd = this.tick + BATTLE.crewCd;
      c.morale = Math.max(0, c.morale - BATTLE.crewMorale);
      B.helper = { k: c.k, name: c.name, at: Date.now() };   // ui เอาไปวาดท่าพุ่งเข้าชน
      dmg = roll([6 + c.raeng, 12 + c.raeng * 2]);
      say(`${c.glyph} ${c.name}กระโจนเข้ามาช่วย — ${dmg} หน่วย (กำลังใจ −${BATTLE.crewMorale})`);
      B.talk = `${c.name}: "ท่านถอยไปก่อน เดี๋ยวผมจัดการเอง"`;

    } else if (what === 'fire') {
      const p = this.powerOf('roar');
      if (!p || p.ammo <= 0) return false;
      p.ammo--;
      dmg = roll(BATTLE.fireDmg);
      say(`🔥 ลูกไฟพุ่งเข้ากลางตัว — ${dmg} หน่วย (เหลือลูกไฟ ${p.ammo})`);

    } else {
      const it = BATTLE.items.find(x => x.k === what);
      if (!it) return false;
      if (it.coin != null) {
        if (this.coin < it.coin) return false;
        this.coin -= it.coin;
      }
      if (it.power) {
        const p = this.powerOf(it.power);
        if (!p || p.ammo <= 0) return false;
        p.ammo--;
      }
      if (it.karma) this.karma = clamp(this.karma + it.karma, 0, 100);
      say(`${it.glyph} ${it.say}`);
      if (it.heal) { B.youHp = Math.min(B.youMax, B.youHp + it.heal); say(`   ↳ บารมีฟื้น ${it.heal}`); }
      if (it.dmg)  { dmg = roll(it.dmg); say(`   ↳ ${dmg} หน่วย`); }
      if (it.stun) stunFoe = it.stun;
    }

    B.foeHp = Math.max(0, B.foeHp - dmg);
    B.dmg.foe = dmg;
    if (stunFoe) B.stun += stunFoe;
    if (dmg > 0) talk(dmg >= 26 ? 'crit' : B.foeHp <= B.foeMax * 0.3 ? 'low' : 'hurt');
    // ภาพนิ่งของ "ตอนจบตาเรา แต่เขายังไม่สวน" — ui เอาไปเล่นเป็นจังหวะแรก
    // เดิมเลือดสองฝั่งลดพร้อมกันในเฟรมเดียว เจ้าของบอกว่าดูแปลก (8 ก.ย. 2569)
    B.mid = { foeHp: B.foeHp, youHp: B.youHp, talk: B.talk };

    if (B.foeHp <= 0) {
      B.over = 'win';
      if (B.kind === 'mob') {
        const gain = Math.round(MOB.bounty * MOB.fightWin);
        this.coin += gain;
        this.order = clamp(this.order + 2, 0, 100);
        say(`${B.who}สลายเป็นควันไป — +${gain} เบี้ยกรรม · ระเบียบ +2`);
      } else {
        this.coin += BATTLE.winCoin;
        const soul = this.queue.find(x => x.id === B.soulId);
        if (soul) soul.beaten = true;
        say(`เขาทรุดลงกับพื้นแล้วไม่ลุกอีก — +${BATTLE.winCoin} เบี้ยกรรม · ออกหมายได้แล้ว`);
      }
      talk('lose');
      this.hp = clamp(B.youHp, 1, this.hpMax);
      this.onChange();
      return true;
    }

    // ---- ตาของเขา ----
    if (B.stun > 0) { B.stun--; say('เขายืนค้างอยู่กลางท่า ขยับไม่ได้ทั้งตา'); }
    else {
      const d = roll(B.kind === 'mob' ? MOB.fightAtk : BATTLE.foeAtk);
      B.youHp = Math.max(0, B.youHp - d);
      B.dmg.you = d;
      say(`เขาสวนกลับ — บารมีท่านหาย ${d}`);
      if (!B.over) talk('hit');
    }
    B.turn++;

    if (B.youHp <= 0) {
      B.over = 'lose';
      talk('win');
      if (B.kind === 'mob') {
        this.hp = Math.max(1, this.hp - MOB.fightLose);
        say(`ท่านถอยออกมา — ${B.who}ยังอยู่ในโซน · บารมีหาย ${MOB.fightLose}`);
      } else {
        this.hp = Math.max(1, this.hp - BATTLE.loseHp);
        this.order = clamp(this.order - 6, 0, 100);
        say(`ท่านคุกเข่าลง — เขาหลุดกลับเข้าคิว · บารมีหาย ${BATTLE.loseHp} · ระเบียบตก 6`);
      }
    }
    this.onChange();
    return true;
  },

  /** ปิดฉากต่อสู้ — คืนค่าบารมีตามที่เหลือจริง แล้วปล่อยเกมเดินต่อ */
  endBattle() {
    const B = this.battle;
    if (!B) return null;
    this.battle = null;
    if (B.kind === 'dad') {
      this.hp = clamp(B.youHp, 1, this.hpMax);
      this.log(`👹 พญายมตบทีเดียว — บารมีเหลือ ${Math.round(this.hp)} · เริ่มนับคำตัดสินแดงใหม่`, 'boss');
      this.checkEnd(); this.onChange(); return B;
    }
    if (B.kind === 'yama') { this.checkEnd(); this.onChange(); return B; }
    if (B.over === 'win') this.hp = clamp(B.youHp, 1, this.hpMax);
    if (B.kind === 'mob') {
      if (B.over === 'win') {
        const i = this.mobs.findIndex(m => (m.id ?? -1) === B.mobId);
        if (i >= 0) this.mobs.splice(i, 1);
        else if (this.mobs[B.mobIndex]) this.mobs.splice(B.mobIndex, 1);
        this.log(`⚔️ ปราบ${B.who}ลงได้`, 'good');
      } else {
        this.log(`⚔️ ${B.who}ยังอยู่ — ปล่อยไว้ระเบียบจะตกไปเรื่อย ๆ`, 'bad');
      }
      this.checkEnd(); this.onChange(); return B;
    }
    this.log(B.over === 'win'
      ? `⚔️ ปราบ${B.who}ลงได้ — ลากเข้าสถานีได้แล้ว`
      : `⚔️ ${B.who}สลัดหลุดไปได้ — กลับเข้าคิวไปยืนรออีกครั้ง`, B.over === 'win' ? 'good' : 'bad');
    this.checkEnd();
    this.onChange();
    return B;
  },

  // ---------- Phase 3 · ย้ายโซน ----------
  zoneDef() { return ZONES.find(z => z.k === this.zone) || ZONES[0]; },

  /** โซนที่ย้ายไปได้ตอนนี้ — ปลดล็อกตามเลเวลของยมบาท */
  zonesOpen() { return ZONES.filter(z => this.level >= z.level && z.k !== this.zone); },

  /** ย้ายโซน — คนกับของติดตัวไป แต่ "สถานีต้องสร้างใหม่ทั้งโซน"
   *  ถ้ายกสถานีไปด้วย ด่าน 2 จะไม่มีอะไรให้ทำเลยนอกจากกดเดินวาระ */
  moveZone(k) {
    const z = ZONES.find(x => x.k === k);
    if (!z || this.level < z.level || z.k === this.zone) return false;

    // เก็บสาขาเดิมไว้ทั้งกล่อง แล้วหยิบกลับมาตอนย้ายกลับ (เจ้าของสั่ง 10 ก.ย. 2569)
    // เดิมย้ายกลับมาแล้วสถานีทุกหลังหายหมด เหมือนเริ่มสาขาใหม่ทุกครั้ง
    this.zoneSave = this.zoneSave || {};
    this.zoneSave[this.zone] = {
      stations: this.stations.map(st => ({
        k: st.def.k, crewK: st.crewK, intensity: st.intensity, fire: st.fire,
        visitCd: st.visitCd || 0, build: 0, slots: st.slots,
      })),
      queue: this.queue, held: this.held, items: this.items,
    };

    const back = this.zoneSave[k];
    this.zone = k;
    this.mobs = [];
    if (back) {                              // เคยคุมสาขานี้มาก่อน — ของยังอยู่ครบ
      this.stations = back.stations.map(sv => {
        const st = mkStation(sv.k);
        if (!st.def) return null;
        Object.assign(st, { crewK: sv.crewK, intensity: sv.intensity ?? 3, fire: sv.fire || 0,
                            visitCd: sv.visitCd || 0, build: 0, slots: sv.slots || [] });
        return st;
      }).filter(Boolean);
      this.queue = back.queue || []; this.held = back.held || []; this.items = back.items || [];
    } else {
      this.queue = []; this.items = []; this.held = [];
      this.stations = [mkStation('sala')];
      this.coin += z.coin;                   // งบตั้งต้นให้ครั้งแรกที่มาสาขานี้เท่านั้น
    }
    this.crew.forEach(c => { c.at = null; c.path = null; });
    this.syncBlocks(true);
    this.log(`🗺️ ${back ? 'กลับมาที่' : 'ย้ายมา'}${z.name} — ${z.sub}`
             + (back ? ' · ของที่ทิ้งไว้ยังอยู่ครบ' : ` · งบตั้งต้น +${z.coin} เบี้ยกรรม`), 'event');
    this.pendingZone = { ...z, back: !!back };
    if (!this.queue.length) this.spawnSoul();
    this.onChange();
    return true;
  },

  spawnMob() {
    const side = Math.random() < 0.5 ? 130 : SCENE.w - 130;
    const y = 200 + Math.random() * 300;
    // ต้องโผล่บนพื้นที่เดินถึง ไม่งั้นท่านเดินไปฟาดไม่ได้ ระเบียบก็ตกไปเรื่อย ๆ
    const p = nearestWalk(side, y) || [side, y];
    // แต่ละโซนมีผีคนละชุด — ไทยครบทุกพันธุ์ · โซนอื่นเหลือพันธุ์กลางที่ใช้รูปเดิมได้
    const pool = (this.zoneDef().mobs || []).filter(i => MOB.kinds[i]);
    const kind = pool.length ? pick(pool) : Math.floor(Math.random() * MOB.kinds.length);
    const mob = { id: SEQ++, x: p[0], y: p[1], hp: MOB.hp, kind };
    this.mobs.push(mob);
    // ไม่เด้งเข้าฉากต่อสู้เองแล้ว (9 ก.ย. 2569) — มันจะเดินไปเผาอาคารแทน
    // ผู้เล่นเลือกเองว่าจะทิ้งไว้หรือเดินไปหยุด (ปุ่มต่อสู้ขึ้นตอนเข้าไปใกล้)
    // ทิ้งลูกไฟให้ด้วยหนึ่งลูกเสมอ — มีเปรตแต่ไม่มีอะไรฟาดคือทางตัน ไม่ใช่ความยาก
    if (!this.items.some(it => it.k === 'fire')) this.dropItem('fire');
    this.log(`👹 ${MOB.kinds[kind].name}ขึ้นมาจากรอยแยก — มันจะเดินไปเผาอาคาร ถ้าไม่ไปหยุด`, 'event');
    this.onChange();          // ให้ ui เปิดหน้าต่อสู้ได้ทันที ไม่ต้องรอวาระถัดไป
  },

  hireGuard() {
    if (this.guard || this.coin < GUARD.hire) return false;
    this.coin -= GUARD.hire;
    this.guard = { x: GUARD_POST[0], y: GUARD_POST[1] };
    this.log(`🛡️ จ้าง${GUARD.name}แล้ว ${GUARD.line}`, 'good');
    return true;
  },

  buy(kind, n = 1) {
    if (kind === 'fuel') {
      const cost = BAL.fuelPrice * n * 10;
      if (this.coin < cost) return false;
      this.coin -= cost; this.fuel += n * 10;
      this.log(`ซื้อฟืน ${n * 10} ดุ้น — ${cost} เบี้ยกรรม`);
      return true;
    }
    // บูชาดอกบัวที่ศาลาน้ำชา — ทางลดกรรมที่ซื้อได้ แต่ต้องมีศาลาก่อน และไม่ถูก
    if (kind === 'lotus') {
      if (!this.stations.some(st => st.def.k === 'tea')) return false;
      if (this.karma <= 0 || this.coin < KARMA_RELIEF.lotusCost) return false;
      this.coin -= KARMA_RELIEF.lotusCost;
      const cut = Math.min(this.karma, KARMA_RELIEF.lotusCut);
      this.karma = Math.round((this.karma - cut) * 10) / 10;
      this.log(`🪷 บูชาดอกบัวที่ศาลาน้ำชา — กรรมท่าน −${cut} (เหลือ ${this.karma.toFixed(1)})`, 'good');
      return true;
    }
    return false;
  },

  build(k) {
    const def = STATIONS.find(s => s.k === k);
    if (!def || this.coin < def.cost) return false;
    if (this.stations.some(s => s.def.k === k)) return false;
    const before = this.activeTags();
    this.coin -= def.cost;
    this.stations.push(mkStation(k, Date.now() + BUILD_TIME));
    const opened = def.tags.filter(t => !before.includes(t)).map(t => SINS[t].name);
    const extra = k === 'tarang' ? ` — คิวรับได้ถึง ${this.queueCap()} ดวงแล้วระเบียบถึงจะเริ่มตก`
                : k === 'krajok' ? ` — จะเติมพลังให้เองทุก ${KRAJOK.every} วาระ`
                : opened.length  ? ` — ต่อจากนี้จะมีสำนวน "${opened.join(' · ')}" ส่งเข้าคิวด้วย` : '';
    this.buildExtra = { k, text: extra };       // เก็บไว้พูดตอนนั่งร้านถอดออกจริง
    this.log(`🏗️ ลงเสาเข็ม${def.name} — กำลังก่อสร้าง`, 'act');
    return true;
  },

  hire(k) {
    const def = CREW.find(c => c.k === k);
    if (!def || this.crew.some(c => c.k === k) || this.coin < def.hire) return false;
    this.coin -= def.hire;
    this.crew.push(mkCrew(def));
    this.log(`🤝 ${def.name} เข้าประจำการ ${def.line}`, 'good');
    return true;
  },
};

/** ---------- เซฟลงเครื่อง ----------
 *  เก็บเฉพาะ "สิ่งที่เปลี่ยนได้" ไม่เก็บค่านิยามจาก data.js
 *  ตอนโหลดจึงเอาค่านิยามล่าสุดมาประกอบใหม่ — แก้สมดุลใน data.js แล้วเซฟเก่ายังใช้ได้ */
// v2 ตั้งแต่ 7 ก.ย. 2569 — กติกาเปลี่ยนเยอะ (เงินตั้งต้น ผู้คุมตั้งต้น สำนวนตามสถานี)
// เซฟเก่าเอามาต่อแล้วจะได้เกมที่ครึ่ง ๆ กลาง ๆ ปล่อยให้เริ่มใหม่ดีกว่า
//
// 9 ก.ย. 2569: โครงสถานีเปลี่ยนเป็น slots (รับได้ 3 ดวง) เนื้อในเลยเป็น v3 แล้ว
// แต่ **ใช้ชื่อช่องเดิม** ตั้งใจ — restore() ยกเซฟ v2 ขึ้นเป็น v3 ให้เอง
// เจ้าของกำลังเล่นค้างอยู่ ไม่ควรล้างความคืบหน้าเพราะเราเปลี่ยนโครงข้างใน
const SAVE_KEY = 'avegee.save.v2';

API.snapshot = function () {
  return {
    v: 3, at: Date.now(),
    tick: this.tick, coin: this.coin, fuel: this.fuel, order: this.order,
    karma: this.karma, hp: this.hp, hpMax: this.hpMax, hits: this.hits,
    star5: this.star5, level: this.level, casesDone: this.casesDone, scoreSum: this.scoreSum,
    greens: this.greens, reds: this.reds,
    kpiPassed: this.kpiPassed, nextArrive: this.nextArrive, nextEvent: this.nextEvent,
    nextPay: this.nextPay, nextKpi: this.nextKpi,
    seq: SEQ,
    powers: this.powers.map(p => ({ k: p.k, cd: p.cd, ammo: p.ammo, max: p.max })),
    crew: this.crew.map(c => ({ k: c.k, morale: c.morale, at: c.at, x: c.x, y: c.y })),
    stations: this.stations.map(st => ({
      k: st.def.k, crewK: st.crewK, intensity: st.intensity, fire: st.fire, visitCd: st.visitCd || 0,
      build: st.build ? Math.max(0, st.build - Date.now()) : 0,   // เก็บเป็น "อีกกี่ ms" ไม่ใช่เวลาจริง
      slots: st.slots,
    })),
    queue: this.queue, held: this.held, items: this.items, mobs: this.mobs,
    guard: this.guard, player: this.player, closed: this.closed, taught: this.taught,
    ledger: this.ledger, returning: this.returning, returned: this.returned,
    orderWarns: this.orderWarns || 0, orderWarnAt: this.orderWarnAt || 0,
    zone: this.zone, zoneSave: this.zoneSave || {},
    usedCases: this.usedCases, fights: this.fights, yamaDone: !!this.yamaDone,
    spawns: this.spawns,
    logs: this.logs.slice(0, 40),
  };
};

API.save = function () {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.snapshot())); return true; }
  catch { return false; }
};

API.restore = function (d) {
  if (!d || (d.v !== 2 && d.v !== 3)) return false;
  const keep = ['tick','coin','fuel','order','karma','hp','hpMax','hits','star5','level',
                'greens','reds',
                'casesDone','scoreSum','kpiPassed','nextArrive','nextEvent','nextPay','nextKpi',
                'orderWarns','orderWarnAt'];
  keep.forEach(k => { if (d[k] != null) this[k] = d[k]; });
  SEQ = d.seq || SEQ;

  this.powers = POWERS.map(p => {
    const sv = (d.powers || []).find(x => x.k === p.k) || {};
    return { ...p, cd: sv.cd || 0, ammo: sv.ammo ?? 0, max: sv.max ?? 2 };
  });
  // เซฟ v2 ไม่มีตัวนับเขียว/แดง — ประมาณจากคะแนนเฉลี่ยที่บันทึกไว้ ดีกว่าเริ่มนับศูนย์
  if (d.v === 2) { this.greens = Math.floor((d.star5 || 0) * 1.5); this.reds = 0; }
  this.crew = (d.crew || []).map(sv => {
    const def = CREW.find(c => c.k === sv.k);
    return def ? { ...mkCrew(def), ...sv } : null;
  }).filter(Boolean);
  this.stations = (d.stations || []).map(sv => {
    const st = mkStation(sv.k);
    if (!st.def) return null;
    st.crewK = sv.crewK; st.intensity = sv.intensity ?? 3; st.fire = sv.fire || 0;
    st.visitCd = sv.visitCd || 0;
    st.build = sv.build ? Date.now() + sv.build : 0;
    // เซฟ v2 เก็บดวงเดียวต่อสถานี — ยกขึ้นเป็นช่องแรกของหลังนั้น
    st.slots = sv.slots || (sv.soul ? [{ soul: sv.soul, intensity: sv.intensity ?? 3,
                                         progress: sv.progress || 0, need: sv.need || 60,
                                         verdict: sv.verdict || null }] : []);
    return st;
  }).filter(Boolean);
  this.queue = d.queue || [];
  this.held = d.held || [];
  this.items = d.items || [];
  this.mobs = d.mobs || [];
  this.guard = d.guard || null;
  if (d.player) this.player = d.player;
  this.logs = d.logs || [];
  this.closed = d.closed || [];
  this.taught = d.taught || [];
  this.ledger = d.ledger || [];
  this.returning = d.returning || [];
  this.returned = d.returned || 0;
  this.zone = d.zone || 'th';
  this.zoneSave = d.zoneSave || {};
  this.usedCases = d.usedCases || [];
  this.fights = d.fights || 0;
  this.spawns = d.spawns || 0;
  this.yamaDone = !!d.yamaDone;
  this.battle = null;                 // ฉากต่อสู้ไม่เซฟ — เปิดเกมมาแล้วเขายืนรออยู่ในคิวเหมือนเดิม
  this.over = null;
  this.log(`💾 โหลดเกมที่บันทึกไว้ — วาระที่ ${this.tick} · ปิดคดีแล้ว ${this.casesDone}`, 'event');
  return true;
};

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

export { SINS, clamp };
