import { TEA_BED_COST } from './tea-recovery.js';
// game.js — สถานะเกม · วาระ (tick) · สูตรตัดสิน
import { SINS, DEEDS, MERITS, WHO, STATIONS, CREW, BAL, EVENTS, SCENE, SPOTS, QUEUE_LINE, GUARD_POST,
         POWERS, DENIALS, HARD_CASES, ITEMS, ITEM_SPOTS,
         MOB, GUARD, LEVELS, SPIRIT_OF, spiritFor, safeSp, starsOf,
         SELF, ORDER_TIERS, KARMA_TIERS, KARMA_RELIEF, TARANG, KRAJOK,
         DENY_BY_SIN, SOLID_LINES, SOLID_BY_SIN, ADMIT_TPL, CRACK_LINES, HOLD_LINES, RETURN,
         voice, SEX_OF, BATTLE, bossUltimate, YAMA_FIGHT, ZONES, FOE_TALK, MOB_TALK,
         STATION_CAP, BUILD_TIME, REPAIR_TIME, DAD, CREW_HELP_LV, ORDER_WARN, crewName, FRONTIER,
         MERCHANT, BOON_SHOP, UPGRADES, authorityOf, fmtAuthority, CREW_POWER,
         syncSceneZone, ZONE_EVENTS, scaleFoeHp, scaleFoeAtk, ZONE_ENTRY, isTrialDestination, isFrontierBreachEvent } from './data.js';
import { CASES_BY_ZONE, ALL_CASES, isPure, CASE_EVERY } from './cases.js';
import { canWalk, stepTo, nearestWalk, findPath, setBlocks, resetWalk, walkVersion } from './walk.js';
import { footOf, artEpoch, hiddenAt, artUrl } from './art.js';
import { t } from './i18n.js';
import { STORY, ABILITY_REWARDS } from './story.js';
import { applySoulPortrait, reconcileSoulPortraits } from './soul-portraits.js';
import { escortCrewPosition, pathLength, ESCORT_PICKUP_SPEED } from './escort.js';

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
/** ชื่อกับคำบรรยายซ้ำกันไหม — ใช้ตัดบรรทัดล่างที่พูดซ้ำของเดิม */
export const sameLabel = (a, b) => !a || !b || a.includes(b) || b.includes(a);
const pick = a => a[Math.floor(Math.random() * a.length)];
/** สุ่มแบบกันซ้ำข้ามวิญญาณ (เพิ่ม 17 ก.ย. 2569 — เจ้าของทัก "วิญญาณติดกันพูดบรรทัดเดิมซ้ำ")
 *  จำบรรทัดที่ใช้ล่าสุด 30 บรรทัดไว้ใน g.recentLines (ข้ามทุกกองรวมกัน เพราะเนื้อความแต่ละกอง
 *  ไม่ซ้ำกันอยู่แล้ว ไม่ต้องแยก state ต่อกอง) — สุ่มจากบรรทัดที่ "ไม่อยู่ในนั้น" ก่อนเสมอ
 *  ถ้ากองนั้นบรรทัดสั้นจนหมดกอง (เช่น soul.pool.deny ของสำนวนเขียนมือมีแค่ 2 บรรทัด) ค่อยยอมสุ่มซ้ำ */
const RECENT_CAP = 30;
function pickFresh(pool, recent) {
  if (!pool || !pool.length) return null;
  const fresh = pool.filter(t => !recent.includes(t));
  const chosen = pick(fresh.length ? fresh : pool);
  recent.push(chosen);
  if (recent.length > RECENT_CAP) recent.shift();
  return chosen;
}
/** เหมือน pickFresh แต่ตัดออกจาก arr เองด้วย (ใช้กับลูปที่ splice ทีละบรรทัดกันซ้ำภายในดวงเดียวกันอยู่แล้ว) */
function spliceFresh(arr, recent) {
  const freshIdxs = [];
  for (let i = 0; i < arr.length; i++) if (!recent.includes(arr[i])) freshIdxs.push(i);
  const idx = freshIdxs.length ? freshIdxs[Math.floor(Math.random() * freshIdxs.length)]
                                : Math.floor(Math.random() * arr.length);
  const [chosen] = arr.splice(idx, 1);
  recent.push(chosen);
  if (recent.length > RECENT_CAP) recent.shift();
  return chosen;
}
let SEQ = 1;
// Keep the old single-foe API as accessors for saved tests and bossUltimate;
// HP and status have exactly one owner, the foe object.
function prepareBattle(b, hp, maxHp = hp) {
  if (!b.foes) b.foes = [{ id: 'foe-1', who:b.who, sub:b.sub, sp:b.sp,
    hp, maxHp, atk:b.foeAtk, stun:0, confuse:0 }];
  b.selectedFoeId ||= b.foes[0].id;
  b.counterIndex ||= 0;
  const selected = () => b.foes.find(f => f.id === b.selectedFoeId) || b.foes[0];
  Object.defineProperties(b, {
    foeHp:{ get:() => selected().hp, set:v => { selected().hp = v; }, configurable:true },
    foeMax:{ get:() => selected().maxHp, configurable:true },
    stun:{ get:() => selected().stun, set:v => { selected().stun = v; }, configurable:true },
    confuse:{ get:() => selected().confuse, set:v => { selected().confuse = v; }, configurable:true },
  });
  return b;
}
const soulFitsZone = (s, zone) => zone !== 'asia' || /^A(?:[1-9]|1\d|20)$/.test(s && s.case || '');

export function createGame() {
  const g = {
    tick: 0, coin: BAL.startCoin, food: BAL.startFood,
    // ข้อ A คุณเป้ 24 ก.ย. 2569 (ชุดที่ 8) — สถานะอิ่ม/หิวของยมทูตที่ "กำลังทำงาน" อยู่ตอนนี้
    // คำนวณใหม่ทุกวาระใน step() · fed/workingCrew ใช้แสดงผลบนจอเท่านั้น ไม่ต้องเซฟ (คิดใหม่ได้ทุกครั้ง)
    fed: true, workingCrew: new Set(),
    order: 72, karma: 0, hp: BAL.startHp,
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — ตวาดข่มขู่ (roar) เลิกใช้ ammo/item แล้ว เปลี่ยนเป็นคูลดาวน์เวลาจริง
    // readyAt: 0 = ใช้ได้ทันทีตั้งแต่เริ่มเกม · ammo/max ของ roar เหลือไว้เฉยๆ ไม่ได้ใช้กันอีกแล้ว (กันเซฟเก่าพัง)
    powers: POWERS.map(p => ({ ...p, cd: 0, ammo: p.k === 'mirror' ? 2 : 0, max: p.k === 'roar' ? 3 : 2, readyAt: 0 })),
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — ลูกไฟในฉากต่อสู้แยกกระสุนออกจากตวาดข่มขู่แล้ว (เดิมแชร์ powerOf('roar').ammo
    // ก้อนเดียวกัน ตอนนี้ตวาดข่มขู่ไม่มี ammo อีกแล้ว ลูกไฟจึงต้องมีสระของตัวเอง)
    fireAmmo: 3, fireAmmoMax: 3,
    star5: 0, level: 1, exp: 0, mp: LEVELS[0].mpMax, mpMax: LEVELS[0].mpMax,
    hits: 0, hpMax: BAL.startHp,
    orderWarns: 0, orderWarnAt: 0,    // คำเตือนเรื่องคิวล้นที่ได้ไปแล้ว (ดู ORDER_WARN)
    greens: 0,                        // คำตัดสินสีเขียว (78 ขึ้นไป) — เกณฑ์เลื่อนขั้นตั้งแต่ 9 ก.ย. 2569
    reds: 0,                          // คำตัดสินสีแดงติดกัน — ครบ 3 พ่อลงมาตบเอง
    player: { x: SPOTS.bench.x + 60, y: SPOTS.bench.y, tx: null, ty: null, face: 1, path: null },
    items: [],                         // ของที่วางอยู่บนพื้นของสาขาปัจจุบัน
    inventory: {},                    // ของที่เก็บเข้ากระเป๋าแล้ว — ติดตัวข้ามโซน
    mobs: [], guard: null, fxHits: [], transits: [], afterlifeWalks: [],
    queue: [], held: [], sentences: [], reborn: 0, ascended: 0, logs: [], closed: [], over: null,
    recentLines: [],                  // บรรทัดคำให้การ 30 บรรทัดหลังสุด — กันวิญญาณติดกันพูดซ้ำ (17 ก.ย. 2569)
    // เดินวาระตั้งแต่เข้าเกม (8 ก.ย. 2569) — เดิมเป็น true แล้วไม่มีอะไรปลดให้เลย
    // ทุกกล่องข้อความจำค่า paused ตอนเปิดแล้วคืนค่าเดิมตอนปิดอย่างซื่อสัตย์
    // ค่าเดิมคือ "พัก" เกมเลยค้างตั้งแต่วินาทีแรก: ทัณฑ์ 0% ยมทูตยืนนิ่ง ไม่มีอะไรขยับ
    // (เจ้าของถามว่าทำไมความคืบหน้าเป็น 0% หมด — นี่คือคำตอบ)
    paused: false, courtClosed: false, speed: 1,
    nextArrive: 4, nextEvent: BAL.eventEvery, nextPay: BAL.payEvery, nextKpi: BAL.kpiEvery,
    kpiPassed: 0, casesDone: 0, scoreSum: 0,
    // ตอนเริ่มเกมมีสามคน: ท่าน · นิรา (อ่านสำนวน) · ทัณฑ์ (ลงทัณฑ์) — คนอื่นต้องจ้างเอง
    crew: CREW.filter(c => c.hire === 0).map(mkCrew),
    self: { ...SELF, morale: 100 },   // เก็บไว้เพื่ออ่านเซฟเก่า แต่ไม่เปิดให้ลงทัณฑ์เอง
    taught: [],                       // ขั้นบทเรียนที่สอนไปแล้ว (ดู TUTOR ใน data.js)
    ledger: [],                       // ทุกคำตัดสินที่เคยออก — ใช้เปิด "แฟ้มของท่าน" ตอนจบ
    returning: [],                    // คดีที่ตัดสินเบาไป รอกลับมาใหม่
    returned: 0,                      // นับว่ากลับมาแล้วกี่คดี
    stations: [],
    zone: 'th',                       // โซนที่กำลังคุมอยู่ (ดู ZONES ใน data.js)
    zoneCases: {}, zoneEvents: {}, eventMapClosed: {}, legacyBossGate:false, bossCleared: {}, bossRetryAt: {}, bossPending: false,
    gameCompleted: false, teaBeds: {}, pendingRecovery:null,
    miniGoals: {}, offlineGrant: 0,
    bossGuarding: {}, bossWalk: null, zoneEntry: null,
    frontier: { zones: {} },           // ระลอกชายแดนแยกตามโซน ไม่ทับความคืบหน้ากัน
    party: { members: [], guard: false },
    upgrades: { powers: {} },
    abilities: {},
    discoverySeen: {}, discoveryQueue: [],
    storyQueue: [], storySeen: {}, niraRest: null,
    pendingReward: null,               // ชุด 28B — สรุปรางวัลหลังชนะ รอ ui.js เด้งหน้าต่าง (ไม่เซฟ)
    // ฉากมาถึงของบอสประจำโซน — โผล่ครั้งแรกก่อนสู้เท่านั้น รีแมตช์ไม่เล่นซ้ำ (17 ก.ย. 2569)
    bossArriveSeen: {},
    zoneIntroSeen: {},
    outfit: 'th',                     // ชุด Yama ที่เลือก — ปลดตามโซน แต่ไม่บังคับให้ตรงโซนปัจจุบัน
    outfitsOwned: ['th'],
    usedCases: [],                    // สำนวนที่มีชื่อซึ่งผ่านมาแล้ว — ไม่ส่งซ้ำจนกว่าจะหมดชุด
    fights: 0,                        // ฉากต่อสู้ที่เกิดขึ้นแล้ว (ใช้เป็นเงื่อนไขบทเรียน)
    spawns: 0,                        // วิญญาณที่ส่งมาแล้วทั้งหมด — ใช้จับจังหวะสำนวนที่เขียนมือ
    battle: null,                     // ฉากต่อสู้ที่กำลังเปิดอยู่ (null = ไม่มี)
    onChange: () => {},
  };

  // สถานีตั้งต้น: หอทะเบียน + กระทะทองแดง (ที่เหลือสร้างเอาเอง)
  // ตะรางรอวาระมีให้ฟรีตั้งแต่เริ่ม (ชุด 27D — มี event แหกคุก) ไม่ต้องซื้อ
  g.stations = [mkStation('sala'), mkStation('krata'), mkStation('tarang')];
  syncFrontierPos(g.zone);          // เกมใหม่เริ่มโซน 1 เสมอ — ตั้งขนาดฉากและล้าง walk mask
  g.player.x = SPOTS.bench.x + 60; g.player.y = SPOTS.bench.y;

  Object.assign(g, API);
  g.log(`พญายม: "โซนนี้เละมาสามร้อยปีแล้ว นี่เบี้ยกรรม ${BAL.startCoin} ไปสร้างที่ลงทัณฑ์กับหาคนเอาเอง"`, 'boss');
  g.spawnSoul();
  return g;
}

function syncFrontierPos(zone) {
  syncSceneZone(zone);
  resetWalk();
}

function mkCrew(def, zone = 'th') {
  // hunger 100 = อิ่มเต็ม (ข้อ D ชุด 13 คุณเป้ 26 ก.ย. 2569) — ลดลงระหว่างทำงาน ป้อนข้าวปั้นแล้วขึ้น
  return { ...def, name: crewName(def, zone), morale: 92, hunger: 100, at: null, tired: false };
}

/** สถานีหนึ่งหลังรับวิญญาณได้พร้อมกันหลายดวง (9 ก.ย. 2569 — เดิมทีละดวง)
 *  slots = [{soul, intensity, progress, need, verdict}] · ผู้คุมคนเดียวดูทั้งหลัง
 *  build = เวลาที่จะสร้างเสร็จ (0 = เสร็จแล้ว) · fire = ไฟไหม้จากผีที่บุกมา (0-100) */
function mkStation(k, build = 0) {
  const def = STATIONS.find(s => s.k === k);
  // mgCd (ชุดที่ 9) = วาระ (g.tick) ที่จะเล่นมินิเกม "เร่งการทำงาน" ซ้ำที่สถานีนี้ได้อีกครั้ง
  // ใช้ตัวเลข tick แบบเดียวกับ visitCd/kanCd ที่มีอยู่แล้ว — 0 แปลว่าเล่นได้ทันที
  return { def, slots: [], crewK: null, intensity: 3, build, buildWait:false, repair:0, repairWait:false, arrivalElapsed:0, fire: 0,
           speedLv:0, capLv:0, fuelLv:0, mgCd:0 };
}

// ---------- สร้างสำนวนคดี ----------
/** คดีที่ถูกกับผิดปนกัน — ด้านที่ทำให้เห็นใจถูกซ่อนไว้ ต้องใช้พลังถึงจะเจอ */
function mkHardSoul(tags, g) {
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
  soul.lines = mkLines(soul, g);
  soul.presses = BAL.presses;
  return soul;
}

/** สำนวนที่ส่งมาต้องเป็นกรรมที่โซนนี้ "มีที่ลง" อยู่จริง
 *  เจ้าของบอก 7 ก.ย. 2569 ว่าคดีที่มาไม่ตรงกับสถานีที่มี ทำให้ลงทัณฑ์ให้ตรงกรรมไม่ได้เลย
 *  ตอนนี้จึงกรองด้วย tags ของสถานีที่สร้างแล้ว — สร้างสถานีเพิ่ม = เปิดสำนวนแนวนั้นเข้ามา
 *  (ถ้าไม่มีสถานีลงทัณฑ์สักหลัง ค่อยปล่อยทุกแนวตามเดิม ไม่งั้นคิวจะว่างเปล่า) */
function poolOf(tags, zone = 'th') {
  const allowed = DEEDS.filter(d => !d.zone || d.zone === zone);
  const themed = zone === 'cyberhell' ? allowed.filter(d => d.zone === zone) : [];
  const source = themed.length ? themed : allowed;
  if (!tags || !tags.length) return source;
  const pool = source.filter(d => tags.includes(d.s));
  return pool.length ? pool : source;
}

function mkSoul(tags, hiddenBonus = 0, g) {
  const POOL = poolOf(tags, g?.zone);
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
  soul.lines = mkLines(soul, g);
  soul.presses = BAL.presses;
  return soul;
}

/** สำนวนที่มีชื่อ มีหน้า มีเรื่อง — เขียนมือไว้ที่ src/cases.js
 *  ต่างจาก mkSoul ตรงที่ทุกบรรทัดถูกเขียนให้ตรงกับ "คนคนนั้น" ไม่ใช่ประกอบจากตาราง
 *  รูป (sp) เพศ (sex) และเนื้อสำนวน จึงตรงกันเสมอโดยไม่ต้องพึ่งการสุ่ม */
function mkCaseSoul(c) {
  const soul = {
    id: SEQ++, case: c.k, kind: c.kind, who: c.who, name: c.name, sex: c.sex,
    sp: safeSp(c.sp, c.sex),   // 17 ก.ย. 2569: A4 sp:4 อ่านเป็นหญิงทั้งที่ sex:'m' — กันซ้ำที่ต้นเหตุ ไม่ใช่แก้เคสเดียว
    face: c.face, waited: 0, said: [], denied: null, resist: !!c.resist,
    calm: !!c.calm,        // ห้ามเข้าฉากต่อสู้เลย แม้กลับมาเป็นคดีซ้ำ (ดู cases.js เรื่องเจ้าอาวาส)
    pure: isPure(c),
    secret: c.secret || null, reward: c.reward || null, fail: c.fail || null,
    // ชั้น `seen` ยังเป็นข้อมูลในแฟ้มสำหรับตรรกะสอบสวน แต่ปิดจาก UI จนกว่าจะเริ่มสืบ
    deeds:  [...c.seen.map(d => ({ ...d, known: true, visible: false })),
             ...(c.hidden || []).map(d => ({ ...d, known: false }))],
    merits: (c.merits || []).map(m => ({ ...m })),
  };
  // คนบริสุทธิ์กับเทวดา "ไม่มีวาระที่สมควรได้รับ" — ทางเดียวที่ถูกคือส่งประตูสวรรค์
  soul.deserved = soul.pure ? 0 : deservedOf(soul);
  // บทเปิดกับบทเฉลยต้องผ่าน voice() ด้วย — เดิมผ่านแค่ t เพราะสิบเรื่องแรกเขียนสรรพนามตายตัว
  // (เจ้าอาวาสเขียนเป็น token ทั้งเรื่อง ถ้าไม่ผ่านจะเห็น "{i}" โผล่บนจอ · 10 ก.ย. 2569)
  soul.said.push({ kind: 'deny', text: voice(c.line, c.sex) });
  soul.lines = (c.claims || []).map((l, i) => ({
    ...l, t: voice(l.t, c.sex), ...(l.reveal ? { reveal: voice(l.reveal, c.sex) } : {}), i, used: false }));
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
function mkLines(soul, g) {
  const recent = (g && g.recentLines) || [];
  const out = [];
  if (soul.hard) {
    const plea = soul.said.find(x => x.kind === 'deny');
    out.push({ kind: 'plea', t: (plea ? plea.text : voice('"{i}ขอพูดอะไรสักอย่างได้ไหม{p}ท่าน"', soul.sex)).replace(/^"|"$/g, '') });
  } else {
    // ปฏิเสธชนิดบาปที่หนักที่สุดในสำนวนที่ผู้เล่นเห็นแล้ว
    const known = soul.deeds.filter(d => d.known).sort((a, b) => b.w - a.w);
    const deny = known.length && ((soul.pool && soul.pool.deny) || DENY_BY_SIN[known[0].s]);
    if (deny) out.push({ kind: 'deny', t: voice(Array.isArray(deny) ? pickFresh(deny, recent) : deny, soul.sex), sin: known[0].s });
  }
  const fake = soul.merits.find(m => m.fake);
  if (fake) out.push({ kind: 'boast', t: voice(`ท่านดูบุญ{my}ด้วย{na} — ${fake.t}`, soul.sex), merit: fake.t });

  // ---- บรรทัดที่ "ตรงกับสำนวน" ----
  // เจ้าของทัก 8 ก.ย. 2569 ว่าสี่บรรทัดนี้ดูซ้ำทุกคดี เพราะเดิมสุ่มจากกองกลางกองเดียว 5 บรรทัด
  // ของใหม่ต่อกันสามชั้น ชั้นแรกผูกกับ "ข้อความในสำนวนจริง" จึงไม่มีทางซ้ำข้ามคดีได้เลย
  // เดิมโยนทุกกองรวมกันแล้วสุ่ม — กองกลางมี 24 บรรทัด กองเฉพาะคดีมี 3-4
  // โอกาสออกจึงเป็นของกองกลางเกือบทั้งหมด คดีคนละดวงเลยพูดเหมือนกัน
  // (เจ้าของทัก 10 ก.ย. 2569) · ตอนนี้บังคับลำดับ: อ้างสำนวนตรง ๆ → ตามชนิดบาป → กองกลาง
  const known = soul.deeds.filter(d => d.known);
  const used = new Set();
  const add = t => {
    if (!t || used.has(t) || out.length >= 4) return false;
    used.add(t);
    out.push({ kind: 'solid', t: voice(t, soul.sex) });
    return true;
  };

  if (known.length) {                                   // 1. อ้างข้อความในสำนวนตรง ๆ (ไม่มีทางซ้ำข้ามคดี)
    const d = pick(known);
    add(pickFresh(ADMIT_TPL, recent).replace(/\{d\}/g, d.t));
  }
  // soul.pool = บทขากลับที่สำนวนที่มีชื่อเขียนเอง (เช่น เจ้าอาวาส) — ใช้แทนชั้น 2 และ 3 ทั้งหมด
  const bySin = soul.pool ? [...(soul.pool.solid || [])] : []; // 2. ตามชนิดบาปของคดีนี้
  if (!soul.pool) for (const d of known) bySin.push(...(SOLID_BY_SIN[d.s] || []));
  while (bySin.length && out.length < 3) add(spliceFresh(bySin, recent));

  const rest = soul.pool ? [...(soul.pool.solid || [])] : [...SOLID_LINES]; // 3. กองกลางเป็นตัวเติมท้าย
  let guard2 = 0;
  while (rest.length && out.length < 4 && guard2++ < 60)
    add(spliceFresh(rest, recent));
  // สลับลำดับ ไม่งั้นบรรทัดที่จี้ได้จะอยู่บนสุดทุกคดี
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.map((l, i) => ({ ...l, i, used: false }));
}

/** บาปหนักสุดของดวง ใช้กฎเดียวกันทั้งวาระที่สมควรได้และโบนัสสถานี */
export function primarySinOf(soul) {
  return soul.deeds.reduce((best, deed) => !best || deed.w > best.w ? deed : best, null)?.s ?? null;
}

/** วาระที่สมควรได้รับ คิดจาก "ความจริงทั้งหมด" ไม่ใช่จากที่ผู้เล่นเห็น */
export function deservedOf(soul) {
  const ws = soul.deeds.map(d => d.w).sort((a, b) => b - a);
  const raw = 0.7 * ws[0] + ws.slice(1).reduce((s, w) => s + w * 0.3, 0);
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
            ? mkHardSoul(tags, this)
            : mkSoul(tags, this.orderTier().hidden, this));
    if (s.case) this.log(`📁 สำนวนมีชื่อเข้าคิว — ${s.name} (${s.who})`, 'event');
    else if (s.hard) this.log(`⚖️ สำนวน #${String(s.id).padStart(3, '0')} หนา​ผิดปกติ — นิราวางไว้แล้วไม่พูดอะไร`, 'event');
    else this.log(`วิญญาณเข้าคิว — ${s.who} (สำนวน #${String(s.id).padStart(3, '0')})`);
    applySoulPortrait(s, this.zone);
    this.queue.push(s);
  },

  /** ถึงคิวของสำนวนที่เขียนมือหรือยัง — คืน null ถ้ายังไม่ถึง หรือไม่มีเรื่องไหนที่โซนนี้รับได้
   *  กติกาสองข้อที่ทำให้ไม่มีทางเจอคดีที่ "ตัดสินให้ถูกไม่ได้เลย":
   *    · คดีปกติต้องมีสถานีที่รับชนิดกรรมของเขาอยู่แล้วอย่างน้อยหนึ่งหลัง
   *    · คดีคนบริสุทธิ์/เทวดา ส่งมาก็ต่อเมื่อสร้างประตูสวรรค์แล้วเท่านั้น */
  nextNamedCase(tags) {
    if (this.casesDone < 1) return null;
    if (this.zone === 'th' && this.spawns % CASE_EVERY !== 0) return null;
    const pool = CASES_BY_ZONE[this.zone] || [];
    let left = pool.filter(c => !this.usedCases.includes(c.k));
    // บูรพาไม่ถอยกลับไปสุ่มสำนวนไทยเมื่อ A1-A20 ครบชุด — ล้างรอบแล้วคละใหม่
    if (!left.length && this.zone === 'asia' && pool.length) {
      const keys = new Set(pool.map(c => c.k));
      this.usedCases = this.usedCases.filter(k => !keys.has(k));
      left = [...pool];
    }
    if (!left.length) return null;
    const ok = left.filter(c => {
      if (isPure(c)) return this.has('sawan');
      if (!tags.length) return true;
      return c.seen.some(d => tags.includes(d.s));
    });
    if (!ok.length) return null;
    const c = pick(ok);
    this.usedCases.push(c.k);
    return applySoulPortrait(mkCaseSoul(c), this.zone);
  },

  /** สถานีนี้รับได้กี่ดวง — หลังที่ไม่ได้ใช้ลงทัณฑ์ (แรง 0) รับไม่ได้เลย */
  stCap(st) { return st && st.def.pow > 0 ? STATION_CAP + (st.capLv || 0) : 0; },
  /** ยังรับเพิ่มได้อีกกี่ดวง (นั่งร้าน/อาคารพัง/กำลังซ่อมยังไม่รับ) */
  stFree(st) { return st && !st.build && !st.repair && st.fire < MOB.burnMax
    ? this.stCap(st) - st.slots.length : 0; },
  /** ดวงที่อยู่หน้าสุดของสถานี */
  stFront(st) { return st && st.slots.length ? st.slots[0] : null; },

  crewOf(k) {
    if (k === 'me') return this.self;        // ท่านลงไปคุมเอง — ไม่มีค่าแรง ไม่ต้องจ้าง
    return this.crew.find(c => c.k === k);
  },

  /** ความคืบหน้าชายแดนต้องแยกสาขา — แพ้/ย้ายโซนไม่ล้างระลอกเดิม */
  frontierOf(zone = this.zone) {
    this.frontier ||= { zones:{} };
    if (!this.frontier.zones) {
      const old = { clears:this.frontier.clears || 0, team:[...(this.frontier.team || [])] };
      this.frontier = { zones:{ th:old } };
    }
    return this.frontier.zones[zone] ||= { clears:0, team:[] };
  },

  partyCrew() {
    const chosen = new Set(this.party?.members || []);
    return this.crew.filter(c => chosen.has(c.k));
  },

  toggleParty(k) {
    const c = this.crew.find(x => x.k === k && !x.reader && !x.self);
    if (!c) return false;
    this.party ||= { members:[], guard:false };
    const i = this.party.members.indexOf(k);
    if (i >= 0) this.party.members.splice(i, 1);
    else { if (this.party.members.length >= 2) return false; this.party.members.push(k); }
    // ทีมต่อสู้เป็นเพียงรายชื่อเรียกเข้าฉากสู้ งานและตำแหน่งบนแผนที่ไม่เปลี่ยน
    this.save(); this.onChange(); return true;
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
    this.log(`ขัง${soul.name || soul.who} (สำนวน #${String(soul.id).padStart(3, '0')}) ไว้ในตะรางก่อน — ` +
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
    this.log(`ให้${this.queue[0].name || this.queue[0].who}ขึ้นแทน — ` +
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


  /** The deeds press() will uncover, in the same order as the interrogation. */
  pressDeeds(soul, line) {
    const hidden = soul.deeds.filter(d => !d.known);
    return line.kind === 'deny' ? hidden.slice(0, 1) : line.kind === 'plea' ? hidden : [];
  },
  roarTarget(soul) {
    if (!soul?.lines || soul.pure || soul.presses <= 0) return null;
    const sin = primarySinOf(soul);
    return soul.lines.find(l => !l.used && this.pressDeeds(soul, l).some(d => d.s === sin)) || null;
  },
  roarWhy(soul) {
    if (soul?.pure) return 'ดวงนี้ไม่มีบาปให้จับ';
    if (soul?.presses <= 0) return 'ไม่มีข้อหลักฐานให้สอบสวนเหลือแล้ว';
    return this.roarTarget(soul) ? '' : 'ไม่มีข้อไหนนำไปสู่บาปหลักแล้ว';
  },
  discover(kind, k) {
    const id = `${kind}:${k}`;
    if (this.discoverySeen[id] || this.discoveryQueue.includes(id)) return;
    this.discoveryQueue.push(id);
  },
  syncDiscoveries() {
    for (const [k, n] of Object.entries(this.inventory)) if (n > 0 && ITEMS[k]) this.discover('item', k);
    for (const p of this.powers) if (!this.powerLocked(p)) this.discover('power', p.k);
    for (const [k, yes] of Object.entries(this.abilities)) if (yes && ABILITY_REWARDS[k]) this.discover('ability', k);
  },
  acknowledgeDiscovery(id) {
    if (this.discoveryQueue[0] !== id) return false;
    this.discoveryQueue.shift(); this.discoverySeen[id] = true; this.save(); return true;
  },
  outfitWhy(k) {
    const z = ZONES.find(z => z.k === k);
    if (!z) return 'ไม่รู้จักชุดนี้';
    if (this.outfitsOwned?.includes(k)) return '';
    return this.zone !== k ? `ใช้ได้เมื่อถึง${z.name} และซื้อชุดจากพ่อค้านรกแล้ว` : 'ซื้อชุดจากพ่อค้านรกก่อน';
  },

  powerOf(k) { return this.powers.find(p => p.k === k); },
  /** ข้อ A คุณเป้ 24 ก.ย. 2569 — roar (ตวาดข่มขู่) ใช้คูลดาวน์เวลาจริงแทน ammo/cd แบบคดี
   *  พลังอื่น (mirror/hypno/ice) ยังเป็นระบบเดิม: cd นับเป็นคดี + ต้องมี ammo (item) */
  powerReady(k) {
    const p = this.powerOf(k);
    if (!p || this.powerLocked(p)) return false;
    if (p.realtime) return Date.now() >= (p.readyAt || 0);
    if (k === 'hypno' || k === 'ice') return p.cd === 0 && this.mp >= BATTLE.mpCost[k];
    return p.cd === 0 && (p.ammo > 0 || k === 'mirror' && (this.inventory.mirror || 0) > 0);
  },

  /** ใช้พลังกับวิญญาณที่ยืนอยู่หน้าแท่น — คืนข้อความที่จะขึ้นบนโต๊ะ */
  usePower(k, soul) {
    if (!this.powerReady(k) || !soul || k === 'roar' && this.roarWhy(soul)) return null;
    const p = this.powerOf(k);
    const def = POWERS.find(x => x.k === k);
    if (p.realtime) p.readyAt = Date.now() + (def.cdMs || 0);   // คูลดาวน์เวลาจริง ไม่กินกระสุน
    else {
      p.cd = def.cd;
      if (k === 'hypno' || k === 'ice') this.mp -= BATTLE.mpCost[k];
      else if (k === 'mirror' && p.ammo <= 0) {
        if (--this.inventory.mirror <= 0) delete this.inventory.mirror;
      } else p.ammo--;
    }                                           // เริ่มนับ cooldown แบบคดี + กินของหนึ่งชิ้น
    this.karma = clamp(this.karma + p.karma, 0, 100);

    const hidden = soul.deeds.filter(d => !d.known);
    const fakes = soul.merits.filter(m => m.fake && !m.exposed);
    let out = [];
    const sealed = soul.deeds.filter(d => d.known && d.visible === false);
    sealed.forEach(d => { d.visible = true; out.push({ kind: 'truth', text: `📂 นิราเปิดรายการกรรมชั้นแรก — ${d.t}` }); });

    if (k === 'mirror') {
      soul.revealed ||= {};
      soul.revealed.mirror = true;
      // ความลับของสำนวนเขียนมือยังเปิดผ่านกระจกตามเดิม
      if (soul.secret && !soul.secretSeen) {
        soul.secretSeen = true;
        out.push({ kind: 'truth', text: soul.secret });
      }
      const line = this.roarTarget(soul);
      if (line) soul.roarHint = line.i;
      else delete soul.roarHint;
      out.push({ kind:'hint', text: line ? `💢 ข้อ ${line.i + 1} นำไปสู่บาปหลัก — กดสอบสวนข้อที่มี 💢` : this.roarWhy(soul) });
      const station = this.trialAnswer(soul).station;
      out.push({ kind: 'truth', text: station
        ? `🪞 กระจกเผยที่ไหน ความแรง และผู้คุมบนวงคำสั่ง${this.stations.some(st => st.def.k === station.k && !st.build) ? '' : ' — ต้องสร้างสถานีเฉลยก่อน'}`
        : '🪞 ยังไม่มีสถานีที่ตรงกรรมของดวงนี้' });

    } else if (k === 'roar') {
      const line = this.roarTarget(soul);
      soul.roarHint = line.i;
      out.push({ kind:'confess', text:`💢 “ยอมแล้ว… ถามเรื่องข้อ ${line.i + 1} เถอะ” — ข้อนี้นำไปสู่บาปหลัก กดสอบสวนข้อที่มี 💢` });

    } else if (k === 'ice') {
      const line = soul.lines?.find(x => !x.used);
      if (line) {
        line.used = true;
        out.push({ kind:'truth', text:`❄️ ความกลัวสงบลง เขาพูดช้าลง: “${line.t}”` });
      } else out.push({ kind:'hint', text:'❄️ เขาสงบลง แต่ไม่มีคำให้การใหม่เหลือแล้ว' });
    } else if (k === 'hypno') {                  // เห็นหมด แต่กรรมตกที่เรา
      soul.revealed ||= {};
      soul.revealed.hypno = true;
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
    if (soul.roarHint === i) delete soul.roarHint;
    soul.presses--;
    const out = [];
    const sealed = soul.deeds.filter(d => d.known && d.visible === false);
    sealed.forEach(d => { d.visible = true; out.push({ kind: 'truth', text: `📂 นิราเปิดรายการกรรมชั้นแรก — ${d.t}` }); });

    if (L.kind === 'deny') {
      // จนมุม — เรื่องที่สำนวนไม่ได้เขียนไว้โผล่ออกมาเอง ไม่ต้องเสียพลังสักอย่าง
      const hidden = this.pressDeeds(soul, L)[0];
      out.push({ kind: 'confess', text: `⚖️ ${pickFresh(CRACK_LINES, this.recentLines)}` });
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
      const hidden = this.pressDeeds(soul, L);
      if (L.reveal) out.push({ kind: 'confess', text: `⚖️ ${L.reveal}` });
      if (hidden.length) {
        hidden.forEach(d => { d.known = true; out.push({ kind: 'truth', text: `⚖️ เขาเล่าต่อจนจบ — ${d.t}` }); });
      } else if (!L.reveal) {
        out.push({ kind: 'truth', text: '⚖️ เขาเล่าซ้ำอีกรอบ ไม่มีอะไรเพิ่มจากที่พูดไปแล้ว' });
      }

    } else {
      out.push({ kind: 'hint', text: `↳ ${pickFresh(HOLD_LINES, this.recentLines)}` });
    }

    soul.said.push(...out);
    this.onChange();
    return out;
  },

  freeCrew() { return this.crew.filter(c => !c.at && !c.reader); },

  /** สถานีที่เลือกเป็น "สถานที่" ในห้องสอบสวนได้ (เฉพาะที่รับวิญญาณไปลงทัณฑ์/ส่งสวรรค์จริง — ดู isTrialDestination) */
  trialDestinations() { return this.stations.filter(x => isTrialDestination(x.def)); },

  /** เฉลยเฉพาะคดีที่ใช้พลังแล้ว; ผู้คุมคิดคะแนนจาก judge() ที่สถานีเฉลย/วาระสมควร
   *  เลือกคะแนนสูงสุดในกลุ่มที่รับหมายได้ตอนนี้ก่อน ถ้าไม่มีให้แสดงคนคะแนนสูงสุดพร้อมเหตุผล */
  trialAnswer(soul) {
    if (!soul?.revealed?.mirror && !soul?.revealed?.hypno) return null;
    const station = STATIONS.find(st => soul.pure ? st.heaven : st.tags.includes(primarySinOf(soul))) || null;
    const answer = { station, intensity: soul.revealed.mirror ? soul.deserved : null, crew: null, unavailable: null };
    if (!soul.revealed.mirror || !station) return answer;
    const st = this.stations.find(x => x.def.k === station.k) || mkStation(station.k);
    // สถานีที่มีดวงอยู่แล้วเปลี่ยนผู้คุมไม่ได้ จึงพิจารณาเฉพาะผู้คุมประจำ
    const candidates = this.crew.filter(c => !c.reader && !c.self && (!st.slots.length || c.k === st.crewK));
    const available = candidates.filter(c => !this.assignBlock(soul.id, st.def.k, c.k));
    const scoring = Object.create(this);
    scoring.log = () => {}; // judge() ของเพลิงอาจเขียน log แม้คะแนนไม่เปลี่ยน
    const ranked = (available.length ? available : candidates).map(c => ({ c,
      score: this.judge.call(scoring, { ...st, crewK:c.k }, { soul, intensity:soul.deserved || 1 }).score,
    })).sort((a, b) => b.score - a.score);
    answer.crew = ranked[0]?.c || null;
    if (answer.crew && !available.length) answer.unavailable = this.assignBlock(soul.id, st.def.k, answer.crew.k) || { key:'crewMissing' };
    return answer;
  },

  // ---------- มอบหมายคดี ----------
  assignBlock(soulId, stKey, crewK) {
    const st = this.stations.find(s => s.def.k === stKey);
    if (!st || !isTrialDestination(st.def)) return { key: 'stationMissing' };
    if (!this.queue.some(s => s.id === soulId)) return { key: 'soulMissing' };
    if (this.stFree(st) <= 0) return { key: 'stationFull' };
    const c = this.crewOf(st.slots.length ? st.crewK : crewK);
    if (!c || c.self || c.reader) return { key: 'crewMissing' };
    if (c.escort) return { key: 'crewEscort' };
    if (c.buildK) return { key: 'crewBuilding' };
    if (c.at && c.at !== stKey) return { key: 'crewAt', station: STATIONS.find(s => s.k === c.at)?.name || c.at };
    return null;
  },
  assign(soulId, stKey, crewK, intensity) {
    if (this.assignBlock(soulId, stKey, crewK)) return false;
    const st = this.stations.find(s => s.def.k === stKey);
    const si = this.queue.findIndex(s => s.id === soulId);
    // สถานีที่มีผู้คุมประจำอยู่แล้ว ดวงถัดไปเข้าเวรของคนเดิม (หนึ่งหลังหนึ่งผู้คุม)
    const useK = st.slots.length ? st.crewK : crewK;
    const c = this.crewOf(useK);
    const soul = this.queue.splice(si, 1)[0];
    // หลังออกหมาย วิญญาณยังยืนรอที่แท่น: ผู้คุมเดินมารับก่อน แล้วค่อยเดินคู่กันไปสถานี
    // เส้นทางทั้งสองช่วงใช้พื้นเดินจริง จึงไม่ลอยตัดลาวา/แม่น้ำเหมือน animation รุ่นแรก
    const route = findPath(QUEUE_LINE[0][0], QUEUE_LINE[0][1], st.def.x, st.def.y);
    const now = Date.now();
    let arriveAt = now;
    if (route?.length) {
      const outbound = [QUEUE_LINE[0], ...route];
      if (!c.self) {
        const from = [c.x ?? c.hx, c.y ?? c.hy];
        const pickupRoute = findPath(from[0], from[1], QUEUE_LINE[0][0], QUEUE_LINE[0][1]);
        const pickup = [from, ...(pickupRoute?.length ? pickupRoute : [QUEUE_LINE[0]])];
        const pathLength = path => path.slice(1).reduce((sum, p, i) =>
          sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
        const pickupDuration = Math.max(900, pathLength(pickup) / 0.085);
        const pickupAt = now + 250;
        const departAt = pickupAt + pickupDuration + 650; // หยุดรับตัวให้ผู้เล่นอ่านจังหวะออก
        const travelDuration = Math.max(2400, pathLength(outbound) / 0.060);
        arriveAt = departAt + travelDuration;
        this.transits.push({ id:soul.id, sp:soul.sp, name:st.def.name,
          crew:useK, crewName:c.name, crewGlyph:c.glyph, pickup, outbound,
          pickupAt, departAt, arriveAt });
        c.escort = soul.id;
      } else {
        const started = now + 900;
        const duration = Math.min(9000, Math.max(3000, route.length * 330));
        arriveAt = started + duration;
        this.transits.push({ id:soul.id, sp:soul.sp, path:outbound,
          started, duration, arriveAt, name:st.def.name, crew:useK });
      }
    }
    // อย่าตัดรายการเก่าทิ้งตามจำนวน: แต่ละรายการผูกกับผู้คุมที่กำลังเดินไปรับจริง
    // scene.js จะเก็บกวาดเองเมื่อเดินถึง จึงไม่มีรายการสะสมถาวร
    const slot = { soul, intensity: clamp(intensity, 1, 5), progress: 0, need: 0,
      verdict: null, pendingUntil: arriveAt };
    slot.need = 18 + soul.deserved * 8 + slot.intensity * 7;
    st.slots.push(slot);
    st.crewK = useK;
    st.intensity = slot.intensity;
    c.path = null;                       // ทิ้งเส้นทางเดินเล่นเดิม แล้วเดินไปประจำสถานีใหม่
    c.at = st.def.k;
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
    const positive = soul.deeds.filter(d => d.w > 0);
    const totalW = positive.reduce((s, d) => s + d.w, 0);
    const hitW = positive.filter(d => tags.includes(d.s)).reduce((s, d) => s + d.w, 0);
    // น้ำหนักลบลดวาระที่สมควรได้ แต่ไม่นำมาหักคะแนนความตรงของสถานี
    let tham = tags.length === 0 || totalW === 0 ? 42
      : !Number.isFinite(totalW) || !Number.isFinite(hitW) ? 0
      : clamp(Math.round(100 * hitW / totalW), 0, 100);
    if (c.panya >= 7) tham = Math.min(100, tham + 6);

    const short = Math.max(0, soul.deserved - slot.intensity);
    const over = Math.max(0, slot.intensity - soul.deserved);
    // เบาไปกับหนักเกิน ต้องเจ็บพอ ๆ กัน ไม่งั้นซัดวาระ 5 ทุกคดีจะเป็นวิธีเล่นที่ดีที่สุด
    // ซึ่งขัดกับแกนของเกมทั้งเกม
    const ked = clamp(100 - short * 26 - over * 28, 0, 100);
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
    const baseCoin = Math.round(BAL.coinPerCase * (score / 100) * (0.7 + soul.deserved * 0.12)
                            * this.orderTier().coin);
    const bonus = baseCoin > 0 && tags.includes(primarySinOf(soul))
      ? Math.round(baseCoin * BAL.matchBonus) : 0;
    return { tham, ked, rab, score, karma, coin: baseCoin + bonus, bonus, short, over };
  },

  /** ผลของคำตัดสิน — คะแนน กรรม บารมี และเสียงจากพ่อ (เกิดทันทีที่ออกหมาย) */
  applyVerdict(r, soul) {
    if (Number.isFinite(r.karma)) this.karma = clamp(this.karma + r.karma, 0, 100);
    if (Number.isFinite(r.score)) this.order = clamp(this.order + (r.score - 55) / 12, 0, 100);
    this.casesDone++; if (Number.isFinite(r.score)) this.scoreSum += r.score;
    this.zoneCases[this.zone] = (this.zoneCases[this.zone] || 0) + 1;
    this.refreshZoneEvents(this.zone);
    // เป้าหมายสั้น ๆ รายสาขา: เปิดหลักฐานที่ซ่อนอยู่และตัดสินได้ดีสามคดี
    const goal = this.miniGoals[this.zone] ||= { truth:0, earned:false };
    if (!goal.earned && r.score >= 78 && soul.said?.some(x => x.kind === 'truth' || x.kind === 'confess')) {
      goal.truth++;
      if (goal.truth >= 3) {
        goal.earned = true; this.coin += 90;
        this.log('📜 เปิดโปงความจริงครบ 3 สำนวน — +90 เบี้ยกรรม และหลักฐานช่วยเตรียมศึกบอสโซนนี้', 'good');
      }
    }
    this.bossPending = this.bossReady();
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
    if (tag === 'good') { this.greens++; this.reds = 0; }
    else if (tag === 'bad') {
      this.reds++;
      if (this.reds < DAD.redsToCome) {
        // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — โซน 2-4 ใช้ชื่อผู้ตรวจการของตัวเอง ไม่ใช่ "พญายม" ของโซน 1
        const warnText = fmtAuthority(DAD.warn[this.reds - 1] || DAD.warn[0], this.zone);
        this.log(`⚠️ ${warnText} (คำตัดสินแดง ${this.reds}/${DAD.redsToCome})`, 'boss');
        // เตือนครั้งที่ warnFireballAt (รองสุดท้าย) มาพร้อมลูกไฟจริง ไม่ใช่แค่คำพูด
        // (คุณเป้สั่ง 17 ก.ย. 2569: "เห็นเป็นภาพ/เอฟเฟกต์ ไม่ใช่แค่ตัวเลข")
        const withFireball = this.reds === DAD.warnFireballAt;
        if (withFireball) {
          const floor = this.hpMax * DAD.warnFireballFloor;
          this.hp = Math.max(floor, this.hp - this.hpMax * DAD.warnFireballFrac);
          this.fxHits.push({ t: Date.now(), x: this.player.x, y: this.player.y });
          this.log(fmtAuthority(`🔥 พญายมปล่อยลูกไฟลงมาเตือน — บารมีเหลือ ${Math.max(0, Math.round(this.hp))}`, this.zone), 'bad');
        }
        this.pendingWarn = { n: this.reds, of: DAD.redsToCome, text: warnText, fireball: withFireball };
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
    else if (r.stars <= 1) { this.hp -= 10; this.log(fmtAuthority('พญายมส่ายหน้า — บารมีหายไป 10', this.zone), 'bad'); }
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
    } else if (r.stars === 4) this.coin += 25;

    if (Number.isFinite(r.score)) this.gainExp(Math.max(8, Math.round(r.score * .35)), 'สอบสวน');
    this.hp = clamp(this.hp, 0, this.hpMax);
    // จดทุกคำตัดสินไว้ — ตอนจบเกมนิราจะวางแฟ้มชื่อของท่านเอง แล้วเปิดอ่านได้จริง
    // boss = คำตัดสินของพ่อต่อคำตัดสินของเรา — เก็บลงแฟ้มด้วยตั้งแต่ 12 ก.ย. 2569
    // (ข้อ 2 ของเจ้าของ: ศาลาห้องสมุดต้องบอกว่า "พ่อว่าอย่างไร" กับคดีที่ผ่านไปแล้ว)
    // เซฟเก่าไม่มีฟิลด์นี้ — ui.js เดาย้อนจากคะแนนให้ ดู dadGrade()
    this.ledger.push({ id: soul.id, who: soul.who, tick: this.tick,
                       over: r.over, short: r.short, karma: r.karma,
                       stars: r.stars, score: r.score, tham: r.tham,
                       boss: r.boss, heaven: !!r.heaven, right: !!r.right,
                       deserved: soul.deserved, back: !!soul.back });
    if (this.ledger.length > 300) this.ledger.shift();
    this.pendingVerdict = { ...r, who: soul.who, id: soul.id };
    this.checkEnd();
  },

  /** Keep a soul outside the destination roster until its map walk is complete. */
  startAfterlifeWalk(soul, from, to, destination, entry = null, keeperK = null) {
    const start = nearestWalk(from[0], from[1]);
    const end = nearestWalk(to[0], to[1]);
    const route = start && end && findPath(start[0], start[1], end[0], end[1]);
    if (!route?.length || Math.hypot(route.at(-1)[0] - end[0], route.at(-1)[1] - end[1]) > 18) {
      this.finishAfterlifeWalk({ soul, destination, entry });
      return false;
    }
    const path = [start, ...route];
    const length = path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0);
    const walk = { soul, destination, entry, path, elapsed:0,
      duration:Math.max(1100, length / 0.09), zone:this.zone };
    if (destination === 'prison') this.assignEscort(walk, keeperK);
    this.afterlifeWalks.push(walk);
    return true;
  },

  /** ชุด 29C ข้อ 2 — วิญญาณที่รับทัณฑ์ครบไม่เดินเข้าตะรางเอง: ยมทูตที่คุมการลงทัณฑ์นำไปส่ง (ยมทูตนำ วิญญาณตามติด)
   *  ยมทูตคนนั้นยังมีดวงอื่นให้คุมอยู่ / ไม่ว่าง / ไม่มี → ใช้ยมทูตที่ว่างและอยู่ใกล้จุดรับที่สุด
   *  ไม่มีใครว่างเลย → วิญญาณเดินคนเดียวเหมือนเดิม · ท่านเอง (self) กับนิรา (reader) ไม่ถูกเรียกใช้
   *  ตำแหน่งยมทูตขยับใน advanceAfterlife · ส่งเสร็จปล่อยตัว (releaseEscort) ให้ระบบเดินปกติพากลับไปทำงานเอง */
  assignEscort(walk, keeperK = null) {
    const start = walk.path[0];
    const dist = c => Math.hypot((c.x ?? c.hx) - start[0], (c.y ?? c.hy) - start[1]);
    const free = this.crew.filter(c => !c.self && !c.reader && !c.escort && !c.buildK && !c.at);
    const ranked = [...free.filter(c => c.k === keeperK), ...free.filter(c => c.k !== keeperK).sort((a, b) => dist(a) - dist(b))];
    for (const c of ranked) {
      const cx = c.x ?? c.hx, cy = c.y ?? c.hy;
      let pickup = [[cx, cy]];
      if (dist(c) > 6) {
        const from = canWalk(cx, cy) ? [cx, cy] : nearestWalk(cx, cy);
        const route = from && findPath(from[0], from[1], start[0], start[1]);
        if (!route?.length || Math.hypot(route.at(-1)[0] - start[0], route.at(-1)[1] - start[1]) > 18) continue;
        pickup = [[cx, cy], ...route];
      }
      const delay = Math.round(pathLength(pickup) / ESCORT_PICKUP_SPEED);
      walk.delay = delay;
      walk.duration += delay;
      walk.escort = { k:c.k, pickup };
      c.escort = walk.soul.id; c.path = null; c.x = cx; c.y = cy;
      return true;
    }
    return false;
  },

  /** ส่งตัวเสร็จ (หรือเลิกกลางคัน) — คืนยมทูตให้ระบบเดินปกติ: ยืนที่ปลายทางแล้วเดินกลับจุดประจำเอง */
  releaseEscort(walk) {
    const c = walk.escort && this.crewOf(walk.escort.k);
    if (!c || c.self) return;
    if (c.escort === walk.soul.id) c.escort = null;
    const end = walk.path.at(-1);
    c.x = end[0]; c.y = end[1]; c.path = null; c.wait = 0;
  },

  finishAfterlifeWalk(walk) {
    const { soul, destination, entry } = walk;
    if (destination === 'prison' || destination === 'gate') {
      if (!this.sentences.some(x => x.soul.id === soul.id && x.zone === (entry?.zone || this.zone)))
        this.sentences.push(entry);
    } else if (destination === 'queue') {
      if (!this.queue.some(x => x.id === soul.id)) this.queue.push(soul);
      this.returned++;
    }
  },

  advanceAfterlife(dt) {
    if (this.paused || this.over || !Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.afterlifeWalks.length - 1; i >= 0; i--) {
      const walk = this.afterlifeWalks[i];
      walk.elapsed += dt;
      if (walk.elapsed < walk.duration) {
        const c = walk.escort && this.crewOf(walk.escort.k);
        if (c && !c.self) {               // ยมทูตที่นำทางอยู่ — ตำแหน่งจริงตามเส้นทาง (ให้ตำแหน่งที่คลิกเลือก/ที่เซฟตรงกับที่เห็นบนจอ)
          const pos = escortCrewPosition(walk);
          c.x = pos.x; c.y = pos.y; c.face = pos.face; c.path = null;
        }
        continue;
      }
      this.afterlifeWalks.splice(i, 1);
      this.releaseEscort(walk);
      if (walk.destination !== 'exit') this.finishAfterlifeWalk(walk);
      this.onChange();
    }
  },

  finish(st, slot) {
    const i = st.slots.indexOf(slot);
    if (i < 0) return;
    const soul = slot.soul, c = this.crewOf(st.crewK);
    const r = slot.verdict || this.judge(st, slot);
    let toPrison = null;
    if (st.def.heaven && !r.right) {
      soul.beaten = false;
      this.queue.push(soul);
      this.log(`↩️ ${soul.who}ยังมีกรรม — ประตูสวรรค์ส่งกลับเข้าคิวให้ตัดสินใหม่`, 'bad');
    } else if (st.def.heaven) {
      this.sentences.push({ soul, verdict:r, intensity:slot.intensity,
        stage:'gate', checked:false, zone:this.zone, rewardEligible:!!r.right });
      this.log(`🕊️ ${soul.who}ถึงประตูสวรรค์ — รอให้บุญตรวจกรรมคงเหลือ`, 'act');
    } else {
      const entry = { soul, verdict:r, intensity:slot.intensity,
        stage:'prison', readyAt:this.tick + 6, inspected:false, repentant:null, zone:this.zone };
      const prison = this.stations.find(x => x.def.k === 'tarang' && !x.build);
      // 29C: ออกเดินหลังปลดผู้คุมออกจากเวร (ด้านล่าง) เพื่อให้รู้ว่ายมทูตคนนั้นว่างไปส่งได้ไหม
      toPrison = prison ? { soul, entry, from:[st.def.x, st.def.y], to:[prison.def.x, prison.def.y] } : null;
      if (!prison) this.sentences.push(entry);
      this.log(`🔒 ${soul.who}รับทัณฑ์ครบแล้ว — ส่งเข้าตะรางรอการสำนึก`, 'act');
    }
    if (Number.isFinite(r.coin)) this.coin += r.coin;
    const bonusText = Number.isFinite(r.bonus) && r.bonus > 0
      ? ` (${t('verdict.matchBonus')} +${r.bonus} ${t('verdict.coins')})` : '';
    this.log(`${st.def.heaven ? 'การส่งตัว' : 'ทัณฑ์'}ของ ${soul.who} ครบวาระแล้ว · +${r.coin} เบี้ยกรรม${bonusText}`, 'good');
    // เก็บสำนวนที่ปิดแล้วไว้ให้กดดูเฉลยย้อนหลังได้ในแผงข้อมูล (เก็บ 12 คดีล่าสุดพอ)
    this.closed.unshift({ soul, zone:this.zone, verdict: r, stK: st.def.k, crewK: st.crewK,
                          intensity: slot.intensity, tick: this.tick });
    if (this.closed.length > 12) this.closed.pop();
    st.slots.splice(i, 1);
    // ผู้คุมออกเวรเฉพาะตอนไม่เหลือดวงในหลังนั้นแล้ว
    const keeperK = st.crewK;
    if (!st.slots.length) {
      st.crewK = null;
      if (c) { c.at = null; c.path = null; }
    }
    if (toPrison) this.startAfterlifeWalk(toPrison.soul, toPrison.from, toPrison.to, 'prison', toPrison.entry, keeperK);
  },

  sentenceOf(id, stage) {
    return this.sentences.find(x => x.soul.id === id && x.zone === this.zone && x.stage === stage);
  },

  inspectPrison(id) {
    const x = this.sentenceOf(id, 'prison');
    if (!x || this.tick < x.readyAt) return false;
    if (x.inspected) return true;
    x.inspected = true;
    x.repentant = x.verdict.short <= 0 || Math.random() > RETURN.chance;
    this.log(`📋 นิราตรวจ ${x.soul.who} — ${x.repentant ? 'สำนึกแล้ว ส่งไปประตูสวรรค์ได้' : 'ยังไม่เข็ด ต้องกลับเข้าคิว'}`, x.repentant ? 'good' : 'bad');
    this.onChange();
    return true;
  },

  moveFromPrison(id) {
    const x = this.sentenceOf(id, 'prison');
    if (!x || !x.inspected) return false;
    if (x.repentant) {
      if (!this.stations.some(st => st.def.k === 'sawan' && !st.build)) return false;
      this.sentences.splice(this.sentences.indexOf(x), 1);
      x.stage = 'gate'; x.checked = false;
      x.rewardEligible = x.verdict.right !== false;
      const prison = this.stations.find(st => st.def.k === 'tarang');
      const gate = this.stations.find(st => st.def.k === 'sawan' && !st.build);
      if (prison && !prison.build) this.startAfterlifeWalk(x.soul,
        [prison.def.x, prison.def.y], [gate.def.x, gate.def.y], 'gate', x);
      else this.sentences.push(x);
      this.log(`🕊️ ส่ง${x.soul.who}จากตะรางไปประตูสวรรค์ ให้บุญตรวจกรรม`, 'act');
    } else {
      this.sentences.splice(this.sentences.indexOf(x), 1);
      const R = { fromId:x.soul.id, gave:x.intensity, who:x.soul.who,
        sp:x.soul.sp, sex:x.soul.sex, name:x.soul.name, calm:!!x.soul.calm,
        caseK:x.soul.case || null, deeds:x.soul.deeds.map(d => ({ ...d, known:true })),
        merits:x.soul.merits.filter(m => !m.fake).map(m => ({ ...m })) };
      const soul = this.mkReturnSoul(R);
      const prison = this.stations.find(st => st.def.k === 'tarang' && !st.build);
      const tail = QUEUE_LINE[Math.min(this.queue.length, QUEUE_LINE.length - 1)];
      if (prison) this.startAfterlifeWalk(soul, [prison.def.x, prison.def.y], tail, 'queue');
      else { this.queue.push(soul); this.returned++; }
      this.log(`↩️ ${x.soul.who}ยังไม่เข็ด — นิราส่งกลับเข้าคิวให้ตัดสินใหม่`, 'bad');
    }
    this.onChange();
    return true;
  },

  inspectGate(id) {
    const x = this.sentenceOf(id, 'gate');
    if (!x) return false;
    const sin = x.soul.deeds.reduce((n, d) => n + (d.w || 0), 0);
    const merit = x.soul.merits.filter(m => !m.fake).reduce((n, m) => n + (m.v || 0), 0);
    x.karmaLeft = x.soul.pure ? 0 : Math.max(0, Math.round((sin - merit - x.intensity) * 10) / 10);
    x.checked = true;
    this.log(`📜 บุญตรวจ${x.soul.who} — กรรมคงเหลือ ${x.karmaLeft}`, 'act');
    this.onChange();
    return true;
  },

  resolveGate(id) {
    const x = this.sentenceOf(id, 'gate');
    if (!x || !x.checked) return false;
    this.sentences.splice(this.sentences.indexOf(x), 1);
    if (x.karmaLeft > 0) {
      this.reborn++;
      this.log(`✨ ${x.soul.who}ยังมีกรรม ${x.karmaLeft} — บุญส่งไปเกิดใหม่`, 'good');
    } else {
      this.ascended++;
      const reward = x.rewardEligible === false ? 0 : 60;
      this.coin += reward;
      this.log(`🌟 ${x.soul.who}หมดกรรม — บุญส่งขึ้นสวรรค์${reward ? ` · พ่อให้รางวัล ${reward} เบี้ยกรรม` : ''}`, 'good');
    }
    // The verdict is final; keep only a brief visible departure at the gate.
    const gate = this.stations.find(st => st.def.k === 'sawan' && !st.build);
    if (gate) this.afterlifeWalks.push({ soul:x.soul, destination:'exit',
      path:[[gate.def.x, gate.def.y]], elapsed:0, duration:1050, zone:this.zone,
      exitKind:x.karmaLeft > 0 ? 'reborn' : 'ascended' });
    this.onChange();
    return true;
  },

  /** สร้างวิญญาณที่ถูกส่งกลับเข้าคิว — สำนวนเดิมและกรรมเดิม ไม่แต่งกรรมใหม่ */
  mkReturnSoul(R) {
    // สำนวนที่มีชื่อมีบทถามขากลับได้ แต่ห้ามเพิ่มข้อกล่าวหาใหม่หลังจบชีวิต
    const B = (R.caseK && ALL_CASES.find(c => c.k === R.caseK) || {}).back;
    const soul = {
      id: SEQ++, who: R.who, sp: R.sp, sex: R.sex || SEX_OF[R.who] || 'm', name: R.name,
      case: R.caseK || null,
      waited: 0, said: [],
      deeds: R.deeds.map(d => ({ ...d, known:true })), merits: R.merits, denied: null,
      back: { id: R.fromId, gave: R.gave }, calm: !!R.calm,
      pool: B ? { deny: B.deny, solid: B.solid } : null,
    };
    soul.deserved = deservedOf(soul);
    soul.resist = !soul.calm && soul.deserved >= BAL.resistFrom && Math.random() < BAL.resistChance;
    soul.said.push({ kind: 'confess', text: voice(
      `"ท่านให้{i}ไป ${R.gave} วาระ แต่{i}ยังไม่สำนึก{p} เลยถูกส่งกลับมา ก่อนจะไปเกิดใหม่"`, soul.sex) });
    soul.lines = mkLines(soul, this);
    soul.presses = BAL.presses;
    return applySoulPortrait(soul, R.zone || this.zone);
  },

  // ---------- หนึ่งวาระ ----------
  step() {
    if (this.paused || this.over) return;
    this.tick++;
    if (this.niraRest && --this.niraRest.remaining <= 0) {
      this.niraRest = null;
      const nira = this.crewOf('nira');
      if (nira) nira.path = null;
      this.log('🍵 นิราพักฟื้นครบแล้ว กลับมาช่วยงานตามเดิม', 'good');
    }

    // คดีที่ตัดสินเบาไป — ครบกำหนดแล้วยังไม่สำนึก จึงกลับเข้าคิวเดิม
    for (let i = this.returning.length - 1; i >= 0; i--) {
      if (this.tick < this.returning[i].at) continue;
      const R = this.returning.splice(i, 1)[0];
      const soul = this.mkReturnSoul(R);
      if (R.zone && R.zone !== this.zone && this.zoneSave?.[R.zone])
        this.zoneSave[R.zone].queue.push(soul);
      else this.queue.push(soul);
      this.returned++;
      this.log(`↩️ ${soul.who}ยังไม่สำนึกหลัง ${R.gave} วาระ — ถูกส่งกลับเข้าคิวก่อนเกิดใหม่ ` +
               `(เดิมสำนวน #${String(R.fromId).padStart(3, '0')})`, 'bad');
    }

    // วิญญาณมาใหม่
    if (!this.courtClosed && --this.nextArrive <= 0) {
      this.spawnSoul();
      // ระเบียบเละ = ข้างบนไม่สนใจว่าโซนนี้รับไหวไหม ส่งลงมาถี่ขึ้น
      this.nextArrive = Math.max(5, Math.round(BAL.arriveEvery * this.orderTier().arrive));
    }
    if (!this.courtClosed) this.queue.forEach(s => s.waited++);

    // ---------- เสบียง (ข้อ A คุณเป้ 24 ก.ย. 2569 ชุดที่ 8) ----------
    // ผู้กินคือ "ยมทูตที่กำลังทำงาน" ไม่ใช่สถานี — คุมสถานีอยู่ (มี activeSlots) หรือกำลังเดินออกไปรับดวงใหม่ (escort)
    // ท่านเอง (SELF) ไม่กินเสบียง ไม่มีค่าจ้าง เหมือนเดิม — ไม่มีผลอิ่ม/หิวกับสถานีที่ท่านคุมเอง
    // อิ่ม (เสบียงพอ) = ทำงานไวขึ้น (foodFullMul) · หิว (เสบียงหมด) = ทำงานช้าลง (foodHungryMul) แต่ไม่หยุดสนิท
    const workingCrew = new Set();
    for (const st of this.stations) {
      if (st.build || !st.slots.length || st.fire >= MOB.burnMax) continue;
      const c = this.crewOf(st.crewK);
      if (!c || c.self || c.escort) continue;
      const activeSlots = st.slots.filter(slot => !slot.pendingUntil || Date.now() >= slot.pendingUntil);
      if (activeSlots.length) workingCrew.add(c.k);
    }
    for (const c of this.crew) if (c.escort) workingCrew.add(c.k);
    const workingCount = workingCrew.size;
    let fed = true;
    if (workingCount > 0) {
      const need = BAL.foodEatRate * workingCount;
      fed = this.food >= need;
      this.food = Math.max(0, this.food - (fed ? need : this.food));
      if (!fed && this.tick % 6 === 0)
        this.log('🍙 เสบียงหมด — ยมทูตที่กำลังทำงานอยู่ช้าลง (ยังไม่หยุดงาน)', 'bad');
    }
    this.fed = fed; this.workingCrew = workingCrew;
    const foodMul = workingCount === 0 ? 1 : (fed ? BAL.foodFullMul : BAL.foodHungryMul);

    // ---------- ความหิวรายคน (ข้อ D ชุด 13 คุณเป้ 26 ก.ย. 2569) ----------
    // นี่คือแถบใหม่ แยกจากกองเสบียงกลางด้านบน (this.food/fed/foodMul ไม่ถูกแตะ ยังคุมความเร็วทั้งทีมเหมือนเดิม)
    // c.hunger ของแต่ละคนลดลงเรื่อย ๆ ระหว่างทำงาน — ป้อนข้าวปั้น (feedCrew) แล้วขึ้นทันที โดยหักเสบียง
    // จากกองกลางเดียวกัน (ถ้าป้อนบ่อยจนกองกลางหมดเร็วขึ้น ระบบอัตโนมัติด้านบนก็จะเจอ "หิว" ไวขึ้นด้วย
    // ตั้งใจให้สองระบบเชื่อมกันผ่านทรัพยากรก้อนเดียว ไม่ใช่ของฟรีแยกขาด)
    // ถ้าใครหิวจนหมดแถบ (0) โดนบทลงโทษเพิ่มอีกชั้นหนึ่งเฉพาะตัวเขา (hungerMul) ต่างหากจาก foodMul ของทีม
    for (const k of workingCrew) {
      const c = this.crewOf(k);
      if (c) c.hunger = Math.max(0, (c.hunger ?? 100) - BAL.hungerDrain);
    }

    // สถานีทำงาน
    let hasSala = false;
    for (const st of this.stations) {
      if (st.def.k === 'sala') hasSala = true;
      if (st.build || !st.slots.length) continue;
      if (st.fire >= MOB.burnMax) continue;       // ไหม้จนใช้การไม่ได้ ทัณฑ์หยุดหมด
      const c = this.crewOf(st.crewK);
      if (!c) continue;
      if (!c.self && c.escort) continue;       // ผู้คุมออกไปรับดวงใหม่ งานในสถานีรอเขากลับมาก่อน
      // ยังอยู่ระหว่างเดินทางไปสถานี — ไม่เริ่มลงทัณฑ์ก่อนถึงจริง
      const activeSlots = st.slots.filter(slot => !slot.pendingUntil || Date.now() >= slot.pendingUntil);
      if (!activeSlots.length) continue;
      // คุมหลายดวงพร้อมกัน = แต่ละดวงเดินช้าลง ไม่ใช่ได้ฟรี
      const share = 1 / (0.55 + 0.45 * activeSlots.length);
      // สถานีที่ท่านคุมเอง เดินช้ากว่ามาก และเดินเฉพาะตอนท่านยืนอยู่ตรงนั้นจริง ๆ
      // (จะให้เร็วเท่ายมทูตไม่ได้ ไม่งั้นไม่มีเหตุผลจะจ้างใครเลย) — ไม่กินเสบียง ไม่มีผลอิ่ม/หิว
      if (c.self) {
        const d = Math.hypot((st.def.sx ?? st.def.x) - this.player.x, (st.def.sy ?? st.def.y) - this.player.y);
        if (d > 140) {
          if (this.tick % 10 === 0) this.log(`${st.def.name} หยุดรอ — ท่านคุมเองแต่ไม่ได้ยืนอยู่ตรงนั้น`, 'bad');
          continue;
        }
        for (const slot of [...activeSlots]) {
          slot.progress += st.def.pow * 0.7 * share * (1 + (st.speedLv || 0) * .12);
          if (slot.progress >= slot.need) this.finish(st, slot);
        }
        continue;
      }
      const mf = 0.55 + 0.45 * (c.morale / 100);
      // ข้อ D ชุด 13 — หมดแถบหิวส่วนตัว (0) โดนช้าเพิ่มอีกชั้น เฉพาะคนนั้น แยกจาก foodMul ของทั้งทีม
      const hungerMul = (c.hunger ?? 100) > 0 ? 1 : BAL.hungerPenalty;
      for (const slot of [...activeSlots]) {
        slot.progress += (c.raeng * 0.55 + st.def.pow * 0.9) * mf * share * (1 + (st.speedLv || 0) * .12) * foodMul * hungerMul;
        if (slot.progress >= slot.need) this.finish(st, slot);
      }
      c.morale = Math.max(0, c.morale - BAL.moraleDrain * this.orderTier().morale);
    }

    // บารมีฟื้นเองช้า ๆ ตอนไม่ได้อยู่ในฉากต่อสู้ — ฟื้นได้ถึงเพดานที่ตั้งไว้เท่านั้น
    // (ไม่ได้ให้เต็มฟรี ยังต้องพึ่งห้าดาว/หีบยา/ศาลาน้ำชาถ้าจะเอาเต็ม)
    if (!this.battle && this.hp > 0) {
      const cap = this.hpMax * BAL.hpRegenCap;
      if (this.hp < cap) this.hp = Math.min(cap, this.hp + BAL.hpRegen);
    }

    // พักฟื้นกำลังใจ
    const tea = this.stations.some(s => s.def.k === 'tea');
    for (const c of this.crew) {
      if (!c.at) c.morale = Math.min(100, c.morale + (tea ? BAL.moraleRest * 1.0 + BAL.moraleRestTea * 0.5 : BAL.moraleRest));
    }

    // เปรตกัดกินระเบียบไปเรื่อย ๆ ถ้าไม่ไปปราบ
    if (this.mobs.length) {
      if (!this.courtClosed) this.order = clamp(this.order - MOB.drain * this.mobs.length, 0, 100);
      // ชุด 27D — เลิกหย่อนลูกไฟบนแผนที่ตอน MP หมดแล้ว: ฟาดปกติไม่กิน MP จึงไม่มีทางติดตาย
      // และ MP ฟื้นได้จากนั่งพักศาลาน้ำชา / หอส่องกรรม / น้ำชา / เลื่อนขั้น
    }

    // ชุด 27D คุณเป้ 1 ต.ค. 2569 — เลิกวางของบนแผนที่ให้เดินเก็บ (ทั้งสุ่มเป็นระยะและจากสถานี) "เยอะไป"
    // ได้ของตอนปราบเปรต/ชนะศัตรูแทน ดู winLoot()

    // กรรมของท่านเองที่สูงเกินไป กัดระเบียบของโซนไปด้วย
    const kt = this.karmaTier();
    if (!this.courtClosed && kt.drain) this.order = clamp(this.order - kt.drain, 0, 100);

    // ระเบียบ
    const over = Math.max(0, this.queue.length - this.queueCap());
    if (!this.courtClosed) {
      if (over > 0) this.order = clamp(this.order - BAL.orderDrainPerOver * over, 0, 100);
      else if (hasSala) this.order = clamp(this.order + BAL.orderGainSala, 0, 100);
    }

    // ตะราง: ส่วนที่ขังไว้ต้องเลี้ยงข้าวทุกวาระ — ไม่งั้นมันจะเป็นของฟรีที่ไม่มีข้อเสีย
    if (this.held.length && !this.courtClosed) {
      this.coin -= TARANG.feed * this.held.length;
      this.held.forEach(x => x.waited++);
      if (this.tick % 20 === 0)
        this.log(`🔒 ตะรางขังอยู่ ${this.held.length} ดวง — ค่าข้าว ${(TARANG.feed * this.held.length).toFixed(1)} เบี้ยต่อวาระ`);
    }

    // หอส่องกรรม: เติมพลังให้เองเป็นระยะ จะได้ไม่มีวันตันเพราะของหมด
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — mirror/hypno/roar มีทางได้ของของตัวเองแล้ว (แผนที่+กานต์ / ซื้อจากบุญ / คูลดาวน์เวลาจริง)
    // เหลือแค่ ice ที่ยังพึ่งการเติมอัตโนมัติแบบเดิมนี้อยู่ — ไม่งั้น mirror จะกลายเป็นเติมไม่จำกัดฟรีซ้ำซ้อนกับ
    // ทางที่ตั้งใจไว้ใหม่ (ข้อ 2 ในใบงาน "ให้รับได้เป็นระยะ ไม่ใช่รับไม่จำกัด" หมายถึงสองทางที่ระบุเท่านั้น)
    if (this.has('krajok') && this.tick % KRAJOK.every === 0) {
      if (this.mp < this.mpMax) {
        this.mp = Math.min(this.mpMax, this.mp + 5);
        this.log('🪞 หอส่องกรรมเติม MP ให้ 5', 'good');
      }
    }

    // ค่าแรง — ข้อ A4 คุณเป้ 24 ก.ย. 2569 (ชุดที่ 8): ยมทูตกินเสบียงเป็นค่าจ้างแทนแล้ว ไม่หักเบี้ยกรรมรายวาระอีก
    // เหลือแค่ยักษ์ทวารบาลที่ยังจ่ายเป็นเบี้ยทุกงวดเหมือนเดิม (ไม่ได้คุมสถานี/ออกรับดวง จึงไม่เข้าเงื่อนไข "กำลังทำงาน" ที่กินเสบียง)
    if (!this.courtClosed && --this.nextPay <= 0) {
      if (this.guard) {
        this.coin -= GUARD.pay;
        this.log(`💸 จ่ายค่าแรงยักษ์ทวารบาล — ${GUARD.pay} เบี้ยกรรม`);
      }
      this.nextPay = BAL.payEvery;
    }

    // เหตุการณ์
    if (!this.courtClosed && --this.nextEvent <= 0) {
      const ev = pick(EVENTS);
      this.log(`【${ev.title}】${ev.text}`, 'event');
      ev.apply(this);
      this.pendingEvent = ev;
      this.nextEvent = BAL.eventEvery;
    }

    // พ่อตรวจ
    if (!this.courtClosed && --this.nextKpi <= 0) { this.kpi(); this.nextKpi = BAL.kpiEvery; }

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
      // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — ผู้ตักเตือนเป็นผู้ตรวจการของโซนนั้น ไม่ใช่ "พญายม" ของโซน 1 เสมอไป
      this.pendingOrderWarn = { n: this.orderWarns, of: ORDER_WARN.times,
                                text: fmtAuthority(ORDER_WARN.lines[this.orderWarns - 1] || ORDER_WARN.lines[0], this.zone) };
      this.log(fmtAuthority(`⚠️ พญายมตักเตือนเรื่องคิวล้น (${this.orderWarns}/${ORDER_WARN.times}) — ระเบียบถูกยกให้ตั้งหลักใหม่`, this.zone), 'boss');
      this.onChange();
      return;
    }

    // กรรมเต็ม บารมีหมด หรือระเบียบพังหลังคำเตือนครบ ไม่บังคับเริ่มโซนใหม่แล้ว
    // พ่อลงมาปราบและส่งไปกระทะทองแดง จากนั้นยกค่าขั้นต่ำให้กลับมาตั้งหลักได้
    const punish = this.karma >= 100 ? 'karma'
                 : this.hp <= 0 ? 'hp'
                 : (this.order <= 0 && this.orderWarns >= ORDER_WARN.times) ? 'order' : null;
    if (punish && !this.over && !this.battle && !this.pendingDadPunish) {
      this.dadFight = punish;
      this.startDadFight();
      return;
    }

    if (this.coin <= -300) this.over = {
      k: 'coin', title: 'นรกล้มละลาย',
      text: 'ยมทูตไม่ได้ค่าแรงสามวาระติด ทุกคนวางเครื่องมือแล้วเดินออกไปพร้อมกัน',
    };
    // The ending is awarded by the Zone 4 boss gauntlet, not by a KPI tick.
  },

  /** ลูกไฟจากพญายม — โดนห้าครั้งบารมีหมด */
  fireball(why) {
    this.hits++;
    this.hp -= this.hpMax / 5;
    this.fxHits.push({ t: Date.now(), x: this.player.x, y: this.player.y });
    this.log(`🔥 ลูกไฟจากบัลลังก์ — ${why} · บารมีเหลือ ${Math.max(0, Math.round(this.hp))} (โดนแล้ว ${this.hits}/5)`, 'bad');
    this.checkEnd();
  },

  gainExp(amount, source = 'ต่อสู้') {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.exp += Math.round(amount);
    this.log(`✨ ได้ EXP ${Math.round(amount)} จาก${source}`, 'good');
    while (LEVELS[this.level]?.exp != null && this.exp >= LEVELS[this.level].exp) this.checkLevel();
  },

  checkLevel() {
    const nx = LEVELS[this.level];              // เลเวลถัดไป (index = level เพราะ level เริ่มที่ 1)
    if (!nx || this.exp < nx.exp) return;
    this.level++;
    // ของที่ได้ต้องจับต้องได้ทุกขั้น — พลังที่เพิ่งปลดล็อกต้องมีกระสุนติดมือทันที
    // ไม่งั้นผู้เล่นเห็นแค่ชื่อขั้นเปลี่ยน แล้วก็ยังกดอะไรใหม่ไม่ได้อยู่ดี
    if (this.level >= 2) this.powers.forEach(p => { p.max++; });
    if (this.level >= 3) this.coin += 300;
    if (this.level >= 4) this.coin += 500;
    // ข้อ L คุณเป้เจอ 25 ก.ย. 2569 — บารมีสูงสุดเพิ่มทีละน้อยทุกขั้น (อ่านจาก LEVELS.hpMax ตรง ๆ
    // ไม่ใช่ค่าคงที่ 120 เฉพาะขั้น 4 อีกต่อไป) เต็มให้ทันทีเหมือนพฤติกรรมเดิม
    if (nx.hpMax) { this.hpMax = nx.hpMax; this.hp = this.hpMax; }
    if (nx.mpMax) { this.mpMax = nx.mpMax; this.mp = this.mpMax; }
    this.powers.forEach(p => { if (p.lv <= this.level) p.ammo = Math.max(p.ammo, p.lv === this.level ? p.max : 1); });
    if (this.level >= 5) this.powers.forEach(p => { p.ammo = p.max; });
    // Dale ตรวจชุด 11 พบ 25 ก.ย. 2569 — ของ 'ice' อาจสุ่มตกและถูกเก็บตั้งแต่ก่อนเลเวลปลดล็อกคัมภีร์น้ำแข็ง
    // (dropItem ไม่เช็คเลเวล) ตอนนั้น collectItem เก็บมันไว้เฉยๆ ใน inventory.ice เพราะ powerLocked
    // ถ้าไม่รีโหลดหน้าเว็บ (restore() migrate ให้ตอนโหลดเท่านั้น) ของชิ้นนี้จะค้างกดใช้ไม่ได้ไปตลอด
    // เพราะ useBag บล็อก 'ice'/'fire' แบบไม่มีเงื่อนไขแล้ว (ดู useBag ข้อ H) — กวาดล้างของค้างทันทีที่
    // เลเวลอัพปลดล็อกพลังนั้น ไม่ต้องรอ reload
    this.migrateBagCombatItems();
    this.log(`🎖️ เลื่อนขั้นเป็น "${nx.name}" — ${nx.bonus}`, 'good');
    this.pendingLevel = nx;
    // การเดินทางปลดด้วยบอสประจำสาขา เลเวลใช้เพิ่มค่าพลังเท่านั้น
  },

  /** พลังนี้ปลดล็อกแล้วหรือยัง — ใช้ที่เดียวทั้งเกม (เดิมเช็คจำนวนคดีกระจายอยู่สี่จุด) */
  powerLocked(p) { return this.level < (p.lv || 1); },
  /** เรียกยมทูตมาช่วยในฉากต่อสู้ได้หรือยัง */
  canCallCrew() { return this.level >= CREW_HELP_LV; },

  // ---------- โลกที่เดินได้ ----------
  /** เดินตัวละครทุกตัว เก็บของ ชนเปรต — เดินตามเวลาจริง ไม่ผูกกับวาระ */
  stepWorld(dt) {
    if (this.paused || this.over) return;
    this.syncBlocks();                 // อาคารที่สร้างเสร็จ/ถูกเผาพัง กันทางเดินให้ตรงเสมอ
    // เดินได้เฉพาะพื้นที่เหยียบได้ — ลาวากับแม่น้ำวิญญาณกันไว้ที่ src/walk.js
    const P = this.player, SP = 0.19 * dt;
    // เซฟเก่า (หรือฉากที่วาดใหม่) อาจทำให้ยืนค้างกลางลาวา — ดันขึ้นฝั่งให้เอง
    if (!canWalk(P.x, P.y)) {
      const p = nearestWalk(P.x, P.y);
      if (p) { P.x = p[0]; P.y = p[1]; P.tx = null; P.path = null; }
    }
    // ชุด 27D รอบ 2 — พญายมมานั่งเก้าอี้ (ui.js ตั้ง g.bossUntil ตอนแสดงคำตัดสิน) ถ้ายมบาทยืนทับเขาอยู่
    // ให้ถอยไปยืนข้างแท่นฝั่งขวา (พ้นแถวคิวที่ 880,440) ครั้งเดียวต่อการปรากฏ — ผู้เล่นเดินกลับมาเองได้ ไม่ฉุดซ้ำ
    if (this.bossUntil && this.bossUntil !== this.bossDodged && performance.now() < this.bossUntil) {
      this.bossDodged = this.bossUntil;
      const T = SPOTS.throne;
      if (Math.hypot(P.x - T.x, (P.y - T.y) * 1.6) < 70) this.walkTo(T.x + 116, T.y + 52);
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

    // ยืนตรงนี้แล้วยังเห็นตัวไหม — จุดที่ "ลึกกว่าฐานอาคาร" คือจุดที่อาคารวาดทับทั้งตัว
    // เจ้าของทักซ้ำ 12 ก.ย. 2569 ว่ายมทูตถูกฉากทับ ครึ่งแรกแก้ที่ลำดับการวาด (art.depthOf)
    // ครึ่งหลังคือตรงนี้: ห้ามส่งยมทูตไปยืนในจุดที่ยังไงก็มองไม่เห็นตัว
    const seen = (x, y) => !this.stations.some(st => !st.build && hiddenAt(st.def, x, y));

    // ยมทูตเดินเตร็ดเตร่รอบจุดประจำ แล้วพูดตามนิสัยเป็นระยะ
    for (const c of this.crew) {
      const building = c.buildK ? STATIONS.find(d => d.k === c.buildK) : null;
      const rest = c.k === 'nira' && this.niraRest;
      const post = rest ? this.stations.find(s => s.def.k === 'tea' && !s.build)?.def || STATIONS.find(d => d.k === 'sala')
        : building || (c.at ? STATIONS.find(d => d.k === c.at) : null);
      let hx = post ? post.x : c.hx, hy = post ? post.y : c.hy;
      // จุดประจำบางจุดวางไว้ตั้งแต่ก่อนที่ตัวอาคารจะกันทางเดิน — ตกอยู่ใต้ชายคาพอดี
      // ปล่อยไว้ยมทูตจะยืนจมอยู่ในอาคาร มองไม่เห็นทั้งเกม (เจ้าของเจอ 10 ก.ย. 2569)
      if (!canWalk(hx, hy) || !seen(hx, hy)) {
        const o = nearestWalk(hx, hy, seen);
        if (o) { hx = o[0]; hy = o[1]; }
      }
      if (c.x == null) { c.x = c.hx ?? hx; c.y = c.hy ?? hy; c.face = 1; }

      if (!canWalk(c.x, c.y)) {                 // โดนอาคารที่เพิ่งสร้างทับอยู่ → ดันออกมา
        const o = nearestWalk(c.x, c.y, seen);
        if (o) { c.x = o[0]; c.y = o[1]; c.path = null; }
      }

      // ตอนรับตัว scene.js เป็นผู้วาดตำแหน่งยมทูตกับวิญญาณจาก timeline เดียวกัน
      // ห้ามระบบเดินเล่นขยับตัวจริงซ้อนอยู่ข้างใต้; ถึงสถานีแล้วค่อยคืนให้ระบบปกติ
      if (c.escort) {
        if (this.afterlifeWalks.some(w => w.escort?.k === c.k && w.soul.id === c.escort)) continue;   // 29C: กำลังนำวิญญาณไปตะราง — ตำแหน่งขยับใน advanceAfterlife
        const escort = this.transits.find(v => v.id === c.escort && v.crew === c.k);
        if (escort && Date.now() < escort.arriveAt) continue;
        c.escort = null;
        c.x = hx; c.y = hy; c.path = null; c.wait = 500;
      }

      const job = building && this.stations.find(st => st.def.k === building.k);
      const arriving = job && (job.buildWait || job.repairWait);
      // Count active walking time only; pause/hidden-tab gaps must not trigger a jump.
      // A disconnected path (or a changing building footprint) must not strand a job.
      if (arriving) {
        job.arrivalElapsed = (job.arrivalElapsed || 0) + Math.max(0, Math.min(dt, 120));
        if (job.arrivalElapsed >= 30000 && canWalk(hx, hy)) {
          c.x = hx; c.y = hy; c.path = null;
        }
      }

      // ทัณฑ์ต้องเดินมาถึงพื้นที่ก่อน เวลา BUILD_TIME จึงเริ่มนับจริง
      if (building && Math.hypot(hx - c.x, hy - c.y) < 42) {
        const st = this.stations.find(x => x.def.k === building.k);
        if (st?.buildWait) {
          st.buildWait = false; st.build = Date.now() + BUILD_TIME;
          c.wait = 900;
          // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — "ทัณฑ์" ตรงนี้คือชื่อตัวละคร ไม่ใช่คำว่า "การลงทัณฑ์"
          // ต้องใช้ c.name (ผ่าน crewName() ให้ชื่อตามโซนอยู่แล้ว) ไม่ใช่พิมพ์ "ทัณฑ์" ตรง ๆ
          this.log(`🔨 ${c.name}มาถึง${building.name}แล้ว — เริ่มลงมือก่อสร้าง`, 'act');
        } else if (st?.repairWait) {
          st.repairWait = false; st.repair = Date.now() + REPAIR_TIME;
          c.wait = 900;
          this.log(`🔧 ${c.name}มาถึง${building.name}แล้ว — เริ่มซ่อม`, 'act');
        }
      }
      if (building && this.stations.some(st => st.def.k === building.k &&
          (st.build && !st.buildWait || st.repair && !st.repairWait))) {
        c.x = hx; c.y = hy; c.path = null;
        continue;
      }

      // Pending jobs approach the same walkable/visible point used by arrival.
      // Do not roam in the 42–73.6 unit gap, or follow an obsolete roaming path.
      if (arriving) {
        if (!c.workTarget || c.workTarget[0] !== hx || c.workTarget[1] !== hy) {
          c.workTarget = [hx, hy]; c.path = null; c.wait = 0;
        }
        if (!c.path?.length) {
          c.wait = Math.max(0, (c.wait || 0) - Math.min(dt, 120));
          if (!c.wait) { c.path = findPath(c.x, c.y, hx, hy); c.wait = 200; }
        }
        const w = c.path?.[0];
        if (w) {
          const dx = w[0] - c.x, dy = w[1] - c.y, d = Math.hypot(dx, dy);
          if (d < 5) { c.x = w[0]; c.y = w[1]; c.path.shift(); }
          else {
            const sp = Math.min(0.11 * Math.min(dt, 120), d);
            if (!stepTo(c, dx / d * sp, dy / d * sp)) c.path = null;
            if (Math.abs(dx) > 1) c.face = dx < 0 ? -1 : 1;
          }
        }
        continue;
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
        // จุดหมายต้องเป็นจุดที่ "เห็นตัว" ด้วย ไม่ใช่แค่เดินได้ — ไม่งั้นเดินเล่นไปหลังอาคารแล้วหายไปเฉย ๆ
        const ok = canWalk(tx, ty) && seen(tx, ty) ? [tx, ty] : nearestWalk(tx, ty, seen);
        if (ok) {
          c.path = findPath(c.x, c.y, ok[0], ok[1]);
          // เซฟเก่าอาจจำตัวไว้ในช่องเปิดเล็กใต้ฐานอาคาร: canWalk=true แต่ช่องนั้น
          // ไม่ได้เชื่อมกับแผนที่หลัก จึงหาเส้นทางไม่ได้และยืนนิ่งตลอดไป
          // ถ้ากำลังพยายามกลับจุดประจำแล้วยังออกไม่ได้ ให้ย้ายไปยังพื้นโล่งใกล้บ้านใหม่ทันที
          if (far && !c.path) {
            const rescue = nearestWalk(hx, hy, seen);
            if (rescue) { c.x = rescue[0]; c.y = rescue[1]; c.path = null; }
          }
        }
        c.wait = far ? 200 : 700 + Math.random() * 2600;
      }
      if (!c.sayUntil || Date.now() > c.sayUntil + 9000) {
        if (Math.random() < 0.0006 * dt) {
          c.say = pick(c.says); c.sayUntil = Date.now() + 4200;
        }
      }
    }

    // ของบนแผนที่ด้านนอก — ของที่มาจากสถานีเก็บในฉากภายในของสถานีนั้น
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.from) continue;
      if (Math.hypot(it.x - P.x, it.y - P.y) > 42) continue;
      this.collectItem(i);
    }

    // ---- นั่งร้านถอดออกเมื่อครบเวลา ----
    for (const st of this.stations) {
      if (!st.build || st.buildWait || Date.now() < st.build) continue;
      st.build = 0;
      const builder = this.crew.find(c => c.buildK === st.def.k);
      if (builder) { builder.buildK = null; builder.wait = 0; builder.path = null; }
      const extra = st.buildExtra ?? (this.buildExtra && this.buildExtra.k === st.def.k ? this.buildExtra.text : '');
      this.log(`🏗️ สร้าง${st.def.name}เสร็จแล้ว${extra}`, 'good');
      this.syncBlocks(true);          // นั่งร้านหายแล้ว ตัวอาคารกันทางเดินทันทีในเฟรมเดียวกัน
      this.onChange();
    }

    for (const st of this.stations) {
      if (!st.repair || st.repairWait || Date.now() < st.repair) continue;
      st.repair = 0; st.fire = 0;
      const builder = this.crew.find(c => c.buildK === st.def.k);
      if (builder) { builder.buildK = null; builder.wait = 0; builder.path = null; }
      this.log(`🔧 ซ่อม${st.def.name}เสร็จแล้ว`, 'good');
      this.onChange();
    }

    // ---- เปรตเดินไปเผาอาคาร (9 ก.ย. 2569) ----
    // เดิมมันเดินสุ่มไปมาเฉย ๆ แล้วเกมตัดเข้าฉากต่อสู้ให้ทันทีที่โผล่
    // ตอนนี้มันมีเป้าหมายจริง: อาคารที่ใกล้ที่สุด ปล่อยไว้ก็ไหม้จนพัง
    // 29C: event ชายแดนบุกไม่มีตัวปีศาจเดินบนแผนที่แล้ว (ปีศาจรออยู่ที่ชายแดน) · ของที่ค้างมากับเซฟเก่าเก็บทิ้ง
    this.mobs = this.mobs.filter(m => !m.eventKey || (this.zoneEventStatus(m.eventKey) === 'pending' && !isFrontierBreachEvent(this.zone, m.eventKey)));
    for (const [tag, closed] of Object.entries(this.eventMapClosed)) {
      if (!closed) continue;
      const [zone, key] = tag.split(':');
      if (isFrontierBreachEvent(zone, key)) continue;
      if (zone === this.zone && (key === 'prisonBreak' || key === 'frontierBreach' ||
          (ZONE_EVENTS[zone] || []).some(ev => ev.k === key &&
            (ev.mode === 'waves' || /prison/i.test(ev.k)))))
        this.ensureEventRaider(key);
    }
    const burnable = this.stations.filter(st => st.fire < MOB.burnMax && !st.repair);
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
      let tgt = burnable.find(st => st.fire < MOB.burnMax && st.def.k === m.at);
      if (!tgt) {
        let bd = Infinity;
        for (const st of burnable) {
          if (st.fire >= MOB.burnMax) continue;
          const d = Math.hypot((st.def.bx ?? st.def.x) - m.x, (st.def.by ?? st.def.y) - m.y);
          if (d < bd) { bd = d; tgt = st; }
        }
        m.at = tgt ? tgt.def.k : null;
        m.path = null;
      }
      if (tgt && nearBuilding(tgt, m.x, m.y)) {
        m.path = null;
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

      if (this.huntMob && !this.guard && Math.hypot(m.x - P.x, m.y - P.y) < MOB.fabReach) {
        this.huntMob = false;
        P.path = null; P.tx = null; // หยุดที่ระยะปุ่มสู้ รอผู้เล่นกดเข้าฉาก
      }
    }
    // ความเสียหายคงอยู่หลังไล่เปรต เพื่อให้เรียกทัณฑ์มาซ่อมได้

    // ยักษ์ทวารบาลไล่ปราบเอง
    // ชุดที่ 10 (ข้อ C1) — เอาโหมด "เดินตามผู้เล่น" ออก (คุณเป้สั่ง 25 ก.ย. 2569) เหลือแค่สองสถานะ:
    // ไล่ปราบเปรตที่อยู่ในโซน หรือไม่งั้นกลับไปยืนเฝ้าหัวสะพาน — เซฟเก่าที่ guard.x ค้างอยู่ใกล้ผู้เล่น
    // (จากตอนยังตามอยู่) จะเดินกลับ GUARD_POST เองตามปกติ ไม่ต้อง migrate อะไรเป็นพิเศษ
    const guardTarget = this.mobs.find(m => !m.eventKey);
    if (this.guard && guardTarget) {
      const G = this.guard, m = guardTarget;
      if (!canWalk(G.x, G.y)) {
        const p = nearestWalk(G.x, G.y);
        if (p) { G.x = p[0]; G.y = p[1]; G.path = null; }
      }
      const d = Math.hypot(m.x - G.x, m.y - G.y);
      if (d < MOB.reach) {
        G.path = null;
        this.strike(this.mobs.indexOf(m), GUARD.name);
      } else {
        // The mob moves and may stop against a building; follow a walkable route instead of the blocked straight line.
        if (!G.path?.length || !G.target || Math.hypot(m.x - G.target[0], m.y - G.target[1]) > 32) {
          G.path = findPath(G.x, G.y, m.x, m.y);
          G.target = [m.x, m.y];
        }
        const w = G.path?.[0];
        if (w) {
          const dx = w[0] - G.x, dy = w[1] - G.y, wd = Math.hypot(dx, dy);
          if (wd < 6) { G.x = w[0]; G.y = w[1]; G.path.shift(); }
          else if (!stepTo(G, dx / wd * Math.min(0.075 * dt, wd), dy / wd * Math.min(0.075 * dt, wd))) G.path = null;
        }
        if (Math.hypot(m.x - G.x, m.y - G.y) < MOB.reach) this.strike(this.mobs.indexOf(m), GUARD.name);
      }
    } else if (this.guard) {
      // ว่างงาน → กลับไปเฝ้า "หัวสะพานที่วิญญาณข้ามมา" (เจ้าของสั่ง 10 ก.ย. 2569)
      // เดิมยืนอยู่ท่าเรือฝั่งขวาซึ่งไม่มีอะไรผ่าน มีผีบุกก็ยังวิ่งไปจัดการเหมือนเดิม
      const G = this.guard, gp = GUARD_POST;
      if (Math.hypot(gp[0] - G.x, gp[1] - G.y) < 6) {
        G.x = gp[0]; G.y = gp[1]; G.path = null; G.target = null;
      } else {
        if (!G.path?.length || G.target?.[0] !== gp[0] || G.target?.[1] !== gp[1]) {
          G.path = findPath(G.x, G.y, gp[0], gp[1]);
          G.target = gp;
        }
        const w = G.path?.[0];
        if (w) {
          const dx = w[0] - G.x, dy = w[1] - G.y, wd = Math.hypot(dx, dy);
          // ถึงจุดแวะแล้ว "วางตัวลงบนจุดนั้นเลย" — เส้นตรงจุดแวะถัดไปถูกตรวจว่าโล่งจากจุดนั้นเป๊ะ ๆ
          // ถ้าปล่อยให้ค้างห่างไป 6px แล้วเดินต่อ จะเฉียดกำแพงบางหนึ่งช่องแล้วติด (เฟรมเล็กในเบราว์เซอร์)
          if (wd < 6) { G.x = w[0]; G.y = w[1]; G.path.shift(); }
          else if (!stepTo(G, dx / wd * Math.min(0.075 * dt, wd), dy / wd * Math.min(0.075 * dt, wd))) G.path = null;
        }
      }
    }
  },

  /** ข้อ H คุณเป้เจอ 25 ก.ย. 2569 (แก้เพิ่มโดย Dale ตอนรีวิวชุด 11) — กวาดของ fire/ice ที่ค้างอยู่ใน
   *  กระเป๋าทั่วไป (เก็บมาตั้งแต่ก่อนแพตช์นี้ หรือเก็บตอนพลังยังล็อกอยู่) ให้กลายเป็นกระสุน/พลังพร้อมใช้
   *  ทันที เรียกทั้งตอนโหลดเซฟ (restore) และตอนเลเวลอัพปลดล็อกพลังใหม่ (checkLevel) กันของค้างกดใช้
   *  ไม่ได้ไปตลอดเพราะปุ่ม "ใช้" ในกระเป๋าปิดถาวรสำหรับสองไอเทมนี้แล้ว */
  migrateBagCombatItems() {
    if (this.inventory.fire) {
      this.mp = Math.min(this.mpMax, this.mp + this.inventory.fire * BATTLE.mpCost.fire);
      delete this.inventory.fire;
    }
    if (this.inventory.ice) {
      this.mp = Math.min(this.mpMax, this.mp + this.inventory.ice * BATTLE.mpCost.ice);
      delete this.inventory.ice;
    }
  },

  /** เก็บของด้วย index เดียวกันทั้งแผนที่หลักและฉากภายในสถานี */
  collectItem(i) {
    const it = this.items[i], def = it && ITEMS[it.k];
    if (!it || !def) return false;
    this.discover('item', it.k);
    // ข้อ H คุณเป้เจอ 25 ก.ย. 2569 — ลูกไฟ/คัมภีร์น้ำแข็งใช้ได้เฉพาะฉากต่อสู้ (มีปุ่มของตัวเองในวงคำสั่ง
    // ต่อสู้อยู่แล้ว ดู BATTLE.items/battleAct) เดิมเก็บเข้ากระเป๋าทั่วไปก่อน แล้วต้องเปิดกระเป๋ามากด "ใช้"
    // อีกทีถึงจะเติมเป็นกระสุน/พลังจริง ซึ่งกดได้แม้ไม่ได้ต่อสู้อยู่ (ไม่มีความหมาย ไม่มีศัตรูให้ลง)
    // เปลี่ยนเป็นพร้อมใช้ทันทีที่เก็บแทน ตัวเลข/เพดานเหมือนเดิมทุกอย่าง แค่ย้ายจังหวะเร็วขึ้นมาตอนเก็บ
    // (ปุ่ม "ใช้" ในกระเป๋าปิดถาวรสำหรับสองไอเทมนี้แล้ว ดู bagUseWhy ใน ui.js)
    if (it.k === 'fire') {
      this.mp = Math.min(this.mpMax, this.mp + BATTLE.mpCost.fire);
      this.log(`${def.glyph} เก็บ${def.name} — MP ${Math.round(this.mp)}/${this.mpMax}`, 'good');
    } else if (it.k === 'ice') {
      this.mp = Math.min(this.mpMax, this.mp + BATTLE.mpCost.ice);
      this.log(`${def.glyph} เก็บ${def.name} — MP ${Math.round(this.mp)}/${this.mpMax}`, 'good');
    } else {
      // พลังยังไม่ปลดล็อก (เช่นเก็บคัมภีร์น้ำแข็งก่อนถึงขั้นที่ปลดล็อก) หรือของชิ้นอื่นที่ไม่ใช่สองชิ้นนี้
      // — เก็บเข้ากระเป๋าตามปกติเหมือนเดิมทุกกรณี
      this.inventory[it.k] = (this.inventory[it.k] || 0) + 1;
      this.log(`🎒 เก็บ${def.name}ใส่กระเป๋าแล้ว`, 'good');
    }
    if (it.from) {
      const src = this.stations.find(x => x.def.k === it.from);
      if (src) src.visitCd = this.tick + (src.def.visit?.cool || 4);
    }
    this.items.splice(i, 1);
    this.onChange();
    return true;
  },

  /** ใช้ของที่พกอยู่ ผู้เล่นเป็นคนเลือกจังหวะเอง ไม่กินของทันทีที่เดินผ่าน */
  useBag(k) {
    const def = ITEMS[k], n = this.inventory[k] || 0;
    if (!def || n < 1) return false;
    // ข้อ H คุณเป้เจอ 25 ก.ย. 2569 — ลูกไฟ/คัมภีร์น้ำแข็งใช้ได้เฉพาะฉากต่อสู้เท่านั้น (ปุ่มในกระเป๋า
    // ปิดถาวรแล้ว ดู bagUseWhy ใน ui.js) กันไว้ที่ชั้นข้อมูลด้วยอีกชั้น เผื่อมีทางเรียกอื่นนอก UI ปกติ
    if (k === 'fire' || k === 'ice' || k === 'mirror' || k === 'lotus' || k === 'food') return false;
    if (def.hp && this.hp >= this.hpMax && !(k === 'tea' && this.mp < this.mpMax)) return false;
    if (def.mp && !def.hp && this.mp >= this.mpMax) return false;   // น้ำมนต์ (ชุด 28B) — MP เต็มแล้วไม่กินของ
    if (def.karma < 0 && this.karma <= 0) return false;
    if (def.power) {
      const p = this.powerOf(def.power);
      if (!p || this.powerLocked(p) || p.ammo >= p.max) return false;
      p.ammo = Math.min(p.max, p.ammo + (def.ammo || 1));
      p.cd = 0;
    }
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — ลูกไฟ (item 'fire') เติม g.fireAmmo ของตัวเอง ไม่ผ่านระบบ power/ammo อีกแล้ว
    if (def.fireAmmo) {
      if (this.fireAmmo >= this.fireAmmoMax) return false;
      this.fireAmmo = Math.min(this.fireAmmoMax, this.fireAmmo + def.fireAmmo);
    }
    if (def.hp) this.hp = clamp(this.hp + def.hp, 0, this.hpMax);
    if (k === 'tea') this.mp = Math.min(this.mpMax, this.mp + 12);
    if (def.mp) this.mp = Math.min(this.mpMax, this.mp + def.mp);
    if (def.food) this.food += def.food;
    if (def.karma) this.karma = clamp(this.karma + def.karma, 0, 100);
    if (--this.inventory[k] <= 0) delete this.inventory[k];
    this.log(`${def.glyph ? def.glyph + ' ' : ''}ใช้${def.name} — ${def.say}`, 'good');
    this.onChange();
    return true;
  },

  /** บอก walk.js ว่าตอนนี้มีอาคารกินพื้นที่ตรงไหนบ้าง
   *  วัดจากพิกเซลของสไปรท์จริง (art.footOf) — รูปยังโหลดไม่เสร็จก็ลองใหม่รอบหน้า
   *  เรียกถี่ ๆ ได้ ทำงานจริงเฉพาะตอนรายการสถานีเปลี่ยน */
  syncBlocks(force = false) {
    const sig = artEpoch() + '|' + this.stations.map(st => (st.build ? '~' : '') + st.def.k).join(',');
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
    // ถ้าอาคารเพิ่งสร้างครอบตำแหน่งผู้เล่น ให้ย้ายออกสู่พื้นเดินใกล้ที่สุดทันที
    // ไม่ปล่อยให้เซฟค้างอยู่ในฐานอาคารจนกดเดินไม่ได้อีก
    const insideBase = rects.some(r => this.player.x >= r[0] && this.player.x <= r[2]
                                      && this.player.y >= r[1] && this.player.y <= r[3]);
    if (insideBase || !canWalk(this.player.x, this.player.y)) {
      // ห้ามใช้ nearestWalk จุดเดียว: ช่องบริการของบางหลัง (โดยเฉพาะศาลาน้ำชา)
      // อาจเป็นทางตันที่ปลายชนแม่น้ำ จึงกวาดหารอบฐานจนเจอพื้นจริงนอกอาคาร
      let p = null;
      outer: for (let radius = 32; radius <= 240; radius += 16) {
        for (let i = 0; i < 16; i++) {
          const a = Math.PI / 2 + i * Math.PI / 8;
          const q = [this.player.x + Math.cos(a) * radius,
                     this.player.y + Math.sin(a) * radius];
          if (canWalk(q[0], q[1])
              && !rects.some(r => q[0] >= r[0] && q[0] <= r[2] && q[1] >= r[1] && q[1] <= r[3])) {
            p = q; break outer;
          }
        }
      }
      p ||= nearestWalk(this.player.x, this.player.y + 70);
      if (p) {
        this.player.x = p[0]; this.player.y = p[1];
        this.player.tx = null; this.player.ty = null; this.player.path = null;
      }
    }
    this.blockSig = waiting ? null : sig;         // ยังมีรูปไม่มา — ให้ลองใหม่รอบหน้า
    // ชุด 29C — ผังเดินเปลี่ยนจริง (ภาพ mask เพิ่งโหลดหลังย้ายโซน ฯลฯ) → เส้นทางที่วางไว้ตอนยังไม่มี mask เป็นเส้นตรงข้ามลาวา
    // ตัวละครที่เดินตามมันจะลื่นไถลติดขอบไปเรื่อย ๆ (นิราตอนเข้าโซนใหม่) วางเส้นทางใหม่ให้ตรงกับผังปัจจุบัน
    if (walkVersion() !== this.walkSeen) {
      this.walkSeen = walkVersion();
      const P = this.player;
      if (P.path?.length && P.tx != null) P.path = findPath(P.x, P.y, P.tx, P.ty);
      for (const c of this.crew) if (c.path?.length) { c.path = null; c.wait = 0; }
    }
  },

  /** อาคารไหม้จนใช้การไม่ได้ — ดวงที่ค้างอยู่กลับเข้าคิว รอซ่อมหลังไล่เปรต */
  burnDown(st) {
    if (!this.stations.includes(st)) return;
    for (const slot of st.slots) { slot.soul.beaten = false; this.queue.push(slot.soul); }
    st.slots = [];
    const c = this.crewOf(st.crewK);
    if (c) { c.at = null; c.path = null; }
    st.crewK = null;
    this.order = clamp(this.order - 8, 0, 100);
    this.log(`🔥 ${st.def.name}ถูกเผาจนใช้การไม่ได้ — ระเบียบตก 8 · ไล่เปรตแล้วเรียกทัณฑ์มาซ่อม`, 'bad');
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

  /** ปุ่มสู้ระยะไกลใช้เดินไปหาปีศาจ; ผู้เล่นกดเข้าฉากต่อสู้เมื่อถึงตัว */
  attack() {
    if (this.guard) return false;
    const n = this.nearestMob();
    if (n) {
      if (n.d <= MOB.fabReach) return false;
      if (this.walkTo(n.m.x, n.m.y, true)) {
        this.huntMob = true;
        this.log('เดินเข้าไปหาเปรต — ถึงระยะแล้วกดเข้าฉากต่อสู้', 'act');
        return true;
      }
      this.log('เปรตตนนั้นอยู่ฝั่งที่เดินไปไม่ถึง — รอให้มันเดินเข้ามาก่อน', 'bad');
      return false;
    }
    this.log('ไม่มีเปรตอยู่ใกล้ให้ต่อสู้', 'event');
    return false;
  },

  /** ยักษ์ทวารบาลปราบปีศาจบนแผนที่; ผู้เล่นสู้เองได้เมื่อยังไม่จ้างยักษ์ */
  strike(i, by) {
    const m = this.mobs[i];
    if (!m || by === 'ท่าน') return false;
    if (m.cool && Date.now() < m.cool) return false;
    m.hp--; m.cool = Date.now() + 600;
    this.fxHits.push({ t: Date.now(), x: m.x, y: m.y });
    if (m.hp > 0) { this.log(`⚔️ ${by}ฟาด${MOB.kinds[m.kind ?? 0].nameKey ? t(MOB.kinds[m.kind ?? 0].nameKey) : MOB.kinds[m.kind ?? 0].name}เข้าเต็ม ๆ — มันยังไม่ล้ม`, 'act'); return true; }
    this.mobs.splice(i, 1);
    this.coin += MOB.bounty;
    this.order = clamp(this.order + 3, 0, 100);
    this.log(`💥 ${by}ปราบ${MOB.kinds[m.kind ?? 0].nameKey ? t(MOB.kinds[m.kind ?? 0].nameKey) : MOB.kinds[m.kind ?? 0].name}ได้หนึ่งตน +${MOB.bounty} เบี้ยกรรม · ระเบียบ +3${this.winLoot()}`, 'good');
    return true;
  },

  /** ชุด 27D — ของรางวัลเมื่อปราบเปรต/ชนะศัตรู: 1 ชิ้นต่อชัยชนะ สุ่มจาก MOB.winLoot เข้ากระเป๋าตรง ๆ
   *  คืนข้อความ " · ได้ 🍙ห่อเสบียง" ไว้ต่อท้ายบรรทัดแจ้งผลของผู้เรียก */
  winLoot() {
    const k = pick(MOB.winLoot), def = ITEMS[k];
    this.inventory[k] = (this.inventory[k] || 0) + 1;
    return ` · ${t('loot.got')} ${def.glyph || '🎁'}${def.name}`;
  },

  /** เซฟเก่าที่ยังมีของวางบนแผนที่/ในสถานี — เก็บเข้ากระเป๋าให้หมดตอนโหลด (ใช้ collectItem เดิม:
   *  ลูกไฟ/น้ำแข็งกลายเป็น MP ส่วนที่เหลือเข้ากระเป๋า) เพราะระบบของตกบนแผนที่ถูกยกเลิกแล้ว */
  sweepMapItems() {
    for (let i = this.items.length - 1; i >= 0; i--) if (!this.collectItem(i)) this.items.splice(i, 1);
  },

  /** ตะรางรอวาระมีทุกโซนตั้งแต่ต้น — เซฟ/สาขาเก่าที่ยังไม่มีให้เติมให้ (ไม่ซ้ำถ้ามีแล้ว) */
  ensureTarang() {
    if (!this.stations.some(st => st.def.k === 'tarang')) this.stations.push(mkStation('tarang'));
  },

  buyTeaBed() {
    if (this.teaBeds[this.zone] || this.coin < TEA_BED_COST ||
        !this.stations.some(st => st.def.k === 'tea' && !st.build)) return false;
    this.coin -= TEA_BED_COST;
    this.teaBeds[this.zone] = true;
    this.save(); this.onChange(); return true;
  },
  completeTeaRecovery() {
    this.hp = this.hpMax;
    this.pendingRecovery = null;
    this.save(); this.onChange();
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
    applySoulPortrait(soul, this.zone);
    const hp = scaleFoeHp(this.zone, Math.max(46, Math.round((soul.deserved || 3) * BATTLE.hpPerLv)));
    this.fights++;
    this.battle = {
      kind: 'soul', soulId: soul.id, sex: soul.sex || 'm',
      foeAtk: scaleFoeAtk(this.zone, BATTLE.foeAtk),   // ชุด 28B — ตัวคูณโซนอยู่ใน FOE_SCALE
      // ชื่อสำนวนเป็นคำบรรยายลักษณะแล้ว (ไม่มีชื่อ-นามสกุลจริง 10 ก.ย. 2569)
      // บางเรื่องจึงซ้ำกับ who เกือบทั้งบรรทัด — ซ้ำเมื่อไหร่ไม่ต้องโชว์บรรทัดล่าง
      who: soul.name || soul.who, sub: sameLabel(soul.name, soul.who) ? '' : soul.who, sp: soul.sp || 7,
      youHp: Math.max(24, Math.round(this.hp)), youMax: this.hpMax,
      turn: 1, over: null,
      log: [],
      talk: `"ท่านจะลากข้าไปได้ก็ต่อเมื่อข้าล้มเท่านั้น"`,   // ช่องข้อความโชว์แค่บทพูด
      dmg: null,                                            // เลขความเสียหายรอบล่าสุด {foe,you}
    };
    prepareBattle(this.battle, hp);
    this.onChange();       // เรื่องพักเกมเป็นของ pauseForDlg() ใน ui.js ที่เดียว
    return this.battle;
  },

  /** ฉากต่อสู้กับปีศาจที่ขึ้นมาก่อกวน — ทางต่อสู้ของผู้เล่นทุกตัว */
  startMobBattle(i) {
    if (this.guard) return null;
    if (this.battle) return this.battle;
    const m = this.mobs[i];
    if (!m) return null;
    const kind = MOB.kinds[m.kind ?? 0] || MOB;
    this.fights++;
    this.battle = {
      kind: 'mob', mobId: m.id ?? i, mobIndex: i,
      who: kind.nameKey ? t(kind.nameKey) : kind.name, sub: t('mob.fromRiver'), sp: kind.img,
      foeAtk: scaleFoeAtk(this.zone, MOB.fightAtk),   // ชุด 28B — ตัวคูณโซนอยู่ใน FOE_SCALE
      youHp: Math.max(20, Math.round(this.hp)), youMax: this.hpMax,
      turn: 1, over: null,
      log: [],
      talk: `${kind.name}กระโจนเข้าใส่ ${kind.line || ''}`.trim(),
      dmg: null,
    };
    prepareBattle(this.battle, scaleFoeHp(this.zone, MOB.fightHp));
    this.onChange();       // เรื่องพักเกมเป็นของ pauseForDlg() ใน ui.js ที่เดียว
    return this.battle;
  },

  /** เลือกยมทูตเข้าทีมชายแดน (สูงสุดสองคน) */
  setFrontierTeam(k) {
    const c = this.crew.find(x => x.k === k && !x.reader && !x.self);
    if (!c) return false;
    const state = this.frontierOf();
    const team = state.team;
    const i = team.indexOf(k);
    if (i >= 0) team.splice(i, 1);
    else {
      if (team.length >= FRONTIER.teamMax) return false;
      team.push(k);
    }
    this.save(); this.onChange();
    return true;
  },

  /** เริ่มหนึ่งระลอกที่ชายแดน ใช้ระบบต่อสู้เดิม แต่จำกัดผู้ช่วยตามทีมที่จัดไว้
   *  ข้อ A ชุด 14 — target = ศัตรูตัวที่ผู้เล่นเลือกเองบนแผนที่ชายแดน (src/frontier.js)
   *  { kindIdx, id, level } ไม่ใส่ target (เรียกเฉย ๆ) = พฤติกรรมเดิมทุกประการ (สุ่มตัว) เผื่อเรียกที่อื่น */
  startFrontierBattle(target) {
    if (this.battle || this.over) return null;
    const state = this.frontierOf();
    const available = this.crew.filter(c => !c.reader && !c.self);
    state.team = (state.team || []).filter(k => available.some(c => c.k === k));
    if (!state.team.length && available[0]) state.team = [available[0].k];
    if (!state.team.length) return null;
    // ระดับของตัวนั้นจับตอนมันโผล่บนแผนที่ชายแดน (src/frontier.js en.level) ไม่ใช่ตอนกดเริ่มสู้ —
    // ตัวที่ยืนรออยู่นานไม่ควรยากขึ้นย้อนหลังเพราะเราไปปราบตัวอื่นก่อนหน้าจนระลอกขยับ
    const wave = target?.level || (state.clears || 0) + 1;
    let kind = target && MOB.kinds[target.kindIdx];
    if (!kind) {
      const pool = (this.zoneDef().mobs || []).map(i => MOB.kinds[i]).filter(Boolean);
      kind = pick(pool);
    }
    const hp = scaleFoeHp(this.zone, 64 + wave * 14);   // ชุด 28B — คูณตามโซน
    this.fights++;
    this.battle = {
      // ข้อ K คุณเป้เจอ 25 ก.ย. 2569 — ฉากชายแดนโซน 2-4 มีรูปของตัวเองแล้ว (img/manifest.json
      // zones.*.BG-Frontier-<zone>.webp) แต่เดิม FRONTIER.bg ผูกกับไฟล์โซน 1 ตรง ๆ ไม่ผ่านระบบโซน
      // เลย — zone1 ยังใช้ไฟล์เดิม img/BG-frontier.jpeg (ตัวเล็ก) เหมือนเดิมเป๊ะ ไม่แตะ
      kind:'frontier', zone:this.zone, wave, team:[...state.team],
      frontierMobId: target?.id ?? null,   // ui.js ใช้ตอนจบฉาก — ชนะแล้วลบตัวนี้ออกจากแผนที่ชายแดน
      bg: this.zone === 'th' ? FRONTIER.bg : (artUrl('BG-Frontier', 'jpeg') || FRONTIER.bg),
      who:kind.nameKey ? t(kind.nameKey) : kind.name, sub:`ผู้บุกรุกระลอกที่ ${wave}`, sp:kind.img,
      foeAtk:scaleFoeAtk(this.zone, [8 + Math.floor(wave / 2), 14 + wave]),
      youHp:Math.max(28, Math.round(this.hp)), youMax:this.hpMax,
      turn:1, over:null, log:[], dmg:null,
      talk:`${kind.name}ฝ่าประตูชายแดนเข้ามา ${kind.line || ''}`.trim(),
    };
    prepareBattle(this.battle, hp);
    this.onChange();
    return this.battle;
  },

  bossReady() {
    // The first and last branches use their case-ten story event instead of
    // opening a second, ordinary boss fight on top of it.
    if (this.zone === 'cyberhell' || (this.zone === 'th' && !this.legacyBossGate)) return false;
    return !this.bossCleared[this.zone] && !this.bossGuarding[this.zone] &&
      (this.zoneCases[this.zone] || 0) >= 10 && this.zoneEventGateReady();
  },

  zoneEventGateReady() {
    if (this.zone === 'th' && this.legacyBossGate) return true;
    return (ZONE_EVENTS[this.zone] || []).every(ev =>
      ev.atCases > 9 || this.zoneEventStatus(ev.k) === 'cleared');
  },

  bossCanChallenge() {
    return !this.battle && !this.over && !!this.bossGuarding[this.zone] &&
      !this.bossCleared[this.zone] && this.zoneEventGateReady() &&
      Math.hypot(this.player.x - SPOTS.bossPier.x, this.player.y - SPOTS.bossPier.y) <= 150;
  },

  bossPierCanTalk() {
    return !this.battle && !this.over && !!this.bossCleared[this.zone] &&
      Math.hypot(this.player.x - SPOTS.bossPier.x, this.player.y - SPOTS.bossPier.y) <= 150;
  },

  startZoneBoss(retry = false) {
    const rematch = retry === 'rematch';
    if (this.battle || !(rematch ? this.bossPierCanTalk() : retry === 'alert'
      ? (this.bossReady() || (!!this.bossGuarding[this.zone] && this.zoneEventGateReady()))
      : retry ? this.bossCanChallenge() : this.bossReady())) return null;
    const z = this.zoneDef(), n = ZONES.findIndex(x => x.k === z.k);
    const hp = scaleFoeHp(z.k, 200 + n * 35, 'boss');   // ชุด 28B — ตัวคูณบอส
    this.bossPending = false;
    this.bossWalk = null;
    this.bossGuarding[z.k] = false;
    this.fights++;
    this.battle = {
      kind: 'zoneBoss', zone: z.k, who: z.bossName, sub: z.bossSub,
      // 17 ก.ย. 2569: เดิมต่อ -<zone> เองตรงนี้ แต่ artUrl()/zoneStem() ต่อให้อยู่แล้วทุกคีย์
      // (เหมือน sp:'hero-boss' ด้านล่าง) — ต่อซ้อนสองรอบ เลยหาไฟล์ไม่เจอ บอสโซน 2-4 เลยตกไปใช้
      // spirit7.png (ผีทั่วไป) แทนภาพบอสจริงในฉากต่อสู้ ทั้งที่ไฟล์ zone-boss-<zone>.png มีอยู่แล้ว
      sp: 'zone-boss',
      // แก้รอบ 1 ข้อ C ชุด 13 คุณเป้ 26 ก.ย. 2569 — แฟ้มหลักฐานเป็นโบนัสอัตโนมัติแล้ว (ผูกกับเนื้อเรื่องจริง
      // คือภารกิจสาขาสำเร็จ ไม่ต้องกดปุ่มเลือก) ตัด "ยมทูตคุ้มกัน" (แทนด้วยปุ่มนิรา — จัดทีมจริงดีกว่าโบนัส
      // สถิติลอย ๆ) กับ "เตรียมลูกไฟ" ออก (ซื้อลูกไฟที่พ่อค้าได้แล้ว ดู MERCHANT.stock/buyMerchant)
      youHp: Math.max(24, Math.round(this.hp)), youMax: this.hpMax,
      turn: 1, over: null, log: [], talk: z.bossTalk, dmg: null,
      ultimateUsed:false, ultimateLastTurn:0, ultimate:null,
      prepStarted: false, proofBonus: this.miniGoals[z.k]?.earned ? 24 : 0,
    };
    if (z.k === 'asia' || z.k === 'west') {
      const mob = MOB.kinds[z.mobs[0]];
      const bossHp = hp - (this.miniGoals[z.k]?.earned ? 24 : 0);
      this.battle.foes = [
        { id:`${z.k}-boss`, who:z.bossName, sub:z.bossSub, sp:'zone-boss', boss:true,
          hp:bossHp, maxHp:hp, atk:[14 + n * 2, 22 + n * 3], stun:0, confuse:0 },
        ...Array.from({ length:2 }, (_, i) => ({ id:`${z.k}-demon-${i}`, who:mob.nameKey ? t(mob.nameKey) : mob.name,
          sub:'ผู้ติดตามบอส', sp:mob.img, hp:48 + n * 8, maxHp:48 + n * 8,
          atk:scaleFoeAtk(z.k, [7 + n, 12 + n], 'event'), stun:0, confuse:0 })),
      ];
      this.battle.selectedFoeId = this.battle.foes[0].id;
    }
    prepareBattle(this.battle, hp - (this.miniGoals[z.k]?.earned ? 24 : 0), hp);
    this.onChange();
    return this.battle;
  },

  /** กินหีบยาเติมบารมีระหว่างเตรียมศึก (แก้รอบ 1 ข้อ C ชุด 13 คุณเป้ 26 ก.ย. 2569)
   *  ใช้หีบยาจากกระเป๋าโดยตรง (ITEMS.health) — กินได้หลายครั้งถ้ามีของพอ ไม่ใช่ครั้งเดียวเหมือนของเดิม
   *  ไม่มีของ/บารมีเต็มแล้ว → คืน false (ฝั่ง UI ปิดปุ่มพร้อมชี้ไปปุ่มพ่อค้านรก) */
  useBossMedicine() {
    const b = this.battle;
    if (!b || !this.zoneEventRestReady() && (b.kind !== 'zoneBoss' || b.prepStarted || b.turn !== 1)) return false;
    const n = this.inventory.health || 0;
    if (n < 1 || b.youHp >= b.youMax) return false;
    const def = ITEMS.health;
    b.youHp = Math.min(b.youMax, b.youHp + def.hp);
    if (--this.inventory.health <= 0) delete this.inventory.health;
    this.log(`💊 กินหีบยาเติมบารมี — ฟื้น ${def.hp}`, 'good');
    this.save(); this.onChange();
    return true;
  },

  /** ดื่มน้ำมนต์เติม MP ที่จุดพักก่อนบอส/ศึกสุดท้าย (ชุด 28B) — เงื่อนไขเดียวกับ useBossMedicine เป๊ะ
   *  (เตรียมศึกบอสโซน หรือจุดพักของอีเวนต์หลายระลอก) ไม่มีของ/MP เต็ม → false
   *  MP เป็นของผู้เล่นทั้งเกม (g.mp) ไม่ใช่ของฉากต่อสู้ จึงเพิ่มที่ g.mp ตรง ๆ */
  useHolyWater() {
    const b = this.battle;
    if (!b || !this.zoneEventRestReady() && (b.kind !== 'zoneBoss' || b.prepStarted || b.turn !== 1)) return false;
    const def = ITEMS.holyWater;
    if ((this.inventory.holyWater || 0) < 1 || this.mp >= this.mpMax) return false;
    const gain = Math.min(def.mp, this.mpMax - this.mp);
    this.mp += gain;
    if (--this.inventory.holyWater <= 0) delete this.inventory.holyWater;
    this.log(`ดื่ม${def.name} — MP +${gain}`, 'good');
    this.save(); this.onChange();
    return true;
  },

  /** กดปุ่ม "เข้าสู้" แยกจากปุ่มเตรียมศึก (ข้อ C ชุด 13) — เลือกเตรียมศึกไปแล้วกี่อย่างก็ได้ (0-3)
   *  กดปุ่มนี้เมื่อไหร่ค่อยเปิดวงคำสั่งต่อสู้จริง จะได้ไม่พลาดกดแค่ทีเดียวแล้วเข้าเลย */
  startBossFight() {
    const b = this.battle;
    if (!b || b.kind !== 'zoneBoss' || b.prepStarted || b.turn !== 1) return false;
    b.prepStarted = true;
    this.onChange();
    return true;
  },

  /** ฉากที่ไม่มีทางชนะ — บารมีหมดแล้วพ่อลงมาเอง (แทนหน้าจอจบเกมแบบเดิม) */
  startYamaFight() {
    if (this.battle) return this.battle;
    this.battle = {
      kind: 'yama', who: 'พญายมบาท', sub: 'ผู้เป็นพ่อของท่าน', sp: 'hero-boss',
      youHp: 1, youMax: this.hpMax, turn: 1, over: null,
      log: [], talk: YAMA_FIGHT.line1, dmg: null,
    };
    prepareBattle(this.battle, YAMA_FIGHT.hp);
    this.onChange();       // เรื่องพักเกมเป็นของ pauseForDlg() ใน ui.js ที่เดียว
    return this.battle;
  },

  /** พ่อลงมาตบเองเพราะตัดสินพลาดติดกันสามสำนวน — ไม่ใช่จบเกม
   *  ตบทีเดียวเหลือบารมี DAD.hpLeft แล้วเกมเดินต่อ (เจ้าของสั่ง 9 ก.ย. 2569) */
  startDadFight() {
    if (this.battle) return this.battle;
    const reason = typeof this.dadFight === 'string' ? this.dadFight : 'verdict';
    this.dadFight = false;
    // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — โซน 2-4 ใช้ชื่อ+บทบาทของผู้ตรวจการโซนนั้นแทน "พญายมบาท/ผู้เป็นพ่อของท่าน"
    const auth = authorityOf(this.zone);
    this.battle = {
      kind: 'dad', who: auth.full, sub: auth.role, sp: 'hero-boss',
      youHp: Math.max(1, Math.round(this.hp)), youMax: this.hpMax,
      turn: 1, over: null, log: [], reason,
      talk: reason === 'karma' ? '"กรรมของเจ้าเต็มบัญชีแล้ว ถึงเวลารับผลด้วยตัวเอง"'
          : reason === 'order' ? '"ข้าเตือนเรื่องคิวล้นครบแล้ว คราวนี้เจ้าต้องรับผลเอง"'
          : reason === 'hp' ? '"แม้แต่บารมีของตนเองยังรักษาไว้ไม่ได้หรือ"'
          : DAD.line1,
      dmg: null,
    };
    prepareBattle(this.battle, YAMA_FIGHT.hp);
    this.onChange();
    return this.battle;
  },

  prisonBreakStatus(zone = this.zone) {
    return this.zoneEvents[zone]?.prisonBreak || 'locked';
  },
  frontierBreachStatus(zone = this.zone) {
    return this.zoneEvents[zone]?.frontierBreach || 'locked';
  },
  /** ชุด 29C ข้อ 9 — event ปีศาจชายแดนบุก 3 ช่วง: (1) หน้าต่างแจ้งเตือน (2) ผู้เล่นเดินไปชายแดนเอง (3) ถึงแล้วเปิดหน้าต่างเตรียมทีม
   *  ไม่มีตัวจับเวลา — event รอได้ไม่จำกัด เดินไปถึงเมื่อไรก็ได้ · ช่วง (2) คือ "สถานะ pending + ผู้เล่นรับทราบแล้ว (eventMapClosed)"
   *  ทั้งสองค่าเซฟอยู่แล้ว (status 'active' ที่ค้างจะกลับเป็น pending ตอนโหลด) จึงเซฟ/โหลดกลางทางแล้ว event ยังค้างถูกต้องโดยไม่ต้องมีฟิลด์ใหม่
   *  คืน { key, ev } ของ event ที่ต้องไปชายแดน หรือ null */
  breachMarch() {
    if (this.battle || this.over) return null;
    for (const ev of ZONE_EVENTS[this.zone] || []) {
      if (ev.team !== 'frontier' || this.zoneEventStatus(ev.k) !== 'pending') continue;
      if (ev.k === 'frontierBreach' && this.devaTestStatus() !== 'cleared') continue;
      if (this.eventMapClosed[`${this.zone}:${ev.k}`]) return { key:ev.k, ev };
    }
    return null;
  },
  /** ยมบาทถึงประตูชายแดนแล้วหรือยัง (ระยะเดียวกับปุ่ม "เข้าด่านชายแดน") */
  nearFrontierGate(pad = 0) {
    return Math.hypot(this.player.x - FRONTIER.x, this.player.y - FRONTIER.y) <= FRONTIER.reach + pad;
  },
  dismissEventAlert(key, raider = false) {
    this.eventMapClosed[`${this.zone}:${key}`] = true;
    if (raider) this.ensureEventRaider(key);
    this.save();
  },
  ensureEventRaider(key) {
    if (this.zoneEventStatus(key) !== 'pending' || this.mobs.some(m => m.eventKey === key)) return;
    const kind = this.zone === 'west' ? 10 : this.zone === 'cyberhell' ? 11 : this.zone === 'asia' ? 6 : 0;
    const p = nearestWalk(760, 680) || [760, 680];
    this.mobs.push({ id:SEQ++, x:p[0], y:p[1], hp:MOB.hp, kind, eventKey:key,
      eventArt:this.zone === 'th' && key === 'prisonBreak' ? 'spirit7' : null });
  },
  devaTestStatus(zone = this.zone) {
    return this.zoneEvents[zone]?.devaTest || 'locked';
  },
  zoneEventStatus(key, zone = this.zone) {
    return this.zoneEvents[zone]?.[key] || 'locked';
  },
  refreshZoneEvents(zone = this.zone) {
    const states = this.zoneEvents[zone] ||= {};
    for (const ev of ZONE_EVENTS[zone] || []) {
      if (states[ev.k] || (this.zoneCases[zone] || 0) < ev.atCases) continue;
      if ((ev.requires || []).every(key => states[key] === 'cleared')) {
        states[ev.k] = 'pending';
        if (zone === this.zone && ev.k === 'asiaPrisonFire') {
          const st = this.stations.find(s => s.def.k !== 'sala' && !s.build) || this.stations.find(s => !s.build);
          if (st) { st.fire = MOB.burnMax; this.burnDown(st); }
        }
      }
    }
    return states;
  },
  zoneEventFoes(ev, wave = 1) {
    const groups = ev.mode === 'waves' ? ev.waves[wave - 1] : ev.foes || [ev.foe];
    const zone = Object.keys(ZONE_EVENTS).find(z => ZONE_EVENTS[z].includes(ev)) || this.zone;
    return (groups || []).flatMap((entry, group) => Array.from({ length:entry.count || 1 }, (_, i) => {
      const mob = MOB.kinds[entry.kind ?? 0];
      const kindOf = entry.boss ? 'boss' : 'event';   // ชุด 28B
      const hp = scaleFoeHp(zone, entry.hp, kindOf);
      return { id:`${ev.k}-${wave}-${group}-${i}`, who:entry.name || (mob.nameKey ? t(mob.nameKey) : mob.name),
        sub:ev.mode === 'waves' ? `ระลอก ${wave}/${ev.waves.length}` : '',
        sp:entry.sp || mob.img, boss:!!entry.boss,
        hp, maxHp:hp, atk:scaleFoeAtk(zone, entry.atk, kindOf), stun:0, confuse:0 };
    }));
  },
  startZoneEvent(key) {
    const ev = (ZONE_EVENTS[this.zone] || []).find(e => e.k === key);
    if (!ev || this.battle || this.over || this.zoneEventStatus(key) !== 'pending') return null;
    const foes = this.zoneEventFoes(ev, 1);
    if (!foes.length) return null;
    const state = this.zoneEvents[this.zone];
    state[key] = 'active'; this.fights++;
    // 29C: ศึกระลอกชายแดนใช้ทีมที่จัดไว้ในหน้าต่างเตรียมทีมที่ชายแดน (เดิมใช้ทีมของโต๊ะนิรา ทำให้ที่เลือกไว้ไม่มีผล)
    const frontierTeam = ev.team === 'frontier'
      ? this.frontierOf().team.filter(k => this.crewHelpers().some(c => c.k === k)) : [];
    this.battle = prepareBattle({ kind:'zoneEvent', eventKey:key, zone:this.zone,
      ...(frontierTeam.length ? { team:[...frontierTeam] } : {}),
      wave:1, pendingWave:null, foes, selectedFoeId:foes[0].id,
      who:foes[0].who, sub:foes[0].sub, sp:foes[0].sp,
      youHp:Math.max(28, Math.round(this.hp)), youMax:this.hpMax,
      turn:1, over:null, log:[], dmg:null, talk:ev.alert.th });
    if (key === 'cyberFinal') this.battle.storyInterlude = 'cyber-approach';
    this.save(); this.onChange(); return this.battle;
  },
  zoneEventRestReady() {
    const b = this.battle;
    const ev = b?.kind === 'zoneEvent' && ZONE_EVENTS[b.zone]?.find(e => e.k === b.eventKey);
    return !!(ev && !b.over && b.foes.every(f => f.hp <= 0) && ev.restBeforeWaves?.includes(b.pendingWave));
  },
  advanceZoneEventWave(resume = false) {
    const b = this.battle;
    if (b?.kind !== 'zoneEvent' || b.over || !b.pendingWave || b.pendingWave !== b.wave + 1) return false;
    const ev = ZONE_EVENTS[b.zone]?.find(e => e.k === b.eventKey);
    if (!ev?.waves?.[b.pendingWave - 1]) return false;
    // Animation callbacks cannot skip the two rest stops. Only the player's
    // explicit continue button resumes a completed combat stage.
    if (this.zoneEventRestReady() && !resume) return false;
    b.wave = b.pendingWave; b.pendingWave = null;
    b.foes = this.zoneEventFoes(ev, b.wave);
    b.selectedFoeId = b.foes[0].id; b.counterIndex = 0;
    b.who = b.foes[0].who; b.sub = b.foes[0].sub; b.sp = b.foes[0].sp;
    b.youHp = Math.min(b.youMax, b.youHp + (ev.betweenWaveHeal || 0));
    b.dmg = null; b.mid = null; b.helper = null;
    b.talk = `${ev.title.th} — ระลอก ${b.wave}/${ev.waves.length}`;
    if (b.eventKey === 'cyberFinal' && (b.wave === 4 || b.wave === 8))
      b.storyInterlude = b.wave === 4 ? 'cyber-control' : 'cyber-duel';
    this.onChange(); return true;
  },
  startDevaTest() {
    if (this.zone !== 'th' || this.battle || this.over || this.devaTestStatus() !== 'pending' ||
        this.prisonBreakStatus() !== 'cleared') return null;
    const event = ZONE_EVENTS.th[2];
    const devaHp = scaleFoeHp('th', event.foe.hp, 'boss');   // ชุด 28B
    const foe = { id:'deva-test', who:t('event.devaTest.foe'), sub:t('event.devaTest.sub'),
      sp:event.foe.sp, boss:true, hp:devaHp, maxHp:devaHp,
      atk:event.foe.atk, stun:0, confuse:0 };
    this.zoneEvents.th.devaTest = 'active';
    this.fights++;
    this.battle = prepareBattle({ kind:'devaTest', zone:'th', foes:[foe],
      who:foe.who, sub:foe.sub, sp:foe.sp,
      youHp:Math.max(28, Math.round(this.hp)), youMax:this.hpMax,
      turn:1, over:null, log:[], dmg:null, talk:t('event.devaTest.alert') });
    this.save(); this.onChange();
    return this.battle;
  },
  frontierBreachFoes(wave) {
    return ZONE_EVENTS.th[1].waves[wave - 1].flatMap((entry, group) =>
      Array.from({ length:entry.count }, (_, i) => {
        const kind = MOB.kinds[entry.kind ?? 0];
        const boss = !!entry.boss;
        return { id:`breach-${wave}-${group}-${i}`, who:boss ? t('event.frontierBreach.boss') : kind.name,
          sub:boss ? t('event.frontierBreach.bossSub') : `Wave ${wave}/${ZONE_EVENTS.th[1].waves.length}`,
          sp:boss ? entry.sp : kind.img, boss,
          hp:scaleFoeHp('th', entry.hp, boss ? 'boss' : 'event'), maxHp:scaleFoeHp('th', entry.hp, boss ? 'boss' : 'event'), atk:entry.atk, stun:0, confuse:0 };
      }));
  },
  startFrontierBreach() {
    if (this.zone !== 'th' || this.battle || this.over || this.frontierBreachStatus() !== 'pending' ||
        this.devaTestStatus() !== 'cleared') return null;
    const team = this.frontierOf().team.filter(k => this.crewHelpers().some(c => c.k === k));
    if (!team.length) return null;
    const foes = this.frontierBreachFoes(1);
    this.zoneEvents.th.frontierBreach = 'active';
    this.fights++;
    this.battle = prepareBattle({ kind:'frontierBreach', zone:'th', wave:1, pendingWave:null,
      team:[...team], bg:FRONTIER.bg, foes, selectedFoeId:foes[0].id,
      who:foes[0].who, sp:foes[0].sp, sub:foes[0].sub,
      youHp:Math.max(28, Math.round(this.hp)), youMax:this.hpMax,
      turn:1, over:null, log:[], dmg:null, talk:t('event.frontierBreach.alert') });
    this.save(); this.onChange();
    return this.battle;
  },
  advanceFrontierBreachWave() {
    const b = this.battle;
    if (b?.kind !== 'frontierBreach' || b.over || !b.pendingWave || b.pendingWave !== b.wave + 1) return false;
    b.wave = b.pendingWave;
    b.pendingWave = null;
    b.foes = this.frontierBreachFoes(b.wave);
    b.selectedFoeId = b.foes[0].id;
    b.counterIndex = 0;
    b.who = b.foes[0].who; b.sp = b.foes[0].sp; b.sub = b.foes[0].sub;
    b.youHp = Math.min(b.youMax, b.youHp + ZONE_EVENTS.th[1].betweenWaveHeal);
    b.dmg = null; b.mid = null; b.helper = null;
    b.talk = t('event.frontierBreach.next');
    this.onChange();
    return true;
  },
  startPrisonBreak() {
    if (this.zone !== 'th' || this.battle || this.over || this.prisonBreakStatus() !== 'pending') return null;
    const event = ZONE_EVENTS.th[0];
    const spirits = [1, 2, 3, 4, 5, 6, 7];
    for (let i = spirits.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spirits[i], spirits[j]] = [spirits[j], spirits[i]];
    }
    const foes = spirits.slice(0, 3).map((sp, i) => ({ id:`prison-${i + 1}`, who:t('event.prisonBreak.foe'),
      sub:`${i + 1}/3`, sp, hp:event.foes[0].hp, maxHp:event.foes[0].hp,
      atk:event.foes[0].atk, stun:0, confuse:0 }));
    this.zoneEvents.th.prisonBreak = 'active';
    this.fights++;
    this.battle = prepareBattle({ kind:'prisonBreak', foes, selectedFoeId:foes[0].id,
      who:t('event.prisonBreak.foe'), youHp:Math.max(24, Math.round(this.hp)), youMax:this.hpMax,
      turn:1, over:null, log:[], talk:t('event.prisonBreak.alert'), dmg:null });
    this.save(); this.onChange();
    return this.battle;
  },
  selectFoe(id) {
    const b = this.battle, foe = b?.foes.find(f => f.id === id && f.hp > 0);
    if (!foe || b.over) return false;
    b.selectedFoeId = id;
    this.onChange();
    return true;
  },

  /** เรียกยมทูตในสังกัดมาช่วยหนึ่งที — เสียกำลังใจของเขา แล้วต้องรอรอบ */
  /** ยมทูตที่เรียกมาช่วยในฉากต่อสู้ได้ — คืนทุกคนเสมอ (ยังไม่ปลดล็อกก็โชว์ปุ่มไว้ให้เห็น
   *  ว่ามีของแบบนี้อยู่ · เจ้าของ 10 ก.ย. 2569 นึกว่าไม่มีปุ่มนี้ในฉากสู้กับวิญญาณ) */
  crewHelpers() {
    return this.crew.filter(c => !c.reader && !c.self);
  },
  battleCrew() {
    const keys = this.battle?.team || this.party?.members || [];
    return this.crewHelpers().filter(c => keys.includes(c.k)).slice(0, 2);
  },
  crewCooldown(c, now = Date.now()) {
    return Math.min(BATTLE.crewCd, Math.max(0, Math.ceil(((c?.helpReadyAt || 0) - now) / 1000)));
  },
  crewHelpWhy(c) {
    if (!c || !this.battleCrew().some(x => x.k === c.k)) return 'ต้องจัดเข้าทีมก่อนต่อสู้';
    const remaining = this.crewCooldown(c);
    if (remaining) return `รออีก ${remaining} วินาที`;
    if (c.morale < BATTLE.crewMin) return 'กำลังใจไม่พอ';
    return '';
  },

  /** ยักษ์ทวารบาล (ข้อ C คุณเป้ 25 ก.ย. 2569) — เข้าช่วยฉากต่อสู้เองอัตโนมัติถ้าจ้างไว้แล้ว
   *  ไม่ต้องจัดเข้าทีม 2 คนเหมือนยมทูต · คูลดาวน์ของตัวเอง (GUARD.battleCd) ดูแบบเดียวกับ crewCooldown */
  guardCooldown(now = Date.now()) {
    return Math.min(GUARD.battleCd, Math.max(0, Math.ceil(((this.guard?.helpReadyAt || 0) - now) / 1000)));
  },
  guardHelpWhy() {
    if (!this.guard) return 'ยังไม่ได้จ้างยักษ์ทวารบาล';
    const remaining = this.guardCooldown();
    if (remaining) return `รออีก ${remaining} วินาที`;
    return '';
  },

  /** หนึ่งตาในฉากต่อสู้ — what = 'atk' | 'fire' | 'crew:<k>' | ชื่อของใน BATTLE.items
   *  คืน false ถ้ากดไม่ได้ (ของไม่พอ / จบไปแล้ว) */
  battleAct(what) {
    const B = this.battle;
    if (!B || B.over || B.pendingWave) return false;
    const target = B.foes.find(f => f.id === B.selectedFoeId && f.hp > 0);
    if (!target) return false;
    const roll = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
    // log เก็บไว้ในเครื่องเฉย ๆ ไม่ได้เอาไปโชว์แล้ว — ช่องข้อความโชว์ B.talk อย่างเดียว
    // (เจ้าของสั่ง 8 ก.ย. 2569: "เหลือแค่คำพูดของวิญญาณก็พอ log ตัดออก")
    const say = t => { B.log.push(t); if (B.log.length > 12) B.log.shift(); };
    const TALK = B.kind === 'mob' ? MOB_TALK : FOE_TALK;
    const talk = k => { const p = TALK[k]; if (p && p.length) B.talk = voice(pick(p), B.sex || 'm'); };
    B.dmg = { foe: 0, you: 0 };
    B.ultimate = null;

    // ---- ฝั่งพญายม: ทำอะไรก็จบเหมือนกัน ----
    // ทั้งสองฉากพ่อเป็นบทลงโทษระดับสุดท้าย: แพ้แล้วจบโซนนี้
    if (B.kind === 'yama' || B.kind === 'dad') {
      const dad = B.kind === 'dad';
      say(pick(YAMA_FIGHT.taunt));
      // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — ฉาก "พ่อลงมาเอง" (kind:'dad' เท่านั้น — kind:'yama' คือฉากจบเกม
      // จริงตอนบารมีหมด ไม่แตะตามใบงานเดิม) ใช้บทของผู้ตรวจการโซนนั้นแทน "พญายม" ของโซน 1
      B.talk = `${pick(YAMA_FIGHT.taunt)}\n${dad ? fmtAuthority(DAD.line2, this.zone) : YAMA_FIGHT.line2}`;
      B.youHp = 0;
      B.over = 'lose';
      B.dmg = { foe: 0, you: 999 };
      say(dad ? fmtAuthority(DAD.line3, this.zone) : YAMA_FIGHT.line3);
      this.onChange();
      return true;
    }

    let dmg = 0, stunFoe = 0, confuseFoe = 0;
    if (what === 'atk') {
      dmg = roll(BATTLE.atk) + (this.level - 1) * 2;
      const crit = Math.random() < BATTLE.crit;
      if (crit) dmg = Math.round(dmg * 1.7);
      say(`⚔️ ท่านฟาดเข้าเต็มแรง — ${dmg} หน่วย${crit ? ' (เข้าเต็ม ๆ)' : ''}`);

    } else if (typeof what === 'string' && what.startsWith('crew:')) {
      const c = this.crew.find(x => x.k === what.slice(5));
      if (!c || this.crewHelpWhy(c)) return false;
      c.helpReadyAt = Date.now() + BATTLE.crewCd * 1000;
      c.morale = Math.max(0, c.morale - BATTLE.crewMorale);
      // ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — ค่าพลังยึด CREW_POWER ที่เดียวกับการ์ดทีม/แท็บข้อมูล ไม่สุ่มอีกต่อไป
      // trainDmg × c.upLv = ระบบฝึก "แรง" เดิม (upgradeCrew) ต่อยอดบนฐานใหม่ ไม่ได้ตัดทิ้ง
      const pw = CREW_POWER[c.k] || {};
      const trained = (c.upLv || 0) * (pw.trainDmg || 0);
      // ข้อ A ชุด 13 — กานต์/บุญ ร่ายจากที่เดิม ไม่พุ่งเข้าใส่ (lunge:false) ui เอาไปกันไม่ให้วาดท่าพุ่ง
      B.helper = { k: c.k, name: c.name, at: Date.now(), lunge: !(c.k === 'boon' || c.k === 'kan') };
      if (c.k === 'boon') {
        const heal = Math.min(pw.heal, B.youMax - B.youHp);
        B.youHp += heal;
        say(`${c.name}ฟื้นบารมีให้ ${heal} หน่วย`);
        B.talk = `${c.name}: "ตั้งสติก่อนนะครับท่าน ผมช่วยฟื้นบารมีให้แล้ว"`;
      } else if (c.k === 'kan') {
        confuseFoe = pw.confuse || 1;
        say(`${c.name}สะกดจิตศัตรู — ตาถัดไปเขาจะฟาดใส่ตัวเอง`);
        B.talk = `${c.name}: "ผมสะกดให้เขาหลงตัวเองแล้ว ท่านลงมือได้เลย"`;
      } else {
        dmg = pw.dmg + trained;
        say(`${c.name}${c.k === 'plerng' ? 'ปล่อยไฟ' : 'เข้าช่วยโจมตี'} — ${dmg} หน่วย`);
        B.talk = `${c.name}: "ท่านถอยไปก่อน เดี๋ยวผมจัดการเอง"`;
      }
      this.save(); // เก็บเวลาพร้อมใช้ไว้ ปิด/เปิดหน้าใหม่ก็ไม่ล้างคูลดาวน์

    } else if (what === 'guard') {
      // ข้อ C คุณเป้ 25 ก.ย. 2569 — ยักษ์ทวารบาลเข้าช่วยตีได้เองถ้าจ้างไว้แล้ว ไม่กินโควตาทีมยมทูต
      if (this.guardHelpWhy()) return false;
      this.guard.helpReadyAt = Date.now() + GUARD.battleCd * 1000;
      B.helper = { k: 'guard', name: GUARD.name, at: Date.now(), lunge: true };
      dmg = CREW_POWER.guard.dmg + (this.guard.upLv || 0) * (CREW_POWER.guard.trainDmg || 0);
      say(`${GUARD.name}ฟาดเข้าเต็มแรง — ${dmg} หน่วย`);
      B.talk = `${GUARD.name}: "ถอยไปเถอะท่าน ข้าจัดการเอง"`;
      this.save();

    } else if (what === 'fire') {
      // ข้อ A คุณเป้ 24 ก.ย. 2569 — ลูกไฟกินกระสุนของตัวเอง (g.fireAmmo) ไม่ใช่ ammo ของตวาดข่มขู่แล้ว
      // ข้อ B ชุด 13 — 40 คงที่ ไม่สุ่มอีกต่อไป
      if (this.mp < BATTLE.mpCost.fire) return false;
      this.mp -= BATTLE.mpCost.fire;
      dmg = BATTLE.fireDmg + (this.abilities.bigFire ? 20 : 0) + (this.level - 1) * 2;
      say(`🔥 ลูกไฟพุ่งเข้ากลางตัว — ${dmg} หน่วย (MP ${this.mp}/${this.mpMax})`);

    } else if (what === 'flameCharge') {
      if (!this.abilities.flameCharge || this.mp < BATTLE.mpCost.charge) return false;
      this.mp -= BATTLE.mpCost.charge;
      dmg = 65 + (this.level - 1) * 3;
      say(`🔥 ยมบาทน้อยพุ่งชนด้วยเพลิงทั่วตัว — ${dmg} หน่วย (MP ${this.mp}/${this.mpMax})`);

    } else if (what === 'windFan') {
      if (!this.abilities.windFan || this.mp < BATTLE.mpCost.wind) return false;
      this.mp -= BATTLE.mpCost.wind;
      dmg = 36 + (this.level - 1) * 2;
      say(`🌪️ พัดสายลมซัดศัตรูทุกคน — คนละ ${dmg} หน่วย`);

    } else if (what === 'rage') {
      if (!this.abilities.rage || B.rageTurns > 0 || B.rageCooldown > 0 || this.mp < BATTLE.mpCost.rage) return false;
      this.mp -= BATTLE.mpCost.rage;
      B.rageTurns = 3;
      say('🔥 พลังบ้าคลั่งปกคลุมยมบาทน้อย — การโจมตี 3 ครั้งถัดไปแรงขึ้น');

    } else if (what === 'valkyrieSpear') {
      if (!this.abilities.valkyrieSpear || this.mp < BATTLE.mpCost.spear) return false;
      this.mp -= BATTLE.mpCost.spear;
      dmg = 88 + (this.level - 1) * 3;
      say(`🔱 หอกวาคิวรีแทงตรงไปยังศัตรู — ${dmg} หน่วย`);

    } else if (what === 'cooldownClock') {
      const cost = BATTLE.mpCost.clock ?? 16;
      if (!this.abilities.cooldownClock || B.clockUsed || this.mp < cost) return false;
      this.mp -= cost;
      B.clockUsed = true;
      for (const c of this.crew) if (c.helpReadyAt) c.helpReadyAt = 0;
      if (this.guard?.helpReadyAt) this.guard.helpReadyAt = 0;
      for (const p of this.powers) if (p.readyAt) p.readyAt = 0;
      say('⏱️ นาฬิกาย้อนคูลดาวน์ — ยมทูตและยักษ์พร้อมช่วยอีกครั้ง');
      this.save();

    } else if (what === 'hypno' && this.abilities.hypno) {
      if (this.mp < BATTLE.mpCost.hypno) return false;
      this.mp -= BATTLE.mpCost.hypno;
      confuseFoe = 1;
      this.karma = clamp(this.karma + 1, 0, 100);
      say('🌀 สะกดจิตศัตรูทุกคน — ตานี้จะหันไปโจมตีกันเอง');

    } else {
      const it = BATTLE.items.find(x => x.k === what);
      if (!it) return false;
      if (it.k === 'tea' || it.k === 'health') {
        if (!(this.inventory[it.k] > 0)) return false;
        if (--this.inventory[it.k] <= 0) delete this.inventory[it.k];
        if (it.k === 'tea') this.mp = Math.min(this.mpMax, this.mp + 12);
      }
      // ชุด 28E — น้ำมนต์กลางศึก: ไม่มีของ/MP เต็ม → ไม่กินของ ไม่เสียเทิร์น (return ก่อนแตะอะไร)
      if (it.k === 'holyWater') {
        if (!(this.inventory.holyWater > 0) || this.mp >= this.mpMax) return false;
        if (--this.inventory.holyWater <= 0) delete this.inventory.holyWater;
        const gain = Math.min(ITEMS.holyWater.mp, this.mpMax - this.mp);
        this.mp += gain;
        say(`${it.say} (MP +${gain})`);
        this.save();
      }
      if (it.coin != null) {
        if (this.coin < it.coin) return false;
        this.coin -= it.coin;
      }
      if (it.power) {
        const p = this.powerOf(it.power);
        if (!this.abilities[it.power] && (!p || this.powerLocked(p)) || this.mp < BATTLE.mpCost[it.power]) return false;
        this.mp -= BATTLE.mpCost[it.power];
      }
      if (it.karma) this.karma = clamp(this.karma + it.karma, 0, 100);
      if (it.k !== 'holyWater') say(`${it.glyph} ${it.say}`);
      if (it.heal) { B.youHp = Math.min(B.youMax, B.youHp + it.heal); say(`   ↳ บารมีฟื้น ${it.heal}`); }
      // ข้อ B ชุด 13 — it.dmg อาจเป็นเลขคงที่ (ผนึกน้ำแข็ง = 30) หรือช่วง [a,b] แบบเดิมถ้ามีของใหม่ในอนาคต
      if (it.dmg)  { dmg = Array.isArray(it.dmg) ? roll(it.dmg) : it.dmg; say(`   ↳ ${dmg} หน่วย`); }
      if (it.confuse) confuseFoe = it.confuse;
      if (it.stun) stunFoe = it.stun;
    }

    if (B.rageCooldown > 0) B.rageCooldown--;

    // Rage lasts for three damaging player actions. Healing, the clock and
    // activating Rage leave the remaining charges intact.
    if (dmg > 0 && B.rageTurns > 0) {
      dmg = Math.round(dmg * 1.5);
      B.rageTurns--;
      if (!B.rageTurns) B.rageCooldown = 3;
      say(`🔥 พลังบ้าคลั่งเพิ่มความเสียหายเป็น ${dmg} หน่วย (เหลือ ${B.rageTurns} ครั้ง)`);
    }
    const areaAttack = ['ice', 'windFan', 'hypno'].includes(what);
    const affected = areaAttack ? B.foes.filter(f => f.hp > 0) : [target];
    for (const foe of affected) {
      foe.hp = Math.max(0, foe.hp - dmg);
      if (stunFoe) foe.stun = (foe.stun || 0) + stunFoe;
      if (confuseFoe) foe.confuse = (foe.confuse || 0) + confuseFoe;
    }
    B.dmg.foe = dmg;
    B.dmg.foeId = target.id;
    B.dmg.foeHits = affected.map(f => ({ id:f.id, damage:dmg }));
    if (dmg > 0) talk(dmg >= 26 ? 'crit' : target.hp <= target.maxHp * 0.3 ? 'low' : 'hurt');
    // ภาพนิ่งของ "ตอนจบตาเรา แต่เขายังไม่สวน" — ui เอาไปเล่นเป็นจังหวะแรก
    // เดิมเลือดสองฝั่งลดพร้อมกันในเฟรมเดียว เจ้าของบอกว่าดูแปลก (8 ก.ย. 2569)
    B.mid = { foes:B.foes.map(f => ({ ...f })), selectedFoeId:B.selectedFoeId,
      youHp: B.youHp, talk: B.talk };
    if (target.hp <= 0) {
      const start = B.foes.indexOf(target);
      const next = [...B.foes.slice(start + 1), ...B.foes.slice(0, start)].find(f => f.hp > 0);
      if (next) B.selectedFoeId = next.id;
    }
    B.mid.selectedFoeId = B.selectedFoeId;

    // แก้รอบ 1 ชุด 13 คุณเป้ 26 ก.ย. 2569 — แยกเป็นฟังก์ชันย่อย เพราะตอนนี้เช็คแพ้ชนะได้ 2 จังหวะ:
    // ตอนยมบาทน้อยฟาด (เดิม) และตอนศัตรูถูกสะกดจิตแล้วฟาดใส่ตัวเองตาย (จุดใหม่ด้านล่าง) เดิมเช็คแค่จังหวะแรก
    // ถ้าสะกดจิตฆ่าศัตรูตายพอดี ผู้เล่นต้องกดอีกทีถึงจะเห็นว่าชนะแล้ว — Dale เจอตอนรีวิวชุด 13
    const declareWin = () => {
      B.over = 'win';
      // ชุด 28B — จำของก่อนรับรางวัล เพื่อสรุปให้หน้าต่างรางวัลจากส่วนต่างจริง (ไม่เดาแยกตามชนิดศึก)
      const before = { coin:this.coin, inv:{ ...this.inventory }, ab:{ ...this.abilities } };
      if (B.kind === 'prisonBreak') {
        const event = ZONE_EVENTS.th[0];
        this.zoneEvents.th.prisonBreak = 'cleared';
        this.coin += event.reward.coin;
        this.order = clamp(this.order + event.reward.order, 0, 100);
        B.talk = t('event.prisonBreak.win');
        say(B.talk);
        if (this.zoneCases.th >= ZONE_EVENTS.th[2].atCases && !this.zoneEvents.th.devaTest)
          this.zoneEvents.th.devaTest = 'pending';
      } else if (B.kind === 'frontierBreach') {
        const event = ZONE_EVENTS.th[1];
        this.zoneEvents.th.frontierBreach = 'cleared';
        this.abilities.bigFire = true;
        this.queueStory('frontier-power', 'bigFire');
        const item = pick(FRONTIER.drops);
        this.coin += event.reward.coin;
        this.inventory[item] = (this.inventory[item] || 0) + event.reward.drop;
        B.reward = { coin:event.reward.coin, item, ability:'bigFire' };
        B.loot = this.winLoot();             // ชนะทั้งศึกครั้งเดียว (declareWin ถูกเรียกตอนจบระลอกสุดท้ายเท่านั้น)
        B.talk = t('event.frontierBreach.win') + B.loot;
        say(B.talk);
        this.bossPending = this.bossReady();
      } else if (B.kind === 'devaTest') {
        this.zoneEvents.th.devaTest = 'cleared';
        this.coin += ZONE_EVENTS.th[2].reward.coin;
        B.reward = { coin:ZONE_EVENTS.th[2].reward.coin };
        B.talk = t('event.devaTest.win');
        say(B.talk);
        this.inventory.mirror = (this.inventory.mirror || 0) + 1;
        if (this.zoneCases.th >= ZONE_EVENTS.th[1].atCases && !this.zoneEvents.th.frontierBreach)
          this.zoneEvents.th.frontierBreach = 'pending';
        this.bossPending = this.bossReady();
      } else if (B.kind === 'zoneEvent') {
        const ev = ZONE_EVENTS[B.zone]?.find(e => e.k === B.eventKey);
        this.zoneEvents[B.zone][B.eventKey] = 'cleared';
        if (ev?.reward?.coin) this.coin += ev.reward.coin;
        if (ev?.reward?.ability) this.abilities[ev.reward.ability] = true;
        if (ev?.reward?.item) this.inventory[ev.reward.item] = (this.inventory[ev.reward.item] || 0) + 1;
        if (ev?.reward?.unlockZone) {
          this.bossCleared[B.zone] = true;
          this.bossGuarding[B.zone] = false;
          this.bossRetryAt[B.zone] = 0;
        }
        if (ev?.reward?.releaseCaptives && !this.crew.some(c => c.k === 'taan')) {
          this.crew.push(mkCrew(CREW.find(c => c.k === 'taan'), B.zone));
        }
        this.refreshZoneEvents(B.zone);
        B.reward = { ...(ev?.reward || {}) };
        if (B.eventKey === 'thBorderBoss') this.queueStory('th', 'flameCharge');
        // ศึกชายแดนของโซน 2–4 (team:'frontier') ได้ของสุ่มเพิ่มต่อชัยชนะทั้งศึกครั้งเดียว · บอส/เทวดา/แหกคุก ไม่ได้
        B.loot = ev?.team === 'frontier' ? this.winLoot() : '';
        B.talk = `${ev?.title.th || 'อีเวนต์'}สำเร็จ${ev?.reward?.ability ? ' — ได้พลังใหม่' : ''}${B.loot}`;
        say(B.talk);
        this.bossPending = this.bossReady();
      } else if (B.kind === 'frontier') {
        const coin = 32 + B.wave * 10;
        const item = pick(FRONTIER.drops);
        this.coin += coin;
        this.inventory[item] = (this.inventory[item] || 0) + 1;
        const state = this.frontierOf(B.zone || this.zone);
        state.clears = Math.max(state.clears || 0, B.wave);
        B.reward = { coin, item };
        this.order = clamp(this.order + 1, 0, 100);
        B.loot = this.winLoot();
        say(`ป้องกันชายแดนสำเร็จ — +${coin} เบี้ยกรรม · ได้ ${ITEMS[item].name} ×1${B.loot}`);
      } else if (B.kind === 'mob') {
        const gain = Math.round(MOB.bounty * MOB.fightWin);
        this.coin += gain;
        this.order = clamp(this.order + 2, 0, 100);
        B.loot = this.winLoot();
        say(`${B.who}สลายเป็นควันไป — +${gain} เบี้ยกรรม · ระเบียบ +2${B.loot}`);
      } else if (B.kind === 'zoneBoss') {
        const firstWin = !this.bossCleared[B.zone];
        this.bossCleared[B.zone] = true;
        if (B.zone === 'th') this.abilities.flameCharge = true;
        if (B.zone === 'asia') this.abilities.rage = true;
        if (B.zone === 'west') this.abilities.ice = true;
        if (firstWin && ['th','asia','west'].includes(B.zone)) this.queueStory(B.zone, STORY[B.zone].reward);
        this.bossRetryAt[B.zone] = 0;
        this.bossGuarding[B.zone] = false;
        this.log(`👑 ปราบ${B.who}ได้ — เปิดทางไปโซนถัดไป`, 'good');
        say(`${B.who}ยอมถอย เปิดทางไปสาขาถัดไป`);
      } else {
        this.coin += BATTLE.winCoin;
        const soul = this.queue.find(x => x.id === B.soulId);
        if (soul) soul.beaten = true;
        B.loot = this.winLoot();
        say(`เขาทรุดลงกับพื้นแล้วไม่ลุกอีก — +${BATTLE.winCoin} เบี้ยกรรม · ออกหมายได้แล้ว${B.loot}`);
      }
      if (B.kind !== 'prisonBreak' && B.kind !== 'frontierBreach' && B.kind !== 'devaTest' && B.kind !== 'zoneEvent') talk('lose');
      this.hp = clamp(B.youHp, 1, this.hpMax);
      const expGain = B.kind === 'zoneBoss' ? 100 : B.kind === 'frontierBreach' ? 65 : B.kind === 'devaTest' ? 60 : B.kind === 'zoneEvent' ? 60 : B.kind === 'prisonBreak' ? 40 : 20;
      // หน้าต่างรางวัลหลังชนะปีศาจ/บอส (ชุด 28B) — วิญญาณขัดขืนในห้องไต่สวน (kind:'soul') ไม่เด้ง เพราะต้องไปต่อที่คำตัดสินทันที
      // คิดก่อน gainExp เพราะการเลื่อนขั้นเติมเบี้ยกรรมโบนัสเอง (เป็นหน้าต่างเลื่อนขั้นของมันต่างหาก)
      if (B.kind !== 'soul') {
        B.summary = { kind:B.kind, who:B.who, zone:B.zone || this.zone, coin:this.coin - before.coin, exp:expGain,
          items:Object.keys(this.inventory).filter(k => (this.inventory[k] || 0) > (before.inv[k] || 0))
            .map(k => ({ k, n:this.inventory[k] - (before.inv[k] || 0) })),
          abilities:Object.keys(this.abilities).filter(k => this.abilities[k] && !before.ab[k]) };
      }
      this.gainExp(expGain, 'ต่อสู้');
      this.onChange();
      return true;
    };

    const storyZone = B.kind === 'zoneEvent' && B.eventKey === 'thBorderBoss' ? 'th'
      : B.kind === 'zoneBoss' && ['th','asia'].includes(B.zone) ? B.zone : null;
    const storyBoss = storyZone && (B.foes.find(f => f.boss) || (B.kind === 'zoneBoss' ? B.foes[0] : null));
    if (storyZone && !this.bossCleared[storyZone] && !B.storyFinale && storyBoss && storyBoss.hp <= storyBoss.maxHp * 0.25) {
      B.storyFinale = storyZone;
      if (storyZone === 'th') {
        const hurt = Math.min(Math.max(0, B.youHp - 1), 34);
        B.youHp -= hurt; B.dmg.you = hurt;
        say('พี่ใหญ่ใช้ดาบเพลิงจนยมบาทน้อยบาดเจ็บ ก่อนพุ่งชนเพลิงพลิกกลับมาชนะ');
      } else {
        this.niraRest = { remaining:3, visited:false };
        const nira = this.crewOf('nira');
        if (nira) nira.path = null;
        say('นิรารับท่าไม้ตายแทน ยมบาทน้อยปลุกพลัง Rage และพุ่งโจมตีจนชนะ');
      }
      B.foes.forEach(f => { f.hp = 0; });
      return declareWin();
    }

    if (B.kind === 'zoneEvent' && B.eventKey === 'asiaPrisonFire' && target.hp <= 0 && !B.devaArrived) {
      B.devaArrived = true;
      const allyTarget = B.foes.find(f => f.hp > 0);
      if (allyTarget) allyTarget.hp = Math.max(0, allyTarget.hp - 24);
      B.mid.foes = B.foes.map(f => ({ ...f }));
      B.talk = 'เทวดาบินลงมาช่วยและซัดวิญญาณอีกตนด้วยพลังลม';
      say(B.talk);
    }
    if (B.foes.every(f => f.hp <= 0)) {
      if (B.kind === 'frontierBreach' && B.wave < ZONE_EVENTS.th[1].waves.length) {
        B.pendingWave = B.wave + 1;
        this.onChange();
        return true;
      }
      const zoneEv = B.kind === 'zoneEvent' ? ZONE_EVENTS[B.zone]?.find(e => e.k === B.eventKey) : null;
      if (zoneEv?.waves && B.wave < zoneEv.waves.length) {
        B.pendingWave = B.wave + 1;
        if (B.eventKey === 'cyberFinal' && B.wave === 3) {
          B.storyInterlude = 'cyber-reinforcements';
        }
        this.onChange(); return true;
      }
      return declareWin();
    }

    // ---- ตาของเขา ----
    const counter = [...B.foes.slice(B.counterIndex), ...B.foes.slice(0, B.counterIndex)]
      .find(f => f.hp > 0);
    B.counterIndex = (B.foes.indexOf(counter) + 1) % B.foes.length;
    B.dmg.counterFoeId = counter.id;
    const foeAtkRoll = (foe = counter) => roll(foe.atk || (B.kind === 'frontier' ? B.foeAtk
      : B.kind === 'mob' ? MOB.fightAtk
      : B.kind === 'zoneBoss' ? [14, 22 + ZONES.findIndex(z => z.k === B.zone) * 3]
      : BATTLE.foeAtk));
    // ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — สะกดจิต (กานต์): เทิร์นถัดไปของศัตรู "มึน โจมตีตัวเอง"
    // ต่างจาก B.stun (แค่ข้ามตา ไม่มีความเสียหาย) เช็คก่อน stun เพราะถือเป็นผลที่แรงกว่า
    if (what === 'ice') {
      for (const foe of affected) foe.stun = Math.max(0, foe.stun - 1);
      say('น้ำแข็งผนึกศัตรูทุกคน หยุดสวนกลับ 1 เทิร์น');
    } else if (counter.confuse > 0 || what === 'hypno') {
      const confused = what === 'hypno' ? B.foes.filter(f => f.hp > 0) : [counter];
      // เลือกเป้าหมายจากภาพก่อนโจมตี ทุกคนออกท่าพร้อมกัน แม้โดนเพื่อนตีล้มในตานี้
      const attacks = confused.map((foe, i) => {
        foe.confuse = Math.max(0, (foe.confuse || 0) - 1);
        const victim = what === 'hypno' && confused.length > 1 ? confused[(i+1)%confused.length] : foe;
        return { attackerId:foe.id, id:victim.id, damage:foeAtkRoll(foe) };
      });
      for (const attack of attacks) {
        const victim = B.foes.find(f => f.id === attack.id);
        victim.hp = Math.max(0, victim.hp - attack.damage);
      }
      B.dmg.confuseHits = attacks;
      B.dmg.confuseSelf = attacks.reduce((sum, a) => sum + a.damage, 0);
      say(confused.length > 1 ? 'ศัตรูถูกสะกดจิตและหันไปโจมตีกันเอง' : 'ศัตรูถูกสะกดจิต ฟาดเข้ากับตัวเอง');
      // แก้รอบ 1 — สะกดจิตฆ่าศัตรูตายพอดี ต้องประกาศชนะทันที ไม่ใช่รอผู้เล่นกดโจมตีอีกครั้ง
      if (B.foes.some(f => f.hp <= 0)) {
        if (B.foes.every(f => f.hp <= 0)) {
          if (B.kind === 'frontierBreach' && B.wave < ZONE_EVENTS.th[1].waves.length) {
            B.pendingWave = B.wave + 1;
            this.onChange();
            return true;
          }
          const zoneEv = B.kind === 'zoneEvent' ? ZONE_EVENTS[B.zone]?.find(e => e.k === B.eventKey) : null;
          if (zoneEv?.waves && B.wave < zoneEv.waves.length) {
            B.pendingWave = B.wave + 1;
            this.onChange(); return true;
          }
          return declareWin();
        }
        if (!B.foes.some(f => f.id === B.selectedFoeId && f.hp > 0)) B.selectedFoeId = B.foes.find(f => f.hp > 0).id;
      }
    } else if (counter.stun > 0) {
      counter.stun--;
      say('ศัตรูถูกผนึกน้ำแข็ง ขยับไม่ได้ทั้งตา');
    }
    else {
      const normal = foeAtkRoll();
      let ultimate = B.kind === 'zoneBoss' ? bossUltimate(B, normal) : null;
      // Story foes use their own cutscene when their stronger counterattack
      // starts. Keep the same { name, image, damage } shape as zone bosses.
      if (!ultimate && B.kind === 'zoneEvent' && counter.boss &&
          counter.hp <= counter.maxHp / 2 &&
          (!B.ultimateUsed || B.turn - B.ultimateLastTurn >= 4)) {
        const z = B.zone || this.zone;
        const folder = { th:'', asia:'Asia/', west:'West/', cyberhell:'CyberHell/' }[z] || '';
        const tester = /deva|rescue/i.test(B.eventKey || '') || /boss-tester/.test(counter.sp || '');
        const bossScenes = {
          'hero-boss':'img/hero-boss-cutscene.jpeg',
          'leader-th-possessed':'img/leader-th-attack-cutscene.png',
          'leader-asia-possessed':'img/leader-asia-attack-cutscene.png',
          'leader-west-possessed':'img/leader-west-attack-cutscene.png',
          'leader-cyberhell-possessed':'img/leader-cyberhell-attack-cutscene.png',
          'zone-boss-asia':'img/Asia/Boss Zone2-asia-cutscene.jpeg',
          'zone-boss-west':'img/West/Boss Zone3-cutscene.jpeg',
          'zone-boss-cyberhell':'img/CyberHell/Boss Zone4-cutscene.jpeg',
        };
        // ภาพท่าไม้ตายบอส/เทวดาในอีเวนต์: โซน 1 = img/boss-<tester|frontier>-th-cutscene.jpeg
        // โซนอื่น = img/<Zone>/boss-<tester|frontier>-<z>-cutscene-<z>.png (เดิมชี้โฟลเดอร์ raw ซึ่ง gitignore → 404 บน live)
        const who = tester ? 'boss-tester' : 'boss-frontier';
        const special = bossScenes[counter.sp]
          || (z === 'th' ? `img/${who}-th-cutscene.jpeg` : `img/${folder}${who}-${z}-cutscene-${z}.png`);
        ultimate = { name: /^leader-/.test(counter.sp || '') ? 'คำพิพากษาที่ถูกควบคุม' : tester ? 'คำพิพากษาเทวดา' : 'พลังฝ่าชายแดน',
          image:special, damage:Math.round(normal * 1.7) };
      }
      const d = ultimate ? ultimate.damage : normal;
      if (ultimate) {
        B.ultimate = ultimate;
        B.ultimateUsed = true;
        B.ultimateLastTurn = B.turn;
      }
      B.youHp = Math.max(0, B.youHp - d);
      B.dmg.you = d;
      say(ultimate ? `${B.who}ใช้${ultimate.name} — บารมีท่านหาย ${d}` : `เขาสวนกลับ — บารมีท่านหาย ${d}`);
      if (!B.over) talk('hit');
      if (ultimate) B.talk = `${B.who}ใช้${ultimate.name}!`;
    }
    B.turn++;

    if (B.youHp <= 0 && (this.inventory.spareHeart || 0) > 0) {
      if (--this.inventory.spareHeart <= 0) delete this.inventory.spareHeart;
      B.youHp = Math.max(1, Math.round(B.youMax * 0.4));
      say(`❤️ หัวใจสำรองแตกสลาย — ยมบาทน้อยลุกขึ้นด้วยบารมี ${B.youHp}`);
    }
    if (B.youHp <= 0) {
      B.over = 'lose';
      talk('win');
      if (B.kind === 'prisonBreak') {
        const event = ZONE_EVENTS.th[0];
        this.zoneEvents.th.prisonBreak = 'pending';
        this.hp = 1;
        this.order = clamp(this.order - event.lose.order, 0, 100);
        B.talk = t('event.prisonBreak.lose');
        say(B.talk);
      } else if (B.kind === 'frontierBreach') {
        this.zoneEvents.th.frontierBreach = 'pending';
        this.hp = 1;
        B.talk = t('event.frontierBreach.lose');
        say(B.talk);
      } else if (B.kind === 'devaTest') {
        this.zoneEvents.th.devaTest = 'pending';
        this.hp = 1;
        B.talk = t('event.devaTest.lose');
        say(B.talk);
      } else if (B.kind === 'zoneEvent') {
        this.zoneEvents[B.zone][B.eventKey] = 'pending';
        this.hp = 1;
        B.talk = `${ZONE_EVENTS[B.zone]?.find(e => e.k === B.eventKey)?.title.th || 'ศัตรู'}ยังรออยู่ที่ชายแดน — ไปพักศาลาน้ำชาแล้วกลับมาท้าสู้ใหม่`;
        say(B.talk);
      } else if (B.kind === 'frontier') {
        this.hp = Math.max(1, this.hp - 8);
        say('ทีมถอยกลับเข้าประตู — ชายแดนยังไม่แตก แต่บารมีท่านหาย 8');
      } else if (B.kind === 'mob') {
        this.hp = Math.max(1, this.hp - MOB.fightLose);
        say(`ท่านถอยออกมา — ${B.who}ยังอยู่ในโซน · บารมีหาย ${MOB.fightLose}`);
      } else if (B.kind === 'zoneBoss') {
        this.hp = 1;
        this.bossRetryAt[B.zone] = 0;
        this.bossGuarding[B.zone] = true;
        say(`${B.who}ยืนรอที่สะพาน — ท่านพร้อมเมื่อไหร่เดินเข้าไปท้าสู้`);
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
    if (B.over === 'lose') {
      this.pendingRecovery = { zone:this.zone, outfit:this.outfit || this.zone, foe:B.who, bg:B.bg };
      this.hp = Math.max(1, this.hp);
      this.yamaDone = false;
      this.over = null;
      this.huntMob = false;
      this.player.tx = null; this.player.ty = null; this.player.path = null;
    }
    // ชุด 28B — ตั้งก่อน onChange ทุกทางออกของฟังก์ชันนี้ ui.js จะเด้งหน้าต่างรางวัลจากค่านี้ (หลังเรื่องราว/พลังใหม่)
    this.pendingReward = B.over === 'win' && B.summary ? B.summary : null;
    // คุณเป้ 4 ต.ค. 2569: หมดแรงจากศึกนี้ก็กลับไปนอนพักฟื้นเหมือนศึกอื่น
    if (B.kind === 'yama') {
      this.hp = 1;
      this.log('หมดแรงในการต่อสู้ — กลับไปพักที่ศาลาน้ำชา', 'bad');
      this.save(); this.onChange(); return B;
    }
    // ตัดสินพลาดติดกันครบ 3 ครั้ง — แพ้พ่อแล้วโดนลงทัณฑ์กระทะทองแดง ไม่ใช่ Game Over อีกต่อไป
    // (คุณเป้สั่ง 17 ก.ย. 2569: "ไม่รีเซ็ตโซน ไม่ Game Over" — เล่นต่อได้เลยหลังไปพักที่ศาลาน้ำชา)
    if (B.kind === 'dad') {
      this.dadFight = false;
      this.hp = DAD.punishHp;
      this.reds = 0;
      if (B.reason === 'karma') this.karma = 70;
      if (B.reason === 'order') {
        this.order = ORDER_WARN.restore;
        this.orderWarns = 0;
        this.orderWarnAt = this.tick + ORDER_WARN.gap;
      }
      // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — "พญายม" แทนด้วยผู้ตรวจการของโซนนั้น · "พ่อลงมาตบจริง" (คำว่า
      // "พ่อ" เดี่ยว ๆ ไม่ผ่าน fmtAuthority เพราะชนกับคำอื่นได้ เช่น "พ่อค้า") แทนด้วยชื่อผู้ตรวจการตรง ๆ
      const auth = authorityOf(this.zone);
      const reasonText = fmtAuthority(B.reason === 'karma'
        ? 'กรรมในบัญชีของท่านเต็ม พญายมจึงส่งท่านลงกระทะทองแดงให้รับผลด้วยตัวเอง — บารมีเหลือ 1 และกรรมลดลงเหลือ 70 หลังชดใช้บางส่วน'
        : B.reason === 'order'
          ? `ปล่อยให้คิวล้นจนระเบียบพัง พญายมส่งท่านลงกระทะทองแดง — บารมีเหลือ 1 และยกระเบียบกลับมา ${ORDER_WARN.restore} ให้ตั้งหลักใหม่`
          : B.reason === 'hp'
            ? 'บารมีหมดจนพญายมต้องลงมาหยุดเหตุด้วยตัวเอง — ท่านถูกส่งลงกระทะทองแดง แล้วกลับมาด้วยบารมี 1'
            : fmtAuthority(DAD.punishText, this.zone), this.zone);
      this.pendingDadPunish = { title: DAD.punishTitle, text: reasonText };
      this.log(fmtAuthority(B.reason === 'karma'
        ? '🍳 กรรมเต็มบัญชี — แพ้พญายมและถูกลงกระทะทองแดง · บารมีเหลือ 1 · กรรมลดเหลือ 70'
        : B.reason === 'order'
          ? `🍳 ระเบียบพัง — ถูกลงกระทะทองแดง · บารมีเหลือ 1 · ระเบียบกลับมา ${ORDER_WARN.restore}`
          : B.reason === 'hp'
            ? '🍳 บารมีหมด — ถูกลงกระทะทองแดงและกลับมาด้วยบารมี 1'
            : `🍳 ${this.zone === 'th' ? 'พ่อ' : auth.title}ลงมาตบจริง — ลงทัณฑ์ในกระทะทองแดงแล้วปล่อยกลับไปคุมโซนต่อ`, this.zone), 'boss');
      this.onChange(); return B;
    }
    if (B.over === 'win') this.hp = clamp(B.youHp, 1, this.hpMax);
    if (B.kind === 'frontierBreach') {
      this.log(B.over === 'win' ? t('event.frontierBreach.win') : t('event.frontierBreach.lose'),
        B.over === 'win' ? 'good' : 'bad');
      this.save(); this.onChange(); return B;
    }
    if (B.kind === 'devaTest') {
      this.log(B.over === 'win' ? t('event.devaTest.win') : t('event.devaTest.lose'),
        B.over === 'win' ? 'good' : 'bad');
      this.save(); this.onChange(); return B;
    }
    if (B.kind === 'prisonBreak') {
      this.log(B.over === 'win' ? t('event.prisonBreak.win') : t('event.prisonBreak.lose'),
        B.over === 'win' ? 'good' : 'bad');
      this.save(); this.onChange(); return B;
    }
    if (B.kind === 'zoneEvent') {
      const ev = ZONE_EVENTS[B.zone]?.find(e => e.k === B.eventKey);
      this.log(B.over === 'win'
        ? `⚔️ ชนะ${ev?.title.th || 'อีเวนต์'}${ev?.reward?.ability ? ' — ได้พลังใหม่' : ''}`
        : `⚔️ แพ้${ev?.title.th || 'อีเวนต์'} — ศัตรูรอให้กลับมาท้าอีกครั้ง`,
        B.over === 'win' ? 'good' : 'bad');
      if (B.over === 'win' && ev?.reward?.ending) {
        this.gameCompleted = true;
        this.queueStory('ending');
        this.over = { k:'finalWin', title:'ยมบาทน้อยพิชิตนรกทั้งสี่สาขา',
          text:'ยมบาทน้อยช่วยหัวหน้าทั้งสามสาขาให้หลุดจากการควบคุม แล้วชนะบอสสุดท้าย นิราปิดแฟ้มคดีเล่มสุดท้ายลง ยมบาทน้อยปกครองทั้ง 4 โซนด้วยความสงบสุข' };
      }
      this.save(); this.onChange(); return B;
    }
    if (B.kind === 'zoneBoss') {
      // บทตอนบอสแพ้/ยมบาทน้อยแพ้ ใช้บท "ผู้ตรวจการ" ของ Rae แทน log ทั่วไป (17 ก.ย. 2569)
      // ผ่าน Reese fact-check แล้ว — ดู ZONES[].bossWin/bossLose ใน data.js ห้ามแก้ถ้อยคำ
      const zb = ZONES.find(z => z.k === B.zone);
      const winLine = zb?.bossWin ? zb.bossWin.join(' ') : '';
      this.log(B.over === 'win'
        ? `👑 ชนะ${B.who} — ${winLine || 'ปลดทางไปโซนถัดไป'}`
        : `👑 แพ้${B.who} — ${zb?.bossLose || 'เขาเฝ้าสะพานอยู่ เดินเข้าไปท้าสู้เมื่อพร้อม'}`,
        B.over === 'win' ? 'good' : 'event');
      this.checkEnd(); this.onChange(); return B;
    }
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
    if (B.kind === 'frontier') {
      this.log(B.over === 'win'
        ? `🏯 ป้องกันชายแดนระลอกที่ ${B.wave} สำเร็จ — ได้ ${B.reward?.coin || 0} เบี้ยกรรมและของจากสนามรบ`
        : `🏯 ทีมถอยจากชายแดนระลอกที่ ${B.wave} — จัดทีมแล้วกลับไปลองใหม่ได้`,
        B.over === 'win' ? 'good' : 'bad');
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
  queueStory(key, reward = null) {
    if (this.storySeen[key] || this.storyQueue.some(p => p.key === key)) return;
    this.storyQueue.push({ key, reward, stage:STORY[key] ? 'comic' : 'reward' });
  },
  completeStory() {
    const next = this.storyQueue.shift();
    if (next) this.storySeen[next.key] = true;
    this.save();
  },
  visitNira() {
    if (!this.niraRest || this.niraRest.visited || this.battle) return false;
    const site = STATIONS.find(d => d.k === (this.stations.some(st => st.def.k === 'tea' && !st.build) ? 'tea' : 'sala'));
    if (!site || Math.hypot(this.player.x - site.x, this.player.y - site.y) > 150) return false;
    this.niraRest.visited = true;
    const nira = this.crewOf('nira');
    if (nira) nira.morale = Math.min(100, nira.morale + 8);
    this.log('🍵 แวะเยี่ยมนิราที่ศาลาน้ำชา — เธอยิ้มและบอกว่าอีกไม่นานก็หาย', 'good');
    this.save(); this.onChange(); return true;
  },

  zoneDef() { return ZONES.find(z => z.k === this.zone) || ZONES[0]; },

  zoneCaptivesFree() { return this.zone !== 'cyberhell' || this.zoneEventStatus('cyberRescue') === 'cleared'; },

  canMoveZone(k) {
    const i = ZONES.findIndex(z => z.k === k), z = ZONES[i];
    return !!z && (i === 0 || !!this.bossCleared[ZONES[i - 1].k]);
  },
  zonesOpen() { return ZONES.filter(z => this.canMoveZone(z.k) && z.k !== this.zone); },

  outfitsOpen() { return ZONES.filter(z => this.outfitsOwned?.includes(z.k)); },

  buyZoneOutfit() {
    const k = this.zone;
    if (k === 'th' || this.outfitsOwned?.includes(k) || this.coin < 180) return false;
    this.coin -= 180;
    this.outfitsOwned = [...(this.outfitsOwned || ['th']), k];
    this.log(`👘 ซื้อชุด${this.zoneDef().name.replace(/^โซน/, '')}จากพ่อค้านรกแล้ว`, 'good');
    this.save(); this.onChange(); return true;
  },

  setOutfit(k) {
    const z = ZONES.find(x => x.k === k);
    if (!z || !this.outfitsOwned?.includes(k)) return false;
    this.outfit = k;
    this.log(`👘 เปลี่ยนชุด Yama เป็นชุด${z.name.replace(/^โซน/, '')}แล้ว`, 'good');
    this.onChange();
    return true;
  },

  /** ย้ายโซน — กติกาตาม CONCEPT §12.6 (แก้ตามข้อ 7 ของเจ้าของ 11 ก.ย. 2569)
   *    ติดตัวไป : ยมบาท · นิรา · เบี้ยกรรม · พลัง · บารมี · กรรม · ขั้น · แฟ้มทะเบียนกรรม
   *    ไม่ตามไป : สถานี · ยมทูตที่จ้างไว้ · ยักษ์ทวารบาล · คิว · ดวงที่ขัง · ของบนพื้น
   *  ของที่ไม่ตามไป ถูกเก็บไว้ทั้งกล่องใน zoneSave — ย้ายกลับมาเมื่อไหร่ยังอยู่ครบเหมือนวันที่จากไป
   *  ยมทูตเป็นคนของสาขา ไม่ใช่คนของท่าน จึงต้องจ้างใหม่ทุกสาขา (นิราคนเดียวที่ตามไป — ดู CREW.follow)
   *  ถ้ายกสถานีกับคนไปด้วย สาขาที่สองจะไม่มีอะไรให้ทำเลยนอกจากกดเดินวาระ */
  moveZone(k) {
    const z = ZONES.find(x => x.k === k);
    if (!z || !this.canMoveZone(k) || z.k === this.zone) return false;

    // A branch cannot keep drawing its walkers once another map is active.
    for (const walk of this.afterlifeWalks) {
      this.releaseEscort(walk);
      if (walk.destination !== 'exit') this.finishAfterlifeWalk(walk);
    }
    this.afterlifeWalks = [];

    // เก็บสาขาเดิมไว้ทั้งกล่อง แล้วหยิบกลับมาตอนย้ายกลับ (เจ้าของสั่ง 10 ก.ย. 2569)
    // เดิมย้ายกลับมาแล้วสถานีทุกหลังหายหมด เหมือนเริ่มสาขาใหม่ทุกครั้ง
    this.zoneSave = this.zoneSave || {};
    this.zoneSave[this.zone] = {
      stations: this.stations.map(st => ({
        k: st.def.k, crewK: st.crewK, intensity: st.intensity, fire: st.fire,
        visitCd: st.visitCd || 0, kanCd: st.kanCd || 0, build: 0, slots: st.slots,
        repair: st.repairWait ? REPAIR_TIME : st.repair ? Math.max(1, st.repair - Date.now()) : 0,
        repairWait:!!st.repairWait, arrivalElapsed:st.arrivalElapsed || 0,
        speedLv:st.speedLv || 0, capLv:st.capLv || 0, fuelLv:st.fuelLv || 0, mgCd:st.mgCd || 0,
      })),
      queue: this.queue, held: this.held, items: this.items,
      // ยมทูตที่จ้างไว้กับยักษ์ทวารบาลเป็นคนของสาขานี้ ฝากไว้กับสาขา ไม่ตามท่านไป
      // เก็บแค่สิ่งที่เปลี่ยนได้ ค่านิยามประกอบใหม่จาก CREW ตอนย้ายกลับ (แนวเดียวกับ restore)
      crew: this.crew.filter(c => !c.follow)
                     .map(c => ({ k: c.k, morale: c.morale, hunger: c.hunger ?? 100, at: c.at, tired: c.tired, helpReadyAt: c.helpReadyAt || 0,
                                  buildK:this.stations.some(st => st.def.k === c.buildK && st.repair) ? c.buildK : null,
                                  upLv:c.upLv || 0, raeng:c.raeng, rabiab:c.rabiab, panya:c.panya, metta:c.metta })),
      guard: this.guard,
    };

    const back = this.zoneSave[k];
    const keep = this.crew.filter(c => c.follow);      // นิราตามท่านไปทุกสาขา
    this.zone = k;
    syncFrontierPos(k);
    this.transits = [];
    this.zoneCases[k] = this.zoneCases[k] || 0;
    this.mobs = [];
    if (back) {                              // เคยคุมสาขานี้มาก่อน — ของยังอยู่ครบ
      this.stations = back.stations.map(sv => {
        const st = mkStation(sv.k);
        if (!st.def) return null;
        Object.assign(st, { crewK: sv.crewK, intensity: sv.intensity ?? 3, fire: sv.fire || 0,
                            visitCd: sv.visitCd || 0, kanCd: sv.kanCd || 0, build: 0, slots: sv.slots || [],
                            repair: sv.repair ? Date.now() + sv.repair : 0, repairWait:!!sv.repairWait, arrivalElapsed:sv.arrivalElapsed || 0,
                            speedLv:sv.speedLv || 0, capLv:sv.capLv || 0, fuelLv:sv.fuelLv || 0, mgCd:sv.mgCd || 0 });
        return st;
      }).filter(Boolean);
      this.queue = back.queue || []; this.held = back.held || []; this.items = back.items || [];
      // เซฟบูรพารุ่นเก่าเคยรับสำนวนกองไทยร่วมกัน — ไม่ยกคดีผิดสาขากลับมาอีก
      this.queue = this.queue.filter(s => soulFitsZone(s, k));
      this.held = this.held.filter(s => soulFitsZone(s, k));
      this.stations.forEach(st => { st.slots = st.slots.filter(x => soulFitsZone(x.soul, k)); });
      this.crew = [...keep, ...(back.crew || []).map(sv => {
        const def = CREW.find(c => c.k === sv.k);
        return def ? { ...mkCrew(def, k), ...sv, name:crewName(def, k) } : null;
      }).filter(Boolean)];
      this.guard = back.guard || null;
      this.ensureTarang();
      this.sweepMapItems();
    } else {
      this.queue = []; this.items = []; this.held = [];
      this.stations = [mkStation('sala'), mkStation('tarang')];
      this.crew = k === 'cyberhell' ? keep : [...keep, mkCrew(CREW.find(c => c.k === 'taan'), k)];
      this.guard = null;
      this.coin += z.coin;                   // งบตั้งต้นให้ครั้งแรกที่มาสาขานี้เท่านั้น
    }
    this.crew.forEach(c => {
      c.name = crewName(CREW.find(d => d.k === c.k) || c, k);
      c.at = null; c.path = null;
    });
    this.refreshZoneEvents(k);
    this.restoreBuilders();
    this.party = { members:[], guard:false };
    this.syncBlocks(true);
    if (!back) {
      // ชุด 29C ข้อ 4 — ทั้งคู่เดินออกจากประตูชายแดนไปแท่นตัดสิน (เดิมเกิดที่ขอบบน (820,190) แล้วนิราติดอยู่ตรงนั้น)
      // ยมบาทเดินไปยืนข้างบัลลังก์ · นิราไม่ต้องสั่ง: ระบบเดินของยมทูตพากลับจุดประจำ (hx,hy) เองเพราะอยู่ไกลบ้าน
      const gate = nearestWalk(ZONE_ENTRY.gate[0], ZONE_ENTRY.gate[1]) || ZONE_ENTRY.gate;
      this.player.x = gate[0]; this.player.y = gate[1];
      this.player.tx = ZONE_ENTRY.goal[0]; this.player.ty = ZONE_ENTRY.goal[1];
      this.player.path = findPath(this.player.x, this.player.y, this.player.tx, this.player.ty);
      const nira = this.crew.find(c => c.k === 'nira');
      if (nira) {
        const at = nearestWalk(ZONE_ENTRY.nira[0], ZONE_ENTRY.nira[1]) || gate;
        nira.x = at[0]; nira.y = at[1]; nira.path = null; nira.wait = 0; nira.escort = null;
      }
    }
    this.log(`🗺️ ${back ? 'กลับมาที่' : 'ย้ายมา'}${z.name}${z.sub ? ` — ${z.sub}` : ''}`
             + (back ? ' · สถานีและยมทูตที่ทิ้งไว้ยังอยู่ครบ'
                     : ` · งบตั้งต้น +${z.coin} เบี้ยกรรม · ยังไม่มียมทูตประจำสาขา ต้องจ้างใหม่`), 'event');
    reconcileSoulPortraits(this);
    this.pendingZone = { ...z, back: !!back };
    if (!this.queue.length) this.spawnSoul();
    // จุดเริ่มสาขาเก็บความคืบหน้าสาขาก่อนหน้าไว้ แต่ยังไม่รวมผลงานใหม่ในสาขานี้
    this.zoneEntry = JSON.parse(JSON.stringify(this.snapshot(false)));
    this.onChange();
    return true;
  },

  spawnMob() {
    // สุ่มตามชายฝั่งขอบล่าง เหนือแม่น้ำเล็กน้อย เพื่อให้ทุกโซนเดินไปถึงได้
    // เลือกเฉพาะจุดที่ findPath เชื่อมถึงจุดเฝ้าได้ ไม่งั้นยักษ์/ผู้เล่นไปไล่ปีศาจไม่ถึง
    const y = 675;
    const reach = p => {
      if (!p) return false;
      const path = findPath(p[0], p[1], GUARD_POST[0], GUARD_POST[1]);
      const end = path?.[path.length - 1];
      return !!end && end[0] === GUARD_POST[0] && end[1] === GUARD_POST[1];
    };
    const x0 = 110 + Math.random() * (SCENE.w - 220);
    let p = nearestWalk(x0, y);
    for (let i = 0; i < 6 && !reach(p); i++) p = nearestWalk(110 + Math.random() * (SCENE.w - 220), y);
    if (!reach(p)) {                 // สุ่มไม่โดน → กวาดหาจุดที่เชื่อมได้ใกล้ x0 ที่สุด
      p = null;
      for (let d = 0; d <= SCENE.w && !p; d += 40)
        for (const x of [x0 - d, x0 + d]) {
          if (x < 110 || x > SCENE.w - 110) continue;
          const q = nearestWalk(x, y);
          if (reach(q)) { p = q; break; }
        }
    }
    if (!p) return;
    // แต่ละโซนมีผีคนละชุด — ไทยครบทุกพันธุ์ · โซนอื่นเหลือพันธุ์กลางที่ใช้รูปเดิมได้
    const pool = (this.zoneDef().mobs || []).filter(i => MOB.kinds[i]);
    const kind = pool.length ? pick(pool) : Math.floor(Math.random() * MOB.kinds.length);
    const mob = { id: SEQ++, x: p[0], y: p[1], hp: MOB.hp, kind };
    this.mobs.push(mob);
    // ไม่เด้งเข้าฉากต่อสู้เองแล้ว (9 ก.ย. 2569) — มันจะเดินไปเผาอาคารแทน
    // ยังไม่จ้างยักษ์ ผู้เล่นเลือกเดินไปสู้เองได้; จ้างแล้วให้ยักษ์จัดการบนแผนที่
    this.log(`👹 ${MOB.kinds[kind].nameKey ? t(MOB.kinds[kind].nameKey) : MOB.kinds[kind].name}${t(this.guard ? 'mob.spawnRiverGuard' : 'mob.spawnRiver')}`, 'event');
    this.onChange();          // ให้ ui เปิดหน้าต่อสู้ได้ทันที ไม่ต้องรอวาระถัดไป
  },

  hireGuard() {
    if (this.guard || this.coin < GUARD.hire) return false;
    this.coin -= GUARD.hire;
    this.guard = { x: GUARD_POST[0], y: GUARD_POST[1] };
    if (this.huntMob) { this.huntMob = false; this.player.path = null; this.player.tx = null; }
    this.log(`🛡️ จ้าง${GUARD.name}แล้ว ${GUARD.line}`, 'good');
    return true;
  },

  buy(kind, n = 1) {
    if (kind === 'food') {
      const cost = BAL.foodPrice * n * 10;
      if (this.coin < cost) return false;
      this.coin -= cost; this.food += n * 10;
      this.log(`ซื้อเสบียง ${n * 10} ห่อ — ${cost} เบี้ยกรรม`);
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

  /** ซื้อขายกับพ่อค้า — ของทุกชิ้นเข้ากระเป๋า ไม่ใช้ทันที */
  sellMaterial(k, all = false) {
    const def = ITEMS[k], have = this.inventory[k] || 0;
    if (!this.zoneCaptivesFree() || !def?.material || have < 1) return false;
    const n = all ? have : 1;
    this.inventory[k] -= n; this.coin += def.sell * n;
    this.log(`🧳 ขาย${def.name} ×${n} — +${def.sell * n} เบี้ยกรรม`, 'good');
    this.save(); this.onChange(); return true;
  },

  buyMerchant(k) {
    const stock = MERCHANT.stock.find(x => x.k === k), def = ITEMS[k];
    if (!this.zoneCaptivesFree() || !stock || !def || this.level < (stock.lv || 1) || this.coin < stock.cost) return false;
    this.discover('item', k);
    this.coin -= stock.cost;
    // แก้รอบ 1 ข้อ C ชุด 13 คุณเป้ 26 ก.ย. 2569 — ลูกไฟ/น้ำแข็งพร้อมใช้ทันทีเหมือนเก็บจากแผนที่
    // (ดู collectItem) เดิมซื้อแล้วเข้ากระเป๋าทั่วไปเฉย ๆ กด "ใช้" ไม่ได้ (ปุ่มปิดถาวรสำหรับสองไอเทมนี้
    // ดู useBag/bagUseWhy) ต้องรอเซฟ/โหลดหรือเลื่อนขั้นถึงจะถูกไมเกรตเป็นกระสุนจริง (migrateBagCombatItems)
    // — ตอนนี้ซื้อแล้วได้ใช้เลย ไม่ต้องรอ
    if (k === 'fire') {
      this.fireAmmo = Math.min(this.fireAmmoMax, this.fireAmmo + (def.fireAmmo || 1) * (stock.qty || 1));
    } else if (k === 'ice') {
      const p = this.powerOf('ice');
      if (p && !this.powerLocked(p)) p.ammo = Math.min(p.max, p.ammo + (stock.qty || 1));
      else this.inventory[k] = (this.inventory[k] || 0) + (stock.qty || 1); // ยังไม่ปลดล็อก — เก็บไว้ก่อนเหมือนเดิม
    } else {
      this.inventory[k] = (this.inventory[k] || 0) + (stock.qty || 1);
    }
    this.log(`🛍️ ซื้อ${def.name} — ${stock.cost} เบี้ยกรรม`, 'act');
    this.save(); this.onChange(); return true;
  },

  giveOnigiriNira() {
    const nira = this.crew.find(c => c.k === 'nira');
    if (!nira || !(this.inventory.food > 0)) return false;
    if (--this.inventory.food <= 0) delete this.inventory.food;
    nira.morale = Math.min(100, nira.morale + 25);
    this.crew.filter(c => !c.reader).forEach(c => { c.morale = Math.min(100, c.morale + 10); });
    this.food += ITEMS.food.food;
    this.log('🍙 นิรารับข้าวปั้นไปแจกทีม — กำลังใจและเสบียงเพิ่มขึ้น', 'good');
    this.save(); this.onChange(); return true;
  },

  offerLotusBoon() {
    if (!(this.inventory.lotus > 0) || this.karma <= 0 || !this.has('sawan')) return false;
    if (--this.inventory.lotus <= 0) delete this.inventory.lotus;
    this.karma = Math.max(0, this.karma - 8);
    this.log('🪷 บุญรับดอกบัวไว้ — กรรมในบัญชีเบาลง 8', 'good');
    this.save(); this.onChange(); return true;
  },

  /** ข้อ A-2 คุณเป้ 24 ก.ย. 2569 — คุยกับกานต์ในหอส่องกรรม รับกระจกวิเศษฟรีเป็นระยะ (แทนของวางพื้นเดิม)
   *  ต้องยืนใกล้กานต์ในห้องก่อน (ui.js เช็ค inside ก่อนโชว์ปุ่ม) · คูลดาวน์นับเป็น "วาระ" เหมือน visit เดิมทุกที่ */
  talkKan() {
    const st = this.stations.find(s => s.def.k === 'krajok');
    if (!st || st.build) return false;
    if (this.tick < (st.kanCd || 0)) return false;
    const p = this.powerOf('mirror');
    if (this.powerLocked(p) || p.ammo >= p.max) return false;
    this.discover('item', 'mirror');
    p.ammo = Math.min(p.max, p.ammo + 1);
    st.kanCd = this.tick + KRAJOK.kanCool;
    this.log('🪞 กานต์: "ส่องดูเถอะครับ เดี๋ยวผมมีให้อีก" — ได้กระจกวิเศษมาหนึ่งบาน', 'good');
    this.save(); this.onChange();
    return true;
  },

  /** ข้อ A-3 คุณเป้ 24 ก.ย. 2569 — ซื้อของจากบุญในห้องประตูสวรรค์ (ตอนนี้มีแต่วงสะกดจิต)
   *  ต้องยืนใกล้บุญในห้องก่อน (ui.js เช็ค inside ก่อนโชว์ปุ่ม) · กลไกซื้อเหมือน buyMerchant ทุกอย่าง
   *  ต่างแค่คนละสต็อก/คนละที่ยืน — ของเข้ากระเป๋าเหมือนกัน ใช้ทีหลังผ่าน useBag() */
  buyBoon(k) {
    const stock = BOON_SHOP.stock.find(x => x.k === k), def = ITEMS[k];
    if (!stock || !def || this.level < (stock.lv || 1) || this.coin < stock.cost) return false;
    this.coin -= stock.cost;
    this.inventory[k] = (this.inventory[k] || 0) + (stock.qty || 1);
    this.log(`🛍️ ซื้อ${def.name}จากบุญ — ${stock.cost} เบี้ยกรรม`, 'act');
    this.save(); this.onChange(); return true;
  },

  upgradePower(k) {
    const p = this.powerOf(k); if (!p || this.powerLocked(p)) return false;
    this.upgrades ||= { powers:{} }; this.upgrades.powers ||= {};
    const lv = this.upgrades.powers[k] || 0;
    if (lv >= UPGRADES.max || this.level < Math.min(5, (p.lv || 1) + Math.floor(lv / 2))) return false;
    const cost = UPGRADES.powerBase * (lv + 1);
    if (this.coin < cost) return false;
    this.coin -= cost; this.upgrades.powers[k] = lv + 1; p.max++; p.ammo = p.max;
    this.log(`✨ อัปเกรด${p.name}เป็นขั้น ${lv + 2} — เก็บได้ ${p.max} ครั้ง`, 'good');
    this.save(); this.onChange(); return true;
  },

  upgradeCrew(k, stat = 'raeng') {
    const c = this.crew.find(x => x.k === k); if (!c || c.reader || c.self) return false;
    c.upLv ||= 0; if (c.upLv >= UPGRADES.max) return false;
    const cost = UPGRADES.crewBase * (c.upLv + 1);
    if (this.coin < cost || this.level < Math.min(5, 1 + Math.floor(c.upLv / 2))) return false;
    this.coin -= cost; c.upLv++; c[stat] = (c[stat] || 0) + 1;
    this.log(`🛡️ ฝึก${c.name} — ${stat === 'raeng' ? 'แรง' : 'ระเบียบ'}เพิ่มเป็น ${c[stat]}`, 'good');
    this.save(); this.onChange(); return true;
  },

  /** ป้อนข้าวปั้นให้ยมทูตคนหนึ่ง (ข้อ D ชุด 13 คุณเป้ 26 ก.ย. 2569)
   *  หัก 1 ห่อจากกองเสบียงกลางเดียวกับที่ระบบอัตโนมัติกินอยู่แล้ว (ดูคอมเมนต์ที่ step())
   *  ไม่มีเสบียงเหลือ → คืน false (ปุ่มฝั่ง UI ปิดเองพร้อมบอกจุดซื้อ) */
  feedCrew(k) {
    const c = this.crew.find(x => x.k === k && !x.self && !x.reader);
    if (!c || this.food < BAL.feedFoodCost) return false;
    this.food -= BAL.feedFoodCost;
    c.hunger = Math.min(100, (c.hunger ?? 100) + BAL.feedHunger);
    this.log(`🍙 ป้อนข้าวปั้นให้${c.name}แล้ว`, 'act');
    this.save(); this.onChange(); return true;
  },

  // ข้อ A คุณเป้ 24 ก.ย. 2569 (ชุดที่ 8) — เอาเคส type:'fuel' ออก (ปุ่ม "ประหยัดฟืน" ถอดจาก UI ไปแล้วตั้งแต่ชุดที่ 7
  // และตอนนี้ไม่มีสถานีกินฟืน/เสบียงต่อวาระอีกต่อไป ไม่มีอะไรให้ "ประหยัด") เหลือแค่ speed/capacity
  upgradeStation(k, type = 'speed') {
    const st = this.stations.find(x => x.def.k === k);
    if (!st || st.build || st.def.pow <= 0) return false;
    const prop = type === 'capacity' ? 'capLv' : 'speedLv';
    const lv = st[prop] || 0; if (lv >= UPGRADES.max) return false;
    const cost = UPGRADES.stationBase * (lv + 1);
    if (this.coin < cost || this.level < Math.min(5, 1 + Math.floor(lv / 2))) return false;
    this.coin -= cost; st[prop] = lv + 1;
    this.log(`🏗️ อัปเกรด${st.def.name} · ${type === 'capacity' ? 'ช่องรับวิญญาณ' : 'ความเร็ว'} ขั้น ${lv + 1}`, 'good');
    this.save(); this.onChange(); return true;
  },

  // ---------- มินิเกม "เร่งการทำงาน" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569) ----------
  // upgradeStation('speed') ด้านบนไม่มีปุ่มเรียกใช้แล้ว (UI เปลี่ยนไปเปิดมินิเกมแทนจ่ายเบี้ย)
  // เหลือโค้ดไว้เฉย ๆ เผื่อวันหลังอยากเอากลับมา — ผลลัพธ์เดิมทุกอย่าง (เร็วขึ้น 12%/ขั้น สูงสุด 5)
  // คงเงื่อนไข "ขั้นยมบาทต้องถึง" ของเดิมไว้ด้วย กันขั้น 5 ตั้งแต่ต้นเกมเพราะตอนนี้ไม่มีค่าเบี้ยกั้นแล้ว
  mgLevelNeed(lv) { return Math.min(5, 1 + Math.floor(lv / 2)); },
  mgCooldownFor(st) { return UPGRADES.mgCooldown + UPGRADES.mgCooldownStep * (st.speedLv || 0); },
  mgReady(st) {
    if (!st || st.build || st.def.pow <= 0) return false;
    const lv = st.speedLv || 0;
    if (lv >= UPGRADES.max) return false;
    if (this.level < this.mgLevelNeed(lv)) return false;
    return !st.mgCd || this.tick >= st.mgCd;
  },
  /** ผลมินิเกม — ชนะ = speedLv +1 (เพดานเดิม) · แพ้ = ไม่ได้อะไร (แค่เสียเวลา)
   *  ทั้งชนะและแพ้ต้องรอ cooldown ก่อนเล่นซ้ำที่สถานีเดียวกัน (กันเล่นรัว ข้อ 2 ของใบงาน) */
  finishMinigame(k, won) {
    const st = this.stations.find(x => x.def.k === k);
    if (!st || st.build || st.def.pow <= 0) return false;
    const lv = st.speedLv || 0;
    st.mgCd = this.tick + this.mgCooldownFor(st);
    if (won && lv < UPGRADES.max) {
      st.speedLv = lv + 1;
      this.log(`🎮 ${st.def.name} — ชนะมินิเกม เร่งการทำงานขึ้นขั้น ${st.speedLv}`, 'good');
    } else if (won) {
      this.log(`🎮 ${st.def.name} — ชนะมินิเกม แต่เร่งเต็มขั้นแล้ว`, 'act');
    } else {
      this.log(`🎮 ${st.def.name} — แพ้มินิเกม ลองใหม่ได้อีกครั้งหลังพักสักครู่`, 'bad');
    }
    this.save(); this.onChange(); return true;
  },

  build(k) {
    if (this.zone === 'west' && this.zoneEventStatus('westHypnotized') !== 'cleared') return false;
    if (!this.zoneCaptivesFree()) return false;
    const def = STATIONS.find(s => s.k === k);
    if (!def || this.coin < def.cost) return false;
    if (this.stations.some(s => s.def.k === k)) return false;
    const before = this.activeTags();
    const worker = this.availableBuilder();
    if (!worker) return false;
    this.coin -= def.cost;
    const st = mkStation(k, Date.now() + BUILD_TIME);
    st.buildWait = true;
    this.stations.push(st);
    worker.at = null; worker.buildK = k; worker.path = null; worker.workTarget = null;
    const opened = def.tags.filter(t => !before.includes(t)).map(t => SINS[t].name);
    const extra = k === 'tarang' ? ` — คิวรับได้ถึง ${this.queueCap()} ดวงแล้วระเบียบถึงจะเริ่มตก`
                : k === 'krajok' ? ` — จะเติมพลังให้เองทุก ${KRAJOK.every} วาระ`
                : opened.length  ? ` — ต่อจากนี้จะมีสำนวน "${opened.join(' · ')}" ส่งเข้าคิวด้วย` : '';
    st.buildExtra = extra;                    // แต่ละไซต์เก็บข้อความของตัวเองเมื่อสร้างพร้อมกัน
    // ใช้ชื่อช่างที่รับงานจริง ซึ่งเปลี่ยนตามโซน
    this.log(`🏗️ สั่งสร้าง${def.name} — ${worker.name}กำลังเดินไปเริ่มงาน`, 'act');
    return true;
  },

  builders() {
    return this.crew.filter(c => c.k === 'taan' || c.k === 'dam');
  },

  availableBuilder() {
    return this.builders().find(c => !c.buildK && !c.at && !c.escort) || null;
  },

  // Older saves did not keep a worker at the site. Preserve saved owners first.
  restoreBuilders() {
    for (const st of this.stations.filter(s => s.build || s.repair)) {
      if (this.crew.some(c => c.buildK === st.def.k)) continue;
      const worker = this.availableBuilder();
      if (worker) worker.buildK = st.def.k;
    }
  },

  canRepair(k) {
    const st = this.stations.find(s => s.def.k === k);
    return !!(st && !st.build && st.fire > 0 && !st.repair && !this.mobs.length &&
              this.availableBuilder());
  },

  repairStation(k) {
    if (!this.canRepair(k)) return false;
    const st = this.stations.find(s => s.def.k === k);
    const worker = this.availableBuilder();
    st.repair = Date.now() + REPAIR_TIME;
    st.repairWait = true; st.arrivalElapsed = 0;
    worker.buildK = k; worker.path = null; worker.workTarget = null;
    this.log(`🔧 เรียก${worker.name}มาซ่อม${st.def.name} — ฟรี ใช้เวลา ${REPAIR_TIME / 1000} วินาทีหลังถึงไซต์`, 'act');
    this.onChange();
    return true;
  },

  hire(k) {
    const def = CREW.find(c => c.k === k);
    if (!def || this.crew.some(c => c.k === k) || this.coin < def.hire) return false;
    this.coin -= def.hire;
    const member = mkCrew(def, this.zone);
    this.crew.push(member);
    this.log(`🤝 ${member.name} เข้าประจำการ ${def.line}`, 'good');
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

API.snapshot = function (withEntry = true) {
  this.syncDiscoveries();
  return {
    v: 3, at: Date.now(),
    tick: this.tick, courtClosed: this.courtClosed, coin: this.coin, food: this.food, order: this.order,
    karma: this.karma, hp: this.hp, hpMax: this.hpMax, hits: this.hits,
    star5: this.star5, level: this.level, exp: this.exp, mp: this.mp, mpMax: this.mpMax,
    casesDone: this.casesDone, scoreSum: this.scoreSum,
    greens: this.greens, reds: this.reds,
    kpiPassed: this.kpiPassed, nextArrive: this.nextArrive, nextEvent: this.nextEvent,
    nextPay: this.nextPay, nextKpi: this.nextKpi,
    seq: SEQ,
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — readyAt (คูลดาวน์เวลาจริงของตวาดข่มขู่) กับ fireAmmo ต้องเซฟด้วย
    // ไม่งั้นรีโหลดแล้ว cooldown/กระสุนลูกไฟรีเซ็ตทุกครั้ง
    powers: this.powers.map(p => ({ k: p.k, cd: p.cd, ammo: p.ammo, max: p.max, readyAt: p.readyAt || 0 })),
    fireAmmo: this.fireAmmo, fireAmmoMax: this.fireAmmoMax,
    abilities: this.abilities,
    discoverySeen: { ...this.discoverySeen }, discoveryQueue: [...this.discoveryQueue],
    storyQueue:this.storyQueue, storySeen:this.storySeen, niraRest:this.niraRest,
    outfitsOwned: this.outfitsOwned,
    crew: this.crew.map(c => ({ k: c.k, morale: c.morale, hunger: c.hunger ?? 100, at: c.at, x: c.x, y: c.y, helpReadyAt: c.helpReadyAt || 0,
      buildK:c.buildK || null, upLv:c.upLv || 0, raeng:c.raeng, rabiab:c.rabiab, panya:c.panya, metta:c.metta })),
    stations: this.stations.map(st => ({
      k: st.def.k, crewK: st.crewK, intensity: st.intensity, fire: st.fire, visitCd: st.visitCd || 0,
      build: st.buildWait ? BUILD_TIME : st.build ? Math.max(1, st.build - Date.now()) : 0, buildWait:!!st.buildWait, buildExtra:st.buildExtra || '',
      repair: st.repairWait ? REPAIR_TIME : st.repair ? Math.max(1, st.repair - Date.now()) : 0,
      repairWait:!!st.repairWait, arrivalElapsed:st.arrivalElapsed || 0,
      speedLv:st.speedLv || 0, capLv:st.capLv || 0, fuelLv:st.fuelLv || 0, mgCd:st.mgCd || 0,
      slots: st.slots,
    })),
    queue: this.queue, held: this.held, sentences:this.sentences,
    afterlifeWalks:this.afterlifeWalks, reborn:this.reborn, ascended:this.ascended,
    items: this.items, inventory: this.inventory, mobs: this.mobs,
    mobRosterV18: true,
    guard: this.guard, player: this.player, closed: this.closed, taught: this.taught,
    ledger: this.ledger, returning: this.returning, returned: this.returned,
    orderWarns: this.orderWarns || 0, orderWarnAt: this.orderWarnAt || 0,
    zone: this.zone, outfit: this.outfit || this.zone, zoneSave: this.zoneSave || {},
    zoneCases: this.zoneCases, zoneEvents: this.zoneEvents, eventMapClosed:this.eventMapClosed, legacyBossGate:this.legacyBossGate,
    gameCompleted: !!this.gameCompleted,
    teaBeds:this.teaBeds, pendingRecovery:this.pendingRecovery,
    bossCleared: this.bossCleared, bossRetryAt: this.bossRetryAt,
    miniGoals: this.miniGoals, frontier: this.frontier, party:this.party, upgrades:this.upgrades,
    bossGuarding: this.bossGuarding, bossArriveSeen: this.bossArriveSeen || {},
    zoneIntroSeen: this.zoneIntroSeen || {},
    bossArriveFixV10: true,  // Dale ตรวจชุดที่ 10 — marker กันไมเกรต bossArriveSeen ซ้ำ (ดู restore())
    mapV2FixTh: true,        // ชุดที่ 15b — marker กันรีเซ็ตตำแหน่งบนแผนที่โซน 1 ใหม่ซ้ำ (ดู restore())
    mapV3FixBranches: true,  // ชุดที่ 18D — พิกัดโซน 2–4 ใช้ผังเดียวกับโซน 1
    zoneEntry: withEntry ? this.zoneEntry : undefined,
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
  const legacyBossGate = !!d.legacyBossGate || (d.legacyBossGate == null &&
    ((d.zoneCases?.th || 0) >= 10 || !!d.bossCleared?.th || !!d.bossGuarding?.th));
  this.discoverySeen = { ...(d.discoverySeen || {}) };
  this.discoveryQueue = [...(d.discoveryQueue || [])];
  this.speed = 1; // เซฟเก่าที่เคยเร่งเวลาและออบเจ็กต์เกมเดิมกลับสู่ความเร็วปกติ
  // ข้อ C คุณเป้ 24 ก.ย. 2569 (ชุดที่ 8) — เซฟเก่ามีค่า fuel (ฟืน) ไม่ใช่ food (เสบียง)
  // ยกมา 1:1 ให้ผู้เล่นไม่เสียเปรียบ (จำนวนคงเดิม แค่เปลี่ยนความหมาย) · เซฟใหม่มี d.food อยู่แล้วไม่ต้องแปลง
  if (d.food == null && d.fuel != null) d.food = d.fuel;
  // ของในกระเป๋าที่เคยเป็น 'มัดฟืน' (คีย์ fuel) ต้องยกไปเป็น 'ห่อเสบียง' (คีย์ food ใหม่) ไม่งั้นค้างเป็นของที่หาไม่เจอ
  if (d.inventory && d.inventory.fuel) {
    d.inventory.food = (d.inventory.food || 0) + d.inventory.fuel;
    delete d.inventory.fuel;
  }
  const keep = ['tick','coin','food','order','karma','hp','hpMax','mp','mpMax','exp','hits','star5','level',
                'greens','reds',
                'casesDone','scoreSum','kpiPassed','nextArrive','nextEvent','nextPay','nextKpi',
                'orderWarns','orderWarnAt'];
  keep.forEach(k => { if (d[k] != null) this[k] = d[k]; });
  if (d.exp == null) this.exp = Math.max(0, (LEVELS[this.level - 1]?.exp || 0) + (this.greens || 0) * 10);
  if (!Number.isFinite(this.exp)) this.exp = LEVELS[this.level - 1]?.exp || 0;
  if (d.mpMax == null) this.mpMax = LEVELS[this.level - 1]?.mpMax || LEVELS[0].mpMax;
  if (d.mp == null) this.mp = this.mpMax;
  this.mp = clamp(this.mp, 0, this.mpMax);
  // JSON แปลง NaN เป็น null; เซฟที่ถูกแก้มืออาจมี NaN ตรง ๆ
  for (const k of ['coin', 'order', 'karma', 'scoreSum']) {
    this[k] = Number.isFinite(d[k]) ? d[k] : k === 'coin' ? BAL.startCoin : k === 'order' ? 72 : 0;
  }
  this.courtClosed = !!d.courtClosed;
  SEQ = d.seq || SEQ;

  // ข้อ L คุณเป้เจอ 25 ก.ย. 2569 — บารมีสูงสุดตอนนี้ผูกกับขั้นตรง ๆ ผ่าน LEVELS.hpMax (เดิมกระโดด
  // 100→120 ครั้งเดียวตอนขั้น 4) เซฟเก่าอาจมี this.hpMax ไม่ตรงตารางใหม่ตามขั้นปัจจุบัน — ปรับให้ตรงเสมอ
  // ตอนโหลด โดยไม่ลดทอนบารมีที่ผู้เล่นมีอยู่ตอนนี้ (เพดานสูงขึ้นเท่าไหร่ บารมีปัจจุบันได้เพิ่มเท่านั้นด้วย)
  const lvHpMax = LEVELS[this.level - 1]?.hpMax;
  if (lvHpMax && this.hpMax !== lvHpMax) {
    const diff = lvHpMax - this.hpMax;
    this.hpMax = lvHpMax;
    this.hp = diff > 0 ? Math.min(this.hpMax, this.hp + diff) : Math.min(this.hp, this.hpMax);
  }

  this.powers = POWERS.map(p => {
    const sv = (d.powers || []).find(x => x.k === p.k) || {};
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — readyAt ของตวาดข่มขู่ต้องยกมาจากเซฟตรง ๆ (เป็น epoch ms สัมบูรณ์
    // เทียบกับนาฬิกาเครื่องอยู่แล้ว จึงนับต่อถูกเองไม่ว่าจะปิดเกมไปนานแค่ไหน) เซฟเก่าไม่มีค่านี้ = ใช้ได้ทันที (0)
    return { ...p, cd: sv.cd || 0, ammo: sv.ammo ?? 0, max: sv.max ?? 2, readyAt: sv.readyAt || 0 };
  });
  // ข้อ A คุณเป้ 24 ก.ย. 2569 — ลูกไฟแยกสระของตัวเองแล้ว เซฟเก่าไม่มีค่านี้ = เริ่มที่ค่าเริ่มต้นเกมใหม่ (3/3)
  this.fireAmmo = d.fireAmmo ?? 3; this.fireAmmoMax = d.fireAmmoMax ?? 3;
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
    st.visitCd = sv.visitCd || 0; st.kanCd = sv.kanCd || 0;
    st.build = sv.build ? Date.now() + sv.build : 0;
    st.buildWait = !!sv.buildWait;
    st.buildExtra = sv.buildExtra;
    st.repair = sv.repair ? Date.now() + sv.repair : 0;
    st.repairWait = !!sv.repairWait;
    st.arrivalElapsed = sv.arrivalElapsed || 0;
    st.speedLv = sv.speedLv || 0; st.capLv = sv.capLv || 0; st.fuelLv = sv.fuelLv || 0;
    st.mgCd = sv.mgCd || 0;   // คูลดาวน์มินิเกม "เร่งการทำงาน" (ชุดที่ 9)
    // เซฟ v2 เก็บดวงเดียวต่อสถานี — ยกขึ้นเป็นช่องแรกของหลังนั้น
    st.slots = sv.slots || (sv.soul ? [{ soul: sv.soul, intensity: sv.intensity ?? 3,
                                         progress: sv.progress || 0, need: sv.need || 60,
                                         verdict: sv.verdict || null }] : []);
    return st;
  }).filter(Boolean);
  this.ensureTarang();                 // ชุด 27D — ตะรางมีให้ฟรีทุกเซฟ (เซฟเก่าที่ยังไม่เคยสร้างได้รับตอนโหลด)
  // เซฟเดิมล้าง buildK ทันทีที่ถึงไซต์: ผูกงานที่ยังสร้างอยู่กลับให้ผู้สร้างจนเสร็จ
  this.restoreBuilders();
  this.queue = d.queue || [];
  this.held = d.held || [];
  this.sentences = d.sentences || [];
  this.reborn = d.reborn || 0;
  this.ascended = d.ascended || 0;
  this.items = d.items || [];
  this.inventory = { ...(d.inventory || {}) };
  this.abilities = { ...(d.abilities || {}) };
  this.storyQueue = d.storyQueue || []; this.storySeen = d.storySeen || {}; this.niraRest = d.niraRest || null;
  // ข้อ H คุณเป้เจอ 25 ก.ย. 2569 — เซฟเก่าอาจมีลูกไฟ/คัมภีร์น้ำแข็งค้างอยู่ในกระเป๋าจากก่อนแพตช์นี้
  // (ตอนนั้นยังต้องเปิดกระเป๋ากด "ใช้" เอง) ปุ่มนั้นปิดถาวรแล้ว เลยไมเกรตของที่ค้างให้กลายเป็นกระสุน/
  // พลังพร้อมใช้ทันทีแทน ไม่ให้ผู้เล่นเสียของที่เก็บมาแล้วเพราะปุ่มหายไป (ตัวเลข/เพดานเดิมทุกอย่าง)
  this.migrateBagCombatItems();
  // รายชื่อปีศาจเดิมมีชนิดที่ถอดออกอยู่ index 3; ทิ้งตัวนั้นและเลื่อนชนิดที่ตามมา
  // เซฟใหม่มี marker กันการเลื่อน index ซ้ำตอนโหลดครั้งถัดไป
  this.mobs = (d.mobs || []).filter(m => d.mobRosterV18 || m.kind !== 3)
    .map(m => d.mobRosterV18 || m.kind == null || m.kind < 4 ? m : { ...m, kind:m.kind - 1 });
  this.transits = [];
  this.guard = d.guard || null;
  if (d.player) this.player = d.player;
  this.logs = d.logs || [];
  this.closed = d.closed || [];
  this.taught = d.taught || [];
  this.ledger = d.ledger || [];
  this.returning = d.returning || [];
  this.returned = d.returned || 0;
  this.zone = d.zone || 'th';
  syncFrontierPos(this.zone);
  this.zoneCases = d.zoneCases || { [this.zone]: d.casesDone || 0 };
  this.zoneEvents = d.zoneEvents || {};
  this.eventMapClosed = d.eventMapClosed || {};
  this.teaBeds = d.teaBeds || {};
  this.pendingRecovery = d.pendingRecovery || null;
  this.gameCompleted = !!d.gameCompleted || this.zoneEvents.cyberhell?.cyberFinal === 'cleared';
  if (this.zoneEvents.th?.frontierBreach === 'cleared') this.abilities.bigFire = true;
  if (legacyBossGate) {
    Object.assign((this.zoneEvents.th ||= {}),
      { prisonBreak:'cleared', frontierBreach:'cleared', devaTest:'cleared', thBorderBoss:'cleared' });
  }
  for (const [zone, events] of Object.entries(this.zoneEvents)) {
    for (const [key, status] of Object.entries(events)) if (status === 'active') events[key] = 'pending';
  }
  if (d.bossCleared?.th) this.zoneEvents.th.thBorderBoss ||= 'cleared';
  if (this.zoneEvents.th?.thBorderBoss === 'cleared') this.abilities.flameCharge = true;
  if (d.bossCleared?.asia) this.abilities.rage = true;
  if (d.bossCleared?.west) this.abilities.ice = true;
  for (const zone of Object.keys(ZONE_EVENTS)) this.refreshZoneEvents(zone);
  for (const [zone, events] of Object.entries(this.zoneEvents)) {
    for (const ev of ZONE_EVENTS[zone] || []) {
      if (events[ev.k] === 'cleared' && ev.reward?.ability) this.abilities[ev.reward.ability] = true;
    }
  }
  // เซฟก่อนชุด event ที่ไปถึงบอสแล้วคงสิทธิ์เดิม ไม่บังคับให้ย้อนกลับมาทำสามเหตุการณ์
  this.legacyBossGate = legacyBossGate;
  this.miniGoals = d.miniGoals || {};
  this.frontier = d.frontier || { zones:{} };
  if (!this.frontier.zones) this.frontier = { zones:{ th:{ clears:this.frontier.clears || 0, team:this.frontier.team || [] } } };
  this.party = d.party || { members:[], guard:false };
  this.party.members = (this.party.members || []).filter(k => this.crew.some(c => c.k === k));
  // ชุดที่ 10 (ข้อ C1) — party.guard (โหมด "ยักษ์เดินตาม") ถูกตัดออกแล้ว เหลือ field ไว้เฉย ๆ
  // กันเซฟเก่าพัง (ไม่มีใครอ่านค่านี้อีกต่อไป) บังคับเป็น false เสมอไม่ให้มีทางเหลือค้างจากเซฟเก่า
  this.party.guard = false;
  this.upgrades = d.upgrades || { powers:{} };
  this.bossCleared = d.bossCleared || (this.zone === 'west' ? { th: true, asia: true }
    : this.zone === 'asia' ? { th: true } : {});
  this.bossRetryAt = d.bossRetryAt || {};
  this.bossGuarding = d.bossGuarding || {};
  // เซฟเก่าก่อนมีฉากมาถึง — ถ้าเคยเจอบอสโซนนั้นแล้ว (ผ่านหรือแพ้แล้วเฝ้าสะพานอยู่) ถือว่าเห็นฉากมาถึงแล้ว
  // ไม่งั้นผู้เล่นที่เล่นมาก่อนจะโดนฉากมาถึงย้อนหลังทั้งที่สู้บอสไปแล้ว
  this.bossArriveSeen = d.bossArriveSeen || { ...this.bossCleared, ...this.bossGuarding };
  this.zoneIntroSeen = d.zoneIntroSeen || {};
  // Dale ตรวจชุดที่ 10 (25 ก.ย. 2569, ทดสอบจริงด้วย Playwright พบว่าเซฟที่บั๊กเดิมเคยติดธงไว้
  // ก่อนเปิดฉาก — เช่นเซฟของคุณเป้ที่เจอบอสโซน 1 "เดินเข้ามาหาเลย ไม่มีฉากเปิด" — flag ค้างเป็น true
  // ถาวร ต่อให้แพตช์ข้อ E1 (ย้ายการติดธงไปไว้ใน onDone) แก้จุดตั้งธงแล้ว เซฟเก่าที่ติดธงผิดจังหวะไปแล้ว
  // ก็จะไม่มีทางได้เห็นฉากอีกเลยตลอดไป เพราะเซฟไม่เคยรู้ว่าตัวเอง "ผิด" — ไมเกรตครั้งเดียวตรงนี้:
  // เซฟที่ไม่มี marker นี้ (เขียนไว้ก่อนแพตช์นี้) รีเซ็ต bossArriveSeen ของทุกโซนที่ยังไม่ชนะบอส
  // (bossCleared ยังเป็น false) ให้กลับเป็น false ครั้งเดียว — โซนที่ชนะไปแล้วไม่ถูกแตะ (ไม่งั้นฉากขึ้น
  // ย้อนหลังทั้งที่สู้ไปแล้วจริง) แลกกับผู้เล่นส่วนน้อยที่เคยเห็นฉากถูกต้องอยู่แล้วจะเห็นซ้ำอีกครั้งเดียว
  // (ไม่เสียหาย) เทียบกับผู้เล่นที่ติดบั๊กจะได้เห็นฉากที่ Rae เขียน/Reese fact-check แล้วจริง ๆ สักที
  if (!d.bossArriveFixV10) {
    Object.keys(this.bossArriveSeen).forEach(k => { if (!this.bossCleared[k]) delete this.bossArriveSeen[k]; });
  }
  this.bossArriveFixV10 = true;
  // ชุดที่ 15b (28 ก.ย. 2569 ข้อ D.1/D.5) — โซน 1 เปลี่ยนแผนที่ทั้งผัง (scene.png 1527×704 →
  // scene-v2.png 1678×937) เซฟเก่าที่มีตำแหน่งยมบาทน้อย/ยมทูต/ยักษ์ทวารบาลอิงพิกัดฉากเดิมอาจไปติดอยู่
  // ในลาวา/นอกแผนที่ใหม่ — รีเซ็ตตำแหน่งเป็นค่าเริ่มต้นใหม่ครั้งเดียวตอนโหลด (เฉพาะตอนอยู่โซน 1 ที่
  // ตอนชุดที่ 15b เปลี่ยนเฉพาะโซน 1; โซนอื่นมี migration แยกด้านล่าง ไม่กระทบความคืบหน้า/ของที่ถืออยู่เลย
  // แค่ตำแหน่งยืน · ยมทูตแค่ล้าง x/y ให้ null พอ — stepWorld ในไฟล์นี้จะตั้งจาก hx/hy ใหม่ให้เองเฟรมแรก
  if (!d.mapV2FixTh && this.zone === 'th') {
    this.player.x = SPOTS.bench.x + 60; this.player.y = SPOTS.bench.y;
    this.player.tx = null; this.player.ty = null; this.player.path = null;
    this.crew.forEach(c => {
      c.x = null; c.y = null;                         // stepWorld ตั้งจาก hx/hy ใหม่ให้เองเฟรมแรก
      const home = CREW.find(def => def.k === c.k);    // sv (เซฟเก่า) อาจมี hx/hy พิกัดเดิมติดมาด้วย
      if (home) { c.hx = home.hx; c.hy = home.hy; }
    });
    if (this.guard) { this.guard.x = GUARD_POST[0]; this.guard.y = GUARD_POST[1]; }
  }
  this.mapV2FixTh = true;
  this.bossWalk = null;
  this.zoneEntry = d.zoneEntry || null;
  this.bossPending = this.bossReady();
  this.outfitsOwned = Array.isArray(d.outfitsOwned)
    ? [...new Set(['th', ...d.outfitsOwned.filter(k => ZONES.some(z => z.k === k))])]
    : [...new Set(['th', d.outfit || this.zone])];
  this.outfit = this.outfitsOwned.includes(d.outfit) ? d.outfit : 'th';
  this.crew.forEach(c => { c.name = crewName(CREW.find(x => x.k === c.k) || c, this.zone); });
  // เซฟเก่าโซนบูรพาอาจยังมีเปรตไทยจาก pool รุ่นก่อน — เก็บไว้เฉพาะชนิดของโซนปัจจุบัน
  const allowedMobs = new Set(this.zoneDef().mobs || []);
  this.mobs = this.mobs.filter(m => allowedMobs.has(m.kind ?? 0));
  this.zoneSave = d.zoneSave || {};
  this.sweepMapItems();                // ชุด 27D — ของที่ค้างบนแผนที่ในเซฟเก่า เก็บเข้ากระเป๋าให้ (ระบบของตกถูกยกเลิก)
  // เซฟที่ยักษ์ยืนตรงจุดเฝ้าเก่าจะยังบังประตูอยู่ทันทีหลังโหลด;
  // ย้ายเฉพาะตัวที่ยืน ณ จุดเก่า ตัวที่กำลังวิ่งไล่ปีศาจให้เดินต่อเอง
  const moveOldGuardPost = guard => {
    if (guard?.y === 795 && (guard.x === 895 || guard.x === 700)) [guard.x, guard.y] = GUARD_POST;
  };
  moveOldGuardPost(this.guard);
  Object.values(this.zoneSave).forEach(saved => moveOldGuardPost(saved?.guard));
  moveOldGuardPost(this.zoneEntry?.guard);
  if (!d.mapV3FixBranches) {
    // เซฟผัง 1527×704 ยังไม่มี mask ภาพตอน restore: ย้ายตำแหน่งที่ผูกกับผังเก่า
    // ไปจุดเกิดที่เดินได้ แล้วให้ syncBlocks ตรวจซ้ำเมื่อภาพฉากโหลดเสร็จ
    const spawn = () => [SPOTS.bench.x + 60, SPOTS.bench.y];
    const moveItems = items => (items || []).forEach(it => { [it.x, it.y] = spawn(); });
    for (const [zone, saved] of Object.entries(this.zoneSave)) {
      if (zone === 'th') continue;
      moveItems(saved.items);
      if (saved.guard) [saved.guard.x, saved.guard.y] = GUARD_POST;
    }
    if (this.zoneEntry?.zone && this.zoneEntry.zone !== 'th') {
      const entry = this.zoneEntry;
      if (entry.player) [entry.player.x, entry.player.y] = spawn();
      moveItems(entry.items);
      if (entry.guard) [entry.guard.x, entry.guard.y] = GUARD_POST;
    }
    if (this.zone !== 'th') {
      [this.player.x, this.player.y] = spawn();
      this.player.tx = null; this.player.ty = null; this.player.path = null;
      moveItems(this.items);
      this.crew.forEach(c => {
        const home = CREW.find(def => def.k === c.k);
        if (home) { c.hx = home.hx; c.hy = home.hy; }
        c.x = null; c.y = null; c.path = null;
      });
      this.mobs.forEach((m, i) => { m.x = 1100 + (i % 5) * 20; m.y = 455 + Math.floor(i / 5) * 20; });
      if (this.guard) [this.guard.x, this.guard.y] = GUARD_POST;
    }
  }
  this.mapV3FixBranches = true;
  // Saves settle travelers exactly once. Older saves simply have no walkers.
  this.afterlifeWalks = [];
  for (const walk of d.afterlifeWalks || []) {
    if (walk?.soul && ['prison', 'gate', 'queue'].includes(walk.destination))
      this.finishAfterlifeWalk(walk);
  }
  this.usedCases = d.usedCases || [];
  this.fights = d.fights || 0;
  this.spawns = d.spawns || 0;
  this.yamaDone = !!d.yamaDone;
  // ผลตอบแทนออฟไลน์เล็กน้อยจากสถานีที่มีผู้คุมประจำอยู่ ไม่บังคับเปิดเกมทิ้งไว้
  // จำกัด 8 ชั่วโมงและไม่จ่ายถ้าเกมจบหรือเซฟเก่าไม่มีเวลาอ้างอิง
  const away = Math.min(8 * 3600e3, Math.max(0, Date.now() - (d.at || Date.now())));
  const working = this.stations.filter(st => st.crewK && st.slots.length && !st.build).length;
  this.offlineGrant = Math.min(40, Math.floor(away / 1800e3) * working * 3);
  if (this.offlineGrant > 0 && !d.over) {
    this.coin += this.offlineGrant;
    this.log(`⏳ ระหว่างที่ท่านไม่อยู่ ยมทูตคุมงานต่อ · +${this.offlineGrant} เบี้ยกรรม`, 'good');
  }
  this.battle = null;                 // ฉากต่อสู้ไม่เซฟ — เปิดเกมมาแล้วเขายืนรออยู่ในคิวเหมือนเดิม
  this.over = null;
  if (this.zone === 'asia') {
    this.queue = this.queue.filter(s => soulFitsZone(s, this.zone));
    this.held = this.held.filter(s => soulFitsZone(s, this.zone));
    this.stations.forEach(st => { st.slots = st.slots.filter(x => soulFitsZone(x.soul, this.zone)); });
    if (!this.queue.length) this.spawnSoul();
  }
  this.syncDiscoveries();
  if (!d.discoverySeen) {
    // Legacy saves treat already owned unlocks as explained; future acquisitions still queue.
    for (const id of this.discoveryQueue) this.discoverySeen[id] = true;
    this.discoveryQueue = [];
  }
  reconcileSoulPortraits(this);
  // เซฟที่สร้างก่อนระบบจุดเริ่มโซน: กู้ฐานของโซนปัจจุบันจากสถานะที่มี
  // โดยเก็บ zoneSave ของสาขาก่อนหน้าไว้ทั้งชุด ไม่ล้างความคืบหน้าที่ผ่านมา
  if (!this.zoneEntry && this.zone !== 'th') {
    const entry = this.snapshot(false), n = entry.zoneCases[this.zone] || 0;
    entry.casesDone = Math.max(0, entry.casesDone - n);
    entry.zoneCases = { ...entry.zoneCases, [this.zone]: 0 };
    entry.stations = [{ k: 'sala', crewK: null, intensity: 3, fire: 0, build: 0, slots: [] },
                      { k: 'tarang', crewK: null, intensity: 3, fire: 0, build: 0, slots: [] }];
    entry.queue = []; entry.held = []; entry.items = []; entry.mobs = []; entry.guard = null;
    entry.crew = entry.crew.filter(c => CREW.find(def => def.k === c.k)?.follow);
    entry.bossGuarding = { ...entry.bossGuarding, [this.zone]: false };
    entry.bossRetryAt = { ...entry.bossRetryAt, [this.zone]: 0 };
    entry.hp = entry.hpMax; entry.order = Math.max(72, entry.order); entry.reds = 0;
    this.zoneEntry = JSON.parse(JSON.stringify(entry));
  }
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
